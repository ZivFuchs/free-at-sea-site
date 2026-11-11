import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";

/** `--solid`: 0 transparent → 1 opaque, set from scroll by the header script on overlay pages. */
const solid = (from: string, to: string) =>
	`color-mix(in oklab, ${to} calc(var(--solid, 1) * 100%), ${from})`;

export const styles = stylex.create({
	header: {
		position: "sticky",
		top: 0,
		zIndex: 40,
		borderBottomWidth: "1px",
		borderBottomColor: solid("transparent", color.ink10),
		color: solid(color.paper, color.ink),
		backgroundColor: solid("transparent", color.paper85),
		backdropFilter: "blur(calc(var(--solid, 1) * 12px))",
		translate: {
			default: null,
			":is([data-hidden])": {
				default: "0 -100%",
				"@media (prefers-reduced-motion: reduce)": "none",
			},
		},
		opacity: {
			default: null,
			":is([data-hidden])": { default: null, "@media (prefers-reduced-motion: reduce)": 0 },
		},
		pointerEvents: { default: null, ":is([data-hidden])": "none" },
		transitionProperty: {
			default: "translate",
			"@media (prefers-reduced-motion: reduce)": "opacity",
		},
		transitionDuration: "500ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	overlay: { marginBottom: "-4rem" },
	bar: {
		display: "flex",
		height: "4rem",
		alignItems: "center",
		justifyContent: "space-between",
	},
	nav: { display: { default: "none", "@media (min-width: 48rem)": "block" } },
	navList: { display: "flex", gap: "2rem" },
	link: {
		color: { default: solid(color.paper70, color.muted), ":hover": "inherit" },
	},
	linkCurrent: { color: "inherit" },
	toggle: {
		marginRight: "-0.5rem",
		width: "2.5rem",
		height: "2.5rem",
		alignItems: "center",
		justifyContent: "center",
	},
	open: {
		display: { default: "flex", "@media (min-width: 48rem)": "none" },
		flexDirection: "column",
		gap: "0.375rem",
	},
	close: { display: "grid", placeItems: "center" },
	line: { width: "1.25rem", height: "1px", backgroundColor: "currentColor" },
	cross: { gridArea: "1 / 1", rotate: "45deg" },
	crossAlt: { rotate: "-45deg" },
	menu: {
		display: { default: null, "@media (min-width: 48rem)": "none" },
		inset: 0,
		margin: 0,
		width: "100%",
		height: "100%",
		maxWidth: "none",
		maxHeight: "none",
		padding: 0,
		backgroundColor: color.paper,
		color: color.ink,
	},
	menuList: { marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" },
	menuLinkCurrent: { color: color.accent },
});
