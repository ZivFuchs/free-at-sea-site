import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { water } from "./palette.stylex";

const body = {
	listStyle: "none",
	userSelect: "none",
	willChange: "transform",
	transitionProperty: "opacity",
	transitionDuration: "300ms",
	cursor: { default: "grab", ":is([data-held])": "grabbing" },
} as const;

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	srOnly: {
		position: "absolute",
		width: "1px",
		height: "1px",
		overflow: "hidden",
		clipPath: "inset(50%)",
		whiteSpace: "nowrap",
	},
	hero: {
		display: "flex",
		flexDirection: "column",
		minHeight: "calc(100svh - 4.5rem)",
		paddingBottom: "3rem",
	},
	sky: { flex: 1, minHeight: "3rem" },
	/** One glyph, boxed from cap height to baseline so the hull is the letter. */
	letter: {
		...body,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "23vw", "@media (min-width: 48rem)": "min(11.5vw, 11.5rem)" },
		lineHeight: 0.585,
		height: "0.708em",
		color: color.paper,
	},
	caption: { flex: 1.3, paddingTop: "1.5rem", textAlign: "center" },
	tagline: {
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		fontStyle: "italic",
		color: color.paper85,
	},
	hint: { ...eyebrow, marginTop: "1.25rem", color: color.paper50 },
	tilt: {
		...eyebrow,
		marginTop: "1rem",
		paddingBlock: "0.5rem",
		paddingInline: "1rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper45,
		borderRadius: "999px",
		color: color.paper85,
		cursor: "pointer",
		display: { default: "inline-block", ":is([hidden])": "none" },
	},
	intro: {
		paddingBlock: { default: "3rem", "@media (min-width: 48rem)": "6rem" },
		maxWidth: "44rem",
	},
	lede: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.75rem", "@media (min-width: 48rem)": "2.75rem" },
		lineHeight: 1.12,
	},
	prose: {
		marginTop: "1.25rem",
		fontSize: "1.125rem",
		lineHeight: 1.6,
		color: color.paper70,
	},
	section: { paddingBlock: { default: "3rem", "@media (min-width: 48rem)": "5rem" } },
	heading: {
		marginBottom: "0.5rem",
		fontFamily: font.display,
		fontSize: { default: "3rem", "@media (min-width: 48rem)": "4.5rem" },
		lineHeight: 0.95,
		textTransform: "uppercase",
	},
	note: { ...eyebrow, color: color.paper50 },

	clip: {
		...body,
		width: { default: "min(41vw, 13rem)", "@media (min-width: 48rem)": "min(22vw, 18rem)" },
	},
	clipLink: {
		position: "relative",
		display: "block",
		aspectRatio: "16 / 10",
		overflow: "hidden",
		borderRadius: "3px",
		backgroundColor: color.ink,
		boxShadow: "0 0 0 1px color-mix(in oklab, var(--app-paper) 22%, transparent)",
		outline: { default: "none", ":focus-visible": `2px solid ${color.paper}` },
		outlineOffset: "3px",
	},
	poster: { width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" },
	clipLabel: {
		position: "absolute",
		insetInline: 0,
		top: 0,
		display: "flex",
		gap: "0.5rem",
		alignItems: "baseline",
		padding: "0.5rem 0.625rem 1.5rem",
		backgroundImage:
			"linear-gradient(color-mix(in oklab, var(--app-ink) 80%, transparent), transparent)",
		color: color.paper,
	},
	index: { ...eyebrow, fontSize: "0.6875rem", color: color.paper70 },
	clipTitle: {
		fontFamily: font.sans,
		fontSize: { default: "0.75rem", "@media (min-width: 48rem)": "0.875rem" },
		lineHeight: 1.25,
		fontWeight: 600,
	},

	/** A raft: the words ride high, the lower third is hull. */
	press: {
		...body,
		width: { default: "min(41vw, 13rem)", "@media (min-width: 48rem)": "min(22vw, 18rem)" },
	},
	pressLink: {
		display: "flex",
		flexDirection: "column",
		gap: "0.5rem",
		height: "100%",
		padding: { default: "0.75rem 0.75rem 3rem", "@media (min-width: 48rem)": "1rem 1rem 4rem" },
		borderRadius: "3px",
		backgroundColor: water.raft,
		color: color.ink,
		outline: { default: "none", ":focus-visible": `2px solid ${color.aqua}` },
		outlineOffset: "3px",
	},
	outlet: { ...eyebrow, fontSize: "0.6875rem", color: color.accent },
	headline: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "0.9375rem", "@media (min-width: 48rem)": "1.1875rem" },
		lineHeight: 1.15,
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 4,
		overflow: "hidden",
	},
	date: { ...eyebrow, fontSize: "0.625rem", color: color.muted },
});
