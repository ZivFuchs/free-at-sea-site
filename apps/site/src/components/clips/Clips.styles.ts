import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** On each tile so its poster, title and veil react to hover/focus. */
export const tileMarker = stylex.defaultMarker();

/** Ink taken down a stop: the screening room, and the card behind a clip with no poster. */
const ABYSS = "oklch(0.13 0.025 240)";
const INK_0 = "color-mix(in oklab, var(--app-ink) 0%, transparent)";
const INK_45 = "color-mix(in oklab, var(--app-ink) 45%, transparent)";
const INK_80 = "color-mix(in oklab, var(--app-ink) 80%, transparent)";
const PAPER_30 = "color-mix(in oklab, var(--app-paper) 30%, transparent)";

const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

const rise = stylex.keyframes({ from: { opacity: 0 } });
const settle = stylex.keyframes({ from: { opacity: 0, scale: "0.985" } });

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	lineHeight: 1.4,
	letterSpacing: "0.16em",
	textTransform: "uppercase",
	fontVariantNumeric: "tabular-nums",
} as const;

const button = {
	appearance: "none",
	margin: 0,
	padding: 0,
	borderWidth: "1px",
	borderStyle: "solid",
	borderRadius: "999px",
	backgroundColor: { default: "transparent", ":hover": color.paper },
	borderColor: { default: PAPER_30, ":hover": color.paper },
	color: { default: color.paper, ":hover": color.ink },
	cursor: "pointer",
	transitionProperty: "background-color, border-color, color",
	transitionDuration: "200ms",
	outlineWidth: { default: 0, ":focus-visible": "2px" },
	outlineStyle: "solid",
	outlineColor: color.paper,
	outlineOffset: "3px",
} as const;

export const styles = stylex.create({
	section: {
		paddingBlock: { default: "4rem", "@media (min-width: 48rem)": "7rem" },
	},
	heading: {
		marginBottom: { default: "1.25rem", "@media (min-width: 48rem)": "2rem" },
		fontFamily: font.display,
		fontSize: { default: "3rem", "@media (min-width: 48rem)": "4.5rem" },
		lineHeight: 0.95,
		textTransform: "uppercase",
	},

	/** Sizes the row unit of the grid inside it. */
	sheet: { containerType: "inline-size" },
	grid: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(2, minmax(0, 1fr))",
			"@media (min-width: 48rem)": "repeat(12, minmax(0, 1fr))",
		},
		gridAutoRows: { default: "auto", "@media (min-width: 48rem)": "9.5cqw" },
		gridAutoFlow: "dense",
		gap: { default: "0.25rem", "@media (min-width: 48rem)": "0.375rem" },
		margin: 0,
		padding: 0,
		listStyleType: "none",
	},
	tile: {
		position: "relative",
		containerType: "inline-size",
	},
	link: {
		position: "absolute",
		inset: 0,
		display: "flex",
		alignItems: "flex-end",
		overflow: "hidden",
		isolation: "isolate",
		backgroundColor: color.ink,
		backgroundImage: `linear-gradient(in oklab 160deg, ${color.ink}, ${ABYSS})`,
		color: color.paper,
		textDecoration: "none",
		outlineWidth: { default: 0, ":focus-visible": "2px" },
		outlineStyle: "solid",
		outlineColor: color.accent,
		outlineOffset: "3px",
	},
	poster: {
		position: "absolute",
		inset: 0,
		zIndex: -1,
		width: "100%",
		height: "100%",
		objectFit: "cover",
		scale: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)": {
				default: null,
				[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: "1.04",
			},
		},
		transitionProperty: "scale",
		transitionDuration: "1200ms",
		transitionTimingFunction: EASE,
	},
	scrim: {
		position: "absolute",
		inset: 0,
		zIndex: -1,
		backgroundImage: `linear-gradient(in oklab to top, ${INK_80}, ${INK_45} 22%, ${INK_0} 58%)`,
		opacity: {
			default: 1,
			"@media (hover: hover)": {
				default: 0.55,
				[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: 1,
			},
		},
		transitionProperty: "opacity",
		transitionDuration: "500ms",
		transitionTimingFunction: EASE,
	},
	/** Falls over every tile but the one pointed at. */
	veil: {
		position: "absolute",
		inset: 0,
		backgroundColor: color.ink,
		pointerEvents: "none",
		opacity: {
			default: 0,
			"@media (hover: hover)": {
				default: 0,
				[stylex.when.ancestor(":is(ul:has(a:hover) > li:not(:hover))")]: 0.45,
			},
		},
		transitionProperty: "opacity",
		transitionDuration: "500ms",
		transitionTimingFunction: EASE,
	},
	legend: {
		display: "flex",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: "0.75rem",
		width: "100%",
		padding: "clamp(0.75rem, 4.5cqw, 1.75rem)",
	},
	words: { minWidth: 0, display: "flex", flexDirection: "column", gap: "0.375rem" },
	index: { ...label, color: color.paper70 },
	clipTitle: { display: "block", overflow: "hidden", paddingBottom: "0.08em" },
	titleText: {
		display: "block",
		fontFamily: font.display,
		fontSize: "clamp(1.125rem, 5.5cqw, 2.5rem)",
		lineHeight: 1.02,
		textTransform: "uppercase",
		textWrap: "balance",
		opacity: {
			default: 1,
			"@media (hover: hover)": {
				default: 0,
				[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: 1,
			},
		},
		translate: {
			default: null,
			"@media (hover: hover) and (prefers-reduced-motion: no-preference)": {
				default: "0 105%",
				[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: "0 0",
			},
		},
		transitionProperty: "opacity, translate",
		transitionDuration: "500ms",
		transitionTimingFunction: EASE,
	},
	/** No poster: the title is the picture. */
	titleShown: { opacity: 1, translate: "0 0" },
	play: {
		flexShrink: 0,
		display: "grid",
		placeItems: "center",
		width: "clamp(2rem, 9cqw, 2.75rem)",
		aspectRatio: "1",
		borderRadius: "50%",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: {
			default: color.paper50,
			[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: color.paper,
		},
		backgroundColor: {
			default: "transparent",
			[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: color.paper,
		},
		color: {
			default: color.paper,
			[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: color.ink,
		},
		transitionProperty: "background-color, border-color, color",
		transitionDuration: "300ms",
	},
	triangle: { width: "30%", marginLeft: "8%" },

	/** Phones in portrait get the player turned sideways (iOS can't lock orientation); sizes inside use `cq*` units. */
	dialog: {
		position: "fixed",
		inset: {
			default: 0,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem)":
				"0 auto auto 100%",
		},
		width: {
			default: "100%",
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem)": "100dvh",
		},
		height: {
			default: "100%",
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem)": "100dvw",
		},
		rotate: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem)": "90deg",
		},
		transformOrigin: "top left",
		containerType: "size",
		maxWidth: "none",
		maxHeight: "none",
		margin: 0,
		padding: 0,
		borderWidth: 0,
		overflowX: "hidden",
		overflowY: {
			default: "auto",
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"hidden",
		},
		overscrollBehavior: "contain",
		backgroundColor: ABYSS,
		color: color.paper,
		animationName: {
			default: null,
			":is([open])": { default: rise, "@media (prefers-reduced-motion: reduce)": "none" },
		},
		animationDuration: "350ms",
		animationTimingFunction: "ease-out",
		"::backdrop": { backgroundColor: ABYSS },
	},
	room: {
		display: {
			default: "grid",
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"block",
		},
		gridTemplateRows: "auto minmax(0, 1fr)",
		position: "relative",
		minHeight: "100%",
		height: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"100%",
		},
	},
	bar: {
		position: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"absolute",
		},
		insetBlockStart: 0,
		insetInlineEnd: 0,
		zIndex: 1,
		pointerEvents: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"none",
		},
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "1rem",
		paddingBlock: { default: "1rem", "@media (min-width: 48rem)": "1.5rem" },
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "2.5rem" },
	},
	/** Landscape phones: controls hidden until the script sets `data-chrome` (tap, hover, focus). */
	chrome: {
		opacity: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				{ default: 0, ":is([data-chrome])": 1 },
		},
		transitionProperty: "opacity",
		transitionDuration: "300ms",
	},
	chromeHit: {
		pointerEvents: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				{ default: "none", ":is([data-chrome])": "auto" },
		},
	},
	kicker: {
		...label,
		color: color.paper70,
		display: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"none",
		},
	},
	close: {
		...button,
		...label,
		display: "inline-flex",
		alignItems: "center",
		gap: "0.625rem",
		paddingBlock: "0.625rem",
		paddingInline: "1rem",
	},
	cross: { width: "0.625rem", height: "0.625rem" },
	stage: {
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: "center",
		paddingBottom: { default: "2rem", "@media (min-width: 48rem)": "2.5rem" },
		paddingInline: { default: 0, "@media (min-width: 48rem)": "2.5rem" },
	},
	/** As wide as the height allows a 16:9 frame plus its caption, never narrower than a phone. Landscape phones: fills the screen. */
	column: {
		position: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"absolute",
		},
		inset: 0,
		width: {
			default: "max(min(100%, 22rem), min(100%, calc((100cqh - 15rem) * 16 / 9)))",
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"100%",
		},
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"center",
		},
		gap: { default: "1.25rem", "@media (min-width: 48rem)": "1.5rem" },
	},
	frame: {
		position: "relative",
		flexShrink: 0,
		width: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"min(100cqw, calc(100cqh * 16 / 9))",
		},
		aspectRatio: "16 / 9",
		overflow: "hidden",
		backgroundColor: "black",
		animationName: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)": settle,
		},
		animationDuration: "600ms",
		animationTimingFunction: EASE,
	},
	fill: { position: "absolute", inset: 0, width: "100%", height: "100%", borderWidth: 0 },
	still: { objectFit: "cover", opacity: 0.6 },
	info: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: "1.5rem",
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": 0 },
		position: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"absolute",
		},
		inset: 0,
		pointerEvents: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"none",
		},
	},
	text: {
		minWidth: 0,
		display: {
			default: "flex",
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"none",
		},
		flexDirection: "column",
		gap: "0.5rem",
	},
	position: { ...label, color: color.paper50 },
	nowTitle: {
		fontFamily: font.display,
		fontSize: { default: "1.75rem", "@media (min-width: 48rem)": "2.5rem" },
		lineHeight: 1.02,
		textTransform: "uppercase",
		textWrap: "balance",
		color: color.paper,
	},
	nowCaption: {
		maxWidth: "38rem",
		color: color.paper70,
		fontSize: "0.9375rem",
		lineHeight: 1.55,
		":empty": { display: "none" },
	},
	steps: {
		flexShrink: 0,
		display: "flex",
		gap: "0.5rem",
		position: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"absolute",
		},
		inset: 0,
		alignItems: "center",
		justifyContent: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"space-between",
		},
		paddingInline: {
			default: null,
			"@media (pointer: coarse) and (orientation: portrait) and (max-width: 47.99rem), (orientation: landscape) and (max-height: 32rem)":
				"1rem",
		},
	},
	step: { ...button, display: "grid", placeItems: "center", width: "2.75rem", height: "2.75rem" },
	arrow: { width: "1rem", height: "1rem" },
});

export const cols = stylex.create({
	3: { gridColumnEnd: { default: null, "@media (min-width: 48rem)": "span 3" } },
	4: { gridColumnEnd: { default: null, "@media (min-width: 48rem)": "span 4" } },
	5: { gridColumnEnd: { default: null, "@media (min-width: 48rem)": "span 5" } },
	6: { gridColumnEnd: { default: null, "@media (min-width: 48rem)": "span 6" } },
	7: { gridColumnEnd: { default: null, "@media (min-width: 48rem)": "span 7" } },
	8: { gridColumnEnd: { default: null, "@media (min-width: 48rem)": "span 8" } },
	12: { gridColumnEnd: { default: null, "@media (min-width: 48rem)": "span 12" } },
});

export const rows = stylex.create({
	2: { gridRowEnd: { default: null, "@media (min-width: 48rem)": "span 2" } },
	3: { gridRowEnd: { default: null, "@media (min-width: 48rem)": "span 3" } },
	4: { gridRowEnd: { default: null, "@media (min-width: 48rem)": "span 4" } },
	5: { gridRowEnd: { default: null, "@media (min-width: 48rem)": "span 5" } },
	6: { gridRowEnd: { default: null, "@media (min-width: 48rem)": "span 6" } },
});

/** Phone spans sit on `gridColumnStart` so they don't collide with the desktop `gridColumnEnd` spans. */
export const phone = stylex.create({
	lead: {
		gridColumnStart: { default: "span 2", "@media (min-width: 48rem)": "auto" },
		aspectRatio: { default: "16 / 9", "@media (min-width: 48rem)": "auto" },
	},
	half: {
		gridColumnStart: { default: "span 1", "@media (min-width: 48rem)": "auto" },
		aspectRatio: { default: "4 / 5", "@media (min-width: 48rem)": "auto" },
	},
	wide: {
		gridColumnStart: { default: "span 2", "@media (min-width: 48rem)": "auto" },
		aspectRatio: { default: "2 / 1", "@media (min-width: 48rem)": "auto" },
	},
});
