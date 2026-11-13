import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { tone } from "./palette.stylex";

const roll = stylex.keyframes({
	from: { rotate: "-0.45deg" },
	to: { rotate: "0.45deg" },
});

const LINE = color.paper50;
const INSET = { default: "1rem", "@media (min-width: 48rem)": "2.5rem" };
const corner = {
	position: "absolute",
	width: "0.875rem",
	height: "0.875rem",
	borderColor: LINE,
	borderStyle: "solid",
	borderWidth: 0,
} as const;

export const styles = stylex.create({
	veil: { backgroundColor: tone.veil },
	hud: { position: "absolute", inset: 0, color: color.paper, fontFamily: font.sans },
	tl: { ...corner, top: "5.5rem", left: INSET, borderTopWidth: "1px", borderLeftWidth: "1px" },
	tr: { ...corner, top: "5.5rem", right: INSET, borderTopWidth: "1px", borderRightWidth: "1px" },
	bl: { ...corner, bottom: "5rem", left: INSET, borderBottomWidth: "1px", borderLeftWidth: "1px" },
	br: {
		...corner,
		bottom: "5rem",
		right: INSET,
		borderBottomWidth: "1px",
		borderRightWidth: "1px",
	},
	/** Attitude line on the footage's horizon, rolling a hair with the swell. */
	attitude: {
		position: "absolute",
		top: "calc(var(--horizon) * 100%)",
		left: INSET,
		right: INSET,
		height: "1px",
		animationName: { default: roll, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "11s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
		animationDirection: "alternate",
	},
	/** Two arms with a gap for the centre mark. */
	arm: {
		position: "absolute",
		top: 0,
		width: "calc(50% - 1.25rem)",
		height: "1px",
		backgroundColor: LINE,
	},
	armLeft: { left: 0 },
	armRight: { right: 0 },
	ticks: {
		position: "absolute",
		top: "1px",
		insetInline: 0,
		height: "0.3125rem",
		backgroundImage: `repeating-linear-gradient(to right, ${color.paper45} 0 1px, transparent 1px 2.5rem)`,
		backgroundPosition: "center",
		maskImage: "linear-gradient(to right, #000, transparent 30%, transparent 70%, #000)",
	},
	centre: {
		position: "absolute",
		top: "-0.25rem",
		left: "50%",
		width: "0.5rem",
		height: "0.5rem",
		translate: "-50% 0",
		borderRadius: "50%",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.aqua,
	},
	copy: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100% + 1.75rem)",
		textAlign: "center",
	},
	title: {
		paddingLeft: "0.62em",
		fontFamily: font.sans,
		fontWeight: 500,
		fontSize: { default: "1rem", "@media (min-width: 48rem)": "1.375rem" },
		letterSpacing: "0.62em",
		textTransform: "uppercase",
		whiteSpace: "nowrap",
	},
	tagline: {
		marginTop: "0.875rem",
		paddingLeft: "0.3em",
		fontSize: "0.6875rem",
		letterSpacing: "0.3em",
		textTransform: "uppercase",
		color: color.paper70,
	},
	clock: {
		position: "absolute",
		top: "5.5rem",
		right: { default: "2.375rem", "@media (min-width: 48rem)": "3.875rem" },
		fontFamily: font.mono,
		fontSize: "0.6875rem",
		letterSpacing: "0.08em",
		lineHeight: "0.875rem",
		color: color.paper70,
	},
	station: {
		position: "absolute",
		top: "5.5rem",
		left: { default: "2.375rem", "@media (min-width: 48rem)": "3.875rem" },
		fontSize: "0.625rem",
		letterSpacing: "0.18em",
		lineHeight: "0.875rem",
		textTransform: "uppercase",
		color: color.aqua,
	},
	readouts: {
		position: "absolute",
		left: { default: "2.375rem", "@media (min-width: 48rem)": "3.875rem" },
		right: { default: "2.375rem", "@media (min-width: 48rem)": "3.875rem" },
		bottom: "5rem",
		display: "grid",
		gridTemplateColumns: { default: "1fr 1fr", "@media (min-width: 48rem)": "repeat(4, 1fr)" },
		columnGap: "1.5rem",
		rowGap: "1.25rem",
	},
	cell: {
		paddingTop: "0.5rem",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.paper15,
	},
	label: {
		fontSize: "0.625rem",
		letterSpacing: "0.18em",
		textTransform: "uppercase",
		color: color.paper65,
	},
	value: {
		marginTop: "0.25rem",
		fontFamily: font.mono,
		fontSize: { default: "0.8125rem", "@media (min-width: 48rem)": "0.9375rem" },
		letterSpacing: "0.02em",
		fontVariantNumeric: "tabular-nums",
		whiteSpace: "nowrap",
	},
	unit: { color: color.paper65 },
});
