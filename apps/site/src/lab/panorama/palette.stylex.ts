import * as stylex from "@stylexjs/stylex";

/** Flat poster colours for the passage: five skies, five seas, and the few inks drawn on them. */
export const sky = stylex.defineConsts({
	dawn: "linear-gradient(oklch(0.74 0.06 255), oklch(0.86 0.06 40) 62%, oklch(0.91 0.08 75))",
	day: "linear-gradient(oklch(0.72 0.1 238), oklch(0.86 0.06 225) 70%, oklch(0.93 0.03 215))",
	gold: "linear-gradient(oklch(0.7 0.08 255), oklch(0.84 0.09 75) 58%, oklch(0.8 0.14 52))",
	dusk: "linear-gradient(oklch(0.27 0.07 272), oklch(0.45 0.11 320) 60%, oklch(0.68 0.14 30))",
	night: "linear-gradient(oklch(0.13 0.035 262), oklch(0.2 0.05 255) 70%, oklch(0.27 0.06 248))",
});

export const sea = stylex.defineConsts({
	dawn: "linear-gradient(oklch(0.52 0.07 245), oklch(0.3 0.06 248))",
	day: "linear-gradient(oklch(0.5 0.1 232), oklch(0.29 0.07 242))",
	gold: "linear-gradient(oklch(0.5 0.08 225), oklch(0.27 0.06 240))",
	dusk: "linear-gradient(oklch(0.34 0.08 268), oklch(0.19 0.05 258))",
	night: "linear-gradient(oklch(0.2 0.05 255), oklch(0.12 0.03 258))",
});

export const ink = stylex.defineConsts({
	sun: "oklch(0.97 0.05 85)",
	moon: "oklch(0.95 0.015 235)",
	lamp: "oklch(0.88 0.14 80)",
	hull: "oklch(0.24 0.04 250)",
	rust: "oklch(0.52 0.11 42)",
	cargo: "oklch(0.56 0.1 232)",
	foam: "oklch(0.97 0.01 220)",
});
