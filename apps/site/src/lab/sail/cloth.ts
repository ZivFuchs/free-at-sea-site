export interface ClothShape {
	nx: number;
	ny: number;
	/** Gap between mast and luff. */
	luff: number;
	width: number;
	height: number;
	/** Rise of the head toward the leech (the gaff's angle). */
	peak: number;
	/** Rise of the foot toward the clew. */
	footRise: number;
}

export interface Wind {
	x: number;
	y: number;
	z: number;
	time: number;
	/** Travelling ripple along the leech, 0–1. */
	flutter: number;
}

export interface Sheet {
	x: number;
	y: number;
	z: number;
	length: number;
}

const GRAVITY = -1.6;
const WIND_GAIN = 9;
const DAMPING = 0.972;
const ITERATIONS = 5;
/** Extra cloth across the sail, so it can belly. */
const SLACK = 1.032;
const BEND = 0.25;

/**
 * Verlet sail: luff laced to the mast and head to the gaff (pinned), foot and leech free, clew held by a
 * sheet that only pulls when taut. Wind acts along each cell's normal, relative to the cloth's own motion.
 */
export const createCloth = ({ nx, ny, luff, width, height, peak, footRise }: ClothShape) => {
	const count = nx * ny;
	const pos = new Float32Array(count * 3);
	const prev = new Float32Array(count * 3);
	const normal = new Float32Array(count * 3);
	const acc = new Float32Array(count * 3);
	const uv = new Float32Array(count * 2);
	const free = new Uint8Array(count);

	for (let j = 0; j < ny; j++) {
		for (let i = 0; i < nx; i++) {
			const k = j * nx + i;
			const u = i / (nx - 1);
			const v = j / (ny - 1);
			pos[k * 3] = luff + width * u;
			pos[k * 3 + 1] = footRise * u * (1 - v) + (height + peak * u) * v;
			uv[k * 2] = u;
			uv[k * 2 + 1] = v;
			free[k] = i > 0 && j < ny - 1 ? 1 : 0;
		}
	}
	prev.set(pos);

	const la: number[] = [];
	const lb: number[] = [];
	const rest: number[] = [];
	const stiff: number[] = [];
	const link = (a: number, b: number, slack: number, strength: number) => {
		la.push(a);
		lb.push(b);
		rest.push(
			Math.hypot(
				pos[a * 3] - pos[b * 3],
				pos[a * 3 + 1] - pos[b * 3 + 1],
				pos[a * 3 + 2] - pos[b * 3 + 2],
			) * slack,
		);
		stiff.push(strength);
	};
	for (let j = 0; j < ny; j++) {
		for (let i = 0; i < nx; i++) {
			const k = j * nx + i;
			if (i + 1 < nx) link(k, k + 1, SLACK, 1);
			if (j + 1 < ny) link(k, k + nx, 1, 1);
			if (i + 1 < nx && j + 1 < ny) {
				link(k, k + nx + 1, SLACK, 1);
				link(k + 1, k + nx, SLACK, 1);
			}
			if (i + 2 < nx) link(k, k + 2, SLACK, BEND);
			if (j + 2 < ny) link(k, k + 2 * nx, 1, BEND);
		}
	}
	const links = la.length;
	const clew = nx - 1;

	const normals = () => {
		for (let j = 0; j < ny; j++) {
			for (let i = 0; i < nx; i++) {
				const k = (j * nx + i) * 3;
				const l = (j * nx + Math.max(i - 1, 0)) * 3;
				const r = (j * nx + Math.min(i + 1, nx - 1)) * 3;
				const d = (Math.max(j - 1, 0) * nx + i) * 3;
				const t = (Math.min(j + 1, ny - 1) * nx + i) * 3;
				const ax = pos[r] - pos[l];
				const ay = pos[r + 1] - pos[l + 1];
				const az = pos[r + 2] - pos[l + 2];
				const bx = pos[t] - pos[d];
				const by = pos[t + 1] - pos[d + 1];
				const bz = pos[t + 2] - pos[d + 2];
				const x = ay * bz - az * by;
				const y = az * bx - ax * bz;
				const z = ax * by - ay * bx;
				const len = Math.hypot(x, y, z) || 1;
				normal[k] = x / len;
				normal[k + 1] = y / len;
				normal[k + 2] = z / len;
			}
		}
	};
	normals();

	const step = (dt: number, wind: Wind, sheet: Sheet) => {
		for (let k = 0; k < count; k++) acc[k * 3 + 1] += GRAVITY;

		for (let j = 0; j < ny - 1; j++) {
			for (let i = 0; i < nx - 1; i++) {
				const ka = j * nx + i;
				const a = ka * 3;
				const b = a + 3;
				const c = a + nx * 3;
				const d = c + 3;
				const e1x = pos[d] - pos[a];
				const e1y = pos[d + 1] - pos[a + 1];
				const e1z = pos[d + 2] - pos[a + 2];
				const e2x = pos[c] - pos[b];
				const e2y = pos[c + 1] - pos[b + 1];
				const e2z = pos[c + 2] - pos[b + 2];
				let x = e1y * e2z - e1z * e2y;
				let y = e1z * e2x - e1x * e2z;
				let z = e1x * e2y - e1y * e2x;
				const len = Math.hypot(x, y, z) || 1;
				x /= len;
				y /= len;
				z /= len;
				const u = uv[ka * 2];
				const v = uv[ka * 2 + 1];
				const gain = 1 + wind.flutter * u * u * Math.sin(u * 9 - wind.time * 7 + v * 3);
				const vx = (pos[a] - prev[a] + pos[d] - prev[d]) / (2 * dt);
				const vy = (pos[a + 1] - prev[a + 1] + pos[d + 1] - prev[d + 1]) / (2 * dt);
				const vz = (pos[a + 2] - prev[a + 2] + pos[d + 2] - prev[d + 2]) / (2 * dt);
				const f =
					(x * (wind.x * gain - vx) + y * (wind.y * gain - vy) + z * (wind.z * gain - vz)) *
					WIND_GAIN;
				for (const p of [a, b, c, d]) {
					acc[p] += x * f * 0.5;
					acc[p + 1] += y * f * 0.5;
					acc[p + 2] += z * f * 0.5;
				}
			}
		}

		const dt2 = dt * dt;
		for (let k = 0; k < count; k++) {
			const p = k * 3;
			if (free[k]) {
				for (let n = 0; n < 3; n++) {
					const now = pos[p + n];
					pos[p + n] = now + (now - prev[p + n]) * DAMPING + acc[p + n] * dt2;
					prev[p + n] = now;
				}
			}
			acc[p] = 0;
			acc[p + 1] = 0;
			acc[p + 2] = 0;
		}

		for (let it = 0; it < ITERATIONS; it++) {
			for (let l = 0; l < links; l++) {
				const ka = la[l];
				const kb = lb[l];
				const wa = free[ka];
				const wb = free[kb];
				if (!wa && !wb) continue;
				const a = ka * 3;
				const b = kb * 3;
				const dx = pos[b] - pos[a];
				const dy = pos[b + 1] - pos[a + 1];
				const dz = pos[b + 2] - pos[a + 2];
				const len = Math.hypot(dx, dy, dz) || 1;
				const corr = ((len - rest[l]) / len / (wa + wb)) * stiff[l];
				pos[a] += dx * corr * wa;
				pos[a + 1] += dy * corr * wa;
				pos[a + 2] += dz * corr * wa;
				pos[b] -= dx * corr * wb;
				pos[b + 1] -= dy * corr * wb;
				pos[b + 2] -= dz * corr * wb;
			}
			const c = clew * 3;
			const dx = pos[c] - sheet.x;
			const dy = pos[c + 1] - sheet.y;
			const dz = pos[c + 2] - sheet.z;
			const len = Math.hypot(dx, dy, dz);
			if (len > sheet.length) {
				const s = sheet.length / len;
				pos[c] = sheet.x + dx * s;
				pos[c + 1] = sheet.y + dy * s;
				pos[c + 2] = sheet.z + dz * s;
			}
		}
		normals();
	};

	/** A soft shove around a point, applied on the next step. */
	const push = (
		px: number,
		py: number,
		pz: number,
		radius: number,
		fx: number,
		fy: number,
		fz: number,
	) => {
		for (let k = 0; k < count; k++) {
			const p = k * 3;
			const d = Math.hypot(pos[p] - px, pos[p + 1] - py, pos[p + 2] - pz);
			if (d > radius) continue;
			const w = (1 - d / radius) ** 2;
			acc[p] += fx * w;
			acc[p + 1] += fy * w;
			acc[p + 2] += fz * w;
		}
	};

	const index: number[] = [];
	for (let j = 0; j < ny - 1; j++) {
		for (let i = 0; i < nx - 1; i++) {
			const a = j * nx + i;
			index.push(a, a + 1, a + nx + 1, a, a + nx + 1, a + nx);
		}
	}

	return { pos, normal, uv, index, clew, step, push };
};
