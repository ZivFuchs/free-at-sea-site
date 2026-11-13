import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { air } from "./palette.stylex";

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	lineHeight: 1.4,
	letterSpacing: "0.16em",
	textTransform: "uppercase",
	fontVariantNumeric: "tabular-nums",
} as const;

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "4px",
} as const;

const bob = stylex.keyframes({
	"0%": { scale: "1 0", transformOrigin: "top" },
	"50%": { scale: "1 1", transformOrigin: "top" },
	"50.01%": { scale: "1 1", transformOrigin: "bottom" },
	"100%": { scale: "1 0", transformOrigin: "bottom" },
});

/** On elements whose state descendants style against (header, rail tick). */
export const marker = stylex.defaultMarker();

export const styles = stylex.create({
	root: { position: "relative", isolation: "isolate", color: color.paper, overflowX: "clip" },
	sky: {
		position: "fixed",
		inset: 0,
		zIndex: -1,
		width: "100%",
		height: "100lvh",
		backgroundColor: air.ground,
	},

	header: {
		position: "fixed",
		top: 0,
		insetInline: 0,
		zIndex: 40,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		height: "4.5rem",
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "2.5rem" },
		color: air.top,
	},
	scrim: {
		position: "absolute",
		insetInline: 0,
		top: 0,
		zIndex: -1,
		height: "7rem",
		backgroundImage: `linear-gradient(${air.scrim}, transparent)`,
		pointerEvents: "none",
		opacity: { default: 0, [stylex.when.ancestor("[data-under]")]: 1 },
		transitionProperty: "opacity",
		transitionDuration: "600ms",
	},
	wordmark: {
		...focus,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.625rem" },
		letterSpacing: "0.01em",
		whiteSpace: "nowrap",
		opacity: { default: 0, [stylex.when.ancestor("[data-under]")]: 1 },
		transitionProperty: "opacity",
		transitionDuration: "600ms",
	},
	nav: { display: { default: "none", "@media (min-width: 48rem)": "flex" }, gap: "2.25rem" },
	navLink: {
		...label,
		...focus,
		fontSize: "0.8125rem",
		letterSpacing: "0.14em",
		opacity: { default: 0.75, ":hover": 1 },
		transitionProperty: "opacity",
		transitionDuration: "150ms",
	},

	hero: {
		position: "relative",
		height: "100svh",
		minHeight: "32rem",
		textAlign: "center",
	},
	/** In the open sky above the deck: the horizon sits about two fifths down. */
	heroCopy: {
		position: "absolute",
		insetInline: 0,
		top: { default: "13svh", "@media (min-width: 48rem)": "11svh" },
	},
	eyebrow: { ...label, opacity: 0.8 },
	title: {
		marginTop: "0.75rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(13.3vw, 15svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		textShadow: "0 0 3rem oklch(0.3 0.09 255 / 0.35)",
	},
	tagline: {
		marginTop: "0.75rem",
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.75rem" },
		fontStyle: "italic",
		textShadow: "0 0 1.5rem oklch(0.3 0.09 255 / 0.5)",
	},
	cue: {
		...label,
		position: "absolute",
		insetInline: 0,
		bottom: "2.25rem",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "0.75rem",
		color: color.ink,
	},
	cueLine: {
		width: "1px",
		height: "2.5rem",
		backgroundColor: "currentColor",
		animationName: { default: bob, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "2.4s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
	},

	passage: {
		display: "grid",
		alignItems: "center",
		minHeight: "150svh",
		paddingBlock: "20svh",
		color: air.text,
	},
	column: { maxWidth: "40rem" },
	mark: { ...label, display: "flex", alignItems: "center", gap: "0.75rem", color: air.muted },
	markRule: { width: "2.5rem", height: "1px", backgroundColor: air.rule },
	lede: {
		marginTop: "1.5rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.25rem", "@media (min-width: 48rem)": "3.5rem" },
		lineHeight: 1.05,
	},
	body: {
		marginTop: "1.5rem",
		maxWidth: "34rem",
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.55,
	},

	interlude: {
		display: "grid",
		alignItems: "center",
		minHeight: "110svh",
		color: air.text,
	},
	breakLine: {
		marginTop: "1.25rem",
		maxWidth: "22ch",
		fontSize: { default: "1.75rem", "@media (min-width: 48rem)": "2.5rem" },
		lineHeight: 1.2,
		fontStyle: "italic",
	},

	/** Site sections set in paper: a soft shade of weather behind them keeps their contrast. */
	level: { position: "relative" },
	shade: {
		position: "absolute",
		inset: 0,
		zIndex: -1,
		backgroundImage: `linear-gradient(transparent, color-mix(in oklab, ${color.ocean} 42%, transparent) 14%, color-mix(in oklab, ${color.ocean} 42%, transparent) 86%, transparent)`,
	},
	levelMark: { paddingTop: "4rem" },

	signup: {
		display: "grid",
		alignItems: "center",
		minHeight: "90svh",
		paddingBlock: "5rem",
	},
	card: { maxWidth: "30rem" },

	footer: {
		paddingBlock: { default: "3rem 6.5rem", "@media (min-width: 48rem)": "3rem 2.5rem" },
		textAlign: "center",
	},
	links: {
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "center",
		columnGap: "2.25rem",
		rowGap: "0.75rem",
	},
	link: { ...label, ...focus, fontSize: "0.8125rem", opacity: { default: 0.75, ":hover": 1 } },
	legal: { ...label, marginTop: "1.5rem", opacity: 0.5 },

	/** The altimeter: always on dark glass, so it reads at every altitude. */
	altimeter: {
		position: "fixed",
		right: { default: "0.75rem", "@media (min-width: 48rem)": "2.5rem" },
		bottom: { default: "0.75rem", "@media (min-width: 48rem)": "2rem" },
		zIndex: 45,
		display: "grid",
		justifyItems: "end",
		rowGap: "0.125rem",
		paddingBlock: "0.5rem",
		paddingInline: "0.875rem",
		borderRadius: "0.25rem",
		backgroundColor: air.glass,
		backdropFilter: "blur(10px)",
		color: color.paper,
	},
	metres: {
		fontFamily: font.sans,
		fontSize: "1.125rem",
		lineHeight: 1.2,
		letterSpacing: "0.04em",
		fontVariantNumeric: "tabular-nums",
	},
	feet: { ...label, color: color.paper65 },
	state: { ...label, color: color.aqua },

	/** Desktop: an altitude tape on the right edge, one tick per section. */
	rail: {
		position: "fixed",
		right: "2.5rem",
		top: "50%",
		zIndex: 45,
		display: { default: "none", "@media (min-width: 90rem)": "block" },
		height: "min(42svh, 22rem)",
		translate: "0 -50%",
		color: air.text,
	},
	stops: {
		position: "relative",
		height: "100%",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderRightColor: air.rule,
	},
	stop: { position: "absolute", right: 0, top: "calc(var(--at, 0) * 100%)", translate: "0 -50%" },
	tick: {
		...label,
		...focus,
		display: "flex",
		alignItems: "center",
		gap: "0.625rem",
		whiteSpace: "nowrap",
	},
	tickLabel: {
		opacity: {
			default: 0,
			[stylex.when.ancestor(":hover")]: 1,
			[stylex.when.ancestor(":focus-visible")]: 1,
			[stylex.when.ancestor("[data-current]")]: 1,
		},
		transitionProperty: "opacity",
		transitionDuration: "200ms",
	},
	tickLine: {
		width: {
			default: "0.5rem",
			[stylex.when.ancestor(":hover")]: "1rem",
			[stylex.when.ancestor("[data-current]")]: "1rem",
		},
		height: "1px",
		backgroundColor: "currentColor",
		transitionProperty: "width",
		transitionDuration: "200ms",
	},
	needle: {
		position: "absolute",
		right: "-3px",
		top: "calc(var(--p, 0) * 100%)",
		width: "5px",
		height: "5px",
		marginTop: "-2.5px",
		borderRadius: "50%",
		backgroundColor: "currentColor",
	},
});
