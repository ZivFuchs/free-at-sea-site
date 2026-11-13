export type WashKind = "wash" | "blob" | "sky" | "sea" | "dry" | "photo" | "glow";
export type Pigment = "prussian" | "indigo" | "viridian" | "sand" | "ink";

export interface Wash {
	kind: WashKind;
	pigment: Pigment;
	/** Second pigment, mixed in wet. */
	mix?: Pigment;
	/** x, y, w, h as fractions of the sheet. */
	rect: readonly [number, number, number, number];
	strength: number;
	/** Seconds after the sheet starts. */
	delay?: number;
	duration?: number;
	/** Direction the brush travels, degrees clockwise from left-to-right. */
	angle?: number;
}

export const KINDS: readonly WashKind[] = ["wash", "blob", "sky", "sea", "dry", "photo", "glow"];
export const PIGMENTS: readonly Pigment[] = ["prussian", "indigo", "viridian", "sand", "ink"];

/** The hero seascape: sky, a warm glow above the horizon, the sea, a darker glaze at the horizon, the barge. */
export const SEASCAPE: readonly Wash[] = [
	{
		kind: "sky",
		pigment: "prussian",
		mix: "indigo",
		rect: [0.02, 0.02, 0.96, 0.54],
		strength: 0.5,
		delay: 0.2,
		duration: 1.7,
	},
	{
		kind: "glow",
		pigment: "sand",
		rect: [0.08, 0.38, 0.84, 0.19],
		strength: 0.6,
		delay: 1,
		duration: 1.1,
		angle: 180,
	},
	{
		kind: "sea",
		pigment: "prussian",
		mix: "viridian",
		rect: [0.03, 0.56, 0.94, 0.38],
		strength: 0.6,
		delay: 1.7,
		duration: 1.6,
		angle: 180,
	},
	{
		kind: "sea",
		pigment: "indigo",
		mix: "prussian",
		rect: [0.02, 0.56, 0.96, 0.1],
		strength: 0.5,
		delay: 2.6,
		duration: 1.2,
	},
	{
		kind: "dry",
		pigment: "ink",
		rect: [0.6, 0.619, 0.075, 0.004],
		strength: 1.7,
		delay: 3.8,
		duration: 0.35,
	},
	{
		kind: "dry",
		pigment: "ink",
		mix: "prussian",
		rect: [0.612, 0.611, 0.02, 0.007],
		strength: 1.4,
		delay: 4,
		duration: 0.25,
	},
	{
		kind: "dry",
		pigment: "ink",
		mix: "indigo",
		rect: [0.643, 0.613, 0.012, 0.005],
		strength: 1.3,
		delay: 4.1,
		duration: 0.25,
	},
];

/** A photograph painted in: underpainting first, the picture developing behind the wet front. */
export const print = (pigment: Pigment, angle = 0): readonly Wash[] => [
	{
		kind: "photo",
		pigment,
		mix: "indigo",
		rect: [0.04, 0.05, 0.92, 0.9],
		strength: 0.7,
		duration: 2.6,
		angle,
	},
];

/** A test swatch, as painters leave in a margin. */
export const swatch = (pigment: Pigment, mix?: Pigment): readonly Wash[] => [
	{ kind: "wash", pigment, mix, rect: [0.08, 0.14, 0.84, 0.72], strength: 0.75, duration: 1.2 },
];
