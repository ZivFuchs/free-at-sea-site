import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

export const styles = stylex.create({
	footer: { color: color.paper },
	/** The header's solid state, upside down: abyss glass with the hairline on top. */
	bar: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: color.paper12,
		backgroundColor: color.abyss90,
		backdropFilter: "blur(12px)",
	},
	/** Phones: wordmark, then all links in one centred row. Desktop: links either side of the wordmark. */
	row: {
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 48rem)": "1fr auto 1fr" },
		justifyItems: { default: "center", "@media (min-width: 48rem)": "stretch" },
		alignItems: "center",
		rowGap: "1rem",
		paddingBlock: { default: "1.75rem 1.25rem", "@media (min-width: 48rem)": 0 },
		minHeight: { default: null, "@media (min-width: 48rem)": "4.5rem" },
	},
	wordmark: {
		gridArea: { default: "auto", "@media (min-width: 48rem)": "1 / 2" },
		order: { default: -1, "@media (min-width: 48rem)": 0 },
	},
	side: {
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "center",
		columnGap: "2.25rem",
		rowGap: "0.75rem",
	},
	left: {
		gridArea: { default: "auto", "@media (min-width: 48rem)": "1 / 1" },
		justifySelf: { default: "center", "@media (min-width: 48rem)": "start" },
	},
	right: {
		gridArea: { default: "auto", "@media (min-width: 48rem)": "1 / 3" },
		justifySelf: { default: "center", "@media (min-width: 48rem)": "end" },
	},
	legal: {
		paddingBlock: "1rem 1.5rem",
		textAlign: "center",
		fontFamily: font.sans,
		fontSize: "0.75rem",
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: color.paper45,
	},
});
