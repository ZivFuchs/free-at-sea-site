import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, onFrame, reducedMotion } from "@/lab/lib/motion";
import caustics from "./caustics.frag?raw";

/** Cells along the longer side of the viewport. */
const CELLS = 128;
const STEP = 1 / 60;
const DAMPING = 0.985;
/** Surface slope → map channel (0–255 around 128). */
const SLOPE = 300;
/** Below this the water counts as flat and the simulation rests. */
const CALM = 0.006;
/** Wave speed of the grid, in cells per second: rings in the DOM filters keep pace with it. */
const SPEED = Math.SQRT1_2 / STEP;
/** Rings one filter can bend at once. */
const SLOTS = 4;
const RING_PX = 256;
const SVG_NS = "http://www.w3.org/2000/svg";
/** WebKit runs SVG filters over HTML slowly and wrongly; it keeps the light, not the refraction. */
const WEBKIT = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/** Two-buffer wave equation over the viewport. */
class Surface {
	cols = 0;
	rows = 0;
	cell = 1;
	private now = new Float32Array(0);
	private before = new Float32Array(0);
	private pixels = new ImageData(1, 1);
	readonly canvas = document.createElement("canvas");
	private ctx = this.canvas.getContext("2d");

	resize() {
		this.cell = Math.max(innerWidth, innerHeight) / CELLS;
		this.cols = Math.max(8, Math.round(innerWidth / this.cell));
		this.rows = Math.max(8, Math.round(innerHeight / this.cell));
		this.now = new Float32Array(this.cols * this.rows);
		this.before = new Float32Array(this.cols * this.rows);
		this.canvas.width = this.cols;
		this.canvas.height = this.rows;
		this.pixels = new ImageData(this.cols, this.rows);
		this.paint();
	}

	/** A soft dent at viewport pixel (x, y); `radius` in cells. */
	drop(x: number, y: number, radius: number, depth: number) {
		const cx = x / this.cell;
		const cy = y / this.cell;
		const reach = Math.ceil(radius * 2);
		for (
			let j = Math.max(1, Math.floor(cy - reach));
			j <= Math.min(this.rows - 2, cy + reach);
			j++
		) {
			for (
				let i = Math.max(1, Math.floor(cx - reach));
				i <= Math.min(this.cols - 2, cx + reach);
				i++
			) {
				const d2 = ((i - cx) ** 2 + (j - cy) ** 2) / (radius * radius);
				const at = j * this.cols + i;
				this.now[at] = (this.now[at] ?? 0) - depth * Math.exp(-d2 * 2);
			}
		}
	}

	/** Advances one step; returns the largest height left. */
	step() {
		const { cols, rows, now, before } = this;
		let peak = 0;
		for (let j = 1; j < rows - 1; j++) {
			for (let i = 1, at = j * cols + 1; i < cols - 1; i++, at++) {
				const v =
					(((now[at - 1] ?? 0) +
						(now[at + 1] ?? 0) +
						(now[at - cols] ?? 0) +
						(now[at + cols] ?? 0)) /
						2 -
						(before[at] ?? 0)) *
					DAMPING;
				before[at] = v;
				if (v > peak) peak = v;
				else if (-v > peak) peak = -v;
			}
		}
		this.now = before;
		this.before = now;
		return peak;
	}

	/** Keeps the water with the page as it scrolls by `rows` cells. */
	shift(rows: number) {
		const by = rows * this.cols;
		for (const field of [this.now, this.before]) {
			if (Math.abs(by) >= field.length) field.fill(0);
			else if (by > 0) field.copyWithin(0, by).fill(0, field.length - by);
			else if (by < 0) field.copyWithin(-by, 0, field.length + by).fill(0, 0, -by);
		}
	}

	/** Slope into red/green, height into blue: the shader's view of the surface. */
	paint() {
		const { cols, rows, now } = this;
		const { data } = this.pixels;
		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const at = j * cols + i;
				const edge = i === 0 || j === 0 || i === cols - 1 || j === rows - 1;
				const gx = edge ? 0 : (now[at + 1] ?? 0) - (now[at - 1] ?? 0);
				const gy = edge ? 0 : (now[at + cols] ?? 0) - (now[at - cols] ?? 0);
				const o = at * 4;
				data[o] = 128 + clamp(gx * SLOPE, -127, 127);
				data[o + 1] = 128 + clamp(gy * SLOPE, -127, 127);
				data[o + 2] = 128 + clamp((now[at] ?? 0) * SLOPE, -127, 127);
				data[o + 3] = 255;
			}
		}
		this.ctx?.putImageData(this.pixels, 0, 0);
	}
}

interface Ring {
	/** Centre, in page pixels. */
	x: number;
	y: number;
	born: number;
	life: number;
	depth: number;
}

interface Slot {
	image: SVGFEImageElement;
	fade: SVGFEFuncAElement;
}

interface Lens {
	el: HTMLElement;
	id: string;
	slots: Slot[];
	seen: boolean;
	on: boolean;
}

const svg = <K extends keyof SVGElementTagNameMap>(
	tag: K,
	values: Record<string, string | number>,
) => {
	const el = document.createElementNS(SVG_NS, tag);
	attrs(el, values);
	return el;
};

/** `append`, typed for the DOM (the Worker types shadow `Element.append`). */
const add = (parent: Node, ...children: Node[]) => {
	for (const child of children) parent.appendChild(child);
};

const attrs = (el: Element, values: Record<string, string | number>) => {
	for (const [k, v] of Object.entries(values)) el.setAttribute(k, String(v));
};

/**
 * One ring as a displacement map, decoded once: a short wave train near the rim, pushing along the radius.
 * Alpha is its envelope, so laid over mid-grey it fades to no displacement.
 */
const ringMap = () => {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = RING_PX;
	const ctx = canvas.getContext("2d");
	if (!ctx) return "";
	const pixels = ctx.createImageData(RING_PX, RING_PX);
	const half = RING_PX / 2;
	for (let j = 0; j < RING_PX; j++) {
		for (let i = 0; i < RING_PX; i++) {
			const dx = (i + 0.5 - half) / half;
			const dy = (j + 0.5 - half) / half;
			const r = Math.hypot(dx, dy);
			const band = clamp((r - 0.4) / 0.6);
			const wave = Math.sin(band * Math.PI * 2);
			const o = (j * RING_PX + i) * 4;
			pixels.data[o] = 128 + (127 * wave * dx) / (r || 1);
			pixels.data[o + 1] = 128 + (127 * wave * dy) / (r || 1);
			pixels.data[o + 2] = 128;
			pixels.data[o + 3] = 255 * Math.sin(band * Math.PI) ** 2;
		}
	}
	ctx.putImageData(pixels, 0, 0);
	return canvas.toDataURL("image/png");
};

/** A displacement filter per `[data-refract]` element: mid-grey with up to `SLOTS` rings laid over it. */
const lenses = (defs: SVGElement, strength: number): Lens[] => {
	const href = ringMap();
	return [...document.querySelectorAll<HTMLElement>("[data-refract]")].map((el, n) => {
		const id = `shallows-lens-${n}`;
		const filter = svg("filter", {
			id,
			x: "-6%",
			y: "-12%",
			width: "112%",
			height: "124%",
			primitiveUnits: "userSpaceOnUse",
			"color-interpolation-filters": "sRGB",
		});
		const merge = svg("feMerge", { result: "rings" });
		add(merge, svg("feMergeNode", { in: "flat" }));
		add(filter, svg("feFlood", { "flood-color": "rgb(128,128,128)", result: "flat" }));
		const slots = Array.from({ length: SLOTS }, (_, i): Slot => {
			const image = svg("feImage", {
				href,
				preserveAspectRatio: "none",
				width: 1,
				height: 1,
				result: `raw${i}`,
			});
			const transfer = svg("feComponentTransfer", { in: `raw${i}`, result: `ring${i}` });
			const fade = svg("feFuncA", { type: "linear", slope: 0 });
			add(transfer, fade);
			add(filter, image, transfer);
			add(merge, svg("feMergeNode", { in: `ring${i}` }));
			return { image, fade };
		});
		add(
			filter,
			merge,
			svg("feGaussianBlur", { in: "rings", stdDeviation: 4, result: "map" }),
			svg("feDisplacementMap", {
				in: "SourceGraphic",
				in2: "map",
				scale: strength,
				xChannelSelector: "R",
				yChannelSelector: "G",
			}),
		);
		add(defs, filter);
		return { el, id, slots, seen: false, on: false };
	});
};

/** How hard a ring bends right now: a quick swell, then a long fade. */
const swell = ({ born, life, depth }: Ring, time: number) => {
	const age = time - born;
	return age >= life ? 0 : depth * Math.min(1, age / 0.1) * (1 - age / life) ** 2;
};

export const startWater = (canvas: HTMLCanvasElement, defs: SVGElement) => {
	const still = reducedMotion();
	const surface = new Surface();
	surface.resize();

	const shader = runShader(canvas, {
		fragment: `precision highp float;\n${noise}\n${caustics}`,
		resolution: 0.6,
		fps: 40,
		uniforms: () => ({ u_scroll: scrollY, u_px: canvas.width / Math.max(1, canvas.clientWidth) }),
		textures: { u_map: surface.canvas },
	});
	if (!shader) return;
	canvas.setAttribute("data-on", "");
	if (still) return;

	const glass = WEBKIT ? [] : lenses(defs, innerWidth < 768 ? 34 : 50);
	const watch = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			const lens = glass.find(({ el }) => el === entry.target);
			if (lens) lens.seen = entry.isIntersecting;
		}
	});
	for (const { el } of glass) watch.observe(el);

	const drifting = [...document.querySelectorAll<HTMLElement>("[data-depth]")].map((el) => ({
		el,
		depth: Number(el.dataset.depth),
		by: 0,
	}));

	const rings: (Ring | undefined)[] = new Array(SLOTS).fill(undefined);
	let clock = 0;
	let lastScroll = scrollY;
	let carry = 0;
	let bank = 0;
	let rough = 0;
	let first = true;
	let nextBreeze = 1.1;
	let nextWake = 0;
	let pointer: { x: number; y: number } | null = null;

	const drift = () => {
		for (const item of drifting) {
			const r = item.el.getBoundingClientRect();
			if (r.bottom - item.by < -200 || r.top - item.by > innerHeight + 200) continue;
			const by = (r.top - item.by + r.height / 2 - innerHeight / 2) * -item.depth;
			item.by = by;
			item.el.style.translate = `0 ${by.toFixed(1)}px`;
		}
	};

	/** Dents the simulated surface and starts a matching ring in the filters. Viewport pixels. */
	const disturb = (x: number, y: number, radius: number, depth: number, life: number) => {
		surface.drop(x, y, radius, depth);
		rough = 1;
		let slot = 0;
		let faintest = Infinity;
		rings.forEach((ring, i) => {
			const now = ring ? swell(ring, clock) : 0;
			if (now < faintest) {
				faintest = now;
				slot = i;
			}
		});
		rings[slot] = {
			x: x + scrollX,
			y: y + scrollY,
			born: clock,
			life,
			depth: Math.min(1, depth * 2.5),
		};
	};

	const refract = () => {
		const live = rings.map((ring) => (ring ? swell(ring, clock) : 0));
		const wet = live.some((v) => v > 0.004);
		for (const lens of glass) {
			const on = wet && lens.seen;
			if (on) {
				const r = lens.el.getBoundingClientRect();
				lens.slots.forEach(({ image, fade }, i) => {
					const ring = rings[i];
					const strength = live[i] ?? 0;
					fade.setAttribute("slope", strength.toFixed(3));
					if (!ring || !strength) return;
					const radius = surface.cell * (3 + SPEED * (clock - ring.born));
					attrs(image, {
						x: (ring.x - scrollX - radius - r.left).toFixed(1),
						y: (ring.y - scrollY - radius - r.top).toFixed(1),
						width: (radius * 2).toFixed(1),
						height: (radius * 2).toFixed(1),
					});
				});
			}
			if (on !== lens.on) {
				lens.on = on;
				lens.el.style.filter = on ? `url(#${lens.id})` : "";
			}
		}
	};

	const loop = onFrame(canvas, (time, dt) => {
		clock = time;
		const moved = scrollY - lastScroll;
		lastScroll = scrollY;
		if (moved || first) drift();
		first = false;
		carry += moved / surface.cell;
		const rows = Math.trunc(carry);
		if (rows) {
			surface.shift(rows);
			carry -= rows;
		}

		if (time > nextBreeze) {
			nextBreeze = time + 2.6 + Math.random() * 3.8;
			disturb(
				innerWidth * (0.15 + Math.random() * 0.7),
				innerHeight * (0.15 + Math.random() * 0.6),
				4.5 + Math.random() * 2,
				0.06 + Math.random() * 0.04,
				2.6,
			);
		}

		if (rough > 0) {
			bank = Math.min(bank + dt, STEP * 3);
			let peak = 0;
			while (bank >= STEP) {
				peak = surface.step();
				bank -= STEP;
			}
			if (peak < CALM && !rows) rough -= dt * 2.5;
			else rough = 1;
			surface.paint();
			shader.texture("u_map", surface.canvas);
		}
		refract();
	});

	addEventListener("pointerdown", (event) => {
		pointer = { x: event.clientX, y: event.clientY };
		disturb(event.clientX, event.clientY, 4.2, 0.2, 2.4);
		loop.redraw();
	});
	addEventListener(
		"pointermove",
		(event) => {
			const from = pointer;
			pointer = { x: event.clientX, y: event.clientY };
			if (!from) return;
			const speed = Math.hypot(pointer.x - from.x, pointer.y - from.y);
			if (speed < 2) return;
			const depth = clamp(speed / 500, 0.006, 0.05);
			if (clock > nextWake && speed > 6) {
				nextWake = clock + 0.22;
				disturb(pointer.x, pointer.y, 3.2, depth, 1.4);
			} else {
				surface.drop(pointer.x, pointer.y, 3.2, depth);
				rough = 1;
			}
			loop.redraw();
		},
		{ passive: true },
	);
	addEventListener("resize", () => {
		surface.resize();
		shader.texture("u_map", surface.canvas);
	});
	addEventListener("pagehide", () => {
		loop.stop();
		shader.stop();
		watch.disconnect();
	});
};
