import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** `--solid`: 0 transparent → 1 abyss; transitions once scrolling starts on overlay pages. */
const solid = (from: string, to: string) =>
	`color-mix(in oklab, ${to} calc(var(--solid) * 100%), ${from})`;
/** Text colours swap on `--flip`, a quicker 0 → 1 timed to when the bar behind turns dark, so contrast holds. */
const flip = (from: string, to: string) =>
	`color-mix(in oklab, ${to} calc(var(--flip) * 100%), ${from})`;

/** Text colour over the transparent top of an overlay page: paper, or `--top` (ink, set over a light hero). */
const top = (alpha: number) =>
	`color-mix(in oklab, var(--top, ${color.paper}) ${alpha}%, transparent)`;

const focus = {
	outline: { default: "none", ":focus-visible": "1px solid currentColor" },
	outlineOffset: "6px",
} as const;

export const styles = stylex.create({
	header: {
		position: "sticky",
		top: 0,
		zIndex: 40,
		color: flip(top(100), color.paper),
		backgroundColor: solid("transparent", color.abyss90),
		backdropFilter: "blur(calc(var(--solid) * 12px))",
		transitionProperty: "color",
		transitionDuration: "200ms",
	},
	/** `[data-solid]` set once scrolled. `--flip` runs over the middle of `--solid`'s fade, either way. */
	overlay: {
		marginBottom: "-4.5rem",
		"--solid": { default: 0, ":is([data-solid])": 1 },
		"--flip": { default: 0, ":is([data-solid])": 1 },
		transitionProperty: "color, --solid, --flip",
		transitionDuration: "200ms, 400ms, 100ms",
		transitionDelay: { default: "0s, 0s, 200ms", ":is([data-solid])": "0s, 0s, 100ms" },
		transitionTimingFunction: "ease",
	},
	bar: {
		display: "grid",
		gridTemplateColumns: "1fr auto 1fr",
		alignItems: "center",
		height: "4.5rem",
	},
	wordmark: {
		...focus,
		gridArea: "1 / 2",
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.375rem", "@media (min-width: 48rem)": "1.625rem" },
		letterSpacing: "0.01em",
		whiteSpace: "nowrap",
		position: "relative",
		display: "grid",
		placeItems: "center",
	},
	/** `--mark` (0–1): the wordmark fades in as the hero title scrolls up to it. */
	markText: { gridArea: "1 / 1", opacity: "var(--mark, 1)" },
	side: {
		display: { default: "none", "@media (min-width: 48rem)": "flex" },
		gap: "2.25rem",
	},
	left: { gridArea: "1 / 1", justifySelf: "start" },
	right: { gridArea: "1 / 3", justifySelf: "end" },
	link: {
		...focus,
		position: "relative",
		fontFamily: font.sans,
		fontSize: "0.8125rem",
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: {
			default: flip(top(75), color.paper65),
			":hover": "inherit",
		},
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	linkCurrent: { color: "inherit" },
	toggle: {
		...focus,
		gridArea: "1 / 3",
		justifySelf: "end",
		marginRight: "-0.5rem",
		width: "2.5rem",
		height: "2.5rem",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
	},
	open: {
		display: { default: "flex", "@media (min-width: 48rem)": "none" },
		flexDirection: "column",
		gap: "0.375rem",
	},
	close: { display: "grid", placeItems: "center" },
	line: { width: "1.25rem", height: "1px", backgroundColor: "currentColor" },
	lineShort: { width: "0.75rem", alignSelf: "flex-end", marginRight: "0.625rem" },
	cross: { gridArea: "1 / 1", rotate: "45deg" },
	crossAlt: { rotate: "-45deg" },
	track: {
		position: "absolute",
		insetInline: 0,
		bottom: 0,
		height: "1px",
		backgroundColor: solid("transparent", color.paper12),
		pointerEvents: "none",
	},
	tide: {
		position: "absolute",
		inset: 0,
		backgroundColor: solid("transparent", color.aqua),
		transformOrigin: "left",
		scale: "var(--tide, 0) 1",
	},
	menu: {
		display: { default: null, "@media (min-width: 48rem)": "none" },
		inset: 0,
		margin: 0,
		width: "100%",
		height: "100%",
		maxWidth: "none",
		maxHeight: "none",
		padding: 0,
		borderWidth: 0,
		backgroundColor: color.paper,
		color: color.ink,
	},
	menuList: {
		marginTop: "4rem",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "1.75rem",
	},
	menuLink: {
		...focus,
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: "2rem",
		color: { default: color.ink, ":hover": color.accent },
	},
	menuLinkCurrent: { color: color.accent },
});
