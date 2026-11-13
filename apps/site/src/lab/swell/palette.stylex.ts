import * as stylex from "@stylexjs/stylex";

/** Follow the sun: `client.ts` rewrites the custom properties as the day turns. */
export const day = stylex.defineConsts({
	accent: "var(--sw-accent)",
	glass: "var(--sw-glass)",
	zenith: "var(--sw-zenith)",
	horizon: "var(--sw-horizon)",
	far: "var(--sw-far)",
	water: "var(--sw-water)",
	/** The title, backlit against first light. */
	silhouette: "oklch(0.19 0.045 255)",
	/** Soft dark bloom that holds open type against a bright sky. */
	shade: "oklch(0.15 0.04 250 / 0.7)",
});
