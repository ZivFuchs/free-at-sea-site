const TAU = Math.PI * 2;

/** Two-sine swell, roughly -1.35…1.35. `x` and `t` in radians. */
export const swell = (x: number, t: number) =>
	Math.sin(x - t) + 0.35 * Math.sin(2.3 * x + 1.3 * t + 1.7);

export interface WaveBox {
	/** Edge positions and wave heights, all in % of the box. */
	top?: number;
	bottom?: number;
	topAmp?: number;
	bottomAmp?: number;
	cycles?: number;
	t?: number;
}

const STEPS = 24;
const pt = (x: number, y: number) => `${x.toFixed(2)}% ${y.toFixed(2)}%`;

/** A `polygon()` box with wavy top and bottom edges. Vertex count is fixed, so two boxes interpolate. */
export const waveBox = ({
	top = 0,
	bottom = 100,
	topAmp = 0,
	bottomAmp = 0,
	cycles = 1.5,
	t = 0,
}: WaveBox = {}) => {
	const edge = (y: number, amp: number, shift: number) =>
		Array.from({ length: STEPS + 1 }, (_, i) => {
			const u = i / STEPS;
			return pt(u * 100, y + amp * swell(u * cycles * TAU, t + shift));
		});
	return `polygon(${[...edge(top, topAmp, 0), ...edge(bottom, bottomAmp, 2).reverse()].join(",")})`;
};

export const SEA = { width: 1200, height: 600, rows: 11 } as const;

export interface SeaRow {
	y: number;
	size: number;
	amp: number;
	/** Radians per viewBox unit. */
	k: number;
	speed: number;
	phase: number;
	opacity: number;
}

/** Rows of the type sea, horizon first: spacing, size and swell grow toward the viewer. */
export const seaRows = (): SeaRow[] =>
	Array.from({ length: SEA.rows }, (_, i) => {
		const d = i / (SEA.rows - 1);
		return {
			y: 30 + 545 * d ** 1.9,
			size: 7 + 38 * d ** 1.5,
			amp: 1.2 + 15 * d ** 1.6,
			k: TAU / (170 + 620 * d),
			speed: 0.35 + 0.3 * d,
			phase: i * 1.9,
			opacity: 0.16 + 0.5 * d,
		};
	});

const PAD = 120;

export const rowPath = ({ y, amp, k, speed, phase, size }: SeaRow, t: number) => {
	const step = Math.max(10, size * 0.9);
	let d = "";
	for (let x = -PAD; x <= SEA.width + PAD; x += step) {
		d += `${d ? "L" : "M"}${x.toFixed(1)} ${(y + amp * swell(x * k + phase, t * speed)).toFixed(2)}`;
	}
	return d;
};
