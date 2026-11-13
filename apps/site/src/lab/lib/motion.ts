export const clamp = (v: number, min = 0, max = 1) => Math.min(Math.max(v, min), max);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
	const t = clamp((v - a) / (b - a));
	return t * t * (3 - 2 * t);
};
/** Frame-rate independent approach of `current` to `target`; `rate` ≈ 1/seconds to settle. */
export const damp = (current: number, target: number, rate: number, dt: number) =>
	lerp(current, target, 1 - Math.exp(-rate * dt));

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 0 at the top of the document, 1 at the bottom. */
export const pageProgress = () => {
	const max = document.documentElement.scrollHeight - innerHeight;
	return max > 0 ? clamp(scrollY / max) : 0;
};

/** 0 when `el`'s top enters the viewport bottom, 1 when its bottom leaves the viewport top. */
export const elementProgress = (el: Element) => {
	const r = el.getBoundingClientRect();
	return clamp((innerHeight - r.top) / (innerHeight + r.height));
};

/**
 * Calls `tick(seconds, deltaSeconds)` each frame, only while `el` is near the viewport and the tab is visible.
 * Under reduced motion it runs one frame per `redraw()` instead. Returns `{ redraw, stop }`.
 */
export const onFrame = (
	el: Element,
	tick: (time: number, dt: number) => void,
	{ fps = 60, margin = "200px" }: { fps?: number; margin?: string } = {},
) => {
	const still = reducedMotion();
	const gap = 1000 / fps - 2;
	let visible = false;
	let frame = 0;
	let last = -Infinity;
	let stopped = false;

	const loop = (ms: number) => {
		frame = 0;
		if (stopped) return;
		if (ms - last >= gap) {
			const dt = last === -Infinity ? 1 / fps : Math.min((ms - last) / 1000, 0.1);
			last = ms;
			tick(ms / 1000, dt);
		}
		if (visible && !still && !document.hidden) frame = requestAnimationFrame(loop);
	};
	const redraw = () => {
		if (!frame && !stopped) frame = requestAnimationFrame(loop);
	};

	const io = new IntersectionObserver(
		([entry]) => {
			visible = entry?.isIntersecting ?? false;
			if (visible) redraw();
		},
		{ rootMargin: margin },
	);
	io.observe(el);
	const onVisibility = () => !document.hidden && visible && redraw();
	document.addEventListener("visibilitychange", onVisibility);

	return {
		redraw,
		stop: () => {
			stopped = true;
			cancelAnimationFrame(frame);
			io.disconnect();
			document.removeEventListener("visibilitychange", onVisibility);
		},
	};
};
