import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	LinearSRGBColorSpace,
	Mesh,
	PerspectiveCamera,
	Scene,
	ShaderMaterial,
	Vector3,
	WebGLRenderer,
} from "three";
import { clamp, damp, lerp, onFrame, reducedMotion } from "@/lab/lib/motion";
import {
	depthAt,
	EXAGGERATION,
	elevation,
	HALF_WIDTH,
	KM_PER_DEGREE,
	ORIGIN,
	TRACK_LENGTH,
	trackX,
} from "./terrain";
import fragmentShader from "./terrain.frag?raw";
import vertexShader from "./terrain.vert?raw";

/** Shader colours are authored display-referred, so the renderer converts nothing. */
const FOG = new Color(0.02, 0.042, 0.095);
const SWATH = 13;
const MAX_DPR = 1.5;
const START = 8;
const END = TRACK_LENGTH - 22;

interface Key {
	/** Along-track km. */
	at: number;
	/** Height above the local high ground, km of scene space. */
	alt: number;
	/** How far ahead along the track the camera looks. */
	look: number;
	side: number;
}

const FLIGHT: readonly Key[] = [
	{ at: START, alt: 13, look: 52, side: 0 },
	{ at: 45, alt: 7.5, look: 34, side: 3 },
	{ at: 100, alt: 7, look: 28, side: -7 },
	{ at: 160, alt: 8, look: 40, side: 0 },
	{ at: 212, alt: 9, look: 26, side: 6 },
	{ at: 234, alt: 11, look: 13, side: 4 },
	{ at: 262, alt: 6, look: 30, side: -3 },
	{ at: END, alt: 7.5, look: 36, side: 0 },
];

const flight = (s: number): Omit<Key, "at"> => {
	const next = Math.max(
		FLIGHT.findIndex((k) => k.at >= s),
		1,
	);
	const a = FLIGHT[next - 1];
	const b = FLIGHT[next];
	if (!a || !b) return { alt: 8, look: 30, side: 0 };
	const t = clamp((s - a.at) / (b.at - a.at));
	const e = t * t * (3 - 2 * t);
	return {
		alt: lerp(a.alt, b.alt, e),
		look: lerp(a.look, b.look, e),
		side: lerp(a.side, b.side, e),
	};
};

/**
 * Where the ship is for the current scroll: each `[data-station="<km>"]` element pins that point of the track
 * to the moment its centre crosses the viewport's, so the terrain's set pieces land in the gaps between sections.
 */
const stations = (root: HTMLElement) => {
	const marks = [...root.querySelectorAll<HTMLElement>("[data-station]")];
	let stops: (readonly [y: number, s: number])[] = [];
	const measure = () => {
		const half = innerHeight / 2;
		const end = document.documentElement.scrollHeight - half;
		stops = [
			[half, START] as const,
			...marks.map((el) => {
				const r = el.getBoundingClientRect();
				return [r.top + scrollY + r.height / 2, Number(el.dataset.station)] as const;
			}),
			[end, END] as const,
		].filter(([y], i, all) => i === 0 || i === all.length - 1 || (y > half && y < end));
	};
	measure();
	new ResizeObserver(measure).observe(document.body);
	return () => {
		const y = scrollY + innerHeight / 2;
		const next = Math.max(
			stops.findIndex(([at]) => at >= y),
			1,
		);
		const a = stops[next - 1];
		const b = stops[next];
		if (!a || !b) return START;
		return lerp(a[1], b[1], clamp((y - a[0]) / Math.max(b[0] - a[0], 1)));
	};
};

/** Highest ground near each km of track, smoothed, so the camera clears ridges without lurching. */
const clearance = () => {
	const raw = Array.from({ length: TRACK_LENGTH + 1 }, (_, s) => {
		let top = -Infinity;
		for (let ds = -3; ds <= 16; ds += 2)
			for (let dx = -8; dx <= 8; dx += 4) top = Math.max(top, elevation(trackX(s) + dx, s + ds));
		return top;
	});
	const R = 9;
	return raw.map((_, i) => {
		let sum = 0;
		let n = 0;
		for (let j = Math.max(0, i - R); j <= Math.min(TRACK_LENGTH, i + R); j++) {
			sum += raw[j] ?? 0;
			n++;
		}
		return sum / n;
	});
};

const sample = (values: readonly number[], at: number) => {
	const i = clamp(at, 0, values.length - 1);
	const lo = Math.floor(i);
	return lerp(values[lo] ?? 0, values[Math.min(lo + 1, values.length - 1)] ?? 0, i - lo);
};

const terrain = (columns: number, rows: number) => {
	const from = -14;
	const to = TRACK_LENGTH + 30;
	const count = (columns + 1) * (rows + 1);
	const position = new Float32Array(count * 3);
	const normal = new Float32Array(count * 3);
	const depth = new Float32Array(count);
	const offset = new Float32Array(count);
	const dx = (HALF_WIDTH * 2) / columns;
	const ds = (to - from) / rows;

	for (let r = 0, i = 0; r <= rows; r++) {
		const s = from + r * ds;
		const centre = trackX(s);
		for (let c = 0; c <= columns; c++, i++) {
			const x = -HALF_WIDTH + c * dx;
			const d = depthAt(x, s);
			depth[i] = d;
			offset[i] = x - centre;
			position.set([x, (-d / 1000) * EXAGGERATION, -s], i * 3);
		}
	}
	const y = (c: number, r: number) =>
		position[(clamp(r, 0, rows) * (columns + 1) + clamp(c, 0, columns)) * 3 + 1] ?? 0;
	for (let r = 0, i = 0; r <= rows; r++) {
		for (let c = 0; c <= columns; c++, i++) {
			const nx = -(y(c + 1, r) - y(c - 1, r)) / (2 * dx);
			const nz = (y(c, r + 1) - y(c, r - 1)) / (2 * ds);
			const len = Math.hypot(nx, 1, nz);
			normal.set([nx / len, 1 / len, nz / len], i * 3);
		}
	}
	const index = new Uint32Array(columns * rows * 6);
	for (let r = 0, k = 0; r < rows; r++) {
		for (let c = 0; c < columns; c++) {
			const a = r * (columns + 1) + c;
			const b = a + columns + 1;
			index.set([a, b, a + 1, a + 1, b, b + 1], k);
			k += 6;
		}
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(position, 3));
	geometry.setAttribute("normal", new BufferAttribute(normal, 3));
	geometry.setAttribute("aDepth", new BufferAttribute(depth, 1));
	geometry.setAttribute("aOffset", new BufferAttribute(offset, 1));
	geometry.setIndex(new BufferAttribute(index, 1));
	return geometry;
};

const dm = (degrees: number, positive: string, negative: string) => {
	const abs = Math.abs(degrees);
	const whole = Math.floor(abs);
	const minutes = ((abs - whole) * 60).toFixed(1).padStart(4, "0");
	return `${String(whole).padStart(2, "0")}°${minutes}′${degrees >= 0 ? positive : negative}`;
};

/** Instrument readouts, keyed by `data-readout`. Written only when their text changes. */
const instruments = (root: HTMLElement) => {
	const fields = new Map(
		[...root.querySelectorAll<HTMLElement>("[data-readout]")].map((el) => [el.dataset.readout, el]),
	);
	const write = (name: string, text: string) => {
		const el = fields.get(name);
		if (el && el.textContent !== text) el.textContent = text;
	};
	const metres = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

	const profile = root.querySelector<SVGPathElement>("[data-profile]");
	const floor = root.querySelector<SVGPathElement>("[data-profile-floor]");
	if (profile && floor) {
		const points = Array.from({ length: TRACK_LENGTH + 1 }, (_, s) => {
			const along = ((s - START) / (END - START)) * 100;
			return `${along.toFixed(2)} ${(depthAt(trackX(s), s) / 8800) * 100}`;
		}).filter((_, s) => s >= START && s <= END);
		profile.setAttribute("d", `M${points.join("L")}`);
		floor.setAttribute("d", `M0 100L${points.join("L")}L100 100Z`);
	}

	return (s: number) => {
		const x = trackX(s);
		const lat = ORIGIN.lat + s / KM_PER_DEGREE;
		const lon = ORIGIN.lon - x / (KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
		const heading = 180 - (Math.atan2(trackX(s + 1) - x, 1) * 180) / Math.PI;
		write("depth", metres.format(depthAt(x, s)));
		write("lat", dm(-lat, "N", "S"));
		write("lon", dm(-lon, "E", "W"));
		write("track", (s - START).toFixed(1));
		write("heading", `${String(Math.round(heading)).padStart(3, "0")}°`);
		root.style.setProperty("--along", String(clamp((s - START) / (END - START))));
	};
};

export const survey = (root: HTMLElement) => {
	const canvas = root.querySelector("canvas");
	if (!canvas) return;
	const readouts = instruments(root);
	const still = reducedMotion();
	const wanted = stations(root);

	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
	} catch {
		// No WebGL: the canvas's CSS gradient stands in and the instruments still follow the scroll.
		const update = () => readouts(wanted());
		update();
		addEventListener("scroll", update, { passive: true });
		return;
	}

	renderer.outputColorSpace = LinearSRGBColorSpace;
	const small = innerWidth < 768;
	const geometry = terrain(small ? 150 : 250, small ? 480 : 800);
	const uniforms = {
		uCamera: { value: new Vector3() },
		uFog: { value: FOG },
		uFogDensity: { value: 0.014 },
		uShip: { value: START },
		uPing: { value: START + 30 },
		uSwath: { value: SWATH },
	};
	const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms, side: DoubleSide });
	const scene = new Scene();
	scene.background = FOG;
	const mesh = new Mesh(geometry, material);
	mesh.frustumCulled = false;
	scene.add(mesh);

	const camera = new PerspectiveCamera(50, 1, 0.5, 400);
	const top = clearance();
	const target = new Vector3();
	let s = wanted();

	const loop = onFrame(canvas, (time, dt) => {
		const goal = wanted();
		s = still ? goal : damp(s, goal, 3.2, dt);
		const { alt, look, side } = flight(s);
		const portrait = camera.aspect < 0.8 ? 1.25 : 1;
		const bob = still ? 0 : Math.sin(time * 0.35) * 0.12;

		camera.position.set(trackX(s) + side, sample(top, s) + alt * portrait + bob, -s + 6);
		target.set(trackX(s + look), sample(top, s + look) - 2.5, -(s + look));
		camera.lookAt(target);
		camera.rotateZ(still ? 0 : Math.sin(time * 0.21) * 0.008 - side * 0.004);

		uniforms.uCamera.value.copy(camera.position);
		uniforms.uShip.value = s;
		uniforms.uPing.value = s + (still ? 30 : 2 + ((time * 8) % 72));
		renderer.render(scene, camera);
		readouts(s);
	});

	const resize = new ResizeObserver(() => {
		const { clientWidth: w, clientHeight: h } = canvas;
		renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_DPR));
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.fov = camera.aspect < 0.8 ? 62 : 48;
		camera.updateProjectionMatrix();
		loop.redraw();
	});
	resize.observe(canvas);
	addEventListener("scroll", loop.redraw, { passive: true });
	root.setAttribute("data-live", "");

	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			resize.disconnect();
			geometry.dispose();
			material.dispose();
			renderer.dispose();
		},
		{ once: true },
	);
};
