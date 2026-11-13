export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

export type Material =
	| "hull"
	| "wall"
	| "roof"
	| "deck"
	| "green"
	| "solar"
	| "glass"
	| "metal"
	| "lamp";

/** 0 faces the sky; 1–4 are walls, from lit (facing left) to shaded (facing right). */
export type Shade = 0 | 1 | 2 | 3 | 4;

export type Shape =
	| { kind: "fill"; d: string; material: Material; shade: Shade }
	| { kind: "line"; d: string; material: Material; width: number }
	| { kind: "halo"; d: string }
	| { kind: "shadow"; d: string }
	| { kind: "spin"; at: Vec2; squash: number; shapes: readonly Shape[] };

/** Camera pitched 30° above the horizon, looking away from the viewer: 1 unit = one hex radius. */
const PITCH = Math.PI / 6;
const GROUND = Math.sin(PITCH);
const HEIGHT = Math.cos(PITCH);

export const project = ([x, y, z]: Vec3): Vec2 => [x, y * GROUND - z * HEIGHT];

const n = (v: number) => Number(v.toFixed(3));
const pathOf = (points: readonly Vec2[]) =>
	`M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`;
const at = (points: readonly Vec2[], z: number) => points.map(([x, y]) => project([x, y, z]));

export const circle = ([cx, cy]: Vec2, r: number) =>
	`M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;

export const ngon = (cx: number, cy: number, r: number, sides: number, turn = 0): Vec2[] =>
	Array.from({ length: sides }, (_, i) => {
		const a = (turn * Math.PI) / 180 + (i * 2 * Math.PI) / sides;
		return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
	});

export const rect = (cx: number, cy: number, w: number, d: number, turn = 30): Vec2[] => {
	const a = (turn * Math.PI) / 180;
	const [c, s] = [Math.cos(a), Math.sin(a)];
	return (
		[
			[-w / 2, -d / 2],
			[w / 2, -d / 2],
			[w / 2, d / 2],
			[-w / 2, d / 2],
		] as const
	).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as const);
};

interface Wall {
	a: Vec2;
	b: Vec2;
	shade: Shade;
}

/** The walls of a convex footprint that face the camera. */
const walls = (footprint: readonly Vec2[]): Wall[] => {
	const cx = footprint.reduce((sum, p) => sum + p[0], 0) / footprint.length;
	const cy = footprint.reduce((sum, p) => sum + p[1], 0) / footprint.length;
	return footprint.flatMap((a, i) => {
		const b = footprint[(i + 1) % footprint.length] ?? a;
		let nx = b[1] - a[1];
		let ny = a[0] - b[0];
		const length = Math.hypot(nx, ny) || 1;
		if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) [nx, ny] = [-nx, -ny];
		if (ny / length < 0.02) return [];
		const shade = Math.min(4, Math.max(1, 1 + Math.round(((nx / length + 1) / 2) * 3))) as Shade;
		return [{ a, b, shade }];
	});
};

/** An extruded convex footprint: its camera-facing walls, then its top. */
export const prism = (
	footprint: readonly Vec2[],
	z0: number,
	z1: number,
	material: Material,
	top: Material = material,
): Shape[] => [
	...walls(footprint).map(
		({ a, b, shade }): Shape => ({
			kind: "fill",
			d: pathOf([...at([a, b], z0), ...at([b, a], z1)]),
			material,
			shade,
		}),
	),
	{ kind: "fill", d: pathOf(at(footprint, z1)), material: top, shade: 0 },
];

/** `count` panes per camera-facing wall, between heights `z0` and `z1`. */
export const panes = (
	footprint: readonly Vec2[],
	z0: number,
	z1: number,
	count: number,
	material: Material = "glass",
): Shape[] =>
	walls(footprint).flatMap(({ a, b }) =>
		Array.from({ length: count }, (_, i): Shape => {
			const along = (t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
			const [from, to] = [along((i + 0.26) / count), along((i + 0.74) / count)];
			return {
				kind: "fill",
				d: pathOf([...at([from, to], z0), ...at([to, from], z1)]),
				material,
				shade: 0,
			};
		}),
	);

export const quad = (points: readonly Vec3[], material: Material, shade: Shade): Shape => ({
	kind: "fill",
	d: pathOf(points.map(project)),
	material,
	shade,
});

export const line = (a: Vec3, b: Vec3, material: Material, width: number): Shape => {
	const [[ax, ay], [bx, by]] = [project(a), project(b)];
	return { kind: "line", d: `M${n(ax)} ${n(ay)}L${n(bx)} ${n(by)}`, material, width };
};

export const ball = (centre: Vec3, r: number, material: Material): Shape[] => {
	const [x, y] = project(centre);
	return [
		{ kind: "fill", d: circle([x, y], r), material, shade: 2 },
		{ kind: "fill", d: circle([x - r * 0.22, y - r * 0.26], r * 0.62), material, shade: 0 },
	];
};

export const halo = (centre: Vec3, r: number): Shape => ({
	kind: "halo",
	d: circle(project(centre), r),
});

/** What the footprint casts on the deck, away from the light. */
export const shadow = (footprint: readonly Vec2[], reach = 0.1): Shape => ({
	kind: "shadow",
	d: pathOf(
		at(
			footprint.map(([x, y]) => [x + reach, y + reach * 0.5] as const),
			0,
		),
	),
});
