import { clamp, lerp, smoothstep } from "@/lab/lib/motion";

const KINDS = { whale: 0, pod: 1, ray: 2, school: 3 } as const;
export type Kind = keyof typeof KINDS | "surface";

type Vec = readonly [number, number];

interface Pass {
	kind: Kind;
	from: Vec;
	to: Vec;
	start: number;
	duration: number;
	/** Scroll since the pass began, in viewport heights: deep things lag the page. */
	drift: number;
	/** Holds the pass at this progress (review links, reduced motion). */
	hold?: number;
}

const SPEC: Record<Kind, { scale: number; vis: number; duration: number; beat: number }> = {
	whale: { scale: 0.85, vis: 0.8, duration: 26, beat: 0.9 },
	surface: { scale: 0.7, vis: 0.9, duration: 30, beat: 0.6 },
	pod: { scale: 0.85, vis: 0.85, duration: 20, beat: 1.8 },
	ray: { scale: 0.3, vis: 0.75, duration: 24, beat: 1.5 },
	school: { scale: 0.55, vis: 1, duration: 22, beat: 0 },
};
const IDLE: readonly Kind[] = ["whale", "school", "pod", "ray", "whale"];
/** Seconds of empty water between idle passes, and before the same scroll cue fires again. */
const GAP = [38, 70] as const;
const COOLDOWN = 45;
const PARALLAX = 0.45;

const random = (min: number, max: number) => lerp(min, max, Math.random());

/** Schedules what passes under the page and reports it as shader uniforms. */
export const encounters = (aspect: () => number, still: boolean) => {
	let pass: Pass | null = null;
	let nextIdle = 5;
	let idleIndex = 0;
	let lastScroll = scrollY;
	let now = 0;
	const cued = new Map<Kind, number>();
	/** Narrow screens get a smaller animal, so its outline still fits and reads. */
	const size = (kind: Kind) => SPEC[kind].scale * clamp(aspect() * 1.25, 0.6, 1);

	const begin = (kind: Kind, hold?: number) => {
		const { duration } = SPEC[kind];
		const scale = size(kind);
		const reach = Math.hypot(aspect() / 2, 0.5) + scale * 1.15;
		// Mostly along the long diagonal, either way.
		const angle =
			(Math.random() < 0.5 ? 0 : Math.PI) + random(0.5, 1.05) * (Math.random() < 0.5 ? 1 : -1);
		const dir: Vec = [Math.cos(angle), Math.sin(angle)];
		const side = kind === "surface" ? -0.08 : random(-0.16, 0.16);
		const off: Vec = [-dir[1] * side, dir[0] * side];
		pass = {
			kind,
			from: [off[0] - dir[0] * reach, off[1] - dir[1] * reach],
			to: [off[0] + dir[0] * reach, off[1] + dir[1] * reach],
			start: now,
			duration,
			drift: 0,
			hold,
		};
	};

	return {
		/** A scroll-authored moment: at most once per cooldown, never over a pass already under way. */
		cue: (kind: Kind) => {
			if (still || pass?.hold !== undefined) return;
			if (now - (cued.get(kind) ?? -Infinity) < COOLDOWN) return;
			if (pass && kind !== "surface") return;
			cued.set(kind, now);
			begin(kind);
		},
		hold: (kind: Kind, at = 0.5) => begin(kind, at),
		uniforms: (time: number): Record<string, number | Vec> => {
			now = time;
			const ds = (scrollY - lastScroll) / innerHeight;
			lastScroll = scrollY;
			if (!pass && !still && time > nextIdle) {
				begin(IDLE[idleIndex++ % IDLE.length] ?? "whale");
			}
			if (!pass) return { u_vis: 0, u_surf: 0, u_ring: 0 };

			if (pass.hold === undefined) pass.drift += ds * PARALLAX;
			const t = pass.hold ?? (time - pass.start) / pass.duration;
			if (t >= 1) {
				pass = null;
				nextIdle = time + random(...GAP);
				return { u_vis: 0, u_surf: 0, u_ring: 0 };
			}
			const { kind, from, to, drift } = pass;
			const { vis, beat } = SPEC[kind];
			const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
			const surfacing = kind === "surface";
			return {
				u_pos: [lerp(from[0], to[0], t), lerp(from[1], to[1], t) + drift] as const,
				u_dir: [(to[0] - from[0]) / length, (to[1] - from[1]) / length] as const,
				u_scale: size(kind),
				u_kind: KINDS[surfacing ? "whale" : kind],
				u_vis: vis * smoothstep(0, 0.12, t) * smoothstep(1, 0.88, t),
				u_beat: time * beat,
				u_surf: surfacing ? smoothstep(0.34, 0.5, t) * smoothstep(0.74, 0.6, t) : 0,
				u_ring: surfacing ? clamp((t - 0.46) / 0.3) : 0,
			};
		},
	};
};
