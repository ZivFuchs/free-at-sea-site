import * as stylex from "@stylexjs/stylex";

/** Daylight over white sand: the site's navy inverted. */
export const sea = stylex.defineConsts({
	sand: "oklch(0.958 0.018 95)",
	shoal: "oklch(0.935 0.034 195)",
	lagoon: "oklch(0.87 0.062 198)",
	reef: "oklch(0.46 0.085 215)",
	print: "oklch(0.992 0.004 95)",
	ink84: "color-mix(in oklab, var(--app-ink) 84%, transparent)",
	ink62: "color-mix(in oklab, var(--app-ink) 62%, transparent)",
	ink15: "color-mix(in oklab, var(--app-ink) 15%, transparent)",
	/** Shadow a print casts on the sand through water: soft and blue. */
	shade: "oklch(0.45 0.07 215 / 0.28)",
});
