import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

export const styles = stylex.create({
	hud: {
		position: "absolute",
		top: 0,
		insetInline: 0,
		display: "flex",
		justifyContent: "space-between",
		paddingTop: "1.5rem",
		fontFamily: font.mono,
		fontSize: "10px",
		letterSpacing: "0.2em",
		textTransform: "uppercase",
		color: color.paper45,
	},
});
