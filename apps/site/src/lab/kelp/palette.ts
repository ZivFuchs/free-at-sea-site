export type Rgb = readonly [number, number, number];

export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t,
	a[2] + (b[2] - a[2]) * t,
];

export const rgba = ([r, g, b]: Rgb, alpha = 1) =>
	`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;

/** Water colour by effective depth (0 under the canopy, 1 on the floor). */
const WATER: readonly (readonly [number, Rgb])[] = [
	[0, [70, 142, 118]],
	[0.18, [26, 100, 98]],
	[0.45, [10, 62, 70]],
	[0.75, [5, 36, 46]],
	[1.1, [3, 18, 25]],
];

export const water = (depth: number): Rgb => {
	const first = WATER[0];
	const last = WATER[WATER.length - 1];
	if (!first || !last) return [0, 0, 0];
	if (depth <= first[0]) return first[1];
	for (let i = 1; i < WATER.length; i++) {
		const a = WATER[i - 1];
		const b = WATER[i];
		if (a && b && depth <= b[0]) return mix(a[1], b[1], (depth - a[0]) / (b[0] - a[0]));
	}
	return last[1];
};

export const SUN: Rgb = [232, 236, 160];
export const SHAFT: Rgb = [190, 228, 160];
export const MOTE: Rgb = [214, 232, 190];

/** Kelp tones lit from above (canopy) and in the shade of the floor. */
export const KELP = {
	stipe: { lit: [46, 52, 20], deep: [6, 30, 30] },
	dark: { lit: [40, 60, 24], deep: [10, 50, 44] },
	light: { lit: [108, 120, 46], deep: [22, 82, 64] },
	bladder: { lit: [140, 144, 62], deep: [22, 74, 60] },
	near: { lit: [8, 30, 22], deep: [2, 12, 14] },
	rock: { lit: [6, 26, 30], deep: [2, 11, 15] },
} as const satisfies Record<string, { lit: Rgb; deep: Rgb }>;
