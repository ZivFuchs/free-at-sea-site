/** Deterministic plan of the settlement: where every pontoon ends up, which raft it belongs to, and when it locks. */

const SQRT3 = Math.sqrt(3);
const DISTRICT_SPACING = 15;
const CANAL_WIDTH = 1.5;
/** Deck height above the still waterline, and how far the hull reaches below it. */
export const FREEBOARD = 0.36;
const DRAFT = 0.6;

export const KIND = { plain: 0, solar: 1, garden: 2, hatch: 3, building: 4 } as const;

const mulberry = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const patch = (x: number, z: number, f: number, o: number) =>
	Math.sin(x * f + o) * Math.cos(z * f * 1.3 - o * 2) + 0.5 * Math.sin((x + z) * f * 2.1 + o * 3);

interface Cell {
	x: number;
	z: number;
	seedX: number;
	seedZ: number;
	lock: number;
	join: number;
	radius: number;
	height: number;
	base: number;
	kind: number;
}

export interface Plan {
	count: number;
	/** World radius of the finished city. */
	radius: number;
	home: Float32Array;
	seed: Float32Array;
	/** x: progress at which the cell locks to its raft; y: progress at which its raft joins the city. */
	timing: Float32Array;
	/** x: radius scale, y: height, z: base height. */
	shape: Float32Array;
	kind: Float32Array;
	rand: Float32Array;
	/** Lock times of pontoons only, ascending: `joined()` counts into it. */
	locks: Float32Array;
}

export const buildPlan = (rings: number): Plan => {
	const random = mulberry(20261112);
	const radius = rings * 1.5;

	const seeds: { x: number; z: number }[] = [{ x: 0, z: 0 }];
	for (let tries = 0; tries < 4000; tries++) {
		const a = random() * Math.PI * 2;
		const r = Math.sqrt(random()) * radius * 0.92;
		const x = Math.cos(a) * r;
		const z = Math.sin(a) * r;
		if (seeds.every((s) => Math.hypot(s.x - x, s.z - z) > DISTRICT_SPACING)) seeds.push({ x, z });
	}

	const cells: Cell[] = [];
	for (let q = -rings; q <= rings; q++) {
		for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
			const x = SQRT3 * (q + r / 2);
			const z = 1.5 * r;
			const angle = Math.atan2(z, x);
			const shore = radius * (0.88 + 0.07 * Math.sin(angle * 3 + 1) + 0.04 * Math.sin(angle * 7));
			if (Math.hypot(x, z) > shore) continue;

			let nearest = seeds[0];
			let d1 = Infinity;
			let d2 = Infinity;
			for (const s of seeds) {
				const d = Math.hypot(s.x - x, s.z - z);
				if (d < d1) {
					d2 = d1;
					d1 = d;
					nearest = s;
				} else if (d < d2) d2 = d;
			}
			if (!nearest || d2 - d1 < CANAL_WIDTH) continue;

			const first = nearest === seeds[0] && d1 < 0.1;
			const lock = first ? -1 : 0.1 + 0.4 * Math.min(d1 / 13, 1) ** 0.9 + random() * 0.05;
			const join = 0.52 + 0.16 * (Math.hypot(nearest.x, nearest.z) / radius);
			const kind =
				patch(x, z, 0.21, 1.7) > 0.72
					? KIND.garden
					: patch(x, z, 0.17, 4.1) > 0.8
						? KIND.solar
						: random() < 0.1
							? KIND.hatch
							: KIND.plain;
			const shared = { x, z, seedX: nearest.x, seedZ: nearest.z, lock, join };
			cells.push({ ...shared, radius: 0.955, height: FREEBOARD + DRAFT, base: -DRAFT, kind });

			const core = Math.max(0, 1 - d1 / 5) ** 2;
			if ((kind === KIND.plain || kind === KIND.hatch) && random() < 0.22 + core * 0.5) {
				cells.push({
					...shared,
					radius: 0.46 + random() * 0.22,
					height: 0.3 + random() * 0.45 + core * random() * 1.5,
					base: FREEBOARD,
					kind: KIND.building,
				});
			}
		}
	}

	const count = cells.length;
	const plan: Plan = {
		count,
		radius,
		home: new Float32Array(count * 2),
		seed: new Float32Array(count * 2),
		timing: new Float32Array(count * 2),
		shape: new Float32Array(count * 3),
		kind: new Float32Array(count),
		rand: new Float32Array(count * 4),
		locks: Float32Array.from(
			cells.filter((c) => c.kind !== KIND.building).map((c) => c.lock),
		).sort(),
	};
	let pontoon = [0, 0, 0, 0];
	cells.forEach((c, i) => {
		// A building shares its pontoon's random values, so the two drift as one.
		if (c.kind !== KIND.building) pontoon = [random(), random(), random(), random()];
		plan.home.set([c.x, c.z], i * 2);
		plan.seed.set([c.seedX, c.seedZ], i * 2);
		plan.timing.set([c.lock, c.join], i * 2);
		plan.shape.set([c.radius, c.height, c.base], i * 3);
		plan.kind[i] = c.kind;
		plan.rand.set(pontoon, i * 4);
	});
	return plan;
};

/** How many pontoons have locked at `progress`. */
export const joined = ({ locks }: Plan, progress: number) => {
	let lo = 0;
	let hi = locks.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if ((locks[mid] ?? 1) <= progress) lo = mid + 1;
		else hi = mid;
	}
	return lo;
};
