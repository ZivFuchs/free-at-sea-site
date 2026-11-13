/** Low-precision ephemerides (after Meeus / the Astronomy Answers formulae): good to a fraction of a degree. */

const RAD = Math.PI / 180;
const TAU = Math.PI * 2;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;
/** Apparent rise/set of the sun's upper limb, with standard refraction. */
const SUN_HORIZON = -0.833;
const SUN_DISTANCE_KM = 149_598_000;

/** Degrees; east and north positive. */
export interface Place {
	lat: number;
	lng: number;
}

/** Degrees; azimuth clockwise from true north. */
export interface Horizontal {
	altitude: number;
	azimuth: number;
}

interface Equatorial {
	ra: number;
	dec: number;
}

const { sin, cos, tan, asin, acos, atan2 } = Math;

const daysSinceJ2000 = (date: Date) => date.getTime() / DAY - 0.5 + J1970 - J2000;

const equatorial = (lon: number, lat: number): Equatorial => ({
	ra: atan2(sin(lon) * cos(OBLIQUITY) - tan(lat) * sin(OBLIQUITY), cos(lon)),
	dec: asin(sin(lat) * cos(OBLIQUITY) + cos(lat) * sin(OBLIQUITY) * sin(lon)),
});

const sunCoords = (d: number) => {
	const anomaly = RAD * (357.5291 + 0.98560028 * d);
	const centre =
		RAD * (1.9148 * sin(anomaly) + 0.02 * sin(2 * anomaly) + 0.0003 * sin(3 * anomaly));
	return equatorial(anomaly + centre + RAD * 102.9372 + Math.PI, 0);
};

const moonCoords = (d: number) => {
	const longitude = RAD * (218.316 + 13.176396 * d);
	const anomaly = RAD * (134.963 + 13.064993 * d);
	const latitude = RAD * (93.272 + 13.22935 * d);
	return {
		...equatorial(longitude + RAD * 6.289 * sin(anomaly), RAD * 5.128 * sin(latitude)),
		distance: 385_001 - 20_905 * cos(anomaly),
	};
};

/** Local hour angle of a body, radians. */
const hourAngle = (d: number, { lng }: Place, ra: number) =>
	RAD * (280.16 + 360.9856235 * d) + RAD * lng - ra;

const horizontal = (h: number, { lat }: Place, dec: number): Horizontal => {
	const phi = RAD * lat;
	const altitude = asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(h));
	const fromSouth = atan2(sin(h), cos(h) * sin(phi) - tan(dec) * cos(phi));
	return { altitude: altitude / RAD, azimuth: ((((fromSouth + Math.PI) / RAD) % 360) + 360) % 360 };
};

export const sunPosition = (date: Date, place: Place): Horizontal => {
	const d = daysSinceJ2000(date);
	const { ra, dec } = sunCoords(d);
	return horizontal(hourAngle(d, place, ra), place, dec);
};

export const PHASES = [
	"New moon",
	"Waxing crescent",
	"First quarter",
	"Waxing gibbous",
	"Full moon",
	"Waning gibbous",
	"Last quarter",
	"Waning crescent",
] as const;

export interface Moon extends Horizontal {
	/** Lit share of the disc, 0–1. */
	fraction: number;
	/** 0 new → 0.5 full → 1 new. */
	phase: number;
	name: (typeof PHASES)[number];
	/** Direction of the bright limb as seen by the observer: degrees anticlockwise from "up" (towards the zenith). */
	tilt: number;
}

/** Narrow windows for the four principal phases, the wide ones between. */
const phaseName = (phase: number): Moon["name"] => {
	const edges = [0.03, 0.22, 0.28, 0.47, 0.53, 0.72, 0.78, 0.97];
	const index = edges.findIndex((edge) => phase < edge);
	return PHASES[index === -1 ? 0 : index] ?? PHASES[0];
};

export const moon = (date: Date, place: Place): Moon => {
	const d = daysSinceJ2000(date);
	const s = sunCoords(d);
	const m = moonCoords(d);
	const h = hourAngle(d, place, m.ra);
	const phi = RAD * place.lat;

	const elongation = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra));
	const incidence = atan2(
		SUN_DISTANCE_KM * sin(elongation),
		m.distance - SUN_DISTANCE_KM * cos(elongation),
	);
	/** Position angle of the bright limb, eastward from celestial north. */
	const limb = atan2(
		cos(s.dec) * sin(s.ra - m.ra),
		sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra),
	);
	const parallactic = atan2(sin(h), tan(phi) * cos(m.dec) - sin(m.dec) * cos(h));
	const phase = 0.5 + (0.5 * incidence * (limb < 0 ? -1 : 1)) / Math.PI;

	return {
		...horizontal(h, place, m.dec),
		fraction: (1 + cos(incidence)) / 2,
		phase,
		name: phaseName(phase),
		tilt: (limb - parallactic) / RAD,
	};
};

const M2_METRES = 0.34;
const S2_METRES = 0.15;
/** The ocean answers the moon late; a nominal lag, not a measured one. */
const TIDE_LAG = RAD * 28;

/**
 * Equilibrium-style semi-diurnal estimate: one bulge under the moon, a smaller one under the sun, so springs
 * and neaps fall out of the phase. Open-ocean scale, metres about mean level. Not a prediction.
 */
export const tideHeight = (date: Date, place: Place) => {
	const d = daysSinceJ2000(date);
	return (
		M2_METRES * cos(2 * (hourAngle(d, place, moonCoords(d).ra) - TIDE_LAG)) +
		S2_METRES * cos(2 * (hourAngle(d, place, sunCoords(d).ra) - TIDE_LAG))
	);
};
export const TIDE_RANGE = M2_METRES + S2_METRES;

/** First time after `from` (within `span`) that `f` changes sign, by coarse scan then bisection. */
const nextSignChange = (f: (date: Date) => number, from: Date, span: number, step: number) => {
	let a = from.getTime();
	let fa = f(from);
	for (let b = a + step; b <= from.getTime() + span; b += step) {
		const fb = f(new Date(b));
		if (fa !== 0 && Math.sign(fb) !== Math.sign(fa)) {
			let lo = a;
			let hi = b;
			while (hi - lo > MINUTE / 2) {
				const mid = (lo + hi) / 2;
				if (Math.sign(f(new Date(mid))) === Math.sign(fa)) lo = mid;
				else hi = mid;
			}
			return { at: new Date(hi), rising: fb > fa };
		}
		a = b;
		fa = fb;
	}
	return null;
};

export interface Crossing {
	at: Date;
	kind: string;
}

export interface Almanac {
	date: Date;
	sun: Horizontal;
	moon: Moon;
	/** The next sunrise and sunset, soonest first. */
	sunEvents: Crossing[];
	tide: { height: number; rising: boolean; next: Crossing | null };
}

export const almanac = (date: Date, place: Place): Almanac => {
	const sunAbove = (at: Date) => sunPosition(at, place).altitude - SUN_HORIZON;
	const slope = (at: Date) =>
		tideHeight(new Date(at.getTime() + MINUTE), place) - tideHeight(at, place);

	const first = nextSignChange(sunAbove, date, 26 * HOUR, 5 * MINUTE);
	const second =
		first && nextSignChange(sunAbove, new Date(first.at.getTime() + MINUTE), 26 * HOUR, 5 * MINUTE);
	const turn = nextSignChange(slope, date, 14 * HOUR, 10 * MINUTE);

	return {
		date,
		sun: sunPosition(date, place),
		moon: moon(date, place),
		sunEvents: [first, second]
			.filter((e) => e !== null)
			.map(({ at, rising }) => ({ at, kind: rising ? "Sunrise" : "Sunset" })),
		tide: {
			height: tideHeight(date, place),
			rising: slope(date) > 0,
			next: turn && { at: turn.at, kind: turn.rising ? "Low water" : "High water" },
		},
	};
};

/** Shortest signed turn from bearing `from` to `to`, degrees. */
export const turn = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

export const TIME = { MINUTE, HOUR, DAY, TAU };
