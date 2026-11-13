import { clamp, smoothstep } from "@/lab/lib/motion";

/** Seconds. The main title starts landing as the last credit clears. */
export const DURATION = 16;
export const TITLE_START = 12.6;

interface Card {
	id: string;
	start: number;
	end: number;
}

export const CARDS = [
	{ id: "presents", start: 1.6, end: 4.8 },
	{ id: "tagline", start: 4.6, end: 7.8 },
	{ id: "director", start: 7.4, end: 10.4 },
	{ id: "line", start: 9.6, end: TITLE_START },
] as const satisfies readonly Card[];

export type CardId = (typeof CARDS)[number]["id"];

const FADE_IN = 0.9;
const FADE_OUT = 1.1;
/** Footage dimmed behind the credits. */
const DIM = 0.45;

/** The whole frame at `t` seconds, as CSS custom properties (0–1 unless noted). */
export const frame = (t: number) => ({
	veil: 1 - (1 - DIM) * smoothstep(0.4, 3.4, t) - DIM * smoothstep(TITLE_START, 14.8, t),
	/** Scale of the footage: one slow push-in under everything. */
	push: 1 + 0.1 * smoothstep(0, DURATION, t),
	bars: 1 - smoothstep(13.2, 15, t),
	land: smoothstep(TITLE_START, 14.6, t),
	rule: smoothstep(12.2, 13.6, t) * (1 - smoothstep(14.4, 15.6, t)),
	tag: smoothstep(14.2, 15.2, t),
	chrome: smoothstep(15, DURATION, t),
});

/** One credit at `t`: `o` opacity, `k` progress through its life, `sink` line-heights sunk (the submerging line). */
export const cardFrame = ({ start, end }: Card, t: number) => {
	const k = clamp((t - start) / (end - start));
	return {
		o: smoothstep(start, start + FADE_IN, t) * (1 - smoothstep(end - FADE_OUT, end, t)),
		k,
		sink: 1.7 * smoothstep(0.36, 1, k),
	};
};
