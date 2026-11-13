import { clamp, damp, lerp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";

const DRAG_SLOP = 6;
const KEY_STEP = 0.7;
/** The sun's height (1 = top of its arc) and place across the frame at each sky hour. */
const SUN_HEIGHT = [
	{ at: 0, value: 0.06 },
	{ at: 0.6, value: 0.5 },
	{ at: 1.2, value: 0.92 },
	{ at: 1.9, value: 0.4 },
	{ at: 2.2, value: 0.16 },
	{ at: 2.6, value: -0.05 },
	{ at: 3, value: -0.5 },
];
const SUNSET = 2.6;
const ZONES = [
	[12, "Territorial sea"],
	[24, "Contiguous zone"],
	[200, "Economic zone"],
	[Infinity, "High seas"],
] as const;

interface Stop {
	at: number;
	value: number;
}

/** Piecewise-linear `value` at `x` through stops sorted by `at`. */
const through = (stops: readonly Stop[], x: number) => {
	const next = stops.findIndex((s) => s.at >= x);
	if (next <= 0) return (stops[next === 0 ? 0 : stops.length - 1] ?? { value: 0 }).value;
	const a = stops[next - 1];
	const b = stops[next];
	if (!a || !b) return 0;
	return lerp(a.value, b.value, (x - a.at) / Math.max(1, b.at - a.at));
};

const init = (root: HTMLElement) => {
	const stage = root.querySelector<HTMLElement>("[data-stage]");
	const scroller = root.querySelector<HTMLElement>("[data-scroller]");
	const track = root.querySelector<HTMLElement>("[data-track]");
	if (!stage || !scroller || !track) return;

	const still = reducedMotion();
	/** Pinned: vertical page scroll drives the passage. Otherwise the scene is a plain sideways scroller. */
	const pinned = !still && CSS.supports("position", "sticky");
	if (pinned) for (const el of [stage, scroller]) el.setAttribute("data-pinned", "");

	const layers = [...root.querySelectorAll<HTMLElement>("[data-hour-layer]")];
	const skies = layers.length / 2;
	const patterns = [...root.querySelectorAll<SVGPatternElement>("pattern[data-drift]")].map(
		(el) => ({
			el,
			drift: Number(el.dataset.drift),
			period: Number(el.dataset.period),
		}),
	);
	const approaching = [...root.querySelectorAll<HTMLElement | SVGElement>("[data-approach]")];
	const miles = root.querySelector<HTMLElement>("[data-log-miles]");
	const zone = root.querySelector<HTMLElement>("[data-log-zone]");
	const rule = root.querySelector<HTMLElement>("[data-log-rule]");

	let max = 0;
	let hours: Stop[] = [];
	let log: Stop[] = [];
	let nears: number[] = [];

	const left = (el: Element) =>
		el.getBoundingClientRect().left - track.getBoundingClientRect().left;
	const centre = (el: Element) => left(el) + el.getBoundingClientRect().width / 2;

	const measure = () => {
		max = Math.max(0, track.scrollWidth - scroller.clientWidth);
		if (pinned) root.style.height = `${max + stage.offsetHeight}px`;
		const half = scroller.clientWidth / 2;
		hours = [...track.querySelectorAll<HTMLElement>("[data-hour]")].map((el) => ({
			at: centre(el),
			value: Number(el.dataset.hour),
		}));
		const marks = [...track.querySelectorAll<HTMLElement>("[data-mile]")].map((el) => ({
			at: clamp(centre(el) - half, 0, max),
			value: Number(el.dataset.mile),
		}));
		const last = marks.at(-1)?.value ?? 0;
		log = [{ at: 0, value: 0 }, ...marks, { at: max + 1, value: last * 1.04 }];
		nears = approaching.map(centre);
		if (rule) {
			for (const tick of rule.querySelectorAll("[data-tick]")) tick.remove();
			for (const { at } of marks) {
				const tick = document.createElement("span");
				tick.dataset.tick = "";
				tick.className = rule.dataset.tickClass ?? "";
				tick.style.left = `${(at / Math.max(1, max)) * 100}%`;
				rule.appendChild(tick);
			}
		}
	};

	const target = () =>
		pinned ? clamp(scrollY - root.offsetTop, 0, max) : clamp(scroller.scrollLeft, 0, max);
	const goTo = (x: number) => {
		const to = clamp(x, 0, max);
		if (pinned) scrollTo({ top: root.offsetTop + to });
		else scroller.scrollTo({ left: to });
	};

	let x = -1;
	const loop = onFrame(stage, (time, dt) => {
		const goal = target();
		x = x < 0 || still ? goal : damp(x, goal, 14, dt);
		if (Math.abs(x - goal) < 0.05) x = goal;
		const width = scroller.clientWidth;
		const height = stage.offsetHeight;
		const horizon =
			(height * Number.parseFloat(getComputedStyle(root).getPropertyValue("--h"))) / 100;
		if (pinned) track.style.transform = `translate3d(${-x}px,0,0)`;

		const hour = through(hours, x + width / 2);
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i];
			if (layer) layer.style.opacity = String(clamp(hour - ((i % skies) - 1)));
		}
		const dark = smoothstep(2.35, 3.1, hour);
		const altitude = through(SUN_HEIGHT, hour);
		const sunX = width * lerp(0.7, 0.3, clamp(hour / SUNSET));
		const moonUp = smoothstep(3, 4, hour);
		const moonX = width * 0.74;
		const set = (name: string, value: string | number) =>
			stage.style.setProperty(name, String(value));
		set("--dark", dark.toFixed(3));
		set("--stars", smoothstep(2.7, 3.7, hour).toFixed(3));
		set("--sun-x", `${sunX.toFixed(1)}px`);
		set("--sun-y", `${(horizon - altitude * (horizon - height * 0.14)).toFixed(1)}px`);
		set("--moon-x", `${moonX.toFixed(1)}px`);
		set("--moon-y", `${(horizon * lerp(1.25, 0.3, moonUp)).toFixed(1)}px`);
		const low = altitude > 0 ? clamp(1.15 - altitude * 1.1) * smoothstep(0, 0.12, altitude) : 0;
		set("--glitter", Math.max(low * 0.5, moonUp * 0.28).toFixed(3));
		set("--glitter-x", `${(moonUp > 0.05 ? moonX : sunX).toFixed(1)}px`);

		for (const { el, drift, period } of patterns) {
			const idle = still ? 0 : time * period * 0.035 * drift;
			el.setAttribute(
				"patternTransform",
				`translate(${(-(x * drift + idle) % period).toFixed(2)})`,
			);
		}
		approaching.forEach((el, i) => {
			const ahead = ((nears[i] ?? 0) - (x + width / 2)) / width;
			el.style.setProperty("--near", (1 - smoothstep(0.12, 1.05, ahead)).toFixed(3));
		});

		const run = through(log, x);
		if (miles) miles.textContent = run.toFixed(1).padStart(5, "0");
		if (zone) zone.textContent = ZONES.find(([limit]) => run < limit)?.[1] ?? "";
		set("--run", (max ? x / max : 0).toFixed(4));
		if (x !== goal) loop.redraw();
	});

	measure();
	new ResizeObserver(() => {
		measure();
		loop.redraw();
	}).observe(track);
	addEventListener("resize", () => {
		measure();
		loop.redraw();
	});
	(pinned ? window : scroller).addEventListener("scroll", loop.redraw, { passive: true });

	const inView = () => {
		const r = stage.getBoundingClientRect();
		return r.top < innerHeight / 2 && r.bottom > innerHeight / 2;
	};

	addEventListener("keydown", (event) => {
		const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
		if (!step || !inView() || event.target instanceof HTMLInputElement) return;
		event.preventDefault();
		goTo(target() + step * scroller.clientWidth * KEY_STEP);
	});

	if (pinned) {
		stage.addEventListener(
			"wheel",
			(event) => {
				if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
				event.preventDefault();
				scrollBy({ top: event.deltaX, behavior: "instant" });
			},
			{ passive: false },
		);

		let drag: { id: number; x: number; moved: number } | null = null;
		stage.addEventListener("pointerdown", (event) => {
			if (event.button !== 0 || event.target instanceof HTMLInputElement) return;
			drag = { id: event.pointerId, x: event.clientX, moved: 0 };
		});
		addEventListener("pointermove", (event) => {
			if (!drag || event.pointerId !== drag.id) return;
			const dx = event.clientX - drag.x;
			drag.x = event.clientX;
			drag.moved += Math.abs(dx);
			if (drag.moved > DRAG_SLOP) scrollBy({ top: -dx, behavior: "instant" });
		});
		const release = (event: PointerEvent) => {
			if (drag?.id === event.pointerId) setTimeout(() => (drag = null));
		};
		addEventListener("pointerup", release);
		addEventListener("pointercancel", release);
		stage.addEventListener(
			"click",
			(event) => {
				if (!drag || drag.moved <= DRAG_SLOP) return;
				event.preventDefault();
				event.stopPropagation();
			},
			true,
		);
		stage.addEventListener("dragstart", (event) => event.preventDefault());
	}

	track.addEventListener("focusin", (event) => {
		if (!(event.target instanceof Element) || !event.target.matches(":focus-visible")) return;
		scroller.scrollLeft = 0;
		goTo(centre(event.target.closest("[data-hour]") ?? event.target) - scroller.clientWidth / 2);
	});
	// A focused element inside a clipped scroller can still nudge its scroll offset.
	if (pinned) scroller.addEventListener("scroll", () => (scroller.scrollLeft = 0));

	for (const link of root.querySelectorAll<HTMLAnchorElement>("a[data-goto]")) {
		link.addEventListener("click", (event) => {
			event.preventDefault();
			const to = track.querySelector(`[data-landfall="${link.dataset.goto}"]`);
			const lead = to?.nextElementSibling ? scroller.clientWidth * 0.06 : 0;
			goTo(to ? left(to) - lead : 0);
		});
	}
};

for (const root of document.querySelectorAll<HTMLElement>("[data-passage]")) init(root);
