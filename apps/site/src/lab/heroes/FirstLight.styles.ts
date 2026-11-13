import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { tone } from "./palette.stylex";

export const styles = stylex.create({
	/** Without WebGL: a plain night sea. */
	section: {
		backgroundImage: `linear-gradient(to bottom, ${color.ocean} calc(var(--horizon) * 100%), ${color.ink} calc(var(--horizon) * 100%), ${color.ocean})`,
	},
	sky: {
		position: "absolute",
		insetInline: 0,
		top: 0,
		height: "calc(var(--horizon) * 100%)",
		overflow: "hidden",
	},
	/** Standing on the horizon, in front of the disc: a silhouette by day, moonlit at night (`--title`). */
	title: {
		position: "absolute",
		insetInline: 0,
		bottom: 0,
		translate: "0 0.085em",
		textAlign: "center",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(13.3vw, 9.5svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		color: `var(--title, ${color.paper})`,
	},
	tagline: {
		position: "absolute",
		insetInline: 0,
		top: "calc(var(--horizon) * 100% + 1.5rem)",
		textAlign: "center",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		fontStyle: "italic",
		color: color.paper,
		textShadow: `0 0 1.25rem ${tone.shade}, 0 0 0.25rem ${tone.shade}`,
	},
});
