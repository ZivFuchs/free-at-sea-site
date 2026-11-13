export type Rgb = readonly [number, number, number];

/** Seabed seen through a hand's depth of water, at the shelf edge, and past it. Shared by the shader and the CSS fallback. */
export const GROUND = {
	shallow: [0.27, 0.6, 0.62],
	mid: [0.05, 0.31, 0.44],
	abyss: [0.03, 0.105, 0.185],
} as const satisfies Record<string, Rgb>;

export const css = ([r, g, b]: Rgb) =>
	`rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
