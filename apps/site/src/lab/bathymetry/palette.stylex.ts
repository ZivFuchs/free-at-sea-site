import * as stylex from "@stylexjs/stylex";

export const survey = stylex.defineConsts({
	/** The scene's fog: what the floor fades into. */
	fog: "oklch(0.15 0.045 262)",
	fog0: "oklch(0.15 0.045 262 / 0)",
	fog55: "oklch(0.15 0.045 262 / 0.55)",
	fog80: "oklch(0.15 0.045 262 / 0.8)",
	fog92: "oklch(0.15 0.045 262 / 0.92)",
	/** Fallback floor when WebGL is missing. */
	shoal: "oklch(0.3 0.08 240)",
	line: "oklch(0.86 0.06 205)",
	line25: "oklch(0.86 0.06 205 / 0.25)",
	line12: "oklch(0.86 0.06 205 / 0.12)",
});
