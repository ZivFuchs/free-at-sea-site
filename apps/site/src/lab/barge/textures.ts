import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/** Deterministic noise so the weathering is the same on every visit. */
const seeded = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Paint = (ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number) => void;

const paint = (width: number, height: number, seed: number, draw: Paint, colour = true) => {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (ctx) draw(ctx, width, height, seeded(seed));
	const texture = new CanvasTexture(canvas);
	if (colour) texture.colorSpace = SRGBColorSpace;
	texture.anisotropy = 8;
	return texture;
};

/** Soft irregular blotches: rust blooms, stains, chalked paint. */
const blotches = (
	ctx: CanvasRenderingContext2D,
	random: () => number,
	count: number,
	colour: (r: number) => string,
	size: [number, number],
	area: [number, number, number, number],
	alpha = 0.5,
) => {
	const [x0, y0, x1, y1] = area;
	for (let i = 0; i < count; i++) {
		const x = x0 + random() * (x1 - x0);
		const y = y0 + random() * (y1 - y0);
		const r = size[0] + random() ** 2 * (size[1] - size[0]);
		const g = ctx.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, colour(random()));
		g.addColorStop(1, "transparent");
		ctx.globalAlpha = alpha * (0.3 + 0.7 * random());
		ctx.fillStyle = g;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(1 + random() * 1.5, 1);
		ctx.translate(-x, -y);
		ctx.fillRect(x - r * 3, y - r, r * 6, r * 2);
		ctx.restore();
	}
	ctx.globalAlpha = 1;
};

/** Runs: rust and salt dragged down a wall by rain. */
const streaks = (
	ctx: CanvasRenderingContext2D,
	random: () => number,
	count: number,
	colour: string,
	w: number,
	from: number,
	length: [number, number],
	alpha = 0.35,
) => {
	for (let i = 0; i < count; i++) {
		const x = random() * w;
		const len = length[0] + random() * (length[1] - length[0]);
		const g = ctx.createLinearGradient(0, from, 0, from + len);
		g.addColorStop(0, colour);
		g.addColorStop(1, "transparent");
		ctx.globalAlpha = alpha * random();
		ctx.fillStyle = g;
		ctx.fillRect(x, from, 1 + random() * 4, len);
	}
	ctx.globalAlpha = 1;
};

const grain = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	random: () => number,
	amount: number,
) => {
	const image = ctx.getImageData(0, 0, w, h);
	for (let i = 0; i < image.data.length; i += 4) {
		const n = (random() - 0.5) * amount;
		image.data[i] = (image.data[i] ?? 0) + n;
		image.data[i + 1] = (image.data[i + 1] ?? 0) + n;
		image.data[i + 2] = (image.data[i + 2] ?? 0) + n;
	}
	ctx.putImageData(image, 0, 0);
};

/** Hull side, full length by full depth (keel at the bottom): red-lead topsides gone to rust, dark boot-top, weed. */
export const hullTexture = (waterline: number) =>
	paint(2048, 256, 11, (ctx, w, h, random) => {
		const wl = h * (1 - waterline);
		ctx.fillStyle = "#a9512c";
		ctx.fillRect(0, 0, w, h);
		blotches(
			ctx,
			random,
			260,
			(r) => (r > 0.5 ? "#7c3418" : "#c8703a"),
			[10, 70],
			[0, 0, w, wl],
			0.55,
		);
		blotches(ctx, random, 120, () => "#d9a074", [6, 40], [0, 0, w, wl], 0.4);
		blotches(ctx, random, 60, () => "#4a2414", [4, 22], [0, 0, w, wl], 0.6);
		streaks(ctx, random, 500, "#5b2a15", w, 0, [20, wl], 0.5);
		streaks(ctx, random, 260, "#e6c9a8", w, 0, [10, wl * 0.7], 0.3);
		// Plate seams and frames telegraphing through.
		ctx.strokeStyle = "rgba(40,18,10,0.35)";
		ctx.lineWidth = 1;
		for (let x = 0; x < w; x += w / 20) {
			ctx.beginPath();
			ctx.moveTo(x + 0.5, 0);
			ctx.lineTo(x + 0.5, h);
			ctx.stroke();
		}
		ctx.beginPath();
		ctx.moveTo(0, wl * 0.5);
		ctx.lineTo(w, wl * 0.5);
		ctx.stroke();
		// Boot-top and below: dark antifoul with a green fringe at the waterline.
		const g = ctx.createLinearGradient(0, wl - 18, 0, wl + 6);
		g.addColorStop(0, "rgba(30,26,22,0)");
		g.addColorStop(0.55, "rgba(30,26,22,0.9)");
		g.addColorStop(1, "#1d1b19");
		ctx.fillStyle = g;
		ctx.fillRect(0, wl - 18, w, h);
		ctx.fillStyle = "#1d1b19";
		ctx.fillRect(0, wl + 6, w, h);
		blotches(
			ctx,
			random,
			240,
			(r) => (r > 0.4 ? "#3d5a2a" : "#6f7a3a"),
			[3, 16],
			[0, wl - 14, w, wl + 10],
			0.6,
		);
		blotches(ctx, random, 90, () => "#c9cdb8", [2, 7], [0, wl - 4, w, h], 0.35);
		// Draught marks at the bow.
		ctx.fillStyle = "rgba(240,232,220,0.75)";
		ctx.font = "bold 13px sans-serif";
		for (let i = 0; i < 4; i++) ctx.fillText(String(8 + i * 2), w * 0.93, wl - 6 - i * 20);
		grain(ctx, w, h, random, 22);
	});

/** Deck, full length by full beam: worn non-slip gone sandy, blue paint aft, red at the bow, stains where things stood. */
export const deckTexture = () =>
	paint(2048, 512, 23, (ctx, w, h, random) => {
		ctx.fillStyle = "#b6a68c";
		ctx.fillRect(0, 0, w, h);
		blotches(
			ctx,
			random,
			220,
			(r) => (r > 0.5 ? "#9c8a70" : "#cdbfa6"),
			[20, 120],
			[0, 0, w, h],
			0.5,
		);
		// Painted ends, worn back to plate.
		ctx.fillStyle = "#2f7fb4";
		ctx.fillRect(0, 0, w * 0.115, h);
		ctx.fillStyle = "#9c2f3c";
		ctx.beginPath();
		ctx.moveTo(w, 0);
		ctx.lineTo(w * 0.93, 0);
		ctx.bezierCurveTo(w * 0.9, h * 0.2, w * 0.935, h * 0.55, w * 0.9, h);
		ctx.lineTo(w, h);
		ctx.fill();
		blotches(ctx, random, 120, () => "#b6a68c", [8, 50], [0, 0, w * 0.14, h], 0.7);
		blotches(ctx, random, 80, () => "#b6a68c", [8, 40], [w * 0.88, 0, w, h], 0.6);
		blotches(
			ctx,
			random,
			160,
			(r) => (r > 0.5 ? "#8a4a24" : "#b0683a"),
			[6, 44],
			[0, 0, w, h],
			0.4,
		);
		blotches(ctx, random, 50, () => "#3a322a", [10, 60], [w * 0.15, 0, w * 0.9, h], 0.4);
		// Rust weeping in from the deck edge.
		for (const y of [0, h - 26])
			blotches(ctx, random, 200, () => "#8a4420", [6, 26], [0, y, w, y + 26], 0.55);
		// Plate seams.
		ctx.strokeStyle = "rgba(60,50,40,0.4)";
		ctx.lineWidth = 1.5;
		for (let x = 0; x < w; x += w / 20) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
		for (let y = h / 4; y < h; y += h / 4) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}
		// A faded walkway line down each side.
		ctx.strokeStyle = "rgba(235,225,200,0.35)";
		ctx.setLineDash([40, 26]);
		ctx.lineWidth = 3;
		for (const y of [h * 0.09, h * 0.91]) {
			ctx.beginPath();
			ctx.moveTo(w * 0.12, y);
			ctx.lineTo(w * 0.9, y);
			ctx.stroke();
		}
		ctx.setLineDash([]);
		grain(ctx, w, h, random, 26);
	});

/** Container paint: one panel, tiled once per wall. Chalked, scuffed, rust from the bottom rail and the roof edge. */
export const containerTexture = (seed: number) =>
	paint(1024, 256, seed, (ctx, w, h, random) => {
		ctx.fillStyle = "#1f8cc6";
		ctx.fillRect(0, 0, w, h);
		blotches(
			ctx,
			random,
			90,
			(r) => (r > 0.5 ? "#3aa3d8" : "#1877ad"),
			[20, 110],
			[0, 0, w, h],
			0.5,
		);
		blotches(ctx, random, 60, () => "#cfe6f0", [4, 30], [0, 0, w, h], 0.18);
		streaks(ctx, random, 90, "#7a3b1c", w, 0, [10, 90], 0.5);
		blotches(
			ctx,
			random,
			110,
			(r) => (r > 0.5 ? "#7a3b1c" : "#a85a2c"),
			[3, 16],
			[0, h - 22, w, h],
			0.7,
		);
		blotches(ctx, random, 26, () => "#6b3519", [3, 12], [0, 0, w, h], 0.6);
		ctx.strokeStyle = "rgba(230,240,245,0.25)";
		for (let i = 0; i < 40; i++) {
			ctx.lineWidth = 0.5 + random();
			ctx.beginPath();
			const x = random() * w;
			const y = random() * h;
			ctx.moveTo(x, y);
			ctx.lineTo(x + (random() - 0.5) * 90, y + (random() - 0.5) * 14);
			ctx.stroke();
		}
		grain(ctx, w, h, random, 16);
	});

/** Roughness for steel: mostly dull, glossier where paint survives. */
export const steelRoughness = () =>
	paint(
		512,
		512,
		5,
		(ctx, w, h, random) => {
			ctx.fillStyle = "#d8d8d8";
			ctx.fillRect(0, 0, w, h);
			blotches(
				ctx,
				random,
				140,
				(r) => (r > 0.5 ? "#8f8f8f" : "#f4f4f4"),
				[10, 70],
				[0, 0, w, h],
				0.6,
			);
			grain(ctx, w, h, random, 40);
		},
		false,
	);

/** Solar module: cells, busbars, frame. */
export const solarTexture = () => {
	const texture = paint(256, 256, 9, (ctx, w, h) => {
		ctx.fillStyle = "#0c1a2c";
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = "#31465e";
		ctx.lineWidth = 2;
		for (let i = 0; i <= 6; i++) {
			ctx.strokeRect((i * w) / 6, 0, 0, h);
			ctx.strokeRect(0, (i * h) / 6, w, 0);
		}
		ctx.strokeStyle = "rgba(190,205,220,0.35)";
		ctx.lineWidth = 1;
		for (let i = 0; i < 12; i++) ctx.strokeRect(0, (i + 0.5) * (h / 12), w, 0);
		ctx.strokeStyle = "#aeb6bd";
		ctx.lineWidth = 6;
		ctx.strokeRect(0, 0, w, h);
	});
	texture.wrapS = texture.wrapT = RepeatWrapping;
	return texture;
};
