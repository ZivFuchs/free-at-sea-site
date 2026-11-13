import {
	BackSide,
	BoxGeometry,
	Mesh,
	PlaneGeometry,
	ShaderMaterial,
	SphereGeometry,
	Vector2,
	Vector3,
	Vector4,
} from "three";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import domeFrag from "./glsl/dome.frag?raw";
import domeVert from "./glsl/dome.vert?raw";
import pitFrag from "./glsl/pit.frag?raw";
import pitVert from "./glsl/pit.vert?raw";
import sky from "./glsl/sky.glsl?raw";
import waterFrag from "./glsl/water.frag?raw";
import waterVert from "./glsl/water.vert?raw";
import wavesGlsl from "./glsl/waves.glsl?raw";
import { HULL } from "./model";

const GRAVITY = 9.81;

/** Long, slow swell: wavelength (m), amplitude (m), heading (degrees from +x), phase. */
const SWELL = [
	[92, 0.5, 205, 0],
	[57, 0.3, 232, 1.7],
	[33, 0.17, 188, 4.1],
	[19, 0.09, 251, 2.6],
	[11, 0.05, 170, 5.3],
	[6.5, 0.028, 222, 0.9],
] as const;

const waves = SWELL.map(([length, amplitude, heading, phase]) => {
	const k = (2 * Math.PI) / length;
	const a = (heading * Math.PI) / 180;
	return { x: Math.cos(a), z: Math.sin(a), k, amplitude, omega: Math.sqrt(GRAVITY * k), phase };
});

/** Surface height at a world position: the same sum the shaders run. */
export const swell = (x: number, z: number, time: number) =>
	waves.reduce(
		(h, w) => h + w.amplitude * Math.sin((w.x * x + w.z * z) * w.k - w.omega * time + w.phase),
		0,
	);

export const SUN = new Vector3(-0.55, 0.42, 0.62).normalize();
/** Where the cut plane rests when nothing is sectioned: beyond the sea block's far side. */
export const CUT_OPEN = 17;
const PIT = { minX: -38, maxX: 38, farZ: 16, floor: -9 };

const include = (source: string) =>
	source
		.replace("#include_noise", noise)
		.replace("#include_sky", sky)
		.replace("#include_waves", wavesGlsl);

const waveUniforms = () => ({
	uTime: { value: 0 },
	uWave: { value: waves.map((w) => new Vector4(w.x, w.z, w.k, w.amplitude)) },
	uWavePhase: { value: waves.map((w) => new Vector2(w.omega, w.phase)) },
});

export const createOcean = () => {
	const sun = { value: SUN };

	const dome = new Mesh(
		new SphereGeometry(1, 32, 16),
		new ShaderMaterial({
			vertexShader: domeVert,
			fragmentShader: include(domeFrag),
			uniforms: { uSun: sun },
			side: BackSide,
			depthWrite: false,
		}),
	);
	dome.frustumCulled = false;
	dome.renderOrder = -1;

	// One plane, stretched so vertices crowd around the vessel and thin out to the horizon.
	const SEGMENTS = 220;
	const geometry = new PlaneGeometry(2, 2, SEGMENTS, SEGMENTS).rotateX(-Math.PI / 2);
	const position = geometry.getAttribute("position");
	for (let i = 0; i < position.count; i++) {
		const stretch = (v: number) => Math.sign(v) * (Math.abs(v) * 90 + Math.abs(v) ** 5 * 3900);
		position.setXYZ(i, stretch(position.getX(i)), 0, stretch(position.getZ(i)));
	}
	const pit = new Vector4(PIT.minX, PIT.maxX, CUT_OPEN, PIT.farZ);
	const water = new Mesh(
		geometry,
		new ShaderMaterial({
			vertexShader: include(waterVert),
			fragmentShader: include(waterFrag),
			uniforms: {
				...waveUniforms(),
				uSun: sun,
				uHull: { value: new Vector3() },
				uHullSize: { value: new Vector2(HULL.length / 2, HULL.beam / 2) },
				uPit: { value: pit },
			},
		}),
	);
	water.frustumCulled = false;

	// The block of sea removed in front of the cut, seen from inside.
	const depth = 3 - PIT.floor;
	const walls = new Mesh(
		new BoxGeometry(1, depth, 1).translate(0, 3 - depth / 2, 0),
		new ShaderMaterial({
			vertexShader: pitVert,
			fragmentShader: include(pitFrag),
			uniforms: {
				...waveUniforms(),
				uProfile: { value: new Vector4() },
				uCutZ: { value: CUT_OPEN },
				uSunTint: { value: new Vector3(1, 0.86, 0.66) },
			},
			side: BackSide,
		}),
	);
	walls.scale.x = PIT.maxX - PIT.minX;
	walls.visible = false;

	return {
		dome,
		water,
		walls,
		update(time: number, hull: { x: number; z: number; heave: number }, cutZ: number) {
			water.material.uniforms.uTime.value = time;
			walls.material.uniforms.uTime.value = time;
			water.material.uniforms.uHull.value.set(hull.x, hull.z, 0);
			pit.z = cutZ;
			const open = cutZ < PIT.farZ;
			walls.visible = open;
			if (!open) return;
			walls.scale.z = PIT.farZ - cutZ;
			walls.position.set((PIT.minX + PIT.maxX) / 2, 0, (PIT.farZ + cutZ) / 2);
			walls.material.uniforms.uCutZ.value = cutZ;
			walls.material.uniforms.uProfile.value.set(
				hull.x - HULL.length / 2,
				hull.x + HULL.length / 2,
				hull.heave - HULL.draught,
				hull.heave + HULL.freeboard,
			);
		},
	};
};
