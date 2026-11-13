import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** On the switch: its bars move while `aria-pressed="true"`. */
export const switchMarker = stylex.defaultMarker();

const ON = ':is([aria-pressed="true"])';
const beat = stylex.keyframes({ from: { scale: "1 0.3" }, to: { scale: "1 1" } });

export const styles = stylex.create({
	/** Bottom left, above the lab chip. */
	toggle: {
		position: "fixed",
		left: "0.75rem",
		bottom: "3rem",
		zIndex: 45,
		display: { default: "flex", ":is([hidden])": "none" },
		alignItems: "center",
		gap: "0.5rem",
		height: "2rem",
		paddingInline: "0.75rem",
		borderRadius: "999px",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: { default: color.paper15, ":hover": color.paper45, [ON]: color.paper45 },
		backgroundColor: "color-mix(in oklab, var(--app-ink) 70%, transparent)",
		backdropFilter: "blur(8px)",
		color: { default: color.paper70, ":hover": color.paper, [ON]: color.paper },
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.12em",
		textTransform: "uppercase",
		cursor: "pointer",
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "3px",
		transitionProperty: "color, border-color",
		transitionDuration: "200ms",
	},
	bars: { display: "flex", alignItems: "center", gap: "2px", height: "0.75rem" },
	bar: {
		width: "1.5px",
		height: "100%",
		backgroundColor: { default: "currentColor", [stylex.when.ancestor(ON)]: color.aqua },
		scale: { default: "1 0.25", [stylex.when.ancestor(ON)]: null },
		animationName: {
			default: null,
			[stylex.when.ancestor(ON)]: {
				default: beat,
				"@media (prefers-reduced-motion: reduce)": null,
			},
		},
		animationDuration: "var(--beat)",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
		animationDirection: "alternate",
	},
});
