import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { day } from "./palette.stylex";

const TITLE = "min(13.3vw, 15svh)";
/** Playfair's baseline, from the top of a line-height-1 box. */
const BASELINE = "0.915em";
const HORIZON = "calc(var(--sw-h) * 100lvh)";

const bloom = `0 0 2.5rem ${day.shade}, 0 0 0.6rem ${day.shade}`;

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	lineHeight: 1.4,
	letterSpacing: "0.18em",
	textTransform: "uppercase",
} as const;

const nod = stylex.keyframes({
	"0%, 100%": { transform: "translateY(0)", opacity: 0.4 },
	"50%": { transform: "translateY(0.4rem)", opacity: 1 },
});

export const styles = stylex.create({
	stage: { position: "relative", isolation: "isolate", color: color.paper },
	/** Sky over sea as plain gradients: first paint, and the whole show without WebGL. */
	backdrop: {
		position: "fixed",
		top: 0,
		insetInline: 0,
		height: "100lvh",
		zIndex: 0,
		backgroundImage: `linear-gradient(${day.zenith}, ${day.horizon} ${HORIZON}, ${day.far} ${HORIZON}, ${day.water})`,
	},
	canvas: {
		display: "block",
		width: "100%",
		height: "100%",
		opacity: { default: 0, ":is([data-live])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.6s",
		transitionTimingFunction: "ease-out",
	},
	/** Pinned to the horizon line of the scene behind. */
	titleLayer: {
		position: "fixed",
		top: HORIZON,
		insetInline: 0,
		zIndex: 1,
		height: 0,
		textAlign: "center",
		pointerEvents: "none",
		opacity: "var(--sw-title, 1)",
		visibility: { default: "visible", ":is([data-gone])": "hidden" },
	},
	/** One line-height-1 box whose baseline rests on the horizon. */
	word: {
		position: "absolute",
		insetInline: 0,
		bottom: `calc(${BASELINE} - 1em)`,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: TITLE,
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		color: day.silhouette,
	},
	title: { display: "block" },
	reflection: {
		position: "absolute",
		inset: 0,
		transformOrigin: `50% ${BASELINE}`,
		transform: "scaleY(-0.62)",
		opacity: 0.5,
		filter: "url(#swell-ripple) blur(0.012em)",
		maskImage: "linear-gradient(to top, black 22%, transparent 78%)",
	},
	tagline: {
		position: "absolute",
		insetInline: 0,
		top: `calc(${TITLE} * 0.6 + 1.25rem)`,
		fontStyle: "italic",
		fontSize: { default: "1.25rem", "@media (min-width: 48rem)": "1.625rem" },
		lineHeight: 1.3,
		color: color.paper85,
		textShadow: bloom,
	},
	filter: { position: "absolute", width: 0, height: 0 },

	main: { position: "relative", zIndex: 2 },
	hero: { position: "relative", height: "100svh", minHeight: "32rem" },
	cue: {
		...label,
		position: "absolute",
		insetInline: 0,
		bottom: { default: "3.25rem", "@media (min-width: 48rem)": "2.5rem" },
		display: "grid",
		justifyItems: "center",
		gap: "0.75rem",
		color: color.paper70,
		opacity: "var(--sw-title, 1)",
	},
	cueLine: {
		width: "1px",
		height: "1.75rem",
		backgroundColor: day.accent,
		animationName: { default: nod, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "2.8s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
	},

	/** Open type straight on the water. */
	open: {
		display: "grid",
		alignContent: "center",
		justifyItems: "center",
		rowGap: "1.25rem",
		minHeight: "85svh",
		paddingBlock: "5rem",
		textAlign: "center",
	},
	kicker: { ...label, color: day.accent, textShadow: bloom },
	line: {
		maxWidth: "46rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.875rem", "@media (min-width: 48rem)": "3.25rem" },
		lineHeight: 1.14,
		textShadow: bloom,
	},
	aside: {
		maxWidth: "30rem",
		fontSize: { default: "1.0625rem", "@media (min-width: 48rem)": "1.1875rem" },
		lineHeight: 1.5,
		fontStyle: "italic",
		color: color.paper85,
		textShadow: bloom,
	},

	/** A sheet of tinted glass afloat on the scene; its tint follows the hour. */
	panel: {
		width: { default: "calc(100% - 1rem)", "@media (min-width: 48rem)": "calc(100% - 3rem)" },
		maxWidth: "84rem",
		marginInline: "auto",
		overflow: "clip",
		borderRadius: { default: "1.25rem", "@media (min-width: 48rem)": "2rem" },
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper12,
		backgroundColor: day.glass,
		backdropFilter: "blur(22px) saturate(1.3)",
	},

	signup: { display: "grid", alignContent: "center", minHeight: "90svh", paddingBlock: "5rem" },
	card: {
		backgroundColor: day.glass,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper12,
	},

	end: {
		display: "grid",
		alignContent: "end",
		justifyItems: "center",
		rowGap: "1rem",
		minHeight: "100svh",
		paddingBlock: { default: "5rem 6rem", "@media (min-width: 48rem)": "5rem 7rem" },
		textAlign: "center",
	},

	/** The scene's clock, opposite the lab chip. */
	clock: {
		...label,
		position: "fixed",
		right: "0.75rem",
		bottom: "0.75rem",
		zIndex: 30,
		display: "flex",
		alignItems: "center",
		gap: "0.5rem",
		paddingBlock: "0.375rem",
		paddingInline: "0.75rem",
		borderRadius: "999px",
		backgroundColor: day.glass,
		backdropFilter: "blur(12px)",
		color: color.paper85,
		fontVariantNumeric: "tabular-nums",
	},
	dot: { width: "0.375rem", height: "0.375rem", borderRadius: "50%", backgroundColor: day.accent },
	phase: {
		color: color.paper65,
		display: { default: "none", "@media (min-width: 30rem)": "inline" },
	},
});
