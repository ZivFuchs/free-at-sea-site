import * as THREE from "three";
import { clamp, damp, lerp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import fragmentShader from "./points.frag?raw";
import vertexShader from "./points.vert?raw";
import { type Cloud, reconstruct, SENSOR } from "./reconstruct";

type Mode = "photo" | "range" | "height";

interface Stage {
	pos: THREE.Vector3;
	target: THREE.Vector3;
	fov: number;
	mode: Mode;
	slice?: boolean;
	dissolve?: boolean;
	frustum?: boolean;
	box?: boolean;
}

const REVEAL_SECONDS = 3.4;
const MAX_DPR = 1.75;
const PHOTO_ASPECT = 16 / 9;
const deg = THREE.MathUtils.degToRad;

const pageColour = () => {
	const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	if (!ctx) return new THREE.Color(0.02, 0.09, 0.17);
	ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
	ctx.fillRect(0, 0, 1, 1);
	const [r = 5, g = 23, b = 43] = ctx.getImageData(0, 0, 1, 1).data;
	return new THREE.Color(r / 255, g / 255, b / 255);
};

const segments = (points: THREE.Vector3[], pairs: readonly (readonly [number, number])[]) => {
	const geometry = new THREE.BufferGeometry().setFromPoints(
		pairs.flatMap(([a, b]) => {
			const from = points[a];
			const to = points[b];
			return from && to ? [from, to] : [];
		}),
	);
	const material = new THREE.LineBasicMaterial({ color: 0x9be4f2, transparent: true, opacity: 0 });
	return new THREE.LineSegments(geometry, material);
};

const stages = (cloud: Cloud, aspect: number): Stage[] => {
	const sensor = new THREE.Vector3(...cloud.sensor);
	const along = new THREE.Vector3(cloud.axis[0], 0, cloud.axis[1]);
	const near = new THREE.Vector3(-cloud.beamAxis[0], 0, -cloud.beamAxis[1]);
	if (near.dot(sensor) < 0) near.negate();
	const pitch = Math.atan((1 - 2 * SENSOR.horizon) * Math.tan(SENSOR.vfov / 2));
	const forward = new THREE.Vector3(0, -Math.sin(pitch), -Math.cos(pitch));
	const at = (x: number, y: number, z: number) => sensor.clone().add(new THREE.Vector3(x, y, z));
	/** Narrow screens stand further back so the vessel's length still fits. */
	const back = Math.max(1, 1.35 / aspect);
	const cover = THREE.MathUtils.radToDeg(
		2 * Math.atan(Math.tan(SENSOR.vfov / 2) * Math.min(1, PHOTO_ASPECT / aspect)),
	);
	const origin = new THREE.Vector3(0, 3, 0);

	return [
		{ pos: sensor, target: sensor.clone().add(forward), fov: cover, mode: "photo" },
		{ pos: at(-1150, 900, 800), target: at(-150, 0, -1150), fov: 44, mode: "photo", frustum: true },
		{
			pos: near
				.clone()
				.multiplyScalar(105 * back)
				.addScaledVector(along, -48 * back)
				.setY(34 * back),
			target: origin,
			fov: 30,
			mode: "photo",
		},
		{
			pos: near
				.clone()
				.multiplyScalar(310 * back)
				.setY(85 * back),
			target: new THREE.Vector3(0, 4, 0),
			fov: 13,
			mode: "height",
			slice: true,
		},
		{
			pos: near
				.clone()
				.multiplyScalar(150 * back)
				.addScaledVector(along, 80 * back)
				.setY(120 * back),
			target: origin,
			fov: 22,
			mode: "photo",
			box: true,
		},
		{ pos: at(650, 2300, 700), target: at(-450, 0, -900), fov: 48, mode: "range", frustum: true },
		{ pos: at(0, 60, 160), target: at(0, -330, -1150), fov: 46, mode: "photo", dissolve: true },
	];
};

export const start = async (root: HTMLElement, src: string) => {
	const canvas = root.querySelector("canvas");
	const track = root.querySelector<HTMLElement>("[data-track]");
	if (!canvas || !track) return false;

	const image = new Image();
	image.decoding = "async";
	image.src = src;
	await image.decode();

	const phone = matchMedia("(max-width: 47.99rem)").matches;
	const cloud = reconstruct(image, phone ? 0 : 1);
	if (!cloud) return false;

	let renderer: THREE.WebGLRenderer;
	try {
		renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: false,
			alpha: true,
			powerPreference: "high-performance",
		});
	} catch {
		return false;
	}
	renderer.setClearAlpha(0);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(46, 1, 2, 14000);
	const still = reducedMotion();

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(cloud.position, 3));
	geometry.setAttribute("color", new THREE.BufferAttribute(cloud.color, 3, true));
	geometry.setAttribute("aSize", new THREE.BufferAttribute(cloud.size, 1));
	geometry.setAttribute("aRange", new THREE.BufferAttribute(cloud.range, 1));
	geometry.setAttribute("aSeed", new THREE.BufferAttribute(cloud.seed, 1));
	geometry.setAttribute("aKind", new THREE.BufferAttribute(cloud.kind, 1));
	const uniforms = {
		uScale: { value: 1 },
		uFill: { value: 1 },
		uTime: { value: 0 },
		uReveal: { value: still ? 1 : 0 },
		uMaxRange: { value: SENSOR.maxRange },
		uRangeMix: { value: 0 },
		uHeightMix: { value: 0 },
		uSlice: { value: 0 },
		uSlicePos: { value: 0 },
		uAxis: { value: new THREE.Vector2(...cloud.axis) },
		uDissolve: { value: 0 },
		uGround: { value: pageColour() },
	};
	const points = new THREE.Points(
		geometry,
		new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms }),
	);
	points.frustumCulled = false;
	scene.add(points);

	const sensor = new THREE.Vector3(...cloud.sensor);
	const frustum = segments(
		[sensor, ...cloud.corners.map((c) => new THREE.Vector3(...c))],
		[
			[0, 1],
			[0, 2],
			[0, 3],
			[0, 4],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 1],
		],
	);
	const along = new THREE.Vector3(cloud.axis[0], 0, cloud.axis[1]).multiplyScalar(cloud.length / 2);
	const across = new THREE.Vector3(cloud.beamAxis[0], 0, cloud.beamAxis[1]).multiplyScalar(
		cloud.beam / 2,
	);
	const corner = (i: number) =>
		new THREE.Vector3()
			.addScaledVector(along, i & 1 ? 1 : -1)
			.addScaledVector(across, i & 2 ? 1 : -1)
			.setY(i & 4 ? cloud.height : 0);
	const boxCorners = Array.from({ length: 8 }, (_, i) => corner(i));
	const box = segments(boxCorners, [
		[0, 1],
		[1, 3],
		[3, 2],
		[2, 0],
		[4, 5],
		[5, 7],
		[7, 6],
		[6, 4],
		[0, 4],
		[1, 5],
		[2, 6],
		[3, 7],
	]);
	scene.add(frustum, box);

	const mid = (a: number, b: number) =>
		boxCorners[a]?.clone().lerp(boxCorners[b] ?? new THREE.Vector3(), 0.5);
	const anchors: Record<string, { at: THREE.Vector3 | undefined; group: "frustum" | "box" }> = {
		sensor: { at: sensor, group: "frustum" },
		length: { at: mid(0, 1), group: "box" },
		beam: { at: mid(1, 3), group: "box" },
		height: { at: mid(3, 7), group: "box" },
	};
	const labels = [...root.querySelectorAll<HTMLElement>("[data-label]")];
	const fill = (name: string, text: string) => {
		for (const el of root.querySelectorAll(`[data-value="${name}"]`)) el.textContent = text;
	};
	fill("points", cloud.count.toLocaleString("en-GB"));
	fill("length", `${cloud.length.toFixed(0)} m`);
	fill("beam", `${cloud.beam.toFixed(0)} m`);
	fill("height", `${cloud.height.toFixed(0)} m`);

	const sections = [...track.querySelectorAll<HTMLElement>("[data-stage]")];
	let keys: Stage[] = [];
	let centres: number[] = [];
	let width = 1;
	let height = 1;
	const measure = () => {
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : MAX_DPR));
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		keys = stages(cloud, camera.aspect);
		centres = sections.map((el) => el.offsetTop + track.offsetTop + el.offsetHeight / 2);
	};

	/** Continuous stage index from scroll: n.0 when section n is centred in the viewport. */
	const progress = () => {
		const y = scrollY + innerHeight / 2;
		const last = centres.length - 1;
		for (let i = 0; i < last; i++) {
			const from = centres[i] ?? 0;
			const to = centres[i + 1] ?? from + 1;
			if (y < to) return i + clamp((y - from) / (to - from));
		}
		return last + clamp((y - (centres[last] ?? 0)) / innerHeight);
	};

	let manual: Mode | null = null;
	const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-mode]")];
	for (const button of buttons) {
		button.addEventListener("click", () => {
			const mode = button.dataset.mode as Mode;
			manual = manual === mode ? null : mode;
			for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.mode === manual));
			loop.redraw();
		});
	}

	const orbit = { yaw: 0, pitch: 0, vy: 0, vp: 0, active: false, x: 0, y: 0 };
	const onDown = (e: PointerEvent) => {
		if ((e.target as Element).closest("a, button, input, label")) return;
		orbit.active = true;
		orbit.x = e.clientX;
		orbit.y = e.clientY;
		root.toggleAttribute("data-dragging", true);
	};
	const onMove = (e: PointerEvent) => {
		if (!orbit.active) return;
		const dx = (e.clientX - orbit.x) / width;
		const dy = (e.clientY - orbit.y) / height;
		orbit.x = e.clientX;
		orbit.y = e.clientY;
		orbit.vy = -dx * 3;
		orbit.vp = e.pointerType === "touch" ? 0 : dy * 1.6;
		orbit.yaw += orbit.vy;
		orbit.pitch = clamp(orbit.pitch + orbit.vp, -0.5, 0.9);
		loop.redraw();
	};
	const onUp = () => {
		orbit.active = false;
		root.removeAttribute("data-dragging");
	};
	track.addEventListener("pointerdown", onDown);
	addEventListener("pointermove", onMove, { passive: true });
	addEventListener("pointerup", onUp);
	addEventListener("pointercancel", onUp);

	let current = -1;
	let born = -1;
	const mix = { range: 0, height: 0, slice: 0, dissolve: 0, frustum: 0, box: 0 };
	/** How far past the photograph's own viewpoint we are: 0 there, 1 from the first survey stop on. */
	const away = () => smoothstep(0.1, 0.8, current);
	const offset = new THREE.Vector3();
	const target = new THREE.Vector3();
	const projected = new THREE.Vector3();
	const UP = new THREE.Vector3(0, 1, 0);
	const side = new THREE.Vector3();

	const loop = onFrame(canvas, (time, dt) => {
		if (born < 0) born = time;
		const goal = progress();
		current = still || current < 0 ? goal : damp(current, goal, 5, dt);
		const last = keys.length - 1;
		const i = clamp(Math.floor(current), 0, last);
		const from = keys[i];
		const to = keys[Math.min(i + 1, last)];
		if (!from || !to) return;
		const f = smoothstep(0.18, 0.82, current - i);
		const lead = f < 0.5 ? from : to;

		const fade = 1 - smoothstep(last + 0.25, last + 0.9, current);
		root.style.setProperty("--scan-fade", fade.toFixed(3));
		root.dataset.at = String(Math.min(Math.round(current), last));
		if (fade <= 0) return;

		if (!orbit.active) {
			orbit.yaw += orbit.vy;
			orbit.pitch = clamp(orbit.pitch + orbit.vp, -0.5, 0.9);
			const friction = Math.exp(-4 * dt);
			orbit.vy *= friction;
			orbit.vp *= friction;
			orbit.yaw = damp(orbit.yaw, 0, 0.5, dt);
			orbit.pitch = damp(orbit.pitch, 0, 0.5, dt);
		}

		target.lerpVectors(from.target, to.target, f);
		offset.lerpVectors(from.pos, to.pos, f).sub(target);
		offset.applyAxisAngle(UP, orbit.yaw);
		side.crossVectors(offset, UP).normalize();
		if (side.lengthSq() > 0) offset.applyAxisAngle(side, orbit.pitch);
		camera.position.copy(target).add(offset);
		if (camera.position.y < 4) camera.position.y = 4;
		camera.fov = lerp(from.fov, to.fov, f);
		camera.lookAt(target);
		// Off the photograph's viewpoint, the subject steps aside for the copy: right on wide screens, up on phones.
		const aside = away();
		camera.setViewOffset(
			width,
			height,
			phone ? 0 : -0.16 * aside * width,
			phone ? 0.14 * aside * height : 0,
			width,
			height,
		);

		const mode = manual ?? lead.mode;
		const rate = still ? 1000 : 4;
		mix.range = damp(mix.range, mode === "range" ? 1 : 0, rate, dt);
		mix.height = damp(mix.height, mode === "height" ? 1 : 0, rate, dt);
		mix.slice = damp(mix.slice, lead.slice ? 1 : 0, rate, dt);
		mix.frustum = damp(mix.frustum, lead.frustum ? 1 : 0, rate, dt);
		mix.box = damp(mix.box, lead.box ? 1 : 0, rate, dt);
		mix.dissolve = to.dissolve ? f : from.dissolve ? 1 : 0;

		uniforms.uTime.value = still ? 0 : time;
		uniforms.uReveal.value = still ? 1 : clamp((time - born) / REVEAL_SECONDS);
		uniforms.uRangeMix.value = mix.range;
		uniforms.uHeightMix.value = mix.height;
		uniforms.uSlice.value = mix.slice;
		uniforms.uSlicePos.value = still ? 0 : Math.sin(time * 0.45) * cloud.length * 0.46;
		uniforms.uDissolve.value = mix.dissolve;
		uniforms.uFill.value = lerp(1, 0.5, aside);
		uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(deg(camera.fov) / 2));
		(frustum.material as THREE.LineBasicMaterial).opacity = mix.frustum * 0.55 * (1 - mix.dissolve);
		(box.material as THREE.LineBasicMaterial).opacity = mix.box * 0.8;
		renderer.render(scene, camera);

		for (const el of labels) {
			const anchor = anchors[el.dataset.label ?? ""];
			if (!anchor?.at) continue;
			projected.copy(anchor.at).project(camera);
			const shown = projected.z < 1 ? mix[anchor.group] : 0;
			el.style.opacity = shown.toFixed(2);
			el.style.transform = `translate(${((projected.x + 1) / 2) * width}px, ${((1 - projected.y) / 2) * height}px)`;
		}
	});

	new ResizeObserver(() => {
		measure();
		loop.redraw();
	}).observe(canvas);
	measure();
	addEventListener("scroll", loop.redraw, { passive: true });
	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			geometry.dispose();
			renderer.dispose();
		},
		{ once: true },
	);
	canvas.addEventListener("webglcontextlost", () => root.toggleAttribute("data-fallback", true));
	return true;
};
