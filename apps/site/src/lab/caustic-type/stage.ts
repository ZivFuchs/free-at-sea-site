import { clamp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import { type Caustics, createCaustics, type FieldTexture, type Frame } from "./caustics";
import { lightField } from "./poisson";

/** Seconds: light gathers into the words, holds, lets go. Looping targets repeat every `PERIOD`. */
const RISE = 2.4;
const HOLD = 3.8;
const FALL = 3.2;
const PERIOD = 18;
const FIRST = 1.1;
const STILL_TIME = 40;
/** Texels across a target's field. Fewer on phones: the solve is on the main thread. */
const FIELD_WIDTH = { fine: 900, coarse: 520 };
const MIN_TEXEL = 1.3;
const POKES = 3;

interface Target {
	el: HTMLElement;
	loop: boolean;
	/** When the light started gathering; `null` until the words scroll into view. */
	start: number | null;
	field: FieldTexture | null;
	/** Page-space box the field covers, CSS px. */
	rect: readonly [number, number, number, number];
	texel: number;
	opacity: string;
}

const envelope = (t: number) =>
	t < 0 ? 0 : t < RISE + HOLD ? smoothstep(0, RISE, t) : 1 - smoothstep(0, FALL, t - RISE - HOLD);

/** Rasterise the element's words exactly where the browser set them, then solve for the light that draws them. */
const gather = (gl: Caustics, target: Target) => {
	const { el } = target;
	const style = getComputedStyle(el);
	const size = Number.parseFloat(style.fontSize);
	const pad = size * 1.6;
	const box = el.getBoundingClientRect();
	const rect = [box.left - pad, box.top - pad, box.width + pad * 2, box.height + pad * 2] as const;
	const limit = matchMedia("(pointer: coarse)").matches ? FIELD_WIDTH.coarse : FIELD_WIDTH.fine;
	const texel = Math.max(rect[2] / limit, MIN_TEXEL);
	const width = Math.round(rect[2] / texel);
	const height = Math.round(rect[3] / texel);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx || width < 2 || height < 2) return;
	ctx.scale(1 / texel, 1 / texel);
	ctx.translate(-rect[0], -rect[1]);
	ctx.font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
	ctx.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
	ctx.fillStyle = "#fff";
	const upper = style.textTransform === "uppercase";
	// An inline box spans the font's ascent and descent, so its top fixes the baseline.
	const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = ctx.measureText("");
	for (const word of el.querySelectorAll<HTMLElement>("[data-word]")) {
		const { left, top, height: line } = word.getBoundingClientRect();
		const text = word.textContent ?? "";
		ctx.fillText(
			upper ? text.toUpperCase() : text,
			left,
			top + (line * ascent) / (ascent + descent),
		);
	}

	const pixels = ctx.getImageData(0, 0, width, height).data;
	const mask = new Float32Array(width * height);
	for (let i = 0; i < mask.length; i++) mask[i] = (pixels[i * 4 + 3] ?? 0) / 255;

	if (target.field) gl.release(target.field);
	target.field = gl.field(lightField(mask, width, height, (size * 0.85) / texel));
	target.rect = [rect[0], rect[1] + scrollY, rect[2], rect[3]];
	target.texel = texel;
};

export const stage = (root: HTMLElement) => {
	const canvas = root.querySelector("canvas");
	const drop = root.querySelector<HTMLElement>("[data-drop]");
	const gl = canvas && createCaustics(canvas);
	if (!canvas || !gl) return;

	const still = reducedMotion();
	const targets: Target[] = [...root.querySelectorAll<HTMLElement>("[data-light]")].map((el) => ({
		el,
		loop: el.dataset.light === "loop",
		start: null,
		field: null,
		rect: [0, 0, 1, 1],
		texel: 1,
		opacity: "",
	}));

	const pokes = new Float32Array(POKES * 4).fill(-99);
	let next = 0;
	let now = 0;
	let stirred = 0;
	const poke = (x: number, y: number, strength: number) => {
		pokes.set([x, y + scrollY, now, strength], next * 4);
		next = (next + 1) % POKES;
	};

	let span: readonly [number, number] = [0, 1];
	const layout = () => {
		gl.resize();
		if (drop) {
			const top = drop.getBoundingClientRect().top + scrollY;
			span = [top - innerHeight * 0.75, top + drop.offsetHeight - innerHeight * 0.55];
		}
	};

	const setOpacity = (target: Target, value: number) => {
		const text = value.toFixed(3);
		if (text === target.opacity) return;
		target.opacity = text;
		target.el.style.opacity = text;
	};

	const loop = onFrame(canvas, (seconds) => {
		now = still ? STILL_TIME : seconds;
		const deep = smoothstep(span[0], span[1], scrollY);
		root.style.setProperty("--deep", deep.toFixed(3));

		let focus: Frame["focus"] = null;
		for (const target of targets) {
			const { field, rect } = target;
			if (!field) continue;
			const age = target.start === null ? -1 : now - target.start;
			const amount = still ? Number(target.loop) : envelope(target.loop ? age % PERIOD : age);
			// Looping words trade places with the light; the rest are written by it, then stay.
			setOpacity(
				target,
				target.loop
					? 1 - smoothstep(0.1, 0.7, amount)
					: still
						? 1
						: smoothstep(RISE + 0.6, RISE + 2.2, age),
			);
			const top = rect[1] - scrollY;
			if (top < innerHeight && top + rect[3] > 0 && amount > (focus?.amount ?? 0.001)) {
				focus = { field, texel: target.texel, amount, rect: [rect[0], top, rect[2], rect[3]] };
			}
		}
		gl.draw({ time: now, scroll: scrollY, deep: clamp(deep), focus, pokes });
	});

	const prepare = async () => {
		await document.fonts.ready;
		for (const target of targets) {
			gather(gl, target);
			if (target.loop && target.start === null) target.start = now + FIRST;
			loop.redraw();
			await new Promise((resolve) => setTimeout(resolve));
		}
	};

	const seen = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const target = targets.find((t) => t.el === entry.target);
				if (!entry.isIntersecting || !target || target.start !== null) continue;
				target.start = now;
				seen.unobserve(entry.target);
			}
		},
		{ threshold: 0.6 },
	);
	for (const target of targets) if (!target.loop) seen.observe(target.el);

	let settle = 0;
	const onResize = () => {
		layout();
		loop.redraw();
	};
	/* Late fonts and reflow move the words: aim the light again once they settle. */
	const moved = new ResizeObserver(() => {
		clearTimeout(settle);
		settle = window.setTimeout(prepare, 200);
	});
	const onDown = (event: PointerEvent) => poke(event.clientX, event.clientY, 9);
	const onMove = (event: PointerEvent) => {
		if (event.pointerType !== "mouse" || now - stirred < 0.28) return;
		stirred = now;
		poke(event.clientX, event.clientY, 2.4);
	};

	layout();
	root.setAttribute("data-lit", "");
	for (const { el } of targets) moved.observe(el);
	addEventListener("resize", onResize);
	addEventListener("scroll", loop.redraw, { passive: true });
	if (!still) {
		addEventListener("pointerdown", onDown, { passive: true });
		addEventListener("pointermove", onMove, { passive: true });
	}
	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			seen.disconnect();
			moved.disconnect();
			gl.dispose();
		},
		{ once: true },
	);
};
