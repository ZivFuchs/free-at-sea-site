export interface Chapter {
	/** Scroll progress through the pinned shot (0–1) where the line appears and clears. */
	from: number;
	to: number;
	label: string;
	line: string;
}

/** Copy pinned to moments of the approach. The last holds until the shot releases. */
export const CHAPTERS: readonly Chapter[] = [
	{
		from: 0.18,
		to: 0.37,
		label: "The line",
		line: "Two hundred nautical miles from any coast, the last national claim on the sea runs out.",
	},
	{
		from: 0.41,
		to: 0.6,
		label: "The high seas",
		line: "What lies beyond belongs to no one. Anyone may cross it. A few mean to stay.",
	},
	{
		from: 0.64,
		to: 0.82,
		label: "The vessel",
		line: "It starts small: a steel deck, a few cabins, and people willing to try.",
	},
	{ from: 0.86, to: 2, label: "The film", line: "Free at Sea is their story." },
];
