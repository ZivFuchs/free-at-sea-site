import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const caps = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;
const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "6px",
} as const;

export const neighbourMarker = stylex.defaultMarker();

export const styles = stylex.create({
	page: {
		minHeight: "100svh",
		paddingBlock: { default: "5.5rem 4rem", "@media (min-width: 48rem)": "6rem 5rem" },
		color: color.paper,
	},
	back: {
		...caps,
		...focus,
		display: "inline-block",
		color: { default: color.paper65, ":hover": color.paper },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	/** The shared element: the poster that travelled here from the strip. Full bleed on phones. */
	frame: {
		position: "relative",
		viewTransitionName: "reel-poster",
		aspectRatio: "16 / 9",
		marginTop: "1rem",
		marginInline: { default: "-1.5rem", "@media (min-width: 48rem)": "auto" },
		width: {
			default: "auto",
			"@media (min-width: 48rem)": "min(100%, calc((100svh - 17rem) * 16 / 9))",
		},
		overflow: "hidden",
		backgroundColor: color.ink,
	},
	fill: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		objectFit: "cover",
		borderWidth: 0,
	},
	play: {
		...focus,
		outlineOffset: "-8px",
		position: "absolute",
		inset: 0,
		display: "grid",
		placeItems: "center",
		width: "100%",
		cursor: "pointer",
		color: color.paper,
		backgroundImage:
			"radial-gradient(color-mix(in oklab, var(--app-ink) 35%, transparent), transparent 60%)",
	},
	disc: {
		display: "grid",
		placeItems: "center",
		width: { default: "4rem", "@media (min-width: 48rem)": "5.5rem" },
		aspectRatio: "1",
		borderRadius: "50%",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper70,
		backgroundColor: {
			default: "color-mix(in oklab, var(--app-ink) 30%, transparent)",
			[stylex.when.ancestor(":hover")]: color.paper,
		},
		color: { default: color.paper, [stylex.when.ancestor(":hover")]: color.ink },
		backdropFilter: "blur(6px)",
		transitionProperty: "background-color, color",
		transitionDuration: "200ms",
	},
	triangle: { width: "0.875rem", marginLeft: "0.1875rem" },
	info: {
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 64rem)": "1fr auto" },
		alignItems: "start",
		gap: { default: "2.5rem", "@media (min-width: 64rem)": "4rem" },
		marginTop: { default: "1.5rem", "@media (min-width: 48rem)": "2rem" },
	},
	kicker: { ...caps, color: color.aqua, fontVariantNumeric: "tabular-nums" },
	title: {
		width: "fit-content",
		viewTransitionName: "reel-title",
		marginTop: "0.5rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2rem", "@media (min-width: 48rem)": "3.25rem" },
		lineHeight: 1.05,
	},
	body: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		gap: "1rem",
		marginTop: "1rem",
		maxWidth: "38rem",
		fontSize: "1.125rem",
		lineHeight: 1.5,
		color: color.paper70,
	},
	neighbours: {
		display: "grid",
		gridTemplateColumns: { default: "1fr 1fr", "@media (min-width: 64rem)": "16rem" },
		gap: { default: "1rem", "@media (min-width: 64rem)": "1.25rem" },
	},
	neighbour: {
		...focus,
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 64rem)": "6.5rem 1fr" },
		alignItems: "center",
		gap: "0.75rem",
	},
	thumb: {
		width: "100%",
		aspectRatio: "16 / 9",
		objectFit: "cover",
		backgroundColor: color.ink,
		opacity: { default: 0.7, [stylex.when.ancestor(":hover")]: 1 },
		transitionProperty: "opacity",
		transitionDuration: "200ms",
	},
	way: { ...caps, fontSize: "0.6875rem", color: color.paper50 },
	name: {
		display: "block",
		marginTop: "0.25rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "1rem",
		lineHeight: 1.2,
	},
});
