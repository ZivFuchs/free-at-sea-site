import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
const DEEP = "oklch(0.13 0.025 240)";
const SCRIM = "oklch(0.12 0.035 245";

const label = {
	fontFamily: font.mono,
	fontSize: "0.6875rem",
	lineHeight: 1.4,
	letterSpacing: "0.08em",
	textTransform: "uppercase",
} as const;

export const styles = stylex.create({
	link: {
		position: "relative",
		isolation: "isolate",
		display: "flex",
		flexDirection: "column",
		justifyContent: "space-between",
		aspectRatio: "2 / 3",
		overflow: "hidden",
		color: color.paper,
		textDecoration: "none",
		backgroundColor: color.ink,
		backgroundImage: `linear-gradient(in oklab 165deg, ${color.ink}, ${DEEP})`,
		boxShadow: "0 1px 0 0 oklch(0 0 0 / 0.04), 0 18px 28px -20px oklch(0.2 0.05 240 / 0.7)",
		outlineWidth: { default: 0, ":focus-visible": "2px" },
		outlineStyle: "solid",
		outlineColor: color.aqua,
		outlineOffset: "4px",
	},
	image: {
		position: "absolute",
		inset: 0,
		zIndex: -2,
		width: "100%",
		height: "100%",
		objectFit: "cover",
		objectPosition: "50% 30%",
		scale: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)": {
				default: null,
				[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: "1.07",
			},
		},
		transitionProperty: "scale",
		transitionDuration: "2400ms",
		transitionTimingFunction: EASE,
	},
	/** Two stacked scrims: gradients can't transition, so hover fades in the deeper one. */
	scrim: {
		position: "absolute",
		inset: 0,
		zIndex: -1,
		pointerEvents: "none",
		backgroundImage: `linear-gradient(in oklab to top, ${SCRIM} / 0.94) 0%, ${SCRIM} / 0.78) 30%, ${SCRIM} / 0.25) 62%, ${SCRIM} / 0) 78%), linear-gradient(to bottom, ${SCRIM} / 0.45), ${SCRIM} / 0) 26%)`,
	},
	scrimDeep: {
		backgroundImage: `linear-gradient(in oklab to top, ${SCRIM} / 0.7) 20%, ${SCRIM} / 0.35) 60%, ${SCRIM} / 0) 90%)`,
		opacity: {
			default: 0,
			[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: 1,
		},
		transitionProperty: "opacity",
		transitionDuration: "900ms",
		transitionTimingFunction: EASE,
	},
	masthead: { display: "flex", alignItems: "flex-start", padding: "1rem 1rem 0" },
	logo: {
		display: "block",
		width: "auto",
		maxWidth: "80%",
		objectFit: "contain",
		objectPosition: "left center",
		filter: "brightness(0) invert(1)",
	},
	badge: { filter: "none", borderRadius: "0.25rem" },
	outlet: { ...label, color: color.paper, fontWeight: 600 },
	body: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		gap: "0.625rem",
		padding: {
			default: "1rem 1rem 1.125rem",
			"@media (min-width: 48rem)": "1.25rem 1.25rem 1.375rem",
		},
	},
	headline: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.3125rem", "@media (min-width: 48rem)": "1.4375rem" },
		lineHeight: 1.14,
		color: color.paper,
		textWrap: "pretty",
		textShadow: "0 1px 12px oklch(0.1 0.03 245 / 0.5)",
		textDecorationLine: {
			default: "none",
			[stylex.when.ancestor(":is(:hover, :has(:focus-visible))")]: "underline",
		},
		textDecorationThickness: "1px",
		textUnderlineOffset: "0.18em",
		textDecorationColor: color.paper50,
	},
	meta: { ...label, color: color.aqua },
});
