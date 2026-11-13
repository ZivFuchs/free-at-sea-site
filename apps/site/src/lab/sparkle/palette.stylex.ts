import * as stylex from "@stylexjs/stylex";

export const night = stylex.defineConsts({
	/** True black with a breath of deep blue. */
	water: "oklch(0.07 0.02 250)",
	deep: "oklch(0.035 0.012 250)",
	/** Dinoflagellate light, ~475 nm. */
	glow: "oklch(0.84 0.13 215)",
	ember: "oklch(0.9 0.07 210)",
	glow30: "color-mix(in oklab, oklch(0.84 0.13 215) 30%, transparent)",
	glow12: "color-mix(in oklab, oklch(0.84 0.13 215) 12%, transparent)",
});
