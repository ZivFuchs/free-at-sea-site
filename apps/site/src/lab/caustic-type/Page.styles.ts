import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** Ink on the bright shelf, paper past the drop-off: `--deep` (0–1) is set from scroll. */
const tone = `color-mix(in oklab, ${color.paper} calc(var(--deep, 0) * 100%), ${color.ink})`;

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "6px",
} as const;

/** On the root; `data-lit` (WebGL running) fades the canvas in. */
export const rootMarker = stylex.defaultMarker();

export const styles = stylex.create({
	/** The gradient is the whole effect when WebGL2 is missing. */
	root: {
		position: "relative",
		isolation: "isolate",
		backgroundImage:
			"linear-gradient(180deg, var(--shallow) 0, var(--shallow) 26%, var(--mid) 36%, var(--abyss) 46%, var(--abyss) 100%)",
	},
	canvas: {
		position: "fixed",
		top: 0,
		left: 0,
		zIndex: -1,
		width: "100%",
		height: "100lvh",
		pointerEvents: "none",
		opacity: { default: 0, [stylex.when.ancestor("[data-lit]")]: 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.2s",
	},
	header: {
		position: "fixed",
		top: 0,
		insetInline: 0,
		zIndex: 40,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		height: "4.5rem",
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "2.5rem" },
		color: tone,
	},
	wordmark: {
		...focus,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.375rem" },
		letterSpacing: "0.01em",
	},
	nav: { display: "flex", gap: { default: "1.25rem", "@media (min-width: 48rem)": "2.25rem" } },
	link: {
		...focus,
		fontFamily: font.sans,
		fontSize: { default: "0.6875rem", "@media (min-width: 48rem)": "0.8125rem" },
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		opacity: { default: 0.75, ":hover": 1 },
		transitionProperty: "opacity",
		transitionDuration: "150ms",
	},
	hero: {
		position: "relative",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		minHeight: "100svh",
		paddingTop: "31svh",
		color: color.ink,
		textAlign: "center",
		touchAction: "pan-y",
	},
	title: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(13.3vw, 17svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
	},
	tagline: {
		marginTop: "1.25rem",
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.75rem" },
		fontStyle: "italic",
	},
	hint: {
		position: "absolute",
		insetInline: 0,
		bottom: "2.25rem",
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.18em",
		textTransform: "uppercase",
		opacity: 0.7,
	},
	shelf: {
		color: color.ink,
		paddingBlock: { default: "5rem 7rem", "@media (min-width: 48rem)": "8rem 11rem" },
	},
	column: { maxWidth: "46rem" },
	eyebrow: {
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.16em",
		textTransform: "uppercase",
		opacity: 0.75,
	},
	line: {
		marginTop: "1rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.375rem", "@media (min-width: 48rem)": "4.25rem" },
		lineHeight: 1.04,
	},
	body: {
		marginTop: "1.75rem",
		maxWidth: "34rem",
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.55,
	},
	/** The shelf ends here: tall and empty so the floor can fall away under one line. */
	drop: {
		display: "flex",
		alignItems: "flex-end",
		minHeight: { default: "105svh", "@media (min-width: 48rem)": "120svh" },
		paddingBottom: { default: "5rem", "@media (min-width: 48rem)": "8rem" },
		color: color.paper,
		textAlign: "center",
	},
	dropLine: { marginInline: "auto", maxWidth: "15ch" },
	deep: { color: color.paper },
});
