/** One period of poster swell: sharp crests at the ends, a trough `depth` deep between. */
export const scallop = (period: number, depth: number) =>
	`M0 0 Q${period / 2} ${depth * 2} ${period} 0`;

interface Band {
	id: "bandFar" | "bandMid" | "bandNear";
	period: number;
	height: number;
	/** Parallax: fraction of the passage's travel this layer moves. */
	drift: number;
	fill: number;
	stroke: number;
}

export const BANDS: readonly Band[] = [
	{ id: "bandFar", period: 46, height: 4, drift: 0.28, fill: 0.05, stroke: 0.28 },
	{ id: "bandMid", period: 92, height: 8, drift: 0.5, fill: 0.06, stroke: 0.32 },
	{ id: "bandNear", period: 170, height: 14, drift: 0.8, fill: 0.07, stroke: 0.36 },
];

export const CREST = { period: 300, height: 26, drift: 1.3 };

/** Cloud bars as `[x, y%, width, height]`, tiled every `period` px. */
export const CLOUDS = {
	period: 1500,
	bars: [
		[40, 34, 260, 14],
		[150, 39, 190, 10],
		[520, 22, 330, 16],
		[610, 28, 170, 10],
		[980, 44, 240, 12],
		[1090, 49, 300, 14],
		[1280, 18, 150, 9],
	],
} as const;

/** Sun or moon on the water: `[y, width]` dashes, widening and thinning out toward the viewer. */
export const GLITTER: readonly (readonly [number, number])[] = Array.from(
	{ length: 16 },
	(_, i) => {
		const t = i / 15;
		return [1 + 92 * t ** 1.5, 18 + 70 * t * (i % 2 ? 0.7 : 1)] as const;
	},
);

const random = (seed: number) => {
	const x = Math.sin(seed * 127.1) * 43758.5453;
	return x - Math.floor(x);
};

/** Stars as `[x%, y%, radius]`: fixed, so every build draws the same sky. */
export const STARS: readonly (readonly [number, number, number])[] = Array.from(
	{ length: 80 },
	(_, i) => [
		Math.round(random(i + 1) * 1000) / 10,
		Math.round(random(i + 101) ** 1.4 * 900) / 10,
		0.5 + Math.round(random(i + 201) ** 3 * 12) / 10,
	],
);
