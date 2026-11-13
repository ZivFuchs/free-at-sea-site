import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";
import type { Material, Shade } from "./iso";
import { day, night } from "./palette.stylex";

/** On each cell button: its drawing reacts to hover, focus and `data-full`. */
export const cellMarker = stylex.defaultMarker();

const spin = stylex.keyframes({ to: { rotate: "360deg" } });

const label = {
	fontFamily: font.sans,
	fontSize: "0.6875rem",
	letterSpacing: "0.14em",
	textTransform: "uppercase",
} as const;

const focus = {
	outline: { default: "none", ":focus-visible": `1px solid ${color.aqua}` },
	outlineOffset: "3px",
} as const;

export const styles = stylex.create({
	/** Materials live here as custom properties, so one attribute turns day to night. */
	builder: {
		"--m-hull": { default: day.hull, ":is([data-night])": night.hull },
		"--m-wall": { default: day.wall, ":is([data-night])": night.wall },
		"--m-roof": { default: day.roof, ":is([data-night])": night.roof },
		"--m-deck": { default: day.deck, ":is([data-night])": night.deck },
		"--m-green": { default: day.green, ":is([data-night])": night.green },
		"--m-solar": { default: day.solar, ":is([data-night])": night.solar },
		"--m-glass": { default: day.glass, ":is([data-night])": night.glass },
		"--m-metal": { default: day.metal, ":is([data-night])": night.metal },
		"--m-lamp": { default: day.lamp, ":is([data-night])": night.lamp },
		"--m-shade": { default: day.shade, ":is([data-night])": night.shade },
		"--m-glow": { default: day.glow, ":is([data-night])": night.glow },
		"--m-night": { default: 0, ":is([data-night])": 1 },
		display: "grid",
		gridTemplateColumns: {
			default: "minmax(0, 1fr)",
			"@media (min-width: 64rem)": "minmax(0, 22rem) minmax(0, 1fr)",
		},
		gridTemplateAreas: {
			default: '"stage" "tools"',
			"@media (min-width: 64rem)": '"tools stage"',
		},
		alignItems: "center",
		columnGap: "3rem",
		rowGap: "1.25rem",
	},
	stage: {
		gridArea: "stage",
		position: "relative",
		containerType: "inline-size",
		marginInline: { default: "-1.5rem", "@media (min-width: 48rem)": 0 },
		overflow: "hidden",
		backgroundImage:
			"radial-gradient(58% 52% at 50% 56%, color-mix(in oklab, var(--m-glow) 55%, transparent), transparent)",
		maskImage: "radial-gradient(ellipse closest-side, black 90%, transparent)",
		touchAction: "manipulation",
	},
	/** `1em` is one hex radius: every position, drawing and wave height below is in em. */
	sea: {
		position: "relative",
		height: "8.6em",
		fontSize: "min(8.5cqw, 4.25rem)",
	},
	cell: {
		outline: "none",
		position: "absolute",
		left: "calc(50% + var(--x) * 1em)",
		top: "calc(57% + var(--y) * 1em)",
		width: "2em",
		height: "0.9em",
		translate: "-50% -50%",
		fontSize: "inherit",
		cursor: "pointer",
		pointerEvents: "none",
		WebkitTapHighlightColor: "transparent",
	},
	water: { opacity: "var(--fade)" },
	float: { position: "absolute", inset: 0, display: "block", willChange: "transform" },
	art: {
		position: "absolute",
		left: "calc(50% - 1.1em)",
		top: "calc(50% - 2.05em)",
		width: "2.2em",
		height: "2.85em",
		overflow: "visible",
	},
	/** The cell's outline at the waterline, and its whole hit area. */
	ring: {
		pointerEvents: "all",
		fill: {
			default: "transparent",
			[stylex.when.ancestor(":hover")]: color.paper12,
			[stylex.when.ancestor(":is([data-full])")]: "transparent",
		},
		stroke: {
			default: color.paper12,
			[stylex.when.ancestor(":hover")]: color.paper45,
			[stylex.when.ancestor(":focus-visible")]: color.aqua,
		},
		strokeWidth: { default: 0.018, [stylex.when.ancestor(":focus-visible")]: 0.05 },
		strokeLinejoin: "round",
		transitionProperty: "stroke, fill",
		transitionDuration: "200ms",
	},
	swell: { fill: "none", stroke: color.paper12, strokeWidth: 0.018 },
	plus: {
		pointerEvents: "none",
		fill: "none",
		stroke: color.paper70,
		strokeWidth: 0.03,
		strokeLinecap: "round",
		opacity: {
			default: 0,
			[stylex.when.ancestor(":hover")]: 1,
			[stylex.when.ancestor(":focus-visible")]: 1,
			[stylex.when.ancestor(":is([data-full])")]: 0,
		},
		transitionProperty: "opacity",
		transitionDuration: "200ms",
	},
	model: { pointerEvents: "auto" },
	face: { transitionProperty: "fill, stroke, color", transitionDuration: "700ms" },
	line: { fill: "none", stroke: "currentColor", strokeLinecap: "round" },
	cast: { fill: "color-mix(in oklab, var(--m-shade) 26%, transparent)" },
	halo: {
		fill: "url(#modular-halo)",
		opacity: "var(--m-night)",
		pointerEvents: "none",
		transitionProperty: "opacity",
		transitionDuration: "700ms",
	},
	spin: {
		animationName: { default: spin, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "7s",
		animationTimingFunction: "linear",
		animationIterationCount: "infinite",
	},
	defs: { position: "absolute", width: 0, height: 0, color: night.light },

	tools: {
		gridArea: "tools",
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr)",
		rowGap: "1.5rem",
		minWidth: 0,
	},
	fieldset: { minWidth: 0 },
	legend: { ...label, color: color.paper65, marginBottom: "0.625rem" },
	palette: {
		display: { default: "flex", "@media (min-width: 64rem)": "grid" },
		gridTemplateColumns: "1fr 1fr",
		gap: "0.375rem",
		marginInline: { default: "-1.5rem", "@media (min-width: 48rem)": 0 },
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": 0 },
		paddingBlock: "2px",
		overflowX: { default: "auto", "@media (min-width: 64rem)": "visible" },
		scrollbarWidth: "none",
	},
	tool: { position: "relative", flexShrink: 0 },
	radio: {
		position: "absolute",
		inset: 0,
		opacity: 0,
		margin: 0,
		cursor: "pointer",
	},
	chip: {
		display: "flex",
		alignItems: "center",
		gap: "0.375rem",
		height: "3rem",
		paddingInline: "0.375rem 0.875rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderRadius: "0.25rem",
		borderColor: {
			default: color.paper15,
			":is(input:hover + *)": color.paper45,
			":is(input:checked + *)": color.aqua,
		},
		backgroundColor: { default: "transparent", ":is(input:checked + *)": color.paper12 },
		outline: { default: "none", ":is(input:focus-visible + *)": `1px solid ${color.aqua}` },
		outlineOffset: "3px",
		color: { default: color.paper70, ":is(input:checked + *)": color.paper },
		...label,
		whiteSpace: "nowrap",
		transitionProperty: "border-color, background-color, color",
		transitionDuration: "150ms",
		pointerEvents: "none",
	},
	icon: { width: "2.25rem", height: "2.25rem", flexShrink: 0, overflow: "visible" },
	key: { marginLeft: "auto", paddingLeft: "0.5rem", color: color.paper45 },
	keyHidden: { display: { default: "none", "@media (min-width: 64rem)": "inline" } },

	stats: {
		display: "grid",
		gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
		columnGap: "1rem",
		paddingBlock: "1rem",
		borderBlockWidth: "1px",
		borderBlockStyle: "solid",
		borderBlockColor: color.paper15,
	},
	stat: { display: "flex", flexDirection: "column-reverse", gap: "0.25rem" },
	term: { ...label, color: color.paper65 },
	value: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.5rem", "@media (min-width: 48rem)": "1.75rem" },
		lineHeight: 1,
		fontVariantNumeric: "tabular-nums",
		whiteSpace: "nowrap",
	},
	unit: { ...label, marginLeft: "0.25rem", color: color.paper65 },
	actions: { display: "flex", flexWrap: "wrap", columnGap: "1.5rem", rowGap: "0.5rem" },
	action: {
		...focus,
		...label,
		paddingBlock: "0.5rem",
		cursor: { default: "pointer", ":disabled": "default" },
		color: {
			default: color.paper85,
			":is([aria-pressed=true])": color.aqua,
			":hover": color.aqua,
			":disabled": color.paper45,
		},
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	hint: { fontFamily: font.sans, fontSize: "0.8125rem", lineHeight: 1.5, color: color.paper65 },
	hintKeys: { display: { default: "none", "@media (hover: hover)": "inline" } },
	live: {
		position: "absolute",
		width: "1px",
		height: "1px",
		overflow: "hidden",
		clip: "rect(0, 0, 0, 0)",
		whiteSpace: "nowrap",
	},
});

export const material = stylex.create({
	hull: { color: "var(--m-hull)" },
	wall: { color: "var(--m-wall)" },
	roof: { color: "var(--m-roof)" },
	deck: { color: "var(--m-deck)" },
	green: { color: "var(--m-green)" },
	solar: { color: "var(--m-solar)" },
	glass: { color: "var(--m-glass)" },
	metal: { color: "var(--m-metal)" },
	lamp: { color: "var(--m-lamp)" },
}) satisfies Record<Material, unknown>;

const shaded = (percent: number) => `color-mix(in oklab, var(--m-shade) ${percent}%, currentColor)`;

export const shade = stylex.create({
	0: { fill: "currentColor" },
	1: { fill: shaded(7) },
	2: { fill: shaded(15) },
	3: { fill: shaded(25) },
	4: { fill: shaded(36) },
}) satisfies Record<Shade, unknown>;
