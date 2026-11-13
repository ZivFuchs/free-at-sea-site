import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** On each ruler mark, so its tick and label react to hover, focus and `aria-current`. */
export const markMarker = stylex.defaultMarker();

const ON = ":is(:hover, :focus-visible, [aria-current])";

const label = {
	fontFamily: font.sans,
	fontSize: "0.625rem",
	lineHeight: 1,
	letterSpacing: "0.16em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	overlay: { marginBottom: "-4.5rem" },
	bar: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "1rem",
		height: "2.75rem",
	},
	wordmark: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1.125rem",
		letterSpacing: "0.01em",
		whiteSpace: "nowrap",
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "6px",
	},
	readout: {
		...label,
		display: "flex",
		alignItems: "baseline",
		gap: "0.625rem",
		whiteSpace: "nowrap",
	},
	place: { opacity: 0.7 },
	depth: {
		fontSize: "0.8125rem",
		letterSpacing: "0.06em",
		fontVariantNumeric: "tabular-nums",
	},
	unit: { opacity: 0.7 },
	/** The ruler: fine graduations along the bar's bottom edge; section marks hang from it. */
	ruler: { position: "relative", height: "1.75rem" },
	scale: {
		position: "absolute",
		insetInline: 0,
		top: 0,
		height: "100%",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: "color-mix(in oklab, currentColor 30%, transparent)",
		backgroundImage:
			"repeating-linear-gradient(to right, color-mix(in oklab, currentColor 35%, transparent) 0 1px, transparent 1px 100%)",
		backgroundSize: "calc(100% / 40) 4px",
		backgroundRepeat: "repeat-x",
	},
	marks: { position: "absolute", inset: 0, margin: 0, padding: 0, listStyleType: "none" },
	/** `--at` (0–1): where the section starts along the page; `data-edge` keeps edge labels inside the ruler. */
	mark: {
		...label,
		position: "absolute",
		top: 0,
		left: "calc(var(--at) * 100%)",
		translate: {
			default: "-50% 0",
			':is([data-edge="start"])': "0 0",
			':is([data-edge="end"])': "-100% 0",
		},
		display: "flex",
		flexDirection: "column",
		alignItems: {
			default: "center",
			':is([data-edge="start"])': "flex-start",
			':is([data-edge="end"])': "flex-end",
		},
		gap: "0.25rem",
		height: "100%",
		paddingInline: "0.125rem",
		color: {
			default: "color-mix(in oklab, currentColor 65%, transparent)",
			":hover": "inherit",
			":is([aria-current])": "inherit",
		},
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "1px",
		transitionProperty: "color",
		transitionDuration: "200ms",
	},
	tick: {
		width: "1px",
		height: "0.625rem",
		backgroundColor: "currentColor",
		transformOrigin: "top",
		scale: { default: "1 0.7", [stylex.when.ancestor(ON)]: "1 1" },
		transitionProperty: "scale",
		transitionDuration: "200ms",
	},
	needle: {
		position: "absolute",
		top: "-1px",
		left: "calc(var(--needle, 0) * 100%)",
		width: "1px",
		height: "0.75rem",
		backgroundColor: color.aqua,
		boxShadow: `0 0 6px ${color.aqua}`,
	},
});
