import { clamp, lerp, smoothstep } from "@/lab/lib/motion";

/** World units are kilometres along (`s`) and across (`x`) the survey track; depth is metres, positive down. */
export const TRACK_LENGTH = 320;
export const HALF_WIDTH = 55;
/** Vertical exaggeration of the rendered relief. */
export const EXAGGERATION = 3.6;

/** Survey origin: open South Pacific, far outside any exclusive economic zone. Degrees south and west. */
export const ORIGIN = { lat: 30, lon: 120 };
export const KM_PER_DEGREE = 111.2;

const hash = (x: number, y: number) => {
	let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const noise = (x: number, y: number) => {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
	const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
	return lerp(
		lerp(hash(ix, iy), hash(ix + 1, iy), ux),
		lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux),
		uy,
	);
};

const fbm = (x: number, y: number, octaves: number) => {
	let v = 0;
	let a = 0.5;
	for (let i = 0; i < octaves; i++) {
		v += a * noise(x, y);
		[x, y] = [1.6 * x + 1.2 * y + 7.3, -1.2 * x + 1.6 * y + 3.1];
		a *= 0.5;
	}
	return v;
};

/** Ridged multifractal, 0–1: sharp crests whose detail gathers on the high ground. */
const ridged = (x: number, y: number, octaves: number) => {
	let v = 0;
	let a = 0.5;
	let weight = 1;
	for (let i = 0; i < octaves; i++) {
		const crest = 1 - Math.abs(2 * noise(x, y) - 1);
		const n = crest * crest * weight;
		weight = clamp(n * 2);
		v += a * n;
		[x, y] = [1.6 * x + 1.2 * y + 5.2, -1.2 * x + 1.6 * y + 1.7];
		a *= 0.5;
	}
	return v;
};

const gauss = (d: number, r: number) => Math.exp(-((d / r) ** 2));

const SEAMOUNTS: readonly (readonly [x: number, s: number, height: number, radius: number])[] = [
	[13, 40, 2500, 7.5],
	[-21, 58, 1500, 5.5],
	[-30, 22, 900, 4.5],
	[27, 178, 1900, 6],
	[-9, 196, 800, 4],
];

/** The survey line wanders gently across the strip. */
export const trackX = (s: number) => 7 * Math.sin(s * 0.021 + 0.6) + 3 * Math.sin(s * 0.047);

/** Seafloor depth in metres: abyssal plain and seamounts, a spreading ridge, a trench, then a rise to a shallow bank. */
export const depthAt = (x: number, s: number) => {
	let depth =
		4300 +
		520 * (fbm(x * 0.04, s * 0.04, 4) - 0.5) +
		380 * (ridged(x * 0.09 + 11, s * 0.06, 4) - 0.4) +
		50 * (fbm(x * 0.4, s * 0.4, 3) - 0.5);

	for (const [mx, ms, height, radius] of SEAMOUNTS) {
		const d = Math.hypot(x - mx, s - ms);
		if (d > radius * 3) continue;
		const rough = 0.75 + 0.5 * ridged(x * 0.16 + mx, s * 0.16, 4);
		depth -= height * gauss(d, radius) * rough;
	}

	// Spreading ridge: crest oblique to the track, offset by a transform fault, hills running parallel to the axis.
	const fault = 9 * smoothstep(-5, 5, x - 6 - 0.04 * (s - 115));
	const sr = s - 112 - 0.22 * x - fault;
	const flank = gauss(sr, 30);
	depth -= 1900 * flank;
	depth -= 1250 * flank * (ridged(x * 0.03 + 3, sr * 0.11, 3) - 0.35);
	depth += 800 * gauss(sr, 3.2);

	// Trench: outer rise, then a steep asymmetric drop.
	const st = s - 238 - 0.12 * x - 5 * Math.sin(x * 0.05);
	depth -= 320 * gauss(st + 20, 9);
	depth += 4300 * gauss(st, st < 0 ? 9 : 5.5);

	// Beyond the trench the wall climbs, cut by canyons, to a bank just under the surface.
	const rise = smoothstep(242, 300, s + 0.1 * x);
	depth -=
		rise *
		(4050 + 1500 * (ridged(x * 0.07, s * 0.05, 5) - 0.45) * (1 - 0.6 * smoothstep(285, 315, s)));

	return Math.max(depth, 35 + 40 * fbm(x * 0.2, s * 0.2, 3));
};

export const elevation = (x: number, s: number) => (-depthAt(x, s) / 1000) * EXAGGERATION;
