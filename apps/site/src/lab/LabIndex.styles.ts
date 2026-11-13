import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

export const styles = stylex.create({
	page: { paddingBlock: { default: "3rem", "@media (min-width: 48rem)": "5rem" } },
	eyebrow: {
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: color.aqua,
	},
	title: {
		marginTop: "0.5rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.5rem", "@media (min-width: 48rem)": "4rem" },
		lineHeight: 1,
	},
	lede: {
		marginTop: "1rem",
		maxWidth: "38rem",
		color: color.paper70,
		fontSize: "1.125rem",
		lineHeight: 1.5,
	},
	heading: {
		marginTop: "3.5rem",
		paddingBottom: "0.75rem",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: color.paper15,
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: color.paper65,
	},
	list: {
		display: "grid",
		gridTemplateColumns: {
			default: "1fr",
			"@media (min-width: 48rem)": "1fr 1fr",
			"@media (min-width: 72rem)": "1fr 1fr 1fr",
		},
		columnGap: "2.5rem",
	},
	link: {
		display: "grid",
		gridTemplateColumns: "2.5rem 1fr",
		height: "100%",
		paddingBlock: "1.5rem",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: color.paper12,
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "4px",
	},
	number: {
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.1em",
		color: color.paper45,
		paddingTop: "0.5rem",
	},
	name: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1.75rem",
		lineHeight: 1.1,
		color: { default: color.paper, [stylex.when.ancestor(":hover")]: color.aqua },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	pitch: { marginTop: "0.5rem", color: color.paper70, lineHeight: 1.45 },
	tags: {
		marginTop: "0.75rem",
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.1em",
		textTransform: "uppercase",
		color: color.paper45,
	},
});

export const linkMarker = stylex.defaultMarker();
