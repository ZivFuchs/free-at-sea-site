import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	hero: {
		paddingTop: { default: "2.5rem", "@media (min-width: 48rem)": "4rem" },
		paddingBottom: { default: "3rem", "@media (min-width: 48rem)": "5rem" },
		overflowX: "clip",
	},
	head: {
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 64rem)": "auto minmax(0, 30rem)" },
		alignItems: "end",
		justifyContent: "space-between",
		columnGap: "4rem",
		rowGap: "1.25rem",
		marginBottom: { default: "0.5rem", "@media (min-width: 64rem)": "1.5rem" },
	},
	eyebrow: { ...eyebrow, color: color.aqua },
	title: {
		marginTop: "0.75rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "min(13.5vw, 4.5rem)", "@media (min-width: 48rem)": "6rem" },
		lineHeight: 0.95,
		textTransform: "uppercase",
		whiteSpace: "nowrap",
	},
	lede: {
		fontSize: { default: "1.25rem", "@media (min-width: 48rem)": "1.5rem" },
		lineHeight: 1.35,
		fontStyle: "italic",
	},
	intro: { marginTop: "0.75rem", lineHeight: 1.55, color: color.paper70 },

	grow: {
		paddingBlock: { default: "3.5rem", "@media (min-width: 48rem)": "6rem" },
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.paper12,
	},
	growHeading: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2rem", "@media (min-width: 48rem)": "3rem" },
		lineHeight: 1.05,
		maxWidth: "36rem",
	},
	steps: {
		marginTop: { default: "2rem", "@media (min-width: 48rem)": "3.5rem" },
		display: "grid",
		gridTemplateColumns: {
			default: "1fr",
			"@media (min-width: 48rem)": "repeat(3, minmax(0, 1fr))",
		},
		columnGap: "2.5rem",
		rowGap: "2rem",
	},
	step: {
		paddingTop: "1.25rem",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.paper45,
	},
	stepNumber: { ...eyebrow, color: color.paper65 },
	stepTitle: { marginTop: "0.5rem", fontSize: "1.375rem", lineHeight: 1.2, fontStyle: "italic" },
	stepBody: { marginTop: "0.5rem", lineHeight: 1.55, color: color.paper70 },
});
