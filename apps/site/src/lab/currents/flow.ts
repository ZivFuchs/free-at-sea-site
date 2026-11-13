import { clamp, damp, lerp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
/* Natural Earth 1:110m land (naturalearthdata.com, public domain), as rings of `[lon, lat, …]` at 0.01°. */
import land from "./assets/land.json";
import { createField } from "./field";
import { LON0, type Point, project, relative, unproject } from "./projection";

const MAX_DPR = 1.5;
const MASK = { width: 1440, height: 720 };
const BUCKETS = 5;
const ALPHA = [0.5, 0.6, 0.72, 0.86, 1] as const;
/** Degrees per second for the fastest water in the world view. */
const SPEED = 9;
const STIR_RADIUS = 110;
const STILL_STEPS = 70;

interface Camera {
	x: number;
	y: number;
	scale: number;
}

const view = (el: HTMLElement) => ({
	lon: Number(el.dataset.lon),
	lat: Number(el.dataset.lat),
	spanX: Number(el.dataset.spanX),
	spanY: Number(el.dataset.spanY),
	portrait: Number(el.dataset.portrait),
});

const landMask = () => {
	const canvas = document.createElement("canvas");
	canvas.width = MASK.width;
	canvas.height = MASK.height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return null;
	const sx = MASK.width / 360;
	ctx.beginPath();
	for (const ring of land) {
		for (let i = 0; i < ring.length; i += 2) {
			const x = ((ring[i] ?? 0) + 180) * sx;
			const y = (90 - (ring[i + 1] ?? 0)) * sx;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.closePath();
	}
	ctx.fill();
	const { data } = ctx.getImageData(0, 0, MASK.width, MASK.height);
	return (lon: number, lat: number) => {
		const x = Math.floor(((((lon + 180) % 360) + 360) % 360) * sx) % MASK.width;
		const y = clamp(Math.floor((90 - lat) * sx), 0, MASK.height - 1);
		return (data[(y * MASK.width + x) * 4 + 3] ?? 0) > 100;
	};
};

export const runCurrents = (root: HTMLElement) => {
	const back = root.querySelector<HTMLCanvasElement>("[data-land]");
	const front = root.querySelector<HTMLCanvasElement>("[data-flow]");
	const backCtx = back?.getContext("2d");
	const ctx = front?.getContext("2d");
	const isLand = landMask();
	if (!back || !front || !backCtx || !ctx || !isLand) return;

	const stops = [...document.querySelectorAll<HTMLElement>("[data-stop]")];
	const labels = [...root.querySelectorAll<HTMLElement>("[data-label]")].map((el) => ({
		el,
		lon: Number(el.dataset.lon),
		lat: Number(el.dataset.lat),
		stops: (el.dataset.stops ?? "").split(",").map(Number),
	}));
	const tone = getComputedStyle(root);
	const colour = (name: string) => tone.getPropertyValue(`--cur-${name}`).trim();
	const ramp = Array.from({ length: BUCKETS }, (_, i) => colour(String(i)));
	const sample = createField();
	const still = reducedMotion();

	let width = 0;
	let height = 0;
	let dpr = 1;
	let count = 0;
	let lon = new Float32Array(0);
	let lat = new Float32Array(0);
	let px = new Float32Array(0);
	let py = new Float32Array(0);
	let age = new Float32Array(0);
	const cam: Camera = { x: 0, y: 0, scale: 0 };
	const drawn: Camera = { x: NaN, y: NaN, scale: NaN };
	let stop = 0;
	const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, at: 0 };
	const p: Point = [0, 0];
	const q: Point = [0, 0];
	const uv: [number, number] = [0, 0];

	const toScreen = (rel: number, la: number, out: Point) => {
		project(rel, la, out);
		out[0] = width / 2 + (out[0] - cam.x) * cam.scale;
		out[1] = height / 2 - (out[1] - cam.y) * cam.scale;
		return out;
	};

	/** Scroll range over which the camera rests on each stop: while a passage's card is stuck in view. */
	const holds = () =>
		stops.map((el, i): [from: number, to: number] => {
			const top = el.getBoundingClientRect().top + scrollY;
			const card = el.querySelector<HTMLElement>("[data-card]");
			if (i === 0) return [0, el.offsetHeight * 0.15];
			if (!card) return [top - innerHeight * 0.4, Number.POSITIVE_INFINITY];
			const lift = Number.parseFloat(getComputedStyle(card).bottom) - innerHeight;
			const pad = Number.parseFloat(getComputedStyle(el).paddingTop);
			return [top + pad + card.offsetHeight + lift, top + el.offsetHeight + lift];
		});
	let ranges = holds();

	const target = (): Camera & { stop: number } => {
		let i = 0;
		while (i < stops.length - 2 && scrollY > (ranges[i + 1]?.[0] ?? 0)) i++;
		const a = stops[still ? 0 : i];
		const b = stops[still ? 0 : i + 1] ?? a;
		if (!a || !b) return { ...cam, stop: 0 };
		const [from, to] = [ranges[i]?.[1] ?? 0, ranges[i + 1]?.[0] ?? 1];
		const t = still ? 0 : smoothstep(0, 1, (scrollY - from) / Math.max(to - from, 1));
		const [va, vb] = [view(a), view(b)];
		const scale = (v: typeof va) =>
			Math.max(width / v.spanX, height / (v.spanY * (height > width ? v.portrait : 1)));
		project(relative(va.lon), va.lat, p);
		project(relative(vb.lon), vb.lat, q);
		return {
			x: lerp(p[0], q[0], t),
			y: lerp(p[1], q[1], t),
			/** Zoom reads as linear when the scale moves geometrically. */
			scale: scale(va) * (scale(vb) / scale(va)) ** t,
			stop: still ? 0 : i + t,
		};
	};

	const outline = (c: CanvasRenderingContext2D) => {
		c.beginPath();
		for (let la = -90; la <= 90; la += 3) {
			toScreen(-180, la, p);
			if (la === -90) c.moveTo(p[0], p[1]);
			else c.lineTo(p[0], p[1]);
		}
		for (let la = 90; la >= -90; la -= 3) {
			toScreen(180, la, p);
			c.lineTo(p[0], p[1]);
		}
		c.closePath();
	};

	const drawLand = () => {
		const c = backCtx;
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(0, 0, width, height);
		c.save();
		outline(c);
		c.fillStyle = colour("sea");
		c.fill();
		c.clip();

		c.beginPath();
		for (let lo = -180; lo <= 180; lo += 30) {
			for (let la = -90; la <= 90; la += 5) {
				toScreen(lo, la, p);
				if (la === -90) c.moveTo(p[0], p[1]);
				else c.lineTo(p[0], p[1]);
			}
		}
		for (let la = -60; la <= 60; la += 30) {
			toScreen(-180, la, p);
			c.moveTo(p[0], p[1]);
			toScreen(180, la, p);
			c.lineTo(p[0], p[1]);
		}
		c.strokeStyle = colour("grid");
		c.lineWidth = 1;
		c.stroke();

		c.beginPath();
		for (const ring of land) {
			for (const shift of [0, -360]) {
				for (let i = 0; i < ring.length; i += 2) {
					toScreen((ring[i] ?? 0) - LON0 + shift, ring[i + 1] ?? 0, p);
					if (i === 0) c.moveTo(p[0], p[1]);
					else c.lineTo(p[0], p[1]);
				}
				c.closePath();
			}
		}
		c.fillStyle = colour("land");
		c.fill();
		c.strokeStyle = colour("coast");
		c.stroke();
		c.restore();
	};

	const spawn = (i: number, anywhere = false) => {
		for (let tries = 0; tries < 6; tries++) {
			const inView = !anywhere && tries < 4;
			if (inView) {
				const x = cam.x + ((Math.random() - 0.5) * (width + 80)) / cam.scale;
				const y = cam.y + ((Math.random() - 0.5) * (height + 80)) / cam.scale;
				if (!unproject(x, y, q)) continue;
			} else {
				q[0] = Math.random() * 360 - 180;
				q[1] = Math.asin(Math.random() * 1.9 - 0.95) * (180 / Math.PI);
			}
			if (isLand(q[0] + LON0, q[1])) continue;
			lon[i] = q[0];
			lat[i] = q[1];
			break;
		}
		age[i] = 1.5 + Math.random() * 5;
		px[i] = NaN;
	};

	const step = (dt: number, moving: boolean) => {
		const zoom = cam.scale / Math.max(width / 5.6, height / 3.5);
		const rate = (SPEED / zoom ** 0.75) * dt;
		const perDegree = cam.scale * 0.0149;
		const stir = performance.now() - pointer.at < 400 ? 1 : 0;
		const paths = ramp.map(() => new Path2D());
		for (let i = 0; i < count; i++) {
			const lo = (lon[i] ?? 0) + LON0;
			const la = lat[i] ?? 0;
			sample(lo, la, uv);
			const speed = Math.hypot(uv[0], uv[1]);
			let nextLon = (lon[i] ?? 0) + (uv[0] * rate) / Math.max(Math.cos(la * (Math.PI / 180)), 0.35);
			let nextLat = la + uv[1] * rate;
			const x0 = px[i] ?? NaN;
			const y0 = py[i] ?? NaN;
			if (stir) {
				const d2 = (x0 - pointer.x) ** 2 + (y0 - pointer.y) ** 2;
				if (d2 < STIR_RADIUS ** 2) {
					const push = ((1 - d2 / STIR_RADIUS ** 2) ** 2 * dt * 0.9) / perDegree;
					nextLon += pointer.vx * push;
					nextLat -= pointer.vy * push;
				}
			}
			age[i] = (age[i] ?? 0) - dt;
			if (
				(age[i] ?? 0) < 0 ||
				Math.abs(nextLon) > 180 ||
				Math.abs(nextLat) > 86 ||
				speed < 0.03 ||
				isLand(nextLon + LON0, nextLat)
			) {
				spawn(i);
				continue;
			}
			lon[i] = nextLon;
			lat[i] = nextLat;
			toScreen(nextLon, nextLat, p);
			if (!moving && !Number.isNaN(x0)) {
				const path = paths[Math.min(BUCKETS - 1, Math.floor(speed * 1.15 * BUCKETS))];
				path?.moveTo(x0, y0);
				path?.lineTo(p[0], p[1]);
			}
			px[i] = p[0];
			py[i] = p[1];
			if (p[0] < -60 || p[0] > width + 60 || p[1] < -60 || p[1] > height + 60) spawn(i);
		}
		return paths;
	};

	const paint = (paths: Path2D[], fade: number) => {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.globalCompositeOperation = "destination-out";
		ctx.globalAlpha = fade;
		ctx.fillRect(0, 0, width, height);
		ctx.globalCompositeOperation = "lighter";
		ctx.lineWidth = width < 600 ? 0.9 : 1.1;
		ctx.lineCap = "round";
		paths.forEach((path, i) => {
			ctx.globalAlpha = (ALPHA[i] ?? 1) * (still ? 0.5 : 1);
			ctx.strokeStyle = ramp[i] ?? "";
			ctx.stroke(path);
		});
	};

	const placeLabels = () => {
		for (const label of labels) {
			const near = Math.max(...label.stops.map((s) => 1 - Math.abs(stop - s) * 2.2));
			label.el.style.opacity = String(clamp(near));
			if (near <= 0) continue;
			toScreen(relative(label.lon), label.lat, p);
			label.el.style.translate = `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`;
		}
	};

	const resize = () => {
		width = root.clientWidth;
		height = root.clientHeight;
		dpr = Math.min(devicePixelRatio, MAX_DPR);
		for (const canvas of [back, front]) {
			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
		}
		ranges = holds();
		count = Math.round(clamp((width * height) / 170, 1500, 7000));
		lon = new Float32Array(count);
		lat = new Float32Array(count);
		px = new Float32Array(count).fill(NaN);
		py = new Float32Array(count);
		age = new Float32Array(count);
		Object.assign(cam, target());
		for (let i = 0; i < count; i++) spawn(i);
		drawn.scale = NaN;
		if (still) {
			drawLand();
			placeLabels();
			for (let n = 0; n < STILL_STEPS; n++) paint(step(1 / 30, false), 0);
		}
	};

	const loop = onFrame(root, (_, dt) => {
		if (still) return;
		const to = target();
		cam.x = damp(cam.x, to.x, 4, dt);
		cam.y = damp(cam.y, to.y, 4, dt);
		cam.scale *= (to.scale / cam.scale) ** (1 - Math.exp(-4 * dt));
		stop = damp(stop, to.stop, 5, dt);
		const shift =
			Math.hypot(cam.x - drawn.x, cam.y - drawn.y) * cam.scale +
			Math.abs(cam.scale / drawn.scale - 1) * width;
		const moving = !(shift < 0.25);
		if (moving) {
			Object.assign(drawn, cam);
			drawLand();
		}
		placeLabels();
		root.style.setProperty("--dim", String(1 - 0.7 * clamp(stop - (stops.length - 2))));
		paint(step(dt, moving), moving ? 0.5 : 0.05);
	});

	new ResizeObserver(() => {
		resize();
		loop.redraw();
	}).observe(root);
	/** Late images and fonts move the sections. */
	new ResizeObserver(() => {
		ranges = holds();
	}).observe(document.body);

	addEventListener(
		"pointermove",
		(e) => {
			const now = performance.now();
			const dt = Math.max(now - pointer.at, 8) / 1000;
			pointer.vx = lerp(pointer.vx, clamp((e.clientX - pointer.x) / dt, -1500, 1500), 0.4);
			pointer.vy = lerp(pointer.vy, clamp((e.clientY - pointer.y) / dt, -1500, 1500), 0.4);
			pointer.x = e.clientX;
			pointer.y = e.clientY;
			pointer.at = now;
		},
		{ passive: true },
	);
	addEventListener("pagehide", loop.stop, { once: true });
};
