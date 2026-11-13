import { cellValue, MODULES, type ModuleId } from "./modules";

export const RADIUS = 3;
/** Rings of open water drawn past the buildable disc. */
const MARGIN = 2;
const SQRT3 = Math.sqrt(3);

export interface Cell {
	q: number;
	r: number;
	/** Ground position in hex radii (flat-top axial layout); `y` runs toward the viewer. */
	x: number;
	y: number;
	ring: number;
}

const ringOf = (q: number, r: number) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));

const disc = (from: number, to: number) => {
	const cells: Cell[] = [];
	for (let q = -to; q <= to; q++) {
		for (let r = -to; r <= to; r++) {
			const ring = ringOf(q, r);
			if (ring >= from && ring <= to)
				cells.push({ q, r, x: 1.5 * q, y: SQRT3 * (r + q / 2), ring });
		}
	}
	// Back to front, so paint order, tab order and the encoding all agree.
	return cells.sort((a, b) => a.y - b.y || a.x - b.x);
};

export const CELLS: readonly Cell[] = disc(0, RADIUS);
export const WATER: readonly Cell[] = disc(RADIUS + 1, RADIUS + MARGIN);

const key = (q: number, r: number) => `${q},${r}`;
const INDEX = new Map(CELLS.map(({ q, r }, i) => [key(q, r), i]));
export const indexAt = (q: number, r: number) => INDEX.get(key(q, r));

const SIDES = [
	[1, 0],
	[1, -1],
	[0, -1],
	[-1, 0],
	[-1, 1],
	[0, 1],
] as const;

export const NEIGHBOURS: readonly (readonly number[])[] = CELLS.map(({ q, r }) =>
	SIDES.map(([dq, dr]) => indexAt(q + dq, r + dr)).filter((i) => i !== undefined),
);

/** 1-based labels: columns left to right, rows back to front (half-rows, as hexes interlock). */
export const position = ({ q, y }: Cell) => ({
	column: q + RADIUS + 1,
	row: Math.round(y / (SQRT3 / 2)) + 2 * RADIUS + 1,
});

export type Plan = readonly number[];

export const EMPTY: Plan = CELLS.map(() => 0);

export const encode = (plan: Plan) => plan.join("");

export const decode = (text: string | null): Plan | null => {
	if (!text || text.length !== CELLS.length) return null;
	const plan = [...text].map(Number);
	return plan.every((v) => Number.isInteger(v) && v >= 0 && v <= MODULES.length) ? plan : null;
};

const SEED_LAYOUT: readonly (readonly [number, number, ModuleId])[] = [
	[0, 0, "commons"],
	[-1, 0, "dwelling"],
	[-1, 1, "dwelling"],
	[0, -1, "dwelling"],
	[1, -1, "garden"],
	[0, 1, "garden"],
	[1, 0, "solar"],
	[2, -1, "solar"],
	[-2, 1, "workshop"],
	[-1, 2, "dock"],
	[1, -2, "wind"],
];

export const SEED: Plan = CELLS.map(({ q, r }) => {
	const placed = SEED_LAYOUT.find(([sq, sr]) => sq === q && sr === r);
	return placed ? cellValue(placed[2]) : 0;
});
