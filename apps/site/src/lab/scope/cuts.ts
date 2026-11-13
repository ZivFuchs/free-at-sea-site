/** How a shot arrives. `window` is the share of the previous shot's scroll its transition is scrubbed over. */
export const CUTS = {
	fade: { label: "Fade in", window: 0 },
	cut: { label: "Cut", window: 0 },
	match: { label: "Match cut", window: 0 },
	push: { label: "Cut · push in", window: 0 },
	dissolve: { label: "Dissolve", window: 0.34 },
	wipe: { label: "Wipe", window: 0.26 },
	rack: { label: "Rack focus", window: 0.42 },
} as const;

export type Cut = keyof typeof CUTS;

/** Clips rotate through these, so each transition is used about once. */
export const CLIP_CUTS = ["cut", "dissolve", "wipe", "push"] as const satisfies readonly Cut[];

export const FPS = 24;
export const SHOT_SECONDS = 6;
/** The horizon in the opening shot, as a fraction of frame height: the line the match cut holds. */
export const HORIZON = 0.178;
