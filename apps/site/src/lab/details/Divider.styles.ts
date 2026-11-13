import * as stylex from "@stylexjs/stylex";
import { color } from "@/theme/tokens.stylex";
import { shape } from "./shapes.stylex";

const NEAR = "15rem";
const FAR = "22rem";

const runNear = stylex.keyframes({ to: { transform: `translateX(-${NEAR})` } });
const runFar = stylex.keyframes({ to: { transform: `translateX(-${FAR})` } });
const lag = stylex.keyframes({ from: { translate: "0 0.875rem" }, to: { translate: "0 -0.5rem" } });
const wash = stylex.keyframes({
	"0%": { opacity: 0, transform: "translateY(-55%)" },
	"30%": { opacity: 0.5, transform: "translateY(0)" },
	"48%": { opacity: 0.45, transform: "translateY(6%)" },
	"100%": { opacity: 0, transform: "translateY(-30%)" },
});

const layer = {
	position: "absolute",
	left: 0,
	bottom: 0,
	height: "100%",
	maskRepeat: "repeat-x",
	animationName: { default: null, "@media (prefers-reduced-motion: no-preference)": runNear },
	animationTimingFunction: "linear",
	animationIterationCount: "infinite",
} as const;

const near = {
	...layer,
	width: `calc(100% + ${NEAR})`,
	maskSize: `${NEAR} 100%`,
	animationDuration: "16s",
} as const;

const far = {
	...layer,
	width: `calc(100% + ${FAR})`,
	maskSize: `${FAR} 100%`,
	animationName: { default: null, "@media (prefers-reduced-motion: no-preference)": runFar },
	animationDuration: "27s",
	animationDirection: "reverse",
} as const;

export const styles = stylex.create({
	/** Takes no room: the band overlays the edge of a neighbouring section. */
	seam: { position: "relative", zIndex: 2, height: 0, pointerEvents: "none" },
	band: {
		position: "absolute",
		insetInline: 0,
		height: { default: "2.25rem", "@media (min-width: 48rem)": "3.5rem" },
		overflow: "hidden",
	},
	/** Over the bottom of the section above. */
	above: { bottom: "-1px" },
	/** Over the top of the section below, upside down: the ground laps down over it. */
	below: { top: "-1px", scale: "1 -1" },
	/** The far layer drifts vertically against the near one as the seam crosses the viewport. */
	lag: {
		position: "absolute",
		inset: 0,
		animationName: {
			default: null,
			"@supports (animation-timeline: view())": {
				default: null,
				"@media (prefers-reduced-motion: no-preference)": lag,
			},
		},
		animationTimingFunction: "linear",
		animationFillMode: "both",
		animationTimeline: "view()",
	},
	far: {
		...far,
		maskImage: shape.swell,
		backgroundColor: `color-mix(in oklab, ${color.ocean} 55%, transparent)`,
	},
	near: { ...near, maskImage: shape.swell, backgroundColor: color.ocean },
	crest: {
		...near,
		maskImage: shape.swellLine,
		backgroundColor: `color-mix(in oklab, ${color.aqua} 45%, transparent)`,
	},
	/** Same ground both sides: no fill to cut, so a faint lit swell and its crest line. */
	ghostFar: {
		...far,
		maskImage: shape.swellLine,
		backgroundColor: `color-mix(in oklab, ${color.aqua} 22%, transparent)`,
	},
	ghostNear: {
		...near,
		maskImage: shape.swell,
		backgroundImage: `linear-gradient(to bottom, ${color.paper12}, transparent 85%)`,
		opacity: 0.45,
	},

	foam: {
		position: "absolute",
		insetInline: 0,
		top: { default: "-2.5rem", "@media (min-width: 48rem)": "-3.75rem" },
		height: { default: "5rem", "@media (min-width: 48rem)": "7.5rem" },
		overflow: "hidden",
		maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
	},
	/** One wash on entering view, then a slow loop while it stays there. */
	wash: {
		position: "absolute",
		inset: 0,
		opacity: { default: 0, "@media (prefers-reduced-motion: reduce)": 0.4 },
		animationName: { default: wash, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "9s",
		animationTimingFunction: "cubic-bezier(0.3, 0.6, 0.4, 1)",
		animationIterationCount: "infinite",
		animationPlayState: { default: "paused", [stylex.when.ancestor(":is([data-in])")]: "running" },
	},
	/** The lace itself: an alpha envelope that the `#details-foam` filter turns into foam cells. */
	lace: {
		position: "absolute",
		inset: 0,
		backgroundImage:
			"linear-gradient(to bottom, transparent 8%, rgb(0 0 0 / 0.9) 46%, rgb(0 0 0 / 0.9) 54%, transparent 92%)",
		filter: "url(#details-foam)",
	},
});

export const seamMarker = stylex.defaultMarker();
