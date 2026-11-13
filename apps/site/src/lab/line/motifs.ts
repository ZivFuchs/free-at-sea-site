import type { Point, Run } from "./pen";

/** Drawings are authored on a 100-wide grid, y = 0 at the waterline, up negative. */
interface Placement {
	/** Left edge and waterline, px. */
	x: number;
	y: number;
	/** px per grid unit. */
	scale: number;
	/** Mirror, so the pen can arrive from the left. */
	flip?: boolean;
}

const place = (pts: readonly Point[], { x, y, scale, flip }: Placement): Point[] =>
	pts.map(([u, v]) => [x + (flip ? 100 - u : u) * scale, y + v * scale]);

const BARGE: readonly Run[] = [
	{
		smooth: true,
		water: true,
		pts: [
			[100, 0],
			[96.5, -0.5],
			[93, 0.4],
			[89.5, -0.3],
			[86.2, 0],
		],
	},
	{
		pts: [
			[85.6, -6.2],
			[80.4, -6.3],
			[80.2, -13.6],
			[77.6, -13.6],
			[77.3, -24.5],
			[76.8, -13.7],
			[73.3, -13.5],
			[73.2, -6.2],
			[68.4, -6.3],
			[68.2, -12.5],
			[58.3, -12.3],
			[58.1, -18.8],
			[43.2, -18.5],
			[43.1, -6.3],
			[40.2, -6.4],
			[40, -13.4],
			[25.2, -13.2],
			[25, -6.4],
			[12.6, -6.6],
			[18.4, 0],
		],
	},
	{
		smooth: true,
		water: true,
		pts: [
			[14.5, 0.5],
			[10.5, -0.4],
			[7, 0.4],
			[3.5, -0.3],
			[0, 0],
		],
	},
];

const BLADES: Point[] = [0, 1, 2].flatMap((b): Point[] => {
	const a = -Math.PI / 2 + 0.35 + (b * 2 * Math.PI) / 3;
	const tip = (r: number, da: number): Point => [
		79 + r * Math.cos(a + da),
		-22 + r * Math.sin(a + da),
	];
	return [tip(4, -0.16), tip(8.2, 0), tip(4, 0.16), [79, -22]];
});

const SKYLINE: readonly Run[] = [
	{
		smooth: true,
		water: true,
		pts: [
			[0, 0],
			[3, -0.4],
			[6, 0.4],
			[9, -0.3],
			[11.6, 0],
		],
	},
	{
		pts: [
			[12, -3],
			[18, -3.1],
			[18.1, -9.2],
			[27, -9],
			[27.1, -6.1],
			[33, -6],
			[33.2, -3],
		],
	},
	{
		smooth: true,
		pts: [
			[35.5, -3],
			[36.6, -7],
			[39.5, -9.8],
			[43.5, -9.8],
			[46.4, -7],
			[47.5, -3],
		],
	},
	{
		pts: [
			[51.5, -3],
			[51.7, -24.2],
			[57.2, -26.4],
			[57.1, -14.3],
			[62, -14.2],
			[62.2, -3.1],
			[63.5, -3],
		],
	},
	{
		smooth: true,
		pts: [
			[66, -2.2],
			[68.5, -1.8],
			[71, -2.3],
			[73.5, -3],
		],
	},
	{
		pts: [
			[78.6, -3],
			[78.8, -21.6],
		],
	},
	{ smooth: true, pts: BLADES },
	{
		pts: [
			[79.3, -3],
			[84, -3.1],
			[84.1, -7.2],
			[89, -7],
			[89.1, -3],
			[92.4, -3],
			[92.6, 0],
		],
	},
	{
		smooth: true,
		water: true,
		pts: [
			[94.5, 0.4],
			[96.5, -0.3],
			[98.4, 0.3],
			[100, 0],
		],
	},
];

const placed = (runs: readonly Run[], at: Placement): Run[] =>
	runs.map((run) => ({ ...run, pts: place(run.pts, at) }));

/** The film's barge, drawn right to left; water either side. */
export const barge = (at: Placement) => placed(BARGE, at);

/** A settlement at sea: platforms, a tower, a turbine. */
export const skyline = (at: Placement) => placed(SKYLINE, at);

/** Dead flat as far as `calm`, then a swell that builds toward `to`. */
export const horizon = (from: number, to: number, y: number, calm: number, amp: number): Run[] => {
	const swell: Point[] = [];
	const length = Math.max(110, (to - calm) / 1.2);
	for (let x = calm + 18; x < to; x += 18) {
		const t = (x - calm) / (to - calm);
		swell.push([x, y - amp * t ** 1.3 * Math.sin(((x - calm) / length) * 2 * Math.PI)]);
	}
	return [
		{
			pts: [
				[from, y],
				[calm, y],
			],
		},
		{ smooth: true, water: true, pts: swell },
	];
};

const CREST: readonly Point[] = [
	[0.3, 0.07],
	[0.54, 0.36],
	[0.7, 0.76],
	[0.84, 0.98],
	[0.97, 0.92],
	[1.03, 0.72],
	[0.96, 0.6],
	[0.89, 0.7],
	[0.8, 0.52],
	[0.79, 0.26],
	[0.9, 0.07],
	[1.1, 0],
];
const HEIGHTS = [0.72, 1, 0.82, 0.92, 0.66, 0.88];

/** A row of breaking waves from `x`, left to right, standing on `y`. */
export const waves = (
	x: number,
	width: number,
	y: number,
	height: number,
	count: number,
): Run[] => {
	const w = width / (count * 1.1);
	const pts: Point[] = [[x, y]];
	for (let i = 0; i < count; i++) {
		const a = height * (HEIGHTS[i % HEIGHTS.length] ?? 1);
		for (const [u, v] of CREST) pts.push([x + (i * 1.1 + u) * w, y - v * a]);
	}
	return [{ smooth: true, pts }];
};

/** A long fall down the margin, not quite ruler-straight. */
export const fall = (x: number, from: number, to: number): Run => {
	const pts: Point[] = [];
	const steps = Math.max(1, Math.round((to - from) / 180));
	for (let i = 0; i <= steps; i++) {
		pts.push([
			x + (i > 0 && i < steps ? Math.sin(i * 1.9) * 2.5 : 0),
			from + ((to - from) * i) / steps,
		]);
	}
	return { smooth: true, pts };
};

/** A lazy crossing between two legs of the voyage. */
export const crossing = ([x0, y0]: Point, [x1, y1]: Point): Run => ({
	smooth: true,
	water: true,
	pts: [0.25, 0.5, 0.75].map(
		(t): Point => [
			x0 + (x1 - x0) * t,
			y0 + (y1 - y0) * (0.5 + (t - 0.5) * 0.5) + Math.sin(t * Math.PI * 2) * 9,
		],
	),
});

/** Arrives at the top from `side` (-1 left, 1 right), goes round once and a half, closing inward. */
export const circle = (cx: number, cy: number, r: number, side: number): Run => {
	const pts: Point[] = [[cx + side * r * 0.72, cy - r - 16]];
	const turns = 1.5;
	const steps = Math.round(turns * 40);
	for (let i = 0; i <= steps; i++) {
		const a = -Math.PI / 2 - side * (i / 40) * 2 * Math.PI;
		const rr = r - 7 * (i / steps) ** 2;
		pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
	}
	return { smooth: true, pts };
};
