export const ZONES = [
	{ name: "Sunlight", from: 0 },
	{ name: "Twilight", from: 200 },
	{ name: "Midnight", from: 1000 },
	{ name: "Abyssal", from: 4000 },
] as const;

export type Zone = (typeof ZONES)[number];

export const zoneAt = (metres: number): Zone =>
	ZONES.findLast((zone) => metres >= zone.from) ?? ZONES[0];

export const formatMetres = (metres: number) => `${Math.round(metres).toLocaleString("en-GB")} m`;

export interface Stop {
	/** Value of the `data-stop` attribute on the section, and the id its gauge link jumps to. */
	id: string;
	label: string;
	depth: number;
}

/** Where each section sits in the water column, top to bottom. */
export const STOPS = [
	{ id: "surface", label: "Surface", depth: 0 },
	{ id: "idea", label: "The idea", depth: 40 },
	{ id: "clips", label: "Clips", depth: 200 },
	{ id: "press", label: "Press", depth: 1000 },
	{ id: "newsletter", label: "Newsletter", depth: 4000 },
	{ id: "seabed", label: "Seabed", depth: 4300 },
] as const satisfies readonly Stop[];

export type StopId = (typeof STOPS)[number]["id"];

export const stop = (id: StopId) => STOPS.find((s) => s.id === id) ?? STOPS[0];
