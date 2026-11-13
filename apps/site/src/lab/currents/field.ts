/**
 * An illustrative model of mean surface circulation, not data: five subtropical gyres with western
 * intensification, two subpolar gyres, the equatorial system, the Antarctic Circumpolar Current and eddies.
 * Sampled once to a 1° grid; velocities are normalised so the fastest water is ~1.
 */
const W = 360;
const H = 181;

interface Basin {
	west: number;
	east: number;
	south: number;
	north: number;
	/** Positive turns clockwise. */
	strength: number;
}

const BASINS: readonly Basin[] = [
	{ west: 122, east: 250, south: 8, north: 50, strength: 1 },
	{ west: 150, east: 290, south: -50, north: -6, strength: -1 },
	{ west: 280, east: 355, south: 8, north: 52, strength: 0.85 },
	{ west: 308, east: 378, south: -48, north: -6, strength: -0.7 },
	{ west: 30, east: 118, south: -48, north: -6, strength: -0.8 },
	{ west: 140, east: 235, south: 44, north: 62, strength: -0.3 },
	{ west: 300, east: 352, south: 50, north: 66, strength: -0.25 },
];
/** Width of the western boundary layer as a share of the basin (Stommel). */
const BOUNDARY = 0.09;

const gyre = (lon: number, lat: number, b: Basin) => {
	let l = ((lon % 360) + 360) % 360;
	if (l < b.west) l += 360;
	const x = (l - b.west) / (b.east - b.west);
	const y = (lat - b.south) / (b.north - b.south);
	if (x <= 0 || x >= 1 || y <= 0 || y >= 1) return 0;
	return b.strength * 30 * (1 - Math.exp(-x / BOUNDARY)) * (1 - x) * Math.sin(Math.PI * y);
};

const eddies = (lon: number, lat: number) => {
	const a = lon * (Math.PI / 180);
	return (
		0.55 * Math.sin(a * 7 + 1.3) * Math.cos(lat / 5.5) +
		0.3 * Math.sin(a * 12 - lat / 7 + 0.4) +
		0.16 * Math.cos(a * 21 + lat / 3.4)
	);
};

const stream = (lon: number, lat: number) =>
	BASINS.reduce((sum, b) => sum + gyre(lon, lat, b), eddies(lon, lat));

const bell = (v: number, centre: number, width: number) => Math.exp(-(((v - centre) / width) ** 2));

export const createField = () => {
	const u = new Float32Array(W * H);
	const v = new Float32Array(W * H);
	let max = 0;
	for (let j = 0; j < H; j++) {
		const lat = j - 90;
		for (let i = 0; i < W; i++) {
			const lon = i - 180;
			const acc = bell(lat, -57, 7);
			const k = j * W + i;
			u[k] =
				-(stream(lon, lat + 0.5) - stream(lon, lat - 0.5)) +
				2.4 * acc +
				1.1 * bell(lat, 6, 2.2) -
				1.3 * bell(lat, -1, 2.6);
			v[k] =
				stream(lon + 0.5, lat) -
				stream(lon - 0.5, lat) +
				0.45 * acc * Math.sin((lon * Math.PI) / 28);
			max = Math.max(max, Math.hypot(u[k] ?? 0, v[k] ?? 0));
		}
	}
	/** Boundary currents are several times faster than the rest; compress so the interior still moves. */
	for (let k = 0; k < u.length; k++) {
		const s = Math.hypot(u[k] ?? 0, v[k] ?? 0) / max;
		const gain = s > 0 ? s ** 0.7 / s / max : 0;
		u[k] = (u[k] ?? 0) * gain;
		v[k] = (v[k] ?? 0) * gain;
	}

	/** Bilinear sample at a longitude/latitude in degrees, into `out` as `[east, north]`. */
	return (lon: number, lat: number, out: [number, number]) => {
		const x = (((lon + 180) % 360) + 360) % 360;
		const y = Math.min(Math.max(lat + 90, 0), H - 1.001);
		const i = Math.floor(x);
		const j = Math.floor(y);
		const fx = x - i;
		const fy = y - j;
		const i1 = (i + 1) % W;
		const a = j * W + i;
		const b = j * W + i1;
		const c = a + W;
		const d = b + W;
		out[0] =
			((u[a] ?? 0) * (1 - fx) + (u[b] ?? 0) * fx) * (1 - fy) +
			((u[c] ?? 0) * (1 - fx) + (u[d] ?? 0) * fx) * fy;
		out[1] =
			((v[a] ?? 0) * (1 - fx) + (v[b] ?? 0) * fx) * (1 - fy) +
			((v[c] ?? 0) * (1 - fx) + (v[d] ?? 0) * fx) * fy;
		return out;
	};
};
