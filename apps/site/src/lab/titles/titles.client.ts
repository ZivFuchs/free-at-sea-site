import { reducedMotion } from "@/lab/lib/motion";
import { CARDS, cardFrame, DURATION, frame, TITLE_START } from "./sequence";

const READY_TIMEOUT = 2500;
/** Skipping cuts to the main title and plays it out faster. */
const SKIP_RATE = 2.5;

const clamp = (t: number) => Math.min(Math.max(t, 0), DURATION);

const set = (el: HTMLElement, vars: Record<string, number>) => {
	for (const [name, value] of Object.entries(vars))
		el.style.setProperty(`--${name}`, value.toFixed(4));
};

export const runTitles = (root: HTMLElement) => {
	const hero = root.querySelector<HTMLElement>("[data-titles-hero]");
	const header = root.querySelector<HTMLElement>("[data-titles-header]");
	const skipButton = root.querySelector<HTMLButtonElement>("[data-titles-skip]");
	const replayButton = root.querySelector<HTMLButtonElement>("[data-titles-replay]");
	if (!hero) return;

	const cards = CARDS.flatMap((card) => {
		const el = root.querySelector<HTMLElement>(`[data-card="${card.id}"]`);
		return el ? [{ card, el }] : [];
	});

	const apply = (t: number) => {
		set(root, frame(t));
		for (const { card, el } of cards) {
			const values = cardFrame(card, t);
			set(el, values);
			el.style.visibility = values.o > 0 ? "visible" : "hidden";
		}
		root.style.setProperty("--curtain", "0");
	};

	let raf = 0;
	let clock = 0;
	let last = 0;
	let rate = 1;
	let playing = false;

	const settle = (replayable: boolean) => {
		playing = false;
		cancelAnimationFrame(raf);
		if (skipButton) skipButton.hidden = true;
		if (replayButton) replayButton.hidden = !replayable;
		if (header) header.inert = false;
	};

	const tick = (now: number) => {
		clock += Math.min((now - last) / 1000, 0.1) * rate;
		last = now;
		if (clock >= DURATION) {
			apply(DURATION);
			settle(true);
			return;
		}
		apply(clock);
		raf = requestAnimationFrame(tick);
	};

	const play = () => {
		cancelAnimationFrame(raf);
		clock = 0;
		rate = 1;
		playing = true;
		if (skipButton) skipButton.hidden = false;
		if (replayButton) replayButton.hidden = true;
		if (header) header.inert = true;
		apply(0);
		last = performance.now();
		raf = requestAnimationFrame(tick);
	};

	const skip = () => {
		if (!playing) return;
		clock = Math.max(clock, TITLE_START);
		rate = SKIP_RATE;
	};

	for (const video of root.querySelectorAll<HTMLVideoElement>("video[data-src]")) {
		video.addEventListener("playing", () => video.setAttribute("data-playing", ""), { once: true });
		video.src = video.dataset.src ?? "";
		video.play().catch(() => {});
	}

	const onScroll = () => {
		header?.style.setProperty("--solid", scrollY > innerHeight * 0.6 ? "1" : "0");
		if (scrollY > 8) skip();
	};
	addEventListener("scroll", onScroll, { passive: true });
	addEventListener("keydown", (event) => event.key === "Escape" && skip());
	hero.addEventListener("pointerdown", (event) => {
		if (!(event.target instanceof Element && event.target.closest("button"))) skip();
	});
	skipButton?.addEventListener("click", skip);
	replayButton?.addEventListener("click", () => {
		scrollTo({ top: 0, behavior: "instant" });
		play();
	});
	addEventListener("pagehide", () => cancelAnimationFrame(raf));
	onScroll();

	// `?t=6.5` holds the sequence at that second, for review.
	const held = new URLSearchParams(location.search).get("t");
	if (held !== null && Number.isFinite(Number(held))) {
		apply(clamp(Number(held)));
		settle(false);
		return;
	}
	if (reducedMotion() || scrollY > 8) {
		apply(DURATION);
		settle(!reducedMotion());
		return;
	}

	const poster = hero.querySelector("img");
	Promise.race([
		Promise.all([document.fonts.ready, poster?.decode().catch(() => {})]),
		new Promise((resolve) => setTimeout(resolve, READY_TIMEOUT)),
	]).then(play);
};
