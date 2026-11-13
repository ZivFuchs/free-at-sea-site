import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const STILL = "@media (prefers-reduced-motion: reduce)";
const INK_0 = "color-mix(in oklab, var(--app-ink) 0%, transparent)";
const INK_40 = "color-mix(in oklab, var(--app-ink) 40%, transparent)";
const INK_55 = "color-mix(in oklab, var(--app-ink) 55%, transparent)";
const OCEAN_0 = "color-mix(in oklab, var(--app-ocean) 0%, transparent)";
/** Room under the HUD for phone toolbars and the lab chip. */
const HUD_BOTTOM = "calc(100lvh - 100svh + 3.75rem)";

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	lineHeight: 1.4,
	letterSpacing: "0.16em",
	textTransform: "uppercase",
	fontVariantNumeric: "tabular-nums",
} as const;

const nudge = stylex.keyframes({
	"0%": { scale: "1 0", transformOrigin: "top" },
	"50%": { scale: "1 1", transformOrigin: "top" },
	"50.01%": { scale: "1 1", transformOrigin: "bottom" },
	"100%": { scale: "1 0", transformOrigin: "bottom" },
});

export const styles = stylex.create({
	/** Scroll length of the shot. Still: just the opening frame, copy stacked beneath. */
	track: {
		position: "relative",
		height: { default: "520svh", [STILL]: "auto" },
		backgroundColor: color.ocean,
	},
	stage: {
		position: { default: "sticky", [STILL]: "relative" },
		top: 0,
		isolation: "isolate",
		height: { default: "100lvh", [STILL]: "100svh" },
		minHeight: "32rem",
		overflow: "hidden",
		backgroundColor: color.ink,
	},
	camera: { position: "absolute", inset: 0, willChange: "transform" },
	/** Sea darkens behind the copy once the pale sky has left the frame. */
	scrim: {
		position: "absolute",
		inset: 0,
		pointerEvents: "none",
		backgroundImage: `linear-gradient(to bottom, ${INK_40}, ${INK_0} 55%), radial-gradient(120% 90% at 50% 58%, ${INK_0} 45%, ${INK_55})`,
		opacity: { default: "var(--dim, 0)", [STILL]: 0 },
	},
	/** The last frames sink into the page ground so the shot releases without a seam. */
	seam: {
		position: "absolute",
		insetInline: 0,
		bottom: 0,
		height: "35%",
		pointerEvents: "none",
		backgroundImage: `linear-gradient(to bottom, ${OCEAN_0}, ${color.ocean})`,
		opacity: { default: "clamp(0, (var(--p, 0) - 0.9) * 10, 1)", [STILL]: 1 },
	},

	cue: {
		...label,
		position: "absolute",
		insetInline: 0,
		bottom: HUD_BOTTOM,
		display: { default: "grid", [STILL]: "none" },
		justifyItems: "center",
		gap: "0.75rem",
		color: color.paper85,
		opacity: "clamp(0, 1 - var(--p, 0) * 25, 1)",
	},
	cueLine: {
		width: "1px",
		height: "2.5rem",
		backgroundColor: color.paper70,
		animationName: nudge,
		animationDuration: "2.6s",
		animationTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
		animationIterationCount: "infinite",
	},

	/** Overlays the pinned stage and pins with it; an ordinary list when still. */
	chapters: {
		position: { default: "sticky", [STILL]: "static" },
		top: 0,
		zIndex: 1,
		display: "grid",
		alignContent: { default: "start", [STILL]: "normal" },
		rowGap: { default: 0, [STILL]: "3rem" },
		height: { default: "100lvh", [STILL]: "auto" },
		minHeight: { default: "32rem", [STILL]: 0 },
		marginTop: { default: "min(-100lvh, -32rem)", [STILL]: 0 },
		paddingTop: { default: "max(20svh, 6.5rem)", [STILL]: "4rem" },
		paddingBottom: { default: 0, [STILL]: "2rem" },
		pointerEvents: "none",
	},
	chapter: {
		gridArea: { default: "1 / 1", [STILL]: "auto" },
		justifySelf: { default: "center", "@media (min-width: 48rem)": "start" },
		maxWidth: { default: "22rem", "@media (min-width: 48rem)": "30rem" },
		textAlign: { default: "center", "@media (min-width: 48rem)": "start" },
		opacity: { default: 0, [STILL]: 1 },
		willChange: "opacity, translate",
	},
	chapterLabel: {
		...label,
		display: "inline-flex",
		alignItems: "center",
		gap: "0.75rem",
		color: color.aqua,
	},
	chapterNumber: { color: color.paper65 },
	chapterLine: {
		marginTop: "0.875rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "2.125rem" },
		lineHeight: 1.22,
		color: color.paper,
		textShadow: `0 1px 24px ${INK_55}`,
	},

	hud: {
		position: "absolute",
		insetInline: 0,
		bottom: HUD_BOTTOM,
		display: { default: "block", [STILL]: "none" },
		pointerEvents: "none",
		color: color.paper70,
		opacity: "clamp(0, (var(--p, 0) - 0.06) * 14, 1)",
	},
	readouts: { ...label, display: "flex", justifyContent: "space-between", gap: "1rem" },
	value: { color: color.paper },
	rail: {
		position: "relative",
		marginTop: "0.625rem",
		height: "1px",
		backgroundColor: color.paper15,
	},
	fill: {
		position: "absolute",
		inset: 0,
		backgroundColor: color.aqua,
		transformOrigin: "left",
		scale: "var(--p, 0) 1",
	},
	tick: {
		position: "absolute",
		bottom: 0,
		left: "calc(var(--at) * 100%)",
		width: "1px",
		height: "0.4375rem",
		backgroundColor: color.paper50,
	},
	tickLabel: {
		...label,
		position: "absolute",
		top: "0.75rem",
		left: "calc(var(--at) * 100%)",
		display: { default: "none", "@media (min-width: 64rem)": "block" },
		fontSize: "0.625rem",
		whiteSpace: "nowrap",
		color: color.paper45,
	},

	/** The site bar's look, minus its scroll script: this page drives `--solid` and `--mark` itself. */
	bar: { gridTemplateColumns: "1fr auto 1fr" },
	nav: {
		display: { default: "none", "@media (min-width: 48rem)": "flex" },
		gap: "2.25rem",
	},
});
