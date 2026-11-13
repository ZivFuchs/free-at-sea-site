import {
	BackSide,
	BoxGeometry,
	BufferGeometry,
	CapsuleGeometry,
	CatmullRomCurve3,
	CylinderGeometry,
	DoubleSide,
	EdgesGeometry,
	Float32BufferAttribute,
	FrontSide,
	Group,
	InstancedMesh,
	LineBasicMaterial,
	LineSegments,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	type MeshStandardMaterialParameters,
	Object3D,
	type Plane,
	PlaneGeometry,
	Shape,
	ShapeGeometry,
	SphereGeometry,
	TorusGeometry,
	TubeGeometry,
	Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
	containerTexture,
	deckTexture,
	hullTexture,
	solarTexture,
	steelRoughness,
} from "./textures";

/** A flat deck barge, metres. Origin amidships on the waterline; bow towards +x, the near side towards +z. */
export const HULL = { length: 60, beam: 16, freeboard: 2.3, draught: 1.3 } as const;
const DEPTH = HULL.freeboard + HULL.draught;
const HALF = HULL.length / 2;
const SIDE = HULL.beam / 2;
const DECK = HULL.freeboard;
const KEEL = -HULL.draught;
/** Where the flat bottom ends and the raked ends begin. */
const RAKE = { stern: -HALF + 2.5, bow: HALF - 9, bowFoot: 1.3 };
const BOX = { length: 12.19, width: 2.44, height: 2.59 };

export type Fit = "bunks" | "workshop" | "store" | "galley";
export type AnchorName =
	| "ballast"
	| "void"
	| "bunks"
	| "workshop"
	| "hull"
	| "deck"
	| "quarters"
	| "water"
	| "power"
	| "comms";

export const buildBarge = (cut: Plane) => {
	const material = (parameters: MeshStandardMaterialParameters) =>
		new MeshStandardMaterial({
			roughness: 0.8,
			metalness: 0,
			clippingPlanes: [cut],
			clipShadows: true,
			...parameters,
		});
	const roughnessMap = steelRoughness();
	const steel = (color: number, extra: MeshStandardMaterialParameters = {}) =>
		material({ color, roughness: 1, roughnessMap, metalness: 0.25, ...extra });

	const m = {
		oxide: steel(0x8f4032, { side: DoubleSide, metalness: 0.05 }),
		rust: steel(0x9a4a28, { side: DoubleSide }),
		dark: steel(0x23262a),
		grey: steel(0x8b9197),
		pale: steel(0xd9dcd8),
		white: material({ color: 0xeef0ec, roughness: 0.45 }),
		lining: material({ color: 0xe9e4d8, roughness: 0.9, side: BackSide }),
		blue: steel(0x1f86be),
		bulwark: steel(0x2f7fb4, { side: DoubleSide }),
		yellow: steel(0xd9a21b, { roughness: 0.7 }),
		rubber: material({ color: 0x141414, roughness: 0.95 }),
		wood: material({ color: 0xa98356, roughness: 0.85 }),
		ply: material({ color: 0x8c6f4b, roughness: 0.9 }),
		rope: material({ color: 0xb9a37c, roughness: 1 }),
		cloth: material({ color: 0xd8d2c4, roughness: 1, side: DoubleSide }),
		blanket: material({ color: 0x8a3b32, roughness: 1 }),
		hiVis: material({ color: 0xe0661a, roughness: 0.9 }),
		navy: material({ color: 0x1c2b44, roughness: 0.9 }),
		skin: material({ color: 0xb98a6a, roughness: 0.8 }),
		glass: material({ color: 0x0b1620, roughness: 0.08, metalness: 0.6 }),
		lamp: material({ color: 0xfff1d0, emissive: 0xffc98a, emissiveIntensity: 2.2 }),
		led: material({ color: 0x9fe8ff, emissive: 0x55d0ff, emissiveIntensity: 3 }),
		solar: material({ map: solarTexture(), roughness: 0.15, metalness: 0.5 }),
		ibc: material({ color: 0xf2f3ee, roughness: 0.35, transparent: true, opacity: 0.82 }),
		ballast: material({
			color: 0x1f7f9c,
			roughness: 0.05,
			transparent: true,
			opacity: 0.62,
			depthWrite: false,
		}),
	};

	const put = <T extends Object3D>(parent: Object3D, child: T, x = 0, y = 0, z = 0) => {
		child.position.set(x, y, z);
		parent.add(child);
		return child;
	};
	const mesh = (
		parent: Object3D,
		geometry: BufferGeometry,
		mat: MeshStandardMaterial,
		x = 0,
		y = 0,
		z = 0,
	) => {
		const child = put(parent, new Mesh(geometry, mat), x, y, z);
		child.castShadow = true;
		child.receiveShadow = true;
		return child;
	};
	const box = (
		parent: Object3D,
		w: number,
		h: number,
		d: number,
		mat: MeshStandardMaterial,
		x = 0,
		y = 0,
		z = 0,
	) => mesh(parent, new BoxGeometry(w, h, d), mat, x, y, z);
	const soft = (w: number, h: number, d: number, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, r);
	const tube = (radius: number, length: number, segments = 14) =>
		new CylinderGeometry(radius, radius, length, segments);

	const root = new Group();
	const hull = put(root, new Group());
	const deck = put(root, new Group());
	const gear = put(root, new Group());
	const anchors = {} as Record<AnchorName, Object3D>;
	const anchor = (name: AnchorName, parent: Object3D, x: number, y: number, z: number) => {
		anchors[name] = put(parent, new Object3D(), x, y, z);
	};

	/* ---- Hull ---- */
	const profile: [number, number][] = [
		[-HALF, DECK],
		[-HALF, KEEL + 1.4],
		[RAKE.stern, KEEL],
		[RAKE.bow, KEEL],
		[HALF, RAKE.bowFoot],
		[HALF, DECK],
	];
	const outline = new Shape();
	for (const [i, [x, y]] of profile.entries()) {
		if (i) outline.lineTo(x, y);
		else outline.moveTo(x, y);
	}
	const sideGeometry = new ShapeGeometry(outline);
	const sideMap = hullTexture(HULL.draught / DEPTH);
	sideMap.repeat.set(1 / HULL.length, 1 / DEPTH);
	sideMap.offset.set(0.5, HULL.draught / DEPTH);
	for (const side of [1, -1]) {
		const outer = steel(0xffffff, {
			map: sideMap,
			bumpMap: sideMap,
			bumpScale: 0.6,
			side: side > 0 ? FrontSide : BackSide,
		});
		mesh(hull, sideGeometry, outer, 0, 0, side * SIDE);
		const inner = steel(0x7a3326, { side: side > 0 ? BackSide : FrontSide });
		mesh(hull, sideGeometry, inner, 0, 0, side * (SIDE - 0.03));
		// Rubbing strake under the deck edge, and a second at the light waterline.
		mesh(
			hull,
			soft(HULL.length - 0.4, 0.26, 0.16, 0.05),
			m.rust,
			0,
			DECK - 0.22,
			side * (SIDE + 0.07),
		);
		mesh(
			hull,
			soft(RAKE.bow - RAKE.stern, 0.16, 0.1, 0.04),
			m.rust,
			(RAKE.bow + RAKE.stern) / 2,
			1.05,
			side * (SIDE + 0.05),
		);
	}
	// Bottom, raked ends and transom as one strip.
	const strip: number[] = [];
	for (let i = 0; i < profile.length - 1; i++) {
		const [x0, y0] = profile[i] ?? [0, 0];
		const [x1, y1] = profile[i + 1] ?? [0, 0];
		strip.push(
			x0,
			y0,
			SIDE,
			x0,
			y0,
			-SIDE,
			x1,
			y1,
			-SIDE,
			x0,
			y0,
			SIDE,
			x1,
			y1,
			-SIDE,
			x1,
			y1,
			SIDE,
		);
	}
	const stripGeometry = new BufferGeometry();
	stripGeometry.setAttribute("position", new Float32BufferAttribute(strip, 3));
	stripGeometry.computeVertexNormals();
	mesh(hull, stripGeometry, m.rust);
	anchor("hull", hull, 12, 0.6, SIDE);

	// Inside: watertight bulkheads every six metres, a centreline bulkhead, frames at one-metre spacing.
	const within = DEPTH - 0.1;
	const mid = (DECK + KEEL) / 2;
	for (let x = -24; x <= 18; x += 6) box(hull, 0.07, within, HULL.beam - 0.1, m.oxide, x, mid, 0);
	box(hull, RAKE.bow - RAKE.stern, within, 0.07, m.oxide, (RAKE.bow + RAKE.stern) / 2, mid, 0);
	const frames: Matrix4[] = [];
	for (let x = RAKE.stern + 0.5; x < RAKE.bow; x += 1) {
		for (const z of [SIDE - 0.16, -SIDE + 0.16, 0.16, -0.16])
			frames.push(new Matrix4().makeTranslation(x, mid, z));
		// Floors across the bottom and beams under the deck.
		for (const y of [KEEL + 0.16, DECK - 0.16])
			frames.push(
				new Matrix4()
					.makeTranslation(x, y, 0)
					.multiply(
						new Matrix4()
							.makeRotationX(Math.PI / 2)
							.scale(new Vector3(1, (HULL.beam - 0.2) / within, 1)),
					),
			);
	}
	const ribs = new InstancedMesh(new BoxGeometry(0.06, within, 0.26), m.oxide, frames.length);
	for (const [i, matrix] of frames.entries()) ribs.setMatrixAt(i, matrix);
	hull.add(ribs);
	// Ballast: three wing tanks part flooded.
	for (const [x, level] of [
		[-21, 0.55],
		[-3, 0.3],
		[9, 0.75],
	] as const) {
		const height = within * level;
		const water = put(
			hull,
			new Mesh(new BoxGeometry(5.8, height, 4.2), m.ballast),
			x,
			KEEL + 0.06 + height / 2,
			2.27,
		);
		water.renderOrder = 2;
	}
	anchor("ballast", hull, -21, KEEL + 1, 4.4);
	anchor("void", hull, 3, mid + 0.3, 4.4);

	// Tyre fenders on rope along both sides.
	for (let x = -24; x <= 20; x += 8.8) {
		for (const side of [1, -1]) {
			mesh(hull, new TorusGeometry(0.42, 0.17, 8, 18), m.rubber, x, 1.05, side * (SIDE + 0.24));
			mesh(hull, tube(0.025, 1.5, 6), m.rope, x, 1.75, side * (SIDE + 0.2));
		}
	}

	/* ---- Deck ---- */
	const plate = mesh(
		deck,
		new PlaneGeometry(HULL.length, HULL.beam).rotateX(-Math.PI / 2),
		steel(0xffffff, { map: deckTexture(), side: DoubleSide, metalness: 0.1 }),
		0,
		DECK,
		0,
	);
	plate.castShadow = false;
	for (const side of [1, -1])
		box(deck, HULL.length, 0.12, 0.1, m.rust, 0, DECK + 0.06, side * (SIDE - 0.05));
	for (const end of [1, -1])
		box(deck, 0.1, 0.12, HULL.beam, m.rust, end * (HALF - 0.05), DECK + 0.06, 0);
	// Blue bulwark wrapped round the stern, with stays.
	const WALL = 1.15;
	box(deck, 0.06, WALL, HULL.beam, m.bulwark, -HALF + 0.03, DECK + WALL / 2, 0);
	for (const side of [1, -1]) {
		box(deck, 6.5, WALL, 0.06, m.bulwark, -HALF + 3.25, DECK + WALL / 2, side * (SIDE - 0.03));
		box(deck, 6.6, 0.07, 0.16, m.bulwark, -HALF + 3.3, DECK + WALL, side * (SIDE - 0.05));
		for (let x = -HALF + 1; x < -HALF + 6.5; x += 1.4)
			box(deck, 0.05, WALL, 0.3, m.bulwark, x, DECK + WALL / 2, side * (SIDE - 0.2));
	}
	// Double-bitt bollards and a row of pad-eyes.
	for (let x = -20; x <= 26; x += 9.2) {
		for (const side of [1, -1]) {
			const z = side * (SIDE - 0.55);
			box(deck, 1.1, 0.06, 0.5, m.dark, x, DECK + 0.03, z);
			for (const dx of [-0.32, 0.32]) {
				mesh(deck, tube(0.11, 0.5), m.dark, x + dx, DECK + 0.3, z);
				mesh(deck, tube(0.15, 0.05), m.dark, x + dx, DECK + 0.56, z);
			}
			mesh(deck, tube(0.04, 0.9, 8).rotateZ(Math.PI / 2), m.dark, x, DECK + 0.36, z);
		}
	}
	anchor("deck", deck, -6, DECK, -SIDE + 0.4);

	/* ---- Containers ---- */
	const corrugated = (length: number, height: number) => {
		const PITCH = 0.278;
		const RIB = 0.04;
		const steps: [number, number][] = [
			[0, 0],
			[0.09, 0],
			[0.139, RIB],
			[0.229, RIB],
			[PITCH, 0],
		];
		const positions: number[] = [];
		const uvs: number[] = [];
		const count = Math.round(length / PITCH);
		const scale = length / (count * PITCH);
		for (let i = 0; i < count; i++) {
			for (let s = 0; s < steps.length - 1; s++) {
				const [ax, az] = steps[s] ?? [0, 0];
				const [bx, bz] = steps[s + 1] ?? [0, 0];
				const x0 = (i * PITCH + ax) * scale - length / 2;
				const x1 = (i * PITCH + bx) * scale - length / 2;
				positions.push(
					x0,
					0,
					az,
					x1,
					0,
					bz,
					x1,
					height,
					bz,
					x0,
					0,
					az,
					x1,
					height,
					bz,
					x0,
					height,
					az,
				);
				const u0 = x0 / length + 0.5;
				const u1 = x1 / length + 0.5;
				uvs.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
			}
		}
		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
		geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
		geometry.computeVertexNormals();
		return geometry;
	};
	const longWall = corrugated(BOX.length - 0.3, BOX.height - 0.3);
	const endWall = corrugated(BOX.width - 0.3, BOX.height - 0.3);

	const person = (parent: Object3D, x: number, z: number, top: MeshStandardMaterial, y = 0) => {
		mesh(parent, new CapsuleGeometry(0.17, 0.5, 4, 10), m.navy, x, y + 0.45, z);
		mesh(parent, new CapsuleGeometry(0.2, 0.42, 4, 10), top, x, y + 1.12, z);
		mesh(parent, new SphereGeometry(0.115, 12, 10), m.skin, x, y + 1.6, z);
	};

	const furnish: Record<Fit, (inside: Group) => void> = {
		bunks(inside) {
			for (const x of [-4.6, -2.4, -0.2]) {
				for (const y of [0.45, 1.5]) {
					box(inside, 2.05, 0.06, 0.85, m.wood, x, y, -0.7);
					mesh(inside, soft(1.95, 0.16, 0.78, 0.05), m.white, x, y + 0.11, -0.7);
					mesh(inside, soft(1.2, 0.05, 0.8, 0.02), m.blanket, x + 0.36, y + 0.2, -0.7);
				}
				for (const dx of [-1.02, 1.02]) box(inside, 0.05, 1.95, 0.05, m.grey, x + dx, 0.98, -0.3);
			}
			for (const x of [2.2, 3.0, 3.8])
				mesh(inside, soft(0.72, 1.9, 0.5, 0.03), m.grey, x, 0.97, -0.85);
			box(inside, 1.3, 0.05, 0.7, m.wood, 5, 0.78, -0.75);
			person(inside, 4.4, 0.1, m.navy, 0.02);
		},
		workshop(inside) {
			box(inside, 6.4, 0.07, 0.75, m.wood, -2.2, 0.92, -0.78);
			for (let x = -5.2; x <= 0.9; x += 1.5) box(inside, 0.06, 0.9, 0.7, m.grey, x, 0.45, -0.78);
			box(inside, 6.4, 1.1, 0.03, m.ply, -2.2, 1.7, -1.12);
			for (const [x, w, mat] of [
				[-4.6, 0.5, m.yellow],
				[-3.6, 0.7, m.dark],
				[-2.2, 0.4, m.hiVis],
				[-0.6, 0.9, m.pale],
			] as const)
				mesh(inside, soft(w, 0.3, 0.4, 0.03), mat, x, 1.11, -0.8);
			// Racked electronics, lit.
			mesh(inside, soft(0.7, 2.0, 0.8, 0.03), m.dark, 2.6, 1.02, -0.78);
			for (let y = 0.5; y < 1.9; y += 0.28) box(inside, 0.5, 0.03, 0.02, m.led, 2.6, y, -0.37);
			for (const y of [0.5, 1.1, 1.7]) box(inside, 2.0, 0.04, 0.5, m.grey, 4.6, y, -0.9);
			for (const [x, y] of [
				[4.0, 0.7],
				[4.7, 0.7],
				[5.2, 1.3],
				[4.2, 1.3],
				[4.8, 1.9],
			] as const)
				mesh(inside, soft(0.5, 0.32, 0.4, 0.03), x > 4.5 ? m.ply : m.blue, x, y, -0.9);
			person(inside, -1.6, -0.1, m.hiVis, 0.02);
		},
		store() {},
		galley() {},
	};

	const container = (x: number, z: number, fit: Fit, seed: number, roof: "solar" | "plant") => {
		const group = put(root, new Group(), x, DECK + 0.02, z);
		const map = containerTexture(seed);
		const paint = steel(0xffffff, { map, metalness: 0.15, side: DoubleSide });
		const frame = steel(0x1b7db3);
		const { length: L, width: W, height: H } = BOX;
		// Corner posts, rails, castings.
		for (const sx of [1, -1]) {
			for (const sz of [1, -1]) {
				box(group, 0.16, H, 0.16, frame, sx * (L / 2 - 0.08), H / 2, sz * (W / 2 - 0.08));
				for (const y of [0.06, H - 0.06])
					mesh(
						group,
						soft(0.2, 0.13, 0.2, 0.02),
						m.dark,
						sx * (L / 2 - 0.08),
						y,
						sz * (W / 2 - 0.08),
					);
			}
		}
		for (const sz of [1, -1]) {
			for (const y of [0.08, H - 0.07])
				box(group, L - 0.3, y < 1 ? 0.16 : 0.12, 0.1, frame, 0, y, sz * (W / 2 - 0.05));
			const wall = mesh(group, longWall, paint, 0, 0.15, sz * (W / 2 - 0.09));
			if (sz < 0) wall.rotation.y = Math.PI;
		}
		for (const y of [0.08, H - 0.07])
			for (const sx of [1, -1])
				box(group, 0.1, y < 1 ? 0.16 : 0.12, W - 0.3, frame, sx * (L / 2 - 0.05), y, 0);
		const back = mesh(group, endWall, paint, -L / 2 + 0.09, 0.15, 0);
		back.rotation.y = -Math.PI / 2;
		// Cargo doors with locking bars.
		for (const sz of [1, -1]) {
			box(group, 0.05, H - 0.34, W / 2 - 0.18, paint, L / 2 - 0.07, H / 2, sz * (W / 4 - 0.04));
			for (const dz of [0.3, 0.78]) {
				mesh(group, tube(0.022, H - 0.3, 8), m.pale, L / 2 - 0.02, H / 2, sz * dz);
				box(group, 0.04, 0.05, 0.3, m.pale, L / 2 - 0.01, 1.15, sz * dz);
			}
		}
		// Roof (its own lift in the exploded view) and floor.
		const top = put(group, new Group(), 0, H, 0);
		box(top, L - 0.1, 0.05, W - 0.1, paint, 0, -0.03, 0);
		box(group, L - 0.2, 0.12, W - 0.2, m.ply, 0, 0.1, 0);
		if (roof === "solar") {
			for (let px = -4.4; px <= 4.4; px += 2.2) {
				const panel = mesh(top, new BoxGeometry(2.05, 0.04, 1.9), m.solar, px, 0.22, 0);
				panel.rotation.z = -0.14;
				for (const dx of [-0.8, 0.8])
					box(top, 0.04, 0.2 - dx * 0.14, 1.7, m.grey, px + dx, 0.1 - dx * 0.07, 0);
			}
		} else {
			for (const px of [-3.8, 3.2]) {
				mesh(top, soft(1.4, 0.75, 1.0, 0.05), m.pale, px, 0.4, 0);
				mesh(top, tube(0.32, 0.03, 20), m.dark, px, 0.79, 0);
			}
			mesh(top, tube(0.05, 5.5, 8).rotateZ(Math.PI / 2), m.grey, -0.3, 0.1, 0.5);
			mesh(top, tube(0.09, 0.9), m.grey, 5.4, 0.45, -0.7);
		}
		// Personnel door, window and a life ring on the side that faces the working deck.
		const face = z > 0 ? -1 : 1;
		const skin = face * (W / 2 - 0.02);
		box(group, 1.0, 2.05, 0.06, frame, -3.4, 1.15, skin);
		box(group, 0.86, 1.92, 0.07, m.dark, -3.4, 1.14, skin);
		box(group, 1.5, 0.9, 0.06, frame, 1.2, 1.55, skin);
		box(group, 1.36, 0.76, 0.07, fit === "store" ? m.glass : m.lamp, 1.2, 1.55, skin);
		mesh(group, new TorusGeometry(0.3, 0.07, 8, 20), m.hiVis, 3.6, 1.5, skin + face * 0.08);

		if (fit === "bunks" || fit === "workshop") {
			mesh(group, new BoxGeometry(L - 0.36, H - 0.34, W - 0.36), m.lining, 0, H / 2 + 0.02, 0);
			const inside = put(group, new Group(), 0, 0.16, 0);
			furnish[fit](inside);
			box(group, L - 2, 0.04, 0.12, m.lamp, 0, H - 0.2, 0);
		}
		return { group, top };
	};

	const containers = [
		container(-19, 4.4, "bunks", 31, "plant"),
		container(2, 4.4, "workshop", 47, "plant"),
		container(-12, -4.7, "store", 59, "solar"),
		container(6.5, -3.4, "galley", 73, "solar"),
	];
	anchor("bunks", containers[0]?.group ?? root, -2.4, 1.6, 0);
	anchor("workshop", containers[1]?.group ?? root, 2.6, 1.8, 0);
	anchor("quarters", containers[0]?.group ?? root, 0, BOX.height, 0);
	anchor("power", containers[3]?.top ?? root, 0, 0.4, 0);

	/* ---- Deck gear ---- */
	// Fresh water: four tanks on saddles, manifolded.
	for (const [x, z] of [
		[13.5, 1.6],
		[13.5, 4.2],
		[18.6, 1.6],
		[18.6, 4.2],
	] as const) {
		const tank = mesh(
			gear,
			new CapsuleGeometry(0.95, 2.6, 8, 24).rotateZ(Math.PI / 2),
			m.white,
			x,
			DECK + 1.2,
			z,
		);
		tank.receiveShadow = true;
		for (const dx of [-0.9, 0.9])
			mesh(gear, soft(0.2, 0.5, 1.7, 0.03), m.grey, x + dx, DECK + 0.25, z);
		mesh(gear, tube(0.16, 0.14), m.grey, x, DECK + 2.18, z);
	}
	mesh(gear, tube(0.05, 7.6, 8).rotateZ(Math.PI / 2), m.blue, 16, DECK + 0.32, 2.9);
	anchor("water", gear, 16, DECK + 2.2, 2.9);
	// Satcom dome.
	mesh(gear, tube(0.14, 1.5), m.pale, 11, DECK + 0.75, -0.6);
	mesh(gear, new SphereGeometry(0.72, 24, 16), m.white, 11, DECK + 1.95, -0.6);
	mesh(gear, tube(0.5, 0.2, 20), m.pale, 11, DECK + 1.45, -0.6);
	anchor("comms", gear, 11, DECK + 2.6, -0.6);
	// Generator on a skid.
	const generator = put(gear, new Group(), 16.5, DECK, -4.4);
	for (const dz of [-0.55, 0.55]) box(generator, 3.3, 0.14, 0.14, m.dark, 0, 0.07, dz);
	mesh(generator, soft(3.0, 1.45, 1.3, 0.09), m.yellow, 0, 0.9, 0);
	box(generator, 0.9, 0.8, 0.03, m.dark, -0.8, 0.95, 0.66);
	box(generator, 0.5, 0.4, 0.03, m.pale, 0.6, 1.1, 0.66);
	mesh(generator, tube(0.07, 0.9), m.dark, 1.1, 2.0, -0.3);
	mesh(generator, soft(1.2, 0.5, 0.9, 0.05), m.dark, 2.4, 0.3, 0);
	// IBC totes in cages, pallets, a cable drum.
	const cage = new LineBasicMaterial({ color: 0x9aa0a6, clippingPlanes: [cut] });
	for (const [x, z] of [
		[21.6, -5.6],
		[21.6, -4.2],
		[23.0, -5.6],
	] as const) {
		mesh(gear, soft(1.0, 1.0, 1.2, 0.08), m.ibc, x, DECK + 0.66, z);
		box(gear, 1.1, 0.14, 1.3, m.wood, x, DECK + 0.07, z);
		const lattice = new BoxGeometry(1.06, 1.04, 1.26, 4, 4, 4);
		put(gear, new LineSegments(new EdgesGeometry(lattice, 0), cage), x, DECK + 0.68, z);
		put(
			gear,
			new LineSegments(new EdgesGeometry(new BoxGeometry(1.06, 0.34, 1.26)), cage),
			x,
			DECK + 0.68,
			z,
		);
	}
	for (let i = 0; i < 4; i++) box(gear, 1.2, 0.13, 1.0, m.wood, -6.5, DECK + 0.07 + i * 0.14, -0.4);
	const drum = put(gear, new Group(), -8.6, DECK + 0.62, 0.6);
	drum.rotation.y = 0.5;
	mesh(drum, tube(0.36, 0.7, 20).rotateX(Math.PI / 2), m.dark, 0, 0, 0);
	for (const dz of [-0.38, 0.38])
		mesh(drum, tube(0.62, 0.05, 28).rotateX(Math.PI / 2), m.wood, 0, 0, dz);
	// Mast aft: light, crosstree, a plain pennant.
	mesh(gear, tube(0.07, 6.5, 10), m.pale, -HALF + 1.4, DECK + 3.25, 0);
	box(gear, 0.05, 0.05, 2.2, m.pale, -HALF + 1.4, DECK + 5.2, 0);
	mesh(gear, new SphereGeometry(0.11, 10, 8), m.lamp, -HALF + 1.4, DECK + 6.6, 0);
	const pennant = mesh(
		gear,
		new PlaneGeometry(1.5, 0.8, 8, 1),
		m.cloth,
		-HALF + 0.6,
		DECK + 5.9,
		0.02,
	);
	const flutter = pennant.geometry.getAttribute("position");
	for (let i = 0; i < flutter.count; i++)
		flutter.setZ(i, Math.sin(flutter.getX(i) * 4) * 0.09 * (0.75 - flutter.getX(i)));
	pennant.geometry.computeVertexNormals();
	// Windlass and anchor cable off the bow.
	box(gear, 1.6, 0.3, 1.4, m.dark, HALF - 2.2, DECK + 0.15, 0);
	mesh(gear, tube(0.42, 1.0, 20).rotateX(Math.PI / 2), m.grey, HALF - 2.2, DECK + 0.75, 0);
	for (const dz of [-0.55, 0.55])
		mesh(gear, tube(0.56, 0.06, 22).rotateX(Math.PI / 2), m.dark, HALF - 2.2, DECK + 0.75, dz);
	const cable = new CatmullRomCurve3([
		new Vector3(HALF - 2.0, DECK + 1.1, 0),
		new Vector3(HALF - 0.1, DECK + 0.25, 0),
		new Vector3(HALF + 2.5, 0.6, 0.2),
		new Vector3(HALF + 9, -2.5, 0.8),
		new Vector3(HALF + 16, -8, 1.4),
	]);
	const chain = mesh(root, new TubeGeometry(cable, 40, 0.06, 6), m.dark);
	chain.material = steel(0x23262a, { clippingPlanes: [] });
	// A walkway of pallets, a ladder, and two people for scale.
	const ladder = put(gear, new Group(), -24.6, DECK, 1.6);
	ladder.rotation.z = -0.3;
	for (const dz of [-0.2, 0.2]) box(ladder, 0.04, 3.2, 0.04, m.pale, 0, 1.6, dz);
	for (let y = 0.3; y < 3.1; y += 0.3) box(ladder, 0.03, 0.03, 0.4, m.pale, 0, y, 0);
	person(gear, 9.2, 2.1, m.hiVis, DECK);
	person(gear, -9.6, -1.3, m.white, DECK);

	return {
		root,
		anchors,
		/** Moved apart in the exploded view: metres of lift at full spread. */
		lifts: [
			{ part: deck, lift: 2.4 },
			{ part: gear, lift: 6.5 },
			...containers.flatMap(({ group, top }, i) => [
				{ part: group, lift: 10 + (i % 2) * 2.5 },
				{ part: top, lift: 2.2 },
			]),
		],
		/** Where the fuel drums stand once their model loads. */
		drums: {
			parent: gear,
			y: DECK,
			spots: [
				[20.6, 3.2],
				[21.3, 3.3],
				[20.9, 3.9],
				[21.7, 4.0],
				[22.3, 3.4],
				[20.2, 4.6],
				[22.5, 4.3],
			] as const,
		},
		materials: Object.values(m),
	};
};

export type Barge = ReturnType<typeof buildBarge>;
