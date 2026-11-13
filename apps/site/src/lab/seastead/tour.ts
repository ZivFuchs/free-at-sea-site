export type Vec3 = readonly [number, number, number];

export type ModuleKey = "hull" | "dock" | "living" | "core" | "energy";

export type AnchorKey =
	| "pontoon"
	| "gangway"
	| "pier"
	| "funnel"
	| "cistern"
	| "solar"
	| "turbine"
	| "battery"
	| "commons"
	| "homes"
	| "harbour"
	| "power"
	| "food";

export interface Stop {
	id: string;
	eyebrow: string;
	heading: string;
	body: string;
	camera: { position: Vec3; target: Vec3 };
	/** Phones: fraction of the viewport the model is lifted by, clearing the copy at the bottom. */
	lift: number;
}

/** The tour: one camera stop per section, in scroll order. The first is the hero, the last the pull-back. */
export const STOPS: readonly Stop[] = [
	{
		id: "arrival",
		eyebrow: "Sheet 01 · General arrangement",
		heading: "",
		body: "",
		camera: { position: [118, 60, 68], target: [4, 0, -6] },
		lift: -0.1,
	},
	{
		id: "buoyancy",
		eyebrow: "Buoyancy",
		heading: "First, it has to float.",
		body: "A seastead begins as a raft of hollow concrete pontoons, each one a small island. Linked by gangways and moored to the seabed, they ride the swell together, and any one of them can be towed away.",
		camera: { position: [60, 9, 52], target: [25, 2, 0] },
		lift: 0.12,
	},
	{
		id: "water",
		eyebrow: "Water",
		heading: "Then it has to drink.",
		body: "No river reaches the open ocean. Roofs funnel rain into cisterns, desalination makes up the rest, and greenhouses and fish pens put food within walking distance.",
		camera: { position: [-14, 21, 62], target: [-9, 3, 10] },
		lift: 0.14,
	},
	{
		id: "energy",
		eyebrow: "Energy",
		heading: "It has to power itself.",
		body: "There is no grid to plug into. Sun on the decks and wind over open water run the settlement, and batteries carry it through the night.",
		camera: { position: [-22, 24, -104], target: [10, 15, -16] },
		lift: 0.14,
	},
	{
		id: "governance",
		eyebrow: "Governance",
		heading: "And it has to govern itself.",
		body: "Past 200 nautical miles lie the high seas, outside any nation's territory. What law a floating town answers to out there is the question seasteading sets out to test. Its modular answer: if you disagree, your platform can leave.",
		camera: { position: [8, 175, 10], target: [8, 0, -4] },
		lift: 0.16,
	},
	{
		id: "horizon",
		eyebrow: "The film",
		heading: "Some people are already trying.",
		body: "Free at Sea follows the people building the first homes on the open ocean.",
		camera: { position: [250, 34, 250], target: [0, 16, 0] },
		lift: 0.1,
	},
];

/** When each module rises out of the drawing, in stop units (1 = the second stop). */
export const BUILD: Record<ModuleKey, readonly [from: number, to: number]> = {
	hull: [0.3, 0.95],
	dock: [0.55, 1.1],
	living: [1.3, 1.95],
	core: [1.45, 2.15],
	energy: [2.3, 3],
};

/** The drawing becomes a place under a cool morning sky, which then warms to golden hour. In stop units. */
export const DAYBREAK: readonly [from: number, to: number] = [0.4, 1.25];
export const WARMING: readonly [from: number, to: number] = [1.3, 3.5];

export interface Callout {
	stop: number;
	anchor: AnchorKey;
	label: string;
	detail: string;
	/** Label offset from the anchor on screen, px. */
	offset: readonly [x: number, y: number];
}

export const CALLOUTS: readonly Callout[] = [
	{
		stop: 1,
		anchor: "pontoon",
		label: "Pontoon",
		detail: "Hollow concrete, 18 m across",
		offset: [70, 90],
	},
	{
		stop: 1,
		anchor: "gangway",
		label: "Gangway",
		detail: "Hinged, flexes with the swell",
		offset: [70, -110],
	},
	{
		stop: 1,
		anchor: "pier",
		label: "Floating pier",
		detail: "Tenders and supply boats",
		offset: [90, -90],
	},
	{
		stop: 2,
		anchor: "funnel",
		label: "Rain funnel",
		detail: "Every roof is a catchment",
		offset: [80, -110],
	},
	{
		stop: 2,
		anchor: "cistern",
		label: "Cistern",
		detail: "Stored below deck level",
		offset: [110, 80],
	},
	{
		stop: 3,
		anchor: "solar",
		label: "Solar deck",
		detail: "Panels tilted for low latitudes",
		offset: [-70, 110],
	},
	{
		stop: 3,
		anchor: "turbine",
		label: "Turbine",
		detail: "Steady wind, no terrain",
		offset: [90, -40],
	},
	{
		stop: 3,
		anchor: "battery",
		label: "Battery store",
		detail: "Carries the night load",
		offset: [120, 60],
	},
	{
		stop: 4,
		anchor: "commons",
		label: "Commons",
		detail: "Shared deck and meeting hall",
		offset: [70, -70],
	},
	{ stop: 4, anchor: "homes", label: "Homes", detail: "", offset: [80, -50] },
	{ stop: 4, anchor: "harbour", label: "Harbour", detail: "", offset: [70, 60] },
	{ stop: 4, anchor: "power", label: "Power", detail: "", offset: [-60, 90] },
	{ stop: 4, anchor: "food", label: "Food", detail: "", offset: [-50, -90] },
];
