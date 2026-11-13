/** Where the globe sits for one section: the point facing the viewer, and its place on screen. */
export interface View {
	lon: number;
	lat: number;
	/** Globe radius as a multiple of the viewport's shorter half-extent. */
	size: number;
	/** Centre, as fractions of the half-width / half-height from the middle of the screen (y up). */
	x: number;
	y: number;
}

interface Placement extends Pick<View, "size" | "x" | "y"> {
	/** Degrees the facing point is tipped below centre, when the globe's centre sits off screen. */
	tilt?: number;
}

export interface Stop extends Pick<View, "lon" | "lat"> {
	id: string;
	wide: Placement;
	narrow: Placement;
	/** Degrees per second of idle turn while this stop holds. */
	spin: number;
	/** Overall brightness, 0–1. */
	glow: number;
}

/** PLACEHOLDER copy: every date and claim here needs a fact-check before it ships. */
export const SITES = [
	{
		id: "polynesia",
		name: "French Polynesia",
		when: "2017",
		lon: -149.5,
		lat: -17.6,
		text: "A memorandum with the government for a floating island in a Tahitian lagoon. It lapsed a year later.",
	},
	{
		id: "phuket",
		name: "Off Phuket",
		when: "2019",
		lon: 98,
		lat: 7.6,
		text: "A two-storey spar a dozen nautical miles from shore, home to two people until the Thai navy towed it away.",
	},
	{
		id: "panama",
		name: "Linton Bay, Panama",
		when: "2022",
		lon: -79.6,
		lat: 9.6,
		text: "Homes on single steel columns, built in a boatyard and stood in sheltered Caribbean water.",
	},
] as const;

export type Site = (typeof SITES)[number];

const CLOSE: Pick<Stop, "wide" | "narrow" | "spin" | "glow"> = {
	wide: { size: 1.55, x: 0.46, y: -0.04 },
	narrow: { size: 2.1, x: 0, y: -0.46 },
	spin: 0,
	glow: 1,
};

export const STOPS: readonly Stop[] = [
	{
		id: "hero",
		lon: -150,
		lat: 6,
		wide: { size: 0.8, x: 0.46, y: -0.04 },
		narrow: { size: 1.45, x: 0, y: -0.62, tilt: 38 },
		spin: 2.2,
		glow: 1,
	},
	{
		id: "share",
		lon: -128,
		lat: -24,
		wide: { size: 1.12, x: 0.5, y: -0.02 },
		narrow: { size: 1.5, x: 0, y: -0.6, tilt: 30 },
		spin: 0,
		glow: 1,
	},
	{
		id: "limit",
		lon: -25,
		lat: 14,
		wide: { size: 1.7, x: 0.5, y: 0 },
		narrow: { size: 2.3, x: 0, y: -0.5 },
		spin: 0,
		glow: 1,
	},
	...SITES.map(({ id, lon, lat }) => ({ id, lon, lat, ...CLOSE })),
	{
		id: "tail",
		lon: -160,
		lat: 30,
		wide: { size: 1.5, x: 0.55, y: -0.5, tilt: 20 },
		narrow: { size: 1.7, x: 0.2, y: -0.75, tilt: 35 },
		spin: 1.2,
		glow: 0.4,
	},
];
