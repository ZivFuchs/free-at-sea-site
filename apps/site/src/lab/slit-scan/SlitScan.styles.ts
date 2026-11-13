import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const MD = "@media (min-width: 48rem)";

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	lineHeight: 1.5,
	letterSpacing: "0.16em",
	textTransform: "uppercase",
	fontVariantNumeric: "tabular-nums",
} as const;

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "6px",
} as const;

export const styles = stylex.create({
	bar: {
		display: "flex",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: "1.5rem",
		paddingBlock: "1.5rem",
	},
	wordmark: {
		...focus,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1.25rem",
		whiteSpace: "nowrap",
	},
	nav: { display: "flex", gap: { default: "1rem", [MD]: "2.25rem" } },
	navLink: {
		...label,
		...focus,
		color: { default: color.paper65, ":hover": color.paper },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},

	hero: { paddingBlock: { default: "2.5rem 4rem", [MD]: "4rem 7rem" } },
	eyebrow: { ...label, color: color.aqua },
	title: {
		marginTop: "0.75rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "min(13.5vw, 4.5rem)", [MD]: "min(9.5vw, 8.5rem)" },
		lineHeight: 0.95,
		textTransform: "uppercase",
		whiteSpace: "nowrap",
	},
	tagline: {
		marginTop: "0.75rem",
		fontStyle: "italic",
		fontSize: { default: "1.25rem", [MD]: "1.5rem" },
		color: color.paper85,
	},

	figure: { marginTop: { default: "2.5rem", [MD]: "3.5rem" } },
	/** The print: a still underneath, the live scan fading in over it. */
	frame: {
		position: "relative",
		overflow: "hidden",
		backgroundColor: color.ink,
		outline: `1px solid ${color.paper12}`,
		outlineOffset: "-1px",
	},
	wide: { aspectRatio: { default: "4 / 5", [MD]: "2.39 / 1" } },
	tall: {
		aspectRatio: { default: "3 / 4", [MD]: "auto" },
		height: { default: "auto", [MD]: "100%" },
		minHeight: { default: null, [MD]: "34rem" },
	},
	round: { aspectRatio: { default: "1", [MD]: "4 / 3" } },
	thumb: { aspectRatio: "16 / 9" },
	still: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
	/** The still shows the same crop the scan starts from. */
	stillZoom: { scale: "2.1", transformOrigin: "50% 59%" },
	canvas: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		touchAction: "pan-y",
		opacity: { default: 0, ":is([data-live])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "900ms",
	},
	crosshair: { cursor: "crosshair" },

	caption: {
		display: "grid",
		gridTemplateColumns: { default: "1fr auto", [MD]: "14rem 1fr auto" },
		columnGap: "2rem",
		rowGap: "0.5rem",
		alignItems: "baseline",
		marginTop: "1rem",
	},
	plateNo: { ...label, color: color.paper },
	how: {
		gridColumn: { default: "1 / -1", [MD]: "auto" },
		gridRow: { default: "2", [MD]: "auto" },
		maxWidth: "34rem",
		fontSize: "0.9375rem",
		lineHeight: 1.5,
		color: color.paper70,
	},
	readout: { ...label, color: color.paper65, textAlign: "right", whiteSpace: "nowrap" },
	value: { color: color.aqua },

	passage: {
		paddingBlock: { default: "1rem 5rem", [MD]: "2rem 9rem" },
		display: "grid",
		gridTemplateColumns: { default: "1fr", [MD]: "14rem 1fr" },
		columnGap: "2rem",
		rowGap: "1rem",
	},
	lede: {
		maxWidth: "40rem",
		fontSize: { default: "1.5rem", [MD]: "2.25rem" },
		lineHeight: 1.25,
	},
	body: {
		marginTop: "1.25rem",
		maxWidth: "34rem",
		fontSize: "1.0625rem",
		lineHeight: 1.6,
		color: color.paper70,
	},

	plate: { paddingBottom: { default: "5rem", [MD]: "9rem" } },
	split: {
		display: "grid",
		gridTemplateColumns: { default: "1fr", [MD]: "14rem 1fr" },
		columnGap: "2rem",
		rowGap: "1.5rem",
	},
	aside: { display: "flex", flexDirection: "column", gap: "1rem" },
	marker: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--line, 0.5) * 100%)",
		height: "1px",
		backgroundColor: color.aqua,
		boxShadow: "0 0 0 1px color-mix(in oklab, var(--app-ink) 50%, transparent)",
		pointerEvents: "none",
	},
	field: { display: "grid", gap: "0.5rem" },
	fieldLabel: { ...label, color: color.paper65 },
	range: { width: "100%", accentColor: color.aqua, cursor: "pointer" },
	note: { fontSize: "0.9375rem", lineHeight: 1.5, color: color.paper70 },
	axis: {
		...label,
		position: "absolute",
		right: "0.75rem",
		color: color.paper85,
		textShadow: "0 0 6px var(--app-ink)",
		pointerEvents: "none",
	},
	axisTop: { top: "0.625rem" },
	axisBottom: { bottom: "0.625rem" },
	radial: { marginInline: "auto", maxWidth: { default: "none", [MD]: "56rem" } },

	rule: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.paper12,
	},
});
