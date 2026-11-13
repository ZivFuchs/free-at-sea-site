import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { tone } from "./palette.stylex";

export const styles = stylex.create({
	/** Tall, so the pinned stage has scroll to zoom through. Reduced motion gets one still screen. */
	section: {
		position: "relative",
		height: { default: "260svh", "@media (prefers-reduced-motion: reduce)": "100svh" },
		minHeight: "32rem",
	},
	stage: {
		position: "sticky",
		top: 0,
		height: "100svh",
		minHeight: "32rem",
		overflow: "hidden",
		isolation: "isolate",
		backgroundColor: color.ink,
	},
	/** Paper, screened over the footage: its black type becomes the window. */
	ground: {
		position: "absolute",
		inset: 0,
		display: "grid",
		placeItems: "center",
		backgroundColor: tone.blank,
		color: tone.window,
		mixBlendMode: "screen",
		opacity: "var(--ground, 1)",
	},
	zoom: {
		position: "relative",
		textAlign: "center",
		transformOrigin: "var(--eye-x, 50%) var(--eye-y, 50%)",
		scale: "var(--zoom, 1)",
	},
	title: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "min(31vw, 21svh)", "@media (min-width: 48rem)": "min(13.6vw, 30svh)" },
		lineHeight: 0.86,
		textTransform: "uppercase",
		whiteSpace: "nowrap",
	},
	word: { display: { default: "block", "@media (min-width: 48rem)": "inline" } },
	tagline: {
		marginTop: { default: "1.25rem", "@media (min-width: 48rem)": "0.75rem" },
		fontSize: { default: "1.25rem", "@media (min-width: 48rem)": "1.625rem" },
		fontStyle: "italic",
		opacity: "var(--lede, 1)",
	},
	/** The tagline again, once you are through the letters and in the footage. */
	after: {
		position: "absolute",
		insetInline: 0,
		bottom: "22%",
		textAlign: "center",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		fontStyle: "italic",
		color: color.paper,
		opacity: "var(--after, 0)",
	},
	/** Where the header wordmark should be fully faded in: roughly as the letters open up. */
	anchor: { position: "absolute", top: "115svh", height: "1px", width: "1px" },
});
