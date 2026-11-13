import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** Shared by the variants that keep the homepage hero's composition: title hung from the horizon. */
export const hero = stylex.create({
	section: {
		position: "relative",
		isolation: "isolate",
		height: "100svh",
		minHeight: "32rem",
		overflow: "hidden",
		backgroundColor: color.ink,
	},
	fill: { position: "absolute", inset: 0, width: "100%", height: "100%" },
	cover: { objectFit: "cover" },
	copy: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100%)",
		textAlign: "center",
	},
	title: {
		marginTop: "0.1em",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		color: color.paper,
		opacity: 0.85,
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		lineHeight: { default: "calc(2 / 1.5)", "@media (min-width: 48rem)": "calc(2.25 / 1.875)" },
		fontStyle: "italic",
		color: color.paper,
		opacity: 0.85,
	},
	video: {
		opacity: { default: 0, ":is([data-playing])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.5s",
		transitionTimingFunction: "ease-out",
	},
	/** Canvases fade in over their still once the first frame is drawn. */
	canvas: {
		display: "block",
		opacity: { default: 0, ":is([data-ready])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.2s",
		transitionTimingFunction: "ease-out",
	},
});
