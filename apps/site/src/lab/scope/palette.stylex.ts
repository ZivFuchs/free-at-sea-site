import * as stylex from "@stylexjs/stylex";

export const film = stylex.defineConsts({
	/** Letterbox bars and title cards: projector black, a breath of blue. */
	black: "oklch(0.09 0.012 245)",
	/** Halation: the red-orange bleed around highlights on film stock. */
	halation: "oklch(0.7 0.16 45 / 0.35)",
	scrim: "oklch(0.09 0.012 245 / 0.9)",
});
