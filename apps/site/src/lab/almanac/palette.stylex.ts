import * as stylex from "@stylexjs/stylex";

/** Tones of the hour, set on `<html>` by `almanac.client.ts`; the fallbacks are a clear afternoon. */
export const hour = stylex.defineConsts({
	zenith: "var(--alm-zenith, #2f72bd)",
	horizon: "var(--alm-horizon, #b4d0e6)",
	seaFar: "var(--alm-sea-far, #2e6c9e)",
	seaNear: "var(--alm-sea-near, #124470)",
	accent: "var(--alm-accent, #93d2e6)",
	accent35: "color-mix(in oklab, var(--alm-accent, #93d2e6) 35%, transparent)",
});
