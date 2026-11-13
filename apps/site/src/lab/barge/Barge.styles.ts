import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	lineHeight: 1.4,
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

const SHADE = "0 1px 18px color-mix(in oklab, var(--app-ink) 70%, transparent)";
const GLASS = "color-mix(in oklab, var(--app-ocean) 62%, transparent)";

const nudge = stylex.keyframes({
	"0%, 100%": { translate: "0 0" },
	"50%": { translate: "0 0.375rem" },
});

export const styles = stylex.create({
	header: {
		position: "fixed",
		insetInline: 0,
		top: 0,
		zIndex: 40,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "1rem",
		height: "4rem",
		color: color.paper,
		textShadow: SHADE,
		pointerEvents: "none",
	},
	wordmark: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.375rem" },
		whiteSpace: "nowrap",
		pointerEvents: "auto",
	},
	nav: {
		display: "flex",
		gap: { default: "0.875rem", "@media (min-width: 48rem)": "2rem" },
		pointerEvents: "auto",
	},
	/** Dropped on phones, where four links crowd the wordmark. */
	wide: { display: { default: "none", "@media (min-width: 48rem)": "inline" } },
	link: {
		...label,
		letterSpacing: { default: "0.08em", "@media (min-width: 48rem)": "0.14em" },
		color: { default: color.paper85, ":hover": color.paper },
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "6px",
	},

	/** Horizontal drags turn the vessel; vertical ones stay with the page. */
	tour: {
		position: "relative",
		touchAction: "pan-y",
		cursor: { default: "grab", ":is([data-turning])": "grabbing" },
		userSelect: { default: null, ":is([data-turning])": "none" },
	},
	stage: {
		position: "sticky",
		top: 0,
		height: "100lvh",
		overflow: "hidden",
		backgroundColor: color.ocean,
	},
	/** The photograph the model is built from: shown until the scene is live, and instead of it without WebGL. */
	still: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
	canvas: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		opacity: { default: 0, ":is([data-live])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.2s",
		transitionTimingFunction: "ease-out",
	},
	overlay: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" },
	leader: { stroke: color.paper, strokeWidth: 1 },
	dot: { fill: color.ocean, stroke: color.paper, strokeWidth: 1.25 },
	callout: {
		position: "absolute",
		top: 0,
		left: 0,
		opacity: 0,
		pointerEvents: "none",
		color: color.paper,
		textShadow: SHADE,
	},
	/** Centred on the leader's end. */
	calloutBody: {
		display: "block",
		translate: "-50% -50%",
		paddingBlock: "0.25rem",
		paddingInline: "0.5rem",
		borderRadius: "0.25rem",
		backgroundColor: GLASS,
		backdropFilter: "blur(6px)",
		textAlign: "center",
		whiteSpace: "nowrap",
	},
	calloutTitle: {
		...label,
		display: "block",
		fontSize: { default: "0.625rem", "@media (min-width: 48rem)": "0.6875rem" },
	},
	calloutNote: {
		display: { default: "none", "@media (min-width: 64rem)": "block" },
		fontFamily: font.sans,
		fontSize: "0.75rem",
		lineHeight: 1.35,
		color: color.paper70,
	},

	sections: { position: "relative", marginTop: "-100lvh", pointerEvents: "none" },
	hero: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		height: "100svh",
		minHeight: "32rem",
		paddingTop: { default: "5.5rem", "@media (min-width: 48rem)": "6.5rem" },
		paddingInline: "1.5rem",
		textAlign: "center",
		color: color.paper,
		textShadow: SHADE,
	},
	eyebrow: { ...label, color: color.aqua },
	title: {
		marginTop: "0.75rem",
		fontFamily: font.hero,
		fontSize: "min(12.5vw, 13svh, 9rem)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
	},
	tagline: {
		marginTop: "0.75rem",
		fontSize: { default: "1.25rem", "@media (min-width: 48rem)": "1.625rem" },
		fontStyle: "italic",
		color: color.paper85,
	},
	hint: {
		...label,
		marginTop: "auto",
		marginBottom: { default: "4rem", "@media (min-width: 48rem)": "2.5rem" },
		color: color.paper85,
		animationName: { default: nudge, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "2.6s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
	},
	/** Tall, so the shot can hold while the card rides the viewport. */
	stop: {
		height: { default: "170svh", "@media (min-width: 48rem)": "180svh" },
		paddingInline: { default: "1rem", "@media (min-width: 48rem)": "2.5rem" },
	},
	last: { height: "130svh" },
	card: {
		position: "sticky",
		top: { default: "calc(100svh - 21rem)", "@media (min-width: 48rem)": "calc(50svh - 7rem)" },
		maxWidth: { default: "none", "@media (min-width: 48rem)": "23rem" },
		marginLeft: { default: 0, "@media (min-width: 80rem)": "calc((100vw - 80rem) / 2)" },
		padding: { default: "1rem 1.125rem", "@media (min-width: 48rem)": "1.5rem 1.625rem" },
		borderRadius: "0.75rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper12,
		backgroundColor: GLASS,
		backdropFilter: "blur(14px) saturate(1.2)",
		color: color.paper,
		pointerEvents: "auto",
		cursor: "auto",
	},
	right: {
		marginLeft: { default: 0, "@media (min-width: 48rem)": "auto" },
		marginRight: { default: 0, "@media (min-width: 80rem)": "calc((100vw - 80rem) / 2)" },
	},
	number: { ...label, color: color.aqua },
	heading: {
		marginTop: "0.375rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "2rem" },
		lineHeight: 1.08,
	},
	body: {
		marginTop: "0.5rem",
		fontSize: { default: "0.9375rem", "@media (min-width: 48rem)": "1.0625rem" },
		lineHeight: 1.5,
		color: color.paper85,
	},
	particulars: {
		display: "grid",
		gridTemplateColumns: "repeat(4, auto)",
		justifyContent: "space-between",
		marginTop: "0.875rem",
		paddingTop: "0.75rem",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.paper15,
	},
	term: { ...label, fontSize: "0.625rem", color: color.paper65 },
	value: { fontFamily: font.sans, fontSize: "0.9375rem", fontVariantNumeric: "tabular-nums" },
	caveat: {
		marginTop: "0.5rem",
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		color: color.paper50,
	},
});
