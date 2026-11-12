import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";

const fadeIn = stylex.keyframes({ from: { opacity: 0 } });

/** On the section; `data-ready` (poster decoded, fonts loaded) starts its fades. */
export const heroMarker = stylex.defaultMarker();

export const styles = stylex.create({
	section: {
		position: "relative",
		isolation: "isolate",
		height: "100svh",
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
	text: {
		color: color.paper,
		opacity: 0.85,
		animationName: fadeIn,
		animationDuration: "1.6s",
		animationTimingFunction: "ease-out",
		animationFillMode: "backwards",
		animationPlayState: {
			default: "paused",
			[stylex.when.ancestor("[data-ready]")]: "running",
			"@media (scripting: none)": "running",
		},
	},
	title: {
		marginTop: "0.1em",
		fontSize: "min(calc(19vw * var(--size)), calc(22svh * var(--size)))",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		animationDelay: "0.3s",
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		lineHeight: { default: "calc(2 / 1.5)", "@media (min-width: 48rem)": "calc(2.25 / 1.875)" },
		fontStyle: "italic",
		animationDelay: "1.3s",
	},
});
