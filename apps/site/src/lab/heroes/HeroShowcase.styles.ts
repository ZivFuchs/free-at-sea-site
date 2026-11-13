import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
	showcase: { position: "relative" },
	/** Stand-in the site header measures for its wordmark crossfade: laid over the active variant's title. */
	proxy: { position: "absolute", visibility: "hidden", pointerEvents: "none" },
});
