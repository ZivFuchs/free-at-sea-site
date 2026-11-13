export type Formation = "ball" | "title" | "line" | "ring" | "stream" | "vortex" | "scatter";

/** Where the active formation sits, in world units (origin: viewport centre, y up). */
export interface Anchor {
	kind: Formation;
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface View {
	w: number;
	h: number;
	/** World units per CSS pixel at z = 0. */
	perPx: number;
}

export interface Predator {
	x: number;
	y: number;
	/** 0 idle → 1 hunting. */
	power: number;
}

const TAU = Math.PI * 2;
const GRID = 64;
const CELL = 0.45;
const STRAY_EVERY = 9;
const FOREGROUND = 9;

export const createShoal = (count: number, size: number) => {
	const total = count + FOREGROUND;
	const pos = new Float32Array(total * 3);
	const dir = new Float32Array(total * 3);
	/** phase, size, flash, softness */
	const misc = new Float32Array(total * 4);
	const vel = new Float32Array(total * 3);
	const seed = new Float32Array(total * 3);
	const panic = new Float32Array(total);
	const slot = new Int32Array(total);
	const swapAt = new Float32Array(total);
	const target = new Float32Array(3);
	const cells = new Float32Array(GRID * GRID * 3);
	let points: Float32Array<ArrayBuffer> = new Float32Array(2);

	for (let i = 0; i < total; i++) {
		seed.set([Math.random(), Math.random(), Math.random()], i * 3);
		dir[i * 3] = Math.random() < 0.8 ? 1 : -1;
		misc[i * 4] = Math.random() * TAU;
		misc[i * 4 + 1] = size * (0.7 + Math.random() * 0.6);
		slot[i] = i;
		swapAt[i] = 4 + Math.random() * 24;
	}
	for (let i = count; i < total; i++) {
		pos[i * 3] = (Math.random() - 0.5) * 9;
		misc[i * 4 + 1] = size * 1.5;
		misc[i * 4 + 3] = 0.07 + Math.random() * 0.05;
	}

	const aim = (i: number, t: number, a: Anchor, view: View) => {
		const u = seed[i * 3] ?? 0;
		const v = seed[i * 3 + 1] ?? 0;
		const w = seed[i * 3 + 2] ?? 0;
		let x = 0;
		let y = 0;
		let z = (w - 0.5) * 0.9;

		if (a.kind !== "scatter" && i % STRAY_EVERY === 0) {
			const g = Math.floor(i / STRAY_EVERY) % 3;
			x = Math.sin(t * 0.11 + g * 2.1) * view.w * 0.42 + (u + w - 1) * 1.3;
			y = Math.cos(t * 0.09 + g * 1.3) * view.h * 0.36 + (v - 0.5) * (u - 0.5) * 1.6;
			z = -1.5 - w * 4;
		} else if (a.kind === "title") {
			const s = (slot[i] ?? 0) % (points.length / 2);
			x = a.x + (points[s * 2] ?? 0) * view.perPx;
			y = a.y - (points[s * 2 + 1] ?? 0) * view.perPx;
			z = (w - 0.5) * 0.2;
		} else if (a.kind === "ball") {
			const r = Math.cbrt(w) * Math.min(a.w, a.h, view.w * 0.8) * 0.42;
			const polar = Math.acos(2 * v - 1);
			const turn = u * TAU + t * (0.9 + w * 0.8);
			x = a.x + r * Math.sin(polar) * Math.cos(turn);
			y = a.y + r * Math.cos(polar) * 0.8;
			z = r * Math.sin(polar) * Math.sin(turn);
		} else if (a.kind === "ring") {
			const turn = u * TAU + t * 0.2;
			const r = 1 + (v + w - 1) * 0.16;
			x = a.x + Math.cos(turn) * a.w * 0.5 * r;
			y = a.y + Math.sin(turn) * a.h * 0.5 * r;
		} else if (a.kind === "line") {
			x = (((u + t * 0.03) % 1) - 0.5) * view.w * 1.4;
			y = a.y + Math.sin(x * 1.3 + t * 0.4) * 0.07 + (v + w - 1) * (v - 0.5) * 0.5;
		} else if (a.kind === "stream") {
			const s = (u + t * 0.025) % 1;
			y = (0.5 - s) * view.h * 1.4;
			x = view.w * 0.16 + Math.sin(s * TAU * 0.9 + 0.6) * view.w * 0.3 + (v + w - 1) * 0.22;
			z = (w - 0.5) * 2 - 0.6;
		} else if (a.kind === "vortex") {
			const rx = a.w * 0.62;
			const ry = Math.max(a.h * 0.8, rx * 0.6);
			const r = 1 + 1.15 * v * v;
			const turn = u * TAU - t * (0.2 / r);
			x = a.x + Math.cos(turn) * rx * r;
			y = a.y + Math.sin(turn) * ry * r;
			z = (w - 0.5) * 1.6 - 0.4;
		} else {
			x = (u - 0.5) * view.w * 3 + Math.sin(t * 0.05 + w * 9) * 0.5;
			y = (v - 0.5) * view.h * 1.5 - view.h * 0.15;
			z = -2 - w * 11;
		}
		target[0] = x;
		target[1] = y;
		target[2] = z;
	};

	/** Soft-focus fish close to the lens: they cross slowly and ignore everything. */
	const foreground = (dt: number, view: View) => {
		for (let i = count; i < total; i++) {
			const u = seed[i * 3] ?? 0;
			const v = seed[i * 3 + 1] ?? 0;
			const w = seed[i * 3 + 2] ?? 0;
			const z = 4.5 + w * 2.5;
			const span = view.w * (0.5 - z / 20) + 1.5;
			const heading = u < 0.5 ? -1 : 1;
			let x = (pos[i * 3] ?? 0) + heading * (0.12 + v * 0.2) * dt;
			if (x * heading > span) x = -heading * span;
			pos[i * 3] = x;
			pos[i * 3 + 1] = (v - 0.5) * view.h * (0.9 - z / 14);
			pos[i * 3 + 2] = z;
			dir[i * 3] = heading;
			misc[i * 4] = (misc[i * 4] ?? 0) + dt * 5;
		}
	};

	const cell = (x: number, y: number) => {
		const cx = Math.min(GRID - 1, Math.max(0, Math.floor(x / CELL + GRID / 2)));
		const cy = Math.min(GRID - 1, Math.max(0, Math.floor(y / CELL + GRID / 2)));
		return (cy * GRID + cx) * 3;
	};

	const step = (t: number, dt: number, a: Anchor, view: View, hunter: Predator) => {
		cells.fill(0);
		for (let i = 0; i < count; i++) {
			const c = cell(pos[i * 3] ?? 0, pos[i * 3 + 1] ?? 0);
			cells[c] = (cells[c] ?? 0) + (vel[i * 3] ?? 0);
			cells[c + 1] = (cells[c + 1] ?? 0) + (vel[i * 3 + 1] ?? 0);
			cells[c + 2] = (cells[c + 2] ?? 0) + 1;
		}

		const fear = Math.min(0.95, view.w * 0.2);
		const still = a.kind === "title";
		/** These formations wrap around off screen: a fish whose mark jumped goes with it. */
		const loops = a.kind === "line" || a.kind === "stream";
		for (let i = 0; i < count; i++) {
			const p = i * 3;
			if (still && t > (swapAt[i] ?? 0)) {
				slot[i] = Math.floor(Math.random() * count);
				swapAt[i] = t + 8 + Math.random() * 26;
			}
			aim(i, t, a, view);
			let px = pos[p] ?? 0;
			let py = pos[p + 1] ?? 0;
			let pz = pos[p + 2] ?? 0;
			let vx = vel[p] ?? 0;
			let vy = vel[p + 1] ?? 0;
			let vz = vel[p + 2] ?? 0;
			const u = seed[p] ?? 0;

			const dx = (target[0] ?? 0) - px;
			const dy = (target[1] ?? 0) - py;
			const dz = (target[2] ?? 0) - pz;
			const dist = Math.hypot(dx, dy, dz) + 1e-5;
			const unseen =
				Math.abs(target[0] ?? 0) > view.w * 0.52 || Math.abs(target[1] ?? 0) > view.h * 0.52;
			if (loops && unseen && dist > view.h * 0.6) {
				pos.set(target, p);
				continue;
			}
			const speed = Math.min(1.6 + dist * 1.3 + u * 0.8, dist * 3.2);
			let scare = panic[i] ?? 0;
			const pull = 3.2 * (1 - scare * 0.85) * dt;
			vx += ((dx / dist) * speed - vx) * pull;
			vy += ((dy / dist) * speed - vy) * pull;
			vz += ((dz / dist) * speed - vz) * pull;

			const c = cell(px, py);
			const n = cells[c + 2] ?? 0;
			if (n > 1 && !still) {
				const align = 1.4 * dt;
				vx += ((cells[c] ?? 0) / n - vx) * align;
				vy += ((cells[c + 1] ?? 0) / n - vy) * align;
			}
			vx += Math.sin(t * 1.3 + u * 40) * 0.22 * dt;
			vy += Math.cos(t * 1.1 + u * 57) * 0.22 * dt;

			if (hunter.power > 0.01 && pz > -2.5) {
				const hx = px - hunter.x;
				const hy = py - hunter.y;
				const hd = Math.hypot(hx, hy) + 1e-5;
				if (hd < fear) {
					const push = (1 - hd / fear) * 34 * hunter.power * dt;
					vx += (hx / hd) * push;
					vy += (hy / hd) * push;
					vz += (u - 0.5) * push * 0.5;
					scare = Math.max(scare, hunter.power);
				}
			}
			scare *= Math.exp(-1.6 * dt);
			panic[i] = scare;

			px += vx * dt;
			py += vy * dt;
			pz += vz * dt;
			pos[p] = px;
			pos[p + 1] = py;
			pos[p + 2] = pz;
			vel[p] = vx;
			vel[p + 1] = vy;
			vel[p + 2] = vz;

			const pace = Math.hypot(vx, vy, vz);
			const ox = dir[p] ?? 1;
			const oy = dir[p + 1] ?? 0;
			const oz = dir[p + 2] ?? 0;
			let nx = ox;
			let ny = oy;
			let nz = oz;
			if (pace > 0.12) {
				const k = 1 - Math.exp(-9 * dt);
				nx += (vx / pace - ox) * k;
				ny += (vy / pace - oy) * k;
				nz += (vz / pace - oz) * k;
			} else {
				ny *= 1 - dt;
				nz *= 1 - dt;
				nx += dt * 1.5;
			}
			const len = Math.hypot(nx, ny, nz) || 1;
			nx /= len;
			ny /= len;
			nz /= len;
			dir[p] = nx;
			dir[p + 1] = ny;
			dir[p + 2] = nz;

			const m = i * 4;
			const turn = Math.hypot(nx - ox, ny - oy, nz - oz) / Math.max(dt, 1e-3);
			const flash = Math.max(scare, Math.min(1, turn * 0.22));
			misc[m] = (misc[m] ?? 0) + dt * (5 + pace * 8 + scare * 12);
			misc[m + 2] = Math.max(flash, (misc[m + 2] ?? 0) * Math.exp(-3.5 * dt));
		}
		foreground(dt, view);
	};

	/** Place every fish straight on its mark: the first frame, and each frame under reduced motion. */
	const snap = (t: number, a: Anchor, view: View) => {
		for (let i = 0; i < count; i++) {
			aim(i, t, a, view);
			pos.set(target, i * 3);
			vel.fill(0, i * 3, i * 3 + 3);
		}
		foreground(0, view);
	};

	return {
		total,
		pos,
		dir,
		misc,
		step,
		snap,
		/** Title outline as CSS-pixel offsets from the heading's centre. */
		setPoints: (next: Float32Array<ArrayBuffer>) => {
			points = next;
		},
	};
};

export type Shoal = ReturnType<typeof createShoal>;
