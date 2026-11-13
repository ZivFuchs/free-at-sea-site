import {
	ACESFilmicToneMapping,
	DirectionalLight,
	HemisphereLight,
	LoadingManager,
	Mesh,
	MeshStandardMaterial,
	PCFShadowMap,
	PerspectiveCamera,
	Plane,
	PMREMGenerator,
	Scene,
	Vector3,
	WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clamp, damp, lerp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import barrelBin from "./assets/barrel/Barrel_01.bin?url";
import barrelGltf from "./assets/barrel/Barrel_01_1k.gltf?url";
import barrelArm from "./assets/barrel/textures/Barrel_01_explosive_arm_1k.jpg?url";
import barrelDiff from "./assets/barrel/textures/Barrel_01_explosive_diff_1k.jpg?url";
import barrelNor from "./assets/barrel/textures/Barrel_01_explosive_nor_gl_1k.jpg?url";
import { type Barge, buildBarge } from "./model";
import { CUT_OPEN, createOcean, SUN, swell } from "./ocean";
import { STOPS, type Stop } from "./tour";

const FOV = 32;
/** Resting place of the section plane: through the middle of the near-side containers. */
const CUT_AT = 4.4;
const NARROW = 0.8;
const BARREL_FILES: Record<string, string> = {
	"Barrel_01.bin": barrelBin,
	"Barrel_01_explosive_arm_1k.jpg": barrelArm,
	"Barrel_01_explosive_diff_1k.jpg": barrelDiff,
	"Barrel_01_explosive_nor_gl_1k.jpg": barrelNor,
};

/** Fuel drums: the one downloaded model (Poly Haven, CC0), cloned along the rail. */
const loadDrums = async ({ drums }: Barge, cut: Plane) => {
	const manager = new LoadingManager();
	manager.setURLModifier((url) => BARREL_FILES[url.split("/").pop() ?? ""] ?? url);
	const { scene } = await new GLTFLoader(manager).loadAsync(barrelGltf);
	const source = scene.getObjectByProperty("isMesh", true);
	if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) return;
	source.material.clippingPlanes = [cut];
	drums.spots.forEach(([x, z], i) => {
		const drum = source.clone();
		drum.position.set(x, drums.y, z);
		drum.rotation.y = i * 1.7;
		drum.castShadow = true;
		drum.receiveShadow = true;
		drums.parent.add(drum);
	});
};

export const start = (root: HTMLElement) => {
	const canvas = root.querySelector<HTMLCanvasElement>("[data-barge-canvas]");
	if (!canvas) return;
	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
	} catch {
		return;
	}
	const still = reducedMotion();
	renderer.localClippingEnabled = true;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFShadowMap;
	renderer.toneMapping = ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.92;

	const scene = new Scene();
	const camera = new PerspectiveCamera(FOV, 1, 0.5, 6000);
	const cut = new Plane(new Vector3(0, 0, -1), CUT_OPEN);
	const barge = buildBarge(cut);
	const ocean = createOcean();
	scene.add(ocean.dome, ocean.water, ocean.walls, barge.root);

	const pmrem = new PMREMGenerator(renderer);
	const skyOnly = new Scene();
	skyOnly.add(ocean.dome.clone());
	scene.environment = pmrem.fromScene(skyOnly).texture;
	scene.environmentIntensity = 0.85;
	pmrem.dispose();

	const sun = new DirectionalLight(0xffe3c2, 3.4);
	sun.position.copy(SUN).multiplyScalar(140);
	sun.castShadow = true;
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.06;
	Object.assign(sun.shadow.camera, {
		left: -40,
		right: 40,
		top: 26,
		bottom: -26,
		near: 40,
		far: 260,
	});
	scene.add(sun, sun.target, new HemisphereLight(0xbfd6ea, 0x1a3442, 0.35));

	loadDrums(barge, cut)
		.then(() => loop.redraw())
		.catch(() => {});

	const bases = barge.lifts.map(({ part }) => part.position.y);
	const stops = [...root.querySelectorAll<HTMLElement>("[data-stop]")];
	const callouts = [...root.querySelectorAll<HTMLElement>("[data-callout]")].map((el) => ({
		el,
		leader: root.querySelector<SVGLineElement>(`[data-leader="${el.dataset.callout}"]`),
		dot: root.querySelector<SVGCircleElement>(`[data-dot="${el.dataset.callout}"]`),
		anchor: barge.anchors[el.dataset.callout as keyof Barge["anchors"]],
		when: el.dataset.when,
		dx: Number(el.dataset.dx),
		dy: Number(el.dataset.dy),
	}));

	/** Continuous stop index from scroll: each section holds its shot, the gaps between carry the move. */
	const progress = () => {
		const centre = innerHeight / 2;
		const mids = stops.map((el) => {
			const r = el.getBoundingClientRect();
			return r.top + r.height / 2;
		});
		const next = mids.findIndex((mid) => mid > centre);
		if (next === 0) return 0;
		if (next < 0) return stops.length - 1;
		const [a, b] = [mids[next - 1] ?? 0, mids[next] ?? 1];
		return next - 1 + smoothstep(0.22, 0.78, (centre - a) / (b - a));
	};

	const view = (stop: Stop, aspect: number) => {
		const { position, target, span } = aspect < NARROW && stop.narrow ? stop.narrow : stop;
		const at = new Vector3(...target);
		const offset = new Vector3(...position).sub(at);
		const half = Math.atan(Math.tan((FOV * Math.PI) / 360) * aspect);
		offset.setLength(Math.max(offset.length(), span / 2 / Math.tan(half)));
		return { at, offset };
	};
	/** A hill of height 1 over [from, to], with ramps of `ramp` either side. */
	const plateau = (t: number, from: number, to: number, ramp: number) =>
		smoothstep(from - ramp, from, t) * (1 - smoothstep(to, to + ramp, t));

	let t = progress();
	let yaw = 0;
	let yawGoal = 0;
	let dragAt: number | null = null;
	let dragT = t;
	let width = 0;
	let height = 0;
	let ratio = Math.min(devicePixelRatio, 1.75);
	let slow = 0;
	const at = new Vector3();
	const point = new Vector3();

	const resize = () => {
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		if (!width || !height) return;
		renderer.setPixelRatio(ratio);
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		sun.shadow.mapSize.setScalar(width < 700 ? 1024 : 2048);
	};

	const tick = (clock: number, dt: number) => {
		if (!width) return;
		const time = still ? 12 : clock;
		const goal = progress();
		t = still ? goal : damp(t, goal, 5, dt);
		if (Math.abs(goal - dragT) > 0.45) yawGoal = 0;
		yaw = still ? yawGoal : damp(yaw, yawGoal, 6, dt);

		// The vessel on the swell: heavy, so it follows the long waves and shrugs off the short ones.
		const h = (x: number, z: number) => swell(x, z, time);
		const [bow, stern, near, far] = [h(22, 0), h(-22, 0), h(0, 6), h(0, -6)];
		const heave = (h(0, 0) + bow + stern + near + far) * 0.11;
		barge.root.position.y = heave;
		barge.root.rotation.z = Math.atan((bow - stern) / 44) * 0.55;
		barge.root.rotation.x = -Math.atan((near - far) / 12) * 0.4;

		const section = plateau(t, 1.72, 2.3, 0.3);
		const spread = plateau(t, 2.92, 3.25, 0.32);
		const cutZ = lerp(CUT_OPEN, CUT_AT, section);
		cut.constant = cutZ;
		const ease = spread * spread * (3 - 2 * spread);
		barge.lifts.forEach(({ part, lift }, i) => {
			part.position.y = (bases[i] ?? 0) + lift * ease;
		});
		ocean.update(time, { x: 0, z: 0, heave }, cutZ);

		const i = Math.min(Math.floor(t), STOPS.length - 2);
		const [a, b] = [STOPS[i], STOPS[i + 1]];
		if (!a || !b) return;
		const [from, to] = [view(a, camera.aspect), view(b, camera.aspect)];
		const f = t - i;
		at.lerpVectors(from.at, to.at, f);
		// Swing between shots on an arc: blend distance and direction separately.
		const length = lerp(from.offset.length(), to.offset.length(), f);
		point.lerpVectors(from.offset.normalize(), to.offset.normalize(), f).setLength(length);
		point.applyAxisAngle(camera.up, yaw);
		camera.position.copy(at).add(point);
		camera.position.y = Math.max(camera.position.y, 1.4 + h(camera.position.x, camera.position.z));
		camera.lookAt(at);
		sun.target.position.copy(barge.root.position);

		renderer.render(scene, camera);
		canvas.toggleAttribute("data-live", true);
		root.style.setProperty("--section", section.toFixed(3));

		const small = width < 700 ? 0.5 : 1;
		for (const { el, leader, dot, anchor, when, dx, dy } of callouts) {
			const weight = when === "below" ? smoothstep(0.7, 1, section) : smoothstep(0.7, 1, spread);
			el.style.opacity = String(weight);
			leader?.setAttribute("opacity", String(weight * 0.7));
			dot?.setAttribute("opacity", String(weight));
			if (!weight || !anchor) continue;
			anchor.getWorldPosition(point).project(camera);
			const x = (point.x * 0.5 + 0.5) * width;
			const y = (-point.y * 0.5 + 0.5) * height;
			const lx = clamp(x + dx * small, 70, width - 70);
			const ly = clamp(y + dy * small, 90, height - 60);
			el.style.translate = `${lx}px ${ly}px`;
			for (const [name, value] of [
				["x1", x],
				["y1", y],
				["x2", lx],
				["y2", ly],
			] as const)
				leader?.setAttribute(name, value.toFixed(1));
			dot?.setAttribute("cx", x.toFixed(1));
			dot?.setAttribute("cy", y.toFixed(1));
		}

		// Shed resolution if frames run long.
		slow = dt > 0.03 ? slow + 1 : Math.max(0, slow - 1);
		if (slow > 45 && ratio > 1) {
			ratio = Math.max(1, ratio - 0.25);
			slow = 0;
			resize();
		}
	};

	const loop = onFrame(canvas, tick);
	const observer = new ResizeObserver(() => {
		resize();
		loop.redraw();
	});
	observer.observe(canvas);
	addEventListener("scroll", loop.redraw, { passive: true });

	// Drag sideways to walk round the vessel; vertical drags stay with the page.
	root.addEventListener("pointerdown", (event) => {
		if (event.target instanceof Element && event.target.closest("a, button, input")) return;
		dragAt = event.clientX;
	});
	addEventListener("pointermove", (event) => {
		if (dragAt === null) return;
		yawGoal -= (event.clientX - dragAt) * 0.006;
		dragAt = event.clientX;
		dragT = t;
		root.toggleAttribute("data-turning", true);
		loop.redraw();
	});
	const release = () => {
		dragAt = null;
		root.removeAttribute("data-turning");
	};
	addEventListener("pointerup", release);
	addEventListener("pointercancel", release);
	addEventListener("keydown", ({ key, target }) => {
		if (key !== "ArrowLeft" && key !== "ArrowRight") return;
		if (target instanceof HTMLInputElement || root.getBoundingClientRect().bottom < innerHeight / 2)
			return;
		yawGoal += key === "ArrowLeft" ? 0.35 : -0.35;
		dragT = t;
		loop.redraw();
	});

	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			observer.disconnect();
			for (const m of barge.materials) m.dispose();
			renderer.dispose();
		},
		{ once: true },
	);
	canvas.addEventListener("webglcontextlost", () => canvas.removeAttribute("data-live"));
};
