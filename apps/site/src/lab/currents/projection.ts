/** Equal Earth projection (Šavrič, Patterson, Jenny 2018), centred on the Pacific. Units: x ±2.7066, y ±1.3173. */
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
const RAD = Math.PI / 180;

/** Central meridian: the map splits through Africa, leaving the Pacific whole. */
export const LON0 = -160;
const EXTENT = { x: 2.7066, y: 1.3173 };

export type Point = [x: number, y: number];

/** Longitude as degrees east of the central meridian, -180…180. */
export const relative = (lon: number) => ((((lon - LON0 + 180) % 360) + 360) % 360) - 180;

/** `rel` (degrees from the central meridian, may run past ±180) and latitude → map units, into `out`. */
export const project = (rel: number, lat: number, out: Point) => {
	const t = Math.asin(M * Math.sin(lat * RAD));
	const t2 = t * t;
	const t6 = t2 * t2 * t2;
	out[0] = (rel * RAD * Math.cos(t)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
	out[1] = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
	return out;
};

/** Map units → `[rel, lat]` in degrees, into `out`. False when the point is off the map. */
export const unproject = (x: number, y: number, out: Point) => {
	if (Math.abs(y) > EXTENT.y) return false;
	let t = y;
	for (let i = 0; i < 8; i++) {
		const t2 = t * t;
		const t6 = t2 * t2 * t2;
		const f = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)) - y;
		t -= f / (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2));
	}
	const t2 = t * t;
	const t6 = t2 * t2 * t2;
	const rel = (M * x * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))) / Math.cos(t) / RAD;
	if (Math.abs(rel) > 180) return false;
	out[0] = rel;
	out[1] = Math.asin(Math.min(Math.max(Math.sin(t) / M, -1), 1)) / RAD;
	return true;
};
