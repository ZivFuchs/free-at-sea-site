import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { sea } from "./palette.stylex";

const caps = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	letterSpacing: "0.16em",
	textTransform: "uppercase",
} as const;

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "4px",
} as const;

export const styles = stylex.create({
	/** Clips the corners the rolling deck swings past the viewport. */
	sea: { overflowX: "clip" },
	/** `flow-root`: the hero's negative top margin must not collapse through and lift the deck. */
	deck: { position: "relative", display: "flow-root", willChange: "transform" },

	header: {
		position: "absolute",
		insetInline: 0,
		top: { default: "0.5rem", "@media (min-width: 48rem)": "2rem" },
		zIndex: 5,
		color: color.paper,
	},
	headerInk: { color: color.ink },
	bar: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		height: "3.75rem",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: "color-mix(in oklab, currentColor 45%, transparent)",
	},
	wordmark: {
		...focus,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.25rem", "@media (min-width: 48rem)": "1.5rem" },
		letterSpacing: "0.01em",
	},
	/** Hangs from the bar's rule. */
	nav: {
		position: "absolute",
		top: "100%",
		right: 0,
		display: "flex",
		alignItems: "flex-start",
		gap: { default: "1.5rem", "@media (min-width: 48rem)": "2.5rem" },
	},
	navLink: {
		...caps,
		...focus,
		display: "block",
		paddingBlock: "0.5rem",
		opacity: { default: 0.8, ":hover": 1 },
		transitionProperty: "opacity",
		transitionDuration: "150ms",
	},

	/** A plumb weight: pivots at its top centre, its angle set by script. */
	hang: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		transformOrigin: "50% 0",
		willChange: "transform",
	},
	line: {
		width: "1px",
		height: "var(--line)",
		backgroundColor: "color-mix(in oklab, currentColor 45%, transparent)",
	},

	hero: {
		position: "relative",
		isolation: "isolate",
		height: "calc(100svh + 3rem)",
		minHeight: "35rem",
		// Bleeds past the deck's top and sides, which swing into view as it rolls.
		marginTop: "-3rem",
		marginInline: "-3rem",
		overflow: "hidden",
		backgroundColor: sea.haze,
	},
	/** Counter-rotated against the deck, so the horizon in it stays level. */
	scene: { position: "absolute", inset: "3rem 0 0", willChange: "transform" },
	media: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		objectFit: "cover",
		objectPosition: "50% calc(var(--horizon) * 100%)",
		transformOrigin: "50% calc(var(--horizon) * 100%)",
		scale: 1.3,
	},
	video: {
		opacity: { default: 0, ":is([data-playing])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.5s",
		transitionTimingFunction: "ease-out",
	},
	copy: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100%)",
		textAlign: "center",
		color: color.paper,
	},
	title: {
		marginTop: "0.1em",
		fontFamily: font.hero,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		opacity: 0.88,
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		lineHeight: 1.3,
		fontStyle: "italic",
		opacity: 0.88,
	},
	/** Deck furniture over the hero: sways with everything else. */
	foot: {
		position: "absolute",
		insetInline: "3rem",
		bottom: { default: "4.5rem", "@media (min-width: 48rem)": "3rem" },
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "1rem",
		color: color.paper,
		textAlign: "center",
	},
	hint: { ...caps, color: color.paper70 },
	button: {
		...caps,
		...focus,
		display: { default: null, ":is([hidden])": "none" },
		paddingBlock: "0.75rem",
		paddingInline: "1.25rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper50,
		borderRadius: "999px",
		backgroundColor: { default: sea.glass, ":hover": color.ink },
		backdropFilter: "blur(8px)",
		color: color.paper,
		cursor: "pointer",
		transitionProperty: "background-color",
		transitionDuration: "150ms",
	},

	/** Section break: a rule that stays level, with a tag hanging plumb from its centre. */
	station: {
		position: "relative",
		display: "flex",
		justifyContent: "center",
		height: "3rem",
		color: color.paper65,
	},
	rule: {
		position: "absolute",
		top: 0,
		left: "50%",
		width: "220vw",
		marginLeft: "-110vw",
		height: "1px",
		backgroundColor: sea.paper30,
		willChange: "transform",
	},
	tag: { ...caps, paddingTop: "0.375rem", fontVariantNumeric: "tabular-nums" },

	passage: {
		paddingBlock: { default: "2.5rem 4.5rem", "@media (min-width: 48rem)": "4rem 7rem" },
		textAlign: "center",
	},
	eyebrow: { ...caps, color: color.aqua },
	heading: {
		marginTop: "1.25rem",
		marginInline: "auto",
		maxWidth: "22ch",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2rem", "@media (min-width: 48rem)": "3.25rem" },
		lineHeight: 1.08,
	},
	body: {
		marginTop: "1.5rem",
		marginInline: "auto",
		maxWidth: "34rem",
		fontSize: { default: "1.0625rem", "@media (min-width: 48rem)": "1.1875rem" },
		lineHeight: 1.6,
		color: color.paper85,
	},

	/** Inclinometer: fixed to the screen, not the deck. */
	gauge: {
		position: "fixed",
		right: "0.75rem",
		bottom: "0.75rem",
		zIndex: 60,
		display: "flex",
		alignItems: "center",
		gap: "0.625rem",
		paddingBlock: "0.375rem",
		paddingInline: "0.375rem 0.5rem",
		borderRadius: "999px",
		backgroundColor: sea.glass,
		backdropFilter: "blur(8px)",
		color: color.paper,
	},
	dial: { display: "block", width: "2.25rem", height: "2.25rem", flexShrink: 0 },
	dialSea: { fill: color.aqua, fillOpacity: 0.35 },
	dialLine: { stroke: color.aqua, strokeWidth: 1.25 },
	dialRim: { fill: "none", stroke: color.paper45, strokeWidth: 1 },
	dialMark: { stroke: color.paper, strokeWidth: 1.25, strokeLinecap: "round" },
	readout: {
		display: "grid",
		gridTemplateColumns: "auto auto",
		columnGap: "0.5rem",
		fontFamily: font.mono,
		fontSize: "0.625rem",
		lineHeight: 1.5,
		letterSpacing: "0.06em",
		textTransform: "uppercase",
		fontVariantNumeric: "tabular-nums",
	},
	term: { color: color.paper65 },
	value: { minWidth: "5.5ch", textAlign: "right" },
	steady: {
		...caps,
		...focus,
		fontSize: "0.625rem",
		paddingBlock: "0.5rem",
		paddingInline: "0.75rem",
		borderRadius: "999px",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: { default: color.paper45, ":is([aria-pressed=true])": color.aqua },
		backgroundColor: { default: "transparent", ":is([aria-pressed=true])": color.aqua },
		color: { default: color.paper, ":is([aria-pressed=true])": color.ink },
		cursor: { default: "pointer", ":disabled": "default" },
	},
});
