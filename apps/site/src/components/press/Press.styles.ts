import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** On each shelf slot; PressCard styles its hover/focus state against it with `stylex.when.ancestor`. */
export const cardMarker = stylex.defaultMarker();

export const styles = stylex.create({
	section: {
		paddingBlock: { default: "3rem 4rem", "@media (min-width: 48rem)": "4rem 7rem" },
		color: color.paper,
	},
	head: {
		display: "flex",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: "1rem",
		marginBottom: { default: "1.25rem", "@media (min-width: 48rem)": "2rem" },
	},
	heading: {
		fontFamily: font.display,
		fontSize: { default: "3rem", "@media (min-width: 48rem)": "4.5rem" },
		lineHeight: 0.95,
		textTransform: "uppercase",
	},
	controls: {
		display: {
			default: "none",
			"@media (min-width: 48rem)": { default: "none", ":is([data-on])": "flex" },
		},
		gap: "0.5rem",
	},
	step: {
		appearance: "none",
		display: "grid",
		placeItems: "center",
		width: "2.75rem",
		height: "2.75rem",
		margin: 0,
		padding: 0,
		borderWidth: "1px",
		borderStyle: "solid",
		borderRadius: "999px",
		borderColor: { default: color.paper45, ":hover:not(:disabled)": color.paper },
		backgroundColor: { default: "transparent", ":hover:not(:disabled)": color.paper },
		color: {
			default: color.paper,
			":hover:not(:disabled)": color.ocean,
			":disabled": color.paper50,
		},
		opacity: { default: 1, ":disabled": 0.4 },
		cursor: { default: "pointer", ":disabled": "default" },
		transitionProperty: "background-color, border-color, color, opacity",
		transitionDuration: "200ms",
		outlineWidth: { default: 0, ":focus-visible": "2px" },
		outlineStyle: "solid",
		outlineColor: color.paper,
		outlineOffset: "3px",
	},
	arrow: { width: "1rem", height: "1rem" },

	/** The shelf edge: a hairline the covers stand on. */
	rack: {
		position: "relative",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: color.paper15,
	},
	track: {
		display: "flex",
		gap: { default: "1rem", "@media (min-width: 48rem)": "1.5rem" },
		margin: 0,
		marginInline: { default: "-1.5rem", "@media (min-width: 48rem)": "-0.5rem" },
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "0.5rem" },
		paddingBlock: "0.5rem 1.75rem",
		scrollPaddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "0.5rem" },
		listStyleType: "none",
		overflowX: "auto",
		overscrollBehaviorX: "contain",
		scrollSnapType: "x mandatory",
		scrollbarWidth: "none",
		"::-webkit-scrollbar": { display: "none" },
	},
	card: {
		flexShrink: 0,
		width: {
			default: "min(78%, 18rem)",
			"@media (min-width: 48rem)": "clamp(15rem, 23%, 18.5rem)",
		},
		scrollSnapAlign: "start",
	},
	/** Desktop: the page colour fades over whichever edge has more to scroll. */
	fade: {
		display: { default: "none", "@media (min-width: 48rem)": "block" },
		position: "absolute",
		insetBlock: 0,
		width: "4rem",
		pointerEvents: "none",
		opacity: { default: 0, ":is([data-on])": 1 },
		transitionProperty: "opacity",
		transitionDuration: "300ms",
	},
	fadeStart: {
		insetInlineStart: "-0.5rem",
		backgroundImage: `linear-gradient(in oklab to right, ${color.ocean}, transparent)`,
	},
	fadeEnd: {
		insetInlineEnd: "-0.5rem",
		backgroundImage: `linear-gradient(in oklab to left, ${color.ocean}, transparent)`,
	},
});
