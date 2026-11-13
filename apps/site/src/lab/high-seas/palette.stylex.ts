import * as stylex from "@stylexjs/stylex";

export const sea = stylex.defineConsts({
	/** Below the page blue: the unlit side of the planet. */
	ground: "oklch(0.13 0.035 250)",
	/** Where the globe's light pools. */
	bloom: "oklch(0.24 0.06 242)",
	/** The one warm colour: people, places, routes. */
	signal: "oklch(0.86 0.09 75)",
	/** National waters, as in the globe's dim dots. */
	coastal: "oklch(0.53 0.06 245)",
	groundVeil: "color-mix(in oklab, oklch(0.13 0.035 250) 78%, transparent)",
});
