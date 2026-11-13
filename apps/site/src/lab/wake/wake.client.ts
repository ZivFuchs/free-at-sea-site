import { clamp, onFrame, reducedMotion } from "@/lab/lib/motion";
import { createFluid, type Fluid, LAST_TIER, type Stroke } from "./fluid";

type Point = readonly [number, number];

const MASK_WIDTH = 1024;
/** Sustained frame time above this drops a quality tier. */
const SLOW_FRAME = 1 / 42;
const SAMPLE_FRAMES = 90;
const IDLE_PASSAGE_MS = 22_000;
const PASSAGE_SECONDS = 4.2;
const STILL_STEP = 1 / 40;

const rasterise = (title: HTMLElement) => {
	const { width, height } = title.getBoundingClientRect();
	if (!width || !height) return null;
	const mask = document.createElement("canvas");
	mask.width = MASK_WIDTH;
	mask.height = Math.max(1, Math.round((MASK_WIDTH * height) / width));
	const ctx = mask.getContext("2d");
	if (!ctx) return null;
	const { fontFamily, fontWeight, textTransform } = getComputedStyle(title);
	const text = title.textContent ?? "";
	const label = textTransform === "uppercase" ? text.toUpperCase() : text;
	ctx.font = `${fontWeight} 100px ${fontFamily}`;
	const size = (100 * mask.width) / ctx.measureText(label).width;
	ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
	const m = ctx.measureText(label);
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, mask.width, mask.height);
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.filter = `blur(${mask.height * 0.02}px)`;
	ctx.fillText(
		label,
		mask.width / 2,
		mask.height / 2 + (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2,
	);
	return mask;
};

const start = (canvas: HTMLCanvasElement, fluid: Fluid) => {
	const still = reducedMotion();
	const title = document.querySelector<HTMLElement>("[data-wake-title]");
	const strokes: Stroke[] = [];
	const pointers = new Map<number, { at: Point; time: number }>();
	const radius = matchMedia("(pointer: coarse)").matches ? 0.013 : 0.012;

	const toWater = (x: number, y: number): Point => [
		x / canvas.clientWidth,
		1 - y / canvas.clientHeight,
	];

	/** A hull's stroke: water dragged along the track, and shouldered outward either side so the wake opens. */
	const hull = (from: Point, to: Point, force: Point, foam: number, size: number) => {
		const aspect = canvas.clientWidth / canvas.clientHeight;
		const strength = Math.hypot(force[0], force[1]);
		if (!strength) return;
		const side: Point = [-force[1] / strength, force[0] / strength];
		strokes.push({ from, to, force, foam, radius: size });
		for (const sign of [1, -1]) {
			const off: Point = [(side[0] * sign * size * 1.3) / aspect, side[1] * sign * size * 1.3];
			strokes.push({
				from: [from[0] + off[0], from[1] + off[1]],
				to: [to[0] + off[0], to[1] + off[1]],
				force: [side[0] * sign * strength * 0.7, side[1] * sign * strength * 0.7],
				foam: foam * 0.25,
				radius: size * 0.8,
			});
		}
	};

	const hint = document.querySelector<HTMLElement>("[data-wake-hint]");
	let stirred = 0;
	let lastInput = performance.now();
	const move = (id: number, x: number, y: number) => {
		const now = performance.now();
		const at = toWater(x, y);
		const last = pointers.get(id);
		pointers.set(id, { at, time: now });
		lastInput = now;
		if (!last || now - last.time > 120) return;
		const dt = Math.max((now - last.time) / 1000, 1 / 240);
		const aspect = canvas.clientWidth / canvas.clientHeight;
		const dx = (at[0] - last.at[0]) * aspect;
		const dy = at[1] - last.at[1];
		const distance = Math.hypot(dx, dy);
		if (distance < 1e-4) return;
		const speed = distance / dt;
		const gain = (0.24 * Math.min(speed, 2.5)) / speed;
		hull(
			last.at,
			at,
			[(dx / dt) * gain, (dy / dt) * gain],
			clamp(speed * 0.45, 0.12, 0.7) * Math.min(1, distance / (radius * 1.5)),
			radius,
		);
		if (++stirred === 40) hint?.setAttribute("data-done", "");
		loop.redraw();
	};

	addEventListener(
		"pointermove",
		(e) => e.pointerType !== "touch" && move(e.pointerId, e.clientX, e.clientY),
		{ passive: true },
	);
	const touch = (e: TouchEvent) => {
		for (const t of e.changedTouches) move(-1 - t.identifier, t.clientX, t.clientY);
	};
	addEventListener("touchstart", touch, { passive: true });
	addEventListener("touchmove", touch, { passive: true });
	addEventListener(
		"touchend",
		(e) => {
			for (const t of e.changedTouches) pointers.delete(-1 - t.identifier);
		},
		{ passive: true },
	);

	/** A vessel crossing on its own: once at load, then whenever the water has been left alone a while. */
	let passage: { from: number; y: number; bend: number; dir: 1 | -1; last: Point | null } | null =
		null;
	const launch = (
		time: number,
		y = 0.3 + Math.random() * 0.25,
		dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1,
	) => {
		passage = { from: time, y, bend: 0.03 + Math.random() * 0.04, dir, last: null };
	};
	const sail = (time: number, dt: number) => {
		if (!passage) return;
		const t = (time - passage.from) / PASSAGE_SECONDS;
		if (t > 1) {
			passage = null;
			return;
		}
		const x = passage.dir > 0 ? -0.08 + 1.16 * t : 1.08 - 1.16 * t;
		const at: Point = [x, passage.y + passage.bend * Math.sin(x * 4.2)];
		const { last } = passage;
		passage.last = at;
		if (!last) return;
		const aspect = canvas.clientWidth / canvas.clientHeight;
		const dx = (at[0] - last[0]) * aspect;
		const dy = at[1] - last[1];
		hull(
			last,
			at,
			[(dx / dt) * 0.3, (dy / dt) * 0.3],
			0.4 * Math.min(1, Math.hypot(dx, dy) / radius),
			radius * 0.6,
		);
	};

	/** Headings stir the water under them as they arrive. */
	const blooms = new IntersectionObserver(
		(entries) => {
			for (const { isIntersecting, target } of entries) {
				if (!isIntersecting) continue;
				blooms.unobserve(target);
				const r = target.getBoundingClientRect();
				const y = r.top + r.height * 0.6;
				const parts = 5;
				for (let i = 0; i < parts; i++) {
					const a = toWater(r.left + (r.width * i) / parts, y);
					const b = toWater(r.left + (r.width * (i + 0.8)) / parts, y);
					strokes.push({
						from: a,
						to: b,
						force: [(i % 2 ? -1 : 1) * 0.05, 0.12],
						ink: 0.38,
						foam: 0.05,
						radius: radius * 1.6,
					});
				}
			}
		},
		{ rootMargin: "0px 0px -18% 0px", threshold: 0.6 },
	);
	if (!still) for (const el of document.querySelectorAll("[data-wake-bloom]")) blooms.observe(el);

	const titleBox = (): readonly [number, number, number, number] => {
		if (!title) return [0, 0, 1, 1];
		const r = title.getBoundingClientRect();
		const [x, top] = toWater(r.left, r.top);
		const h = r.height / canvas.clientHeight;
		return [x, top - h, r.width / canvas.clientWidth, h];
	};
	const seep = () => {
		if (!title) return 0;
		const r = title.getBoundingClientRect();
		if (r.bottom < 0 || r.top > innerHeight) return 0;
		const fade = title.closest<HTMLElement>("[data-hero-fade]")?.style.opacity;
		return fade ? clamp(Number.parseFloat(fade) / 0.85) : 1;
	};

	let lastScroll = scrollY;
	const advance = (time: number, dt: number) => {
		sail(time, dt);
		for (const s of strokes.splice(0)) fluid.stroke(s);
		const scrolled = (scrollY - lastScroll) / canvas.clientHeight;
		lastScroll = scrollY;
		fluid.step({ dt, time, scrolled: clamp(scrolled, -0.5, 0.5), title: titleBox(), seep: seep() });
	};

	let prepared = false;
	let slow = 0;
	let frames = -30;
	const loop = onFrame(canvas, (time, dt) => {
		if (fluid.lost()) return;
		if (still) {
			if (!prepared) {
				prepared = true;
				launch(0, 0.36, 1);
				for (let t = 0; t < PASSAGE_SECONDS * 0.82; t += STILL_STEP) advance(t, STILL_STEP);
			}
			fluid.render(PASSAGE_SECONDS);
			return;
		}
		if (!prepared) {
			prepared = true;
			launch(time + 0.6, 0.36, 1);
		} else if (
			!passage &&
			performance.now() - lastInput > IDLE_PASSAGE_MS &&
			scrollY < innerHeight
		) {
			lastInput = performance.now();
			launch(time);
		}
		advance(time, Math.min(dt, 1 / 30));
		fluid.render(time);

		if (fluid.tier >= LAST_TIER || ++frames <= 0) return;
		slow += dt;
		if (frames < SAMPLE_FRAMES) return;
		if (slow / frames > SLOW_FRAME) fluid.degrade();
		slow = 0;
		frames = -30;
	});

	const inked = () => {
		const mask = title && rasterise(title);
		if (mask) fluid.setMask(mask);
	};
	document.fonts.ready.then(inked);

	let width = 0;
	let height = 0;
	new ResizeObserver(() => {
		const { clientWidth: w, clientHeight: h } = canvas;
		if (w === width && Math.abs(h - height) < 120) return;
		width = w;
		height = h;
		fluid.resize();
		prepared = false;
		inked();
		loop.redraw();
	}).observe(canvas);

	addEventListener("scroll", loop.redraw, { passive: true });
	addEventListener("pagehide", loop.stop);
	canvas.addEventListener("webglcontextlost", () => {
		loop.stop();
		canvas.hidden = true;
	});
};

// The site header picks dark text for the homepage's pale hero sky; this hero is dark water.
document.querySelector<HTMLElement>("[data-site-header]")?.style.removeProperty("--top");

const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-wake]");
if (canvas) {
	const phone = matchMedia("(pointer: coarse)").matches;
	const fluid = createFluid(canvas, phone ? 1 : 0);
	if (fluid) start(canvas, fluid);
	else canvas.hidden = true;
}
