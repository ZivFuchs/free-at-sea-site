import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";

const surface = stylex.keyframes({ from: { opacity: 0 } });

export const styles = stylex.create({
	section: {
		position: "relative",
		isolation: "isolate",
		height: "calc(100svh - 4rem)",
		minHeight: "32rem",
		overflow: "hidden",
		backgroundColor: color.ink,
	},
	copy: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100%)",
		textAlign: "center",
	},
	submerged: {
		color: color.paper,
		opacity: 0.6,
		mixBlendMode: "overlay",
		filter: "url(#waterline-ripple)",
		maskImage: "linear-gradient(to bottom, black 40%, rgb(0 0 0 / 0.5))",
	},
	title: {
		marginTop: "0.1em",
		fontSize: "min(calc(19vw * var(--size)), calc(22svh * var(--size)))",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		lineHeight: { default: "calc(2 / 1.5)", "@media (min-width: 48rem)": "calc(2.25 / 1.875)" },
		fontStyle: "italic",
		animationName: surface,
		animationDuration: "2.5s",
		animationTimingFunction: "ease-out",
		animationDelay: "0.8s",
		animationFillMode: "backwards",
	},
	filter: { position: "absolute", width: 0, height: 0 },
});
