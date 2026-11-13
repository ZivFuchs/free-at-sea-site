/** The assumed sensor behind the photograph. Altitude sets the scale of everything derived from it. */
export const SENSOR = { height: 120, vfov: (46 * Math.PI) / 180, horizon: 0.178, maxRange: 3000 };
const HULL = 3.2;
const CABIN = 2.6;
const TENDER = 1.1;

type Px = readonly [number, number];
/** Hand-picked in the 2880×1620 frame: the barge's near waterline (bow → stern) and its stern edge. */
const WATERLINE: readonly [Px, Px, Px] = [
	[1273, 968],
	[1546, 1038],
	[1598, 1003],
];
const BARGE_BOX = { x0: 1250, y0: 928, x1: 1622, y1: 1052 };
const TENDER_BOX = { x0: 1846, y0: 1060, x1: 1932, y1: 1106 };
const FRAME = { width: 2880, height: 1620 };

export const KIND = { sea: 0, sky: 1, vessel: 2 } as const;

export interface Cloud {
	count: number;
	position: Float32Array;
	color: Uint8Array;
	/** World size of the pixel footprint each point stands for. */
	size: Float32Array;
	/** Distance from the sensor. */
	range: Float32Array;
	seed: Float32Array;
	kind: Float32Array;
	/** World is centred on the vessel; +y up, metres. */
	sensor: [number, number, number];
	/** Unit vectors along the vessel's length and beam (xz), and its measured box. */
	axis: [number, number];
	beamAxis: [number, number];
	length: number;
	beam: number;
	height: number;
	/** Where the frame's corners land: top-left, top-right, bottom-right, bottom-left. */
	corners: [number, number, number][];
}

type Vec3 = [number, number, number];

export const reconstruct = (
	image: ImageBitmap | HTMLImageElement,
	detail: number,
): Cloud | null => {
	const canvas = document.createElement("canvas");
	canvas.width = FRAME.width;
	canvas.height = FRAME.height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return null;
	ctx.drawImage(image, 0, 0, FRAME.width, FRAME.height);
	const { data } = ctx.getImageData(0, 0, FRAME.width, FRAME.height);

	const { height: H, vfov, horizon, maxRange } = SENSOR;
	const T = Math.tan(vfov / 2);
	const aspect = FRAME.width / FRAME.height;
	const pitch = Math.atan((1 - 2 * horizon) * T);
	const cos = Math.cos(pitch);
	const sin = Math.sin(pitch);
	const pixelAngle = (2 * T) / FRAME.height;

	const ray = (px: number, py: number): Vec3 => {
		const x = (px / FRAME.width - 0.5) * 2 * T * aspect;
		const y = (0.5 - py / FRAME.height) * 2 * T;
		return [x, y * cos - sin, -cos - y * sin];
	};
	/** Where a ray meets the horizontal plane at `h`, or the far curtain if it never does in range. */
	const cast = (d: Vec3, h = 0): { p: Vec3; sky: boolean } => {
		const flat = Math.hypot(d[0], d[2]);
		const t = d[1] < 0 ? (H - h) / -d[1] : Number.POSITIVE_INFINITY;
		if (t * flat <= maxRange) return { p: [d[0] * t, h, d[2] * t], sky: false };
		const far = maxRange / flat;
		return { p: [d[0] * far, H + d[1] * far, d[2] * far], sky: d[1] >= 0 };
	};

	const [a, b, c] = WATERLINE.map(([x, y]) => cast(ray(x, y)).p) as [Vec3, Vec3, Vec3];
	const e1: [number, number] = [b[0] - a[0], b[2] - a[2]];
	const e2: [number, number] = [c[0] - b[0], c[2] - b[2]];
	const det = e1[0] * e2[1] - e1[1] * e2[0];
	const centre: [number, number] = [a[0] + (e1[0] + e2[0]) / 2, a[2] + (e1[1] + e2[1]) / 2];
	/** Footprint coordinates: u along the length, v across the beam, both 0–1 on deck. */
	const local = (p: Vec3): [number, number] => {
		const x = p[0] - a[0];
		const z = p[2] - a[2];
		return [(x * e2[1] - z * e2[0]) / det, (e1[0] * z - e1[1] * x) / det];
	};
	/** Ray against the vertical plane through `o` along `e`. */
	const wall = (d: Vec3, o: Vec3, e: [number, number], top = HULL): Vec3 => {
		const t = (o[0] * e[1] - o[2] * e[0]) / (d[0] * e[1] - d[2] * e[0]);
		return [d[0] * t, Math.min(Math.max(H + d[1] * t, 0), top), d[2] * t];
	};

	const step = detail >= 1 ? 5 : 8;
	const dense = detail >= 1 ? 4 : 2;
	const inBox = (box: typeof BARGE_BOX, x: number, y: number) =>
		x >= box.x0 && x < box.x1 && y >= box.y0 && y < box.y1;
	const boxArea = (box: typeof BARGE_BOX) => (box.x1 - box.x0) * (box.y1 - box.y0);
	const capacity =
		Math.ceil(FRAME.width / step) * Math.ceil(FRAME.height / step) +
		(boxArea(BARGE_BOX) + boxArea(TENDER_BOX)) * dense;

	const position = new Float32Array(capacity * 3);
	const color = new Uint8Array(capacity * 3);
	const size = new Float32Array(capacity);
	const range = new Float32Array(capacity);
	const seed = new Float32Array(capacity);
	const kind = new Float32Array(capacity);
	let count = 0;

	const push = (p: Vec3, k: number, rgb: readonly [number, number, number], spread: number) => {
		const i = count++;
		position.set([p[0] - centre[0], p[1], p[2] - centre[1]], i * 3);
		color.set(rgb, i * 3);
		const r = Math.hypot(p[0], p[1] - H, p[2]);
		range[i] = r;
		size[i] = r * pixelAngle * spread;
		seed[i] = Math.random();
		kind[i] = k;
	};
	const texel = (x: number, y: number): [number, number, number] => {
		const i =
			(Math.min(Math.max(Math.round(y), 0), FRAME.height - 1) * FRAME.width +
				Math.min(Math.max(Math.round(x), 0), FRAME.width - 1)) *
			4;
		return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
	};
	const luma = ([r, g, b]: readonly [number, number, number]) =>
		(0.3 * r + 0.59 * g + 0.11 * b) / 255;

	const water = (x: number, y: number, spread: number) => {
		const rgb = texel(x, y);
		const { p, sky } = cast(ray(x, y));
		// A little relief from brightness, so swell reads when the cloud is seen edge-on.
		if (!sky && p[1] === 0) p[1] = (luma(rgb) - 0.15) * 4;
		push(p, sky ? KIND.sky : KIND.sea, rgb, spread);
	};

	for (let y = step / 2; y < FRAME.height; y += step) {
		for (let x = step / 2; x < FRAME.width; x += step) {
			if (inBox(BARGE_BOX, x, y) || inBox(TENDER_BOX, x, y)) continue;
			water(x, y, step * 1.5);
		}
	}

	const fine = 2.2 / Math.sqrt(dense);
	for (let y = BARGE_BOX.y0; y < BARGE_BOX.y1; y++) {
		for (let x = BARGE_BOX.x0; x < BARGE_BOX.x1; x++) {
			const rgb = texel(x, y);
			const [r, g, bl] = rgb;
			const lum = luma(rgb);
			const rust = r > g * 1.08 && r > 70;
			const cabin = bl > r * 1.3 && lum > 0.34;
			if (!rust && !cabin && lum < 0.36) {
				water(x + 0.5, y + 0.5, 1.6);
				continue;
			}
			for (let s = 0; s < dense; s++) {
				const d = ray(x + Math.random(), y + Math.random());
				if (cabin) {
					const roof = cast(d, HULL + CABIN).p;
					// A roof hit short of the near edge is really the container's face, standing at that edge.
					push(local(roof)[1] < 0 ? wall(d, a, e1, HULL + CABIN) : roof, KIND.vessel, rgb, fine);
					continue;
				}
				const deck = cast(d, HULL).p;
				const [u, v] = local(deck);
				const p = v < -0.03 && u <= 1.02 ? wall(d, a, e1) : u > 1.02 ? wall(d, b, e2) : deck;
				push(p, KIND.vessel, rgb, fine);
			}
		}
	}
	for (let y = TENDER_BOX.y0; y < TENDER_BOX.y1; y++) {
		for (let x = TENDER_BOX.x0; x < TENDER_BOX.x1; x++) {
			const rgb = texel(x, y);
			if (luma(rgb) < 0.42) {
				water(x + 0.5, y + 0.5, 1.6);
				continue;
			}
			for (let s = 0; s < dense; s++) {
				push(cast(ray(x + Math.random(), y + Math.random()), TENDER).p, KIND.vessel, rgb, fine);
			}
		}
	}

	const length = Math.hypot(...e1);
	const beam = Math.hypot(...e2);
	const corner = (x: number, y: number): Vec3 => {
		const { p } = cast(ray(x, y));
		return [p[0] - centre[0], p[1], p[2] - centre[1]];
	};
	return {
		count,
		position: position.subarray(0, count * 3),
		color: color.subarray(0, count * 3),
		size: size.subarray(0, count),
		range: range.subarray(0, count),
		seed: seed.subarray(0, count),
		kind: kind.subarray(0, count),
		sensor: [-centre[0], H, -centre[1]],
		axis: [e1[0] / length, e1[1] / length],
		beamAxis: [e2[0] / beam, e2[1] / beam],
		length,
		beam,
		height: HULL + CABIN,
		corners: [
			corner(0, 0),
			corner(FRAME.width, 0),
			corner(FRAME.width, FRAME.height),
			corner(0, FRAME.height),
		],
	};
};
