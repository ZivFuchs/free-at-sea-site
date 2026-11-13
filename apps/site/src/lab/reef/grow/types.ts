export type Rng = () => number;

export const mulberry = (seed: number): Rng => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

/** Where a colony grows, in document pixels. */
export interface Site {
	x: number;
	y: number;
	/** Reach of the colony. */
	r: number;
	/** Direction of growth, radians (canvas convention: -π/2 is up). */
	dir: number;
	/** True where growth may not go: text, cards, off the page. */
	blocked: (x: number, y: number) => boolean;
	rng: Rng;
}

export interface Growth {
	/** Steps per second at an unhurried pace. */
	pace: number;
	/** One growth step; false once the colony is finished. */
	step: () => boolean;
	/** Draws the colony in document coordinates. Only alpha matters: the caller colours it. */
	draw: (ctx: CanvasRenderingContext2D) => void;
}
