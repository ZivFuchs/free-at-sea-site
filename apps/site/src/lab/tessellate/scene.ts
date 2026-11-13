import * as THREE from "three";
import { clamp, lerp, smoothstep } from "@/lab/lib/motion";
import { buildPlan, joined } from "./layout";
import common from "./shaders/common.glsl?raw";
import hexFrag from "./shaders/hex.frag?raw";
import hexVert from "./shaders/hex.vert?raw";
import shadow from "./shaders/shadow.glsl?raw";
import skyFrag from "./shaders/sky.frag?raw";
import skyVert from "./shaders/sky.vert?raw";
import waterFrag from "./shaders/water.frag?raw";
import waterVert from "./shaders/water.vert?raw";

type Rgb = readonly [number, number, number];

interface Light {
	at: number;
	zenith: Rgb;
	horizon: Rgb;
	sun: Rgb;
	deep: Rgb;
	/** Sun elevation, degrees. */
	elevation: number;
	night: number;
}

/** The day across the scroll: cool morning, high noon, dusk, then lamplight. */
const DAY: readonly Light[] = [
	{
		at: 0,
		zenith: [0.03, 0.11, 0.36],
		horizon: [0.36, 0.54, 0.8],
		sun: [2.9, 2.3, 1.6],
		deep: [0.01, 0.045, 0.09],
		elevation: 15,
		night: 0,
	},
	{
		at: 0.45,
		zenith: [0.07, 0.22, 0.52],
		horizon: [0.56, 0.72, 0.88],
		sun: [2.5, 2.4, 2.2],
		deep: [0.012, 0.062, 0.12],
		elevation: 44,
		night: 0,
	},
	{
		at: 0.72,
		zenith: [0.07, 0.2, 0.48],
		horizon: [0.6, 0.7, 0.82],
		sun: [2.6, 2.35, 2],
		deep: [0.012, 0.058, 0.11],
		elevation: 34,
		night: 0,
	},
	{
		at: 0.84,
		zenith: [0.08, 0.17, 0.4],
		horizon: [0.78, 0.6, 0.46],
		sun: [2.7, 2.05, 1.4],
		deep: [0.011, 0.046, 0.09],
		elevation: 24,
		night: 0.04,
	},
	{
		at: 0.93,
		zenith: [0.035, 0.06, 0.16],
		horizon: [0.42, 0.24, 0.2],
		sun: [0.8, 0.42, 0.26],
		deep: [0.005, 0.02, 0.05],
		elevation: 9,
		night: 0.8,
	},
	{
		at: 1,
		zenith: [0.03, 0.05, 0.12],
		horizon: [0.08, 0.11, 0.2],
		sun: [0.3, 0.37, 0.55],
		deep: [0.004, 0.013, 0.034],
		elevation: 38,
		night: 1,
	},
];

const SUN_AZIMUTH = 3.55;
const SPREAD = 1.9;
const SUN_DISTANCE = 500;
const FOV = 40;
const TIERS = { top: 0, bevel: 1, base: 2 } as const;
const PARTS = { deck: 0, chamfer: 1, wall: 2 } as const;
/** Deck inset: the chamfer runs from here out to the full radius. */
const DECK = 0.93;

const mix3 = (a: Rgb, b: Rgb, t: number): Rgb => [
	lerp(a[0], b[0], t),
	lerp(a[1], b[1], t),
	lerp(a[2], b[2], t),
];

const lightAt = (p: number): Omit<Light, "at"> => {
	const next = DAY.findIndex((k) => k.at >= p);
	const b = DAY[Math.max(next, 0)] ?? DAY[0];
	const a = DAY[Math.max(next - 1, 0)] ?? b;
	if (!a || !b) throw new Error("No light keyframes");
	const t = a === b ? 0 : smoothstep(a.at, b.at, p);
	return {
		zenith: mix3(a.zenith, b.zenith, t),
		horizon: mix3(a.horizon, b.horizon, t),
		sun: mix3(a.sun, b.sun, t),
		deep: mix3(a.deep, b.deep, t),
		elevation: lerp(a.elevation, b.elevation, t),
		night: lerp(a.night, b.night, t),
	};
};

/** A chamfered hexagonal prism of circumradius 1, heights resolved per instance from `aTier`. */
const hexPrism = () => {
	const position: number[] = [];
	const normal: number[] = [];
	const uv: number[] = [];
	const tier: number[] = [];
	const part: number[] = [];
	const corner = (i: number, r: number) => {
		const a = (Math.PI / 3) * i + Math.PI / 6;
		return [Math.cos(a) * r, Math.sin(a) * r] as const;
	};
	const push = (x: number, z: number, n: Rgb, u: number, v: number, t: number, p: number) => {
		position.push(x, 0, z);
		normal.push(...n);
		uv.push(u, v);
		tier.push(t);
		part.push(p);
	};

	for (let i = 0; i < 6; i++) {
		const [ax, az] = corner(i, DECK);
		const [bx, bz] = corner(i + 1, DECK);
		const [cx, cz] = corner(i, 1);
		const [dx, dz] = corner(i + 1, 1);
		const mid = (Math.PI / 3) * i + Math.PI / 3;
		const out: Rgb = [Math.cos(mid), 0, Math.sin(mid)];
		const slant: Rgb = [out[0] * 0.6, 0.8, out[2] * 0.6];
		const up: Rgb = [0, 1, 0];

		push(0, 0, up, 0, 0, TIERS.top, PARTS.deck);
		push(bx, bz, up, bx, bz, TIERS.top, PARTS.deck);
		push(ax, az, up, ax, az, TIERS.top, PARTS.deck);

		const quad = (
			top: readonly [number, number, number, number],
			bottom: readonly [number, number, number, number],
			n: Rgb,
			tiers: readonly [number, number],
			p: number,
		) => {
			const [tax, taz, tbx, tbz] = top;
			const [bax, baz, bbx, bbz] = bottom;
			push(tax, taz, n, i, 1, tiers[0], p);
			push(tbx, tbz, n, i + 1, 1, tiers[0], p);
			push(bax, baz, n, i, 0, tiers[1], p);
			push(tbx, tbz, n, i + 1, 1, tiers[0], p);
			push(bbx, bbz, n, i + 1, 0, tiers[1], p);
			push(bax, baz, n, i, 0, tiers[1], p);
		};
		quad([ax, az, bx, bz], [cx, cz, dx, dz], slant, [TIERS.top, TIERS.bevel], PARTS.chamfer);
		quad([cx, cz, dx, dz], [cx, cz, dx, dz], out, [TIERS.bevel, TIERS.base], PARTS.wall);
	}

	const geometry = new THREE.InstancedBufferGeometry();
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
	geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
	geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	geometry.setAttribute("aTier", new THREE.Float32BufferAttribute(tier, 1));
	geometry.setAttribute("aPart", new THREE.Float32BufferAttribute(part, 1));
	return geometry;
};

/** Rings spaced geometrically: fine under the settlement, coarse out to the horizon. */
const seaDisc = (rings: number, spokes: number) => {
	const position: number[] = [0, 0, 0];
	const index: number[] = [];
	for (let r = 1; r <= rings; r++) {
		const radius = 4 * (1.031 ** r - 1);
		for (let s = 0; s < spokes; s++) {
			const a = (s / spokes) * Math.PI * 2;
			position.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
		}
	}
	const at = (r: number, s: number) => 1 + (r - 1) * spokes + (s % spokes);
	for (let s = 0; s < spokes; s++) index.push(0, at(1, s + 1), at(1, s));
	for (let r = 1; r < rings; r++) {
		for (let s = 0; s < spokes; s++) {
			index.push(
				at(r, s),
				at(r, s + 1),
				at(r + 1, s),
				at(r, s + 1),
				at(r + 1, s + 1),
				at(r + 1, s),
			);
		}
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
	geometry.setIndex(index);
	return geometry;
};

export interface SceneOptions {
	/** Phones: fewer cells, coarser sea, lower pixel ratio. */
	compact: boolean;
}

export const createScene = (canvas: HTMLCanvasElement, { compact }: SceneOptions) => {
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: "high-performance",
	});
	const maxRatio = compact ? 1.5 : 1.75;
	let ratio = Math.min(devicePixelRatio, maxRatio);
	renderer.setPixelRatio(ratio);

	const plan = buildPlan(compact ? 25 : 37);
	const shadowSize = compact ? 1024 : 2048;
	const shadowTarget = new THREE.WebGLRenderTarget(shadowSize, shadowSize, {
		depthTexture: new THREE.DepthTexture(shadowSize, shadowSize),
	});
	const sunCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2);
	const uniforms = {
		uTime: { value: 0 },
		uProgress: { value: 0 },
		uSpread: { value: SPREAD },
		uCalm: { value: 1 },
		uNight: { value: 0 },
		uSunDir: { value: new THREE.Vector3() },
		uSunCol: { value: new THREE.Vector3() },
		uZenith: { value: new THREE.Vector3() },
		uHorizon: { value: new THREE.Vector3() },
		uDeep: { value: new THREE.Vector3() },
		uShadowMap: { value: shadowTarget.depthTexture },
		uShadowMatrix: { value: new THREE.Matrix4() },
		uShadowTexel: { value: 1 / shadowSize },
		uShadowBias: { value: 0 },
	};
	const material = (vertex: string, fragment: string, extra: THREE.ShaderMaterialParameters = {}) =>
		new THREE.ShaderMaterial({
			uniforms,
			vertexShader: `${common}\n${vertex}`,
			fragmentShader: `${common}\n${shadow}\n${fragment}`,
			...extra,
		});

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 4000);

	const sky = new THREE.Mesh(
		new THREE.SphereGeometry(1, 24, 12),
		material(skyVert, skyFrag, { side: THREE.BackSide, depthWrite: false, depthTest: false }),
	);
	sky.renderOrder = -1;

	const sea = new THREE.Mesh(
		compact ? seaDisc(170, 160) : seaDisc(195, 256),
		material(waterVert, waterFrag),
	);

	const hexes = hexPrism();
	hexes.instanceCount = plan.count;
	const instanced = (name: string, data: Float32Array, size: number) =>
		hexes.setAttribute(name, new THREE.InstancedBufferAttribute(data, size));
	instanced("aHome", plan.home, 2);
	instanced("aSeed", plan.seed, 2);
	instanced("aTiming", plan.timing, 2);
	instanced("aShape", plan.shape, 3);
	instanced("aKind", plan.kind, 1);
	instanced("aRand", plan.rand, 4);
	const city = new THREE.Mesh(hexes, material(hexVert, hexFrag, { side: THREE.DoubleSide }));
	const depth = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: `${common}\n${hexVert}`,
		fragmentShader: "void main(){gl_FragColor=vec4(1.);}",
		side: THREE.DoubleSide,
	});

	for (const mesh of [sky, sea, city]) {
		mesh.frustumCulled = false;
		scene.add(mesh);
	}

	const target = new THREE.Vector3();
	const up = new THREE.Vector3();

	const frame = (time: number, progress: number) => {
		const p = clamp(progress);
		uniforms.uTime.value = time;
		uniforms.uProgress.value = p;
		uniforms.uCalm.value = lerp(1, 0.55, smoothstep(0.45, 0.85, p));

		const light = lightAt(p);
		const el = (light.elevation * Math.PI) / 180;
		uniforms.uSunDir.value.set(
			Math.cos(el) * Math.cos(SUN_AZIMUTH),
			Math.sin(el),
			Math.cos(el) * Math.sin(SUN_AZIMUTH),
		);
		uniforms.uSunCol.value.set(...light.sun);
		uniforms.uZenith.value.set(...light.zenith);
		uniforms.uHorizon.value.set(...light.horizon);
		uniforms.uDeep.value.set(...light.deep);
		uniforms.uNight.value = light.night;

		// Low and oblique among the loose pontoons, rising to a plan view of the finished city.
		const rise = smoothstep(0.05, 0.78, p);
		const tan = Math.tan((FOV * Math.PI) / 360);
		const plan_ = (plan.radius * 0.98) / (tan * Math.sqrt(Math.max(camera.aspect, 0.5)));
		const elevation = lerp(0.105, 1.5, rise ** 1.25);
		const distance = lerp(compact ? 46 : 54, plan_, rise ** (compact ? 1.05 : 1.6));
		const azimuth = 0.9 + p * 1.1 + Math.sin(time * 0.05) * 0.02;
		camera.position.set(
			Math.cos(elevation) * Math.cos(azimuth) * distance,
			Math.sin(elevation) * distance,
			Math.cos(elevation) * Math.sin(azimuth) * distance,
		);
		// Aim above the centre at first, so the horizon sits low enough to leave sky for the title.
		target.set(0, lerp(distance * 0.1, 0, smoothstep(0, 0.3, p)), 0);
		up.set(-Math.cos(azimuth), 0.35, -Math.sin(azimuth))
			.lerp(new THREE.Vector3(0, 1, 0), 1 - rise ** 3)
			.normalize();
		camera.up.copy(up);
		camera.lookAt(target);

		// Sun's view of the cells, fitted to however far they are still spread.
		const reach = plan.radius * lerp(SPREAD, 1, smoothstep(0.5, 0.88, p)) * 1.06 + 3;
		sunCamera.position.copy(uniforms.uSunDir.value).multiplyScalar(SUN_DISTANCE);
		sunCamera.lookAt(0, 0, 0);
		sunCamera.left = sunCamera.bottom = -reach;
		sunCamera.right = sunCamera.top = reach;
		sunCamera.near = SUN_DISTANCE - reach - 5;
		sunCamera.far = SUN_DISTANCE + reach + 5;
		uniforms.uShadowBias.value = (2 * reach) / shadowSize / (2 * reach + 10);
		sunCamera.updateProjectionMatrix();
		sunCamera.updateMatrixWorld();
		uniforms.uShadowMatrix.value.multiplyMatrices(
			sunCamera.projectionMatrix,
			sunCamera.matrixWorldInverse,
		);
		sky.visible = sea.visible = false;
		scene.overrideMaterial = depth;
		renderer.setRenderTarget(shadowTarget);
		renderer.clear();
		renderer.render(scene, sunCamera);
		renderer.setRenderTarget(null);
		scene.overrideMaterial = null;
		sky.visible = sea.visible = true;

		renderer.render(scene, camera);
	};

	const resize = () => {
		const { clientWidth: w, clientHeight: h } = canvas;
		if (!w || !h) return;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	};

	return {
		frame,
		resize,
		total: plan.locks.length,
		joined: (progress: number) => joined(plan, progress),
		/** Steps the pixel ratio down when frames run long; returns false at the floor. */
		coarsen: () => {
			if (ratio <= 1) return false;
			ratio = Math.max(1, ratio - 0.25);
			renderer.setPixelRatio(ratio);
			resize();
			return true;
		},
		dispose: () => {
			for (const mesh of [sky, sea, city]) {
				mesh.geometry.dispose();
				mesh.material.dispose();
			}
			depth.dispose();
			shadowTarget.dispose();
			renderer.dispose();
		},
	};
};

export type TessellateScene = ReturnType<typeof createScene>;
