import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const smallCaps = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	letterSpacing: "0.22em",
	textTransform: "uppercase",
} as const;
const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "4px",
} as const;
/** Thick over thin, as under an engraved title. */
const doubleRule = {
	height: "5px",
	borderTopWidth: "2px",
	borderBottomWidth: "1px",
	borderStyle: "solid",
	borderInlineWidth: 0,
	borderColor: "currentColor",
} as const;

export const figureMarker = stylex.defaultMarker();

export const styles = stylex.create({
	page: { position: "relative", color: color.ink },
	gutter: { paddingInline: { default: "1.25rem", "@media (min-width: 48rem)": "2.5rem" } },
	measure: { marginInline: "auto", width: "100%", maxWidth: "68rem" },

	/** Lies over the top of the hero stage, so the stage is a full viewport. */
	headerWrap: { position: "absolute", insetInline: 0, top: 0, zIndex: 2 },
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "1rem",
		height: "3.75rem",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: color.ink10,
	},
	wordmark: { ...smallCaps, ...focus, fontWeight: 600 },
	nav: { display: "flex", gap: { default: "1rem", "@media (min-width: 48rem)": "2rem" } },
	navLink: {
		...smallCaps,
		...focus,
		fontSize: { default: "0.625rem", "@media (min-width: 48rem)": "0.6875rem" },
		letterSpacing: { default: "0.16em", "@media (min-width: 48rem)": "0.22em" },
		color: { default: color.muted, ":hover": color.ink },
	},

	/** Tall: its sticky stage holds while the plate develops. */
	hero: {
		position: "relative",
		height: { default: "240svh", "@media (prefers-reduced-motion: reduce)": "100svh" },
	},
	stage: { position: "sticky", top: 0, height: "100svh", minHeight: "32rem", overflow: "hidden" },
	fill: { position: "absolute", inset: 0, width: "100%", height: "100%" },
	still: { objectFit: "cover", filter: "grayscale(1) contrast(1.1)", opacity: 0.35 },
	/** Hidden until the shader draws, so a failed context leaves the still. */
	canvas: {
		display: "block",
		opacity: { default: 0, ":is([data-live])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "500ms",
	},
	titleBlock: {
		position: "absolute",
		insetInline: 0,
		top: { default: "calc(3.75rem + 4svh)", "@media (min-width: 48rem)": "calc(3.75rem + 2.5svh)" },
		textAlign: "center",
		paddingInline: "1.25rem",
	},
	eyebrow: { ...smallCaps, color: color.muted },
	title: {
		marginTop: "0.6rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(12.6vw, 13svh, 9rem)",
		lineHeight: 0.95,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
	},
	titleRule: { ...doubleRule, marginTop: "0.9rem", marginInline: "auto", width: "min(18rem, 60%)" },
	subtitle: {
		marginTop: "0.8rem",
		fontStyle: "italic",
		fontSize: { default: "1rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.3,
	},
	/** Plate lettering under the vignette; clears once the photograph has developed. */
	lettering: {
		position: "absolute",
		insetInline: 0,
		bottom: { default: "4rem", "@media (min-width: 48rem)": "1.75rem" },
		paddingInline: "1.25rem",
		textAlign: "center",
		opacity: "calc(1 - var(--open, 0) * 4)",
	},
	plateNo: { ...smallCaps },
	plateTitle: {
		marginTop: "0.35rem",
		fontStyle: "italic",
		fontSize: "0.9375rem",
		color: color.muted,
	},
	hint: { ...smallCaps, marginTop: "1.1rem", fontSize: "0.625rem", color: color.muted },

	section: { paddingBlock: { default: "4.5rem", "@media (min-width: 48rem)": "7rem" } },
	sectionHead: { textAlign: "center" },
	heading: {
		marginTop: "0.75rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.25rem", "@media (min-width: 48rem)": "3.5rem" },
		lineHeight: 1.02,
	},
	headRule: { ...doubleRule, marginTop: "1.25rem", marginInline: "auto", width: "6rem" },

	prospectus: {
		marginTop: { default: "2.5rem", "@media (min-width: 48rem)": "3.5rem" },
		marginInline: "auto",
		maxWidth: "62rem",
		columnCount: { default: 1, "@media (min-width: 48rem)": 2 },
		columnGap: "3.5rem",
		columnRuleWidth: "1px",
		columnRuleStyle: "solid",
		columnRuleColor: color.ink10,
		fontSize: { default: "1.0625rem", "@media (min-width: 48rem)": "1.125rem" },
		lineHeight: 1.6,
		hyphens: "auto",
	},
	para: { marginBottom: "1em", breakInside: "avoid" },
	dropCap: {
		"::first-letter": {
			float: "left",
			marginRight: "0.08em",
			fontFamily: font.hero,
			fontWeight: 900,
			fontSize: "3.6em",
			lineHeight: 0.8,
			paddingTop: "0.06em",
		},
	},
	terms: {
		marginTop: { default: "2.5rem", "@media (min-width: 48rem)": "3.5rem" },
		marginInline: "auto",
		maxWidth: "62rem",
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 48rem)": "1fr 1fr 1fr" },
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.ink,
	},
	term: {
		paddingBlock: "1.1rem",
		paddingInline: { default: 0, "@media (min-width: 48rem)": "1.25rem" },
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: color.ink10,
		textAlign: { default: "left", "@media (min-width: 48rem)": "center" },
	},
	termValue: { fontFamily: font.hero, fontWeight: 900, fontSize: "1.75rem", lineHeight: 1.1 },
	termLabel: { ...smallCaps, marginTop: "0.35rem", color: color.muted, letterSpacing: "0.16em" },

	plates: {
		marginTop: { default: "2.5rem", "@media (min-width: 48rem)": "4rem" },
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 48rem)": "1fr 1fr" },
		columnGap: "3rem",
		rowGap: { default: "2.75rem", "@media (min-width: 48rem)": "4rem" },
	},
	plateLink: { ...focus, display: "block" },
	frame: {
		position: "relative",
		aspectRatio: "16 / 9",
		overflow: "hidden",
		backgroundColor: color.ink10,
		outlineWidth: "1px",
		outlineStyle: "solid",
		outlineColor: color.ink,
		outlineOffset: "5px",
	},
	poster: {
		objectFit: "cover",
		filter: {
			default: "none",
			[stylex.when.ancestor("[data-mono]")]: "grayscale(1) contrast(1.2)",
		},
		transitionProperty: "filter",
		transitionDuration: "600ms",
	},
	play: {
		position: "absolute",
		right: "0.75rem",
		bottom: "0.75rem",
		display: "grid",
		placeItems: "center",
		width: "2.5rem",
		height: "2.5rem",
		borderRadius: "50%",
		backgroundColor: color.paper,
		color: color.ink,
		opacity: { default: 0, [stylex.when.ancestor("[data-developed]")]: 1 },
		transitionProperty: "opacity",
		transitionDuration: "400ms",
	},
	triangle: { width: "0.7rem", height: "0.8rem", marginLeft: "0.15rem" },
	plateCaption: {
		marginTop: "1.35rem",
		display: "flex",
		alignItems: "baseline",
		gap: "0.9rem",
	},
	clipTitle: {
		fontStyle: "italic",
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.3,
	},

	notices: {
		marginTop: { default: "2rem", "@media (min-width: 48rem)": "3.5rem" },
		marginInline: "auto",
		maxWidth: "52rem",
	},
	notice: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.ink10,
	},
	noticeLink: {
		...focus,
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 48rem)": "11rem 1fr" },
		columnGap: "2rem",
		rowGap: "0.5rem",
		paddingBlock: { default: "1.5rem", "@media (min-width: 48rem)": "2rem" },
	},
	outlet: { ...smallCaps, paddingTop: "0.4rem" },
	date: {
		...smallCaps,
		display: "block",
		marginTop: "0.4rem",
		letterSpacing: "0.14em",
		color: color.muted,
	},
	headline: {
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.75rem" },
		lineHeight: 1.25,
		textDecorationLine: { default: "none", [stylex.when.ancestor(":hover")]: "underline" },
		textDecorationThickness: "1px",
		textUnderlineOffset: "0.2em",
	},
	quote: {
		display: "block",
		marginTop: "0.6rem",
		fontStyle: "italic",
		color: color.muted,
		lineHeight: 1.5,
	},

	/** The site's own dark sections, set into the paper like the back board of the book. */
	board: { backgroundColor: color.ocean, color: color.paper },
});

export const noticeMarker = stylex.defaultMarker();
