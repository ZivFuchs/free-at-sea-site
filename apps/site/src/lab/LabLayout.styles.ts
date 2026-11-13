import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

export const styles = stylex.create({
	body: { minHeight: "100dvh" },
	light: { backgroundColor: color.paper, color: color.ink },
	/** Back to the lab index. Small, out of the way of thumbs and of the experiments panel (bottom right). */
	chip: {
		position: "fixed",
		left: "0.75rem",
		bottom: "0.75rem",
		zIndex: 60,
		paddingBlock: "0.375rem",
		paddingInline: "0.75rem",
		borderRadius: "999px",
		backgroundColor: "color-mix(in oklab, var(--app-ink) 70%, transparent)",
		backdropFilter: "blur(8px)",
		color: color.paper,
		fontFamily: font.sans,
		fontSize: "0.6875rem",
		letterSpacing: "0.12em",
		textTransform: "uppercase",
		opacity: { default: 0.6, ":hover": 1, ":focus-visible": 1 },
		transitionProperty: "opacity",
		transitionDuration: "150ms",
	},
});
