/**
 * Bakes Natural Earth land (public domain) into the two assets the globe loads:
 * `field.png` (distance to the nearest coast per half-degree cell) and `coast.bin` (110m coastline rings).
 * Run: node scripts/build-field.ts <dir with ne_110m_land, ne_50m_land, ne_10m_minor_islands .geojson>
 * Sources: https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { FIELD } from "../field.ts";

type Ring = [number, number][];
interface Geometry {
	type: "Polygon" | "MultiPolygon";
	coordinates: Ring[] | Ring[][];
}
interface Collection {
	features: { geometry: Geometry }[];
}

const [dir] = process.argv.slice(2);
if (!dir) throw new Error("Pass the directory holding the Natural Earth GeoJSON files.");
const out = join(import.meta.dirname, "../assets");

const polygons = (name: string): Ring[][] =>
	(JSON.parse(readFileSync(join(dir, `${name}.geojson`), "utf8")) as Collection).features.flatMap(
		({ geometry }) =>
			geometry.type === "Polygon"
				? [geometry.coordinates as Ring[]]
				: (geometry.coordinates as Ring[][]),
	);

const { width: W, height: H, kmPerStep } = FIELD;
const cell = 360 / W;
const latAt = (y: number) => 90 - (y + 0.5) * cell;
const index = (lon: number, lat: number) => {
	const x = Math.min(W - 1, Math.max(0, Math.floor((lon + 180) / cell)));
	const y = Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / cell)));
	return y * W + x;
};

/** Even-odd scanline fill of polygon outer rings and holes, sampled at cell centres. */
const land = new Uint8Array(W * H);
const seed = new Uint8Array(W * H);
const fill = (rings: Ring[]) => {
	for (let y = 0; y < H; y++) {
		const lat = latAt(y);
		const crossings: number[] = [];
		for (const ring of rings) {
			for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
				const [x1, y1] = ring[i] as [number, number];
				const [x2, y2] = ring[j] as [number, number];
				if (y1 > lat !== y2 > lat) crossings.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
			}
		}
		crossings.sort((a, b) => a - b);
		for (let k = 0; k + 1 < crossings.length; k += 2) {
			const from = Math.ceil(((crossings[k] as number) + 180) / cell - 0.5);
			const to = Math.floor(((crossings[k + 1] as number) + 180) / cell - 0.5);
			for (let x = Math.max(0, from); x <= Math.min(W - 1, to); x++) land[y * W + x] = 1;
		}
	}
};

const detailed = polygons("ne_50m_land");
for (const rings of detailed) fill(rings);
seed.set(land);
/* Islands smaller than a cell still project a 200 nm zone: every vertex seeds the distance field. */
for (const rings of [...detailed, ...polygons("ne_10m_minor_islands")]) {
	for (const [lon, lat] of rings[0] ?? []) seed[index(lon, lat)] = 1;
}

const RAD = Math.PI / 180;
const EARTH_KM = 6371;
const REACH_KM = kmPerStep * 254;
const distance = new Float32Array(W * H).fill(REACH_KM);
const reachRows = Math.ceil(REACH_KM / 111.2 / cell);
for (let y = 0; y < H; y++) {
	for (let x = 0; x < W; x++) {
		if (!seed[y * W + x]) continue;
		const lat1 = latAt(y) * RAD;
		for (let yy = Math.max(0, y - reachRows); yy <= Math.min(H - 1, y + reachRows); yy++) {
			const lat2 = latAt(yy) * RAD;
			const span = Math.min(W / 2, Math.ceil(reachRows / Math.max(0.02, Math.cos(lat2))));
			for (let dx = -span; dx <= span; dx++) {
				const xx = (x + dx + W) % W;
				const at = yy * W + xx;
				if (seed[at]) continue;
				const dLon = dx * cell * RAD;
				const a =
					Math.sin((lat2 - lat1) / 2) ** 2 +
					Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
				const km = 2 * EARTH_KM * Math.asin(Math.sqrt(a));
				if (km < (distance[at] as number)) distance[at] = km;
			}
		}
	}
}

/* 0 = land, 1 = water at an unmapped island, then 1 + km / kmPerStep. */
const pixels = new Uint8Array(W * H);
let ocean = 0;
let high = 0;
for (let y = 0; y < H; y++) {
	const area = Math.cos(latAt(y) * RAD);
	for (let x = 0; x < W; x++) {
		const at = y * W + x;
		if (land[at]) continue;
		const km = seed[at] ? 0 : (distance[at] as number);
		pixels[at] = 1 + Math.min(254, Math.round(km / kmPerStep));
		ocean += area;
		if (km > FIELD.limitKm) high += area;
	}
}

const chunk = (type: string, data: Uint8Array) => {
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const head = Buffer.alloc(4);
	head.writeUInt32BE(data.length);
	const tail = Buffer.alloc(4);
	tail.writeUInt32BE(crc32(body));
	return Buffer.concat([head, body, tail]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(W, 0);
header.writeUInt32BE(H, 4);
header.set([8, 0, 0, 0, 0], 8);
const scanlines = Buffer.alloc((W + 1) * H);
for (let y = 0; y < H; y++) scanlines.set(pixels.subarray(y * W, (y + 1) * W), y * (W + 1) + 1);
writeFileSync(
	join(out, "field.png"),
	Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(scanlines, { level: 9 })),
		chunk("IEND", new Uint8Array()),
	]),
);

/* coast.bin: per ring, a uint16 point count then int16 (lon, lat) pairs in hundredths of a degree. */
const rings = polygons("ne_110m_land").flat();
const coast = new Int16Array(rings.reduce((n, ring) => n + 1 + ring.length * 2, 0));
let at = 0;
for (const ring of rings) {
	coast[at++] = ring.length;
	for (const [lon, lat] of ring) {
		coast[at++] = Math.round(lon * 100);
		coast[at++] = Math.round(lat * 100);
	}
}
writeFileSync(join(out, "coast.bin"), Buffer.from(coast.buffer));

console.log(`rings ${rings.length}, coast.bin ${coast.byteLength} B`);
console.log(
	`high seas ≈ ${((high / ocean) * 100).toFixed(1)}% of ocean (beyond ${FIELD.limitKm} km)`,
);
