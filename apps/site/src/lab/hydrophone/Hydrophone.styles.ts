import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

/** Page blue behind content: the plot stays faintly visible through it. */
const TINT = `color-mix(in oklab, ${color.ocean} 88%, transparent)`;
const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "4px",
} as const;

/** On the backdrop (`data-live`) and the Listen button (`aria-pressed`). */
export const marker = stylex.defaultMarker();

const blink = stylex.keyframes({ "50%": { opacity: 0.25 } });

export const styles = stylex.create({
	/** The display: fixed behind the page. `lvh` so a collapsing phone URL bar never resizes the canvas. */
	backdrop: {
		position: "fixed",
		top: 0,
		insetInline: 0,
		height: "100lvh",
		zIndex: 0,
		backgroundImage: `linear-gradient(to bottom, ${color.ocean}, ${color.ink})`,
	},
	canvas: {
		display: "block",
		width: "100%",
		height: "100%",
		color: color.paper,
		opacity: { default: 0, [stylex.when.ancestor(":is([data-live])")]: 1 },
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

	header: {
		position: "sticky",
		top: 0,
		zIndex: 40,
		marginBottom: "-4.5rem",
		backgroundImage: `linear-gradient(to bottom, ${color.abyss90} 35%, transparent)`,
	},
	bar: { display: "flex", alignItems: "center", gap: "1.5rem", height: "4.5rem" },
	wordmark: {
		...focus,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1.25rem",
		whiteSpace: "nowrap",
	},
	nav: {
		display: { default: "none", "@media (min-width: 48rem)": "flex" },
		gap: "2rem",
		marginInline: "auto",
	},
	link: {
		...focus,
		...label,
		fontSize: "0.8125rem",
		color: { default: color.paper65, ":hover": color.paper },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	listen: {
		...focus,
		...label,
		display: "inline-flex",
		alignItems: "center",
		gap: "0.5rem",
		marginLeft: { default: "auto", "@media (min-width: 48rem)": 0 },
		paddingBlock: "0.5rem",
		paddingInline: "0.875rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: {
			default: color.paper45,
			":hover": color.paper,
			":is([aria-pressed='true'])": color.aqua,
		},
		borderRadius: "999px",
		color: { default: color.paper, ":is([aria-pressed='true'])": color.aqua },
		cursor: "pointer",
		transitionProperty: "color, border-color",
		transitionDuration: "150ms",
	},
	lamp: {
		width: "0.375rem",
		height: "0.375rem",
		borderRadius: "50%",
		backgroundColor: "currentColor",
		opacity: { default: 0.4, [stylex.when.ancestor(":is([aria-pressed='true'])")]: 1 },
		animationName: {
			default: "none",
			[stylex.when.ancestor(":is([aria-pressed='true'])")]: blink,
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		animationDuration: "1.6s",
		animationIterationCount: "infinite",
	},
	off: {
		display: { default: "inline", [stylex.when.ancestor(":is([aria-pressed='true'])")]: "none" },
	},
	on: {
		display: { default: "none", [stylex.when.ancestor(":is([aria-pressed='true'])")]: "inline" },
	},

	hero: {
		display: "grid",
		alignContent: "center",
		height: "100svh",
		minHeight: "34rem",
	},
	/** A legibility band: the plot dims behind the title and clears above and below it. */
	plate: {
		paddingBlock: { default: "3rem", "@media (min-width: 48rem)": "4rem" },
		backgroundImage: `linear-gradient(to bottom, transparent, ${TINT} 22%, ${TINT} 78%, transparent)`,
	},
	station: { ...label, color: color.aqua },
	title: {
		marginTop: "1rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "min(13.5vw, 4.5rem)", "@media (min-width: 48rem)": "min(9vw, 8.5rem)" },
		lineHeight: 0.95,
		textTransform: "uppercase",
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.75rem" },
		fontStyle: "italic",
		color: color.paper85,
	},
	note: { ...label, marginTop: "2rem", maxWidth: "26rem", lineHeight: 1.7, color: color.paper65 },

	passage: {
		display: "grid",
		alignContent: "center",
		minHeight: "90svh",
		paddingBlock: "6rem",
	},
	pane: {
		maxWidth: "38rem",
		paddingBlock: { default: "2rem", "@media (min-width: 48rem)": "3rem" },
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "3rem" },
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderLeftColor: color.aqua,
		backgroundColor: TINT,
		backdropFilter: "blur(6px)",
	},
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

	/** Reused site sections sit on the page blue, feathered into the plot. */
	band: {
		backgroundImage: `linear-gradient(to bottom, transparent, ${TINT} 5rem, ${TINT} calc(100% - 5rem), transparent)`,
		backdropFilter: "blur(3px)",
	},
	/** An open stretch of plot between sections, with one log line. */
	window: {
		display: "grid",
		alignContent: "end",
		minHeight: { default: "70svh", "@media (min-width: 48rem)": "80svh" },
		paddingBottom: "4rem",
	},
	log: { ...label, display: "grid", gap: "0.375rem", lineHeight: 1.6, color: color.paper85 },
	logDepth: { color: color.aqua },
	logLine: {
		justifySelf: "start",
		paddingBlock: "0.25rem",
		paddingInline: "0.5rem",
		marginLeft: "-0.5rem",
		backgroundColor: TINT,
	},

	readout: {
		position: "fixed",
		right: "0.75rem",
		bottom: "0.75rem",
		zIndex: 30,
		display: "grid",
		justifyItems: "end",
		gap: "0.125rem",
		paddingBlock: "0.5rem",
		paddingInline: "0.75rem",
		borderRadius: "0.25rem",
		backgroundColor: color.abyss90,
		backdropFilter: "blur(8px)",
		...label,
		fontSize: "0.625rem",
		color: color.paper65,
		pointerEvents: "none",
	},
	figure: {
		fontFamily: font.mono,
		fontSize: "0.9375rem",
		letterSpacing: "0.04em",
		fontVariantNumeric: "tabular-nums",
		color: color.paper,
	},
});
