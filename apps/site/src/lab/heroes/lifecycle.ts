import { HERO_KEY, SYNC_EVENT } from "./shared";

type Stop = () => void;

/** Runs `start` while the hero variant `id` is the one shown; its return value runs when it is switched away. */
export const onVariant = (id: string, start: (root: HTMLElement) => Stop | undefined) => {
	const root = document.querySelector<HTMLElement>(
		`[data-experiment="${HERO_KEY}"][data-variant="${id}"]`,
	);
	if (!root) return;
	let on = false;
	let stop: Stop | undefined;
	const activate = () => {
		if (on) return;
		on = true;
		stop = start(root);
	};
	const deactivate = () => {
		if (!on) return;
		on = false;
		stop?.();
	};
	root.addEventListener(`${HERO_KEY}:activate`, activate);
	root.addEventListener(`${HERO_KEY}:deactivate`, deactivate);
	addEventListener("pagehide", deactivate);
	if (root.hasAttribute("data-active")) activate();
};

/** Starts the variant's lazy videos; the returned stop pauses them. */
export const playVideos = (root: HTMLElement): Stop => {
	const videos = [...root.querySelectorAll<HTMLVideoElement>("video[data-src]")];
	for (const video of videos) {
		if (!video.src) {
			video.addEventListener("playing", () => video.setAttribute("data-playing", ""), {
				once: true,
			});
			video.src = video.dataset.src ?? "";
		}
		video.play().catch(() => {});
	}
	return () => {
		for (const video of videos) video.pause();
	};
};

/** Calls `update` with scroll progress (0–1) over the first `span` viewport-heights of `section`. */
export const onScrollThrough = (
	section: HTMLElement,
	span: number,
	update: (progress: number) => void,
): Stop => {
	let frame = 0;
	const run = () => {
		frame = 0;
		const top = section.getBoundingClientRect().top;
		update(Math.min(Math.max(-top / (innerHeight * span), 0), 1));
	};
	const queue = () => {
		frame ||= requestAnimationFrame(run);
	};
	run();
	addEventListener("scroll", queue, { passive: true });
	addEventListener("resize", queue);
	return () => {
		cancelAnimationFrame(frame);
		removeEventListener("scroll", queue);
		removeEventListener("resize", queue);
	};
};

/** Re-measures the active variant for the site header (title anchor, top text tone). */
export const syncHeader = () =>
	document.querySelector("[data-heroes]")?.dispatchEvent(new Event(SYNC_EVENT));
