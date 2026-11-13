import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import { night } from "./palette.stylex";

/** On the page root; `data-lit` once the title has begun to write, `data-flat` without WebGL. */
export const rootMarker = stylex.defaultMarker();

const rise = stylex.keyframes({ from: { opacity: 0 } });

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.22em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	root: {
		position: "relative",
		display: "flex",
		flexDirection: "column",
		minHeight: "100dvh",
		backgroundColor: night.deep,
		backgroundImage: `linear-gradient(${night.water}, ${night.deep} 60rem)`,
		color: color.paper,
	},
	main: { flex: 1 },
	/** Light only: black is transparent under `screen`, so sparks cross everything without hiding it. */
	canvas: {
		position: "fixed",
		top: 0,
		left: 0,
		zIndex: 45,
		width: "100%",
		height: "100lvh",
		pointerEvents: "none",
		mixBlendMode: "screen",
		display: { default: "block", ":is([data-flat] *)": "none" },
	},
	hero: {
		position: "relative",
		display: "grid",
		alignContent: "center",
		justifyItems: "center",
		height: "100svh",
		minHeight: "32rem",
		paddingInline: "1rem",
		textAlign: "center",
		touchAction: "pan-y",
	},
	title: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(13.3vw, 15.4svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
	},
	/** The letters come up behind the sparks that write them, then hold as embers. */
	ink: {
		color: night.ember,
		textShadow: `0 0 0.5em ${night.glow30}, 0 0 1.4em ${night.glow12}`,
		opacity: {
			default: 0,
			[stylex.when.ancestor("[data-lit]")]: 0.82,
			"@media (scripting: none)": 0.82,
		},
		transitionProperty: "opacity",
		transitionDuration: { default: "3.2s", "@media (prefers-reduced-motion: reduce)": "0s" },
		transitionDelay: { default: "0.9s", "@media (prefers-reduced-motion: reduce)": "0s" },
		transitionTimingFunction: "ease-out",
	},
	tagline: {
		marginTop: "1.25rem",
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.75rem" },
		fontStyle: "italic",
		color: color.paper70,
	},
	late: {
		animationName: { default: rise, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "2.4s",
		animationDelay: "3s",
		animationTimingFunction: "ease-out",
		animationFillMode: "backwards",
		animationPlayState: {
			default: "paused",
			[stylex.when.ancestor("[data-lit]")]: "running",
			"@media (scripting: none)": "running",
		},
	},
	hint: {
		...eyebrow,
		position: "absolute",
		insetInline: 0,
		bottom: { default: "4.5rem", "@media (min-width: 48rem)": "3rem" },
		color: color.paper45,
		animationDelay: "4.2s",
	},
	touchOnly: { display: { default: "none", "@media (hover: none)": "inline" } },
	hoverOnly: { display: { default: "inline", "@media (hover: none)": "none" } },
	passage: {
		paddingBlock: { default: "5rem 3rem", "@media (min-width: 48rem)": "9rem 5rem" },
	},
	columns: {
		display: "grid",
		gridTemplateColumns: { default: "1fr", "@media (min-width: 64rem)": "1fr 1fr" },
		columnGap: "5rem",
		rowGap: "2rem",
		alignItems: "end",
	},
	eyebrow: { ...eyebrow, color: night.glow },
	lede: {
		marginTop: "1.25rem",
		maxWidth: "20ch",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2.25rem", "@media (min-width: 48rem)": "3.5rem" },
		lineHeight: 1.05,
	},
	body: {
		maxWidth: "34rem",
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.55,
		color: color.paper70,
	},
	gap: { marginTop: "1.25rem" },
});
