import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

export const styles = stylex.create({
	body: { display: "flex", flexDirection: "column", minHeight: "100dvh" },
	skip: {
		position: { default: "absolute", ":focus": "fixed" },
		top: { default: null, ":focus": "0.5rem" },
		left: { default: null, ":focus": "0.5rem" },
		zIndex: 50,
		width: { default: "1px", ":focus": "auto" },
		height: { default: "1px", ":focus": "auto" },
		margin: { default: "-1px", ":focus": 0 },
		overflow: { default: "hidden", ":focus": "visible" },
		clip: { default: "rect(0, 0, 0, 0)", ":focus": "auto" },
		whiteSpace: "nowrap",
		paddingBlock: "0.5rem",
		paddingInline: "1rem",
		backgroundColor: color.ink,
		color: color.paper,
		fontFamily: font.sans,
		fontSize: "0.875rem",
		lineHeight: 1.43,
	},
	main: { flex: 1 },
	content: {
		paddingBlock: { default: "3rem", "@media (min-width: 48rem)": "4rem" },
	},
});
