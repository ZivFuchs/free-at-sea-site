import * as stylex from "@stylexjs/stylex";

/** Cold-pressed paper, ink and the four pigments on the palette (matched to `wash.frag`). */
export const ink = stylex.defineConsts({
	paper: "oklch(0.962 0.012 88)",
	ink: "oklch(0.24 0.035 250)",
	soft: "oklch(0.42 0.03 250)",
	faint: "oklch(0.24 0.035 250 / 0.14)",
	prussian: "oklch(0.42 0.11 245)",
	sand: "oklch(0.78 0.09 75)",
});
