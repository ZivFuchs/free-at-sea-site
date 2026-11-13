import * as stylex from "@stylexjs/stylex";

/** Type and line colours of one side of the surface. Defaults are air; `submerged` re-themes them. */
export const tone = stylex.defineVars({
	text: "oklch(0.21 0.035 240)",
	soft: "oklch(0.21 0.035 240 / 0.66)",
	faint: "oklch(0.21 0.035 240 / 0.42)",
	rule: "oklch(0.21 0.035 240 / 0.16)",
	accent: "oklch(0.43 0.1 232)",
	wash: "oklch(0.21 0.035 240 / 0.06)",
	photo: "saturate(0.9)",
	tint: "transparent",
	veil: "oklch(0.86 0.035 232)",
});

/** On the scene root. */
export const scene = stylex.defineMarker();

export const sea = stylex.defineConsts({
	skyHigh: "oklch(0.86 0.035 232)",
	skyLow: "oklch(0.965 0.012 215)",
	shallow: "oklch(0.5 0.085 205)",
	mid: "oklch(0.32 0.07 225)",
	abyss: "oklch(0.17 0.045 245)",
	sandNear: "oklch(0.13 0.028 240)",
	sandFar: "oklch(0.19 0.04 232)",
	glint: "oklch(0.97 0.03 200)",
	shade: "oklch(0.2 0.06 220)",
});
