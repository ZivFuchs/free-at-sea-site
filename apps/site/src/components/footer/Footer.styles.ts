import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

export const styles = stylex.create({
	footer: {
		position: "relative",
		isolation: "isolate",
		overflow: "hidden",
		backgroundColor: color.ink,
		color: color.paper,
	},
	backdrop: { position: "absolute", inset: 0, zIndex: -10, pointerEvents: "none" },
	body: {
		display: "flex",
		flexDirection: { default: "column", "@media (min-width: 48rem)": "row" },
		justifyContent: { default: "flex-end", "@media (min-width: 48rem)": "space-between" },
		alignItems: { default: null, "@media (min-width: 48rem)": "flex-end" },
		gap: "2.5rem",
		minHeight: { default: "32rem", "@media (min-width: 48rem)": "36rem" },
		paddingTop: "6rem",
		paddingBottom: { default: "3rem", "@media (min-width: 48rem)": "4rem" },
	},
	tagline: { marginTop: "0.5rem", maxWidth: "24rem", color: color.paper70 },
	list: {
		display: "flex",
		flexDirection: { default: "column", "@media (min-width: 48rem)": "row" },
		gap: { default: "0.75rem", "@media (min-width: 48rem)": "2rem" },
	},
	link: { color: { default: color.paper70, ":hover": color.paper } },
	legal: {
		borderTopWidth: "1px",
		borderTopColor: color.paper15,
		paddingBlock: "1.5rem",
		fontFamily: font.sans,
		color: color.paper50,
	},
});
