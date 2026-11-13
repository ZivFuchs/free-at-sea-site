import type { Growth, Site } from "./types";

const FEED = 0.029;
const KILL = 0.057;
const ITERATIONS = 12;

const smooth = (a: number, b: number, v: number) => {
	const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
	return t * t * (3 - 2 * t);
};

/** Reaction–diffusion (Gray–Scott, in its maze regime) spreading from a few spores inside a soft outline. */
export const polyp = ({ x, y, r, blocked, rng }: Site): Growth => {
	const g = r > 150 ? 128 : 104;
	const size = g * g;
	let u = new Float32Array(size).fill(1);
	let v = new Float32Array(size);
	let u2 = new Float32Array(size);
	let v2 = new Float32Array(size);
	const inside = new Uint8Array(size);
	const phaseA = rng() * 6.28;
	const phaseB = rng() * 6.28;
	const cell = (2 * r) / g;
	const outline = (a: number) =>
		0.4 + 0.05 * Math.sin(3 * a + phaseA) + 0.04 * Math.sin(5 * a + phaseB);

	for (let j = 1; j < g - 1; j++) {
		for (let i = 1; i < g - 1; i++) {
			const ox = (i + 0.5) / g - 0.5;
			const oy = (j + 0.5) / g - 0.5;
			const a = Math.atan2(oy, ox);
			if (
				Math.hypot(ox, oy) < outline(a) &&
				!blocked(x - r + (i + 0.5) * cell, y - r + (j + 0.5) * cell)
			)
				inside[j * g + i] = 1;
		}
	}
	for (let s = 0; s < 10; s++) {
		const a = rng() * 6.28;
		const d = rng() * g * 0.2;
		const ci = Math.round(g / 2 + Math.cos(a) * d);
		const cj = Math.round(g / 2 + Math.sin(a) * d);
		for (let j = cj - 1; j <= cj + 1; j++) {
			for (let i = ci - 1; i <= ci + 1; i++) {
				u[j * g + i] = 0.5;
				v[j * g + i] = 0.5;
			}
		}
	}

	const total = g * 110;
	let done = 0;

	const step = () => {
		for (let k = 0; k < ITERATIONS; k++) {
			for (let j = 1; j < g - 1; j++) {
				for (let i = 1; i < g - 1; i++) {
					const c = j * g + i;
					if (!inside[c]) {
						u2[c] = 1;
						v2[c] = 0;
						continue;
					}
					const a = u[c] ?? 0;
					const b = v[c] ?? 0;
					const lapU =
						((u[c - 1] ?? 0) + (u[c + 1] ?? 0) + (u[c - g] ?? 0) + (u[c + g] ?? 0)) * 0.2 +
						((u[c - g - 1] ?? 0) +
							(u[c - g + 1] ?? 0) +
							(u[c + g - 1] ?? 0) +
							(u[c + g + 1] ?? 0)) *
							0.05 -
						a;
					const lapV =
						((v[c - 1] ?? 0) + (v[c + 1] ?? 0) + (v[c - g] ?? 0) + (v[c + g] ?? 0)) * 0.2 +
						((v[c - g - 1] ?? 0) +
							(v[c - g + 1] ?? 0) +
							(v[c + g - 1] ?? 0) +
							(v[c + g + 1] ?? 0)) *
							0.05 -
						b;
					const abb = a * b * b;
					u2[c] = a + 0.14 * lapU - abb + FEED * (1 - a);
					v2[c] = b + 0.07 * lapV + abb - (KILL + FEED) * b;
				}
			}
			[u, u2] = [u2, u];
			[v, v2] = [v2, v];
		}
		done += ITERATIONS;
		return done < total;
	};

	let out: HTMLCanvasElement | null = null;

	const draw = (ctx: CanvasRenderingContext2D) => {
		const s = Math.min(Math.round(2 * r * 1.5), 420);
		if (!out) {
			out = document.createElement("canvas");
			out.width = s;
			out.height = s;
		}
		const octx = out.getContext("2d");
		if (!octx) return;
		const image = octx.createImageData(s, s);
		const { data } = image;
		for (let py = 0; py < s; py++) {
			const oy = (py + 0.5) / s - 0.5;
			const gy = Math.min(Math.max(((py + 0.5) / s) * g - 0.5, 0), g - 1.001);
			const y0 = Math.floor(gy);
			const ty = gy - y0;
			for (let px = 0; px < s; px++) {
				const gx = Math.min(Math.max(((px + 0.5) / s) * g - 0.5, 0), g - 1.001);
				const x0 = Math.floor(gx);
				const tx = gx - x0;
				const c = y0 * g + x0;
				const top = (v[c] ?? 0) * (1 - tx) + (v[c + 1] ?? 0) * tx;
				const bottom = (v[c + g] ?? 0) * (1 - tx) + (v[c + g + 1] ?? 0) * tx;
				const value = top * (1 - ty) + bottom * ty;
				const ox = (px + 0.5) / s - 0.5;
				const rim = 1 - smooth(0.78, 0.97, Math.hypot(ox, oy) / outline(Math.atan2(oy, ox)));
				const alpha = rim * smooth(0.15, 0.22, value) * (1 - 0.72 * smooth(0.26, 0.34, value));
				const o = (py * s + px) * 4;
				data[o] = data[o + 1] = data[o + 2] = 255;
				data[o + 3] = alpha * 255;
			}
		}
		octx.putImageData(image, 0, 0);
		ctx.drawImage(out, x - r, y - r, 2 * r, 2 * r);
	};

	return { pace: 22, step, draw };
};
