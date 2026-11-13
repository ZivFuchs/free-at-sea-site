import * as THREE from "three";
import { TONES, type Tone } from "./palette";
import type { AnchorKey, ModuleKey } from "./tour";

/** Metres. Hex pontoons, pointed along z. */
const R = 9;
const GAP = 1.2;
const PITCH = Math.sqrt(3) * R + GAP;
const DECK = 1.3;
const FLOOR = 3;
const EDGE_ANGLE = 30;
const SIXTH = Math.PI / 3;

const site = (q: number, r: number) =>
	new THREE.Vector2(PITCH * (q / 2 + r), ((PITCH * Math.sqrt(3)) / 2) * q);

const SITES = {
	core: site(0, 0),
	dock: site(0, 1),
	livingA: site(1, 0),
	livingB: site(1, -1),
	livingC: site(0, -1),
	solarA: site(-1, 0),
	solarB: site(-1, 1),
	turbine: site(-2, 2),
	garden: site(1, -2),
} as const;

const SPAR = new THREE.Vector2(44, -50);
const PENS = [new THREE.Vector2(-43.5, 21), new THREE.Vector2(-47.5, 8.5)] as const;

/** Footprints the water darkens under: x, z, radius. */
export const HULLS: readonly THREE.Vector3[] = [
	...Object.values(SITES).map((s) => new THREE.Vector3(s.x, s.y, R)),
	new THREE.Vector3(40, 0, 7),
];

const mulberry = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const at = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) =>
	new THREE.Matrix4().compose(
		new THREE.Vector3(x, y, z),
		new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")),
		new THREE.Vector3(1, 1, 1),
	);

/** Primitives sit on their base, not their centre. */
const box = (w: number, h: number, d: number) =>
	new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
const cyl = (top: number, bottom: number, h: number, segments = 16) =>
	new THREE.CylinderGeometry(top, bottom, h, segments).translate(0, h / 2, 0);

const paint = (geometry: THREE.BufferGeometry, tone: Tone) => {
	const { r, g, b } = new THREE.Color(TONES[tone]);
	const count = geometry.getAttribute("position").count;
	const colors = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) colors.set([r, g, b], i * 3);
	geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	geometry.deleteAttribute("uv");
	return geometry;
};

/** Concatenates non-indexed geometries that share an attribute set. */
const mergeGeometries = (parts: readonly THREE.BufferGeometry[]) => {
	const merged = new THREE.BufferGeometry();
	for (const name of Object.keys(parts[0]?.attributes ?? {})) {
		const sources = parts.map((g) => g.getAttribute(name));
		const size = sources[0]?.itemSize ?? 3;
		const array = new Float32Array(sources.reduce((n, a) => n + a.count * size, 0));
		let offset = 0;
		for (const a of sources) {
			array.set(a.array, offset);
			offset += a.count * size;
		}
		merged.setAttribute(name, new THREE.BufferAttribute(array, size));
	}
	for (const g of parts) g.dispose();
	return merged;
};

const segments = (points: readonly THREE.Vector3[]) =>
	new THREE.BufferGeometry().setFromPoints([...points]);

export interface Module {
	group: THREE.Group;
	/** Highest point, for the build sweep. */
	top: number;
	/** Solids exist below this plane, the drawing above it. */
	cut: THREE.Plane;
	above: THREE.Plane;
	/** Unbuilt volumes: flat paper faces that hide the lines behind them. */
	ghost: THREE.MeshBasicMaterial;
	draft: THREE.LineBasicMaterial;
	trace: THREE.LineBasicMaterial;
	glow: THREE.MeshBasicMaterial;
}

/** Collects one module's parts, then merges them into a solid, its lit windows, and its line drawing. */
class Kit {
	private solids: THREE.BufferGeometry[] = [];
	private glows: THREE.BufferGeometry[] = [];
	private edges: THREE.BufferGeometry[] = [];
	private base = new THREE.Matrix4();
	private top = 0;
	readonly group = new THREE.Group();
	readonly cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
	readonly above = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
	readonly solid = new THREE.MeshStandardMaterial({
		vertexColors: true,
		flatShading: true,
		roughness: 0.92,
		metalness: 0,
		side: THREE.DoubleSide,
		clippingPlanes: [this.cut],
		clipShadows: true,
	});
	readonly glow = new THREE.MeshBasicMaterial({
		side: THREE.DoubleSide,
		clippingPlanes: [this.cut],
		toneMapped: false,
	});
	readonly ghost = new THREE.MeshBasicMaterial({
		side: THREE.DoubleSide,
		transparent: true,
		polygonOffset: true,
		polygonOffsetFactor: 1,
		polygonOffsetUnits: 1,
		clippingPlanes: [this.above],
	});
	readonly draft = new THREE.LineBasicMaterial({ transparent: true, clippingPlanes: [this.above] });
	readonly trace = new THREE.LineBasicMaterial({
		transparent: true,
		depthWrite: false,
		clippingPlanes: [this.cut],
	});

	constructor(private marks: Partial<Record<AnchorKey, THREE.Vector3>>) {}

	/** Following parts are placed relative to a platform centre at the waterline. */
	on({ x, y }: THREE.Vector2, turns = 0) {
		this.base = at(x, 0, y, turns * SIXTH);
		return this;
	}

	private place(geometry: THREE.BufferGeometry, m: THREE.Matrix4) {
		const g = (geometry.index ? geometry.toNonIndexed() : geometry).applyMatrix4(
			this.base.clone().multiply(m),
		);
		g.computeBoundingBox();
		this.top = Math.max(this.top, g.boundingBox?.max.y ?? 0);
		return g;
	}

	add(geometry: THREE.BufferGeometry, tone: Tone, m: THREE.Matrix4) {
		const g = this.place(geometry, m);
		this.edges.push(new THREE.EdgesGeometry(g, EDGE_ANGLE));
		this.solids.push(paint(g, tone));
	}

	lit(geometry: THREE.BufferGeometry, m: THREE.Matrix4) {
		const g = this.place(geometry, m);
		this.edges.push(new THREE.EdgesGeometry(g, EDGE_ANGLE));
		this.glows.push(g);
	}

	/** Drawn but never built: lines only, in world space. */
	line(points: readonly THREE.Vector3[]) {
		this.edges.push(segments(points));
	}

	ring(x: number, y: number, z: number, radius: number, steps = 48) {
		const points: THREE.Vector3[] = [];
		for (let i = 0; i < steps; i++) {
			for (const k of [i, i + 1]) {
				const a = (k / steps) * Math.PI * 2;
				points.push(new THREE.Vector3(x + Math.cos(a) * radius, y, z + Math.sin(a) * radius));
			}
		}
		this.line(points);
	}

	mark(key: AnchorKey, x: number, y: number, z: number) {
		this.marks[key] = new THREE.Vector3(x, y, z).applyMatrix4(this.base);
	}

	private lines(geometry: THREE.BufferGeometry) {
		return [
			new THREE.LineSegments(geometry, this.draft),
			new THREE.LineSegments(geometry, this.trace),
		];
	}

	private mesh(geometry: THREE.BufferGeometry) {
		const mesh = new THREE.Mesh(geometry, this.solid);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	}

	/** A part that moves on its own (a rotor), sharing the module's materials. Parts are local to `pivot`. */
	spinner(parts: readonly THREE.BufferGeometry[], tone: Tone, pivot: THREE.Vector3, yaw: number) {
		const mount = new THREE.Group();
		mount.position.copy(pivot.applyMatrix4(this.base));
		mount.rotation.y = yaw;
		const rotor = new THREE.Group();
		const plain = parts.map((g) => (g.index ? g.toNonIndexed() : g));
		const edges = mergeGeometries(plain.map((g) => new THREE.EdgesGeometry(g, EDGE_ANGLE)));
		const solid = mergeGeometries(plain.map((g) => paint(g, tone)));
		rotor.add(this.mesh(solid), new THREE.Mesh(solid, this.ghost), ...this.lines(edges));
		mount.add(rotor);
		this.group.add(mount);
		this.top = Math.max(this.top, mount.position.y + 12);
		return rotor;
	}

	finish(): Module {
		if (this.solids.length) {
			const solid = mergeGeometries(this.solids);
			this.group.add(this.mesh(solid), new THREE.Mesh(solid, this.ghost));
		}
		if (this.glows.length) this.group.add(new THREE.Mesh(mergeGeometries(this.glows), this.glow));
		if (this.edges.length) this.group.add(...this.lines(mergeGeometries(this.edges)));
		const { group, top, cut, above, ghost, draft, trace, glow } = this;
		return { group, top, cut, above, ghost, draft, trace, glow };
	}
}

const pontoon = (kit: Kit) => {
	kit.add(cyl(R, R * 0.95, 2.6, 6), "concrete", at(0, -DECK, 0));
	kit.add(cyl(R + 0.12, R + 0.12, 0.28, 6), "rubber", at(0, 0.55, 0));
	kit.add(cyl(R - 0.55, R - 0.55, 0.08, 6), "deck", at(0, DECK, 0));
};

interface Block {
	x: number;
	z: number;
	turns?: number;
	w: number;
	d: number;
	floors: number;
	roof?: "garden" | "deck";
	y?: number;
}

/** A flat-roofed block with a window grid on its long faces; some windows are lit. */
const block = (
	kit: Kit,
	rng: () => number,
	{ x, z, turns = 0, w, d, floors, roof, y = DECK }: Block,
) => {
	const h = floors * FLOOR;
	const m = at(x, y, z, turns * SIXTH);
	const put = (local: THREE.Matrix4) => m.clone().multiply(local);
	kit.add(box(w, h, d), "wall", m);
	kit.add(box(w + 0.35, 0.18, d + 0.35), "trim", put(at(0, h, 0)));
	if (roof) kit.add(box(w - 1, 0.14, d - 1), roof, put(at(0, h + 0.18, 0)));

	const columns = Math.floor((w - 0.8) / 1.5);
	for (let floor = 0; floor < floors; floor++) {
		for (let i = 0; i < columns; i++) {
			for (const side of [1, -1]) {
				if (rng() < 0.18) continue;
				const pane = new THREE.PlaneGeometry(0.8, 1.3);
				const local = at(
					(i - (columns - 1) / 2) * 1.5,
					floor * FLOOR + 1.45,
					side * (d / 2 + 0.03),
					side > 0 ? 0 : Math.PI,
				);
				if (rng() < 0.45) kit.lit(pane, put(local));
				else kit.add(pane, "glass", put(local));
			}
		}
	}
	return h;
};

const funnel = (kit: Kit, x: number, z: number) => {
	kit.add(cyl(0.14, 0.2, 4.4, 8), "steel", at(x, DECK, z));
	kit.add(
		new THREE.CylinderGeometry(2.7, 0.3, 1, 20, 1, true).translate(0, 0.5, 0),
		"steel",
		at(x, DECK + 4, z),
	);
	kit.ring(x, DECK + 5, z, 2.7);
};

const tank = (kit: Kit, x: number, z: number, radius = 1.1, h = 2.6) => {
	kit.add(cyl(radius, radius, h), "steel", at(x, DECK, z));
	kit.add(cyl(radius * 0.25, radius, 0.35), "steel", at(x, DECK + h, z));
};

const homes = (kit: Kit, rng: () => number) => {
	const tall = rng() < 0.5 ? 3 : 2;
	block(kit, rng, { x: -2.2, z: -2.7, w: 7, d: 4, floors: 2, roof: "garden" });
	block(kit, rng, { x: 3.1, z: 2.6, turns: 1, w: 6, d: 3.6, floors: 1, roof: "deck" });
	block(kit, rng, { x: -3.5, z: 3.3, turns: 2, w: 4.4, d: 3.4, floors: tall, roof: "garden" });
	funnel(kit, 3.8, -3.6);
	tank(kit, 0.4, 5.4, 0.9, 2.2);
};

const core = (kit: Kit, rng: () => number) => {
	const H = 14;
	kit.add(cyl(4.1, 4.8, H, 6), "wall", at(0, DECK, 0));
	for (let floor = 0; floor < 4; floor++) {
		const y = floor * 3.3 + 2;
		const apothem = THREE.MathUtils.lerp(4.8, 4.1, y / H) * Math.cos(Math.PI / 6) + 0.05;
		for (let face = 0; face < 6; face++) {
			const a = (face + 0.5) * SIXTH;
			for (const offset of [-1.1, 0, 1.1]) {
				const pane = new THREE.PlaneGeometry(0.75, 1.6);
				const m = at(Math.sin(a) * apothem, DECK + y, Math.cos(a) * apothem, a).multiply(
					at(offset, 0, 0),
				);
				if (rng() < 0.55) kit.lit(pane, m);
				else kit.add(pane, "glass", m);
			}
		}
	}
	kit.add(cyl(4.5, 4.3, 0.4, 6), "trim", at(0, DECK + H, 0));
	kit.add(cyl(1.5, 1.8, 2.4, 6), "glass", at(0, DECK + H + 0.4, 0));
	kit.add(cyl(1.9, 1.9, 0.16, 6), "trim", at(0, DECK + H + 2.8, 0));
	kit.add(cyl(0.05, 0.1, 6.5, 6), "steel", at(0, DECK + H + 2.9, 0));
	kit.add(box(1.8, 0.1, 0.1), "steel", at(0, DECK + H + 7, 0));

	// Canopy over the commons, on slim columns.
	kit.add(new THREE.CylinderGeometry(7, 7, 0.16, 6, 1, true), "trim", at(0, DECK + 3.6, 0));
	kit.add(
		new THREE.RingGeometry(4.9, 7, 6, 1).rotateX(-Math.PI / 2).rotateY(Math.PI / 6),
		"deck",
		at(0, DECK + 3.68, 0),
	);
	for (let i = 0; i < 6; i++) {
		const a = i * SIXTH;
		kit.add(cyl(0.09, 0.09, 3.6, 6), "steel", at(Math.sin(a) * 6.7, DECK, Math.cos(a) * 6.7));
	}
	kit.mark("commons", 0, DECK + H + 3, 0);
};

const hullShape = (length: number, beam: number) => {
	const l = length / 2;
	const b = beam / 2;
	const shape = new THREE.Shape();
	shape.moveTo(-l, -b * 0.85);
	shape.lineTo(l * 0.35, -b);
	shape.lineTo(l, 0);
	shape.lineTo(l * 0.35, b);
	shape.lineTo(-l, b * 0.85);
	shape.closePath();
	return shape;
};

const boat = (kit: Kit, x: number, z: number, ry: number, length: number, sail = false) => {
	const beam = length * 0.32;
	const m = at(x, -0.25, z, ry);
	const hull = new THREE.ExtrudeGeometry(hullShape(length, beam), {
		depth: 0.95,
		bevelEnabled: false,
	}).rotateX(-Math.PI / 2);
	kit.add(hull, "hull", m);
	kit.add(
		box(length * 0.3, 0.75, beam * 0.6),
		sail ? "hull" : "rubber",
		m.clone().multiply(at(-length * 0.08, 0.95, 0)),
	);
	if (!sail) return;
	kit.add(
		cyl(0.05, 0.07, length * 1.25, 6),
		"steel",
		m.clone().multiply(at(length * 0.08, 0.95, 0)),
	);
	kit.add(box(length * 0.42, 0.08, 0.08), "steel", m.clone().multiply(at(-length * 0.14, 2.2, 0)));
};

const harbour = (kit: Kit, rng: () => number) => {
	block(kit, rng, { x: -2.4, z: -3, w: 5.4, d: 3.6, floors: 1, roof: "deck" });
	kit.add(cyl(0.14, 0.2, 4.6, 8), "steel", at(3.4, DECK, 3.6));
	kit.add(box(3.4, 0.18, 0.18), "steel", at(4.6, DECK + 4.4, 3.6));
	for (const [x, z, s] of [
		[0.6, 3.8, 1.2],
		[1.9, 4.4, 1],
		[-4.4, 2.4, 1.4],
	] as const) {
		kit.add(box(s, s, s), "container", at(x, DECK, z, 0.3));
	}

	const edge = R * Math.cos(Math.PI / 6);
	const pierY = 0.15;
	const pierStart = edge + 3.6;
	const pierLength = 25;
	kit.add(box(4.4, 0.12, 1.4), "deck", at(edge + 1.7, 0.98, 0, 0, 0, -0.2));
	kit.add(box(pierLength, 0.5, 2.6), "deck", at(pierStart + pierLength / 2, pierY, 0));
	const fingers = [
		[7, 1],
		[14, -1],
		[21, 1],
		[21, -1],
	] as const;
	for (const [along, side] of fingers) {
		const x = pierStart + along;
		kit.add(box(1.3, 0.4, 8), "deck", at(x, pierY, side * 5.3));
		kit.add(cyl(0.16, 0.16, 3.4, 8), "steel", at(x, -0.6, side * 9.6));
	}
	kit.add(cyl(0.16, 0.16, 3.4, 8), "steel", at(pierStart + pierLength + 0.3, -0.6, 0));
	boat(kit, pierStart + 9.3, 5.6, Math.PI / 2, 6.4);
	boat(kit, pierStart + 11.8, -5.4, -Math.PI / 2, 7.2, true);
	boat(kit, pierStart + 18.6, 5.2, Math.PI / 2, 5.4);
	boat(kit, pierStart + 23.4, -5.8, -Math.PI / 2, 6);
	boat(kit, pierStart + 4.4, -3.6, 0.1, 4.2);
	kit.mark("pier", pierStart + 16, 0.7, 0);
	kit.mark("harbour", pierStart + 8, 0.7, 0);
};

const solarDeck = (kit: Kit, battery: boolean) => {
	const TILT = -0.32;
	for (let z = -5.4; z <= 5.5; z += 2.15) {
		if (battery && z > 2.5) continue;
		const half = Math.min(6.9, (R - 1 - Math.abs(z)) * Math.sqrt(3));
		kit.add(box(half * 2, 0.5, 0.12), "steel", at(0, DECK, z));
		kit.add(new THREE.BoxGeometry(half * 2, 0.08, 1.7), "panel", at(0, DECK + 0.7, z, 0, TILT));
	}
	kit.mark(battery ? "battery" : "solar", 0, DECK + 1, battery ? 4.4 : 0);
	if (!battery) return;
	kit.add(box(6, 2.5, 2.4), "container", at(-0.4, DECK, 4.4));
	kit.add(box(2.4, 2.5, 2.4), "container", at(4.4, DECK, 3.2, 0.5));
};

const blades = (length: number) =>
	[0, 1, 2].map((i) =>
		new THREE.CylinderGeometry(0.1, 0.42, length, 4)
			.scale(1, 1, 0.3)
			.translate(0, length / 2 + 0.4, 0)
			.rotateZ((i * Math.PI * 2) / 3),
	);

const windmill = (
	kit: Kit,
	x: number,
	base: number,
	z: number,
	height: number,
	span: number,
	yaw: number,
) => {
	kit.add(cyl(0.32, 0.72, height, 16), "steel", at(x, base, z));
	kit.add(
		box(2.6, 1, 1.1),
		"steel",
		at(x, base + height - 0.1, z, yaw + Math.PI / 2).multiply(at(-0.4, 0, 0)),
	);
	const hub = new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12).rotateX(Math.PI / 2);
	return kit.spinner(
		[...blades(span), hub],
		"steel",
		new THREE.Vector3(x, base + height + 0.4, z).add(
			new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(1.3),
		),
		yaw,
	);
};

const greenhouse = (kit: Kit, z: number, length: number) => {
	const shell = new THREE.CylinderGeometry(2.3, 2.3, length, 16, 1, false, 0, Math.PI);
	kit.add(shell, "glass", at(0, DECK, z, 0, 0, Math.PI / 2));
};

const pen = (kit: Kit, { x, y: z }: THREE.Vector2) => {
	const radius = 4.6;
	kit.add(
		new THREE.TorusGeometry(radius, 0.22, 6, 32).rotateX(Math.PI / 2),
		"rubber",
		at(x, 0.15, z),
	);
	kit.add(
		new THREE.TorusGeometry(radius, 0.05, 4, 32).rotateX(Math.PI / 2),
		"steel",
		at(x, 1.15, z),
	);
	kit.ring(x, 0.3, z, radius);
	kit.ring(x, 1.15, z, radius);
	for (let i = 0; i < 10; i++) {
		const a = (i / 10) * Math.PI * 2;
		kit.add(
			cyl(0.05, 0.05, 1, 4),
			"steel",
			at(x + Math.cos(a) * radius, 0.15, z + Math.sin(a) * radius),
		);
	}
};

export interface Seastead {
	root: THREE.Group;
	modules: Record<ModuleKey, Module>;
	rotors: readonly THREE.Object3D[];
	marks: Record<AnchorKey, THREE.Vector3>;
}

export const buildSeastead = (): Seastead => {
	const marks: Partial<Record<AnchorKey, THREE.Vector3>> = {};
	const rng = mulberry(7);
	const all = Object.values(SITES);

	const hull = new Kit(marks);
	for (const s of all) pontoon(hull.on(s));
	hull.on(new THREE.Vector2());
	for (const [i, a] of all.entries()) {
		for (const b of all.slice(i + 1)) {
			if (a.distanceTo(b) > PITCH + 0.1) continue;
			const mid = a.clone().add(b).multiplyScalar(0.5);
			const heading = Math.atan2(b.x - a.x, b.y - a.y);
			hull.add(
				new THREE.BoxGeometry(1.9, 0.14, GAP + 2.4),
				"deck",
				at(mid.x, DECK + 0.1, mid.y, heading),
			);
			for (const side of [-0.9, 0.9]) {
				hull.add(
					new THREE.BoxGeometry(0.05, 1, GAP + 2.2),
					"steel",
					at(mid.x, DECK + 0.65, mid.y, heading).multiply(at(side, 0, 0)),
				);
			}
		}
	}
	// Mooring lines run from the outer corners down to the seabed, a buoy marking each anchor.
	for (const [s, a] of [
		[SITES.garden, 4.4],
		[SITES.livingA, 0.5],
		[SITES.turbine, 2.3],
		[SITES.solarA, 3.5],
	] as const) {
		const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
		const from = new THREE.Vector3(s.x, 0.5, s.y).addScaledVector(dir, R);
		hull.line([from, from.clone().addScaledVector(dir, 26).setY(-9)]);
		const buoy = from.clone().addScaledVector(dir, 44);
		hull.add(cyl(0.45, 0.7, 0.9, 12), "buoy", at(buoy.x, -0.2, buoy.z));
	}
	hull.on(SITES.dock);
	hull.mark("pontoon", R * 0.5, 0.2, R * 0.82);
	hull.on(SITES.dock.clone().add(SITES.livingA).multiplyScalar(0.5));
	hull.mark("gangway", 0, DECK + 0.6, 0);

	const dock = new Kit(marks);
	harbour(dock.on(SITES.dock), rng);

	const living = new Kit(marks);
	homes(living.on(SITES.livingA, 0), rng);
	living.mark("homes", 0, DECK + 6, 0);
	homes(living.on(SITES.livingB, 2), rng);
	living.mark("funnel", 3.8, DECK + 5, -3.6);
	living.mark("cistern", 0.4, DECK + 2.4, 5.4);
	homes(living.on(SITES.livingC, 4), rng);
	living.on(SITES.garden);
	greenhouse(living, -3.6, 11);
	greenhouse(living, 1.6, 12.5);
	for (const z of [5.2, 6.9]) living.add(box(z > 6 ? 5 : 9, 0.4, 1.1), "garden", at(0, DECK, z));
	tank(living, -6, -0.9, 0.9, 2.8);
	living.mark("food", 0, DECK + 2.3, 0);
	living.on(new THREE.Vector2());
	for (const p of PENS) pen(living, p);
	living.add(box(6, 0.3, 1.1), "deck", at(-36.8, 0.1, 15.4, 0.12));

	const centre = new Kit(marks);
	core(centre.on(SITES.core), rng);

	const energy = new Kit(marks);
	solarDeck(energy.on(SITES.solarA), false);
	solarDeck(energy.on(SITES.solarB, 3), true);
	energy.on(SITES.solarA);
	energy.mark("power", 0, DECK + 1, 0);
	energy.on(SITES.turbine);
	block(energy, rng, { x: -3.6, z: 2.8, w: 4.2, d: 3.4, floors: 1, roof: "deck" });
	const yaw = 2.2;
	const rotors = [windmill(energy, 1, DECK, -0.6, 27, 11.5, yaw)];
	energy.mark("turbine", 1, DECK + 27, -0.6);
	energy.on(SPAR);
	energy.add(cyl(1.3, 1.3, 6.5), "buoy", at(0, -4.5, 0));
	energy.add(cyl(1.8, 1.8, 0.2), "steel", at(0, 2, 0));
	rotors.push(windmill(energy, 0, 2, 0, 23, 10, yaw));
	for (const a of [0.4, 2.5, 4.6]) {
		const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
		energy.line(
			[dir.clone().multiplyScalar(1.3).setY(0.4), dir.clone().multiplyScalar(20).setY(-9)].map(
				(p) => p.add(new THREE.Vector3(SPAR.x, 0, SPAR.y)),
			),
		);
	}

	const modules = {
		hull: hull.finish(),
		dock: dock.finish(),
		living: living.finish(),
		core: centre.finish(),
		energy: energy.finish(),
	};
	const root = new THREE.Group();
	for (const { group } of Object.values(modules)) root.add(group);

	const complete = (m: typeof marks): m is Record<AnchorKey, THREE.Vector3> =>
		(
			[
				"pontoon",
				"gangway",
				"pier",
				"funnel",
				"cistern",
				"solar",
				"turbine",
				"battery",
				"commons",
				"homes",
				"harbour",
				"power",
				"food",
			] satisfies AnchorKey[]
		).every((k) => m[k]);
	if (!complete(marks)) throw new Error("Seastead: unmarked anchor");

	return { root, modules, rotors, marks };
};
