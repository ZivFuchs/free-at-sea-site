import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { medusa } from "./palette.stylex";

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	letterSpacing: "0.16em",
	textTransform: "uppercase",
} as const;

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "6px",
} as const;

export const styles = stylex.create({
	ground: {
		position: "relative",
		isolation: "isolate",
		minHeight: "100dvh",
		backgroundColor: medusa.black,
		backgroundImage: `radial-gradient(120% 60% at 50% -10%, color-mix(in oklab, ${color.accent} 35%, transparent), transparent)`,
		backgroundRepeat: "no-repeat",
		backgroundSize: "100% 100svh",
		color: color.paper,
	},
	canvas: {
		position: "fixed",
		inset: 0,
		zIndex: -1,
		width: "100%",
		height: "100%",
		opacity: { default: 0, ":is([data-live])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "2s",
		transitionTimingFunction: "ease-out",
	},
	header: {
		position: "absolute",
		insetInline: 0,
		top: 0,
		zIndex: 2,
		display: "flex",
		alignItems: "center",
		justifyContent: { default: "center", "@media (min-width: 48rem)": "space-between" },
		height: "4.5rem",
	},
	wordmark: {
		...focus,
		display: { default: "none", "@media (min-width: 48rem)": "block" },
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1.375rem",
	},
	nav: { display: "flex", gap: { default: "1.75rem", "@media (min-width: 48rem)": "2.25rem" } },
	link: {
		...focus,
		...eyebrow,
		fontSize: "0.75rem",
		color: { default: color.paper65, ":hover": color.paper },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	hero: {
		display: "flex",
		flexDirection: "column",
		justifyContent: { default: "flex-start", "@media (min-width: 48rem)": "center" },
		alignItems: { default: "center", "@media (min-width: 48rem)": "flex-start" },
		minHeight: "100svh",
		paddingTop: { default: "17svh", "@media (min-width: 48rem)": 0 },
		textAlign: { default: "center", "@media (min-width: 48rem)": "start" },
	},
	title: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "min(15vw, 4.5rem)", "@media (min-width: 48rem)": "min(8.5vw, 8rem)" },
		lineHeight: 0.95,
		textTransform: "uppercase",
		textShadow: `0 0 2.5rem ${medusa.black}`,
	},
	/** Desktop sets the title on two lines so it stays clear of the specimen on the right. */
	turn: { display: { default: "none", "@media (min-width: 48rem)": "block" } },
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.25rem", "@media (min-width: 48rem)": "1.75rem" },
		fontStyle: "italic",
		color: color.paper85,
	},
	label: {
		...eyebrow,
		position: "absolute",
		insetInline: 0,
		top: "calc(100svh - 3.5rem)",
		display: "flex",
		justifyContent: { default: "center", "@media (min-width: 48rem)": "flex-end" },
		color: color.paper45,
	},
	rule: {
		display: "inline-block",
		width: "2rem",
		height: "1px",
		marginRight: "0.75rem",
		verticalAlign: "middle",
		backgroundColor: color.paper45,
	},
	passage: {
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		minHeight: { default: "80svh", "@media (min-width: 48rem)": "90svh" },
		paddingBlock: "5rem",
	},
	measure: { maxWidth: "34rem", marginInline: "auto" },
	eyebrow: { ...eyebrow, color: medusa.glow },
	statement: {
		marginTop: "1.25rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.25rem", "@media (min-width: 48rem)": "3.5rem" },
		lineHeight: 1.05,
		textShadow: `0 0 2rem ${medusa.black}`,
	},
	prose: {
		marginTop: "1.5rem",
		fontSize: "1.125rem",
		lineHeight: 1.6,
		color: color.paper85,
		textShadow: `0 0 1rem ${medusa.black}, 0 0 0.5rem ${medusa.black}`,
	},
	sections: { position: "relative" },
});
