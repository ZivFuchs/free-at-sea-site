import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { survey } from "./palette.stylex";

const MD = "@media (min-width: 48rem)";

const label = {
	fontFamily: font.mono,
	fontSize: "0.6875rem",
	lineHeight: 1.3,
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	root: { position: "relative", backgroundColor: survey.fog, color: color.paper },
	canvas: {
		position: "fixed",
		inset: 0,
		zIndex: 0,
		width: "100%",
		height: "100lvh",
		backgroundImage: `linear-gradient(${survey.fog} 30%, ${survey.shoal} 140%)`,
	},
	/** Darkens the frame edges so the header and instruments always read. */
	vignette: {
		position: "fixed",
		inset: 0,
		zIndex: 0,
		pointerEvents: "none",
		backgroundImage: `linear-gradient(${survey.fog55}, ${survey.fog0} 22%, ${survey.fog0} 72%, ${survey.fog80})`,
	},
	main: { position: "relative", zIndex: 1 },
	footer: {
		position: "relative",
		zIndex: 1,
		paddingBottom: { default: "5.25rem", [MD]: "3.5rem" },
		backgroundColor: survey.fog92,
	},

	hero: {
		position: "relative",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		height: "100svh",
		minHeight: "34rem",
		paddingTop: { default: "22svh", [MD]: "17svh" },
		textAlign: "center",
	},
	eyebrow: { ...label, color: survey.line },
	title: {
		marginTop: "1.25rem",
		fontFamily: font.hero,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		textShadow: `0 0 2.5rem ${survey.fog}`,
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.375rem", [MD]: "1.875rem" },
		lineHeight: 1.3,
		fontStyle: "italic",
		color: color.paper85,
	},
	cue: {
		...label,
		position: "absolute",
		insetInline: 0,
		bottom: { default: "7rem", [MD]: "5.5rem" },
		color: color.paper65,
	},

	/** One log entry: a column of copy on the left, the floor left open beside it. */
	entry: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		minHeight: { default: "92svh", [MD]: "105svh" },
		paddingBlock: "5rem",
	},
	entryScrim: {
		position: "absolute",
		inset: 0,
		zIndex: -1,
		pointerEvents: "none",
		backgroundImage: {
			default: `linear-gradient(${survey.fog0}, ${survey.fog80} 30%, ${survey.fog80} 70%, ${survey.fog0})`,
			[MD]: `linear-gradient(90deg, ${survey.fog92}, ${survey.fog80} 30%, ${survey.fog0} 62%)`,
		},
		maskImage: {
			default: null,
			[MD]: "linear-gradient(transparent, black 22%, black 78%, transparent)",
		},
	},
	column: { maxWidth: "33rem" },
	meta: {
		...label,
		display: "flex",
		alignItems: "center",
		gap: "0.75rem",
		color: survey.line,
	},
	rule: { flex: 1, height: "1px", backgroundColor: survey.line25 },
	stamp: { color: color.paper65 },
	heading: {
		marginTop: "1.5rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.5rem", [MD]: "3.75rem" },
		lineHeight: 1,
	},
	body: {
		marginTop: "1.25rem",
		fontSize: { default: "1.0625rem", [MD]: "1.1875rem" },
		lineHeight: 1.55,
		color: color.paper85,
	},
	figure: {
		marginTop: "2rem",
		paddingTop: "1rem",
		display: "grid",
		gridTemplateColumns: "auto 1fr",
		alignItems: "baseline",
		columnGap: "1rem",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: survey.line25,
	},
	number: {
		fontFamily: font.display,
		fontSize: { default: "2.5rem", [MD]: "3.25rem" },
		lineHeight: 1,
		color: survey.line,
	},
	caption: { ...label, letterSpacing: "0.1em", color: color.paper65 },

	/** Reused site sections ride on a band of fog so their own layout reads over the floor. */
	band: {
		position: "relative",
		backgroundImage: `linear-gradient(${survey.fog0}, ${survey.fog92} 7rem, ${survey.fog92} calc(100% - 7rem), ${survey.fog0})`,
		paddingBlock: "3rem",
	},
	bandMeta: { marginBottom: { default: "-2.5rem", [MD]: "-4.5rem" }, paddingTop: "3rem" },
	gap: { height: { default: "45svh", [MD]: "70svh" } },

	hud: {
		position: "fixed",
		insetInline: 0,
		bottom: 0,
		zIndex: 30,
		display: "grid",
		gridTemplateColumns: { default: "1fr", [MD]: "1fr auto" },
		alignItems: "center",
		columnGap: "2rem",
		rowGap: "0.375rem",
		paddingBlock: "0.625rem",
		paddingLeft: { default: "1rem", [MD]: "6.5rem" },
		paddingRight: { default: "1rem", [MD]: "2.5rem" },
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: survey.line12,
		backgroundColor: survey.fog80,
		backdropFilter: "blur(10px)",
		pointerEvents: "none",
	},
	profile: { position: "relative", height: { default: "1.25rem", [MD]: "1.75rem" } },
	profileSvg: { display: "block", width: "100%", height: "100%", overflow: "visible" },
	profileLine: {
		fill: "none",
		stroke: survey.line,
		strokeWidth: 1,
		vectorEffect: "non-scaling-stroke",
	},
	profileFloor: { fill: survey.line12 },
	marker: {
		position: "absolute",
		top: "-0.25rem",
		bottom: "-0.25rem",
		left: "calc(var(--along, 0) * 100%)",
		width: "1px",
		backgroundColor: color.paper,
	},
	readouts: {
		display: "flex",
		justifyContent: { default: "flex-end", [MD]: "flex-start" },
		gap: { default: "1.1rem", [MD]: "1.75rem" },
		paddingLeft: { default: "4.75rem", [MD]: 0 },
	},
	readout: { display: "grid", rowGap: "0.125rem" },
	wide: { display: { default: "none", [MD]: "grid" } },
	key: { ...label, fontSize: "0.5625rem", color: color.paper50 },
	value: {
		fontFamily: font.mono,
		fontSize: { default: "0.75rem", [MD]: "0.8125rem" },
		lineHeight: 1.2,
		fontVariantNumeric: "tabular-nums",
		whiteSpace: "nowrap",
		color: color.paper,
	},
	unit: { color: color.paper50 },
});
