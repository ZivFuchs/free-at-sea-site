import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const sink = stylex.keyframes({ to: { filter: "brightness(0.4)", scale: 1.06 } });

export const styles = stylex.create({
	/** Stays put while the clips' swell rises over it. */
	hero: {
		position: "sticky",
		top: 0,
		zIndex: 0,
		overflow: "clip",
	},
	sinking: {
		animationName: {
			default: "none",
			"@supports (animation-timeline: scroll())": {
				default: sink,
				"@media (prefers-reduced-motion: reduce)": "none",
			},
		},
		animationTimingFunction: "linear",
		animationFillMode: "both",
		animationTimeline: "scroll()",
		animationRange: "0px 100svh",
	},
	cue: {
		position: "absolute",
		insetInline: 0,
		bottom: { default: "3rem", "@media (min-width: 48rem)": "4.5rem" },
		textAlign: "center",
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.2em",
		textTransform: "uppercase",
		color: color.paper70,
	},
	over: { position: "relative", zIndex: 1, backgroundColor: color.ocean },
});
