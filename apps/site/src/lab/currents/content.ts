/** A camera position: the map point to centre and the most map units to show across and down. */
export interface View {
	lon: number;
	lat: number;
	spanX: number;
	spanY: number;
	/** Extra height allowed on portrait screens, as a multiple of `spanY`, so phones keep some coast in frame. */
	portrait?: number;
}

export interface Passage {
	view: View;
	kicker: string;
	heading: string;
	body: string;
}

export const WORLD: View = { lon: -160, lat: 2, spanX: 5.6, spanY: 3.5 };
/** Open Southern Ocean, no land in frame: the backdrop behind the rest of the page. */
export const OPEN_WATER: View = { lon: -128, lat: -50, spanX: 1.5, spanY: 1.2 };

/** Invented explainer copy. Figures need a fact-check before shipping. */
export const PASSAGES: readonly Passage[] = [
	{
		view: { lon: -168, lat: 30, spanX: 2.1, spanY: 1.5, portrait: 1.5 },
		kicker: "01 · North Pacific Gyre",
		heading: "The ocean turns in wheels",
		body: "Wind and the planet's spin wind each basin into a slow gyre, thousands of kilometres across. Water races up the western edge and drifts back down the east. The still centres are among the least-visited places on Earth.",
	},
	{
		view: { lon: -135, lat: -24, spanX: 1.9, spanY: 1.5, portrait: 1.5 },
		kicker: "02 · South Pacific",
		heading: "Past two hundred miles, no one's water",
		body: "A coastal state's economic zone ends 200 nautical miles from shore. Beyond lie the high seas, close to two-thirds of the ocean, under no nation's sovereignty. Seasteaders look here for room to begin.",
	},
	{
		view: { lon: -74, lat: -56, spanX: 1.5, spanY: 1.1, portrait: 1.6 },
		kicker: "03 · Southern Ocean",
		heading: "One current never meets a shore",
		body: "The Antarctic Circumpolar Current runs clear around the world, squeezed only at the Drake Passage. Everything set adrift is carried somewhere. A home at sea has to choose its water.",
	},
];

export interface Label {
	text: string;
	lon: number;
	lat: number;
	/** Stops (0 world, 1–3 passages) at which it shows. */
	stops: readonly number[];
	kind: "gyre" | "current" | "site";
	/** Too crowded for the phone's world view. */
	wide?: boolean;
}

export const LABELS: readonly Label[] = [
	{ text: "North Pacific Gyre", lon: -150, lat: 31, stops: [0, 1], kind: "gyre", wide: true },
	{ text: "South Pacific Gyre", lon: -118, lat: -30, stops: [0, 2], kind: "gyre", wide: true },
	{ text: "North Atlantic Gyre", lon: -42, lat: 30, stops: [0], kind: "gyre", wide: true },
	{ text: "South Atlantic Gyre", lon: -14, lat: -29, stops: [0], kind: "gyre", wide: true },
	{ text: "Indian Ocean Gyre", lon: 76, lat: -30, stops: [0], kind: "gyre", wide: true },
	{
		text: "Antarctic Circumpolar Current",
		lon: -130,
		lat: -58,
		stops: [0],
		kind: "current",
		wide: true,
	},
	{ text: "Kuroshio", lon: 141, lat: 31, stops: [1], kind: "current" },
	{ text: "North Pacific Current", lon: -165, lat: 44, stops: [1], kind: "current" },
	{ text: "California Current", lon: -127, lat: 30, stops: [1], kind: "current" },
	{ text: "North Equatorial Current", lon: -165, lat: 13, stops: [1], kind: "current" },
	{ text: "South Equatorial Current", lon: -128, lat: -3, stops: [2], kind: "current" },
	{ text: "Humboldt Current", lon: -80, lat: -27, stops: [2], kind: "current" },
	{ text: "Drake Passage", lon: -64, lat: -59, stops: [3], kind: "current" },
	{ text: "Antarctic Circumpolar Current", lon: -98, lat: -57, stops: [3], kind: "current" },
	/** Placeholder seasteading sites: confirm before shipping. */
	{ text: "French Polynesia", lon: -149.5, lat: -17.5, stops: [0, 2], kind: "site" },
	{ text: "Panama", lon: -79.6, lat: 9.3, stops: [0], kind: "site", wide: true },
	{ text: "Andaman Sea", lon: 97.6, lat: 7.6, stops: [0], kind: "site", wide: true },
];
