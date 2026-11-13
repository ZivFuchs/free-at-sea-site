import * as stylex from "@stylexjs/stylex";

export const drift = stylex.defineConsts({
	/** Fallback water column, matching the shader's gradient. */
	column:
		"linear-gradient(to top, oklch(0.13 0.03 245), oklch(0.2 0.045 240) 70%, oklch(0.3 0.06 225))",
	glow: "color-mix(in oklab, oklch(0.8 0.08 215) 30%, transparent)",
	glowSoft: "color-mix(in oklab, oklch(0.8 0.08 215) 12%, transparent)",
	rim: "color-mix(in oklab, oklch(0.8 0.08 215) 45%, transparent)",
	panel: "color-mix(in oklab, oklch(0.16 0.04 245) 62%, transparent)",
	screen: "oklch(0.1 0.02 245)",
});
