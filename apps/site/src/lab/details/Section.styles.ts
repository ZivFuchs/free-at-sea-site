import * as stylex from "@stylexjs/stylex";

const surface = stylex.keyframes({
	from: {
		opacity: 0,
		filter: "blur(14px) brightness(0.6) saturate(0.5)",
		transform: "translateY(3rem)",
	},
	to: { opacity: 1, filter: "none", transform: "none" },
});

export const styles = stylex.create({
	section: { position: "relative", scrollMarginTop: "0" },
	/** `data-reveal="surface"` (set by the panel): rise into focus over the first stretch of entering the viewport. */
	reveal: {
		animationName: {
			default: null,
			"@supports (animation-timeline: view())": {
				default: null,
				"@media (prefers-reduced-motion: no-preference)": {
					default: null,
					':is([data-reveal="surface"])': surface,
				},
			},
		},
		animationTimingFunction: "ease-out",
		animationFillMode: "both",
		animationTimeline: "view()",
		animationRangeStart: "entry 0%",
		animationRangeEnd: "entry 58%",
	},
});
