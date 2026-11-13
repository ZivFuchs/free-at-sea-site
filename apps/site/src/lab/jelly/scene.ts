import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	Group,
	LineSegments,
	Mesh,
	PerspectiveCamera,
	PlaneGeometry,
	Points,
	Scene,
	ShaderMaterial,
	Vector3,
	WebGLRenderer,
} from "three";
import { clamp, damp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import armsFrag from "./shaders/arms.frag?raw";
import armsVert from "./shaders/arms.vert?raw";
import bellFrag from "./shaders/bell.frag?raw";
import bellVert from "./shaders/bell.vert?raw";
import common from "./shaders/common.glsl?raw";
import snowFrag from "./shaders/snow.frag?raw";
import snowVert from "./shaders/snow.vert?raw";
import tentaclesFrag from "./shaders/tentacles.frag?raw";
import tentaclesVert from "./shaders/tentacles.vert?raw";
import waterFrag from "./shaders/water.frag?raw";
import waterVert from "./shaders/water.vert?raw";

const FOV = 40;
const CAMERA_Z = 7;
const MAX_DPR = 1.5;
const PHONE = 600;
const TENTACLES = 36;
const TENTACLE_SEGMENTS = 22;
const SNOW_BOX = new Vector3(12, 10, 12);
/** Frozen clock for the reduced-motion still: mid-relaxation for the hero specimen. */
const STILL_TIME = 20;

/** Deterministic, so the same animals are in the same water every visit. */
const random = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const bellGeometry = () => new PlaneGeometry(1, 1, 64, 28);

const armsGeometry = () => {
	const arms = [0, 1, 2, 3].map((arm) => {
		const g = new PlaneGeometry(1, 1, 2, 36);
		g.setAttribute(
			"aArm",
			new BufferAttribute(new Float32Array(g.attributes.uv.count).fill(arm), 1),
		);
		return g;
	});
	const merged = new BufferGeometry();
	const concat = (name: string, size: number) =>
		new BufferAttribute(
			Float32Array.from(arms.flatMap((g) => [...(g.getAttribute(name).array as Float32Array)])),
			size,
		);
	merged.setAttribute("position", concat("position", 3));
	merged.setAttribute("uv", concat("uv", 2));
	merged.setAttribute("aArm", concat("aArm", 1));
	const per = arms[0]?.attributes.position.count ?? 0;
	merged.setIndex(arms.flatMap((g, i) => [...(g.index?.array ?? [])].map((v) => v + i * per)));
	for (const g of arms) g.dispose();
	return merged;
};

const tentacleGeometry = (rand: () => number) => {
	const u: number[] = [];
	const t: number[] = [];
	const seed: number[] = [];
	for (let i = 0; i < TENTACLES; i++) {
		const angle = (i + rand() * 0.9) / TENTACLES;
		const s = rand();
		for (let j = 0; j < TENTACLE_SEGMENTS; j++) {
			u.push(angle, angle);
			t.push(j / TENTACLE_SEGMENTS, (j + 1) / TENTACLE_SEGMENTS);
			seed.push(s, s);
		}
	}
	const g = new BufferGeometry();
	g.setAttribute("position", new BufferAttribute(new Float32Array(u.length * 3), 3));
	g.setAttribute("aU", new BufferAttribute(Float32Array.from(u), 1));
	g.setAttribute("aT", new BufferAttribute(Float32Array.from(t), 1));
	g.setAttribute("aSeed", new BufferAttribute(Float32Array.from(seed), 1));
	return g;
};

const snowGeometry = (count: number, rand: () => number) => {
	const position = new Float32Array(count * 3);
	const seed = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		position[i * 3] = rand() * SNOW_BOX.x;
		position[i * 3 + 1] = rand() * SNOW_BOX.y;
		position[i * 3 + 2] = rand() * SNOW_BOX.z;
		seed[i] = rand();
	}
	const g = new BufferGeometry();
	g.setAttribute("position", new BufferAttribute(position, 3));
	g.setAttribute("aSeed", new BufferAttribute(seed, 1));
	return g;
};

interface Jelly {
	group: Group;
	uniforms: ReturnType<typeof jellyUniforms>;
	/** Where in the dive it lives: 0 top of page, 1 bottom. */
	at: number;
	/** Horizontal place as a fraction of the half-width visible at its depth. */
	side: number;
	z: number;
	size: number;
	seed: number;
	glow: number;
	last: Vector3;
}

const jellyUniforms = (rate: number, phase: number, tint: Color) => ({
	uTime: { value: 0 },
	uPhase: { value: phase },
	uRate: { value: rate },
	uLen: { value: 2.4 },
	uDrag: { value: new Vector3() },
	uGlow: { value: 0 },
	uFade: { value: 1 },
	uSoft: { value: 0 },
	uTint: { value: tint },
});

const additive = {
	transparent: true,
	blending: AdditiveBlending,
	depthWrite: false,
	depthTest: false,
};

/** Runs the scene on `canvas`. Returns a disposer, or `null` without WebGL. */
export const startMedusae = (canvas: HTMLCanvasElement) => {
	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: "low-power",
		});
	} catch {
		return null;
	}

	const phone = innerWidth < PHONE;
	const still = reducedMotion();
	const rand = random(7);
	const scene = new Scene();
	const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
	camera.position.z = CAMERA_Z;
	const halfHeight = (distance: number) => Math.tan((FOV * Math.PI) / 360) * distance;

	const water = new ShaderMaterial({
		vertexShader: waterVert,
		fragmentShader: waterFrag,
		uniforms: { uDepth: { value: 0 } },
		depthTest: false,
		depthWrite: false,
	});
	const backdrop = new Mesh(new PlaneGeometry(1, 1), water);
	backdrop.frustumCulled = false;
	backdrop.renderOrder = -1;
	scene.add(backdrop);

	const snow = new ShaderMaterial({
		vertexShader: snowVert,
		fragmentShader: snowFrag,
		uniforms: { uTime: { value: 0 }, uSize: { value: 1 }, uBox: { value: SNOW_BOX } },
		...additive,
	});
	const flakes = new Points(snowGeometry(phone ? 260 : 520, rand), snow);
	flakes.frustumCulled = false;
	scene.add(flakes);

	const bell = bellGeometry();
	const arms = armsGeometry();
	const tentacles = tentacleGeometry(rand);
	const materials: ShaderMaterial[] = [water, snow];

	const spawn = (at: number, side: number, z: number, size: number): Jelly => {
		const tint = new Color().setHSL(0.55 + rand() * 0.09, 0.3 + rand() * 0.25, 0.72);
		const uniforms = jellyUniforms(0.2 + rand() * 0.1, rand(), tint);
		const group = new Group();
		const part = (vertex: string, fragment: string, extra = {}) => {
			const material = new ShaderMaterial({
				vertexShader: `${common}\n${vertex}`,
				fragmentShader: fragment,
				uniforms: { ...uniforms, ...extra },
				side: DoubleSide,
				...additive,
			});
			materials.push(material);
			return material;
		};
		const parts = [
			new LineSegments(tentacles, part(tentaclesVert, tentaclesFrag)),
			new Mesh(arms, part(armsVert, armsFrag)),
			new Mesh(bell, part(bellVert, bellFrag, { uInner: { value: 0.7 } })),
			new Mesh(bell, part(bellVert, bellFrag, { uInner: { value: 1 } })),
		];
		for (const p of parts) p.frustumCulled = false;
		group.add(...parts);
		group.scale.setScalar(size);
		group.rotation.set((rand() - 0.5) * 0.5, rand() * 6, (rand() - 0.5) * 0.7);
		scene.add(group);
		return { group, uniforms, at, side, z, size, seed: rand() * 100, glow: 0, last: new Vector3() };
	};

	/* The hero specimen, then the rest spread down the dive: alternating sides, mostly out of the reading column. */
	const others = phone ? 5 : 9;
	const hero = spawn(0, 0, 0, 1);
	hero.group.rotation.set(0.32, 0.4, -0.36);
	const jellies = [
		hero,
		...Array.from({ length: others }, (_, i) => {
			const far = rand();
			return spawn(
				(i + 1.3 + rand() * 0.5) / (others + 1.2),
				(i % 2 ? 1 : -1) * (0.62 + rand() * 0.36),
				-2 - far * 10,
				0.55 + rand() * 0.75,
			);
		}),
	];

	const pointer = { x: -1e4, y: -1e4 };
	const track = (e: PointerEvent) => {
		pointer.x = e.clientX;
		pointer.y = e.clientY;
	};
	const leave = () => {
		pointer.x = pointer.y = -1e4;
	};
	addEventListener("pointermove", track, { passive: true });
	addEventListener("pointerdown", track, { passive: true });
	document.addEventListener("pointerleave", leave);

	let width = 0;
	let height = 0;
	let dive = 0;
	const projected = new Vector3();
	const target = new Vector3();

	const tick = (clock: number, dt: number) => {
		const time = still ? STILL_TIME : clock;
		const screens = (document.documentElement.scrollHeight - innerHeight) / innerHeight;
		const unit = halfHeight(CAMERA_Z) * 2 * 0.85;
		const wanted = Math.max(0, scrollY) / innerHeight;
		dive = still ? wanted : damp(dive, wanted, 6, dt);
		camera.position.set(
			Math.sin(time * 0.11) * 0.12,
			-dive * unit + Math.sin(time * 0.17) * 0.06,
			CAMERA_Z,
		);
		camera.updateMatrixWorld();
		water.uniforms.uDepth.value = clamp(dive / 1.5);
		snow.uniforms.uTime.value = time;

		const portrait = width < height;
		jellies.forEach((jelly, i) => {
			const { group, uniforms, seed } = jelly;
			const distance = CAMERA_Z - jelly.z;
			const h = halfHeight(distance);
			const w = (h * width) / height;
			const lead = i === 0;
			const size = lead ? Math.min(1.45, portrait ? w * 0.62 : h * 0.5) : jelly.size;
			group.scale.setScalar(size);

			/* Hovering: each pulse lifts it along its own axis, then it sinks back. */
			const phase = (time * uniforms.uRate.value + uniforms.uPhase.value) % 1;
			const lift =
				(smoothstep(0.05, 0.4, phase) * (1 - smoothstep(0.4, 1, phase)) - 0.3) * 0.22 * size;
			target.set(0, 1, 0).applyQuaternion(group.quaternion).multiplyScalar(lift);
			target.x +=
				Math.sin(time * 0.07 + seed) * 0.35 +
				(lead ? (portrait ? w * 0.12 : w * 0.46) : jelly.side * w);
			target.y +=
				Math.cos(time * 0.05 + seed * 1.3) * 0.25 +
				(lead ? (portrait ? -h * 0.3 : h * 0.12) : -jelly.at * screens * unit);
			target.z += jelly.z + Math.sin(time * 0.04 + seed * 2.1) * 0.4;
			group.position.copy(target);
			group.rotation.z += Math.sin(time * 0.09 + seed) * 0.0004;

			/* Trailing parts lag behind the body's own movement. */
			const drag = uniforms.uDrag.value;
			if (dt > 0 && !still) {
				projected
					.copy(jelly.last)
					.sub(group.position)
					.divideScalar(dt * size)
					.clampLength(0, 0.6);
				drag.x = damp(drag.x, projected.x, 2, dt);
				drag.y = damp(drag.y, projected.y * 0.4, 2, dt);
				drag.z = damp(drag.z, projected.z, 2, dt);
			}
			jelly.last.copy(group.position);

			projected.copy(group.position).project(camera);
			const px = (projected.x * 0.5 + 0.5) * innerWidth;
			const py = (-projected.y * 0.5 + 0.5) * innerHeight;
			const radius = (size / h) * innerHeight * 0.5;
			const near =
				1 - smoothstep(radius * 0.6, radius * 1.6 + 40, Math.hypot(pointer.x - px, pointer.y - py));
			jelly.glow = still ? 0 : damp(jelly.glow, near, near > jelly.glow ? 5 : 1.2, dt);

			uniforms.uTime.value = time;
			uniforms.uGlow.value = jelly.glow;
			uniforms.uFade.value = (lead ? 1 : 0.8) * Math.exp(-Math.max(0, distance - CAMERA_Z) * 0.13);
			uniforms.uSoft.value = clamp((distance - CAMERA_Z - 2) / 8);
			group.visible = Math.abs(projected.y) < 3;
		});

		renderer.render(scene, camera);
	};

	const loop = onFrame(canvas, tick, { margin: "0px" });

	const resize = () => {
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		if (!width || !height) return;
		const dpr = Math.min(devicePixelRatio, MAX_DPR);
		renderer.setPixelRatio(dpr);
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		snow.uniforms.uSize.value = height * dpr * 0.012;
		loop.redraw();
	};
	const observer = new ResizeObserver(resize);
	observer.observe(canvas);
	if (still) addEventListener("scroll", loop.redraw, { passive: true });

	return () => {
		loop.stop();
		observer.disconnect();
		removeEventListener("pointermove", track);
		removeEventListener("pointerdown", track);
		removeEventListener("scroll", loop.redraw);
		document.removeEventListener("pointerleave", leave);
		for (const m of materials) m.dispose();
		for (const g of [bell, arms, tentacles, flakes.geometry, backdrop.geometry]) g.dispose();
		renderer.dispose();
	};
};
