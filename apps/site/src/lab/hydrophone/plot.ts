import { clamp } from "@/lab/lib/motion";
import {
	F_MAX,
	F_MIN,
	type Mix,
	type Sea,
	type SoundEvent,
	VESSEL_LINES,
	vesselLevel,
	vesselShift,
} from "./signal";

const BINS = 224;
const COL_PX = 2;
const MAX_DPR = 2;
/** The plot starts below the page header, px. */
const TOP = 64;
const OCTAVES = Math.log(F_MAX / F_MIN);

/** Intensity → colour: deep navy, ocean blue, aqua, pale. */
const RAMP: readonly (readonly [number, number, number, number])[] = [
	[0, 3, 12, 24],
	[0.18, 6, 24, 44],
	[0.4, 12, 52, 84],
	[0.62, 28, 112, 140],
	[0.8, 98, 196, 210],
	[1, 236, 248, 250],
];
const LUT = new Uint8ClampedArray(256 * 3);
for (let i = 0; i < 256; i++) {
	const v = i / 255;
	const hi = Math.max(
		1,
		RAMP.findIndex(([at]) => at >= v),
	);
	const [a, b] = [RAMP[hi - 1] ?? RAMP[0], RAMP[hi] ?? RAMP[0]];
	if (!a || !b) continue;
	const t = (v - a[0]) / (b[0] - a[0]);
	for (let c = 0; c < 3; c++)
		LUT[i * 3 + c] = (a[c + 1] ?? 0) + ((b[c + 1] ?? 0) - (a[c + 1] ?? 0)) * t;
}

/** Fractional bin (0 at `F_MIN`) of a frequency on the log axis. */
const bin = (f: number) => (Math.log(f / F_MIN) / OCTAVES) * BINS;
const TICKS: readonly (readonly [number, string])[] = [
	[20, "20 Hz"],
	[100, "100"],
	[1000, "1 kHz"],
	[10000, "10 kHz"],
];
const BANDS = [
	{ source: "rain", label: "Rain on the surface", low: 5000, high: 22000 },
	{ source: "shrimp", label: "Snapping shrimp", low: 2500, high: 5000 },
	{ source: "vessel", label: "Vessel · engine lines", low: 28, high: 400 },
] as const;

const sample = (c: readonly number[], u: number) => {
	const at = clamp(u) * (c.length - 1);
	const i = Math.floor(at);
	const a = c[i] ?? 0;
	return a + ((c[i + 1] ?? a) - a) * (at - i);
};

export const createPlot = (canvas: HTMLCanvasElement) => {
	const ctx = canvas.getContext("2d");
	const buffer = document.createElement("canvas");
	const bufferCtx = buffer.getContext("2d");
	if (!ctx || !bufferCtx) return null;

	const level = new Float32Array(BINS);
	const ambient = Float32Array.from({ length: BINS }, (_, b) => 0.17 - 0.09 * (b / BINS));
	const paper = getComputedStyle(canvas).color;
	let [width, height, pxPerSec, colDt, cols] = [0, 0, 60, COL_PX / 60, 0];
	/** Time of the next column to compute. */
	let head = 0;

	const speckle = () => 0.45 - Math.log(1 - Math.random() * 0.999) * 0.55;
	const bump = (at: number, amount: number, sigma: number) => {
		const from = Math.max(0, Math.floor(at - sigma * 3));
		const to = Math.min(BINS - 1, Math.ceil(at + sigma * 3));
		for (let b = from; b <= to; b++)
			level[b] = (level[b] ?? 0) + amount * Math.exp(-(((b - at) / sigma) ** 2));
	};
	const wash = (low: number, high: number, amount: number, grain = true) => {
		const [a, b] = [bin(low), bin(high)];
		for (let i = Math.max(0, Math.floor(a)); i <= Math.min(BINS - 1, Math.ceil(b)); i++) {
			const edge = clamp(Math.min(i - a, b - i) / 6 + 0.25);
			level[i] = (level[i] ?? 0) + amount * edge * (grain ? speckle() : 1);
		}
	};

	const voice = (e: SoundEvent, t: number) => {
		if (e.kind === "click") {
			if (e.start >= t && e.start < t + colDt) wash(e.low, e.high, e.level * 0.75);
			return;
		}
		const u = (t - e.start) / e.duration;
		if (u < 0 || u >= 1) return;
		if (e.kind === "band") {
			wash(e.low, e.high, e.level * Math.sin(u * Math.PI) ** 2);
			return;
		}
		const pulse = e.pulse && Math.sin(t * e.pulse * 2 * Math.PI) < 0 ? 0.3 : 1;
		const envelope = Math.min(1, u / 0.08, (1 - u) / 0.15) * pulse * (0.85 + 0.3 * Math.random());
		const f = sample(e.contour, u);
		for (let h = 1; h <= e.harmonics && f * h < F_MAX; h++) {
			bump(bin(f * h), (e.level * envelope) / h ** 0.75, e.source === "fin" ? 2.2 : 1.25);
		}
	};

	const column = (
		t: number,
		sea: Sea,
		mix: Mix,
		pixels: Uint8ClampedArray,
		x: number,
		stride: number,
	) => {
		for (let b = 0; b < BINS; b++) level[b] = (ambient[b] ?? 0) * speckle();
		for (const e of sea.events) voice(e, t);

		if (mix.rain > 0.02) {
			const fall = mix.rain * 0.22 * (0.75 + 0.25 * Math.sin(t * 0.37) + 0.15 * Math.sin(t * 1.3));
			const peak = bin(13000);
			for (let b = Math.floor(bin(1500)); b < BINS; b++) {
				level[b] = (level[b] ?? 0) + fall * Math.exp(-(((b - peak) / 26) ** 2)) * speckle();
			}
		}
		if (mix.shrimp > 0.02) {
			const snaps = mix.shrimp * 9 * colDt;
			for (let n = snaps; n > 0; n--) {
				if (Math.random() < n)
					wash(2500 + 6000 * Math.random() ** 2, F_MAX, 0.08 + 0.3 * Math.random() ** 3);
			}
		}
		const ship = mix.vessel * vesselLevel(t);
		if (ship > 0.02) {
			const shift = vesselShift(t);
			VESSEL_LINES.forEach((f, i) => {
				bump(bin(f * shift), ship * (0.8 - i * 0.07), 0.8);
			});
			wash(18, 420, ship * 0.14);
		}

		for (let b = 0; b < BINS; b++) {
			const shade = Math.round(clamp(level[b] ?? 0) * 255) * 3;
			const at = ((BINS - 1 - b) * stride + x) * 4;
			pixels[at] = LUT[shade] ?? 0;
			pixels[at + 1] = LUT[shade + 1] ?? 0;
			pixels[at + 2] = LUT[shade + 2] ?? 0;
			pixels[at + 3] = 255;
		}
	};

	const y = (f: number) => TOP + (height - TOP) * (1 - bin(f) / BINS);
	const x = (t: number, now: number) => width - (now - t) * pxPerSec;

	const text = (
		label: string,
		at: number,
		top: number,
		alpha: number,
		align: CanvasTextAlign = "left",
	) => {
		ctx.globalAlpha = alpha;
		ctx.textAlign = align;
		ctx.fillText(label.toUpperCase(), at, top);
	};

	const annotate = (sea: Sea, mix: Mix, now: number) => {
		ctx.fillStyle = paper;
		ctx.strokeStyle = paper;
		ctx.lineWidth = 1;
		ctx.font = `500 ${width < 600 ? 9 : 10}px ui-sans-serif, system-ui, sans-serif`;
		ctx.letterSpacing = "0.12em";
		ctx.textBaseline = "middle";

		for (const [f, label] of TICKS) {
			const at = Math.round(y(f)) + 0.5;
			ctx.globalAlpha = 0.07;
			ctx.beginPath();
			ctx.moveTo(0, at);
			ctx.lineTo(width, at);
			ctx.stroke();
			text(label, 12, at - 9, 0.45);
		}
		for (let s = 2; s * pxPerSec < width - 40; s += 2) {
			const at = Math.round(width - s * pxPerSec) + 0.5;
			ctx.globalAlpha = 0.3;
			ctx.beginPath();
			ctx.moveTo(at, height - 6);
			ctx.lineTo(at, height);
			ctx.stroke();
			if (s % 4 === 0 && at > 120) text(`−${s} s`, at, height - 16, 0.4, "center");
		}

		for (const tag of sea.tags) {
			if (tag.start > now) continue;
			const [left, right] = [x(tag.start, now) - 5, x(Math.min(tag.end, now), now) + 5];
			if (right < 0) continue;
			const [top, bottom] = [y(tag.high) - 7, y(tag.low) + 7];
			const fade =
				clamp((now - tag.start) / 0.4) * clamp(right / 120) * clamp(tag.strength * 1.6 - 0.2);
			if (fade <= 0) continue;
			const arm = Math.min(7, (right - left) / 2);
			ctx.globalAlpha = 0.6 * fade;
			ctx.beginPath();
			for (const [cx, dx] of [
				[left, arm],
				[right, -arm],
			] as const) {
				for (const [cy, dy] of [
					[top, 7],
					[bottom, -7],
				] as const) {
					ctx.moveTo(cx + dx, cy);
					ctx.lineTo(cx, cy);
					ctx.lineTo(cx, cy + dy);
				}
			}
			ctx.stroke();
			text(tag.label, Math.max(left, 12), Math.max(top - 10, TOP + 14), 0.85 * fade);
		}

		const weights = { ...mix, vessel: mix.vessel * vesselLevel(now) };
		for (const band of BANDS) {
			const alpha = clamp((weights[band.source] - 0.15) * 2.5);
			if (alpha <= 0) continue;
			const [top, bottom] = [y(band.high), y(band.low)];
			ctx.globalAlpha = 0.5 * alpha;
			ctx.beginPath();
			ctx.moveTo(width - 16, top);
			ctx.lineTo(width - 10, top);
			ctx.lineTo(width - 10, bottom);
			ctx.lineTo(width - 16, bottom);
			ctx.stroke();
			text(band.label, width - 24, (top + bottom) / 2, 0.75 * alpha, "right");
		}
		ctx.globalAlpha = 1;
	};

	const plot = {
		/** Seconds of sound visible across the canvas. */
		get span() {
			return width / pxPerSec;
		},
		/** Sizes to the canvas box; returns whether the history must be recomputed. */
		resize() {
			const [w, h] = [canvas.clientWidth, canvas.clientHeight];
			if (w === width && h === height) return false;
			const widened = w !== width;
			[width, height] = [w, h];
			const dpr = Math.min(devicePixelRatio, MAX_DPR);
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			if (!widened) return false;
			pxPerSec = clamp(w / 14, 36, 110);
			colDt = COL_PX / pxPerSec;
			cols = Math.ceil(w / COL_PX) + 2;
			buffer.width = cols;
			buffer.height = BINS;
			return true;
		},
		/** Fills the whole buffer with the `span` seconds before `now`, composing the sea as it goes. */
		prefill(sea: Sea, mix: Mix, now: number) {
			const image = bufferCtx.createImageData(cols, BINS);
			for (let i = 0; i < cols; i++) {
				const t = now - (cols - 1 - i) * colDt;
				sea.advance(t, mix, plot.span + 2);
				column(t, sea, mix, image.data, i, cols);
			}
			bufferCtx.putImageData(image, 0, 0);
			head = now + colDt;
		},
		/** Computes the columns due by `now` and scrolls them in. */
		step(sea: Sea, mix: Mix, now: number) {
			const due = Math.min(cols, Math.floor((now - head) / colDt) + 1);
			if (due <= 0) return;
			const image = bufferCtx.createImageData(due, BINS);
			for (let i = 0; i < due; i++) column(head + i * colDt, sea, mix, image.data, i, due);
			bufferCtx.globalCompositeOperation = "copy";
			bufferCtx.drawImage(buffer, -due, 0);
			bufferCtx.globalCompositeOperation = "source-over";
			bufferCtx.putImageData(image, cols - due, 0);
			head += due * colDt;
		},
		draw(sea: Sea, mix: Mix, now: number) {
			ctx.imageSmoothingEnabled = true;
			ctx.clearRect(0, 0, width, TOP);
			ctx.drawImage(buffer, x(head, now) - cols * COL_PX, TOP, cols * COL_PX, height - TOP);
			annotate(sea, mix, now);
		},
	};
	return plot;
};
