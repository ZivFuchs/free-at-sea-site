import * as stylex from "@stylexjs/stylex";

export const deep = stylex.defineConsts({
	/** Ink as glass, for chrome that floats over the water. */
	glass: "color-mix(in oklab, var(--app-ink) 72%, transparent)",
	scrim: "color-mix(in oklab, var(--app-ink) 55%, transparent)",
	/** Halo that keeps text readable over bright water without reading as a shadow. */
	halo: "0 0 1.5rem color-mix(in oklab, var(--app-ink) 55%, transparent), 0 0 0.25rem color-mix(in oklab, var(--app-ink) 35%, transparent)",
	surface: "oklch(0.78 0.08 215)",
	midwater: "oklch(0.36 0.09 245)",
});
