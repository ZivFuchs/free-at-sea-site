import { clamp, damp, lerp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import { drawScene, type Ink, type View } from "./scene";
import { STAGES } from "./stages";

const MAX_DPR = 2;
const LAST = STAGES.length - 1;
const NICE = [1, 2, 5];

const stage = (i: number) => STAGES[clamp(i, 0, LAST)] ?? STAGES[0];

/** Camera for a fractional stage index: span moves in log space, the centre proportionally to span. */
const camera = (f: number): Pick<View, "span" | "centre"> => {
	const i = Math.min(Math.floor(f), LAST - 1);
	const [a, b] = [stage(i), stage(i + 1)];
	if (!a || !b) return { span: 1, centre: [0, 0] };
	const t = f - i;
	const eased = lerp(t, smoothstep(0, 1, t), 0.7);
	const span = Math.exp(lerp(Math.log(a.span), Math.log(b.span), eased));
	const u = (span - a.span) / (b.span - a.span);
	return { span, centre: [lerp(a.centre[0], b.centre[0], u), lerp(a.centre[1], b.centre[1], u)] };
};

const group = (n: number) => Math.round(n).toLocaleString("en-GB");
const length = (m: number) => (m < 1000 ? `${group(m)} m` : `${group(m / 1000)} km`);

const fit = (canvas: HTMLCanvasElement) => {
	const scale = Math.min(devicePixelRatio, MAX_DPR);
	const { clientWidth: width, clientHeight: height } = canvas;
	canvas.width = Math.round(width * scale);
	canvas.height = Math.round(height * scale);
	const ctx = canvas.getContext("2d");
	ctx?.setTransform(scale, 0, 0, scale, 0, 0);
	return ctx && { ctx, width, height };
};

const anchor = (width: number, height: number): View["anchor"] =>
	width >= 768 ? [width * 0.64, height * 0.56] : [width * 0.5, height * 0.62];

export const start = (root: HTMLElement) => {
	const track = root.querySelector<HTMLElement>("[data-track]");
	const canvas = root.querySelector<HTMLCanvasElement>("[data-scene]");
	if (!track || !canvas) return;

	const css = getComputedStyle(root);
	const ink: Ink = {
		line: css.getPropertyValue("--scale-line").trim(),
		water: css.getPropertyValue("--scale-water").trim(),
		ground: css.getPropertyValue("--scale-ground").trim(),
		font: css.fontFamily,
	};

	if (reducedMotion()) {
		root.setAttribute("data-plates", "");
		for (const plate of root.querySelectorAll<HTMLCanvasElement>("[data-plate]")) {
			const fitted = fit(plate);
			const { span, centre } = stage(Number(plate.dataset.plate)) ?? {};
			if (!fitted || !span || !centre) continue;
			const { ctx, width, height } = fitted;
			drawScene(
				ctx,
				{ width, height, anchor: [width / 2, height * 0.58], span, centre, time: 0 },
				ink,
			);
		}
		return;
	}

	root.setAttribute("data-live", "");
	const slides = [...root.querySelectorAll<HTMLElement>("[data-slide]")];
	const stops = [...root.querySelectorAll<HTMLButtonElement>("[data-stop]")];
	const bar = root.querySelector<HTMLElement>("[data-bar]");
	const barLabel = root.querySelector<HTMLElement>("[data-bar-label]");
	const zoom = root.querySelector<HTMLElement>("[data-zoom]");

	let fitted = fit(canvas);
	let position = -1;
	let current = -1;

	const target = () => {
		const travel = track.offsetHeight - innerHeight;
		return travel > 0 ? clamp(-track.getBoundingClientRect().top / travel) * LAST : 0;
	};

	const loop = onFrame(canvas, (time, dt) => {
		if (!fitted) return;
		position = position < 0 ? target() : damp(position, target(), 9, dt);
		const { ctx, width, height } = fitted;
		const view = { width, height, anchor: anchor(width, height), time, ...camera(position) };
		drawScene(ctx, view, ink);

		for (const [i, slide] of slides.entries()) {
			slide.style.setProperty("--show", String(clamp(1 - Math.abs(position - i) * 2.6).toFixed(3)));
		}
		root.style.setProperty("--cue", String(clamp(1 - position * 4).toFixed(3)));

		const k = Math.min(width, height) / view.span;
		const reach = (width < 768 ? 96 : 150) / k;
		const power = 10 ** Math.floor(Math.log10(reach));
		const nice = (NICE.findLast((n) => n * power <= reach) ?? 1) * power;
		bar?.style.setProperty("--bar", `${(nice * k).toFixed(1)}px`);
		if (barLabel) barLabel.textContent = length(nice);
		if (zoom) zoom.textContent = `× ${group(view.span / (STAGES[0]?.span ?? 1))}`;

		const nearest = Math.round(position);
		if (nearest !== current) {
			current = nearest;
			for (const [i, stop] of stops.entries()) stop.toggleAttribute("aria-current", i === nearest);
		}
	});

	new ResizeObserver(() => {
		fitted = fit(canvas);
		loop.redraw();
	}).observe(canvas);

	for (const stop of stops) {
		stop.addEventListener("click", () => {
			const travel = track.offsetHeight - innerHeight;
			const top = track.getBoundingClientRect().top + scrollY;
			scrollTo({ top: top + (travel * Number(stop.dataset.stop)) / LAST });
		});
	}
	addEventListener("pagehide", loop.stop, { once: true });
};
