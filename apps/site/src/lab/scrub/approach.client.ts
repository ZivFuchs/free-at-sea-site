import { clamp, damp, lerp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";

const FRAME_ASPECT = 16 / 9;
/** Where the barge sits in the footage, and how much of the frame's width it spans. */
const BARGE = { x: 0.515, y: 0.63, width: 0.115 } as const;
/** Where the barge ends up on screen. */
const TARGET = { x: 0.5, y: 0.58 } as const;
/** The push-in stops when the barge is this wide: a share of the viewport, capped in px. */
const ARRIVAL = { share: 0.8, max: 640 } as const;
const ZOOM = { min: 1.5, max: 3.5 } as const;
/** Footage runs forward, back, forward over the scroll, so there is no loop cut. */
const PASSES = 3;
/** Invented: range to the vessel at the first frame and the last, nautical miles. */
const RANGE = { far: 2.4, near: 0.08 } as const;
/** Median seek slower than this and the footage just plays; only the camera follows scroll. */
const SLOW_SEEK_MS = 140;
const SEEK_SAMPLES = 8;
const FADE = 0.04;

const all = <T extends HTMLElement>(root: Document | HTMLElement, selector: string) => [
	...root.querySelectorAll<T>(selector),
];

const median = (values: readonly number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

/** Seeks one frame at a time, never queueing; gives up on scrubbing if this device seeks slowly. */
const scrubber = (video: HTMLVideoElement, track: HTMLElement) => {
	const samples: number[] = [];
	let started = 0;
	let playing = false;

	video.addEventListener("seeked", () => {
		video.setAttribute("data-playing", "");
		if (!started || playing) return;
		samples.push(performance.now() - started);
		started = 0;
		if (samples.length !== SEEK_SAMPLES || median(samples) < SLOW_SEEK_MS) return;
		playing = true;
		track.dataset.mode = "play";
		video.loop = true;
		video.play().catch(() => {});
	});
	video.addEventListener(
		"loadeddata",
		() => {
			video.setAttribute("data-playing", "");
			// iOS paints seeked frames only after playback has started once.
			video
				.play()
				.then(() => !playing && video.pause())
				.catch(() => {});
		},
		{ once: true },
	);
	track.dataset.mode = "scrub";
	video.src = video.dataset.src ?? "";
	video.load();

	return (progress: number) => {
		if (playing || video.seeking || video.readyState < 2 || !Number.isFinite(video.duration))
			return;
		const phase = (progress * PASSES) % 2;
		const time = (1 - Math.abs(phase - 1)) * (video.duration - 0.05);
		if (Math.abs(video.currentTime - time) < 1 / 60) return;
		started = performance.now();
		video.currentTime = time;
	};
};

const run = (track: HTMLElement) => {
	const stage = track.querySelector<HTMLElement>("[data-stage]");
	const camera = track.querySelector<HTMLElement>("[data-camera]");
	if (!stage || !camera) return;

	const video = track.querySelector<HTMLVideoElement>("video[data-src]");
	const header = document.querySelector<HTMLElement>("[data-approach-header]");
	const fading = all(track, "[data-title-fade]");
	const chapters = all(track, "[data-from]").map((el) => ({
		el,
		from: Number(el.dataset.from),
		to: Number(el.dataset.to),
	}));
	const range = track.querySelector<HTMLElement>("[data-range]");
	const clock = track.querySelector<HTMLElement>("[data-clock]");
	const horizon = Number(track.dataset.horizon ?? 0.5);

	const backdrop = track.querySelector("img");
	Promise.race([
		Promise.all([document.fonts.ready, backdrop?.decode().catch(() => {})]),
		new Promise((resolve) => setTimeout(resolve, 2500)),
	]).then(() => stage.setAttribute("data-ready", ""));

	const shot = { x: 0, y: 0, width: 0, height: 0, px: 0, py: 0, zoom: 1 };
	const layout = () => {
		const { clientWidth: w, clientHeight: h } = stage;
		shot.width = Math.max(w, h * FRAME_ASPECT);
		shot.height = shot.width / FRAME_ASPECT;
		shot.x = (w - shot.width) / 2;
		shot.y = (h - shot.height) * horizon;
		shot.px = shot.x + BARGE.x * shot.width;
		shot.py = shot.y + BARGE.y * shot.height;
		shot.zoom = clamp(
			Math.min(w * ARRIVAL.share, ARRIVAL.max) / (BARGE.width * shot.width),
			ZOOM.min,
			ZOOM.max,
		);
		camera.style.transformOrigin = `${shot.px}px ${shot.py}px`;
		drawn = -1;
	};

	const seek = video && scrubber(video, track);
	let p = -1;
	let drawn = -1;

	const draw = () => {
		const { clientWidth: w, clientHeight: h } = stage;
		const travel = smoothstep(0.03, 0.95, p);
		const scale = shot.zoom ** travel;
		// Bring the barge to its mark without ever showing past the footage's edges.
		const x = clamp(
			(TARGET.x * w - shot.px) * travel,
			w - shot.px - (shot.x + shot.width - shot.px) * scale,
			(shot.px - shot.x) * scale - shot.px,
		);
		const y = clamp(
			(TARGET.y * h - shot.py) * travel,
			h - shot.py - (shot.y + shot.height - shot.py) * scale,
			(shot.py - shot.y) * scale - shot.py,
		);
		camera.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;

		stage.style.setProperty("--p", String(p));
		stage.style.setProperty("--dim", String(smoothstep(0.08, 0.2, p)));
		const leaving = smoothstep(0.05, 0.13, p);
		for (const el of fading) el.style.opacity = String(0.85 * (1 - leaving));
		header?.style.setProperty("--mark", String(leaving));

		for (const { el, from, to } of chapters) {
			const rise = smoothstep(from, from + FADE, p);
			const clear = smoothstep(to - FADE, to, p);
			el.style.opacity = String(rise * (1 - clear));
			el.style.translate = `0 ${lerp(14, 0, rise) - 14 * clear}px`;
		}
		if (range) range.textContent = (RANGE.far * (RANGE.near / RANGE.far) ** travel).toFixed(2);
	};

	const loop = onFrame(
		track,
		(_, dt) => {
			const rect = track.getBoundingClientRect();
			const target = clamp(-rect.top / Math.max(1, rect.height - innerHeight));
			p = p < 0 ? target : damp(p, target, 6, dt);
			if (Math.abs(target - p) < 0.0002) p = target;

			if (video && clock) clock.textContent = video.currentTime.toFixed(2);
			seek?.(p);
			if (p === drawn) return;
			drawn = p;
			draw();
		},
		{ margin: "400px" },
	);

	/** The bar turns to glass as the shot releases. On scroll, not in the loop, which sleeps off screen. */
	const glass = () => {
		if (!header) return;
		const { bottom } = track.getBoundingClientRect();
		const past = 1 - clamp((bottom - header.offsetHeight) / (innerHeight * 0.25));
		header.style.setProperty("--solid", String(past));
	};
	addEventListener("scroll", glass, { passive: true });
	glass();

	const resize = new ResizeObserver(layout);
	resize.observe(stage);
	layout();
	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			resize.disconnect();
			video?.pause();
		},
		{ once: true },
	);
};

export const approach = () => {
	for (const track of all(document, "[data-approach]")) {
		if (reducedMotion()) {
			track.querySelector("[data-stage]")?.setAttribute("data-ready", "");
			const header = document.querySelector<HTMLElement>("[data-approach-header]");
			header?.style.setProperty("--solid", "1");
			header?.style.setProperty("--mark", "1");
			continue;
		}
		run(track);
	}
};
