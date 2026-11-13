import * as stylex from "@stylexjs/stylex";

/** The cabin: darker and cooler than the open-water page ground. */
export const cabin = stylex.defineConsts({
	wallLit: "oklch(0.24 0.045 240)",
	wall: "oklch(0.15 0.035 245)",
	wallDeep: "oklch(0.09 0.025 245)",
	rim: "oklch(0.2 0.03 240)",
	rimEdge: "oklch(0.36 0.03 235)",
	glass: "oklch(0.07 0.02 240)",
	spill: "oklch(0.8 0.08 215 / 0.14)",
	water: "oklch(0.55 0.09 215 / 0.38)",
	waterDeep: "oklch(0.3 0.08 235 / 0.72)",
});
