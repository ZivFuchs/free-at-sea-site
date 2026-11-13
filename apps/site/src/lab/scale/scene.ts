import { clamp, smoothstep } from "@/lab/lib/motion";
import { EARTH_RADIUS as R } from "./stages";

export interface View {
	width: number;
	height: number;
	/** Screen point the camera centre sits at. */
	anchor: readonly [number, number];
	span: number;
	centre: readonly [number, number];
	time: number;
}

export interface Ink {
	line: string;
	water: string;
	ground: string;
	font: string;
}

type Pt = readonly [number, number];
type Range = readonly [number, number];

const KM = 1000;
const NM = 1852;
const HALF = Math.PI * R;
const DECK = 2.2;
const COAST = -420 * KM;
/** Arc distances (m) along one schematic great circle; the settlement is at 0. */
const LAND: readonly Range[] = [
	[-11_800 * KM, -9_500 * KM],
	[-4_200 * KM, COAST],
	[9_000 * KM, 12_200 * KM],
	[16_000 * KM, 18_300 * KM],
];
const EEZ = 200 * NM;
const OCEAN: readonly Range[] = LAND.map(
	([, end], i): Range => [end, LAND[i + 1]?.[0] ?? (LAND[0]?.[0] ?? 0) + 2 * HALF],
);
const HIGH_SEAS: readonly Range[] = OCEAN.map(([a, b]): Range => [a + EEZ, b - EEZ]);
/** Distance to the horizon for an eye 1.6 m above the deck. */
const HORIZON = Math.sqrt(2 * R * (DECK + 1.6));

const into = (span: number, a: number, b: number) =>
	smoothstep(Math.log(a), Math.log(b), Math.log(span));
const upTo = (span: number, a: number, b: number) => 1 - into(span, a, b);

const coastDistance = (s: number) => {
	let d = Number.POSITIVE_INFINITY;
	for (const [a, b] of LAND) {
		for (const shift of [-2 * HALF, 0, 2 * HALF]) {
			if (s >= a + shift && s <= b + shift) return 0;
			d = Math.min(d, Math.abs(s - a - shift), Math.abs(s - b - shift));
		}
	}
	return d;
};

const depth = (s: number) => {
	const d = coastDistance(s);
	const shelf = 130 * clamp(d / (70 * KM));
	const slope = smoothstep(70 * KM, 170 * KM, d) * 3_870;
	const relief = smoothstep(150 * KM, 400 * KM, d);
	return (
		shelf +
		slope +
		relief *
			(420 * Math.sin(d / (97 * KM)) +
				260 * Math.sin(d / (31 * KM) + 1) +
				90 * Math.sin(d / (4.3 * KM)))
	);
};

const rect = (x: number, y: number, w: number, h: number): Pt[] => [
	[x, y],
	[x + w, y],
	[x + w, y + h],
	[x, y + h],
];

const HULL: Pt[] = [
	[-22, DECK],
	[38, DECK],
	[35.2, -1.4],
	[-19.4, -1.4],
];
const BOX = { w: 6.06, h: 2.59 };
/** Containers on deck: x, tier. */
const BOXES: readonly Pt[] = [
	[3, 0],
	[3, 1],
	[10.2, 0],
	[17.4, 0],
	[17.4, 1],
	[24.6, 0],
	[-16.4, 0],
];
const CABIN = { x: -9.6, w: 6.4, h: 5.3 };
/** Right half of a standing figure, crotch to neck; mirrored for the left. */
const HALF_FIGURE: readonly Pt[] = [
	[0, 0.8],
	[0.04, 0.45],
	[0.05, 0.06],
	[0.05, 0],
	[0.2, 0],
	[0.2, 0.035],
	[0.135, 0.08],
	[0.13, 0.45],
	[0.165, 0.88],
	[0.155, 1.03],
	[0.175, 1.28],
	[0.2, 1.1],
	[0.215, 0.9],
	[0.225, 0.78],
	[0.235, 0.7],
	[0.275, 0.7],
	[0.285, 0.8],
	[0.27, 1.0],
	[0.245, 1.25],
	[0.215, 1.41],
	[0.12, 1.46],
	[0.045, 1.485],
	[0.045, 1.51],
];
const PERSON: readonly Pt[] = [
	...HALF_FIGURE,
	...HALF_FIGURE.toReversed().map(([x, y]): Pt => [-x, y]),
];
const PLATFORMS = Array.from({ length: 6 }, (_, i) => 50 + i * 62);
/** Buildings per platform: offset, width, height. */
const BLOCKS: readonly (readonly [number, number, number])[][] = [
	[
		[6, 14, 7],
		[24, 10, 11],
		[38, 12, 6],
	],
	[
		[5, 18, 9],
		[28, 20, 14],
	],
	[
		[4, 12, 10],
		[20, 16, 48],
		[40, 11, 8],
	],
	[
		[6, 22, 12],
		[32, 16, 7],
	],
	[
		[8, 10, 6],
		[36, 14, 9],
	],
	[
		[5, 16, 8],
		[26, 9, 5],
	],
];
const SHIP_AT = -6_200;
const SHIP: Pt[] = [
	[-150, 14],
	[150, 14],
	[143, -12],
	[-146, -12],
];

/** Draws the whole elevation, from a person to the planet, for one camera. All geometry is to scale. */
export const drawScene = (ctx: CanvasRenderingContext2D, view: View, ink: Ink) => {
	const { width, height, anchor, span, centre, time } = view;
	const k = Math.min(width, height) / span;
	const planet = span > 900_000;
	const reach = (Math.hypot(width, height) / k) * 0.6;
	const visible: Range = planet ? [-HALF, HALF] : [centre[0] - reach, centre[0] + reach];

	/** Screen point for arc distance `s` along the sea, plus `x` along and `y` above the local surface. */
	const at = (s: number, x = 0, y = 0): Pt => {
		const t = s / R;
		const sin = Math.sin(t);
		const cos = Math.cos(t);
		const wx = R * sin + x * cos + y * sin;
		const wy = -2 * R * Math.sin(t / 2) ** 2 - x * sin + y * cos;
		return [anchor[0] + (wx - centre[0]) * k, anchor[1] - (wy - centre[1]) * k];
	};
	const px = (n: number) => n / k;

	const trace = (points: readonly Pt[], close = false) => {
		ctx.beginPath();
		for (const [i, [x, y]] of points.entries()) {
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		}
		if (close) ctx.closePath();
	};
	const stroke = (color: string, alpha: number, lineWidth = 1, dash: number[] = []) => {
		if (alpha <= 0.004) return;
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;
		ctx.setLineDash(dash);
		ctx.stroke();
	};
	const fill = (color: string, alpha: number) => {
		if (alpha <= 0.004) return;
		ctx.globalAlpha = alpha;
		ctx.fillStyle = color;
		ctx.fill();
	};
	/** A solid drawn in the local frame at `s`: filled with the ground so it hides what is behind. */
	const solid = (
		s: number,
		points: readonly Pt[],
		alpha: number,
		color = ink.line,
		dash: number[] = [],
	) => {
		if (alpha <= 0.004) return;
		trace(
			points.map(([x, y]) => at(s, x, y)),
			true,
		);
		fill(ink.ground, Math.min(1, alpha * 1.4));
		stroke(color, alpha, 1, dash);
	};
	const line = (
		s: number,
		points: readonly Pt[],
		alpha: number,
		color = ink.line,
		dash: number[] = [],
		w = 1,
	) => {
		if (alpha <= 0.004) return;
		trace(points.map(([x, y]) => at(s, x, y)));
		stroke(color, alpha, w, dash);
	};
	const label = (
		[x, y]: Pt,
		text: string,
		alpha: number,
		align: CanvasTextAlign = "left",
		color = ink.line,
	) => {
		if (alpha <= 0.004) return;
		ctx.globalAlpha = alpha;
		ctx.fillStyle = color;
		ctx.font = `500 10.5px ${ink.font}`;
		ctx.textAlign = align;
		ctx.textBaseline = "middle";
		ctx.fillText(text.toUpperCase(), x, y);
	};
	/** Dimension line between two local points, with end ticks and a label beside its middle. */
	const dimension = (s: number, a: Pt, b: Pt, text: string, alpha: number, side: 1 | -1 = 1) => {
		if (alpha <= 0.004) return;
		const p = at(s, a[0], a[1]);
		const q = at(s, b[0], b[1]);
		const length = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
		const n: Pt = [(-(q[1] - p[1]) / length) * 4, ((q[0] - p[0]) / length) * 4];
		trace([p, q]);
		stroke(ink.water, alpha * 0.9);
		for (const end of [p, q]) {
			trace([
				[end[0] - n[0], end[1] - n[1]],
				[end[0] + n[0], end[1] + n[1]],
			]);
			stroke(ink.water, alpha * 0.9);
		}
		const vertical = Math.abs(q[0] - p[0]) < Math.abs(q[1] - p[1]);
		const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
		label(
			vertical ? [mid[0] - side * 10, mid[1]] : [mid[0], mid[1] - side * 11],
			text,
			alpha,
			vertical ? (side > 0 ? "right" : "left") : "center",
			ink.water,
		);
	};
	/** A tick standing on the sea at `s`, labelled above. `level` staggers neighbours. */
	const marker = (
		s: number,
		text: string,
		alpha: number,
		level = 1,
		align: CanvasTextAlign = "center",
	) => {
		if (alpha <= 0.004) return;
		const top = px(6 + level * 12);
		line(
			s,
			[
				[0, 0],
				[0, top],
			],
			alpha * 0.8,
			ink.water,
		);
		const [x, y] = at(s, 0, top);
		label([x, y - 9], text, alpha, align, ink.water);
	};
	/** Path along the sea surface from `a` to `b`, `lift` metres above it. Returns false when off screen. */
	const arc = ([a, b]: Range, lift = 0, ripple = 0) => {
		const from = Math.max(a, visible[0]);
		const to = Math.min(b, visible[1]);
		if (to <= from) return false;
		const steps = planet ? Math.max(2, Math.ceil(((to - from) / R) * 60)) : 160;
		ctx.beginPath();
		for (let i = 0; i <= steps; i++) {
			const s = from + ((to - from) * i) / steps;
			const wave = ripple
				? ripple * (Math.sin(s * 0.82 + time * 0.7) + 0.5 * Math.sin(s * 1.9 - time * 1.1))
				: 0;
			const [x, y] = at(s, 0, lift + wave);
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		}
		return true;
	};
	const turns = [-2 * HALF, 0, 2 * HALF];
	const arcs = (ranges: readonly Range[], draw: () => void, lift = 0, ripple = 0) => {
		for (const [a, b] of ranges) {
			for (const turn of planet ? turns : [0]) {
				const from = Math.max(a + turn, -HALF);
				const to = Math.min(b + turn, HALF);
				if (to > from && arc([from, to], lift, ripple)) draw();
			}
		}
	};

	ctx.clearRect(0, 0, width, height);
	ctx.lineJoin = "round";
	ctx.lineCap = "butt";

	const close = upTo(span, 900, 4_000);
	const ripple = 0.09 * upTo(span, 60, 180);

	// Water body and seabed, while the camera is near enough for the sea to have thickness.
	if (!planet) {
		const steps = 160;
		const top: Pt[] = [];
		const bed: Pt[] = [];
		for (let i = 0; i <= steps; i++) {
			const s = visible[0] + ((visible[1] - visible[0]) * i) / steps;
			top.push(at(s));
			bed.push(at(s, 0, -depth(s)));
		}
		trace([...top, ...bed.reverse()], true);
		fill(ink.water, 0.075 * upTo(span, 300_000, 800_000));
		trace(bed);
		stroke(ink.line, 0.5 * into(span, 1_500, 5_000) * upTo(span, 300_000, 800_000));
		for (const [gap, alpha] of [
			[7, 0.3],
			[17, 0.2],
			[30, 0.11],
		] as const) {
			arcs(
				OCEAN,
				() => stroke(ink.water, alpha * upTo(span, 200_000, 700_000), 1, [14, 9]),
				-px(gap),
			);
		}
	}

	// Planet interior and edge of space.
	const whole = into(span, 5_000_000, 12_000_000);
	if (whole > 0) {
		const [ox, oy] = at(0, 0, -R);
		for (const radius of [3_480 * KM, 1_220 * KM]) {
			ctx.beginPath();
			ctx.arc(ox, oy, radius * k, 0, Math.PI * 2);
			stroke(ink.line, 0.14 * whole, 1, [2, 5]);
		}
		ctx.beginPath();
		ctx.arc(ox, oy, (R + 100 * KM) * k, 0, Math.PI * 2);
		stroke(ink.line, 0.3 * whole, 1, [3, 6]);
		trace([
			[ox - R * k, oy],
			[ox + R * k, oy],
		]);
		stroke(ink.water, 0.55 * whole, 1, [5, 5]);
		label([ox, oy - 11], "12,742 km", whole, "center", ink.water);
		const [ex, ey] = at(0.62 * HALF * 0.5, 0, 100 * KM);
		if (width >= 600) label([ex + 8, ey - 8], "100 km · edge of space", whole * 0.75);
	}

	// The sea surface, land, and the high seas beyond 200 nm.
	arcs(OCEAN, () => stroke(ink.water, 0.95, 1.25), 0, ripple);
	arcs(LAND, () => stroke(ink.line, 0.95, planet ? 3 : 2.5));
	const beyond = into(span, 150_000, 500_000);
	arcs(HIGH_SEAS, () => stroke(ink.water, 0.9 * beyond, 2.5), px(7));
	arcs(
		OCEAN.flatMap(([a, b]): Range[] => [
			[a, a + EEZ],
			[b - EEZ, b],
		]),
		() => stroke(ink.water, 0.45 * beyond, 1, [2, 3]),
		px(7),
	);

	// Mooring line and the water under the keel.
	const deep = into(span, 400, 2_500) * upTo(span, 200_000, 700_000);
	if (deep > 0) {
		const floor = -depth(620);
		line(
			0,
			Array.from({ length: 24 }, (_, i): Pt => {
				const t = i / 23;
				return [8 + 612 * t ** 2.4, -1.4 + (floor + 1.4) * t ** 0.8];
			}),
			0.55 * deep,
		);
		dimension(
			0,
			[-px(34), 0],
			[-px(34), -depth(0)],
			"4,000 m",
			into(span, 4_000, 9_000) * upTo(span, 60_000, 200_000),
		);
	}

	// Passing ship and the horizon.
	const far = into(span, 1_500, 5_000) * upTo(span, 120_000, 400_000);
	if (far > 0) {
		solid(SHIP_AT, SHIP, far);
		for (let i = 0; i < 9; i++)
			solid(SHIP_AT, rect(-128 + i * 26, 14, 23, 18 + (i % 3) * 4), far * 0.8);
		solid(SHIP_AT, rect(112, 14, 16, 38), far);
		const named = into(span, 5_000, 10_000) * upTo(span, 40_000, 110_000);
		const [sx, sy] = at(SHIP_AT, 0, 80);
		label([sx, sy - 12], "Container ship · 300 m", named, "center");
		marker(HORIZON, "Horizon · 7 km", named, 1);
		marker(-HORIZON, "", named, 1);
	}

	// Maritime zones off the nearest coast.
	const zones = into(span, 120_000, 400_000) * upTo(span, 2_500_000, 6_000_000);
	marker(COAST, "Coast", zones, 3, "right");
	marker(COAST + 12 * NM, "12 nm", zones, 1.6);
	marker(COAST + EEZ, "200 nm", zones, 3);
	const named = (s: number, text: string, alpha: number) => {
		const [x, y] = at(s, 0, px(7));
		label([x, y - 11], text, alpha, "center", ink.water);
	};
	named(
		COAST + EEZ / 2 + (width < 600 ? 40 * KM : 0),
		width < 600 ? "EEZ" : "Exclusive economic zone",
		zones * into(span, 300_000, 700_000) * upTo(span, 1_600_000, 3_000_000),
	);
	named(170 * KM, "High seas", zones * into(span, 300_000, 700_000));
	const [lx, ly] = at(COAST - 190 * KM, 0, 0);
	label([lx, ly + 16], "Land", zones, "center");

	// The settlement as a point, once it is too small to draw.
	const dot = into(span, 30_000, 120_000);
	if (dot > 0) {
		const [x, y] = at(0);
		ctx.beginPath();
		ctx.arc(x, y, 3.5, 0, Math.PI * 2);
		fill(ink.ground, dot);
		stroke(ink.water, dot, 1.5);
		if (width < 600) label([x, y + 17], "Settlement", dot, "center", ink.water);
		else label([x + 9, y + 15], "Settlement", dot, "left", ink.water);
	}

	// Proposed settlement: platforms, towers, a turbine. Dashed: not built.
	const plan = into(span, 110, 320) * upTo(span, 20_000, 90_000);
	if (plan > 0) {
		const dash = [5, 4];
		for (const [i, x] of PLATFORMS.entries()) {
			solid(0, rect(x, -3, 56, 6.2), plan, ink.water, dash);
			for (const [offset, w, h] of BLOCKS[i] ?? [])
				solid(0, rect(x + offset, 3.2, w, h), plan, ink.water, dash);
			if (i)
				line(
					0,
					[
						[x - 6, 2.6],
						[x, 2.6],
					],
					plan,
					ink.water,
					dash,
				);
		}
		line(
			0,
			[
				[38, DECK],
				[50, 3],
			],
			plan,
			ink.water,
			dash,
		);
		const mast = (PLATFORMS[4] ?? 0) + 28;
		line(
			0,
			[
				[mast - 1.4, 3.2],
				[mast - 0.6, 66],
				[mast + 0.6, 66],
				[mast + 1.4, 3.2],
			],
			plan,
			ink.water,
			dash,
		);
		for (let blade = 0; blade < 3; blade++) {
			const a = time * 0.25 + (blade * Math.PI * 2) / 3;
			line(
				0,
				[
					[mast, 66],
					[mast + Math.cos(a) * 30, 66 + Math.sin(a) * 30],
				],
				plan,
				ink.water,
			);
		}
		const titled = plan * into(span, 300, 520) * upTo(span, 3_000, 9_000);
		dimension(0, [50, 108], [416, 108], "Proposed · 370 m", titled);
	}

	// The barge and what it carries.
	if (close > 0) {
		const fine = upTo(span, 220, 700);
		// Railing behind everything.
		line(
			0,
			[
				[-21, DECK + 1.1],
				[37, DECK + 1.1],
			],
			close * fine * 0.6,
		);
		line(
			0,
			[
				[-21, DECK + 0.55],
				[37, DECK + 0.55],
			],
			close * fine * 0.35,
		);
		for (let x = -21; x <= 37; x += 2)
			line(
				0,
				[
					[x, DECK],
					[x, DECK + 1.1],
				],
				close * fine * 0.45,
			);

		solid(0, rect(CABIN.x, DECK, CABIN.w, CABIN.h), close);
		solid(0, rect(CABIN.x - 0.3, DECK + CABIN.h, CABIN.w + 0.6, 0.25), close * fine);
		for (const storey of [0.9, 3.4]) {
			for (let i = 0; i < 3; i++)
				solid(0, rect(CABIN.x + 0.8 + i * 1.9, DECK + storey, 1.1, 1), close * fine * 0.8);
		}
		line(
			0,
			[
				[CABIN.x + 3, DECK + CABIN.h],
				[CABIN.x + 3, DECK + 14],
			],
			close * upTo(span, 400, 1_500),
		);
		line(
			0,
			[
				[CABIN.x + 1.8, DECK + 11.5],
				[CABIN.x + 4.2, DECK + 11.5],
			],
			close * fine,
		);

		const ribs = upTo(span, 28, 90);
		for (const [x, tier] of BOXES) {
			const y = DECK + tier * BOX.h;
			solid(0, rect(x, y, BOX.w, BOX.h), close);
			for (let rib = 0.3; rib < BOX.w - 0.1 && ribs > 0; rib += 0.29) {
				line(
					0,
					[
						[x + rib, y + 0.14],
						[x + rib, y + BOX.h - 0.14],
					],
					close * ribs * 0.28,
				);
			}
		}
		solid(0, HULL, close);
		line(
			0,
			[
				[-21.6, DECK - 0.4],
				[37.5, DECK - 0.4],
			],
			close * fine * 0.5,
		);
		for (const x of [-18, 9.4, 30.8, 34]) solid(0, rect(x, DECK, 0.5, 0.4), close * fine);
		// Re-draw the waterline across the hull.
		line(
			0,
			[
				[-20.6, 0],
				[36.9, 0],
			],
			close * 0.5,
			ink.water,
		);

		const figure = upTo(span, 260, 900) * close;
		solid(
			0,
			PERSON.map(([x, y]): Pt => [x, y + DECK]),
			figure,
		);
		if (figure > 0) {
			const [hx, hy] = at(0, 0, DECK + 1.6);
			ctx.beginPath();
			ctx.arc(hx, hy, Math.max(0.105 * k, 0.6), 0, Math.PI * 2);
			fill(ink.ground, figure);
			stroke(ink.line, figure);
		}

		dimension(0, [-0.62, DECK], [-0.62, DECK + 1.7], "1.7 m", upTo(span, 9, 26));
		dimension(
			0,
			[3, DECK + 2 * BOX.h + 0.45],
			[3 + BOX.w, DECK + 2 * BOX.h + 0.45],
			"6.1 m",
			into(span, 6, 10) * upTo(span, 50, 130),
		);
		dimension(0, [-22, -5.5], [38, -5.5], "60 m", into(span, 45, 75) * upTo(span, 450, 1_200), -1);
	}

	ctx.globalAlpha = 1;
	ctx.setLineDash([]);
};
