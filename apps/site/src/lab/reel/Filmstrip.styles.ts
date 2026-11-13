import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const advance = stylex.keyframes({ to: { transform: "translateX(calc(100cqw - 100%))" } });
const fill = stylex.keyframes({ from: { scale: "0 1" }, to: { scale: "1 1" } });

const GUTTER = "max(1.5rem, calc((100cqw - 80rem) / 2 + 2.5rem))";
const SPROCKETS = `repeating-linear-gradient(90deg, ${color.paper15} 0 0.625rem, transparent 0.625rem 1.75rem)`;
const sprockets = {
	content: "''",
	position: "absolute",
	insetInline: 0,
	height: "0.3125rem",
	backgroundImage: SPROCKETS,
} as const;

/** On each tile link, for hover states inside it. */
export const tileMarker = stylex.defaultMarker();

/**
 * With scroll-driven animations the section pins for a screen and vertical scroll advances the strip;
 * without them (or under reduced motion) it is an ordinary swipeable row.
 */
export const styles = stylex.create({
	section: {
		position: "relative",
		zIndex: 1,
		backgroundColor: color.ocean,
		color: color.paper,
		viewTimelineName: "--reel-strip",
		height: {
			default: "auto",
			"@supports (animation-timeline: view())": {
				default: "calc(100svh + var(--count) * 55vh)",
				"@media (prefers-reduced-motion: reduce)": "auto",
			},
		},
	},
	/** The section's top edge is a swell rising over the hero. */
	swell: {
		position: "absolute",
		insetInline: 0,
		bottom: "calc(100% - 1px)",
		width: "100%",
		height: { default: "1.5rem", "@media (min-width: 48rem)": "3rem" },
		fill: color.ocean,
	},
	anchor: { position: "absolute", left: 0, scrollMarginTop: "-4.5rem" },
	stage: {
		position: {
			default: "static",
			"@supports (animation-timeline: view())": {
				default: "sticky",
				"@media (prefers-reduced-motion: reduce)": "static",
			},
		},
		top: 0,
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		gap: { default: "1rem", "@media (min-width: 48rem)": "1.5rem" },
		height: {
			default: "auto",
			"@supports (animation-timeline: view())": {
				default: "100svh",
				"@media (prefers-reduced-motion: reduce)": "auto",
			},
		},
		paddingBlock: "5rem 2.5rem",
	},
	head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" },
	heading: {
		fontFamily: font.display,
		fontSize: { default: "3rem", "@media (min-width: 48rem)": "4.5rem" },
		lineHeight: 0.95,
		textTransform: "uppercase",
	},
	label: {
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: color.paper50,
		fontVariantNumeric: "tabular-nums",
	},
	viewport: {
		containerType: "inline-size",
		overflowX: {
			default: "auto",
			"@supports (animation-timeline: view())": {
				default: "clip",
				"@media (prefers-reduced-motion: reduce)": "auto",
			},
		},
		scrollSnapType: "x mandatory",
		scrollbarWidth: "none",
	},
	track: {
		position: "relative",
		display: "flex",
		gap: { default: "0.875rem", "@media (min-width: 48rem)": "1.5rem" },
		width: "max-content",
		paddingBlock: "1.125rem",
		paddingInline: GUTTER,
		animationName: {
			default: "none",
			"@supports (animation-timeline: view())": {
				default: advance,
				"@media (prefers-reduced-motion: reduce)": "none",
			},
		},
		animationTimingFunction: "linear",
		animationFillMode: "both",
		animationTimeline: "--reel-strip",
		animationRange: "contain 0% contain 100%",
		"::before": { ...sprockets, top: 0 },
		"::after": { ...sprockets, bottom: 0 },
	},
	tile: {
		width: {
			default: "80cqw",
			"@media (min-width: 48rem)": "min(72cqw, calc((100svh - 22rem) * 16 / 9))",
		},
		scrollSnapAlign: "center",
	},
	link: {
		display: "block",
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "4px",
	},
	frame: {
		position: "relative",
		aspectRatio: "16 / 9",
		overflow: "hidden",
	},
	poster: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
		scale: { default: 1, [stylex.when.ancestor(":hover")]: 1.04 },
		transitionProperty: "scale",
		transitionDuration: "900ms",
		transitionTimingFunction: "cubic-bezier(0.2, 0.6, 0.2, 1)",
	},
	legend: {
		display: "flex",
		alignItems: "baseline",
		gap: "0.875rem",
		marginTop: "0.75rem",
	},
	title: {
		width: "fit-content",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.25rem", "@media (min-width: 48rem)": "1.5rem" },
		lineHeight: 1.15,
		color: { default: color.paper, [stylex.when.ancestor(":hover")]: color.aqua },
		transitionProperty: "color",
		transitionDuration: "200ms",
	},
	foot: { display: "flex", alignItems: "center", gap: "1rem" },
	rule: { position: "relative", flex: 1, height: "1px", backgroundColor: color.paper15 },
	ruleFill: {
		position: "absolute",
		inset: 0,
		backgroundColor: color.aqua,
		transformOrigin: "left",
		scale: "0 1",
		animationName: {
			default: "none",
			"@supports (animation-timeline: view())": {
				default: fill,
				"@media (prefers-reduced-motion: reduce)": "none",
			},
		},
		animationTimingFunction: "linear",
		animationFillMode: "both",
		animationTimeline: "--reel-strip",
		animationRange: "contain 0% contain 100%",
	},
});
