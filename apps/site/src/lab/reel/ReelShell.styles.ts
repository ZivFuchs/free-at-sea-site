import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const settle = stylex.keyframes({ from: { opacity: 0 } });

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "6px",
} as const;

export const styles = stylex.create({
	/** Same on every page, so it holds still while the pages change beneath it. */
	header: {
		position: "fixed",
		insetInline: 0,
		top: 0,
		zIndex: 40,
		viewTransitionName: "reel-header",
		color: color.paper,
	},
	/** Clear over the hero, abyss glass once the page has scrolled under it. */
	glass: {
		position: "absolute",
		inset: 0,
		zIndex: -1,
		backgroundColor: color.abyss90,
		backdropFilter: "blur(12px)",
		animationName: { default: "none", "@supports (animation-timeline: scroll())": settle },
		animationTimingFunction: "linear",
		animationFillMode: "both",
		animationTimeline: "scroll()",
		animationRange: "0px 60svh",
	},
	/** Painted only during a transition, as the tide's bright edge (see transitions.css). */
	foam: {
		position: "fixed",
		top: 0,
		left: 0,
		width: "1px",
		height: "1px",
		pointerEvents: "none",
		viewTransitionName: "reel-foam",
	},
	bar: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "1rem",
		height: "4.5rem",
	},
	wordmark: {
		...focus,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.25rem", "@media (min-width: 48rem)": "1.625rem" },
		whiteSpace: "nowrap",
	},
	nav: { display: "flex", gap: { default: "1.25rem", "@media (min-width: 48rem)": "2.25rem" } },
	link: {
		...focus,
		fontFamily: font.sans,
		fontSize: { default: "0.6875rem", "@media (min-width: 48rem)": "0.8125rem" },
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: { default: color.paper70, ":hover": color.paper },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	wide: { display: { default: "none", "@media (min-width: 30rem)": "inline" } },
	footer: {
		paddingBlock: "2rem 3.5rem",
		textAlign: "center",
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: color.paper45,
	},
});
