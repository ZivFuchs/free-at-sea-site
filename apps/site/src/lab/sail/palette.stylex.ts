import * as stylex from "@stylexjs/stylex";

export const dusk = stylex.defineConsts({
	/** The scene's sky and sea as a flat gradient: shown before WebGL paints, and when it can't. */
	sky: "linear-gradient(oklch(0.24 0.06 275) 0%, oklch(0.42 0.06 310) 38%, oklch(0.72 0.11 50) 59%, oklch(0.3 0.05 265) 61%, oklch(0.17 0.04 255) 100%)",
	night: "oklch(0.17 0.04 255)",
	ember: "oklch(0.82 0.11 60)",
	canvas: "oklch(0.9 0.02 85)",
	scrim: "oklch(0.12 0.03 260 / 0.82)",
});
