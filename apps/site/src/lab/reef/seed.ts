/** A colony's starting point, placed by percentage inside its clearing. */
export interface Seed {
	kind: "fan" | "stag" | "brain" | "polyp";
	x: number;
	y: number;
	/** Reach, as a multiple of the viewport's base colony size. */
	r?: number;
	/** Direction of growth in degrees (-90 is up). */
	dir?: number;
	/** Only on wide screens, where there is room. */
	wide?: boolean;
}
