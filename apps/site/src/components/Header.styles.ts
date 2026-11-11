import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";

export const styles = stylex.create({
	header: {
		position: "sticky",
		top: 0,
		zIndex: 40,
		borderBottomWidth: "1px",
		borderBottomColor: {
			default: "transparent",
			":is([data-scrolled])": color.ink10,
		},
		backgroundColor: color.paper85,
		backdropFilter: "blur(12px)",
		translate: { default: null, ":is([data-hidden])": "0 -100%" },
		transitionProperty: {
			default: "translate, border-color",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		transitionDuration: "300ms",
		transitionTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
	},
	bar: {
		display: "flex",
		height: "4rem",
		alignItems: "center",
		justifyContent: "space-between",
	},
	nav: { display: { default: "none", "@media (min-width: 48rem)": "block" } },
	navList: { display: "flex", gap: "2rem" },
	link: { color: { default: color.muted, ":hover": color.ink } },
	linkCurrent: { color: color.ink },
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
	line: { width: "1.25rem", height: "1px", backgroundColor: color.ink },
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
