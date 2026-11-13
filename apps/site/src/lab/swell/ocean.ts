import {
	BufferAttribute,
	BufferGeometry,
	Matrix4,
	Mesh,
	PerspectiveCamera,
	Scene,
	ShaderMaterial,
	Vector3,
	Vector4,
	WebGLRenderer,
} from "three";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { HORIZON, type Moment, type RGB } from "./day";
import skyFragment from "./shaders/sky.frag?raw";
import skyLib from "./shaders/sky.glsl?raw";
import skyVertex from "./shaders/sky.vert?raw";
import waterFragment from "./shaders/water.frag?raw";
import waterVertex from "./shaders/water.vert?raw";

const RAD = Math.PI / 180;
const G = 9.8;
/** Slightly overcranked, as a film camera would shoot swell. */
const TIME_SCALE = 0.7;
const EYE_HEIGHT = 3;
const RADIUS = 7000;
const MOON_DIR = new Vector3(
	Math.sin(3 * RAD),
	Math.sin(10.5 * RAD),
	-Math.cos(3 * RAD),
).normalize();
const MOON = [0.62, 0.72, 1] as const;

/** Swell trains: heading (degrees, 90 = towards the camera), wavelength (m), steepness. */
const WAVES = (
	[
		[82, 64, 0.058],
		[104, 41, 0.052],
		[68, 27, 0.05],
		[118, 17, 0.046],
		[52, 11, 0.042],
		[135, 7.3, 0.038],
	] as const
).map(([heading, length, steepness]) => ({
	x: Math.cos(heading * RAD),
	z: Math.sin(heading * RAD),
	length,
	steepness,
}));

/** A fan of rings that widen with distance: dense underfoot, a few metres per cell at the horizon. */
const fan = (rings: number, spokes: number) => {
	const half = 66 * RAD;
	const positions = new Float32Array((rings + 1) * (spokes + 1) * 3);
	const index: number[] = [];
	for (let i = 0; i <= rings; i++) {
		const r = 1.2 * (RADIUS / 1.2) ** (i / rings);
		for (let j = 0; j <= spokes; j++) {
			const a = -half + (2 * half * j) / spokes;
			positions.set([r * Math.sin(a), 0, -r * Math.cos(a)], (i * (spokes + 1) + j) * 3);
			if (i < rings && j < spokes) {
				const v = i * (spokes + 1) + j;
				index.push(v, v + 1, v + spokes + 1, v + 1, v + spokes + 2, v + spokes + 1);
			}
		}
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(positions, 3));
	geometry.setIndex(index);
	return geometry;
};

const backdrop = () => {
	const geometry = new BufferGeometry();
	geometry.setAttribute(
		"position",
		new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
	);
	return geometry;
};

/** The sea and sky on `canvas`. Throws when WebGL is unavailable. */
export const createOcean = (canvas: HTMLCanvasElement) => {
	const phone = Math.min(screen.width, screen.height) < 600;
	const renderer = new WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: "high-performance",
	});
	const maxRatio = Math.min(devicePixelRatio, phone ? 1.5 : 1.75);
	let ratio = maxRatio;

	const colour = () => ({ value: new Vector3() });
	const shared = {
		uTime: { value: 0 },
		uZenith: colour(),
		uHorizon: colour(),
		uGlow: colour(),
		uSun: colour(),
		uMoon: colour(),
		uSunDir: colour(),
		uMoonDir: { value: MOON_DIR },
	};
	const sky = new ShaderMaterial({
		uniforms: {
			...shared,
			uCloud: colour(),
			uClouds: { value: 0 },
			uStars: { value: 0 },
			uSunSize: { value: 0.9 * RAD },
			uInvProj: { value: new Matrix4() },
			uCamWorld: { value: new Matrix4() },
		},
		vertexShader: skyVertex,
		fragmentShader: `${noise}\n${skyLib}\n${skyFragment}`,
		depthTest: false,
		depthWrite: false,
	});
	const water = new ShaderMaterial({
		uniforms: {
			...shared,
			uWaves: { value: WAVES.map((w) => new Vector4(w.x, w.z, w.length, w.steepness)) },
			uDeep: colour(),
			uScatter: colour(),
			uFog: { value: 0.00011 },
		},
		vertexShader: `#define TAU 6.28318530718\nuniform float uTime;\n${waterVertex}`,
		fragmentShader: `${noise}\n${skyLib}\n${waterFragment}`,
	});

	const scene = new Scene();
	const dome = new Mesh(backdrop(), sky);
	dome.renderOrder = -1;
	const sea = new Mesh(phone ? fan(120, 110) : fan(170, 200), water);
	dome.frustumCulled = sea.frustumCulled = false;
	scene.add(dome, sea);

	const camera = new PerspectiveCamera(40, 1, 0.5, RADIUS * 2);
	camera.rotation.order = "YXZ";

	const resize = () => {
		const { clientWidth: w, clientHeight: h } = canvas;
		if (!w || !h) return;
		renderer.setPixelRatio(ratio);
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.fov = camera.aspect < 1 ? 52 : 38;
		// Pitch down until the horizon lands on the page's horizon line.
		camera.rotation.x = -Math.atan((1 - 2 * HORIZON) * Math.tan((camera.fov * RAD) / 2));
		camera.updateProjectionMatrix();
	};
	const observer = new ResizeObserver(resize);
	observer.observe(canvas);
	resize();

	const set = (uniform: { value: Vector3 }, [r, g, b]: RGB, scale = 1) =>
		uniform.value.set(r * scale, g * scale, b * scale);

	/** Height of the long swell under the camera, which rides it like a deck. */
	const heave = (t: number) =>
		WAVES.slice(0, 3).reduce((sum, { length, steepness }) => {
			const k = (2 * Math.PI) / length;
			return sum + (steepness / k) * Math.sin(-k * Math.sqrt(G / k) * t);
		}, 0);

	let slow = 0;
	let last = 0;

	return {
		render(seconds: number, m: Moment) {
			const t = seconds * TIME_SCALE;
			shared.uTime.value = t;
			set(shared.uZenith, m.zenith);
			set(shared.uHorizon, m.horizon);
			set(shared.uGlow, m.glow);
			set(shared.uSun, m.sun, m.sunPower);
			set(shared.uMoon, MOON, m.moon);
			set(shared.uSunDir, m.sunDir);
			set(sky.uniforms.uCloud as { value: Vector3 }, m.cloud);
			(sky.uniforms.uClouds as { value: number }).value = m.clouds;
			(sky.uniforms.uStars as { value: number }).value = m.stars;
			set(water.uniforms.uDeep as { value: Vector3 }, m.deep);
			set(water.uniforms.uScatter as { value: Vector3 }, m.scatter);

			camera.position.y = EYE_HEIGHT + 0.75 * heave(t);
			camera.rotation.z = 0.004 * Math.sin(t * 0.45);
			camera.updateMatrixWorld();
			(sky.uniforms.uInvProj as { value: Matrix4 }).value.copy(camera.projectionMatrixInverse);
			(sky.uniforms.uCamWorld as { value: Matrix4 }).value.copy(camera.matrixWorld);
			renderer.render(scene, camera);

			// Shed resolution when frames run long.
			const now = performance.now();
			const frame = now - last;
			last = now;
			if (frame > 26 && frame < 200) slow++;
			else slow = Math.max(0, slow - 1);
			if (slow > 40 && ratio > 0.75) {
				slow = 0;
				ratio = Math.max(0.75, ratio - 0.25);
				resize();
			}
		},
		dispose() {
			observer.disconnect();
			sea.geometry.dispose();
			dome.geometry.dispose();
			sky.dispose();
			water.dispose();
			renderer.dispose();
		},
	};
};
