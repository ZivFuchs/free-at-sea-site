import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const caps = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	byline: { ...caps, color: color.paper50 },
	read: {
		...caps,
		display: "inline-flex",
		gap: "0.625rem",
		paddingBlock: "0.75rem",
		paddingInline: "1.25rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper45,
		color: { default: color.paper, ":hover": color.ink },
		backgroundColor: { default: "transparent", ":hover": color.paper },
		outline: { default: "none", ":focus-visible": "1px solid currentColor" },
		outlineOffset: "4px",
		transitionProperty: "color, background-color",
		transitionDuration: "200ms",
	},
});
