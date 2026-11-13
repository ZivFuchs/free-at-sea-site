export interface Field {
	width: number;
	height: number;
	/** Per texel: x and y gradient of the potential, the source (words − halo), unused. */
	data: Float32Array;
}

const SWEEPS = 70;
const COARSEST = 24;
const OMEGA = 1.72;

/** Gauss–Seidel with over-relaxation for ∇²φ = −f, zero-flux edges. */
const relax = (phi: Float32Array, f: Float32Array, w: number, h: number, sweeps: number) => {
	for (let s = 0; s < sweeps; s++) {
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const i = y * w + x;
				const here = phi[i] ?? 0;
				const sum =
					(x > 0 ? (phi[i - 1] ?? 0) : here) +
					(x < w - 1 ? (phi[i + 1] ?? 0) : here) +
					(y > 0 ? (phi[i - w] ?? 0) : here) +
					(y < h - 1 ? (phi[i + w] ?? 0) : here);
				phi[i] = here + OMEGA * ((sum + (f[i] ?? 0)) / 4 - here);
			}
		}
	}
};

/** Solve on a half-size grid first, then refine: each level only has to fix its own scale. */
const solve = (f: Float32Array, w: number, h: number): Float32Array => {
	const phi = new Float32Array(w * h);
	if (Math.min(w, h) <= COARSEST) {
		relax(phi, f, w, h, 240);
		return phi;
	}
	const cw = Math.ceil(w / 2);
	const ch = Math.ceil(h / 2);
	const coarse = new Float32Array(cw * ch);
	for (let y = 0; y < ch; y++) {
		for (let x = 0; x < cw; x++) {
			const x1 = Math.min(2 * x + 1, w - 1);
			const y1 = Math.min(2 * y + 1, h - 1);
			coarse[y * cw + x] =
				(f[2 * y * w + 2 * x] ?? 0) +
				(f[2 * y * w + x1] ?? 0) +
				(f[y1 * w + 2 * x] ?? 0) +
				(f[y1 * w + x1] ?? 0);
		}
	}
	const up = solve(coarse, cw, ch);
	const at = (x: number, y: number) =>
		up[Math.min(Math.max(y, 0), ch - 1) * cw + Math.min(Math.max(x, 0), cw - 1)] ?? 0;
	for (let y = 0; y < h; y++) {
		const fy = (y + 0.5) / 2 - 0.5;
		const y0 = Math.floor(fy);
		const ty = fy - y0;
		for (let x = 0; x < w; x++) {
			const fx = (x + 0.5) / 2 - 0.5;
			const x0 = Math.floor(fx);
			const tx = fx - x0;
			phi[y * w + x] =
				(at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) +
				(at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
		}
	}
	relax(phi, f, w, h, SWEEPS);
	return phi;
};

const boxBlur = (src: Float32Array, w: number, h: number, radius: number) => {
	const pass = (from: Float32Array, n: number, lines: number, step: number, stride: number) => {
		const to = new Float32Array(from.length);
		for (let l = 0; l < lines; l++) {
			const base = l * stride;
			let sum = 0;
			const sample = (i: number) => from[base + Math.min(Math.max(i, 0), n - 1) * step] ?? 0;
			for (let i = -radius; i <= radius; i++) sum += sample(i);
			for (let i = 0; i < n; i++) {
				to[base + i * step] = sum / (2 * radius + 1);
				sum += sample(i + radius + 1) - sample(i - radius);
			}
		}
		return to;
	};
	let out = src;
	for (let i = 0; i < 3; i++) {
		out = pass(out, w, h, 1, w);
		out = pass(out, h, w, w, 1);
	}
	return out;
};

/**
 * The lens that focuses flat light into `mask` (0–1, row-major): a potential φ with ∇²φ = −(mask − halo). Bending
 * rays along ∇φ brightens the letters with light borrowed from a soft halo around them, so nothing changes far
 * from the words.
 */
export const lightField = (
	mask: Float32Array,
	width: number,
	height: number,
	halo: number,
): Field => {
	const soft = boxBlur(mask, width, height, Math.max(1, Math.round(halo)));
	let total = 0;
	let softTotal = 0;
	for (let i = 0; i < mask.length; i++) {
		total += mask[i] ?? 0;
		softTotal += soft[i] ?? 0;
	}
	const norm = softTotal > 0 ? total / softTotal : 0;
	const f = mask.map((v, i) => v - (soft[i] ?? 0) * norm);
	const phi = solve(f, width, height);

	const data = new Float32Array(width * height * 4);
	const at = (x: number, y: number) =>
		phi[Math.min(Math.max(y, 0), height - 1) * width + Math.min(Math.max(x, 0), width - 1)] ?? 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			data[i] = (at(x + 1, y) - at(x - 1, y)) / 2;
			data[i + 1] = (at(x, y + 1) - at(x, y - 1)) / 2;
			data[i + 2] = f[y * width + x] ?? 0;
		}
	}
	return { width, height, data };
};
