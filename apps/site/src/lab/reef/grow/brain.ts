import type { Growth, Site } from "./types";

const REPEL = 8;
const MAX_EDGE = 5;
const SETTLE_STEPS = 60;

/**
 * Differential line growth: one closed line that keeps lengthening while every part of it pushes the rest away,
 * so it folds into a brain coral's meanders.
 */
export const brain = ({ x, y, r, blocked, rng }: Site): Growth => {
	const cap = Math.round(r * r * 0.13);
	const phaseA = rng() * 6.28;
	const phaseB = rng() * 6.28;
	let xs: number[] = [];
	let ys: number[] = [];
	for (let i = 0; i < 16; i++) {
		const a = (i / 16) * Math.PI * 2;
		xs.push(x + Math.cos(a) * 9);
		ys.push(y + Math.sin(a) * 9);
	}
	let settle = 0;

	const limit = (a: number) =>
		r * (0.8 + 0.1 * Math.sin(3 * a + phaseA) + 0.08 * Math.sin(5 * a + phaseB));

	const step = () => {
		const n = xs.length;
		const grid = new Map<number, number[]>();
		for (let i = 0; i < n; i++) {
			const key = Math.floor((xs[i] ?? 0) / REPEL) * 8192 + Math.floor((ys[i] ?? 0) / REPEL);
			const cell = grid.get(key);
			if (cell) cell.push(i);
			else grid.set(key, [i]);
		}

		const nextX = new Array<number>(n);
		const nextY = new Array<number>(n);
		for (let i = 0; i < n; i++) {
			const px = xs[i] ?? 0;
			const py = ys[i] ?? 0;
			const p = (i + n - 1) % n;
			const q = (i + 1) % n;
			let fx = (((xs[p] ?? 0) + (xs[q] ?? 0)) / 2 - px) * 0.42;
			let fy = (((ys[p] ?? 0) + (ys[q] ?? 0)) / 2 - py) * 0.42;

			const cx = Math.floor(px / REPEL);
			const cy = Math.floor(py / REPEL);
			for (let gx = cx - 1; gx <= cx + 1; gx++) {
				for (let gy = cy - 1; gy <= cy + 1; gy++) {
					const cell = grid.get(gx * 8192 + gy);
					if (!cell) continue;
					for (const j of cell) {
						if (j === i) continue;
						const dx = px - (xs[j] ?? 0);
						const dy = py - (ys[j] ?? 0);
						const d2 = dx * dx + dy * dy;
						if (d2 >= REPEL * REPEL || d2 < 1e-6) continue;
						const d = Math.sqrt(d2);
						const f = (1 - d / REPEL) * (j === p || j === q ? 0.25 : 1);
						fx += (dx / d) * f;
						fy += (dy / d) * f;
					}
				}
			}

			const ox = px - x;
			const oy = py - y;
			const dc = Math.hypot(ox, oy) || 1;
			const over = dc - limit(Math.atan2(oy, ox));
			if (over > 0) {
				fx -= (ox / dc) * Math.min(over * 0.3, 2);
				fy -= (oy / dc) * Math.min(over * 0.3, 2);
			}
			const m = Math.hypot(fx, fy);
			if (m > 1.1) {
				fx *= 1.1 / m;
				fy *= 1.1 / m;
			}
			if (blocked(px + fx * 6, py + fy * 6)) {
				fx = (-ox / dc) * 0.7;
				fy = (-oy / dc) * 0.7;
			}
			nextX[i] = px + fx;
			nextY[i] = py + fy;
		}
		xs = nextX;
		ys = nextY;

		const growing = xs.length < cap;
		const outX: number[] = [];
		const outY: number[] = [];
		const chance = growing ? 0.014 + 2 / xs.length : 0;
		for (let i = 0; i < xs.length; i++) {
			const px = xs[i] ?? 0;
			const py = ys[i] ?? 0;
			const q = (i + 1) % xs.length;
			outX.push(px);
			outY.push(py);
			const dx = (xs[q] ?? 0) - px;
			const dy = (ys[q] ?? 0) - py;
			if (dx * dx + dy * dy > MAX_EDGE * MAX_EDGE || rng() < chance) {
				outX.push(px + dx / 2 + (rng() - 0.5) * 0.6);
				outY.push(py + dy / 2 + (rng() - 0.5) * 0.6);
			}
		}
		xs = outX;
		ys = outY;
		if (!growing) settle++;
		return settle < SETTLE_STEPS;
	};

	const draw = (ctx: CanvasRenderingContext2D) => {
		const n = xs.length;
		ctx.beginPath();
		for (let i = 0; i <= n; i++) {
			const a = i % n;
			const b = (i + 1) % n;
			const mx = ((xs[a] ?? 0) + (xs[b] ?? 0)) / 2;
			const my = ((ys[a] ?? 0) + (ys[b] ?? 0)) / 2;
			if (i === 0) ctx.moveTo(mx, my);
			else ctx.quadraticCurveTo(xs[a] ?? 0, ys[a] ?? 0, mx, my);
		}
		ctx.closePath();
		ctx.globalAlpha = 0.1;
		ctx.fill();
		ctx.globalAlpha = 0.22;
		ctx.lineWidth = 4;
		ctx.lineJoin = "round";
		ctx.stroke();
		ctx.globalAlpha = 1;
		ctx.lineWidth = 1.3;
		ctx.stroke();
	};

	return { pace: 16, step, draw };
};
