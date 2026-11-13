import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { night } from "./palette.stylex";

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.18em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	night: { position: "relative", backgroundColor: night.water, color: color.paper },
	/** Light only: screen-blended over the page, so black adds nothing. */
	light: {
		position: "fixed",
		inset: 0,
		zIndex: 30,
		width: "100%",
		height: "100%",
		pointerEvents: "none",
		mixBlendMode: "screen",
	},
	hero: {
		position: "relative",
		height: "100svh",
		minHeight: "32rem",
		overflow: "hidden",
	},
	/** The sea's edge, for no-WebGL and before the first frame. */
	horizon: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100%)",
		height: "1px",
		backgroundColor: color.paper12,
	},
	copy: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100% + 7svh)",
		textAlign: "center",
	},
	title: {
		fontFamily: font.hero,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		lineHeight: 1.3,
		fontStyle: "italic",
	},
	hint: {
		...eyebrow,
		position: "absolute",
		insetInline: 0,
		bottom: { default: "4.5rem", "@media (min-width: 48rem)": "2.25rem" },
		textAlign: "center",
		color: color.paper45,
	},
	passage: {
		paddingBlock: { default: "6rem", "@media (min-width: 48rem)": "10rem" },
		maxWidth: "46rem",
	},
	eyebrow: { ...eyebrow, color: night.lamp },
	heading: {
		marginTop: "1.25rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.25rem", "@media (min-width: 48rem)": "3.5rem" },
		lineHeight: 1.05,
	},
	body: {
		marginTop: "1.5rem",
		maxWidth: "34rem",
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.55,
		color: color.paper85,
	},
	landfall: {
		paddingBlock: { default: "5rem", "@media (min-width: 48rem)": "8rem" },
		textAlign: "center",
		fontStyle: "italic",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "2rem" },
		lineHeight: 1.3,
		color: night.lamp,
	},
	steady: {
		...eyebrow,
		position: "fixed",
		right: "0.75rem",
		bottom: "0.75rem",
		zIndex: 45,
		display: "flex",
		alignItems: "center",
		gap: "0.5rem",
		paddingBlock: "0.5rem",
		paddingInline: "0.875rem",
		borderRadius: "999px",
		fontSize: "0.6875rem",
		letterSpacing: "0.12em",
		backgroundColor: "color-mix(in oklab, var(--app-ink) 70%, transparent)",
		backdropFilter: "blur(8px)",
		color: {
			default: color.paper70,
			":hover": color.paper,
			":is([aria-pressed=true])": night.lamp,
		},
		cursor: "pointer",
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "3px",
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	dot: {
		width: "0.4375rem",
		height: "0.4375rem",
		borderRadius: "50%",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: "currentColor",
		backgroundColor: {
			default: "transparent",
			[stylex.when.ancestor(":is([aria-pressed=true])")]: "currentColor",
		},
	},
});

export const steadyMarker = stylex.defaultMarker();
