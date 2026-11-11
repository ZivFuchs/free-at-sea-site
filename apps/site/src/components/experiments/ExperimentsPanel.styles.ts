import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** Marks each group `<details>` so its summary can react to `[open]`. */
export const groupMarker = stylex.defaultMarker();

const SLATE_300 = "oklch(0.869 0.022 252.894)";
const SLATE_400 = "oklch(0.704 0.04 256.788)";
const SLATE_500 = "oklch(0.554 0.046 257.417)";
const SLATE_800 = "oklch(0.279 0.041 260.031)";

export const styles = stylex.create({
	panel: {
		position: "fixed",
		right: "1rem",
		bottom: "1rem",
		zIndex: 50,
		display: "flex",
		flexDirection: "column",
		width: "18rem",
		maxWidth: "calc(100vw - 2rem)",
		maxHeight: "calc(100dvh - 2rem)",
		overflowY: "auto",
		borderRadius: "0.5rem",
		backgroundColor: color.ink,
		color: color.paper,
		boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
	},
	eyebrow: {
		fontFamily: font.sans,
		fontSize: "0.75rem",
		lineHeight: "calc(1 / 0.75)",
		fontWeight: 500,
		letterSpacing: "0.1em",
		textTransform: "uppercase",
	},
	summary: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		cursor: "pointer",
		listStyle: "none",
		"::-webkit-details-marker": { display: "none" },
	},
	panelSummary: { paddingInline: "1rem", paddingBlock: "0.75rem" },
	chevron: { color: SLATE_400 },
	body: {
		borderTopWidth: "1px",
		borderTopColor: SLATE_800,
		paddingInline: "1rem",
		paddingBottom: "1rem",
	},
	group: {
		borderBottomWidth: { default: "1px", ":last-child": 0 },
		borderBottomColor: SLATE_800,
	},
	groupSummary: {
		gap: "0.5rem",
		paddingBlock: "0.75rem",
		color: { default: SLATE_400, ":hover": color.paper },
	},
	current: {
		display: { default: "flex", [stylex.when.ancestor("[open]")]: "none" },
		alignItems: "center",
		gap: "0.5rem",
		color: SLATE_500,
	},
	tabs: { display: "flex", flexWrap: "wrap", gap: "0.25rem" },
	tab: {
		borderRadius: "0.375rem",
		paddingInline: "0.625rem",
		paddingBlock: "0.375rem",
		color: { default: SLATE_400, ":hover": color.paper, ':is([aria-pressed="true"])': color.paper },
		backgroundColor: { default: null, ':is([aria-pressed="true"])': SLATE_800 },
		transitionProperty: "color, background-color",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	note: {
		marginTop: "0.5rem",
		paddingBottom: "0.75rem",
		fontSize: "0.875rem",
		lineHeight: "calc(1.25 / 0.875)",
		color: SLATE_300,
	},
});
