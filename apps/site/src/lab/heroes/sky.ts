import { lerp } from "@/lab/lib/motion";

type Rgb = readonly [number, number, number];

/** One moment of the day, as the shader's uniforms. */
export interface Sky {
	zenith: Rgb;
	/** Sky colour on the horizon. */
	glow: Rgb;
	far: Rgb;
	near: Rgb;
	light: Rgb;
	/** Height of the sun or moon above the horizon, as a fraction of the sky band. */
	altitude: number;
	radius: number;
	night: number;
	power: number;
}

const NIGHT: Sky = {
	zenith: [0.012, 0.024, 0.06],
	glow: [0.055, 0.09, 0.16],
	far: [0.04, 0.07, 0.125],
	near: [0.006, 0.014, 0.034],
	light: [0.8, 0.87, 1],
	altitude: 0.52,
	radius: 0.03,
	night: 1,
	power: 0.6,
};
const DAY: Sky = {
	zenith: [0.4, 0.61, 0.82],
	glow: [0.84, 0.91, 0.95],
	far: [0.38, 0.57, 0.68],
	near: [0.03, 0.15, 0.27],
	light: [1, 0.96, 0.86],
	altitude: 0.5,
	radius: 0.04,
	night: 0,
	power: 0.75,
};
const DAWN: Sky = {
	zenith: [0.3, 0.38, 0.56],
	glow: [0.99, 0.69, 0.52],
	far: [0.47, 0.42, 0.48],
	near: [0.06, 0.11, 0.21],
	light: [1, 0.8, 0.58],
	altitude: 0.13,
	radius: 0.046,
	night: 0,
	power: 1,
};
const DUSK: Sky = {
	zenith: [0.2, 0.23, 0.42],
	glow: [0.98, 0.54, 0.32],
	far: [0.46, 0.33, 0.35],
	near: [0.05, 0.065, 0.15],
	light: [1, 0.63, 0.33],
	altitude: 0.1,
	radius: 0.046,
	night: 0,
	power: 1,
};

const DAYLINE: readonly (readonly [hour: number, sky: Sky])[] = [
	[0, NIGHT],
	[4.6, NIGHT],
	[6.2, DAWN],
	[9, DAY],
	[16, DAY],
	[18.8, DUSK],
	[20.6, NIGHT],
	[24, NIGHT],
];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
	lerp(a[0], b[0], t),
	lerp(a[1], b[1], t),
	lerp(a[2], b[2], t),
];

/** The sky at `hour` (0–24, fractional), blended between the keyed moments either side. */
export const skyAt = (hour: number): Sky => {
	const next = Math.max(
		1,
		DAYLINE.findIndex(([h]) => h > hour),
	);
	const [from, a] = DAYLINE[next - 1] ?? [0, NIGHT];
	const [to, b] = DAYLINE[next] ?? [24, NIGHT];
	const t = (hour - from) / (to - from);
	return {
		zenith: mix(a.zenith, b.zenith, t),
		glow: mix(a.glow, b.glow, t),
		far: mix(a.far, b.far, t),
		near: mix(a.near, b.near, t),
		light: mix(a.light, b.light, t),
		altitude: lerp(a.altitude, b.altitude, t),
		radius: lerp(a.radius, b.radius, t),
		night: lerp(a.night, b.night, t),
		power: lerp(a.power, b.power, t),
	};
};

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Whether dark type reads against the sky: on the horizon (the title) and overhead (the header). */
export const brightness = ({ glow, zenith }: Sky) => ({
	horizon: luminance(glow) > 0.45,
	overhead: luminance(zenith) > 0.4,
});
