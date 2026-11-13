import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { cinema } from "./palette.stylex";

/** Safety net: lifts the curtain if the script never runs. */
const lift = stylex.keyframes({ to: { opacity: 0 } });

const SAFE = { default: "8vw", "@media (min-width: 48rem)": "9vw" } as const;
const BAR = "8svh";
/** Line box of the submerging credit. */
const LINE = "2em";

/** Room either side of a clipped line, so its wavering copy is only cut at the surface. */
const bleed = { paddingInline: "1.5em", marginInline: "-1.5em" } as const;

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

const control = {
	...eyebrow,
	position: "absolute",
	right: SAFE,
	bottom: `calc(${BAR} + 1rem)`,
	zIndex: 6,
	paddingBlock: "0.5rem",
	cursor: "pointer",
	color: { default: color.paper65, ":hover": color.paper },
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "4px",
	transitionProperty: "color",
	transitionDuration: "150ms",
} as const;

export const styles = stylex.create({
	header: {
		position: "fixed",
		top: 0,
		insetInline: 0,
		zIndex: 40,
		color: color.paper,
		opacity: "var(--chrome, 1)",
		backgroundColor: `color-mix(in oklab, ${color.abyss90} calc(var(--solid, 0) * 100%), transparent)`,
		backdropFilter: "blur(calc(var(--solid, 0) * 12px))",
		transitionProperty: "background-color",
		transitionDuration: "300ms",
	},
	bar: {
		display: "flex",
		alignItems: "center",
		justifyContent: { default: "center", "@media (min-width: 48rem)": "space-between" },
		height: "4rem",
	},
	/** Over a pale hero top the links start in ink, turning to paper as the bar fills in. */
	linkOnLight: {
		color: {
			default: `color-mix(in oklab, ${color.paper70} calc(var(--solid, 0) * 100%), ${color.ink})`,
			":hover": `color-mix(in oklab, ${color.paper} calc(var(--solid, 0) * 100%), ${color.accent})`,
		},
	},
	wordmark: {
		display: { default: "none", "@media (min-width: 48rem)": "block" },
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1.375rem",
		opacity: "var(--solid, 0)",
		transitionProperty: "opacity",
		transitionDuration: "300ms",
	},
	nav: { display: "flex", gap: { default: "1.25rem", "@media (min-width: 48rem)": "2.25rem" } },
	link: {
		...eyebrow,
		color: { default: color.paper70, ":hover": color.paper },
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "6px",
		transitionProperty: "color",
		transitionDuration: "150ms",
	},

	hero: {
		position: "relative",
		isolation: "isolate",
		height: "100svh",
		minHeight: "32rem",
		overflow: "hidden",
		backgroundColor: cinema.black,
		color: color.paper,
	},
	media: {
		position: "absolute",
		inset: 0,
		scale: "var(--push, 1.1)",
		transformOrigin: "50% calc(var(--horizon) * 100%)",
	},
	fill: { width: "100%", height: "100%", objectFit: "cover" },
	video: {
		position: "absolute",
		inset: 0,
		opacity: { default: 0, ":is([data-playing])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.5s",
		transitionTimingFunction: "ease-out",
	},
	veil: {
		position: "absolute",
		inset: 0,
		backgroundColor: cinema.black,
		opacity: "var(--veil, 0)",
		pointerEvents: "none",
	},
	/** Black until the script draws its first frame, so the finished hero never flashes before the titles. */
	curtain: {
		position: "absolute",
		inset: 0,
		zIndex: 5,
		backgroundColor: cinema.black,
		pointerEvents: "none",
		opacity: { default: 0, "@media (scripting: enabled)": "var(--curtain, 1)" },
		animationName: { default: null, "@media (scripting: enabled)": lift },
		animationDelay: "6s",
		animationDuration: "1s",
		animationFillMode: "forwards",
	},

	cards: { position: "absolute", inset: 0, pointerEvents: "none" },
	card: {
		position: "absolute",
		opacity: "var(--o, 0)",
		fontFamily: font.sans,
		textTransform: "uppercase",
	},
	lowerLeft: { left: SAFE, top: "63%" },
	midRight: { right: SAFE, top: "40%", textAlign: "right" },
	lowerRight: { right: SAFE, top: "70%", textAlign: "right" },
	centre: { insetInline: 0, top: "52%", textAlign: "center" },
	label: {
		display: "block",
		marginBottom: "0.9em",
		fontSize: { default: "0.625rem", "@media (min-width: 48rem)": "0.6875rem" },
		letterSpacing: "0.32em",
		color: color.paper65,
	},
	name: {
		display: "block",
		fontSize: { default: "0.9375rem", "@media (min-width: 48rem)": "1.25rem" },
		fontWeight: 500,
		letterSpacing: "0.34em",
		whiteSpace: "nowrap",
	},
	serif: {
		fontFamily: font.body,
		fontStyle: "italic",
		fontWeight: 400,
		textTransform: "none",
		letterSpacing: "0.04em",
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.875rem" },
	},
	word: { display: "inline-block", whiteSpace: "nowrap" },
	/** Each letter drifts off its neighbours and bobs, as if set down on a current. */
	letter: {
		display: "inline-block",
		transform:
			"translate(calc((var(--i) - var(--mid)) * var(--k, 0) * var(--amp, 0.1em)), calc(sin(var(--k, 0) * 5 + var(--i) * 0.6) * 0.07em))",
	},

	sub: {
		display: "inline-block",
		fontSize: { default: "0.6875rem", "@media (min-width: 48rem)": "1.0625rem" },
		letterSpacing: "0.3em",
		whiteSpace: "nowrap",
	},
	above: { ...bleed, display: "block", overflow: "hidden", height: LINE, lineHeight: LINE },
	surface: {
		display: "block",
		height: "1px",
		marginInline: "-1.5em",
		backgroundImage: `linear-gradient(to right, transparent, ${color.paper65} 20%, ${color.paper65} 80%, transparent)`,
	},
	below: {
		...bleed,
		display: "block",
		overflow: "hidden",
		height: `calc(${LINE} * 1.7)`,
		lineHeight: LINE,
		color: color.aqua,
		opacity: 0.6,
		filter: "blur(0.6px)",
	},
	sinkAbove: { display: "block", transform: `translateY(calc(var(--sink, 0) * ${LINE}))` },
	/** The same line under the surface: a little larger, flattened, and wavering. */
	sinkBelow: {
		display: "block",
		transform: `translateY(calc((var(--sink, 0) - 1) * ${LINE})) scale(1.05, 0.9) skewX(calc(sin(var(--k, 0) * 22) * 5deg))`,
	},

	horizon: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100%)",
		height: "1px",
		backgroundColor: color.paper50,
		opacity: "var(--rule, 0)",
		scale: "var(--rule, 0) 1",
		pointerEvents: "none",
	},
	copy: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100%)",
		textAlign: "center",
	},
	title: {
		marginTop: "0.1em",
		fontFamily: font.hero,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		opacity: "calc(var(--land, 1) * 0.85)",
		filter: "blur(calc((1 - var(--land, 1)) * 10px))",
	},
	/** The title's letters close up from wide apart as it lands. */
	titleLetter: {
		display: "inline-block",
		transform: "translateX(calc((var(--i) - var(--mid)) * (1 - var(--land, 1)) * 0.28em))",
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		lineHeight: { default: "calc(2 / 1.5)", "@media (min-width: 48rem)": "calc(2.25 / 1.875)" },
		fontStyle: "italic",
		opacity: "calc(var(--tag, 1) * 0.85)",
		translate: "0 calc((1 - var(--tag, 1)) * 0.5rem)",
	},

	letterbox: {
		position: "absolute",
		insetInline: 0,
		zIndex: 3,
		height: BAR,
		backgroundColor: cinema.black,
		pointerEvents: "none",
	},
	barTop: { top: 0, translate: "0 calc((var(--bars, 0) - 1) * 100%)" },
	barBottom: { bottom: 0, translate: "0 calc((1 - var(--bars, 0)) * 100%)" },
	skip: control,
	replay: { ...control, bottom: "1.25rem", opacity: "var(--chrome, 1)" },
	cue: {
		...eyebrow,
		position: "absolute",
		insetInline: 0,
		bottom: "1.75rem",
		textAlign: "center",
		letterSpacing: "0.28em",
		opacity: "calc(var(--chrome, 1) * 0.6)",
		pointerEvents: "none",
	},
});

export const credits = stylex.create({
	/** The page blue goes dark before the roll. */
	dim: {
		height: "18rem",
		backgroundImage: `linear-gradient(to bottom, ${color.ocean}, ${cinema.black})`,
	},
	section: {
		position: "relative",
		backgroundColor: cinema.black,
		color: color.paper,
		textAlign: "center",
	},
	/** Pinned to the viewport: credits rise out of the dark at the bottom and into it at the top. */
	gate: {
		position: "sticky",
		top: 0,
		zIndex: 1,
		height: "100svh",
		marginBottom: "-100svh",
		pointerEvents: "none",
		backgroundImage: `linear-gradient(to bottom, ${cinema.black} 4rem, transparent 28%, transparent 72%, ${cinema.black} 100%)`,
	},
	roll: {
		paddingBlock: "45svh 50svh",
		paddingInline: "1.5rem",
		display: "grid",
		rowGap: { default: "5rem", "@media (min-width: 48rem)": "6.5rem" },
	},
	film: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.75rem", "@media (min-width: 48rem)": "4.5rem" },
		lineHeight: 1,
		textTransform: "uppercase",
	},
	kind: { marginTop: "1rem", fontStyle: "italic", fontSize: "1.25rem", color: color.paper70 },
	role: {
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.3em",
		textTransform: "uppercase",
		color: color.paper50,
		marginBottom: "0.9rem",
	},
	name: {
		fontFamily: font.sans,
		fontSize: { default: "0.9375rem", "@media (min-width: 48rem)": "1.125rem" },
		letterSpacing: "0.22em",
		textTransform: "uppercase",
		lineHeight: 2.1,
	},
	pending: {
		fontFamily: font.body,
		fontStyle: "italic",
		textTransform: "none",
		letterSpacing: "0.02em",
		color: color.paper45,
	},
	link: {
		color: { default: "inherit", ":hover": color.aqua },
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "4px",
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	end: {
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.3em",
		textTransform: "uppercase",
		color: color.paper45,
	},
});
