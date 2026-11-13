import * as stylex from "@stylexjs/stylex";

/** Dry sand, and ink at the strengths the sand slides use. */
export const sand = stylex.defineConsts({
	ground: "oklch(0.93 0.028 85)",
	pale: "oklch(0.965 0.018 88)",
	ink70: "color-mix(in oklab, var(--app-ink) 70%, transparent)",
	ink50: "color-mix(in oklab, var(--app-ink) 50%, transparent)",
	ink15: "color-mix(in oklab, var(--app-ink) 15%, transparent)",
	lagoon: "oklch(0.5 0.09 205)",
});
