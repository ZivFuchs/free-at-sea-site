/** Mean Earth radius, metres. */
export const EARTH_RADIUS = 6_371_000;

export interface Stage {
	id: string;
	name: string;
	/** Headline measure shown beside the name. */
	measure: string;
	caption: string;
	/** World length (m) across the viewport's shorter side. */
	span: number;
	/** World point (m) held at the scene anchor: x along the sea, y above the waterline. */
	centre: readonly [number, number];
}

/** One drawing in elevation, origin at the feet of a person on the barge's deck. Captions are placeholders to fact-check. */
export const STAGES: readonly Stage[] = [
	{
		id: "person",
		name: "A person",
		measure: "1.7 m",
		caption:
			"Everything built at sea starts from this measure: one body that needs fresh water, shelter and company.",
		span: 3.6,
		centre: [0.25, 3.05],
	},
	{
		id: "room",
		name: "A room",
		measure: "6 m",
		caption: "A shipping container. Cheap, stackable, and already built to cross oceans.",
		span: 15,
		centre: [4.2, 4.6],
	},
	{
		id: "vessel",
		name: "A vessel",
		measure: "60 m",
		caption: "A barge: a flat steel deck carrying everything its crew brought with them.",
		span: 96,
		centre: [8, 6],
	},
	{
		id: "settlement",
		name: "A settlement",
		measure: "400 m",
		caption:
			"The plan: platforms joined edge to edge, added one at a time. Drawn dashed, because it does not exist yet.",
		span: 660,
		centre: [205, 28],
	},
	{
		id: "sea",
		name: "Open water",
		measure: "16 km",
		caption:
			"From the deck the horizon is seven kilometres off. A container ship passes. Four kilometres of water lie beneath.",
		span: 17_000,
		centre: [0, -1_500],
	},
	{
		id: "line",
		name: "The line",
		measure: "370 km",
		caption:
			"A coastal state's exclusive economic zone ends 200 nautical miles from shore. Past that line are the high seas.",
		span: 1_100_000,
		centre: [-150_000, 30_000],
	},
	{
		id: "ocean",
		name: "An ocean",
		measure: "9,000 km",
		caption: "The high seas cover close to half the planet's surface, and belong to no nation.",
		span: 9_000_000,
		centre: [1_400_000, -2_300_000],
	},
	{
		id: "planet",
		name: "A planet",
		measure: "12,742 km",
		caption:
			"Seen whole, it is mostly water: 71 per cent of the surface, in a layer too thin to draw at this scale.",
		span: 16_600_000,
		centre: [0, -EARTH_RADIUS],
	},
];
