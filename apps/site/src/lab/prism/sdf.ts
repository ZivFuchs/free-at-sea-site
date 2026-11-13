const INF = 1e20;

/** One pass of the Felzenszwalb squared-distance transform along a row or column of `grid`. */
const edt1d = (
	grid: Float64Array,
	offset: number,
	stride: number,
	n: number,
	f: Float64Array,
	v: Uint16Array,
	z: Float64Array,
) => {
	const at = (a: Float64Array | Uint16Array, i: number) => a[i] ?? 0;
	v[0] = 0;
	z[0] = -INF;
	z[1] = INF;
	f[0] = at(grid, offset);
	for (let q = 1, k = 0, s = 0; q < n; q++) {
		f[q] = at(grid, offset + q * stride);
		const q2 = q * q;
		do {
			const r = at(v, k);
			s = (at(f, q) - at(f, r) + q2 - r * r) / (q - r) / 2;
		} while (s <= at(z, k) && --k > -1);
		k++;
		v[k] = q;
		z[k] = s;
		z[k + 1] = INF;
	}
	for (let q = 0, k = 0; q < n; q++) {
		while (at(z, k + 1) < q) k++;
		const r = at(v, k);
		grid[offset + q * stride] = at(f, r) + (q - r) * (q - r);
	}
};

const edt = (grid: Float64Array, width: number, height: number) => {
	const size = Math.max(width, height);
	const f = new Float64Array(size);
	const z = new Float64Array(size + 1);
	const v = new Uint16Array(size);
	for (let x = 0; x < width; x++) edt1d(grid, x, width, height, f, v, z);
	for (let y = 0; y < height; y++) edt1d(grid, y * width, 1, width, f, v, z);
};

/** Two box passes each way: the transform is exact per pixel, which leaves terraces in the shaded normals. */
const smooth = (data: Float32Array, width: number, height: number, radius = 2) => {
	const line = new Float32Array(Math.max(width, height));
	const pass = (offset: number, stride: number, n: number) => {
		for (let i = 0; i < n; i++) line[i] = data[offset + i * stride] ?? 0;
		let sum = 0;
		for (let i = -radius; i <= radius; i++) sum += line[Math.min(Math.max(i, 0), n - 1)] ?? 0;
		for (let i = 0; i < n; i++) {
			data[offset + i * stride] = sum / (radius * 2 + 1);
			sum += (line[Math.min(i + radius + 1, n - 1)] ?? 0) - (line[Math.max(i - radius, 0)] ?? 0);
		}
	};
	for (let k = 0; k < 2; k++) {
		for (let y = 0; y < height; y++) pass(y * width, 1, width);
		for (let x = 0; x < width; x++) pass(x, width, height);
	}
};

export interface Field {
	/** Signed distance to the letter outlines in cap-heights (negative inside), bottom row first. */
	data: Float32Array;
	width: number;
	height: number;
	/** Half extents of the tile in cap-heights. */
	half: readonly [number, number];
	/** Tile centre above the baseline, in cap-heights. */
	centerY: number;
	/** Width of the set text in cap-heights. */
	textWidth: number;
}

/** Sets `text` on a canvas and returns its signed distance field, scaled so the cap height is 1. */
export const textField = (
	text: string,
	family: string,
	width: number,
	height: number,
): Field | null => {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return null;
	const font = (px: number) => `900 ${px}px ${family}`;
	ctx.font = font(100);
	const cap100 = ctx.measureText("E").actualBoundingBoxAscent;
	const px = 100 * Math.min((width * 0.9) / ctx.measureText(text).width, (height * 0.56) / cap100);
	const cap = (cap100 * px) / 100;
	const baseline = Math.round(height / 2 + cap / 2);
	ctx.font = font(px);
	ctx.textAlign = "center";
	ctx.fillStyle = "#fff";
	ctx.fillText(text, width / 2, baseline);
	const textWidth = ctx.measureText(text).width / cap;

	const alpha = ctx.getImageData(0, 0, width, height).data;
	const outer = new Float64Array(width * height);
	const inner = new Float64Array(width * height);
	for (let i = 0; i < outer.length; i++) {
		const a = (alpha[i * 4 + 3] ?? 0) / 255;
		outer[i] = a === 1 ? 0 : a === 0 ? INF : Math.max(0, 0.5 - a) ** 2;
		inner[i] = a === 1 ? INF : a === 0 ? 0 : Math.max(0, a - 0.5) ** 2;
	}
	edt(outer, width, height);
	edt(inner, width, height);

	const data = new Float32Array(width * height);
	for (let y = 0; y < height; y++) {
		const from = (height - 1 - y) * width;
		for (let x = 0; x < width; x++) {
			data[y * width + x] =
				(Math.sqrt(outer[from + x] ?? 0) - Math.sqrt(inner[from + x] ?? 0)) / cap;
		}
	}
	smooth(data, width, height);
	return {
		data,
		width,
		height,
		half: [width / cap / 2, height / cap / 2],
		centerY: (baseline - height / 2) / cap,
		textWidth,
	};
};
