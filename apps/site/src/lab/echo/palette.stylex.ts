import * as stylex from "@stylexjs/stylex";

export const palette = stylex.defineConsts({
	/** Unlit water. */
	ground: "oklch(0.115 0.028 245)",
	/** Sonar trace. `rgb()` so canvas can parse it everywhere. */
	phosphor: "rgb(126 226 236)",
	phosphor70: "rgb(126 226 236 / 0.7)",
	phosphor35: "rgb(126 226 236 / 0.35)",
	phosphor15: "rgb(126 226 236 / 0.15)",
});
