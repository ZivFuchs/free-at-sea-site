import * as stylex from "@stylexjs/stylex";
import { color, font } from "@/theme/tokens.stylex";

/** On the form: children react to its `data-state`. */
export const formMarker = stylex.defaultMarker();

const INK_40 = "color-mix(in oklab, var(--app-ink) 40%, transparent)";
const ERROR = "oklch(0.78 0.12 35)";

const shimmer = stylex.keyframes({ to: { backgroundPosition: "-150% 0" } });

export const styles = stylex.create({
	section: {
		position: "relative",
		isolation: "isolate",
		overflow: "hidden",
		display: "grid",
		alignItems: "center",
		minHeight: { default: "26rem", "@media (min-width: 48rem)": "32rem" },
		paddingBlock: { default: "4rem", "@media (min-width: 48rem)": "6rem" },
		backgroundColor: color.ink,
		color: color.paper,
	},
	media: {
		position: "absolute",
		inset: 0,
		zIndex: -2,
		width: "100%",
		height: "100%",
		objectFit: "cover",
		objectPosition: "50% 55%",
	},
	veil: {
		position: "absolute",
		inset: 0,
		zIndex: -1,
		backgroundColor: INK_40,
	},
	card: {
		width: "100%",
		maxWidth: "26rem",
		marginInline: "auto",
		padding: { default: "2rem 1.25rem", "@media (min-width: 48rem)": "2.5rem 2.25rem" },
		textAlign: "center",
		borderRadius: "1.5rem",
		backgroundColor: color.paper12,
		backdropFilter: "blur(24px) saturate(1.2)",
	},
	heading: {
		fontFamily: font.hero,
		fontWeight: 900,
		fontSize: { default: "1.875rem", "@media (min-width: 48rem)": "2.375rem" },
		lineHeight: 1.1,
		textWrap: "balance",
	},
	sub: {
		marginTop: "0.5rem",
		fontFamily: font.sans,
		fontSize: "0.9375rem",
		color: color.paper70,
	},
	form: { marginTop: "1.5rem" },
	/** Phone: input and button stacked as two pills. Desktop: one pill with the button inset. */
	/** One pill at every width: the input with the button inset. */
	field: {
		display: "flex",
		gap: "0.25rem",
		padding: "0.25rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: {
			default: color.paper45,
			":focus-within": {
				default: color.paper,
				[stylex.when.ancestor("[data-state=error]")]: ERROR,
			},
			[stylex.when.ancestor("[data-state=error]")]: ERROR,
		},
		borderRadius: "999px",
		backgroundColor: color.paper12,
		transitionProperty: "border-color",
		transitionDuration: "200ms",
	},
	input: {
		flexGrow: 1,
		minWidth: 0,
		height: "2.75rem",
		margin: 0,
		paddingInline: "1rem",
		borderWidth: 0,
		borderRadius: "999px",
		backgroundColor: "transparent",
		color: color.paper,
		fontFamily: font.sans,
		fontSize: "1rem",
		"::placeholder": { color: color.paper65 },
		outlineWidth: 0,
	},
	button: {
		flexShrink: 0,
		display: "grid",
		placeItems: "center",
		width: "2.75rem",
		height: "2.75rem",
		margin: 0,
		padding: 0,
		borderWidth: 0,
		borderRadius: "999px",
		backgroundColor: { default: color.paper, ":hover": color.aqua },
		backgroundImage: {
			default: "none",
			[stylex.when.ancestor("[data-state=sending]")]:
				`linear-gradient(110deg, ${color.paper} 40%, ${color.aqua} 50%, ${color.paper} 60%)`,
		},
		backgroundSize: "250% 100%",
		animationName: {
			default: "none",
			[stylex.when.ancestor("[data-state=sending]")]: {
				default: shimmer,
				"@media (prefers-reduced-motion: reduce)": "none",
			},
		},
		animationDuration: "1.1s",
		animationTimingFunction: "linear",
		animationIterationCount: "infinite",
		color: color.ink,
		fontFamily: font.sans,
		fontSize: "1rem",
		fontWeight: 600,
		letterSpacing: "0.02em",
		cursor: {
			default: "pointer",
			[stylex.when.ancestor("[data-state=sending]")]: "progress",
		},
		transitionProperty: "background-color",
		transitionDuration: "200ms",
		outlineWidth: { default: 0, ":focus-visible": "2px" },
		outlineStyle: "solid",
		outlineColor: color.paper,
		outlineOffset: "3px",
	},
	arrow: { width: "1rem", height: "1rem" },
	statusRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "0.375rem",
		/** Collapsed until the form has something to say, so the card stays balanced. */
		minHeight: { default: 0, [stylex.when.ancestor("[data-state]")]: "1.25rem" },
		marginTop: { default: 0, [stylex.when.ancestor("[data-state]")]: "0.75rem" },
	},
	check: {
		display: { default: "none", [stylex.when.ancestor("[data-state=done]")]: "block" },
		flexShrink: 0,
		width: "1.125rem",
		height: "1.125rem",
		color: color.aqua,
	},
	status: {
		fontFamily: font.sans,
		fontSize: "0.8125rem",
		color: {
			default: color.paper70,
			[stylex.when.ancestor("[data-state=done]")]: color.aqua,
			[stylex.when.ancestor("[data-state=error]")]: ERROR,
		},
	},
	srOnly: {
		position: "absolute",
		width: "1px",
		height: "1px",
		overflow: "hidden",
		clipPath: "inset(50%)",
		whiteSpace: "nowrap",
	},
});
