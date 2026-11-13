import * as stylex from "@stylexjs/stylex";

export const night = stylex.defineConsts({
	/** Sky away from any glow. */
	black: "oklch(0.09 0.02 255)",
	horizon: "oklch(0.17 0.035 250)",
	veil: "oklch(0.09 0.02 255 / 0.62)",
	veilClear: "oklch(0.09 0.02 255 / 0)",
	/** Instrument ink: starlight through haze. */
	glass: "oklch(0.82 0.06 225)",
	glassDim: "oklch(0.82 0.06 225 / 0.55)",
	rule: "oklch(0.82 0.06 225 / 0.22)",
});
