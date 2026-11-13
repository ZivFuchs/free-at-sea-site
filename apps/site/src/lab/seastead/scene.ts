import * as THREE from "three";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, lerp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import skyFrag from "./glsl/sky.frag?raw";
import skyChunk from "./glsl/sky.glsl?raw";
import skyVert from "./glsl/sky.vert?raw";
import waterFrag from "./glsl/water.frag?raw";
import waterVert from "./glsl/water.vert?raw";
import { buildSeastead, HULLS } from "./model";
import { DAWN, DUSK, INK } from "./palette";
import { BUILD, CALLOUTS, DAYBREAK, type ModuleKey, STOPS, WARMING } from "./tour";

const FOV = 32;
const SUN = new THREE.Vector3(-0.72, 0.15, -0.66).normalize();
/** Desktop: the model sits right of centre by this share of the width, leaving the left for copy. */
const ASIDE = 0.19;
const WIDE = "(min-width: 64rem)";
const UP = new THREE.Vector3(0, 1, 0);

/** Any CSS colour (the tokens are oklch) as a three colour. */
const cssColor = (value: string) => {
	const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	if (!ctx) return new THREE.Color(value);
	ctx.fillStyle = value;
	ctx.fillRect(0, 0, 1, 1);
	const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
	return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
};

export interface Mount {
	/** Sticky viewport; its `color` is the drafting line colour. */
	stage: HTMLElement;
	canvas: HTMLCanvasElement;
	/** One per stop, in order. */
	sections: readonly HTMLElement[];
	/** Label and leader per `CALLOUTS` entry, in order. */
	labels: readonly HTMLElement[];
	leaders: readonly SVGLineElement[];
	dots: readonly SVGCircleElement[];
}

export const mount = ({ stage, canvas, sections, labels, leaders, dots }: Mount) => {
	const still = reducedMotion();
	const coarse = matchMedia("(pointer: coarse)").matches;
	const wide = matchMedia(WIDE);
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: "high-performance",
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
	renderer.localClippingEnabled = true;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;

	const paper = cssColor(getComputedStyle(document.body).backgroundColor);
	const line = cssColor(getComputedStyle(stage).color);
	const ink = new THREE.Color(INK);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 9000);

	const shared = {
		u_time: { value: 0 },
		u_day: { value: 0 },
		u_paper: { value: paper },
		u_sun: { value: SUN },
		u_zenith: { value: new THREE.Color(DUSK.zenith) },
		u_horizon: { value: new THREE.Color(DUSK.horizon) },
		u_glow: { value: new THREE.Color(DUSK.glow) },
	};

	const sky = new THREE.Mesh(
		new THREE.SphereGeometry(1, 24, 12),
		new THREE.ShaderMaterial({
			uniforms: shared,
			vertexShader: skyVert,
			fragmentShader: `${skyChunk}\n${skyFrag}`,
			side: THREE.BackSide,
			depthWrite: false,
			depthTest: false,
		}),
	);
	sky.frustumCulled = false;
	sky.renderOrder = -1;
	scene.add(sky);

	const deep = new THREE.Color(DUSK.deep);
	const hulls = [
		...HULLS,
		...Array.from({ length: 12 - HULLS.length }, () => new THREE.Vector3(0, 0, 0)),
	];
	const water = new THREE.Mesh(
		new THREE.PlaneGeometry(16000, 16000).rotateX(-Math.PI / 2),
		new THREE.ShaderMaterial({
			uniforms: {
				...shared,
				u_line: { value: line },
				u_deep: { value: deep },
				u_hulls: { value: hulls },
			},
			vertexShader: waterVert,
			fragmentShader: `${noise}\n${skyChunk}\n${waterFrag}`,
		}),
	);
	scene.add(water);

	const fill = new THREE.HemisphereLight();
	const sun = new THREE.DirectionalLight();
	sun.position.copy(SUN).multiplyScalar(160);
	sun.castShadow = true;
	sun.shadow.mapSize.setScalar(coarse ? 1024 : 2048);
	sun.shadow.bias = -0.0006;
	sun.shadow.normalBias = 0.06;
	Object.assign(sun.shadow.camera, {
		left: -70,
		right: 70,
		top: 70,
		bottom: -70,
		near: 20,
		far: 320,
	});
	scene.add(fill, sun, sun.target);

	const { root, modules, rotors, marks } = buildSeastead();
	scene.add(root);

	const eyes = STOPS.map(({ camera }) => new THREE.Vector3(...camera.position));
	const aims = STOPS.map(({ camera }) => new THREE.Vector3(...camera.target));
	const path = new THREE.CatmullRomCurve3(eyes, false, "centripetal");
	const last = STOPS.length - 1;
	/** Under reduced motion: the finished settlement from the opening viewpoint. */
	const STILL = last;

	let centres: number[] = [];
	let width = 1;
	let height = 1;
	const measure = () => {
		width = stage.clientWidth;
		height = stage.clientHeight;
		renderer.setSize(width, height, false);
		centres = sections.map((el) => {
			const r = el.getBoundingClientRect();
			return r.top + scrollY + r.height / 2;
		});
		camera.aspect = width / height;
		// Portrait: widen the lens so the settlement still fits across.
		const fit = Math.max(1, 1.15 / camera.aspect);
		camera.fov = THREE.MathUtils.radToDeg(
			2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * fit),
		);
	};

	/** Scroll position in stop units: 0 with the first section centred, 1 with the second, … */
	const scrolled = () => {
		const y = scrollY + innerHeight / 2;
		const next = centres.findIndex((c) => c > y);
		if (next === 0) return 0;
		if (next < 0) return last;
		const from = centres[next - 1] ?? 0;
		return next - 1 + (y - from) / ((centres[next] ?? from + 1) - from);
	};

	/** Linger at each stop, travel between. */
	const dwell = (t: number) => Math.floor(t) + smoothstep(0.12, 0.88, t % 1);

	const eye = new THREE.Vector3();
	const aim = new THREE.Vector3();
	const point = new THREE.Vector3();
	const colour = new THREE.Color();
	const other = new THREE.Color();
	const white = new THREE.Color(0xffffff);
	let warm = 0;
	const tint = (key: keyof typeof DUSK) =>
		colour.setHex(DAWN[key]).lerp(other.setHex(DUSK[key]), warm);
	let t = still ? STILL : scrolled();

	const pose = (at: number) => {
		const u = dwell(clamp(at, 0, last));
		const i = Math.min(Math.floor(u), last - 1);
		const f = u - i;
		path.getPoint(u / last, eye);
		eye.y = Math.max(eye.y, 4);
		aim.lerpVectors(aims[i] ?? aim, aims[i + 1] ?? aim, f);
		const lift = lerp(STOPS[i]?.lift ?? 0, STOPS[i + 1]?.lift ?? 0, f);
		camera.position.copy(eye);
		camera.up.copy(UP);
		camera.lookAt(aim);
		if (wide.matches) camera.setViewOffset(width, height, -ASIDE * width, 0, width, height);
		else camera.setViewOffset(width, height, 0, lift * height, width, height);
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld();
	};

	const annotate = (at: number) => {
		if (!wide.matches) return;
		for (const [i, { stop, anchor, offset }] of CALLOUTS.entries()) {
			const label = labels[i];
			const leader = leaders[i];
			const dot = dots[i];
			if (!label || !leader || !dot) continue;
			point.copy(marks[anchor]).project(camera);
			const shown = point.z < 1 ? 1 - smoothstep(0.22, 0.42, Math.abs(at - stop)) : 0;
			const x = (point.x * 0.5 + 0.5) * width;
			const y = (-point.y * 0.5 + 0.5) * height;
			const [dx, dy] = offset;
			label.style.opacity = String(shown);
			label.style.translate = `${x + dx}px ${y + dy}px`;
			leader.style.opacity = dot.style.opacity = String(shown);
			leader.setAttribute("x1", String(x));
			leader.setAttribute("y1", String(y));
			leader.setAttribute("x2", String(x + dx));
			leader.setAttribute("y2", String(y + dy));
			dot.setAttribute("cx", String(x));
			dot.setAttribute("cy", String(y));
		}
	};

	const frame = (time: number, dt: number) => {
		const target = still ? STILL : scrolled();
		t = still ? target : damp(t, target, 5, dt);
		const built = still ? last : t;
		const day = smoothstep(DAYBREAK[0], DAYBREAK[1], built);
		/** The plan view reads as a drawing again. */
		const plan = 1 - smoothstep(0.25, 0.6, Math.abs(t - 4));

		shared.u_time.value = still ? 12 : time;
		warm = smoothstep(WARMING[0], WARMING[1], built);
		shared.u_day.value = day;
		shared.u_zenith.value.copy(tint("zenith"));
		shared.u_horizon.value.copy(tint("horizon"));
		shared.u_glow.value.copy(tint("glow"));
		deep.copy(tint("deep"));
		fill.color.copy(tint("skyFill"));
		fill.groundColor.copy(tint("seaFill"));
		fill.intensity = lerp(2.1, 1.6, warm);
		sun.color.copy(tint("sun"));
		sun.intensity = lerp(1.5, 2.7, warm);

		for (const [key, m] of Object.entries(modules) as [ModuleKey, (typeof modules)[ModuleKey]][]) {
			const [from, to] = BUILD[key];
			const p = clamp((built - from) / (to - from));
			const level = p >= 1 ? 1e4 : lerp(-2.6, m.top + 0.6, p * p * (3 - 2 * p));
			m.cut.constant = level;
			m.above.constant = -level;
			m.draft.color.copy(line).lerp(white, 0.35 + 0.5 * day);
			m.draft.opacity = 0.9;
			m.ghost.color.copy(paper).lerp(line, 0.035);
			m.ghost.opacity = lerp(1, 0.4, day);
			m.trace.color.copy(ink).lerp(line, plan * 0.6);
			m.trace.opacity = 0.22 + plan * 0.25;
			m.glow.color.copy(tint("window"));
		}

		for (const [i, rotor] of rotors.entries())
			rotor.rotation.z = (still ? 0.4 : time * (0.9 + i * 0.13)) + i;
		root.position.y = still ? 0 : Math.sin(time * 0.55) * 0.07;
		root.rotation.x = still ? 0 : Math.sin(time * 0.4) * 0.0025;
		root.rotation.z = still ? 0 : Math.cos(time * 0.33) * 0.0025;

		pose(still ? 0 : t);
		annotate(t);
		stage.style.setProperty("--day", day.toFixed(3));
		stage.style.setProperty("--plan", plan.toFixed(3));
		renderer.render(scene, camera);
	};

	const tour = sections[0]?.parentElement ?? stage;
	const loop = onFrame(tour, frame);
	const resize = new ResizeObserver(() => {
		measure();
		loop.redraw();
	});
	resize.observe(stage);
	resize.observe(tour);
	measure();
	addEventListener("scroll", loop.redraw, { passive: true });
	wide.addEventListener("change", loop.redraw);
	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			resize.disconnect();
			renderer.dispose();
		},
		{ once: true },
	);
};
