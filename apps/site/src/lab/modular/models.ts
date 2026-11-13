import { ball, halo, line, ngon, panes, prism, quad, rect, type Shape, shadow } from "./iso";
import type { ModuleId } from "./modules";

/** Drawing box of one cell, in hex radii, origin at the deck centre. */
export const VIEW = { x: -1.1, y: -2.05, width: 2.2, height: 2.85 } as const;

const FREEBOARD = 0.16;
const HULL = ngon(0, 0, 0.94, 6);

const cell = prism(ngon(0, 0, 0.97, 6), 0, 0, "hull").at(-1);
/** Outline of one cell at the waterline. */
export const CELL_OUTLINE = cell?.kind === "fill" ? cell.d : "";

const pontoon: readonly Shape[] = [
	shadow(ngon(0, 0.12, 1, 6), 0.05),
	...prism(HULL, -FREEBOARD, 0, "hull"),
];

const dwelling = (): Shape[] => {
	const lower = rect(-0.1, 0.1, 0.86, 0.6);
	const upper = rect(0.04, -0.04, 0.52, 0.42);
	return [
		shadow(lower),
		...prism(lower, 0, 0.4, "wall", "deck"),
		...panes(lower, 0.12, 0.3, 3),
		...prism(upper, 0.4, 0.76, "wall"),
		...panes(upper, 0.5, 0.67, 2),
		...prism(rect(0.04, -0.04, 0.62, 0.52), 0.76, 0.8, "roof"),
	];
};

const tree = (x: number, y: number, r: number): Shape[] => [
	line([x, y, 0], [x, y, r * 1.5], "deck", 0.035),
	...ball([x, y, r * 2.1], r, "green"),
];

const garden = (): Shape[] => {
	const house = rect(0.3, -0.3, 0.44, 0.34);
	return [
		...prism(rect(-0.34, -0.26, 0.5, 0.3), 0, 0.07, "deck", "green"),
		shadow(house, 0.06),
		...prism(house, 0, 0.26, "wall", "glass"),
		...panes(house, 0.05, 0.22, 2),
		...tree(-0.06, 0.02, 0.16),
		...prism(rect(0.3, 0.3, 0.5, 0.3), 0, 0.07, "deck", "green"),
		...tree(-0.42, 0.3, 0.2),
		...tree(-0.02, 0.52, 0.12),
	];
};

const solar = (): Shape[] =>
	[-0.44, -0.04, 0.36].flatMap((y) =>
		[-0.29, 0.29].flatMap((x): Shape[] => [
			line([x - 0.2, y - 0.14, 0], [x - 0.2, y - 0.14, 0.28], "metal", 0.02),
			line([x + 0.2, y - 0.14, 0], [x + 0.2, y - 0.14, 0.28], "metal", 0.02),
			quad(
				[
					[x - 0.26, y + 0.14, 0.05],
					[x + 0.26, y + 0.14, 0.05],
					[x + 0.26, y - 0.14, 0.3],
					[x - 0.26, y - 0.14, 0.3],
				],
				"solar",
				0,
			),
			line([x, y + 0.14, 0.05], [x, y - 0.14, 0.3], "metal", 0.012),
			line([x - 0.26, y, 0.175], [x + 0.26, y, 0.175], "metal", 0.012),
		]),
	);

const wind = (): Shape[] => {
	const base = rect(0, 0, 0.36, 0.36);
	const blade = "M-0.035 0L0 -0.6L0.035 0Z";
	return [
		shadow(base, 0.06),
		...prism(base, 0, 0.14, "wall", "roof"),
		line([0, 0, 0.14], [0, 0, 1.52], "metal", 0.055),
		...ball([0, 0, 1.52], 0.06, "wall"),
		halo([0, 0, 1.52], 0.13),
		{
			kind: "spin",
			at: [0, -1.52 * Math.cos(Math.PI / 6)],
			squash: 0.82,
			shapes: [0, 120, 240].map((turn): Shape => {
				const a = (turn * Math.PI) / 180;
				const [c, s] = [Math.cos(a), Math.sin(a)];
				const turned = blade.replace(
					/(-?[\d.]+) (-?[\d.]+)/g,
					(_, x, y) =>
						`${(Number(x) * c - Number(y) * s).toFixed(3)} ${(Number(x) * s + Number(y) * c).toFixed(3)}`,
				);
				return { kind: "fill", d: turned, material: "wall", shade: 0 };
			}),
		},
	];
};

const dock = (): Shape[] => {
	const hut = rect(-0.3, -0.32, 0.4, 0.32);
	const boat = (
		[
			[-0.36, -0.09],
			[0.2, -0.11],
			[0.4, 0],
			[0.2, 0.11],
			[-0.36, 0.09],
		] as const
	).map(([x, y]) => [0.22 + x * 0.94 + y * 0.34, 0.3 - x * 0.34 + y * 0.94] as const);
	const bollard = (x: number, y: number) => prism(ngon(x, y, 0.04, 6), 0.04, 0.13, "metal");
	return [
		...prism(ngon(0, 0, 0.86, 6), 0, 0.04, "deck"),
		line([0.5, -0.36, 0.04], [0.5, -0.36, 0.78], "metal", 0.03),
		...ball([0.5, -0.36, 0.8], 0.04, "lamp"),
		halo([0.5, -0.36, 0.8], 0.32),
		shadow(hut, 0.06),
		...prism(hut, 0.04, 0.34, "wall"),
		...panes(hut, 0.14, 0.26, 1),
		...prism(rect(-0.3, -0.32, 0.48, 0.4), 0.34, 0.38, "roof"),
		...bollard(-0.62, 0.2),
		shadow(boat, 0.05),
		...prism(boat, 0.09, 0.2, "wall", "deck"),
		...bollard(-0.3, 0.6),
	];
};

const workshop = (): Shape[] => {
	const hall = rect(0.04, -0.06, 0.96, 0.66);
	return [
		shadow(hall),
		...prism(hall, 0, 0.44, "wall", "roof"),
		...panes(hall, 0.28, 0.38, 4),
		...prism(rect(-0.1, -0.14, 0.56, 0.1), 0.44, 0.5, "roof", "glass"),
		...prism(rect(0.16, 0.02, 0.56, 0.1), 0.44, 0.5, "roof", "glass"),
		line([-0.58, 0.36, 0], [-0.58, 0.36, 0.86], "metal", 0.04),
		line([-0.68, 0.32, 0.86], [-0.1, 0.56, 0.86], "metal", 0.03),
		line([-0.16, 0.535, 0.86], [-0.16, 0.535, 0.4], "metal", 0.012),
		...prism(rect(-0.16, 0.535, 0.1, 0.1), 0.3, 0.4, "deck"),
	];
};

const commons = (): Shape[] => {
	const column = (turn: number): Shape => {
		const a = (turn * Math.PI) / 180;
		const [x, y] = [0.46 * Math.cos(a), 0.46 * Math.sin(a)];
		return line([x, y, 0.1], [x, y, 0.52], "wall", 0.035);
	};
	const canopy = ngon(0, 0, 0.56, 24);
	return [
		...prism(ngon(0, 0, 0.78, 24), 0, 0.05, "hull", "deck"),
		...prism(ngon(0, 0, 0.6, 24), 0.05, 0.1, "hull", "deck"),
		shadow(ngon(0, 0, 0.5, 24), 0.05),
		...[210, 270, 330, 150, 30, 90].map(column),
		...prism(canopy, 0.52, 0.57, "roof"),
		...prism(ngon(0, 0, 0.17, 16), 0.57, 0.57, "glass").slice(-1),
		halo([0, 0, 0.57], 0.5),
	];
};

const BUILD: Record<ModuleId, () => Shape[]> = {
	dwelling,
	garden,
	solar,
	wind,
	dock,
	workshop,
	commons,
};

/** A module on its pontoon, back to front. */
export const model = (id: ModuleId): readonly Shape[] => [...pontoon, ...BUILD[id]()];
