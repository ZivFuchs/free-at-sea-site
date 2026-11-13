/** A synthesised underwater soundscape, described as events the plot draws and the audio plays. Illustrative, not recorded. */

export const F_MIN = 10;
export const F_MAX = 24000;

export const SOURCES = [
	"rain",
	"shrimp",
	"dolphin",
	"vessel",
	"humpback",
	"fin",
	"sperm",
	"rumble",
] as const;
export type Source = (typeof SOURCES)[number];
export type Mix = Record<Source, number>;

interface Timed {
	source: Source;
	start: number;
	duration: number;
	level: number;
}
/** A voiced sound following `contour` (Hz, evenly spaced over the duration), with overtones. */
export interface Tone extends Timed {
	kind: "tone";
	contour: readonly number[];
	harmonics: number;
	/** Amplitude pulsing, Hz. */
	pulse?: number;
}
/** A broadband impulse between two frequencies. */
export interface Click extends Omit<Timed, "duration"> {
	kind: "click";
	low: number;
	high: number;
}
/** A swell of noise between two frequencies. */
export interface Band extends Timed {
	kind: "band";
	low: number;
	high: number;
}
export type SoundEvent = Tone | Click | Band;

/** A researcher's bracket around something on the plot. */
export interface Tag {
	label: string;
	start: number;
	end: number;
	low: number;
	high: number;
	/** Source weight when composed, 0–1: faint sounds get faint brackets. */
	strength: number;
}

export interface Zone {
	depth: number;
	name: string;
	mix: Mix;
}

/** What a hydrophone hears at each listening depth: weights per source, 0–1. */
export const ZONES: readonly Zone[] = [
	{
		depth: 5,
		name: "Surface layer",
		mix: {
			rain: 0.8,
			shrimp: 1,
			dolphin: 1,
			vessel: 1,
			humpback: 0.2,
			fin: 0,
			sperm: 0,
			rumble: 0,
		},
	},
	{
		depth: 150,
		name: "Below the mixed layer",
		mix: {
			rain: 0.12,
			shrimp: 0.2,
			dolphin: 0.3,
			vessel: 0.45,
			humpback: 1,
			fin: 0.2,
			sperm: 0,
			rumble: 0,
		},
	},
	{
		depth: 1000,
		name: "Deep sound channel",
		mix: {
			rain: 0,
			shrimp: 0,
			dolphin: 0,
			vessel: 0.6,
			humpback: 0.3,
			fin: 1,
			sperm: 0.35,
			rumble: 0.4,
		},
	},
	{
		depth: 3000,
		name: "Abyss",
		mix: {
			rain: 0,
			shrimp: 0,
			dolphin: 0,
			vessel: 0.2,
			humpback: 0,
			fin: 0.5,
			sperm: 1,
			rumble: 1,
		},
	},
];

/** Blade-rate harmonics and machinery lines of one passing ship, Hz. */
export const VESSEL_LINES = [31, 62, 93, 124, 180, 360] as const;
const VESSEL_FIRST_PASS = 10;
const VESSEL_PERIOD = 100;
const VESSEL_SPAN = 24;

const nearestPass = (t: number) =>
	VESSEL_FIRST_PASS + Math.round((t - VESSEL_FIRST_PASS) / VESSEL_PERIOD) * VESSEL_PERIOD;
/** Loudness of the ship, 0–1: it approaches, passes, recedes. */
export const vesselLevel = (t: number) => Math.exp(-(((t - nearestPass(t)) / VESSEL_SPAN) ** 2));
/** Doppler factor on its lines: high on approach, low once past. */
export const vesselShift = (t: number) => 1 - 0.012 * Math.tanh((t - nearestPass(t)) / 10);

export const hz = (f: number) =>
	f >= 1000 ? `${(f / 1000).toFixed(f < 10000 ? 1 : 0)} kHz` : `${Math.round(f / 10) * 10} Hz`;

const mulberry = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SAMPLES = 24;
const contour = (f: (u: number) => number) =>
	Array.from({ length: SAMPLES }, (_, i) => f(i / (SAMPLES - 1)));

/** Seconds ahead of "now" that events are composed, so audio can be scheduled on time. */
const LEAD = 0.4;

export const createSea = (seed: number, from: number) => {
	const random = mulberry(seed);
	const between = (a: number, b: number) => a + (b - a) * random();
	const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)] as T;

	const events: SoundEvent[] = [];
	const tags: Tag[] = [];
	const next: Record<Exclude<Source, "rain" | "shrimp" | "vessel">, number> = {
		humpback: from + 2,
		dolphin: from + 1,
		fin: from + 3,
		sperm: from + 1.5,
		rumble: from + 9,
	};

	type Unit = Pick<Tone, "contour" | "duration" | "harmonics" | "pulse"> & { name: string };
	const units: readonly (() => Unit)[] = [
		() => {
			const f = between(140, 260);
			return {
				name: "moan",
				duration: between(1.2, 2.1),
				harmonics: 7,
				contour: contour((u) => f * (1 + 0.07 * Math.sin(u * Math.PI) - 0.1 * u)),
			};
		},
		() => {
			const [a, b] = [between(180, 260), between(600, 1100)];
			return {
				name: "upsweep",
				duration: between(0.6, 1.1),
				harmonics: 4,
				contour: contour((u) => a * (b / a) ** (u * u)),
			};
		},
		() => {
			const [a, b] = [between(900, 1400), between(250, 400)];
			return {
				name: "downsweep",
				duration: between(0.7, 1.2),
				harmonics: 4,
				contour: contour((u) => a * (b / a) ** Math.sqrt(u)),
			};
		},
		() => {
			const f = between(280, 360);
			return {
				name: "whoop",
				duration: between(0.8, 1.2),
				harmonics: 5,
				contour: contour((u) => f * (1 + 1.4 * Math.sin(u * Math.PI) ** 2 + 0.2 * u)),
			};
		},
		() => {
			const f = between(70, 110);
			return {
				name: "grunt",
				duration: between(0.8, 1.4),
				harmonics: 10,
				pulse: between(9, 14),
				contour: contour(() => f),
			};
		},
		() => {
			const [f, cycles] = [between(1500, 2600), between(5, 8)];
			return {
				name: "cry",
				duration: between(1, 1.7),
				harmonics: 3,
				contour: contour((u) => f * (1 + 0.06 * Math.sin(u * cycles * 2 * Math.PI) - 0.12 * u)),
			};
		},
	];

	const range = (c: readonly number[]) => [Math.min(...c), Math.max(...c)] as const;

	/** A phrase of song units, sung twice: humpbacks repeat themselves. */
	const humpback = (start: number, weight: number) => {
		const phrase = Array.from({ length: Math.round(between(3, 5)) }, () => pick(units)());
		const gaps = phrase.map(() => between(0.25, 0.7));
		let t = start;
		for (const repeat of [0, 1]) {
			const began = t;
			let [low, high] = [F_MAX, F_MIN];
			phrase.forEach((unit, i) => {
				const { name, ...tone } = unit;
				events.push({
					kind: "tone",
					source: "humpback",
					start: t,
					level: 0.95 * weight ** 0.7,
					...tone,
				});
				const [a, b] = range(unit.contour);
				[low, high] = [Math.min(low, a), Math.max(high, b)];
				if (!repeat && i < 2)
					tags.push({
						strength: weight,
						label: `Humpback · ${name} · ${hz((a + b) / 2)}`,
						start: t,
						end: t + unit.duration,
						low: a,
						high: b,
					});
				t += unit.duration + (gaps[i] ?? 0.4);
			});
			if (repeat)
				tags.push({
					strength: weight,
					label: "Phrase repeats",
					start: began,
					end: t - 0.3,
					low,
					high,
				});
			t += between(0.8, 1.6);
		}
		return t + between(2.5, 5);
	};

	const whistles: readonly (() => (u: number) => number)[] = [
		() => {
			const [a, b] = [between(6500, 9000), between(12000, 16000)];
			return (u) => a + (b - a) * u ** 1.5;
		},
		() => {
			const [f, depth, cycles] = [between(9000, 12500), between(1800, 3200), between(1.5, 2.6)];
			return (u) => f + depth * Math.sin(u * cycles * 2 * Math.PI);
		},
		() => {
			const [a, b] = [between(7000, 9000), between(13000, 17000)];
			return (u) => a + (b - a) * Math.sin(u * Math.PI) ** 1.4;
		},
	];

	const dolphin = (start: number, weight: number) => {
		const level = 0.8 * weight ** 0.7;
		let t = start;
		const count = Math.round(between(2, 4));
		for (let i = 0; i < count; i++) {
			const duration = between(0.4, 1.1);
			const c = contour(pick(whistles)());
			events.push({
				kind: "tone",
				source: "dolphin",
				start: t,
				duration,
				level,
				harmonics: 2,
				contour: c,
			});
			if (i === 0) {
				const [a, b] = range(c);
				tags.push({
					strength: weight,
					label: `Dolphin · whistle · ${Math.round(a / 1000)}–${hz(b)}`,
					start: t,
					end: t + duration,
					low: a,
					high: b,
				});
			}
			t += duration * between(0.5, 1.3);
		}
		if (random() < 0.6) {
			t += between(0.2, 0.8);
			const began = t;
			const clicks = Math.round(between(24, 46));
			for (let i = 0; i < clicks; i++) {
				events.push({
					kind: "click",
					source: "dolphin",
					start: t,
					level: level * between(0.6, 1),
					low: 9000,
					high: F_MAX,
				});
				t += 0.07 * (1 - i / clicks) ** 1.6 + 0.008;
			}
			tags.push({
				strength: weight,
				label: "Echolocation · click train",
				start: began,
				end: t,
				low: 9000,
				high: 22000,
			});
		}
		return t + between(2, 5.5);
	};

	const fin = (start: number, weight: number) => {
		events.push({
			kind: "tone",
			source: "fin",
			start,
			duration: 1,
			level: 1.1 * weight ** 0.7,
			harmonics: 1,
			contour: contour((u) => 24 - 7 * u),
		});
		tags.push({
			strength: weight,
			label: "Fin whale · 20 Hz pulse",
			start,
			end: start + 1,
			low: 16,
			high: 25,
		});
		return start + between(8.5, 11);
	};

	const sperm = (start: number, weight: number) => {
		const interval = between(0.55, 0.9);
		const until = start + between(10, 18);
		let t = start;
		while (t < until) {
			events.push({
				kind: "click",
				source: "sperm",
				start: t,
				level: weight ** 0.7 * between(0.75, 1),
				low: 2200,
				high: 16000,
			});
			t += interval * between(0.97, 1.03);
		}
		tags.push({
			strength: weight,
			label: `Sperm whale · clicks · ${interval.toFixed(1)} s apart`,
			start,
			end: start + interval * 4,
			low: 2200,
			high: 16000,
		});
		return until + between(3, 6);
	};

	const rumble = (start: number, weight: number) => {
		const duration = between(5, 8);
		events.push({
			kind: "band",
			source: "rumble",
			start,
			duration,
			level: 0.55 * weight,
			low: F_MIN,
			high: 42,
		});
		tags.push({
			strength: weight,
			label: "Seismic · distant",
			start: start + duration * 0.25,
			end: start + duration * 0.75,
			low: 11,
			high: 40,
		});
		return start + duration + between(14, 24);
	};

	const voices = { humpback, dolphin, fin, sperm, rumble };
	const voiced = Object.keys(voices) as (keyof typeof voices)[];

	return {
		events,
		tags,
		/** Composes whatever is due by `now`; returns the events added. `keep` seconds of the past stay for drawing. */
		advance(now: number, mix: Mix, keep: number) {
			const before = events.length;
			for (const source of voiced) {
				if (now + LEAD < next[source]) continue;
				const start = Math.max(next[source], now + LEAD);
				next[source] = mix[source] > 0.08 ? voices[source](start, mix[source]) : now + 1.5;
			}
			const fresh = events.slice(before);
			const drop = (list: (SoundEvent | Tag)[], end: (item: never) => number) => {
				for (let i = list.length - 1; i >= 0; i--) {
					if (end(list[i] as never) < now - keep) list.splice(i, 1);
				}
			};
			drop(events, (e: SoundEvent) => e.start + (e.kind === "click" ? 0 : e.duration));
			drop(tags, (t: Tag) => t.end);
			return fresh;
		},
	};
};

export type Sea = ReturnType<typeof createSea>;
