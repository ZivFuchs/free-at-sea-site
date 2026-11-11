import * as stylex from "@stylexjs/stylex";

export const color = stylex.defineConsts({
	paper: "var(--app-paper)",
	ink: "var(--app-ink)",
	muted: "var(--app-muted)",
	accent: "var(--app-accent)",
	ink10: "color-mix(in oklab, var(--app-ink) 10%, transparent)",
	paper15: "color-mix(in oklab, var(--app-paper) 15%, transparent)",
	paper45: "color-mix(in oklab, var(--app-paper) 45%, transparent)",
	paper50: "color-mix(in oklab, var(--app-paper) 50%, transparent)",
	paper70: "color-mix(in oklab, var(--app-paper) 70%, transparent)",
	paper85: "color-mix(in oklab, var(--app-paper) 85%, transparent)",
});

export const font = stylex.defineConsts({
	body: "var(--font-family-body)",
	sans: "var(--app-font-sans)",
	mono: "var(--font-family-code)",
	display: "var(--app-font-display)",
});
