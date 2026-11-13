import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";

const AT = "var(--lamp-x, 50vw) var(--lamp-y, 50vh)";

const layer = {
	position: "fixed",
	inset: 0,
	pointerEvents: "none",
} as const;

export const styles = stylex.create({
	/** `color` is the stroke tint the script reads. Above the header, below the panel. */
	wake: {
		...layer,
		zIndex: 45,
		width: "100%",
		height: "100%",
		color: color.aqua,
		mixBlendMode: "screen",
	},
	/** The torch's haze in the water: visible even on bare ground. */
	glow: {
		...layer,
		zIndex: 30,
		opacity: "var(--lamp, 0)",
		mixBlendMode: "screen",
		backgroundImage: `radial-gradient(circle 17rem at ${AT}, color-mix(in oklab, ${color.aqua} 13%, transparent), color-mix(in oklab, ${color.aqua} 4%, transparent) 55%, transparent)`,
	},
	/** What the beam lands on lifts: imagery brightens, the ground barely changes. */
	lift: {
		...layer,
		zIndex: 30,
		opacity: "var(--lamp, 0)",
		mixBlendMode: "overlay",
		backgroundImage: `radial-gradient(circle 13rem at ${AT}, ${color.paper50}, transparent)`,
	},
});
