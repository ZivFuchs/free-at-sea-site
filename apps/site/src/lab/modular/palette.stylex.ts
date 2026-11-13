import * as stylex from "@stylexjs/stylex";

/** Architect's-model materials, by day and after dark. */
export const day = stylex.defineConsts({
	hull: "oklch(0.86 0.012 230)",
	wall: "oklch(0.955 0.008 85)",
	roof: "oklch(0.9 0.01 230)",
	deck: "oklch(0.82 0.04 75)",
	green: "oklch(0.74 0.08 150)",
	solar: "oklch(0.36 0.07 255)",
	glass: "oklch(0.52 0.05 235)",
	metal: "oklch(0.76 0.015 240)",
	lamp: "oklch(0.97 0.01 90)",
	shade: "oklch(0.3 0.05 250)",
	glow: "oklch(0.5 0.09 225)",
});

export const night = stylex.defineConsts({
	hull: "oklch(0.4 0.035 245)",
	wall: "oklch(0.5 0.035 245)",
	roof: "oklch(0.44 0.035 245)",
	deck: "oklch(0.42 0.03 250)",
	green: "oklch(0.4 0.05 180)",
	solar: "oklch(0.22 0.05 255)",
	glass: "oklch(0.9 0.11 85)",
	metal: "oklch(0.42 0.03 245)",
	lamp: "oklch(0.96 0.09 85)",
	shade: "oklch(0.13 0.03 250)",
	glow: "oklch(0.27 0.06 250)",
	/** Lamplight, as the halo gradient's stop. */
	light: "oklch(0.9 0.11 85)",
});
