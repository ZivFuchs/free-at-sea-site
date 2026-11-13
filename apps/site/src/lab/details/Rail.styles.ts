import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** On each stop, so its tick and label react to its state. */
export const stopMarker = stylex.defaultMarker();

const CURRENT = ":is([aria-current])";
const NAMED = ":is(:hover, :focus-visible, [data-show])";
const SHADOW = "0 0 10px oklch(0.15 0.04 245 / 0.9), 0 0 2px oklch(0.15 0.04 245 / 0.8)";

export const styles = stylex.create({
	/** Right edge; low on phones (thumb reach), centred on desktop. */
	rail: {
		position: "fixed",
		right: 0,
		bottom: { default: "22%", "@media (min-width: 48rem)": "auto" },
		top: { default: "auto", "@media (min-width: 48rem)": "50%" },
		translate: { default: null, "@media (min-width: 48rem)": "0 -50%" },
		zIndex: 35,
		color: color.paper,
	},
	list: { margin: 0, padding: 0, listStyleType: "none" },
	stop: {
		display: "flex",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: "0.625rem",
		minWidth: "2.75rem",
		height: { default: "2.25rem", "@media (min-width: 48rem)": "1.75rem" },
		paddingRight: { default: "0.625rem", "@media (min-width: 48rem)": "1rem" },
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "-4px",
	},
	label: {
		fontFamily: font.sans,
		fontSize: "0.625rem",
		letterSpacing: "0.16em",
		textTransform: "uppercase",
		textShadow: SHADOW,
		opacity: { default: 0, [stylex.when.ancestor(NAMED)]: 1 },
		translate: { default: "0.375rem 0", [stylex.when.ancestor(NAMED)]: "0 0" },
		transitionProperty: "opacity, translate",
		transitionDuration: "300ms",
		pointerEvents: "none",
	},
	tick: {
		height: "1px",
		width: { default: "0.5rem", [stylex.when.ancestor(CURRENT)]: "1.375rem" },
		backgroundColor: { default: color.paper65, [stylex.when.ancestor(CURRENT)]: color.aqua },
		boxShadow: SHADOW,
		transitionProperty: "width, background-color",
		transitionDuration: "350ms",
		transitionTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
	},
});
