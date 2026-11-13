import type { Growth, Site } from "./types";

/**
 * Space colonisation: branches reach for scattered attractors and consume them. Dense, it makes a sea fan's
 * lattice; `sparse`, a staghorn's thick antlers.
 */
export const fan = ({ x, y, r, dir, blocked, rng }: Site, sparse = false): Growth => {
	const spread = sparse ? 0.9 : 1.15;
	const stride = sparse ? 6 : 3.5;
	const kill = stride * 1.6;
	const reach = r * 0.4;
	const wanted = Math.round(r * r * (sparse ? 0.0032 : 0.011));
	const cap = sparse ? 900 : 2600;

	const ax: number[] = [];
	const ay: number[] = [];
	for (let i = 0; i < wanted * 4 && ax.length < wanted; i++) {
		const a = dir + (rng() * 2 - 1) * spread;
		const d = r * (0.12 + 0.88 * Math.sqrt(rng())) * (0.78 + 0.22 * Math.cos((a - dir) * 1.4));
		const px = x + Math.cos(a) * d;
		const py = y + Math.sin(a) * d;
		if (!blocked(px, py)) {
			ax.push(px);
			ay.push(py);
		}
	}

	const nx = [x];
	const ny = [y];
	const parent = [-1];
	const taken = new Set<number>();
	let steps = 0;

	const step = () => {
		const n = nx.length;
		const vx = new Float32Array(n);
		const vy = new Float32Array(n);
		for (let j = ax.length - 1; j >= 0; j--) {
			const px = ax[j] ?? 0;
			const py = ay[j] ?? 0;
			let best = -1;
			let bestD = reach * reach;
			for (let i = 0; i < n; i++) {
				const dx = px - (nx[i] ?? 0);
				const dy = py - (ny[i] ?? 0);
				const d = dx * dx + dy * dy;
				if (d < bestD) {
					bestD = d;
					best = i;
				}
			}
			if (best < 0) continue;
			if (bestD < kill * kill) {
				ax.splice(j, 1);
				ay.splice(j, 1);
				continue;
			}
			const d = Math.sqrt(bestD);
			vx[best] = (vx[best] ?? 0) + (px - (nx[best] ?? 0)) / d;
			vy[best] = (vy[best] ?? 0) + (py - (ny[best] ?? 0)) / d;
		}

		let grew = false;
		for (let i = 0; i < n; i++) {
			const dx = vx[i] ?? 0;
			const dy = vy[i] ?? 0;
			const len = Math.hypot(dx, dy);
			if (len < 1e-4) continue;
			const a = Math.atan2(dy, dx) + (rng() - 0.5) * 0.35;
			const px = (nx[i] ?? 0) + Math.cos(a) * stride;
			const py = (ny[i] ?? 0) + Math.sin(a) * stride;
			const key = Math.round(px / 2) * 8192 + Math.round(py / 2);
			if (taken.has(key) || blocked(px, py)) continue;
			taken.add(key);
			nx.push(px);
			ny.push(py);
			parent.push(i);
			grew = true;
		}
		steps++;
		return grew && ax.length > 0 && nx.length < cap && steps < 700;
	};

	const draw = (ctx: CanvasRenderingContext2D) => {
		const n = nx.length;
		const weight = new Float32Array(n).fill(1);
		for (let i = n - 1; i > 0; i--) {
			const p = parent[i] ?? 0;
			weight[p] = (weight[p] ?? 0) + (weight[i] ?? 0);
		}
		ctx.lineCap = "round";
		for (let i = 1; i < n; i++) {
			const p = parent[i] ?? 0;
			const w = weight[i] ?? 1;
			ctx.lineWidth = sparse
				? Math.min(5.5, 1.3 + 0.42 * Math.sqrt(w))
				: Math.min(3, 0.55 + 0.11 * Math.sqrt(w));
			ctx.beginPath();
			ctx.moveTo(nx[p] ?? 0, ny[p] ?? 0);
			ctx.lineTo(nx[i] ?? 0, ny[i] ?? 0);
			ctx.stroke();
			if (sparse && w === 1) {
				ctx.beginPath();
				ctx.arc(nx[i] ?? 0, ny[i] ?? 0, 1.5, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	};

	return { pace: sparse ? 3.5 : 4.5, step, draw };
};
