import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	Group,
	Line,
	LineSegments,
	Mesh,
	PerspectiveCamera,
	PlaneGeometry,
	Points,
	Quaternion,
	Scene,
	ShaderMaterial,
	Vector3,
	WebGLRenderer,
} from "three";
import { clamp, damp, lerp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import coastUrl from "./assets/coast.bin?url";
import fieldUrl from "./assets/field.png?url";
import { FIELD } from "./field";
import haloFrag from "./shaders/halo.frag?raw";
import haloVert from "./shaders/halo.vert?raw";
import lineFrag from "./shaders/line.frag?raw";
import lineVert from "./shaders/line.vert?raw";
import pointsFrag from "./shaders/points.frag?raw";
import pointsVert from "./shaders/points.vert?raw";
import { SITES, STOPS, type Stop, type View } from "./stops";

/** sRGB for the GL side; the DOM side takes the same roles from `palette.stylex.ts`. */
const GL = {
	coastal: new Color("#4f6f8f"),
	high: new Color("#9fdcf0"),
	coast: new Color("#c9d8e6"),
	halo: new Color("#5fa8d6"),
	signal: new Color("#f3c98b"),
};

const RAD = Math.PI / 180;
const FOV = 30;
const DISTANCE = 8;
const HALF_HEIGHT = Math.tan((FOV / 2) * RAD) * DISTANCE;
const MAX_DPR = 1.75;
const NARROW = 768;
const HALO_REACH = 1.7;
const ARC_POINTS = 96;
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

const onSphere = (lon: number, lat: number, radius = 1) =>
	new Vector3(
		Math.cos(lat * RAD) * Math.sin(lon * RAD),
		Math.sin(lat * RAD),
		Math.cos(lat * RAD) * Math.cos(lon * RAD),
	).multiplyScalar(radius);

/** Rotation that turns (lon, lat) to face the viewer. */
const facing = (lon: number, lat: number, into = new Quaternion()) =>
	into
		.setFromAxisAngle(X_AXIS, lat * RAD)
		.multiply(new Quaternion().setFromAxisAngle(Y_AXIS, -lon * RAD));

const loadField = async () => {
	const image = new Image();
	image.src = fieldUrl;
	await image.decode();
	const canvas = document.createElement("canvas");
	canvas.width = FIELD.width;
	canvas.height = FIELD.height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("2D canvas unavailable");
	ctx.drawImage(image, 0, 0);
	const { data } = ctx.getImageData(0, 0, FIELD.width, FIELD.height);
	const cell = 360 / FIELD.width;
	/** Km to the nearest coast, or -1 on land. */
	return (lon: number, lat: number) => {
		const x = Math.floor(((((lon + 180) % 360) + 360) % 360) / cell) % FIELD.width;
		const y = clamp(Math.floor((90 - lat) / cell), 0, FIELD.height - 1);
		const value = data[(y * FIELD.width + x) * 4] ?? 0;
		return value === 0 ? -1 : (value - 1) * FIELD.kmPerStep;
	};
};

/** Dots in rows of latitude, evenly spaced along each: water only, tagged by distance from land. */
const oceanDots = (km: Awaited<ReturnType<typeof loadField>>, step: number) => {
	const positions: number[] = [];
	const high: number[] = [];
	const far: number[] = [];
	const rows = Math.round(180 / step);
	for (let r = 0; r < rows; r++) {
		const lat = -90 + (r + 0.5) * step;
		const count = Math.max(1, Math.round((360 * Math.cos(lat * RAD)) / step));
		for (let i = 0; i < count; i++) {
			const lon = -180 + ((i + (r % 2) / 2) / count) * 360;
			const d = km(lon, lat);
			if (d < 0) continue;
			positions.push(...onSphere(lon, lat).toArray());
			high.push(smoothstep(FIELD.limitKm - 45, FIELD.limitKm + 45, d));
			far.push(clamp(d / (FIELD.kmPerStep * 254)));
		}
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute("aHigh", new BufferAttribute(new Float32Array(high), 1));
	geometry.setAttribute("aFar", new BufferAttribute(new Float32Array(far), 1));
	return geometry;
};

const coastline = async () => {
	const data = new Int16Array(await (await fetch(coastUrl)).arrayBuffer());
	const positions: number[] = [];
	for (let at = 0; at < data.length; ) {
		const count = data[at++] ?? 0;
		for (let i = 0; i + 1 < count; i++) {
			const a = at + i * 2;
			positions.push(
				...onSphere((data[a] ?? 0) / 100, (data[a + 1] ?? 0) / 100, 1.001).toArray(),
				...onSphere((data[a + 2] ?? 0) / 100, (data[a + 3] ?? 0) / 100, 1.001).toArray(),
			);
		}
		at += count * 2;
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	return geometry;
};

/** Great-circle arc between two points, lifted off the surface in proportion to its length. */
const arc = (from: Vector3, to: Vector3) => {
	const angle = from.angleTo(to);
	const lift = 0.1 * (angle / Math.PI) + 0.012;
	const positions = new Float32Array(ARC_POINTS * 3);
	for (let i = 0; i < ARC_POINTS; i++) {
		const t = i / (ARC_POINTS - 1);
		const p = from
			.clone()
			.multiplyScalar(Math.sin((1 - t) * angle))
			.addScaledVector(to, Math.sin(t * angle))
			.normalize()
			.multiplyScalar(1 + lift * Math.sin(t * Math.PI));
		p.toArray(positions, i * 3);
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(positions, 3));
	return geometry;
};

/** `back`: how much of the line shows through from the far side of the globe. */
const lineMaterial = (color: Color, opacity: number, back: number) =>
	new ShaderMaterial({
		vertexShader: lineVert,
		fragmentShader: lineFrag,
		uniforms: {
			uColor: { value: color },
			uOpacity: { value: opacity },
			uDim: { value: 1 },
			uBack: { value: back },
		},
		transparent: true,
		depthTest: false,
		blending: AdditiveBlending,
	});

const format = (value: number, positive: string, negative: string) =>
	`${Math.abs(value).toFixed(1).padStart(5, "0")}°${value >= 0 ? positive : negative}`;

/**
 * Mounts the globe on `canvas`, driven by the `[data-stop]` sections inside `root`.
 * Rejects when WebGL or the baked assets are unavailable, leaving the CSS backdrop showing.
 */
export const mountGlobe = async (canvas: HTMLCanvasElement, root: HTMLElement) => {
	const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setClearColor(0x000000, 0);
	const still = reducedMotion();
	const narrow = () => innerWidth < NARROW;

	const [km, coastGeometry] = await Promise.all([loadField(), coastline()]);

	const scene = new Scene();
	const camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
	camera.position.z = DISTANCE;
	const holder = new Group();
	const spinner = new Group();
	holder.add(spinner);
	scene.add(holder);

	const halo = new Mesh(
		new PlaneGeometry(HALO_REACH * 2, HALO_REACH * 2),
		new ShaderMaterial({
			vertexShader: haloVert,
			fragmentShader: haloFrag,
			uniforms: { uColor: { value: GL.halo }, uDim: { value: 1 }, uReach: { value: HALO_REACH } },
			transparent: true,
			depthTest: false,
			blending: AdditiveBlending,
		}),
	);
	holder.add(halo);

	const step = narrow() ? 1.5 : 1.05;
	const dots = new Points(
		oceanDots(km, step),
		new ShaderMaterial({
			vertexShader: pointsVert,
			fragmentShader: pointsFrag,
			uniforms: {
				uCoastal: { value: GL.coastal },
				uHigh: { value: GL.high },
				uSize: { value: 2 },
				uTime: { value: 0 },
				uDim: { value: 1 },
			},
			transparent: true,
			depthTest: false,
			blending: AdditiveBlending,
		}),
	);
	const coast = new LineSegments(coastGeometry, lineMaterial(GL.coast, 0.3, 0.12));
	spinner.add(dots, coast);

	const sitePoints = SITES.map(({ lon, lat }) => onSphere(lon, lat));
	const arcs = sitePoints.slice(1).map((to, i) => {
		const line = new Line(arc(sitePoints[i] ?? to, to), lineMaterial(GL.signal, 0.85, 0));
		line.geometry.setDrawRange(0, 0);
		spinner.add(line);
		return line;
	});
	const dimmed = [halo.material, dots.material, coast.material, ...arcs.map((a) => a.material)];

	const sections = STOPS.flatMap((stop) => {
		const el = root.querySelector<HTMLElement>(`[data-stop="${stop.id}"]`);
		return el ? [{ stop, el }] : [];
	});
	const firstSite = sections.findIndex(({ stop }) => stop.id === SITES[0].id);
	const markers = SITES.map(({ id }) => root.querySelector<HTMLElement>(`[data-site="${id}"]`));
	const readout = root.querySelector<HTMLElement>("[data-readout]");

	const view = (stop: Stop): View => {
		const { tilt = 0, ...placement } = narrow() ? stop.narrow : stop.wide;
		return { lon: stop.lon, lat: stop.lat - tilt, ...placement };
	};
	const state = { size: 1, x: 0, y: 0, glow: 1, quat: new Quaternion(), ready: false };
	const drag = { active: false, id: -1, x: 0, y: 0, yaw: 0, pitch: 0, vyaw: 0, mouse: false };
	const size = { width: 1, height: 1 };
	const target = new Quaternion();
	const other = new Quaternion();
	const user = new Quaternion();
	const scratch = new Vector3();
	let spin = 0;
	let label = "";

	/** Which two stops straddle the middle of the viewport, and how far between them. */
	const position = () => {
		const mid = innerHeight / 2;
		const anchors = sections.map(({ el }) => {
			const r = el.getBoundingClientRect();
			return r.top + Math.min(r.height, innerHeight) / 2;
		});
		const next = anchors.findIndex((a) => a > mid);
		if (next === 0) return { index: 0, t: 0 };
		if (next < 0) return { index: sections.length - 1, t: 0 };
		const from = anchors[next - 1] ?? 0;
		return { index: next - 1, t: (mid - from) / ((anchors[next] ?? 0) - from) };
	};

	const tick = (time: number, dt: number) => {
		const { index, t } = position();
		const a = sections[index];
		const b = sections[Math.min(index + 1, sections.length - 1)];
		if (!a || !b) return;
		const mix = smoothstep(0.22, 0.78, t);
		const va = view(a.stop);
		const vb = view(b.stop);
		if (!still) spin += lerp(a.stop.spin, b.stop.spin, mix) * dt;

		facing(va.lon + spin, va.lat, target).slerp(facing(vb.lon + spin, vb.lat, other), mix);
		const rate = state.ready && !still ? 1 - Math.exp(-4.5 * dt) : 1;
		state.quat.slerp(target, rate);
		state.size = lerp(state.size, lerp(va.size, vb.size, mix), rate);
		state.x = lerp(state.x, lerp(va.x, vb.x, mix), rate);
		state.y = lerp(state.y, lerp(va.y, vb.y, mix), rate);
		state.glow = lerp(state.glow, lerp(a.stop.glow, b.stop.glow, mix), rate);
		state.ready = true;

		if (!drag.active) {
			drag.yaw += drag.vyaw * dt;
			drag.vyaw *= Math.exp(-2.5 * dt);
			drag.yaw = damp(drag.yaw, 0, 0.7, dt);
			drag.pitch = damp(drag.pitch, 0, 1.2, dt);
		}
		user.setFromAxisAngle(X_AXIS, drag.pitch).multiply(other.setFromAxisAngle(Y_AXIS, drag.yaw));
		spinner.quaternion.copy(user).multiply(state.quat);

		const halfWidth = HALF_HEIGHT * camera.aspect;
		const scale = state.size * Math.min(halfWidth, HALF_HEIGHT);
		holder.scale.setScalar(scale);
		holder.position.set(state.x * halfWidth, state.y * HALF_HEIGHT, 0);
		const radiusPx = (scale / HALF_HEIGHT) * (size.height / 2) * renderer.getPixelRatio();
		dots.material.uniforms.uSize.value = radiusPx * step * RAD * 0.46;
		dots.material.uniforms.uTime.value = still ? 0 : time;
		for (const material of dimmed) material.uniforms.uDim.value = state.glow;

		arcs.forEach((line, i) => {
			const at = firstSite + i;
			const drawn = index > at ? 1 : index === at ? smoothstep(0.15, 0.85, t) : 0;
			line.geometry.setDrawRange(0, Math.round(drawn * ARC_POINTS));
		});

		renderer.render(scene, camera);

		markers.forEach((marker, i) => {
			const point = sitePoints[i];
			if (!marker || !point) return;
			scratch.copy(point).applyQuaternion(spinner.quaternion);
			const front = smoothstep(0.05, 0.35, scratch.z);
			scratch.multiplyScalar(scale).add(holder.position).project(camera);
			const active = index === firstSite + i ? 1 - mix : index + 1 === firstSite + i ? mix : 0;
			marker.style.transform = `translate(${((scratch.x + 1) / 2) * size.width}px, ${((1 - scratch.y) / 2) * size.height}px)`;
			marker.style.opacity = String(front * state.glow);
			marker.style.setProperty("--active", active.toFixed(3));
		});

		if (readout) {
			scratch.set(0, 0, 1).applyQuaternion(other.copy(spinner.quaternion).invert());
			const text = `${format(Math.asin(clamp(scratch.y, -1, 1)) / RAD, "N", "S")} ${format(Math.atan2(scratch.x, scratch.z) / RAD, "E", "W")}`;
			if (text !== label) {
				label = text;
				readout.textContent = text;
			}
		}
	};

	const loop = onFrame(canvas, tick);

	const resize = new ResizeObserver(() => {
		size.width = canvas.clientWidth;
		size.height = canvas.clientHeight;
		renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_DPR));
		renderer.setSize(size.width, size.height, false);
		camera.aspect = size.width / size.height;
		camera.updateProjectionMatrix();
		loop.redraw();
	});
	resize.observe(canvas);
	addEventListener("scroll", loop.redraw, { passive: true });

	/* Drag to spin: anywhere on the stage that isn't text or a control. Touch turns it sideways only, so
	 * vertical swipes stay page scroll (the stage sets `touch-action: pan-y`). */
	const stage = root.querySelector<HTMLElement>("[data-stage]");
	const free = (target: EventTarget | null) =>
		target instanceof Element && !target.closest("a, button, input, h1, h2, h3, p, dl, li");
	stage?.addEventListener("pointerdown", (e) => {
		if (!free(e.target) || (e.pointerType === "mouse" && e.button !== 0)) return;
		Object.assign(drag, {
			active: true,
			id: e.pointerId,
			x: e.clientX,
			y: e.clientY,
			vyaw: 0,
			mouse: e.pointerType === "mouse",
		});
		if (drag.mouse) {
			e.preventDefault();
			stage.setAttribute("data-dragging", "");
		}
	});
	addEventListener("pointermove", (e) => {
		if (!drag.active || e.pointerId !== drag.id) return;
		const perRadian = Math.max(120, (state.size * Math.min(size.width, size.height)) / 2);
		const yaw = (e.clientX - drag.x) / perRadian;
		drag.yaw += yaw;
		drag.vyaw = lerp(drag.vyaw, yaw * 60, 0.35);
		if (drag.mouse) drag.pitch = clamp(drag.pitch + (e.clientY - drag.y) / perRadian, -0.9, 0.9);
		drag.x = e.clientX;
		drag.y = e.clientY;
		loop.redraw();
	});
	const release = (e: PointerEvent) => {
		if (e.pointerId !== drag.id) return;
		drag.active = false;
		stage?.removeAttribute("data-dragging");
	};
	addEventListener("pointerup", release);
	addEventListener("pointercancel", release);

	addEventListener("pagehide", (e) => {
		if (e.persisted) return;
		loop.stop();
		resize.disconnect();
		for (const object of [halo, dots, coast, ...arcs]) {
			object.geometry.dispose();
			object.material.dispose();
		}
		renderer.dispose();
	});
};
