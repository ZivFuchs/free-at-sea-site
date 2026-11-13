export type Point = readonly [number, number];

/** A stretch of the line, continuing from the previous run's end. */
export interface Run {
	pts: readonly Point[];
	/** Curve through the points; otherwise straight strokes with softened corners. */
	smooth?: boolean;
	/** Open water: breathes with a slow travelling wave. */
	water?: boolean;
}

const CORNER = 2.5;
const BREATH = { amp: 1.6, k: 0.035, speed: 1.1 };

const n = (v: number) => v.toFixed(1);
const at = ([x, y]: Point) => `${n(x)} ${n(y)}`;
const toward = (a: Point, b: Point, d: number): Point => {
	const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
	const t = Math.min(d, len / 2) / len;
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
};

/** Catmull-Rom tangent from `a` to `b`, kept short of the span it serves so uneven spacing can't loop. */
const handle = (a: Point, b: Point, from: Point, to: Point): Point => {
	const x = (b[0] - a[0]) / 6;
	const y = (b[1] - a[1]) / 6;
	const k = Math.min(
		1,
		(0.4 * Math.hypot(to[0] - from[0], to[1] - from[1])) / (Math.hypot(x, y) || 1),
	);
	return [x * k, y * k];
};

const breathe = (pts: readonly Point[], time: number): Point[] =>
	pts.map(([x, y], i) => [
		x,
		y +
			BREATH.amp *
				Math.sin((Math.PI * i) / (pts.length - 1 || 1)) *
				Math.sin(x * BREATH.k - time * BREATH.speed),
	]);

/** One continuous SVG path through every run. */
export const toPath = (runs: readonly Run[], time = 0) => {
	const first = runs[0]?.pts[0];
	if (!first) return "";
	let d = `M${at(first)}`;
	let end = first;
	let before = first;

	runs.forEach((run, r) => {
		const pts = run.water && time ? breathe(run.pts, time) : run.pts;
		const chain = r === 0 ? [...pts] : [end, ...pts];
		const after = runs[r + 1]?.pts[0];
		for (let i = 0; i < chain.length - 1; i++) {
			const p1 = chain[i] as Point;
			const p2 = chain[i + 1] as Point;
			if (run.smooth) {
				const p0 = chain[i - 1] ?? before;
				const p3 = chain[i + 2] ?? after ?? p2;
				const [ax, ay] = handle(p0, p2, p1, p2);
				const [bx, by] = handle(p1, p3, p1, p2);
				d += `C${n(p1[0] + ax)} ${n(p1[1] + ay)} ${n(p2[0] - bx)} ${n(p2[1] - by)} ${at(p2)}`;
			} else {
				const p3 = chain[i + 2];
				d += p3
					? `L${at(toward(p2, p1, CORNER))}Q${at(p2)} ${at(toward(p2, p3, CORNER))}`
					: `L${at(p2)}`;
			}
		}
		before = chain[chain.length - 2] ?? before;
		end = chain[chain.length - 1] ?? end;
	});
	return d;
};
