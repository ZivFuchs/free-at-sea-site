import * as stylex from "@stylexjs/stylex";

/** Water as light: brightest just under the meniscus, gone a body's height down. */
export const water = stylex.defineConsts({
	meniscus: "oklch(0.96 0.03 210 / 0.95)",
	glint: "oklch(0.9 0.06 210 / 0.28)",
	shallow: "oklch(0.72 0.1 215 / 0.5)",
	mid: "oklch(0.5 0.1 232 / 0.3)",
	deep: "oklch(0.3 0.08 245 / 0)",
	raft: "oklch(0.985 0.003 230)",
});
