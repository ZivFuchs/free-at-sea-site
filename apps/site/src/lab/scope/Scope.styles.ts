import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { film } from "./palette.stylex";

const MD = "@media (min-width: 48rem)";
const NO_SCRIPT = "@media (scripting: none)";
const REDUCED = "@media (prefers-reduced-motion: reduce)";

const GRAIN =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const fadeIn = stylex.keyframes({ from: { opacity: 0 } });
const grain = stylex.keyframes({ to: { backgroundPosition: "-97px 61px" } });
const weave = stylex.keyframes({
	"0%": { translate: "0 0" },
	"25%": { translate: "0.4px -0.3px" },
	"50%": { translate: "-0.3px 0.4px" },
	"75%": { translate: "0.2px 0.3px" },
	"100%": { translate: "0 0" },
});

const mono = {
	fontFamily: font.mono,
	fontSize: "0.6875rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
	fontVariantNumeric: "tabular-nums",
} as const;

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "4px",
} as const;

/** On each shot: its children read `data-state`. */
export const shotMarker = stylex.defaultMarker();

export const styles = stylex.create({
	/** The reel: one viewport of scroll per shot, plus the one the stage occupies. */
	track: {
		position: "relative",
		height: { default: "calc(var(--n) * 90svh + 100svh)", [NO_SCRIPT]: "auto" },
		backgroundColor: film.black,
		color: color.paper,
	},
	stage: {
		position: { default: "sticky", [NO_SCRIPT]: "static" },
		top: 0,
		height: { default: "100svh", [NO_SCRIPT]: "auto" },
		minHeight: "30rem",
		display: "grid",
		gridTemplateRows: "minmax(3.5rem, 1fr) auto minmax(8.5rem, 1fr)",
		justifyContent: "center",
		gridTemplateColumns: {
			default: "100%",
			[MD]: "min(100%, calc((100svh - 14rem) * 2.39))",
		},
		overflow: "clip",
	},
	bar: {
		display: "flex",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: "1rem",
		paddingBottom: "0.75rem",
		paddingInline: { default: "1rem", [MD]: "1.5rem" },
	},
	wordmark: {
		...focus,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1rem",
		letterSpacing: "0.02em",
		whiteSpace: "nowrap",
	},
	readout: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" },
	slate: { ...mono, color: color.paper50 },
	timecode: { ...mono, fontSize: "0.8125rem", color: color.paper85 },

	/** The gate: 2.39:1 on wide screens; opened up on phones so cards have room, bars above and below. */
	frame: {
		position: "relative",
		containerType: { default: "size", [NO_SCRIPT]: "normal" },
		height: { default: "56svh", [MD]: "auto", [NO_SCRIPT]: "auto" },
		minHeight: { default: "18rem", [MD]: 0 },
		aspectRatio: { default: "auto", [MD]: "2.39", [NO_SCRIPT]: "auto" },
		backgroundColor: film.black,
		animationName: fadeIn,
		animationDuration: "2.4s",
		animationTimingFunction: "ease-out",
	},
	shot: {
		position: { default: "absolute", [NO_SCRIPT]: "relative" },
		inset: 0,
		minHeight: { default: null, [NO_SCRIPT]: "24rem" },
		opacity: { default: "var(--o, 0)", [NO_SCRIPT]: 1 },
		pointerEvents: {
			default: "none",
			':is([data-state="current"])': "auto",
			[NO_SCRIPT]: "auto",
		},
	},
	picture: {
		position: "absolute",
		inset: 0,
		overflow: "hidden",
		backgroundColor: film.black,
		animationName: { default: weave, [REDUCED]: "none" },
		animationDuration: "0.9s",
		animationTimingFunction: "steps(4, jump-none)",
		animationIterationCount: "infinite",
	},
	wipe: { clipPath: "inset(0 calc((1 - var(--q, 1)) * 100%) 0 0)" },
	media: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
	horizonAnchor: {
		objectPosition: "50% calc(var(--horizon) * 100%)",
		transformOrigin: "50% calc(var(--horizon) * 100%)",
	},
	push: { scale: "calc(1 + var(--f, 0) * 0.09)" },
	/** Rack focus: the held picture goes soft and dim as the type comes sharp. */
	rackBack: {
		filter: "blur(calc(var(--q, 1) * 1.6cqw)) brightness(calc(1 - var(--q, 1) * 0.55))",
		scale: 1.06,
	},
	rackFront: {
		filter: "blur(calc((1 - var(--q, 1)) * 1.2cqw))",
		opacity: "var(--q, 1)",
	},
	scrim: {
		position: "absolute",
		inset: 0,
		backgroundImage: `linear-gradient(to top, ${film.scrim}, transparent 64%)`,
	},
	player: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		borderWidth: 0,
		zIndex: 2,
	},

	/** Opening title: stands just under the horizon, as on the site's hero. */
	titleBlock: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100%)",
		textAlign: "center",
	},
	title: {
		marginTop: "0.12em",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(12.6cqw, 34cqh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		color: color.paper,
		opacity: 0.9,
		textShadow: `0 0 0.06em ${film.halation}`,
	},

	card: {
		position: "absolute",
		inset: 0,
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		gap: "min(4cqh, 1.5rem)",
		paddingInline: { default: "1.5rem", [MD]: "12cqw" },
		paddingBlock: "1rem",
	},
	cardUnderLine: {
		justifyContent: "flex-start",
		paddingTop: "calc(var(--horizon) * 100cqh + min(7cqh, 2.5rem))",
	},
	cardText: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "min(8.4cqw, 7cqh)", [MD]: "min(4.6cqw, 11cqh)" },
		lineHeight: 1.08,
		textWrap: "balance",
		textShadow: `0 0 0.08em ${film.halation}`,
	},
	quote: {
		fontFamily: font.body,
		fontStyle: "italic",
		fontSize: { default: "min(6.2cqw, 5.2cqh)", [MD]: "min(3.1cqw, 8cqh)" },
		lineHeight: 1.22,
		textWrap: "balance",
	},
	eyebrow: { ...mono, color: color.aqua },
	credit: {
		...mono,
		color: color.paper70,
		display: "flex",
		flexWrap: "wrap",
		columnGap: "1.25rem",
		rowGap: "0.5rem",
		alignItems: "center",
	},
	link: {
		...focus,
		...mono,
		color: { default: color.paper, ":hover": color.aqua },
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: color.paper45,
		paddingBottom: "0.2em",
	},

	/** Lower third on a clip: number, title, play. */
	third: {
		position: "absolute",
		insetInline: 0,
		bottom: 0,
		display: "flex",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: "1rem",
		padding: { default: "1.25rem", [MD]: "min(5cqh, 2rem) 3cqw" },
	},
	clipTitle: {
		marginTop: "0.35rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.625rem", [MD]: "min(3.4cqw, 9cqh)" },
		lineHeight: 1.05,
		textWrap: "balance",
	},
	play: {
		...focus,
		...mono,
		flexShrink: 0,
		display: "inline-flex",
		alignItems: "center",
		gap: "0.625rem",
		paddingBlock: "0.75rem",
		paddingInline: "1rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper65,
		borderRadius: "999px",
		backgroundColor: {
			default: "transparent",
			":hover": color.paper,
			":focus-visible": color.paper,
		},
		color: { default: color.paper, ":hover": color.ink, ":focus-visible": color.ink },
		transitionProperty: "background-color, color",
		transitionDuration: "150ms",
	},
	triangle: { width: "0.5rem", height: "0.625rem" },

	/** Subtitles sit in the lower bar, under the scrub line. */
	sub: {
		position: { default: "absolute", [NO_SCRIPT]: "static" },
		insetInline: 0,
		top: "calc(100% + 3.25rem)",
		paddingInline: "1.25rem",
		textAlign: "center",
		fontFamily: font.body,
		fontStyle: "italic",
		fontSize: { default: "1.0625rem", [MD]: "1.25rem" },
		lineHeight: 1.35,
		color: color.paper85,
		opacity: { default: 0, [stylex.when.ancestor('[data-state="current"]')]: 1, [NO_SCRIPT]: 1 },
		transitionProperty: "opacity",
		transitionDuration: "180ms",
	},
	hint: {
		...mono,
		display: "block",
		marginTop: "0.75rem",
		fontStyle: "normal",
		color: color.paper45,
	},

	/** Overlays on the gate, above every shot. */
	horizon: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100%)",
		height: "1px",
		backgroundColor: color.paper85,
		opacity: "var(--line, 0)",
		pointerEvents: "none",
		zIndex: 3,
	},
	grain: {
		position: "absolute",
		inset: 0,
		zIndex: 4,
		pointerEvents: "none",
		backgroundImage: GRAIN,
		mixBlendMode: "overlay",
		opacity: 0.32,
		animationName: { default: grain, [REDUCED]: "none" },
		animationDuration: "0.5s",
		animationTimingFunction: "steps(6)",
		animationIterationCount: "infinite",
	},
	cue: {
		position: "absolute",
		top: "6%",
		right: "3.5%",
		width: "min(3.2cqh, 1.1rem)",
		aspectRatio: "1",
		borderRadius: "50%",
		backgroundColor: color.paper,
		boxShadow: `0 0 0.5rem ${film.halation}`,
		opacity: "var(--cue, 0)",
		pointerEvents: "none",
		zIndex: 4,
	},

	lower: { position: "relative", paddingInline: { default: "1rem", [MD]: "1.5rem" } },
	scrub: {
		position: "relative",
		display: { default: "flex", [NO_SCRIPT]: "none" },
		marginTop: "0.5rem",
		height: "1.75rem",
	},
	rail: {
		position: "absolute",
		insetInline: 0,
		top: "50%",
		height: "1px",
		backgroundColor: color.paper15,
		pointerEvents: "none",
	},
	fill: {
		position: "absolute",
		inset: 0,
		backgroundColor: color.aqua,
		transformOrigin: "left",
		scale: "var(--t, 0) 1",
	},
	tick: {
		flex: 1,
		position: "relative",
		cursor: "pointer",
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "-2px",
		color: { default: color.paper45, ":hover": color.paper, ":is([aria-current])": color.aqua },
	},
	tickMark: {
		position: "absolute",
		left: 0,
		top: "calc(50% - 0.25rem)",
		width: "1px",
		height: "0.5rem",
		backgroundColor: "currentColor",
	},

	/** End card. */
	form: { display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "28rem" },
	field: {
		display: "flex",
		alignItems: "center",
		gap: "0.75rem",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: { default: color.paper45, ":focus-within": color.paper },
	},
	input: {
		flex: 1,
		minWidth: 0,
		paddingBlock: "0.75rem",
		backgroundColor: "transparent",
		borderWidth: 0,
		outline: "none",
		color: color.paper,
		fontFamily: font.body,
		fontSize: "1.0625rem",
		"::placeholder": { color: color.paper45 },
	},
	submit: {
		...focus,
		...mono,
		cursor: "pointer",
		paddingBlock: "0.75rem",
		color: { default: color.paper, ":hover": color.aqua },
	},
	status: { ...mono, minHeight: "1rem", color: color.aqua },
	srOnly: {
		position: "absolute",
		width: "1px",
		height: "1px",
		overflow: "hidden",
		clipPath: "inset(50%)",
		whiteSpace: "nowrap",
	},
});
