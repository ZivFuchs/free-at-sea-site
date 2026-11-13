export const RAD = Math.PI / 180;

export type Vec3 = readonly [number, number, number];
/** Column-major, as WebGL takes it. */
export type Mat3 = readonly [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
];

/** The oceanic pole of inaccessibility: the point at sea farthest from any land. */
export const SITE = { name: "Point Nemo", lat: -48.8767, lon: -123.3933 } as const;

const rows = (a: Vec3, b: Vec3, c: Vec3): Mat3 => [
	a[0],
	b[0],
	c[0],
	a[1],
	b[1],
	c[1],
	a[2],
	b[2],
	c[2],
];

export const apply = (m: Mat3, v: Vec3): Vec3 => [
	m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
	m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
	m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];

export const transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

/** Unit vector on the celestial sphere, from degrees. */
export const equatorial = (ra: number, dec: number): Vec3 => [
	Math.cos(dec * RAD) * Math.cos(ra * RAD),
	Math.cos(dec * RAD) * Math.sin(ra * RAD),
	Math.sin(dec * RAD),
];

/** Sun's apparent place in degrees (low-precision almanac formula, good to ~0.01°). */
export const sunPlace = (date: Date) => {
	const d = date.getTime() / 86_400_000 - 10_957.5;
	const g = (357.528 + 0.9856003 * d) * RAD;
	const lambda = (280.46 + 0.9856474 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
	const tilt = (23.439 - 0.0000004 * d) * RAD;
	return {
		ra: Math.atan2(Math.cos(tilt) * Math.sin(lambda), Math.cos(lambda)) / RAD,
		dec: Math.asin(Math.sin(tilt) * Math.sin(lambda)) / RAD,
	};
};

/**
 * The night at `lat` as a run of local sidereal time (degrees): from the evening the sun sinks `dusk`° below
 * the horizon to the morning it climbs back to `dawn`°. Falls back to a fixed span where it never gets there.
 */
export const nightSpan = (
	lat: number,
	sun: ReturnType<typeof sunPlace>,
	dusk = -10,
	dawn = -5.5,
) => {
	const hourAngle = (edge: number) => {
		const cos =
			(Math.sin(edge * RAD) - Math.sin(lat * RAD) * Math.sin(sun.dec * RAD)) /
			(Math.cos(lat * RAD) * Math.cos(sun.dec * RAD));
		return Math.abs(cos) < 1 ? Math.acos(cos) / RAD : 120;
	};
	const start = sun.ra + hourAngle(dusk);
	return { start, span: sun.ra + 360 - hourAngle(dawn) - start };
};

/** Equatorial → horizon `[east, north, up]` at latitude `lat` and local sidereal time `lst` (degrees). */
export const toHorizon = (lat: number, lst: number): Mat3 => {
	const [sp, cp] = [Math.sin(lat * RAD), Math.cos(lat * RAD)];
	const [sl, cl] = [Math.sin(lst * RAD), Math.cos(lst * RAD)];
	return rows([-sl, cl, 0], [-sp * cl, -sp * sl, cp], [cp * cl, cp * sl, sp]);
};

/** Horizon → view `[right, up, forward]` for a camera at azimuth `az` (from north through east) and altitude `alt`. */
export const toView = (az: number, alt: number): Mat3 => {
	const [sa, ca] = [Math.sin(az * RAD), Math.cos(az * RAD)];
	const [sh, ch] = [Math.sin(alt * RAD), Math.cos(alt * RAD)];
	return rows([ca, -sa, 0], [-sa * sh, -ca * sh, ch], [sa * ch, ca * ch, sh]);
};

export const altitude = (horizon: Vec3) => Math.asin(Math.min(Math.max(horizon[2], -1), 1)) / RAD;
export const azimuth = (horizon: Vec3) => (Math.atan2(horizon[0], horizon[1]) / RAD + 360) % 360;

const pad = (n: number) => String(n).padStart(2, "0");

/** `41°07′` */
export const arc = (degrees: number) => {
	const minutes = Math.round(Math.abs(degrees) * 60);
	return `${degrees < 0 ? "−" : ""}${Math.floor(minutes / 60)}°${pad(minutes % 60)}′`;
};

/** Degrees of rotation as a clock: `03h 41m` or `03:41`. */
export const clock = (degrees: number, sidereal = false) => {
	const minutes = Math.floor(((((degrees / 15) % 24) + 24) % 24) * 60);
	const [h, m] = [pad(Math.floor(minutes / 60)), pad(minutes % 60)];
	return sidereal ? `${h}h ${m}m` : `${h}:${m}`;
};

export const coordinates = (lat: number, lon: number) =>
	`${arc(Math.abs(lat))}${lat < 0 ? "S" : "N"} ${arc(Math.abs(lon))}${lon < 0 ? "W" : "E"}`;
