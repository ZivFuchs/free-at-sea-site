import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";
import { shape } from "./shapes.stylex";

const TILE = "88px";
const CREST = "6px";

const run = stylex.keyframes({ to: { transform: `translateX(-${TILE})` } });

/** One sheet of water: a rippled top edge over a solid body, as a single mask so the two never seam. */
const sheet = {
	position: "absolute",
	left: 0,
	bottom: 0,
	width: `calc(100% + ${TILE})`,
	height: `calc(100% + ${CREST})`,
	/** `--tide` (0–1, page scroll) is the water level; at 0 even the crest sits below the bar. */
	translate: "0 calc((1 - var(--tide, 0)) * 100%)",
	maskImage: `${shape.ripple}, linear-gradient(#000, #000)`,
	maskSize: `${TILE} ${CREST}, 100% calc(100% - ${CREST} + 0.5px)`,
	maskPosition: `0 0, 0 calc(${CREST} - 0.5px)`,
	maskRepeat: "repeat-x, no-repeat",
	animationName: { default: run, "@media (prefers-reduced-motion: reduce)": "none" },
	animationTimingFunction: "linear",
	animationIterationCount: "infinite",
} as const;

export const styles = stylex.create({
	sea: { position: "absolute", inset: 0, zIndex: -1, overflow: "hidden", pointerEvents: "none" },
	near: {
		...sheet,
		backgroundImage: `linear-gradient(in oklab to bottom, color-mix(in oklab, ${color.aqua} 36%, transparent), color-mix(in oklab, ${color.aqua} 14%, transparent))`,
		animationDuration: "5s",
	},
	/** A second, fainter sheet riding slightly higher and the other way. */
	far: {
		...sheet,
		bottom: "2px",
		backgroundColor: `color-mix(in oklab, ${color.aqua} 12%, transparent)`,
		animationDuration: "8s",
		animationDirection: "reverse",
	},
});
