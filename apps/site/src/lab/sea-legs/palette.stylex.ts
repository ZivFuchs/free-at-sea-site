import * as stylex from "@stylexjs/stylex";

export const sea = stylex.defineConsts({
	/** The hero photo's sky, behind it where the level scene uncovers a corner. */
	haze: "oklch(0.82 0.015 230)",
	glass: "color-mix(in oklab, var(--app-ink) 72%, transparent)",
	paper30: "color-mix(in oklab, var(--app-paper) 30%, transparent)",
});
