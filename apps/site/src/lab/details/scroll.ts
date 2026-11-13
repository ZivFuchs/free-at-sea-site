import { clamp } from "@/lab/lib/motion";

export const sectionEls = () => [...document.querySelectorAll<HTMLElement>("[data-section]")];

/** The section under the reader's eye: the last one whose top has passed 45% of the viewport. */
export const currentSection = (els: readonly HTMLElement[]) =>
	els.findLast((el) => el.getBoundingClientRect().top <= innerHeight * 0.45) ?? els[0];

/** Where a section starts along the page's scroll, 0–1. */
export const sectionAt = (el: HTMLElement) => {
	const max = document.documentElement.scrollHeight - innerHeight;
	return max > 0 ? clamp((el.getBoundingClientRect().top + scrollY) / max) : 0;
};

/** Runs `fn` now and once per frame on scroll or resize. Returns a stop function. */
export const onScroll = (fn: () => void) => {
	let frame = 0;
	const run = () => {
		frame = 0;
		fn();
	};
	const queue = () => {
		frame ||= requestAnimationFrame(run);
	};
	fn();
	addEventListener("scroll", queue, { passive: true });
	addEventListener("resize", queue);
	return () => {
		cancelAnimationFrame(frame);
		removeEventListener("scroll", queue);
		removeEventListener("resize", queue);
	};
};
