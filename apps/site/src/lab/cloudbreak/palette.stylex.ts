import * as stylex from "@stylexjs/stylex";

const mix = (from: string, to: string, by: string) =>
	`color-mix(in oklab, ${to} calc(var(${by}, 0) * 100%), ${from})`;

/** `--ink` / `--ink-top` (0–1, set from altitude): type turns dark while cloud is behind it. */
export const air = stylex.defineConsts({
	text: mix("var(--app-paper)", "var(--app-ink)", "--ink"),
	muted: mix(
		"color-mix(in oklab, var(--app-paper) 72%, transparent)",
		"color-mix(in oklab, var(--app-ink) 78%, transparent)",
		"--ink",
	),
	rule: mix(
		"color-mix(in oklab, var(--app-paper) 30%, transparent)",
		"color-mix(in oklab, var(--app-ink) 30%, transparent)",
		"--ink",
	),
	top: mix("var(--app-paper)", "var(--app-ink)", "--ink-top"),
	/** Ground when the shader is unavailable: cloud grey in the layer, open water otherwise. */
	ground: mix("var(--app-ocean)", "oklch(0.86 0.012 240)", "--ink"),
	/** Behind the header once the title has gone: weather-coloured, so the wordmark clears what scrolls under. */
	scrim: mix(
		"color-mix(in oklab, var(--app-ocean) 70%, transparent)",
		"color-mix(in oklab, oklch(0.86 0.012 240) 80%, transparent)",
		"--ink-top",
	),
	glass: "color-mix(in oklab, var(--app-ink) 62%, transparent)",
});
