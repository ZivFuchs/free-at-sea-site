import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const SCRIM = "color-mix(in oklab, var(--app-ocean) 46%, transparent)";
const FEATHER = "6rem";

const rise = stylex.keyframes({ from: { opacity: 0, translate: "0 0.5rem" } });

export const styles = stylex.create({
	/** Still water behind the simulation, and all there is without WebGL2. */
	backdrop: {
		position: "fixed",
		insetInline: 0,
		top: 0,
		height: "100lvh",
		zIndex: 0,
		pointerEvents: "none",
		backgroundImage: `radial-gradient(120% 90% at 30% 20%, color-mix(in oklab, ${color.accent} 38%, ${color.ocean}), ${color.ocean} 70%)`,
	},
	canvas: {
		display: { default: "block", ":is([hidden])": "none" },
		width: "100%",
		height: "100%",
	},
	layer: { position: "relative", zIndex: 1 },

	hero: {
		position: "relative",
		display: "grid",
		alignContent: "center",
		justifyItems: "center",
		height: "100svh",
		minHeight: "32rem",
		paddingBottom: "12svh",
		textAlign: "center",
		color: color.paper,
	},
	title: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		opacity: 0.85,
	},
	titleText: { display: "inline-block" },
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		lineHeight: 1.25,
		fontStyle: "italic",
		opacity: 0.85,
	},
	hint: {
		position: "absolute",
		insetInline: 0,
		bottom: { default: "2.25rem", "@media (min-width: 48rem)": "2.5rem" },
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.18em",
		textTransform: "uppercase",
		color: color.paper65,
		opacity: { default: 1, ":is([data-done])": 0 },
		transitionProperty: "opacity",
		transitionDuration: "1.5s",
		animationName: { default: rise, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "1.2s",
		animationDelay: "2.4s",
		animationFillMode: "backwards",
	},
	hintTouch: { display: { default: "inline", "@media (hover: hover)": "none" } },
	hintHover: { display: { default: "none", "@media (hover: hover)": "inline" } },

	statement: {
		paddingBlock: { default: "5rem 7rem", "@media (min-width: 48rem)": "8rem 12rem" },
		color: color.paper,
	},
	measure: { maxWidth: "46rem" },
	eyebrow: {
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.18em",
		textTransform: "uppercase",
		color: color.aqua,
	},
	lede: {
		marginTop: "1.25rem",
		fontSize: { default: "1.625rem", "@media (min-width: 48rem)": "2.5rem" },
		lineHeight: 1.25,
		letterSpacing: "-0.01em",
	},
	film: { fontStyle: "italic" },

	/** Calms the water behind a section so its text holds, feathered so no edge shows. */
	calm: {
		backgroundImage: `linear-gradient(to bottom, transparent, ${SCRIM} ${FEATHER}, ${SCRIM} calc(100% - ${FEATHER}), transparent)`,
	},

	interlude: {
		display: "grid",
		alignContent: "center",
		minHeight: { default: "70svh", "@media (min-width: 48rem)": "85svh" },
		paddingBlock: "5rem",
		textAlign: "center",
		color: color.paper,
	},
	quote: {
		marginInline: "auto",
		maxWidth: "20ch",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.25rem", "@media (min-width: 48rem)": "4rem" },
		lineHeight: 1.08,
		textWrap: "balance",
	},
	source: {
		marginTop: "1.5rem",
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.18em",
		textTransform: "uppercase",
		color: color.paper65,
	},

	signup: {
		paddingBlock: { default: "5rem 7rem", "@media (min-width: 48rem)": "8rem 11rem" },
		color: color.paper,
	},
});
