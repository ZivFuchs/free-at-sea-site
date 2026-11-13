import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";

const CARD_PHONE = "13rem";
const CARD_DESK = "15.5rem";

const idle = stylex.keyframes({
	from: { transform: "translateY(-3px) rotate(-0.4deg)" },
	to: { transform: "translateY(3px) rotate(0.4deg)" },
});

export const styles = stylex.create({
	/** Room for the covers to heave and roll inside the scroller without being clipped. */
	trackRoom: { paddingBlock: "1.5rem 2.5rem" },
	/** `--y`, `--roll`, `--tx`, `--ty` come from the spring simulation. */
	float: {
		position: "relative",
		transform:
			"perspective(60rem) translate3d(0, var(--y, 0px), 0) rotateZ(var(--roll, 0deg)) rotateX(var(--tx, 0deg)) rotateY(var(--ty, 0deg))",
		transformOrigin: "50% 60%",
		willChange: "transform",
	},
	/** A band of light that slides across the cover as it rocks (`--sheen`, in % of the cover's width). */
	sheen: {
		position: "absolute",
		inset: 0,
		overflow: "hidden",
		pointerEvents: "none",
		mixBlendMode: "soft-light",
	},
	sheenBand: {
		position: "absolute",
		insetBlock: "-20%",
		left: "-40%",
		width: "180%",
		translate: "calc(var(--sheen, 0) * 1%) 0",
		backgroundImage: `linear-gradient(105deg, transparent 38%, ${color.paper45} 49%, ${color.paper70} 51%, transparent 62%)`,
	},

	/** The pile. `--n` cards; heights leave room for the scatter. */
	area: {
		position: "relative",
		margin: 0,
		padding: 0,
		listStyleType: "none",
		height: {
			default: `calc(var(--rows-m) * 12.5rem + ${CARD_PHONE} * 1.5 + 2rem)`,
			"@media (min-width: 48rem)": `calc(var(--rows-d) * 15rem + ${CARD_DESK} * 1.5 + 3rem)`,
			"@media (scripting: none)": "auto",
		},
		maxWidth: {
			default: null,
			"@media (min-width: 48rem)": "calc(var(--cols-d) * 13.25rem + 2.25rem)",
		},
		display: { default: null, "@media (scripting: none)": "grid" },
		gridTemplateColumns: {
			default: null,
			"@media (scripting: none)": "repeat(auto-fill, minmax(11rem, 1fr))",
		},
		gap: { default: null, "@media (scripting: none)": "1rem" },
	},
	/** `--xm/--ym` and `--xd/--yd` place it (phone / desktop); `--r` is its resting angle. Dragging adds `--dx/--dy`. */
	print: {
		position: { default: "absolute", "@media (scripting: none)": "static" },
		width: {
			default: CARD_PHONE,
			"@media (min-width: 48rem)": CARD_DESK,
			"@media (scripting: none)": "auto",
		},
		left: {
			default: `calc(var(--xm) * (100% - ${CARD_PHONE}))`,
			"@media (min-width: 48rem)": `calc(var(--xd) * (100% - ${CARD_DESK}))`,
		},
		top: {
			default: "calc(var(--ym) * 1rem + 1rem)",
			"@media (min-width: 48rem)": "calc(var(--yd) * 1rem + 1.5rem)",
		},
		translate: "var(--dx, 0px) var(--dy, 0px)",
		rotate: {
			default: "calc(var(--r) + var(--swing, 0deg))",
			":focus-within": "0deg",
			"@media (scripting: none)": "none",
		},
		scale: { default: null, ":is([data-held])": "1.03" },
		cursor: { default: "grab", ":is([data-held])": "grabbing" },
		touchAction: "pan-y",
		userSelect: "none",
		WebkitUserSelect: "none",
		transitionProperty: "rotate, scale",
		transitionDuration: "350ms",
		transitionTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
		filter: {
			default: "drop-shadow(0 14px 18px oklch(0.1 0.03 245 / 0.45))",
			":is([data-held])": "drop-shadow(0 26px 30px oklch(0.1 0.03 245 / 0.55))",
		},
	},
	/** Each print rides the water a little, out of step with its neighbours. */
	ride: {
		animationName: { default: idle, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "var(--period)",
		animationDelay: "var(--delay)",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
		animationDirection: "alternate",
	},
	hint: {
		marginTop: "0.5rem",
		color: color.paper45,
		fontSize: "0.8125rem",
		fontStyle: "italic",
		display: { default: null, "@media (scripting: none)": "none" },
	},
});
