import * as stylex from "@stylexjs/stylex";

export const tone = stylex.defineConsts({
	/** Under `mix-blend-mode: screen`, black is a clear window onto the footage. */
	window: "#000",
	/** And white hides it completely. */
	blank: "#fff",
	/** Text seen through water. */
	submerged: "color-mix(in oklab, var(--app-paper) 88%, var(--app-accent))",
	shade: "color-mix(in oklab, var(--app-ocean) 55%, transparent)",
	veil: "color-mix(in oklab, var(--app-ocean) 38%, transparent)",
});
