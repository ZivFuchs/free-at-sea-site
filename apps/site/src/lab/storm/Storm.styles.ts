import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

/** Page blue behind content, feathered so no edge shows against the glass. */
const TINT = `color-mix(in oklab, ${color.ocean} 84%, transparent)`;

export const styles = stylex.create({
	/** The lens: fixed behind the page. `lvh` so a collapsing phone URL bar never resizes the canvas. */
	backdrop: {
		position: "fixed",
		top: 0,
		insetInline: 0,
		height: "100lvh",
		zIndex: 0,
		overflow: "hidden",
		backgroundColor: color.ink,
	},
	fill: { position: "absolute", inset: 0, width: "100%", height: "100%" },
	still: { objectFit: "cover", objectPosition: "50% calc(var(--horizon) * 100%)" },
	/** Without WebGL the still stays, and only this dims it behind the content. */
	veil: { backgroundColor: color.ocean, opacity: "var(--veil, 0)" },
	canvas: {
		opacity: { default: 0, ":is([data-live])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.2s",
		transitionTimingFunction: "ease-out",
	},
	shell: {
		position: "relative",
		zIndex: 1,
		display: "flex",
		flexDirection: "column",
		minHeight: "100dvh",
	},
	main: { flex: 1 },
	hero: { position: "relative", height: "100svh", minHeight: "32rem" },

	passage: {
		display: "grid",
		alignContent: "center",
		minHeight: "100svh",
		paddingBlock: "5rem",
	},
	pane: {
		position: "relative",
		maxWidth: "40rem",
		paddingBlock: { default: "2rem", "@media (min-width: 48rem)": "3rem" },
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "3rem" },
		borderRadius: "0.25rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper15,
		backgroundColor: `color-mix(in oklab, ${color.ocean} 45%, transparent)`,
		backgroundImage: `linear-gradient(to bottom, ${color.paper12}, transparent 30%)`,
		backdropFilter: "blur(14px) saturate(1.2)",
		boxShadow: `inset 0 1px 0 ${color.paper15}`,
	},
	eyebrow: { ...eyebrow, color: color.aqua },
	heading: {
		marginTop: "0.75rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2rem", "@media (min-width: 48rem)": "3rem" },
		lineHeight: 1.05,
	},
	body: {
		marginTop: "1.25rem",
		fontSize: { default: "1.0625rem", "@media (min-width: 48rem)": "1.1875rem" },
		lineHeight: 1.55,
		color: color.paper85,
	},

	band: {
		paddingBlock: "4rem",
		backgroundImage: `linear-gradient(to bottom, transparent, ${TINT} 9rem, ${TINT} calc(100% - 9rem), transparent)`,
	},
	/** An open pane mid-page: nothing but the weather. */
	window: {
		display: "grid",
		alignContent: "end",
		minHeight: { default: "80svh", "@media (min-width: 48rem)": "90svh" },
		paddingBlock: "3rem",
	},
	log: { ...eyebrow, color: color.paper70, textShadow: `0 0 12px ${color.ink}` },

	clearing: {
		display: "grid",
		alignContent: "end",
		minHeight: "100svh",
		paddingBlock: { default: "6rem", "@media (min-width: 48rem)": "9rem" },
		textAlign: "center",
	},
	passes: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontStyle: "italic",
		fontSize: { default: "3.25rem", "@media (min-width: 48rem)": "6rem" },
		lineHeight: 1,
		textShadow: `0 1px 24px ${color.ink10}`,
	},
	after: {
		marginTop: "1.25rem",
		marginInline: "auto",
		maxWidth: "28rem",
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.5,
		fontStyle: "italic",
		color: color.paper85,
	},

	/** Ship's glass, bottom right: the weather as numbers. */
	readout: {
		...eyebrow,
		position: "fixed",
		right: "0.75rem",
		bottom: "0.75rem",
		zIndex: 30,
		display: "flex",
		alignItems: "baseline",
		gap: "0.875rem",
		paddingBlock: "0.375rem",
		paddingInline: "0.75rem",
		borderRadius: "999px",
		backgroundColor: "color-mix(in oklab, var(--app-ink) 55%, transparent)",
		backdropFilter: "blur(8px)",
		fontSize: "0.6875rem",
		fontVariantNumeric: "tabular-nums",
		color: color.paper70,
		pointerEvents: "none",
	},
	figure: { color: color.paper },
	wide: { display: { default: "none", "@media (min-width: 48rem)": "inline" } },
});
