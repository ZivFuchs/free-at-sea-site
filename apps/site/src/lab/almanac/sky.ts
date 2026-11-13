import { clamp, lerp, smoothstep } from "@/lab/lib/motion";
import type { Almanac } from "./astro";

export type Rgb = readonly [number, number, number];

const hex = (value: string): Rgb => {
	const n = Number.parseInt(value.slice(1), 16);
	return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const TONES = ["zenith", "horizon", "seaFar", "seaNear", "glow", "ground", "accent"] as const;
type Tone = (typeof TONES)[number];
export type Palette = Record<Tone, Rgb>;

/** Sun altitude (degrees) → tones. Sky and sea are the hero; `ground` and `accent` dress the rest of the page. */
const KEYS: readonly (readonly [number, Record<Tone, string>])[] = [
	[
		-18,
		{
			zenith: "#03060d",
			horizon: "#0a1422",
			seaFar: "#070e19",
			seaNear: "#03070e",
			glow: "#101c33",
			ground: "#050a14",
			accent: "#a9c2e8",
		},
	],
	[
		-12,
		{
			zenith: "#060c1b",
			horizon: "#16284a",
			seaFar: "#0b1628",
			seaNear: "#050b16",
			glow: "#27407a",
			ground: "#070d1c",
			accent: "#a9c2e8",
		},
	],
	[
		-6,
		{
			zenith: "#101f44",
			horizon: "#8a5c6e",
			seaFar: "#1a2744",
			seaNear: "#0a1226",
			glow: "#d9735a",
			ground: "#0d122b",
			accent: "#e6a596",
		},
	],
	[
		-1,
		{
			zenith: "#27447a",
			horizon: "#e9a07a",
			seaFar: "#3c4666",
			seaNear: "#141d38",
			glow: "#f39a5c",
			ground: "#151530",
			accent: "#f0b08a",
		},
	],
	[
		4,
		{
			zenith: "#3f6ea8",
			horizon: "#f1cfa0",
			seaFar: "#4a6485",
			seaNear: "#1a3252",
			glow: "#f6c27a",
			ground: "#141d36",
			accent: "#f2c88c",
		},
	],
	[
		12,
		{
			zenith: "#3f7dbd",
			horizon: "#cfdde6",
			seaFar: "#3f7099",
			seaNear: "#163f66",
			glow: "#f3e2bd",
			ground: "#0f2540",
			accent: "#bfe0ea",
		},
	],
	[
		35,
		{
			zenith: "#2f72bd",
			horizon: "#b4d0e6",
			seaFar: "#2e6c9e",
			seaNear: "#124470",
			glow: "#f2ecd8",
			ground: "#0c2a48",
			accent: "#93d2e6",
		},
	],
	[
		90,
		{
			zenith: "#2566b4",
			horizon: "#a6c8e4",
			seaFar: "#256aa2",
			seaNear: "#0f4676",
			glow: "#f2f0e4",
			ground: "#0b2c4c",
			accent: "#8fd0e6",
		},
	],
];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
	lerp(a[0], b[0], t),
	lerp(a[1], b[1], t),
	lerp(a[2], b[2], t),
];

export const paletteAt = (sunAltitude: number): Palette => {
	const above = KEYS.findIndex(([alt]) => alt >= sunAltitude);
	const last = KEYS.length - 1;
	const hi = KEYS[above === -1 ? last : above];
	const lo = KEYS[above === -1 ? last : Math.max(above - 1, 0)];
	if (!lo || !hi) throw new Error("No sky keys");
	const t = hi[0] === lo[0] ? 0 : clamp((sunAltitude - lo[0]) / (hi[0] - lo[0]));
	return Object.fromEntries(
		TONES.map((tone) => [tone, mix(hex(lo[1][tone]), hex(hi[1][tone]), t)]),
	) as Palette;
};

export const css = ([r, g, b]: Rgb) =>
	`rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

const LIGHT = [
	[-18, "Night"],
	[-12, "Astronomical twilight"],
	[-6, "Nautical twilight"],
	[-0.833, "Civil twilight"],
	[6, "Golden hour"],
] as const;

export const lightName = (sunAltitude: number) =>
	LIGHT.find(([below]) => sunAltitude < below)?.[1] ?? "Daylight";

export interface Sky {
	palette: Palette;
	light: string;
	/** 0–1 */
	stars: number;
	/** 0–1: how much the moon lights the night. */
	moonlight: number;
}

export const skyFor = ({ sun, moon }: Almanac): Sky => {
	const night = 1 - smoothstep(-12, -4, sun.altitude);
	const moonlight = night * smoothstep(-1.5, 4, moon.altitude) * moon.fraction;
	const base = paletteAt(sun.altitude);
	const lift = (tone: Rgb, amount: number): Rgb => mix(tone, [0.42, 0.52, 0.7], amount * moonlight);
	return {
		palette: {
			...base,
			zenith: lift(base.zenith, 0.07),
			horizon: lift(base.horizon, 0.16),
			seaFar: lift(base.seaFar, 0.12),
			seaNear: lift(base.seaNear, 0.05),
		},
		light: lightName(sun.altitude),
		stars: (1 - smoothstep(-13, -5, sun.altitude)) * (1 - 0.55 * moonlight),
		moonlight,
	};
};
