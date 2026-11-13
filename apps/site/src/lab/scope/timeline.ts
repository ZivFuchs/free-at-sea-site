import { clamp, reducedMotion, smoothstep } from "@/lab/lib/motion";
import { CUTS, type Cut, FPS, SHOT_SECONDS } from "./cuts";

const HOLD = 0.3;
const two = (n: number) => String(Math.floor(n)).padStart(2, "0");

/** Reel one starts at hour one, as on a film leader. */
const timecode = (seconds: number) => {
	const s = Math.max(0, seconds);
	return `01:${two(s / 60)}:${two(s % 60)}:${two((s % 1) * FPS)}`;
};

const isCut = (v: string | undefined): v is Cut => v !== undefined && v in CUTS;

export const roll = (root: HTMLElement) => {
	const shots = [...root.querySelectorAll<HTMLElement>("[data-shot]")];
	const ticks = [...root.querySelectorAll<HTMLButtonElement>("[data-tick]")];
	const code = root.querySelector<HTMLElement>("[data-timecode]");
	const slate = root.querySelector<HTMLElement>("[data-slate]");
	const n = shots.length;
	if (!n) return;
	const still = reducedMotion();
	const cuts = shots.map((el) => (isCut(el.dataset.cut) ? el.dataset.cut : "cut"));
	let current = -1;
	let queued = false;

	const span = () => (root.offsetHeight - innerHeight) / n;
	const position = () => clamp(-root.getBoundingClientRect().top / span(), 0, n - 0.0001);

	const goTo = (k: number, smooth = !still) => {
		const top = root.getBoundingClientRect().top + scrollY + (clamp(k, 0, n - 1) + HOLD) * span();
		scrollTo({ top, behavior: smooth ? "smooth" : "instant" });
	};

	const enter = (i: number) => {
		current = i;
		for (const frame of root.querySelectorAll("[data-shot] iframe")) frame.remove();
		for (const [k, tick] of ticks.entries()) {
			if (k === i) tick.setAttribute("aria-current", "step");
			else tick.removeAttribute("aria-current");
		}
		const cut = cuts[i];
		if (slate && cut) slate.textContent = `Shot ${two(i + 1)}/${two(n)} · ${CUTS[cut].label}`;
	};

	const update = () => {
		queued = false;
		const t = position();
		const i = Math.floor(t);
		const f = t - i;
		const next = cuts[i + 1];
		const window = next && !still ? CUTS[next].window : 0;
		const q = window ? smoothstep(0, 1, (f - (1 - window)) / window) : 0;

		for (const [k, el] of shots.entries()) {
			const incoming = k === i + 1 && q > 0;
			const on = k === i;
			el.dataset.state = on ? "current" : incoming ? "incoming" : "off";
			el.style.setProperty("--o", String(on ? 1 : incoming ? (next === "dissolve" ? q : 1) : 0));
			el.style.setProperty("--q", String(k <= i ? 1 : incoming ? q : 0));
			el.style.setProperty("--f", String(still ? 0 : on ? f : k < i ? 1 : 0));
		}
		// The horizon rule fades up over the opening shot and holds across the cut to the card.
		root.style.setProperty("--line", String(i === 0 ? smoothstep(0.5, 0.92, f) : i === 1 ? 1 : 0));
		root.style.setProperty("--t", String(t / n));
		root.style.setProperty("--cue", i === n - 2 && f > 0.7 && f < 0.78 ? "1" : "0");
		if (code) code.textContent = timecode(t * SHOT_SECONDS);
		if (i !== current) enter(i);
	};

	const queue = () => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(update);
	};

	for (const [k, tick] of ticks.entries()) tick.addEventListener("click", () => goTo(k));

	// Tabbing into a shot that isn't on screen cuts to it.
	for (const [k, el] of shots.entries()) {
		el.addEventListener("focusin", () => {
			if (k !== current) goTo(k, false);
		});
	}

	// Clips play inside the frame; without script the link opens the provider.
	for (const play of root.querySelectorAll<HTMLAnchorElement>("a[data-embed]")) {
		play.addEventListener("click", (event) => {
			const stage = play
				.closest<HTMLElement>("[data-shot]")
				?.querySelector<HTMLElement>("[data-picture]");
			const src = play.dataset.embed;
			if (!stage || !src) return;
			event.preventDefault();
			const player = document.createElement("iframe");
			const url = new URL(src);
			url.searchParams.set("autoplay", "1");
			player.src = String(url);
			player.title = play.dataset.title ?? "Clip";
			player.allow = "autoplay; fullscreen; picture-in-picture";
			player.className = root.dataset.playerClass ?? "";
			stage.appendChild(player);
		});
	}

	const STEPS: Record<string, number> = {
		ArrowDown: 1,
		ArrowRight: 1,
		PageDown: 1,
		" ": 1,
		ArrowUp: -1,
		ArrowLeft: -1,
		PageUp: -1,
	};
	addEventListener("keydown", (event) => {
		const step = STEPS[event.key];
		if (!step || event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target instanceof Element ? event.target : null;
		if (target?.closest("input, textarea, select, iframe")) return;
		if (event.key === " " && target?.closest("button, a")) return;
		const { top, bottom } = root.getBoundingClientRect();
		if (top > 1 || bottom < innerHeight - 1) return;
		const to = current + (event.key === " " && event.shiftKey ? -1 : step);
		if (to < 0 || to >= n) return;
		event.preventDefault();
		goTo(to);
	});

	update();
	root.dataset.live = "";
	addEventListener("scroll", queue, { passive: true });
	addEventListener("resize", queue);
};
