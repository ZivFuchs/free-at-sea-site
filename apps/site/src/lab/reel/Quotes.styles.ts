import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const surface = stylex.keyframes({
	from: { opacity: 0, translate: "0 4rem", filter: "blur(10px)" },
});

export const quoteMarker = stylex.defaultMarker();

export const styles = stylex.create({
	section: {
		position: "relative",
		zIndex: 1,
		backgroundColor: color.ocean,
		color: color.paper,
		paddingBlock: { default: "4rem", "@media (min-width: 48rem)": "7rem" },
	},
	heading: {
		fontFamily: font.display,
		fontSize: { default: "3rem", "@media (min-width: 48rem)": "4.5rem" },
		lineHeight: 0.95,
		textTransform: "uppercase",
	},
	list: {
		display: "flex",
		flexDirection: "column",
		gap: { default: "4rem", "@media (min-width: 48rem)": "7rem" },
		marginTop: { default: "2.5rem", "@media (min-width: 48rem)": "4rem" },
	},
	/** Each quote rises out of the dark as it enters, like something surfacing. */
	item: {
		maxWidth: "52rem",
		animationName: {
			default: "none",
			"@supports (animation-timeline: view())": {
				default: surface,
				"@media (prefers-reduced-motion: reduce)": "none",
			},
		},
		animationTimingFunction: "ease-out",
		animationFillMode: "both",
		animationTimeline: "view()",
		animationRange: "entry 0% cover 32%",
	},
	shifted: { marginLeft: { default: 0, "@media (min-width: 48rem)": "auto" } },
	link: {
		display: "block",
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "8px",
	},
	quote: {
		width: "fit-content",
		fontFamily: font.body,
		fontStyle: "italic",
		fontSize: { default: "1.625rem", "@media (min-width: 48rem)": "2.75rem" },
		lineHeight: 1.18,
		letterSpacing: "-0.01em",
		color: { default: color.paper, [stylex.when.ancestor(":hover")]: color.aqua },
		transitionProperty: "color",
		transitionDuration: "200ms",
	},
	by: { display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.5rem" },
	thumb: {
		flexShrink: 0,
		width: { default: "5rem", "@media (min-width: 48rem)": "7rem" },
		aspectRatio: "16 / 9",
		objectFit: "cover",
		backgroundColor: color.ink,
	},
	source: { display: "flex", flexDirection: "column", gap: "0.375rem" },
	outlet: {
		fontFamily: font.sans,
		fontSize: "0.8125rem",
		fontWeight: 600,
		letterSpacing: "0.14em",
		textTransform: "uppercase",
	},
	meta: {
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: color.paper50,
	},
});
