import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";
import { shape } from "./shapes.stylex";

/** On the curtain: its layers animate while it has `data-playing`. */
export const curtainMarker = stylex.defaultMarker();

const PLAYING = ":is([data-playing])";
const SHALLOW = "oklch(0.36 0.075 225)";
const DEEP = "oklch(0.11 0.03 248)";
const DURATION = "1.6s";

/** Rising: the surface overhead brightens and spreads. */
const brighten = stylex.keyframes({
	"0%": { opacity: 0, transform: "scale(0.7, 0.45)" },
	"60%": { opacity: 1, transform: "scale(1.15, 1)" },
	"100%": { opacity: 1, transform: "scale(1.4, 1.5)" },
});
/** Breaking through: the water falls away below the frame. */
const fall = stylex.keyframes({
	"0%": { transform: "translateY(0)" },
	"55%": { transform: "translateY(0)" },
	"100%": { transform: "translateY(calc(100% + 4rem))" },
});
const run = stylex.keyframes({ to: { transform: "translateX(-15rem)" } });

const playing = <T>(value: T) => ({ default: null, [stylex.when.ancestor(PLAYING)]: value });

export const styles = stylex.create({
	curtain: {
		position: "fixed",
		inset: 0,
		zIndex: 100,
		overflow: "hidden",
		visibility: { default: "hidden", [PLAYING]: "visible" },
		pointerEvents: { default: "none", [PLAYING]: "auto" },
		cursor: "pointer",
	},
	water: {
		position: "absolute",
		inset: 0,
		backgroundImage: `linear-gradient(in oklab to bottom, ${SHALLOW}, ${color.ocean} 45%, ${DEEP})`,
		animationName: playing(fall),
		animationDuration: DURATION,
		animationTimingFunction: "cubic-bezier(0.6, 0, 0.9, 0.5)",
		animationFillMode: "both",
	},
	/** The surface as the water falls: a moving wave edge with a lit rim. */
	edge: {
		position: "absolute",
		left: 0,
		bottom: "calc(100% - 1px)",
		width: "calc(100% + 15rem)",
		height: "2.5rem",
		maskImage: shape.swell,
		maskSize: "15rem 100%",
		maskRepeat: "repeat-x",
		backgroundImage: `linear-gradient(to bottom, ${color.aqua}, ${SHALLOW} 45%)`,
		animationName: playing(run),
		animationDuration: "2.4s",
		animationTimingFunction: "linear",
		animationIterationCount: "infinite",
	},
	light: {
		position: "absolute",
		insetInline: "-20%",
		top: "-12%",
		height: "75%",
		transformOrigin: "50% 0",
		backgroundImage: `radial-gradient(ellipse 50% 60% at 50% 0, color-mix(in oklab, ${color.paper} 80%, ${color.aqua}), color-mix(in oklab, ${color.aqua} 45%, transparent) 38%, transparent 72%)`,
		mixBlendMode: "screen",
		animationName: playing(brighten),
		animationDuration: DURATION,
		animationTimingFunction: "cubic-bezier(0.3, 0, 0.6, 1)",
		animationFillMode: "both",
	},
});
