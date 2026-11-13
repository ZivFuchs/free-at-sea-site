import { reducedMotion } from "@/lab/lib/motion";

const EDGE_W = 14;
const EDGE_H = 30;
const DURATION = 1300;
const GHOST = "rgb(0 0 0 / 0.16)";
/** A vertical wave front: solid to its left. */
const EDGE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${EDGE_W} ${EDGE_H}'%3E%3Cpath d='M0 0H7Q${EDGE_W} ${EDGE_H / 4} 7 ${EDGE_H / 2}T7 ${EDGE_H}H0Z'/%3E%3C/svg%3E")`;
const MASK_PROPS = [
	"mask-image",
	"mask-repeat",
	"mask-size",
	"mask-position",
	"--tide-x",
	"--tide-y",
];

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Section headings fill from the left behind a wave-edged front as they enter view. Returns a stop function. */
export const startTideIn = (headings: readonly HTMLElement[]) => {
	if (reducedMotion()) return undefined;
	const frames = new Map<HTMLElement, number>();

	const clear = (h: HTMLElement) => {
		for (const prop of MASK_PROPS) h.style.removeProperty(prop);
	};

	/** The text's own extent inside its (often much wider) block, so the front crosses words, not empty space. */
	const span = (h: HTMLElement) => {
		const range = document.createRange();
		range.selectNodeContents(h);
		const text = range.getBoundingClientRect();
		const box = h.getBoundingClientRect();
		return { from: text.left - box.left - EDGE_W, to: text.right - box.left + 2 };
	};

	const arm = (h: HTMLElement) => {
		h.style.setProperty(
			"mask-image",
			`${EDGE}, linear-gradient(#000, #000), linear-gradient(${GHOST}, ${GHOST})`,
		);
		h.style.setProperty("mask-repeat", "repeat-y, no-repeat, no-repeat");
		h.style.setProperty("mask-size", `${EDGE_W}px ${EDGE_H}px, var(--tide-x) 100%, 100% 100%`);
		h.style.setProperty("mask-position", "var(--tide-x) var(--tide-y), 0 0, 0 0");
		h.style.setProperty("--tide-x", `${span(h).from}px`);
		h.style.setProperty("--tide-y", "0px");
	};

	const fill = (h: HTMLElement) => {
		const { from, to } = span(h);
		const start = performance.now();
		const step = (now: number) => {
			const t = Math.min((now - start) / DURATION, 1);
			h.style.setProperty("--tide-x", `${from + (to - from) * ease(t)}px`);
			h.style.setProperty("--tide-y", `${-t * EDGE_H * 2}px`);
			if (t < 1) frames.set(h, requestAnimationFrame(step));
			else clear(h);
		};
		frames.set(h, requestAnimationFrame(step));
	};

	const seen = new IntersectionObserver(
		(entries) => {
			for (const { target, isIntersecting } of entries) {
				if (!isIntersecting || !(target instanceof HTMLElement)) continue;
				seen.unobserve(target);
				fill(target);
			}
		},
		{ threshold: 1, rootMargin: "0px 0px -12% 0px" },
	);
	for (const h of headings) {
		arm(h);
		seen.observe(h);
	}

	return () => {
		seen.disconnect();
		for (const frame of frames.values()) cancelAnimationFrame(frame);
		for (const h of headings) clear(h);
	};
};
