import { clamp, damp, onFrame, pageProgress, reducedMotion } from "@/lab/lib/motion";
import { KELP, MOTE, mix, type Rgb, rgba, SHAFT, SUN, water } from "./palette";

const TAU = Math.PI * 2;
const MAX_DPR = 1.5;
/** Viewport heights the camera sinks over the whole page. */
const DESCENT = 2.2;
const SURGE_PERIOD = 8;
const WARM_UP = 400;
const PHONE = 768;
const DAMPING = 0.9;
const DRAG = 0.06;
const RELAX = 8;

type Plane = "far" | "mid" | "near";

interface Layer {
	plane: Plane;
	parallax: number;
	/** Strands on a phone and on a desktop. */
	count: readonly [number, number];
	/** Segment and blade length, stipe width: fractions of viewport height. */
	seg: number;
	blade: number;
	stipe: number;
	/** How far the layer has faded into the water colour. */
	haze: number;
	/** Blades on both sides of the stipe, with bladders. */
	full: boolean;
	/** Share of strands kept to the outer margins, and the margin's width as phone / desktop fractions. */
	edge: number;
	margin: readonly [number, number];
}

const MID: Layer = {
	plane: "mid",
	parallax: 1,
	count: [5, 10],
	seg: 0.055,
	blade: 0.1,
	stipe: 0.0042,
	haze: 0.12,
	full: true,
	edge: 1,
	margin: [0.07, 0.2],
};

const LAYERS: readonly Layer[] = [
	{
		plane: "far",
		parallax: 0.3,
		count: [7, 14],
		seg: 0.03,
		blade: 0.035,
		stipe: 0.0016,
		haze: 0.8,
		full: false,
		edge: 0.45,
		margin: [0.3, 0.34],
	},
	{
		plane: "far",
		parallax: 0.5,
		count: [6, 12],
		seg: 0.04,
		blade: 0.055,
		stipe: 0.0024,
		haze: 0.58,
		full: false,
		edge: 0.7,
		margin: [0.22, 0.3],
	},
	MID,
	{
		plane: "near",
		parallax: 1.7,
		count: [2, 4],
		seg: 0.09,
		blade: 0.17,
		stipe: 0.009,
		haze: 0,
		full: true,
		edge: 1,
		margin: [0.01, 0.035],
	},
];

/** Canvas resolution per plane, as a fraction of CSS pixels: low resolution upscaled reads as soft focus. */
const SCALE: Record<Plane, (dpr: number) => number> = {
	far: () => 0.66,
	mid: (dpr) => Math.min(dpr, MAX_DPR),
	near: () => 0.3,
};

interface Strand {
	layer: Layer;
	n: number;
	seg: number;
	seed: number;
	x: Float32Array;
	y: Float32Array;
	px: Float32Array;
	py: Float32Array;
}

interface Mote {
	x: number;
	y: number;
	r: number;
	seed: number;
}

const mulberry = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** `foot`: CSS px at the bottom of the last screen covered by the footer, so the floor sits above it. */
export const growForest = (canvases: Record<Plane, HTMLCanvasElement>, foot: () => number) => {
	const contexts = {
		far: canvases.far.getContext("2d"),
		mid: canvases.mid.getContext("2d"),
		near: canvases.near.getContext("2d"),
	};
	const { far, mid, near } = contexts;
	if (!far || !mid || !near) return null;
	const ctx: Record<Plane, CanvasRenderingContext2D> = { far, mid, near };

	const still = reducedMotion();
	let W = 0;
	let H = 0;
	let strands: Strand[] = [];
	let motes: Mote[] = [];
	let cam = pageProgress();
	let time = 0;
	const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, live: 0 };

	const surface = () => H * 0.035;
	const floor = (layer: Layer) =>
		H * 0.985 - Math.min(foot(), H * 0.6) + DESCENT * H * layer.parallax;

	/** Water velocity in px per step: one coherent surge travelling up the forest, with a slower beat. */
	const surge = (x: number, y: number, layer: Layer) => {
		const amp = H * 0.0014 * (0.45 + 0.55 * Math.min(layer.parallax, 1.25));
		const phase =
			(time / SURGE_PERIOD) * TAU - (y / Math.min(layer.parallax, 1) / H) * 5.5 - (x / W) * 0.9;
		return (
			amp *
			(Math.sin(phase) + 0.25 * Math.sin((time / SURGE_PERIOD) * TAU * 0.37 + 1.3 - (y / H) * 3.1))
		);
	};

	const plant = () => {
		const random = mulberry(20261112);
		const phone = W < PHONE;
		strands = [];
		for (const layer of LAYERS) {
			const count = layer.count[phone ? 0 : 1];
			const margin = layer.margin[phone ? 0 : 1] * W;
			const seg = layer.seg * H;
			for (let s = 0; s < count; s++) {
				const side = s % 2 === 0 ? 0 : 1;
				const u = (Math.floor(s / 2) + random() * 1.6 - 0.3) / Math.ceil(count / 2);
				const edged = random() < layer.edge;
				const out = layer.plane === "near" ? (phone ? 0.16 : 0.03) : phone ? 0.05 : 0.03;
				const inset = edged ? u * margin - W * out : margin + random() * (W / 2 - margin);
				const rootX = side ? W - inset : inset;
				const rootY = floor(layer) + random() * H * 0.02;
				const length =
					(rootY - surface()) *
					(layer.plane === "far" ? 0.9 + random() * 0.2 : 1.04 + random() * 0.2);
				const n = Math.ceil(length / seg) + 1;
				const strand: Strand = {
					layer,
					n,
					seg,
					seed: random() * 100,
					x: new Float32Array(n),
					y: new Float32Array(n),
					px: new Float32Array(n),
					py: new Float32Array(n),
				};
				for (let i = 0; i < n; i++) {
					strand.x[i] = strand.px[i] = rootX + i * seg * 0.05;
					strand.y[i] = strand.py[i] = Math.max(rootY - i * seg, surface());
				}
				strands.push(strand);
			}
		}
		motes = Array.from({ length: phone ? 26 : 60 }, () => ({
			x: random() * W,
			y: random() * H,
			r: 0.6 + random() * 1.4,
			seed: random() * 100,
		}));
		for (let i = 0; i < WARM_UP; i++) {
			time += 1 / 60;
			step(1);
		}
	};

	const step = (k: number) => {
		const top = surface();
		const reach = Math.min(W, H) * 0.2;
		for (const strand of strands) {
			const { layer, n, seg, x, y, px, py } = strand;
			const size = 0.45 + 0.55 * Math.min(layer.parallax, 1.25);
			const lift = H * 0.00045 * size * k * k;
			const offset = cam * DESCENT * H * layer.parallax;
			const touch = layer.plane === "far" ? 0.35 : 1;
			for (let i = 1; i < n; i++) {
				const xi = x[i] ?? 0;
				const yi = y[i] ?? 0;
				let vx = (xi - (px[i] ?? xi)) * DAMPING;
				let vy = (yi - (py[i] ?? yi)) * DAMPING;
				vx += (surge(xi, yi, layer) * k - vx) * DRAG;
				vy -= lift + vy * DRAG * 0.5;
				if (pointer.live > 0.01) {
					const dx = xi - pointer.x;
					const dy = yi - offset - pointer.y;
					const d2 = dx * dx + dy * dy;
					if (d2 < reach * reach) {
						const d = Math.sqrt(d2) + 1;
						const fall = (1 - d / reach) ** 2 * pointer.live * touch;
						vx += ((dx / d) * H * 0.0012 + pointer.vx * 0.05) * fall;
						vy += ((dy / d) * H * 0.0012 + pointer.vy * 0.05) * fall;
					}
				}
				px[i] = xi;
				py[i] = yi;
				x[i] = xi + vx;
				y[i] = yi + vy;
			}
			for (let pass = 0; pass < RELAX; pass++) {
				for (let i = 1; i < n; i++) {
					const dx = (x[i] ?? 0) - (x[i - 1] ?? 0);
					const dy = (y[i] ?? 0) - (y[i - 1] ?? 0);
					const d = Math.hypot(dx, dy) || 1;
					const pull = (d - seg) / d;
					const share = i === 1 ? 1 : 0.5;
					x[i] = (x[i] ?? 0) - dx * pull * share;
					y[i] = (y[i] ?? 0) - dy * pull * share;
					if (i > 1) {
						x[i - 1] = (x[i - 1] ?? 0) + dx * pull * 0.5;
						y[i - 1] = (y[i - 1] ?? 0) + dy * pull * 0.5;
					}
				}
			}
			for (let i = 1; i < n; i++) {
				const ceiling =
					top +
					(hash(strand.seed, i) * 0.02 +
						0.012 * Math.sin((x[i] ?? 0) * 0.012 + time * 0.8 + strand.seed)) *
						H;
				if ((y[i] ?? 0) < ceiling) y[i] = ceiling;
			}
		}
		for (const mote of motes) {
			mote.x += surge(mote.x, mote.y, MID) * 0.5 * k;
			mote.y += (Math.sin(time * 0.3 + mote.seed) * 0.12 - 0.05) * k;
			mote.x = ((mote.x % W) + W) % W;
			mote.y = ((mote.y % H) + H) % H;
		}
		pointer.live *= 0.94 ** k;
		pointer.vx *= 0.8 ** k;
		pointer.vy *= 0.8 ** k;
	};

	const tone = ({ lit, deep }: { lit: Rgb; deep: Rgb }, layer: Layer, depth: number) =>
		mix(mix(lit, deep, clamp(depth * 1.15)), water(depth * 0.85 + 0.2), layer.haze);

	const drawStrand = (c: CanvasRenderingContext2D, strand: Strand, depth: number) => {
		const { layer, n, x, y, seed } = strand;
		const offset = cam * DESCENT * H * layer.parallax;
		const blade = layer.blade * H * (W < PHONE ? 0.72 : 1);
		const stipe = new Path2D();
		const dark = new Path2D();
		const light = new Path2D();
		const bladders = new Path2D();

		stipe.moveTo(x[0] ?? 0, (y[0] ?? 0) - offset);
		for (let i = 1; i < n - 1; i++) {
			const xi = x[i] ?? 0;
			const yi = (y[i] ?? 0) - offset;
			stipe.quadraticCurveTo(
				xi,
				yi,
				(xi + (x[i + 1] ?? xi)) / 2,
				(yi + (y[i + 1] ?? 0) - offset) / 2,
			);
		}

		for (let i = 2; i < n - 1; i++) {
			const sy = (y[i] ?? 0) - offset;
			if (sy < -blade * 1.3 || sy > H + blade * 1.3) continue;
			const sx = x[i] ?? 0;
			let tx = (x[i + 1] ?? sx) - (x[i - 1] ?? sx);
			let ty = (y[i + 1] ?? 0) - (y[i - 1] ?? 0);
			const tl = Math.hypot(tx, ty) || 1;
			tx /= tl;
			ty /= tl;
			const flow = surge(sx, y[i] ?? 0, layer) - (sx - (strand.px[i] ?? sx));
			const pull = clamp(flow / (H * 0.003), -1.2, 1.2);
			for (let side = -1; side <= 1; side += 2) {
				const h = hash(seed + i, side);
				if ((i % 2 === 0) === (side === 1) && (!layer.full || h > 0.45)) continue;
				const splay = 0.45 + 0.6 * hash(seed + i * 3.1, side + 2);
				let dx = -ty * side * splay + tx * 0.7 + pull * 0.9;
				let dy = tx * side * splay + ty * 0.7 + 0.12;
				const dl = Math.hypot(dx, dy) || 1;
				dx /= dl;
				dy /= dl;
				const length = blade * (0.75 + 0.6 * h) * Math.min(1, (i - 1) / 5);
				const sway = Math.sin(time * 1.1 + i * 0.9 + seed + side) * 0.16 + pull * 0.1 * side;
				const bulb = length * 0.1;
				const bx = sx + dx * bulb * 1.6;
				const by = sy + dy * bulb * 1.6;
				const nx = -dy;
				const ny = dx;
				const mx = bx + dx * length * 0.45 + nx * sway * length * 0.5;
				const my = by + dy * length * 0.45 + ny * sway * length * 0.5;
				const ex = bx + dx * length + nx * sway * length;
				const ey = by + dy * length + ny * sway * length;
				const wide = length * 0.11;
				const curl = Math.sin(time * 0.9 + i * 1.7 + seed * 3 + side) * length * 0.08;
				const qx = bx + dx * length * 0.25 - nx * sway * length * 0.2;
				const qy = by + dy * length * 0.25 - ny * sway * length * 0.2;
				const rx = mx + dx * length * 0.25 + nx * curl;
				const ry = my + dy * length * 0.25 + ny * curl;
				const leaf = h < 0.5 ? dark : light;
				leaf.moveTo(bx, by);
				leaf.bezierCurveTo(qx + nx * wide, qy + ny * wide, rx + nx * wide, ry + ny * wide, ex, ey);
				leaf.bezierCurveTo(rx - nx * wide, ry - ny * wide, qx - nx * wide, qy - ny * wide, bx, by);
				if (layer.full) {
					bladders.moveTo(bx + bulb, by);
					bladders.ellipse(
						sx + dx * bulb * 0.9,
						sy + dy * bulb * 0.9,
						bulb,
						bulb * 0.55,
						Math.atan2(dy, dx),
						0,
						TAU,
					);
				}
			}
		}

		const local = clamp(depth);
		const near = layer.plane === "near";
		c.lineWidth = Math.max(layer.stipe * H, 0.75);
		c.strokeStyle = rgba(tone(near ? KELP.near : KELP.stipe, layer, local));
		c.stroke(stipe);
		c.fillStyle = rgba(tone(near ? KELP.near : KELP.dark, layer, local), near ? 0.96 : 0.9);
		c.fill(dark);
		c.fillStyle = rgba(tone(near ? KELP.near : KELP.light, layer, local), near ? 0.9 : 0.72);
		c.fill(light);
		if (layer.full && !near) {
			c.fillStyle = rgba(tone(KELP.bladder, layer, local), 0.9);
			c.fill(bladders);
		}
	};

	const drawFloor = (c: CanvasRenderingContext2D, layer: Layer, depth: number) => {
		const base = floor(layer) - cam * DESCENT * H * layer.parallax;
		if (base - H * 0.12 > H) return;
		c.beginPath();
		c.moveTo(0, H + 2);
		const stepX = Math.max(W / 48, 12);
		for (let x = 0; x <= W + stepX; x += stepX) {
			const k = x / (H * layer.parallax);
			const rise =
				0.018 +
				0.04 * (0.5 + 0.5 * Math.sin(k * 3.1 + layer.parallax * 9)) +
				0.025 * Math.sin(k * 8.3 + 2);
			c.lineTo(x, base - rise * H * Math.min(layer.parallax, 1.2));
		}
		c.lineTo(W, H + 2);
		c.closePath();
		c.fillStyle = rgba(tone(KELP.rock, layer, depth));
		c.fill();
	};

	const drawWater = (c: CanvasRenderingContext2D) => {
		const sky = c.createLinearGradient(0, 0, 0, H);
		for (let i = 0; i <= 5; i++) sky.addColorStop(i / 5, rgba(water(cam * 0.82 + (i / 5) * 0.36)));
		c.fillStyle = sky;
		c.fillRect(0, 0, W, H);

		const lit = clamp(1 - cam * 1.5);
		if (lit <= 0) return;
		c.globalCompositeOperation = "lighter";
		const sunX = W * (W < PHONE ? 0.36 : 0.54);
		const sunY = -H * (0.12 + cam * 0.9);
		const glow = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.85);
		glow.addColorStop(0, rgba(SUN, 0.5 * lit));
		glow.addColorStop(0.45, rgba(SUN, 0.13 * lit));
		glow.addColorStop(1, rgba(SUN, 0));
		c.fillStyle = glow;
		c.fillRect(0, 0, W, H);

		const beams = W < PHONE ? 4 : 7;
		for (let i = 0; i < beams; i++) {
			const flicker =
				0.55 + 0.45 * Math.sin(time * 0.45 + i * 1.9) * Math.sin(time * 0.23 + i * 4.1);
			const x0 =
				sunX +
				(i - (beams - 1) / 2) * W * (W < PHONE ? 0.2 : 0.11) +
				Math.sin(time * 0.12 + i) * W * 0.02;
			const wide = W * (0.025 + 0.03 * hash(i, 3)) + H * 0.02;
			const reach = H * (0.75 + 0.3 * hash(i, 7));
			const lean = (x0 - sunX) * 0.55 + reach * 0.12;
			const beam = c.createLinearGradient(x0, 0, x0 + lean, reach);
			beam.addColorStop(0, rgba(SHAFT, 0.2 * lit * flicker));
			beam.addColorStop(1, rgba(SHAFT, 0));
			c.fillStyle = beam;
			c.beginPath();
			c.moveTo(x0 - wide / 2, -2);
			c.lineTo(x0 + wide / 2, -2);
			c.lineTo(x0 + lean + wide * 1.6, reach);
			c.lineTo(x0 + lean - wide * 1.6, reach);
			c.closePath();
			c.fill();
		}
		c.globalCompositeOperation = "source-over";
	};

	const draw = () => {
		for (const plane of ["far", "mid", "near"] as const) {
			const c = ctx[plane];
			const scale = c.canvas.width / W;
			c.setTransform(scale, 0, 0, scale, 0, 0);
			if (plane === "far") drawWater(c);
			else c.clearRect(0, 0, W, H);
			c.lineCap = "round";
			c.lineJoin = "round";
		}
		for (const layer of LAYERS) {
			const c = ctx[layer.plane];
			if (layer.plane !== "near") drawFloor(c, layer, cam + 0.1);
			for (const strand of strands) if (strand.layer === layer) drawStrand(c, strand, cam);
		}
		const lit = 0.25 + 0.5 * clamp(1 - cam);
		for (const mote of motes) {
			ctx.mid.fillStyle = rgba(
				MOTE,
				lit * (0.4 + 0.6 * Math.abs(Math.sin(time * 0.6 + mote.seed))),
			);
			ctx.mid.beginPath();
			ctx.mid.arc(mote.x, mote.y, mote.r, 0, TAU);
			ctx.mid.fill();
		}
	};

	const loop = onFrame(canvases.mid, (_, dt) => {
		if (still) cam = pageProgress();
		else {
			cam = damp(cam, pageProgress(), 5, dt);
			time += dt;
			step(Math.min(dt * 60, 2));
		}
		draw();
	});

	const resize = () => {
		const w = canvases.mid.clientWidth;
		const h = canvases.mid.clientHeight;
		const replant = w !== W || Math.abs(h - H) > H * 0.2;
		if (replant) {
			W = w;
			H = h;
		}
		for (const plane of ["far", "mid", "near"] as const) {
			const scale = SCALE[plane](devicePixelRatio);
			canvases[plane].width = Math.round(W * scale);
			canvases[plane].height = Math.round(H * scale);
		}
		if (replant) plant();
		loop.redraw();
	};

	const move = (e: PointerEvent) => {
		if (pointer.live > 0.2) {
			pointer.vx = clamp(e.clientX - pointer.x, -40, 40);
			pointer.vy = clamp(e.clientY - pointer.y, -40, 40);
		}
		pointer.x = e.clientX;
		pointer.y = e.clientY;
		pointer.live = 1;
	};

	resize();
	addEventListener("resize", resize);
	addEventListener("scroll", loop.redraw, { passive: true });
	if (!still) {
		addEventListener("pointermove", move, { passive: true });
		addEventListener("pointerdown", move, { passive: true });
	}
	addEventListener("pagehide", loop.stop, { once: true });
	return loop;
};
