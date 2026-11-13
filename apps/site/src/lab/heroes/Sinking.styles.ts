import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { tone } from "./palette.stylex";

const ripple = stylex.keyframes({
	from: { translate: "calc(var(--sway) * -1) 0" },
	to: { translate: "var(--sway) 0" },
});

/** `--water`: the waterline, as a fraction of the stage. `--sink`: how far the title has gone down, in ems. */
export const styles = stylex.create({
	section: {
		position: "relative",
		height: "175svh",
		minHeight: "56rem",
	},
	stage: {
		position: "sticky",
		top: 0,
		height: "100svh",
		minHeight: "32rem",
		overflow: "hidden",
		isolation: "isolate",
		backgroundColor: color.ink,
	},
	/** The photo, dropped so its horizon lands on the waterline. */
	photo: {
		position: "absolute",
		insetInline: 0,
		top: "calc((var(--water) - var(--horizon)) * 100%)",
		height: "100%",
	},
	/** Its sky, mirrored upward to fill the gap. */
	sky: {
		position: "absolute",
		insetInline: 0,
		bottom: "calc(100% - (var(--water) - var(--horizon)) * 100%)",
		height: "100%",
		scale: "1 -1",
	},
	type: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		textAlign: "center",
	},
	above: {
		position: "absolute",
		insetInline: 0,
		top: 0,
		height: "calc(var(--water) * 100%)",
		overflow: "hidden",
	},
	/** Squashed toward the surface, as refraction foreshortens what is under it, and lost with depth. */
	below: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--water) * 100%)",
		height: "1.6em",
		overflow: "hidden",
		transformOrigin: "top",
		scale: "1 0.88",
		filter: "blur(0.5px)",
		maskImage: "linear-gradient(to bottom, #000c 0%, #0007 50%, transparent 95%)",
	},
	/** Baseline on the waterline: Playfair's sits 0.085em above the bottom of a 1em line box. */
	title: {
		position: "absolute",
		insetInline: 0,
		translate: "0 calc((var(--sink, 0) + 0.085) * 1em)",
	},
	dry: { bottom: 0, color: color.paper, opacity: 0.88 },
	wet: { color: tone.submerged },
	strip: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--i) * 0.05em)",
		height: "calc(0.05em + 1px)",
		overflow: "hidden",
		animationName: { default: ripple, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "2.6s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
		animationDirection: "alternate",
		animationDelay: "calc(var(--i) * -0.19s)",
	},
	/** Each strip shows its own slice of the same title. */
	slice: { bottom: "calc(100% + var(--i) * 0.05em)" },
	/** Light caught where the letters cut the surface. */
	glint: {
		position: "absolute",
		top: "calc(var(--water) * 100%)",
		left: "50%",
		width: "min(92vw, 110svh)",
		height: "1px",
		translate: "-50% 0",
		backgroundImage: `linear-gradient(to right, transparent, ${color.paper85} 20%, ${color.paper85} 80%, transparent)`,
		opacity: "var(--glint, 0)",
	},
	tagline: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--water) * 100% + min(13.3vw, 15.4svh) * 1.55)",
		textAlign: "center",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		fontStyle: "italic",
		color: color.paper,
		opacity: 0.85,
	},
	anchor: { position: "absolute", top: "72svh", height: "1px", width: "1px" },
});
