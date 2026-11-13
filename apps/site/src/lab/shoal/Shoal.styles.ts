import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { water } from "./palette.stylex";

/** On each link whose children react to its hover. */
export const linkMarker = stylex.defaultMarker();

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.16em",
	textTransform: "uppercase",
} as const;

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "4px",
} as const;

const rise = stylex.keyframes({ from: { opacity: 0 } });

export const styles = stylex.create({
	root: { position: "relative", isolation: "isolate", overflowX: "clip", color: color.paper },
	/** Light from above, falling off into the dark as the page descends (`--depth`). */
	water: {
		position: "fixed",
		inset: 0,
		zIndex: -2,
		backgroundColor: water.deep,
		backgroundImage: `radial-gradient(120% 75% at 50% -12%, ${water.lit}, ${water.mid} 46%, ${water.deep} 100%)`,
	},
	dark: {
		position: "absolute",
		inset: 0,
		backgroundColor: water.dark,
		opacity: "calc(var(--depth, 0) * 0.82)",
	},
	canvas: {
		position: "fixed",
		inset: 0,
		zIndex: -1,
		width: "100%",
		height: "100%",
		pointerEvents: "none",
	},
	bar: {
		position: "absolute",
		insetInline: 0,
		top: 0,
		zIndex: 2,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		height: "4.5rem",
	},
	mark: { ...focus, fontFamily: font.hero, fontWeight: 900, fontSize: "1.25rem" },
	nav: { display: "flex", gap: { default: "1.25rem", "@media (min-width: 48rem)": "2.25rem" } },
	navLink: {
		...focus,
		...eyebrow,
		color: { default: color.paper65, ":hover": color.paper },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},

	hero: {
		display: "grid",
		alignContent: "center",
		justifyItems: "center",
		minHeight: "100svh",
		paddingBlock: "6rem",
		textAlign: "center",
	},
	/** Solid until the fish take over the letterforms, then only a faint trace of them. */
	title: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "27vw", "@media (min-width: 48rem)": "min(12.6vw, 24svh)" },
		lineHeight: 0.92,
		textTransform: "uppercase",
		whiteSpace: "nowrap",
		color: {
			default: color.paper,
			":is([data-live])": "color-mix(in oklab, var(--app-paper) 11%, transparent)",
		},
		transitionProperty: "color",
		transitionDuration: "1.2s",
	},
	word: { display: { default: "block", "@media (min-width: 48rem)": "inline" } },
	tagline: {
		marginTop: { default: "1.75rem", "@media (min-width: 48rem)": "2.25rem" },
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.75rem" },
		fontStyle: "italic",
		color: color.paper85,
		animationName: rise,
		animationDuration: "2s",
		animationDelay: "1.2s",
		animationFillMode: "backwards",
	},
	hint: {
		...eyebrow,
		position: "absolute",
		insetInline: 0,
		top: "calc(100svh - 3.5rem)",
		textAlign: "center",
		fontSize: "0.6875rem",
		color: color.paper50,
		animationName: rise,
		animationDuration: "2s",
		animationDelay: "3.5s",
		animationFillMode: "backwards",
	},

	section: { paddingBlock: { default: "5rem", "@media (min-width: 48rem)": "8rem" } },
	eyebrow: { ...eyebrow, color: color.aqua },

	/** The horizon stream runs through this gap. */
	horizon: { height: { default: "7rem", "@media (min-width: 48rem)": "10rem" } },
	premise: {
		marginTop: "1.5rem",
		maxWidth: "20em",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2rem", "@media (min-width: 48rem)": "3.5rem" },
		lineHeight: 1.08,
	},
	premiseNote: {
		marginTop: "1.75rem",
		maxWidth: "34rem",
		fontSize: "1.125rem",
		lineHeight: 1.6,
		color: color.paper70,
	},

	/** The ring closes around this box. */
	halo: {
		display: "grid",
		placeContent: "center",
		justifyItems: "center",
		gap: "0.75rem",
		marginInline: "auto",
		width: { default: "min(86vw, 22rem)", "@media (min-width: 48rem)": "34rem" },
		height: { default: "15rem", "@media (min-width: 48rem)": "19rem" },
		textAlign: "center",
	},
	heading: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "3rem", "@media (min-width: 48rem)": "4.5rem" },
		lineHeight: 1,
	},
	headingNote: { fontStyle: "italic", color: color.paper70 },

	clips: {
		marginTop: { default: "4rem", "@media (min-width: 48rem)": "6rem" },
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 48rem)": "1fr 1fr" },
		columnGap: "2.5rem",
		rowGap: "3rem",
	},
	clip: { ...focus, display: "block" },
	frame: {
		aspectRatio: "16 / 9",
		overflow: "hidden",
		backgroundColor: color.paper12,
	},
	poster: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
		opacity: { default: 0.82, [stylex.when.ancestor(":hover")]: 1 },
		scale: { default: 1, [stylex.when.ancestor(":hover")]: 1.03 },
		transitionProperty: "opacity, scale",
		transitionDuration: "600ms",
	},
	clipMeta: { display: "flex", gap: "1rem", alignItems: "baseline", marginTop: "0.875rem" },
	index: { ...eyebrow, color: color.paper45 },
	clipTitle: { fontFamily: font.hero, fontWeight: 900, fontSize: "1.375rem", lineHeight: 1.2 },
	clipCaption: { marginTop: "0.25rem", color: color.paper65, lineHeight: 1.5 },

	pressHead: { display: "grid", gap: "0.75rem", minHeight: "8rem", alignContent: "end" },
	pressList: {
		marginTop: "2.5rem",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.paper15,
	},
	pressItem: {
		...focus,
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 48rem)": "12rem 1fr auto" },
		columnGap: "2.5rem",
		rowGap: "0.5rem",
		alignItems: "baseline",
		paddingBlock: { default: "1.5rem", "@media (min-width: 48rem)": "2rem" },
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: color.paper15,
	},
	outlet: { ...eyebrow, color: color.aqua },
	headline: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.75rem" },
		lineHeight: 1.2,
		color: { default: color.paper, [stylex.when.ancestor(":hover")]: color.aqua },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	quote: { marginTop: "0.5rem", fontStyle: "italic", color: color.paper70, lineHeight: 1.5 },
	date: { ...eyebrow, color: color.paper45, whiteSpace: "nowrap" },

	well: {
		display: "grid",
		alignContent: "center",
		minHeight: { default: "36rem", "@media (min-width: 48rem)": "44rem" },
	},
	/** The vortex turns around this box, its eye left clear for the form. */
	eye: { marginInline: "auto", width: "min(100%, 24rem)", textAlign: "center" },
	eyeHeading: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2rem", "@media (min-width: 48rem)": "2.5rem" },
		lineHeight: 1.1,
	},
	eyeNote: { marginTop: "0.5rem", ...eyebrow, color: color.paper65 },

	footer: {
		display: "grid",
		alignContent: "end",
		justifyItems: "center",
		gap: "1rem",
		minHeight: "70svh",
		paddingBottom: "4rem",
		textAlign: "center",
	},
	footMark: { ...focus, fontFamily: font.hero, fontWeight: 900, fontSize: "1.625rem" },
	legal: { ...eyebrow, color: color.paper45 },
});
