import * as stylex from "@stylexjs/stylex";

const drift = stylex.keyframes({
	from: { transform: "scale(1.04) translateX(-1%)" },
	to: { transform: "scale(1.12) translateX(1%)" },
});

export const styles = stylex.create({
	frame: { position: "absolute", inset: 0, overflow: "hidden" },
	media: { width: "100%", height: "100%", objectFit: "cover" },
	drift: {
		transformOrigin: "50% calc(var(--horizon) * 100%)",
		animationName: { default: drift, "@media (prefers-reduced-motion: reduce)": "none" },
		animationDuration: "40s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
		animationDirection: "alternate",
	},
});
