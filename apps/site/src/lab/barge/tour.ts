import type { AnchorName } from "./model";

type Triple = readonly [number, number, number];

interface View {
	position: Triple;
	target: Triple;
	/** Metres across that must stay in frame: the camera backs off on narrow screens to keep them. */
	span: number;
}

export interface Stop extends View {
	id: "aerial" | "waterline" | "below" | "apart" | "alone";
	/** Portrait framing, where the wide shot would shrink the vessel to a sliver. */
	narrow?: View;
}

/** The camera's authored moves, one per section. Metres; bow is +x, the near side +z. */
export const STOPS: readonly Stop[] = [
	{
		id: "aerial",
		position: [62, 74, 118],
		target: [2, 0, -10],
		span: 150,
		narrow: { position: [96, 82, 70], target: [0, 0, -8], span: 62 },
	},
	{
		id: "waterline",
		position: [43, 2.1, 19.5],
		target: [8, 1.7, 5.5],
		span: 14,
		narrow: { position: [41, 2.4, 15.5], target: [8, 1.9, 6.5], span: 9 },
	},
	{
		id: "below",
		position: [3, 8.5, 54],
		target: [-1, 0.4, 4.4],
		span: 68,
		narrow: { position: [-12, 6.5, 40], target: [-17.5, 0.9, 4.4], span: 21 },
	},
	{
		id: "apart",
		position: [58, 42, 62],
		target: [0, 6.5, 0],
		span: 78,
		narrow: { position: [78, 52, 40], target: [0, 7, 0], span: 40 },
	},
	{
		id: "alone",
		position: [-170, 58, 230],
		target: [0, 0, 20],
		span: 200,
		narrow: { position: [-150, 90, 240], target: [0, 0, 30], span: 110 },
	},
];

export interface Callout {
	anchor: AnchorName;
	when: Extract<Stop["id"], "below" | "apart">;
	title: string;
	note: string;
	/** Label offset from its anchor, in px (halved on narrow screens). */
	offset: readonly [number, number];
}

export const CALLOUTS: readonly Callout[] = [
	{
		anchor: "bunks",
		when: "below",
		title: "Bunk room",
		note: "Six berths in a forty-foot box",
		offset: [-70, -120],
	},
	{
		anchor: "workshop",
		when: "below",
		title: "Workshop",
		note: "Bench, spares, comms rack",
		offset: [80, -130],
	},
	{
		anchor: "ballast",
		when: "below",
		title: "Ballast tank",
		note: "Flooded to steady the deck",
		offset: [-90, 110],
	},
	{
		anchor: "void",
		when: "below",
		title: "Void space",
		note: "Sealed air: this is what floats",
		offset: [-40, 130],
	},
	{
		anchor: "quarters",
		when: "apart",
		title: "Quarters",
		note: "Lifts off in one piece",
		offset: [-150, -40],
	},
	{
		anchor: "power",
		when: "apart",
		title: "Solar roof",
		note: "Panels over the galley",
		offset: [-120, -90],
	},
	{
		anchor: "comms",
		when: "apart",
		title: "Satellite link",
		note: "The only line ashore",
		offset: [40, -130],
	},
	{
		anchor: "water",
		when: "apart",
		title: "Fresh water",
		note: "Four tanks, rain and delivery",
		offset: [150, -50],
	},
	{
		anchor: "deck",
		when: "apart",
		title: "Deck plate",
		note: "960 m² of working floor",
		offset: [-170, 60],
	},
	{
		anchor: "hull",
		when: "apart",
		title: "Hull",
		note: "Sixteen watertight compartments",
		offset: [140, 90],
	},
];

/** Illustrative particulars: not the real vessel's survey. */
export const PARTICULARS = [
	["Length", "60 m"],
	["Beam", "16 m"],
	["Draught", "1.3 m"],
	["Deck", "960 m²"],
] as const;
