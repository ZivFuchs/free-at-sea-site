import { clamp } from "@/lab/lib/motion";

const SVG = "http://www.w3.org/2000/svg";

/** Fraction by which red bends less and blue more than green: the fringe at a lens rim. */
const DISPERSION = 0.018;

const isChromium = () =>
	(
		navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }
	).userAgentData?.brands.some(({ brand }) => brand === "Chromium") ?? false;

/** SVG filters as `backdrop-filter` render only in Chromium; elsewhere the value parses but paints nothing. `?frost` previews that fallback. */
export const refracts = () =>
	isChromium() &&
	CSS.supports("backdrop-filter", "url(#a)") &&
	!new URLSearchParams(location.search).has("frost");

const GRAIN = 64;
let grain = "";

/** A tile of noise. Displacement samples whole pixels, which draws contours across fine texture; jitter breaks them up. */
const grainTile = () => {
	if (grain) return grain;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = GRAIN;
	const ctx = canvas.getContext("2d");
	if (!ctx) return grain;
	const image = ctx.createImageData(GRAIN, GRAIN);
	for (let i = 0; i < image.data.length; i += 4) {
		image.data[i] = Math.random() * 256;
		image.data[i + 1] = Math.random() * 256;
		image.data[i + 3] = 255;
	}
	ctx.putImageData(image, 0, 0);
	grain = canvas.toDataURL();
	return grain;
};

let defs: SVGDefsElement | null = null;
let count = 0;

const el = <K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs: Record<string, string | number>,
	children: readonly SVGElement[] = [],
) => {
	const node = document.createElementNS(SVG, tag);
	for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
	for (const child of children) node.appendChild(child);
	return node;
};

const CHANNELS = [
	["r", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", 1 - DISPERSION],
	["g", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", 1],
	["b", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", 1 + DISPERSION],
] as const;

export interface LensFilter {
	/** `backdrop-filter` value. */
	url: string;
	/** Swap the displacement map: R/G hold x/y offsets around 0.5, alpha is the lens's coverage. */
	image: (href: string, width: number, height: number) => void;
}

/**
 * A refraction filter: the backdrop is displaced through a map, once per colour channel at slightly
 * different strengths. `masked` keeps the untouched backdrop wherever the map is transparent.
 */
export const lensFilter = (scale: number, masked = false): LensFilter => {
	if (!defs) {
		defs = el("defs", {});
		const svg = el("svg", { width: 0, height: 0, "aria-hidden": "true" }, [defs]);
		svg.style.position = "absolute";
		document.body.appendChild(svg);
	}
	const id = `lens-${count++}`;
	const map = el("feImage", { x: 0, y: 0, preserveAspectRatio: "none", result: "map" });
	/** About a pixel and a half of jitter, as a fraction of the scale. */
	const jitter = 1.5 / scale;
	const filter = el("filter", { id, "color-interpolation-filters": "sRGB" }, [
		el("feImage", { href: grainTile(), x: 0, y: 0, width: GRAIN, height: GRAIN }),
		el("feTile", { result: "grain" }),
		map,
		el("feComposite", {
			in: "map",
			in2: "grain",
			operator: "arithmetic",
			k1: 0,
			k2: 1,
			k3: jitter,
			k4: -jitter / 2,
			result: "field",
		}),
		...CHANNELS.flatMap(([name, matrix, bend]) => [
			el("feDisplacementMap", {
				in: "SourceGraphic",
				in2: "field",
				scale: scale * bend,
				xChannelSelector: "R",
				yChannelSelector: "G",
			}),
			el("feColorMatrix", { type: "matrix", values: matrix, result: name }),
		]),
		el("feBlend", { in: "r", in2: "g", mode: "screen", result: "rg" }),
		el("feBlend", { in: "rg", in2: "b", mode: "screen" }),
		// Displacement samples whole pixels; half a pixel of blur softens what the jitter leaves.
		el("feGaussianBlur", { stdDeviation: 0.55, result: "bent" }),
		...(masked
			? [
					el("feComposite", { in: "bent", in2: "map", operator: "in", result: "cut" }),
					el("feMerge", {}, [
						el("feMergeNode", { in: "SourceGraphic" }),
						el("feMergeNode", { in: "cut" }),
					]),
				]
			: []),
	]);
	defs.appendChild(filter);
	return {
		url: `url(#${id})`,
		image: (href, width, height) => {
			map.setAttribute("href", href);
			map.setAttribute("width", String(width));
			map.setAttribute("height", String(height));
		},
	};
};

/** Writes one displacement texel: `dx`, `dy` in −0.5…0.5 of the filter's scale. */
export const texel = (
	data: Uint8ClampedArray,
	i: number,
	dx: number,
	dy: number,
	alpha: number,
) => {
	data[i] = 127.5 + clamp(dx, -0.5, 0.5) * 255;
	data[i + 1] = 127.5 + clamp(dy, -0.5, 0.5) * 255;
	data[i + 2] = 0;
	data[i + 3] = alpha * 255;
};

export type LensShape = "dome" | "bezel" | "band";

/** How hard each profile bends at `u`: 0 on the flat of the lens, 1 at its rim. */
const BEND: Record<LensShape, (u: number) => number> = {
	dome: (u) => u ** 3,
	bezel: (u) => u ** 3,
	band: (u) => u,
};

/** Longest side of a static map, in texels: the field is smooth, so it upscales cleanly. */
const MAP_MAX = 256;
/** A band magnifies the line under it by 1 / (1 − 2 × this). */
const BAND_BEND = 1 / 6;

/**
 * Gives `target` a water lens over whatever is behind it, sized to its box and kept in step with resizes:
 * a `bezel` bends along its rounded edge, a `dome` is a squircle meniscus, a `band` a rod lying across.
 * `strength` is the bend at the rim in px; the result is set as `--lens`.
 */
export const mountLens = (target: HTMLElement, shape: LensShape, strength: number) => {
	const reach = shape === "band" ? target.offsetHeight * BAND_BEND : strength;
	const filter = lensFilter(reach * 2);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const bend = BEND[shape];

	const build = () => {
		const { offsetWidth: w, offsetHeight: h } = target;
		if (!w || !h) return;
		const k = Math.min(1, MAP_MAX / Math.max(w, h));
		const cols = Math.max(2, Math.round(w * k));
		const rows = Math.max(2, Math.round(h * k));
		canvas.width = cols;
		canvas.height = rows;
		const image = ctx.createImageData(cols, rows);
		const radius = Math.min(
			Number.parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0,
			w / 2,
			h / 2,
		);
		const rim = Math.max(radius, 12);

		/** 0 on the flat of the lens, 1 on its outline. */
		const rise = (x: number, y: number) => {
			const nx = Math.abs(x - w / 2) / (w / 2);
			const ny = Math.abs(y - h / 2) / (h / 2);
			if (shape === "band") return ny;
			if (shape === "dome") return Math.min((nx ** 4 + ny ** 4) ** 0.25, 1);
			const qx = Math.abs(x - w / 2) - (w / 2 - radius);
			const qy = Math.abs(y - h / 2) - (h / 2 - radius);
			const inset =
				radius - Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - Math.min(Math.max(qx, qy), 0);
			return 1 - clamp(inset / rim);
		};

		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const x = ((i + 0.5) / cols) * w;
				const y = ((j + 0.5) / rows) * h;
				const gx = rise(x + 1, y) - rise(x - 1, y);
				const gy = rise(x, y + 1) - rise(x, y - 1);
				const length = Math.hypot(gx, gy) || 1;
				const amount = -bend(rise(x, y)) / 2;
				texel(image.data, (j * cols + i) * 4, (gx / length) * amount, (gy / length) * amount, 1);
			}
		}
		ctx.putImageData(image, 0, 0);
		filter.image(canvas.toDataURL(), w, h);
		target.style.setProperty("--lens", filter.url);
	};

	new ResizeObserver(build).observe(target);
};
