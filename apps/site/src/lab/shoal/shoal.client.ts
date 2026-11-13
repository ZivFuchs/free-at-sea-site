import {
	DoubleSide,
	InstancedBufferAttribute,
	InstancedBufferGeometry,
	Mesh,
	PerspectiveCamera,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	Vector3,
	WebGLRenderer,
} from "three";
import { damp, onFrame, pageProgress, reducedMotion } from "@/lab/lib/motion";
import fragmentShader from "./fish.frag?raw";
import vertexShader from "./fish.vert?raw";
import { type Anchor, createShoal, type Formation, type Predator, type View } from "./sim";
import { sampleTitle } from "./title";

const FOV = 35;
const DISTANCE = 10;
const MAX_DPR = 1.75;
const INTRO = 2.2;
const PHONE = 768;
const FOG: [number, number, number] = [0.05, 0.14, 0.24];

const start = (root: HTMLElement, canvas: HTMLCanvasElement) => {
	const heading = root.querySelector<HTMLElement>("[data-shoal-title]");
	const marks = [...root.querySelectorAll<HTMLElement>("[data-formation]")];
	if (!heading || !marks.length) return;

	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({
			canvas,
			alpha: true,
			antialias: false,
			powerPreference: "high-performance",
		});
	} catch {
		return;
	}
	renderer.setClearColor(0x000000, 0);

	const phone = innerWidth < PHONE;
	const still = reducedMotion();
	const shoal = createShoal(phone ? 2400 : 6500, phone ? 0.064 : 0.095);

	const geometry = new InstancedBufferGeometry();
	const quad = new PlaneGeometry(1, 0.5);
	geometry.index = quad.index;
	geometry.setAttribute("position", quad.getAttribute("position"));
	geometry.setAttribute("uv", quad.getAttribute("uv"));
	const attributes = {
		iPos: new InstancedBufferAttribute(shoal.pos, 3),
		iDir: new InstancedBufferAttribute(shoal.dir, 3),
		iMisc: new InstancedBufferAttribute(shoal.misc, 4),
	};
	for (const [name, attribute] of Object.entries(attributes))
		geometry.setAttribute(name, attribute);
	geometry.instanceCount = shoal.total;

	const material = new ShaderMaterial({
		vertexShader,
		fragmentShader,
		uniforms: {
			uFog: { value: new Vector3(...FOG) },
			uFogNear: { value: DISTANCE + 0.8 },
			uFogFar: { value: DISTANCE + 15 },
		},
		transparent: true,
		side: DoubleSide,
		premultipliedAlpha: true,
		depthTest: false,
		depthWrite: false,
	});
	const mesh = new Mesh(geometry, material);
	mesh.frustumCulled = false;
	const scene = new Scene();
	scene.add(mesh);
	const camera = new PerspectiveCamera(FOV, 1, 0.5, 60);
	camera.position.z = DISTANCE;

	const view: View = { w: 1, h: 1, perPx: 1 };
	const resize = () => {
		const { clientWidth: w, clientHeight: h } = canvas;
		renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_DPR));
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		view.h = 2 * DISTANCE * Math.tan((FOV * Math.PI) / 360);
		view.perPx = view.h / h;
		view.w = w * view.perPx;
	};

	const anchor: Anchor = { kind: "ball", x: 0, y: 0, w: 1, h: 1 };
	const locate = (intro: boolean) => {
		const mid = innerHeight / 2;
		let best = marks[0];
		let nearest = Number.POSITIVE_INFINITY;
		for (const mark of marks) {
			const r = mark.getBoundingClientRect();
			const d = Math.abs(r.top + r.height / 2 - mid);
			if (d < nearest) {
				nearest = d;
				best = mark;
			}
		}
		if (!best) return;
		const r = best.getBoundingClientRect();
		const kind = best.dataset.formation as Formation;
		anchor.kind = kind === "title" && intro ? "ball" : kind;
		anchor.x = (r.left + r.width / 2 - innerWidth / 2) * view.perPx;
		anchor.y = (mid - r.top - r.height / 2) * view.perPx;
		anchor.w = r.width * view.perPx;
		anchor.h = r.height * view.perPx;
	};

	const hunter: Predator = { x: 0, y: 0, power: 0 };
	let hunting = 0;
	const chase = (event: PointerEvent) => {
		hunter.x = (event.clientX - innerWidth / 2) * view.perPx;
		hunter.y = (innerHeight / 2 - event.clientY) * view.perPx;
		hunting = 1;
	};
	const rest = (event: PointerEvent) => {
		if (event.type !== "pointerup" || event.pointerType !== "mouse") hunting = 0;
	};
	addEventListener("pointermove", chase, { passive: true });
	addEventListener("pointerdown", chase, { passive: true });
	addEventListener("pointerup", rest, { passive: true });
	addEventListener("pointercancel", rest, { passive: true });
	document.documentElement.addEventListener("pointerleave", rest);

	let titled = false;
	const trace = () => {
		const points = sampleTitle(heading, shoal.total);
		if (points) shoal.setPoints(points);
		titled ||= !!points;
	};

	let born = -1;
	let placed = false;
	const loop = onFrame(canvas, (time, dt) => {
		if (born < 0) born = time;
		const t = time - born;
		locate(!still && (!titled || t < INTRO));
		if (still || !placed) shoal.snap(still ? 40 : t, anchor, view);
		else {
			hunter.power = damp(hunter.power, hunting, hunting ? 14 : 3, dt);
			shoal.step(t, dt, anchor, view, hunter);
		}
		placed = true;
		for (const attribute of Object.values(attributes)) attribute.needsUpdate = true;
		root.style.setProperty("--depth", pageProgress().toFixed(3));
		renderer.render(scene, camera);
	});

	let pending = 0;
	const relayout = () => {
		resize();
		clearTimeout(pending);
		pending = window.setTimeout(() => {
			trace();
			loop.redraw();
		}, 150);
		loop.redraw();
	};
	resize();
	trace();
	const observer = new ResizeObserver(relayout);
	observer.observe(canvas);
	observer.observe(heading);
	// The fallback face is metric-matched, so the swap resizes nothing: wait for the real letterforms.
	const face = getComputedStyle(heading);
	document.fonts
		.load(`${face.fontWeight} 1em ${face.fontFamily}`, heading.textContent ?? "")
		.then(relayout);
	document.fonts.addEventListener("loadingdone", relayout);
	if (still) addEventListener("scroll", loop.redraw, { passive: true });
	heading.setAttribute("data-live", "");

	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			geometry.dispose();
			material.dispose();
			renderer.dispose();
		},
		{ once: true },
	);
};

const root = document.querySelector<HTMLElement>("[data-shoal]");
const canvas = root?.querySelector("canvas");
if (root && canvas) start(root, canvas);
