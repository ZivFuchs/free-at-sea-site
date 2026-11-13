export interface ModuleSpec {
	id: string;
	label: string;
	residents: number;
	/** kW: positive generates, negative draws. */
	power: number;
}

export const MODULES = [
	{ id: "dwelling", label: "Dwelling", residents: 6, power: -4 },
	{ id: "garden", label: "Garden", residents: 0, power: -1 },
	{ id: "solar", label: "Solar", residents: 0, power: 12 },
	{ id: "wind", label: "Wind", residents: 0, power: 30 },
	{ id: "dock", label: "Dock", residents: 0, power: -2 },
	{ id: "workshop", label: "Workshop", residents: 0, power: -10 },
	{ id: "commons", label: "Commons", residents: 0, power: -3 },
] as const satisfies readonly ModuleSpec[];

export type ModuleId = (typeof MODULES)[number]["id"];

/** One hexagonal pontoon, 10 m a side. */
export const CELL_AREA = 260;

/** Cell values: 0 is open water, `n` is `MODULES[n - 1]`. */
export const moduleAt = (value: number) => MODULES[value - 1];
export const cellValue = (id: ModuleId) => MODULES.findIndex((m) => m.id === id) + 1;
