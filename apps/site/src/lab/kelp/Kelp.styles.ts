import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { kelp } from "./palette.stylex";

const settle = stylex.keyframes({ from: { opacity: 0, translate: "0 0.75rem" } });
const sink = stylex.keyframes({ from: { scale: "1 0" }, to: { scale: "1 1" } });

const canvas = {
	position: "fixed",
	top: 0,
	left: 0,
	width: "100%",
	height: "100lvh",
	pointerEvents: "none",
} as const;

export const styles = stylex.create({
	/** Re-grounds the site's header and footer glass in kelp water. */
	page: { position: "relative", isolation: "isolate", "--app-ocean": kelp.deep },
	/** Shows until the canvas paints, and stays if it never does. */
	water: {
		...canvas,
		zIndex: -1,
		backgroundImage: `linear-gradient(oklch(0.58 0.08 170), oklch(0.36 0.06 200) 40%, ${kelp.deep})`,
	},
	far: { ...canvas, zIndex: -1, filter: "blur(1.5px)" },
	mid: { ...canvas, zIndex: -1 },
	/** Out-of-focus fronds between the reader and the page. */
	near: { ...canvas, zIndex: 30, filter: "blur(7px)" },

	hero: {
		position: "relative",
		display: "grid",
		placeItems: "center",
		height: "100svh",
		minHeight: "34rem",
		paddingInline: "1rem",
		textAlign: "center",
	},
	copy: { marginTop: { default: "6svh", "@media (min-width: 48rem)": "10svh" } },
	title: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "min(13.3vw, 15svh)", "@media (min-width: 48rem)": "min(10.5vw, 15svh)" },
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		color: color.paper,
		textShadow: `0 0 2.5rem ${kelp.shade}`,
		animationName: { default: settle, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "1.8s",
		animationTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
		animationFillMode: "backwards",
		animationDelay: "0.2s",
	},
	tagline: {
		marginTop: "1rem",
		fontStyle: "italic",
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.75rem" },
		lineHeight: 1.3,
		color: color.paper85,
		textShadow: `0 0 1.5rem ${kelp.shade}`,
		animationName: { default: settle, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "1.8s",
		animationTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
		animationFillMode: "backwards",
		animationDelay: "0.9s",
	},
	cue: {
		position: "absolute",
		insetInline: 0,
		bottom: "1.75rem",
		display: "grid",
		justifyItems: "center",
		gap: "0.75rem",
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.2em",
		textTransform: "uppercase",
		color: color.paper70,
	},
	plumb: {
		width: "1px",
		height: "2.5rem",
		backgroundColor: kelp.gold,
		transformOrigin: "top",
		animationName: { default: sink, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "2.6s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
		animationDirection: "alternate",
	},

	passage: {
		marginInline: "auto",
		width: "100%",
		maxWidth: "36rem",
		paddingInline: "1.5rem",
		paddingBlock: { default: "5rem", "@media (min-width: 48rem)": "9rem" },
		textAlign: "center",
	},
	/** Room at the foot of the page for the forest floor to show. */
	floor: { paddingBottom: { default: "38svh", "@media (min-width: 48rem)": "46svh" } },
	eyebrow: {
		display: "inline-flex",
		alignItems: "center",
		gap: "0.75rem",
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.2em",
		textTransform: "uppercase",
		color: kelp.gold,
	},
	rule: { width: "1.5rem", height: "1px", backgroundColor: kelp.gold, opacity: 0.6 },
	heading: {
		marginTop: "1.25rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2rem", "@media (min-width: 48rem)": "2.75rem" },
		lineHeight: 1.1,
		textShadow: `0 0 2rem ${kelp.shade}`,
	},
	body: {
		marginTop: "1.25rem",
		fontSize: { default: "1.0625rem", "@media (min-width: 48rem)": "1.1875rem" },
		lineHeight: 1.6,
		color: color.paper85,
		textShadow: `0 0 1.25rem ${kelp.shade}`,
	},
});
