import { lerp, smoothstep } from "@/lab/lib/motion";

/** Horizon as a fraction of the hero's height; the lamp sits on it. */
export const HORIZON = 0.34;
/** Seconds per revolution. */
export const PERIOD = 8;

/** A tapered shaft of light in viewport CSS px, from the lamp `s` to its far end `e`. */
export interface Shaft {
	sx: number;
	sy: number;
	ex: number;
	ey: number;
	r0: number;
	r1: number;
	power: number;
}

interface View {
	width: number;
	height: number;
	/** Horizon's y in the viewport. */
	horizon: number;
}

const mix = (a: Shaft, b: Shaft, t: number): Shaft => ({
	sx: lerp(a.sx, b.sx, t),
	sy: lerp(a.sy, b.sy, t),
	ex: lerp(a.ex, b.ex, t),
	ey: lerp(a.ey, b.ey, t),
	r0: lerp(a.r0, b.r0, t),
	r1: lerp(a.r1, b.r1, t),
	power: lerp(a.power, b.power, t),
});

/** Seen from far off: a lamp turning on the horizon, its beam foreshortened and washing over us as it points our way. */
const distant = (phase: number, { width, height, horizon }: View): Shaft => {
	const angle = phase * Math.PI * 2;
	const toward = Math.cos(angle);
	const focal = width * 0.9 + height * 0.3;
	const depth = Math.max(1 - 0.97 * toward, 0.035);
	const sx = width / 2;
	return {
		sx,
		sy: horizon,
		ex: sx + (focal * 0.5 * Math.sin(angle)) / depth,
		ey: horizon + focal * 0.012 * (1 / depth - 1),
		r0: 1.5,
		r1: (focal * 0.02) / depth,
		power: 0.22 + 0.78 * smoothstep(-0.2, 1, toward) ** 2,
	};
};

/** Seen from close by: the lamp off to port, its beam sweeping down across the page. */
const abeam = (phase: number, { width, height }: View): Shaft => {
	const angle = phase * Math.PI * 2;
	const reach = Math.max(width, height) * 2.4;
	const sx = -0.25 * width;
	const sy = 0.42 * height;
	return {
		sx,
		sy,
		ex: sx + reach * Math.cos(angle),
		ey: sy + reach * Math.sin(angle),
		r0: 0.03 * height,
		r1: 0.3 * height,
		power: smoothstep(-0.05, 0.35, Math.cos(angle)),
	};
};

/** `near`: 0 far from the lamp (hero), 1 alongside it. `phase`: 0–1 through a revolution, 0 pointing at the viewer. */
export const shaft = (phase: number, near: number, view: View): Shaft =>
	near <= 0
		? distant(phase, view)
		: near >= 1
			? abeam(phase, view)
			: mix(distant(phase, view), abeam(phase, view), near);

/** Light the shaft throws on a point, 0–1. Mirrors `beam()` in `beam.frag`. */
export const intensity = ({ sx, sy, ex, ey, r0, r1, power }: Shaft, x: number, y: number) => {
	const vx = ex - sx;
	const vy = ey - sy;
	const t = Math.min(Math.max(((x - sx) * vx + (y - sy) * vy) / (vx * vx + vy * vy || 1), 0), 1);
	const d = Math.hypot(x - sx - t * vx, y - sy - t * vy);
	const r = lerp(r0, r1, t);
	return power * Math.exp((-1.5 * d * d) / (r * r)) * (1 - 0.45 * t);
};
