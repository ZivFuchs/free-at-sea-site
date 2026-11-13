import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const SHADE = "rgb(0 6 16 / 0.55)";

const eyebrow = {
	fontFamily: font.sans,
	fontSize: "0.75rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	/** Shown alone when WebGL is missing: still water, lighter where the surface catches the sky. */
	water: {
		position: "fixed",
		inset: 0,
		backgroundImage: `radial-gradient(120% 80% at 60% 35%, oklch(0.3 0.06 240), ${color.ocean} 70%)`,
	},
	/** Positioned, so it paints over the fixed water that precedes it. */
	page: { position: "relative" },
	canvas: {
		display: "block",
		width: "100%",
		height: "100%",
		opacity: { default: 0, ":is([data-on])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "1.5s",
	},
	hero: {
		position: "relative",
		display: "grid",
		gridTemplateRows: "1fr auto",
		height: "100svh",
		minHeight: "32rem",
		textAlign: "center",
		color: color.paper,
	},
	copy: { alignSelf: "center", paddingBottom: "12svh" },
	title: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "min(13.3vw, 15svh)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textTransform: "uppercase",
		textShadow: `0 0.12em 0.5em ${SHADE}`,
	},
	tagline: {
		marginTop: "1rem",
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.875rem" },
		fontStyle: "italic",
		opacity: 0.85,
	},
	sounding: {
		...eyebrow,
		display: "grid",
		justifyItems: "center",
		gap: "0.75rem",
		paddingBottom: "3.5rem",
		color: color.paper65,
	},
	plumb: {
		width: "1px",
		height: "2.5rem",
		backgroundImage: `linear-gradient(${color.paper50}, transparent)`,
	},
	section: { paddingBlock: { default: "3rem", "@media (min-width: 48rem)": "6rem" } },
	/** A raft: glass over the water, its shadow falling away into the depth. */
	raft: {
		maxWidth: "44rem",
		padding: { default: "2rem 1.5rem", "@media (min-width: 48rem)": "3.5rem" },
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: color.paper12,
		borderRadius: "0.25rem",
		backgroundColor: "color-mix(in oklab, var(--app-ocean) 62%, transparent)",
		backdropFilter: "blur(10px)",
		boxShadow: `1.5rem 3rem 5rem -1rem ${SHADE}, 0.25rem 0.5rem 1rem -0.25rem ${SHADE}`,
		color: color.paper,
	},
	eyebrow: { ...eyebrow, color: color.aqua },
	heading: {
		marginTop: "1rem",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "2rem", "@media (min-width: 48rem)": "3rem" },
		lineHeight: 1.08,
	},
	body: {
		marginTop: "1.5rem",
		fontSize: { default: "1.125rem", "@media (min-width: 48rem)": "1.25rem" },
		lineHeight: 1.55,
		color: color.paper85,
	},
	/** Open water: nothing here but what comes up. */
	open: {
		display: "grid",
		alignItems: "end",
		justifyItems: { default: "start", "@media (min-width: 48rem)": "end" },
		minHeight: { default: "85svh", "@media (min-width: 48rem)": "95svh" },
		paddingBlock: "4rem",
	},
	note: {
		maxWidth: "22rem",
		fontSize: "1.125rem",
		lineHeight: 1.5,
		fontStyle: "italic",
		color: color.paper85,
		textShadow: `0 0.1em 0.8em ${SHADE}`,
	},
	noteLabel: { ...eyebrow, marginBottom: "0.75rem", fontStyle: "normal", color: color.paper65 },
});
