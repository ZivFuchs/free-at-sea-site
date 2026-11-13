export interface Beat {
	number: string;
	label: string;
	heading: string;
	body: string;
}

/** Invented copy: illustrative, to be fact-checked against the film. */
export const BEATS: readonly Beat[] = [
	{
		number: "01",
		label: "One platform",
		heading: "A city that starts as one platform.",
		body: "Nobody pours a city onto the ocean in a day. It begins with a single float: small enough to tow, big enough to stand on.",
	},
	{
		number: "02",
		label: "Rafts",
		heading: "Then it finds neighbours.",
		body: "Platforms that lock together stop fighting the swell and start sharing it. A raft rides steadier than anything it is made of.",
	},
	{
		number: "03",
		label: "Districts",
		heading: "Water stays in the plan.",
		body: "The gaps become canals. Each district keeps a channel around it, so any part can still cast off and leave.",
	},
	{
		number: "04",
		label: "City",
		heading: "From above, it is a pattern.",
		body: "Add a cell, remove a cell. The plan is never finished, only current.",
	},
];

export const CLOSING = {
	heading: "At dusk, the lights come on.",
	body: "This film follows the people who want to live there.",
};
