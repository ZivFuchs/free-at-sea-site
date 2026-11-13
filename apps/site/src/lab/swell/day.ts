import { clamp, lerp } from "@/lab/lib/motion";

/** Fraction of the viewport height, from the top, where the horizon sits. */
export const HORIZON = 0.4;

export type RGB = readonly [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB hex → linear RGB. */
const hex = (h: string): RGB => {
	const n = Number.parseInt(h.slice(1), 16);
	return [
		toLinear(((n >> 16) & 255) / 255),
		toLinear(((n >> 8) & 255) / 255),
		toLinear((n & 255) / 255),
	];
};

const NUMBERS = [
	"minutes",
	"elevation",
	"sunPower",
	"stars",
	"moon",
	"clouds",
	"glassAlpha",
] as const;
const COLOURS = [
	"zenith",
	"horizon",
	"glow",
	"sun",
	"deep",
	"scatter",
	"cloud",
	"glass",
	"accent",
] as const;

type Numbers = Record<(typeof NUMBERS)[number], number>;
type Sample = Numbers & Record<(typeof COLOURS)[number], RGB>;
/** One moment of the day: where on the page it lands (0–1), its clock time, and the scene's colours as hex. */
type Source = { at: number; phase: string } & Numbers & Record<(typeof COLOURS)[number], string>;
type Key = Pick<Source, "at" | "phase"> & Sample;
export type Moment = Sample & Pick<Key, "phase"> & { sunDir: RGB };

const DAY: readonly Source[] = [
	{
		at: 0,
		phase: "First light",
		minutes: 372,
		elevation: 0.6,
		sunPower: 5,
		stars: 0.12,
		moon: 0,
		clouds: 0.6,
		zenith: "#1d2f5c",
		horizon: "#e99a6c",
		glow: "#ff7a3d",
		sun: "#ffb37a",
		deep: "#081a2b",
		scatter: "#1c4a58",
		cloud: "#f0a487",
		glass: "#141c33",
		glassAlpha: 0.5,
		accent: "#ffc9a0",
	},
	{
		at: 0.13,
		phase: "Morning",
		minutes: 500,
		elevation: 13,
		sunPower: 9,
		stars: 0,
		moon: 0,
		clouds: 0.6,
		zenith: "#2f69b5",
		horizon: "#a6c6e2",
		glow: "#75695a",
		sun: "#fff0d8",
		deep: "#082a45",
		scatter: "#1b6f7c",
		cloud: "#ffffff",
		glass: "#0b2c4a",
		glassAlpha: 0.5,
		accent: "#ffe9c7",
	},
	{
		at: 0.38,
		phase: "Midday",
		minutes: 745,
		elevation: 52,
		sunPower: 11,
		stars: 0,
		moon: 0,
		clouds: 0.45,
		zenith: "#1f5cb0",
		horizon: "#98c2e8",
		glow: "#3c4650",
		sun: "#ffffff",
		deep: "#062c4e",
		scatter: "#178893",
		cloud: "#ffffff",
		glass: "#07304f",
		glassAlpha: 0.52,
		accent: "#c6e8ff",
	},
	{
		at: 0.6,
		phase: "Golden hour",
		minutes: 1085,
		elevation: 8,
		sunPower: 8,
		stars: 0,
		moon: 0,
		clouds: 0.7,
		zenith: "#35598f",
		horizon: "#ecb675",
		glow: "#9c5f2a",
		sun: "#ffc57a",
		deep: "#09263a",
		scatter: "#2b6660",
		cloud: "#ffd9a8",
		glass: "#1a2638",
		glassAlpha: 0.5,
		accent: "#ffd08a",
	},
	{
		at: 0.74,
		phase: "Sunset",
		minutes: 1160,
		elevation: 0.4,
		sunPower: 5.5,
		stars: 0.05,
		moon: 0,
		clouds: 0.9,
		zenith: "#283463",
		horizon: "#ee8450",
		glow: "#ff5f2a",
		sun: "#ff8244",
		deep: "#081a2a",
		scatter: "#3a4452",
		cloud: "#f07a66",
		glass: "#1f1a30",
		glassAlpha: 0.52,
		accent: "#ff9d73",
	},
	{
		at: 0.85,
		phase: "Dusk",
		minutes: 1215,
		elevation: -7,
		sunPower: 0,
		stars: 0.45,
		moon: 0.12,
		clouds: 0.6,
		zenith: "#0f1838",
		horizon: "#474563",
		glow: "#6e4159",
		sun: "#ff8244",
		deep: "#040d19",
		scatter: "#152634",
		cloud: "#4a3d63",
		glass: "#0c1124",
		glassAlpha: 0.55,
		accent: "#c9a6e8",
	},
	{
		at: 1,
		phase: "Night",
		minutes: 1420,
		elevation: -28,
		sunPower: 0,
		stars: 1,
		moon: 1,
		clouds: 0.25,
		zenith: "#02050d",
		horizon: "#0b172b",
		glow: "#152744",
		sun: "#000000",
		deep: "#01060d",
		scatter: "#0a1826",
		cloud: "#1a2740",
		glass: "#050a14",
		glassAlpha: 0.58,
		accent: "#a9c4ff",
	},
];

const KEYS: readonly Key[] = DAY.map((source) => ({
	...source,
	...(Object.fromEntries(COLOURS.map((c) => [c, hex(source[c])])) as Record<
		(typeof COLOURS)[number],
		RGB
	>),
}));

const blend = (x: RGB, y: RGB, u: number): RGB => [
	lerp(x[0], y[0], u),
	lerp(x[1], y[1], u),
	lerp(x[2], y[2], u),
];

const RAD = Math.PI / 180;

/** The sky, sea and page palette at page progress `t` (0 dawn → 1 night). */
export const sample = (t: number): Moment => {
	const p = clamp(t);
	const next = Math.max(
		1,
		KEYS.findIndex((k) => k.at >= p),
	);
	const a = KEYS[next - 1] as Key;
	const b = KEYS[next] as Key;
	const u = clamp((p - a.at) / (b.at - a.at));
	const moment = {
		phase: (u < 0.5 ? a : b).phase,
		...Object.fromEntries(NUMBERS.map((n) => [n, lerp(a[n], b[n], u)])),
		...Object.fromEntries(COLOURS.map((c) => [c, blend(a[c], b[c], u)])),
	} as Sample & Pick<Key, "phase">;
	// A narrow arc, so the sun rises and sets inside even a phone's field of view.
	const azimuth = (-2.5 + 9 * clamp(p / 0.8)) * RAD;
	const el = moment.elevation * RAD;
	return {
		...moment,
		sunDir: [Math.sin(azimuth) * Math.cos(el), Math.sin(el), -Math.cos(azimuth) * Math.cos(el)],
	};
};

const css = ([r, g, b]: RGB, alpha = 1) =>
	`rgb(${Math.round(toSrgb(r) * 255)} ${Math.round(toSrgb(g) * 255)} ${Math.round(toSrgb(b) * 255)} / ${alpha.toFixed(3)})`;

/** Custom properties the page (and the no-WebGL backdrop) reads. */
export const cssVars = (m: Moment) => ({
	"--sw-accent": css(m.accent),
	"--sw-glass": css(m.glass, m.glassAlpha),
	"--sw-zenith": css(m.zenith),
	"--sw-horizon": css(m.horizon),
	"--sw-far": css(blend(m.deep, m.horizon, 0.3)),
	"--sw-water": css(m.deep),
});

/** "06:12" for the scene's time of day. */
export const clock = ({ minutes }: Moment) => {
	const total = Math.round(minutes);
	return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
