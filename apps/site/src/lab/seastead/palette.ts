/** Material colours of the model (sRGB hex), as an architect's card-and-timber maquette. */
export const TONES = {
	concrete: 0xc9cdca,
	rubber: 0x2c353d,
	deck: 0xd6c3a0,
	wall: 0xf1f0ea,
	trim: 0xb9a88a,
	garden: 0x7f9a6c,
	glass: 0x5d7f93,
	panel: 0x1c2a40,
	steel: 0xdfe4e6,
	container: 0x5f7f86,
	hull: 0xf4f3ee,
	buoy: 0xc98a4b,
} as const;

export type Tone = keyof typeof TONES;

/** Scene lighting and atmosphere at golden hour. */
export const DUSK = {
	zenith: 0x4c6f9c,
	horizon: 0xf0c49a,
	glow: 0xffb070,
	deep: 0x0c3347,
	sun: 0xffc38c,
	skyFill: 0xa9c0de,
	seaFill: 0x3d5a66,
	window: 0xffd08a,
} as const;

/** The same on a cool, overcast morning: the light the drawing first wakes into. */
export const DAWN = {
	zenith: 0x6d8cab,
	horizon: 0xc9d6df,
	glow: 0x333c44,
	deep: 0x154159,
	sun: 0xf2f6ff,
	skyFill: 0xd3e2f1,
	seaFill: 0x35556b,
	window: 0xdcecf2,
} as const satisfies Record<keyof typeof DUSK, number>;

/** Built edges, as pencil on the model. */
export const INK = 0x14222e;
