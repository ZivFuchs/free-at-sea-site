import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** On each clip link, so its meniscus flattens on hover and focus. */
export const clipMarker = stylex.defaultMarker();

const WHITE_55 = "rgb(255 255 255 / 0.55)";
const WHITE_22 = "rgb(255 255 255 / 0.22)";
const SHADE_30 = "rgb(0 10 25 / 0.3)";
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/** `--lens` (set by script where SVG backdrop filters render) refracts; without it the glass is frosted. */
const glass = {
	backdropFilter: "var(--lens, blur(14px)) saturate(1.25)",
	backgroundColor: "rgb(255 255 255 / 0.05)",
	boxShadow: [
		`inset 1px 1.5px 1px -0.5px ${WHITE_55}`,
		`inset -1px -1.5px 1px -0.5px ${WHITE_22}`,
		`inset 5px 7px 12px -8px ${SHADE_30}`,
		`inset -8px -10px 16px -10px ${WHITE_22}`,
		"0 10px 28px -12px rgb(0 0 0 / 0.5)",
	].join(", "),
} as const;

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	letterSpacing: "0.16em",
	textTransform: "uppercase",
} as const;

const focus = {
	outlineWidth: { default: 0, ":focus-visible": "2px" },
	outlineStyle: "solid",
	outlineColor: color.paper,
	outlineOffset: "3px",
} as const;

export const styles = stylex.create({
	nav: {
		...glass,
		position: "fixed",
		top: "0.75rem",
		left: "50%",
		translate: "-50% 0",
		zIndex: 40,
		display: "flex",
		alignItems: "center",
		gap: { default: "1.25rem", "@media (min-width: 48rem)": "2rem" },
		height: "3rem",
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "1.75rem" },
		borderRadius: "999px",
		backgroundColor: "rgb(0 22 44 / 0.22)",
		color: color.paper,
		whiteSpace: "nowrap",
		textShadow: "0 1px 6px rgb(0 10 25 / 0.55)",
	},
	wordmark: {
		...focus,
		display: { default: "none", "@media (min-width: 48rem)": "block" },
		marginRight: "0.75rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1.125rem",
	},
	navLink: {
		...label,
		...focus,
		color: { default: color.paper85, ":hover": color.paper },
	},

	hero: {
		position: "relative",
		isolation: "isolate",
		height: "100svh",
		minHeight: "32rem",
		overflow: "hidden",
		backgroundColor: color.ink,
		touchAction: "pan-y",
	},
	copy: {
		position: "absolute",
		insetInline: 0,
		top: "17.8%",
		textAlign: "center",
		color: color.paper,
	},
	title: {
		fontFamily: font.hero,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		opacity: 0.92,
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		fontStyle: "italic",
		opacity: 0.9,
	},
	cta: {
		...glass,
		...label,
		...focus,
		position: "absolute",
		left: "50%",
		bottom: { default: "4rem", "@media (min-width: 48rem)": "3rem" },
		translate: "-50% 0",
		display: "flex",
		alignItems: "center",
		height: "3rem",
		paddingInline: "1.75rem",
		borderRadius: "999px",
		backgroundColor: "rgb(0 22 44 / 0.22)",
		color: color.paper,
		whiteSpace: "nowrap",
		textShadow: "0 1px 6px rgb(0 10 25 / 0.55)",
	},
	/** Covers the hero and bends it wherever a drop lies; untouched elsewhere. */
	water: {
		position: "absolute",
		inset: 0,
		pointerEvents: "none",
		backdropFilter: "var(--lens, none)",
	},
	drops: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" },

	passage: {
		position: "relative",
		paddingBlock: { default: "6rem", "@media (min-width: 48rem)": "10rem" },
		overflow: "hidden",
	},
	measure: { maxWidth: "52rem" },
	eyebrow: { ...label, color: color.aqua },
	lede: {
		marginTop: "1.5rem",
		fontSize: { default: "1.75rem", "@media (min-width: 48rem)": "3rem" },
		lineHeight: 1.22,
		letterSpacing: "-0.01em",
	},
	body: {
		marginTop: "2rem",
		maxWidth: "36rem",
		fontSize: { default: "1.0625rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.6,
		color: color.paper70,
	},
	/** A rod of water lying across the passage: it slides down with the scroll, magnifying the line beneath. */
	band: {
		position: "absolute",
		insetInline: 0,
		top: 0,
		height: { default: "3.75rem", "@media (min-width: 48rem)": "5.5rem" },
		translate: "0 var(--y, 0px)",
		pointerEvents: "none",
		backdropFilter: "var(--lens, blur(1.5px)) saturate(1.2)",
		backgroundColor: "rgb(255 255 255 / 0.02)",
		boxShadow: [
			`inset 0 1.5px 1px -0.5px ${WHITE_55}`,
			`inset 0 -1.5px 1px -0.5px ${WHITE_22}`,
			`inset 0 9px 12px -9px ${SHADE_30}`,
			`inset 0 -12px 16px -12px ${WHITE_22}`,
			"0 14px 24px -16px rgb(0 0 0 / 0.55)",
		].join(", "),
	},

	clips: { paddingBlock: { default: "4rem", "@media (min-width: 48rem)": "7rem" } },
	heading: {
		marginBottom: { default: "1.25rem", "@media (min-width: 48rem)": "2rem" },
		fontFamily: font.display,
		fontSize: { default: "3rem", "@media (min-width: 48rem)": "4.5rem" },
		lineHeight: 0.95,
		textTransform: "uppercase",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 48rem)": "1fr 1fr" },
		gap: { default: "2rem", "@media (min-width: 48rem)": "2.5rem" },
	},
	clip: { ...focus, display: "block", borderRadius: "1rem" },
	frame: {
		position: "relative",
		aspectRatio: "16 / 9",
		borderRadius: "1rem",
		overflow: "hidden",
		backgroundColor: color.ink,
	},
	poster: { width: "100%", height: "100%", objectFit: "cover" },
	/** A dome of water over the poster; it drains flat on hover, focus, or (touch) when the clip is centred. */
	meniscus: {
		...glass,
		position: "absolute",
		inset: 0,
		borderRadius: "1rem",
		backdropFilter: "var(--lens, blur(3px)) saturate(1.25)",
		opacity: {
			default: 1,
			":is([data-flat])": 0,
			[stylex.when.ancestor(":hover")]: 0,
			[stylex.when.ancestor(":focus-visible")]: 0,
		},
		transitionProperty: "opacity",
		transitionDuration: "600ms",
		transitionTimingFunction: EASE,
	},
	caption: { display: "flex", alignItems: "baseline", gap: "0.875rem", marginTop: "0.875rem" },
	index: { ...label, color: color.paper45, fontVariantNumeric: "tabular-nums" },
	clipTitle: { fontSize: "1.25rem", lineHeight: 1.3 },
	note: { ...label, marginTop: "2.5rem", color: color.paper45, lineHeight: 1.6 },
});
