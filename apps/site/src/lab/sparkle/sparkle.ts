import { clamp, onFrame, reducedMotion } from "@/lab/lib/motion";
import {
	type Box,
	BURSTS,
	createWater,
	type Disturbance,
	RECTS,
	SEGMENTS,
	type Water,
} from "./water";

const WRITE_SECONDS = 2.6;
const SHIMMER_SECONDS = 1.1;
const BURST_SECONDS = 0.7;
const BURST_RADIUS = 90;
/** Scroll speed (px/s) that lights the whole swash. */
const SWASH_SPEED = 4000;
const MASK_MAX = 1024;

interface Point {
	x: number;
	y: number;
	at: number;
}

/** Rasterises the heading's own text where its glyphs sit, so sparks land on the letters. */
const titleMask = (title: HTMLElement) => {
	const box = title.getBoundingClientRect();
	if (!box.width || !box.height) return null;
	const style = getComputedStyle(title);
	const scale = Math.min(2, MASK_MAX / box.width);
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(box.width * scale);
	canvas.height = Math.round(box.height * scale);
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	const text = title.textContent?.trim() ?? "";
	ctx.scale(scale, scale);
	ctx.fillRect(0, 0, box.width, box.height);
	ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	const m = ctx.measureText(text);
	const ascent = m.fontBoundingBoxAscent;
	ctx.fillStyle = ctx.shadowColor = "white";
	ctx.shadowBlur = 2 * scale;
	ctx.textAlign = "center";
	ctx.fillText(
		style.textTransform === "uppercase" ? text.toUpperCase() : text,
		box.width / 2,
		(box.height - (ascent + m.fontBoundingBoxDescent)) / 2 + ascent,
	);
	return canvas;
};

const run = (canvas: HTMLCanvasElement, water: Water, root: HTMLElement) => {
	const still = reducedMotion();
	const title = root.querySelector<HTMLElement>("[data-sparkle-title]");
	const lit = () => root.setAttribute("data-lit", "");

	const trail: Point[] = [];
	const bursts: Point[] = [];
	const shimmers: { el: Element; at: number }[] = [];
	let scroll = scrollY;
	let swash = 0;
	let wrote = Number.POSITIVE_INFINITY;
	const clock = () => performance.now() / 1000;

	const box = (el: Element): Box => {
		const r = el.getBoundingClientRect();
		return { x: r.left, y: r.top, width: r.width, height: r.height };
	};

	const tick = (time: number, dt: number) => {
		const y = scrollY;
		const shift = y - scroll;
		scroll = y;
		const frame = { time, scroll: y, title: title && box(title) };

		if (still) {
			water.clear();
			water.step({
				...frame,
				dt: 0,
				shift: 0,
				swash: 0,
				write: 9,
				ember: 0,
				fill: 0.5,
				segments: [],
				rects: [],
				bursts: [],
			});
			water.draw(frame);
			return;
		}

		swash = Math.max(swash * Math.exp(-dt * 3.5), clamp(Math.abs(shift) / dt / SWASH_SPEED));

		const segments: Disturbance["segments"][number][] = [];
		const stride = Math.max(1, Math.ceil((trail.length - 1) / SEGMENTS));
		for (let i = stride; i < trail.length; i += stride) {
			const a = trail[i - stride];
			const b = trail[i];
			if (!a || !b) continue;
			const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(b.at - a.at, 1 / 120);
			segments.push([a.x, a.y - shift, b.x, b.y, clamp(speed / 1400, 0.1, 1) * 0.9]);
		}
		const last = trail.at(-1);
		trail.length = 0;
		if (last) trail.push(last);

		while (bursts[0] && time - bursts[0].at > BURST_SECONDS) bursts.shift();
		while (shimmers[0] && time - shimmers[0].at > SHIMMER_SECONDS) shimmers.shift();

		water.step({
			...frame,
			dt,
			shift,
			swash,
			write: ((time - wrote) / WRITE_SECONDS) * 1.2 - 0.05,
			ember: time > wrote ? 1 : 0,
			fill: 0,
			segments,
			rects: shimmers.slice(0, RECTS).flatMap(({ el, at }) => {
				const age = (time - at) / SHIMMER_SECONDS;
				if (age < 0) return [];
				const r = el.getBoundingClientRect();
				return [[r.left, r.top, r.right, r.bottom, Math.sin(Math.PI * age)] as const];
			}),
			bursts: bursts.slice(-BURSTS).map(({ x, y: top, at }) => {
				const age = (time - at) / BURST_SECONDS;
				return [x, top - y, 4 + BURST_RADIUS * Math.sqrt(age)] as const;
			}),
		});
		water.draw(frame);
	};

	const loop = onFrame(canvas, tick);

	const sized = new ResizeObserver(() => {
		water.resize();
		const mask = title && titleMask(title);
		if (mask) water.mask(mask);
		loop.redraw();
	});
	sized.observe(canvas);
	if (title) sized.observe(title);

	document.fonts.ready.then(() => {
		const mask = title && titleMask(title);
		if (mask) water.mask(mask);
		wrote = clock() + 0.25;
		lit();
		loop.redraw();
	});

	if (still) {
		addEventListener("scroll", loop.redraw, { passive: true });
		return;
	}

	const move = (x: number, y: number) => {
		trail.push({ x, y, at: clock() });
	};
	/** Kept in page coordinates, so the ring stays with the content. */
	const burst = (x: number, y: number) => bursts.push({ x, y: y + scrollY, at: clock() });

	addEventListener(
		"pointermove",
		(e) => {
			if (e.pointerType !== "touch") move(e.clientX, e.clientY);
		},
		{ passive: true },
	);
	addEventListener("pointerdown", (e) => burst(e.clientX, e.clientY), { passive: true });
	addEventListener(
		"touchstart",
		() => {
			trail.length = 0;
		},
		{ passive: true },
	);
	addEventListener(
		"touchmove",
		(e) => {
			const touch = e.touches[0];
			if (touch) move(touch.clientX, touch.clientY);
		},
		{ passive: true },
	);

	const entering = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				entering.unobserve(entry.target);
				const queued = shimmers.filter(({ at }) => at > clock()).length;
				shimmers.push({ el: entry.target, at: clock() + queued * 0.12 });
			}
		},
		{ threshold: 0.35 },
	);
	for (const el of document.querySelectorAll(root.dataset.shimmer ?? "")) entering.observe(el);

	addEventListener("pagehide", (e) => !e.persisted && loop.stop());
};

export const sparkle = (root: HTMLElement) => {
	const canvas = root.querySelector("canvas");
	const water = canvas && createWater(canvas);
	if (canvas && water) run(canvas, water, root);
	else root.setAttribute("data-lit", "");
	root.toggleAttribute("data-flat", !water);
};
