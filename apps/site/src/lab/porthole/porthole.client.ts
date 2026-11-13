import { clamp, damp, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";

const BLADES = 8;
const OPEN_MS = 1600;
const DEG = Math.PI / 180;

const all = <T extends Element>(root: Element | Document, selector: string) => [
	...root.querySelectorAll<T>(selector),
];

/** Iris aperture as polygon vertices around (cx, cy): `open` 0 shut → 1 clear of the glass. */
const aperture = (open: number, cx: number, cy: number, radius: number) => {
	const r = (open * 1.1 * radius) / Math.cos(Math.PI / BLADES);
	const turn = (1 - open) * 1.1;
	return Array.from({ length: BLADES }, (_, k) => {
		const a = turn + (k * 2 * Math.PI) / BLADES;
		return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
	});
};

const playHero = (video: HTMLVideoElement | null) => {
	if (!video?.dataset.src) return;
	video.addEventListener("playing", () => video.setAttribute("data-playing", ""), { once: true });
	video.src = video.dataset.src;
	video.play().catch(() => {});
};

const player = (root: HTMLElement) => {
	const dialog = root.querySelector("dialog");
	const frame = dialog?.querySelector<HTMLElement>("[data-player]");
	const heading = dialog?.querySelector<HTMLElement>("[data-player-title]");
	if (!dialog || !frame) return () => {};
	dialog.addEventListener("close", () => frame.querySelector("iframe")?.remove());
	dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
	dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
	return ({ embed, title = "" }: DOMStringMap) => {
		if (!embed) return;
		const iframe = document.createElement("iframe");
		iframe.src = embed;
		iframe.title = title;
		iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
		iframe.allowFullscreen = true;
		iframe.className = frame.dataset.fill ?? "";
		frame.appendChild(iframe);
		if (heading) heading.textContent = title;
		dialog.showModal();
	};
};

export const initPorthole = (track: HTMLElement) => {
	const stage = track.querySelector<HTMLElement>("[data-stage]");
	const box = track.querySelector<HTMLElement>("[data-box]");
	const shutter = track.querySelector<HTMLElement>("[data-shutter]");
	const blades = track.querySelector<SVGPolygonElement>("[data-blades]");
	const through = track.querySelector<HTMLElement>("[data-through]");
	const outside = track.querySelector<HTMLElement>("[data-outside]");
	const water = track.querySelector<SVGPathElement>("[data-water]");
	const meniscus = track.querySelector<SVGPathElement>("[data-meniscus]");
	if (!stage || !box || !shutter || !through) return;

	const scenes = all<HTMLElement>(track, "[data-scene]");
	const captions = all<HTMLElement>(track, "[data-caption]");
	const dots = all<HTMLElement>(track, "[data-dot]");
	const count = scenes.length + 1;
	const still = reducedMotion();
	const open = player(track);
	const born = performance.now();

	let current = -1;
	let s = -1;
	let px = 0;
	let py = 0;
	const aim = { x: 0, y: 0 };

	const travel = () => track.offsetHeight - innerHeight;
	const target = () => clamp(-track.getBoundingClientRect().top / Math.max(1, travel())) * count;
	const goTo = (index: number) =>
		scrollTo({
			top: track.getBoundingClientRect().top + scrollY + ((index + 0.5) / count) * travel(),
			behavior: still ? "instant" : "smooth",
		});

	const show = (index: number) => {
		if (index === current) return;
		current = index;
		for (const group of [scenes, captions, dots]) {
			for (const [i, el] of group.entries()) el.toggleAttribute("data-on", i === index);
		}
		through.toggleAttribute("data-on", index === count - 1);
		box.toggleAttribute("data-playable", Boolean(scenes[index]?.dataset.embed));
	};

	const slosh = (time: number, roll: number) => {
		if (!water || !meniscus) return;
		const level = 85 + 2.5 * Math.sin(time * 0.6);
		const slope = Math.tan(roll * DEG);
		let line = "";
		for (let x = -4; x <= 104; x += 2) {
			const y =
				level +
				(x - 50) * slope +
				0.9 * Math.sin(x * 0.11 + time * 1.3) +
				0.35 * Math.sin(x * 0.27 - time * 1.9);
			line += `${x === -4 ? "M" : "L"}${x} ${y.toFixed(2)}`;
		}
		meniscus.setAttribute("d", line);
		water.setAttribute("d", `${line}L104 104L-4 104Z`);
	};

	const loop = onFrame(stage, (time, dt) => {
		const to = target();
		s = still || s < 0 ? to : damp(s, to, 9, dt);
		const index = Math.min(Math.floor(s), count - 1);
		const t = s - index;
		const last = index === count - 1;
		show(index);

		const arrive = index === 0 ? 1 : smoothstep(0, 0.22, t);
		const leave = last ? 1 : 1 - smoothstep(0.78, 1, t);
		const intro = smoothstep(0, 1, (performance.now() - born - 300) / OPEN_MS);
		const iris = still ? 1 : arrive * leave * intro;

		const radius = box.offsetWidth / 2;
		const cx = box.offsetLeft + radius;
		const cy = box.offsetTop + radius;
		const out = last ? (still ? 1 : smoothstep(0.3, 0.9, t)) : 0;
		const reach = Math.hypot(
			Math.max(cx, stage.offsetWidth - cx),
			Math.max(cy, stage.offsetHeight - cy),
		);
		const grown = radius + (reach - radius) * out * out;
		stage.style.setProperty("--R", `${grown}px`);
		stage.style.setProperty("--grow", String(grown / radius));
		stage.style.setProperty("--out", String(smoothstep(0, 0.6, out)));
		stage.style.setProperty("--chrome", String(1 - smoothstep(0.5, 0.9, out)));
		outside?.toggleAttribute("data-on", out > 0.75);

		const shut = iris < 0.999;
		const polygon = (points: readonly (readonly [number, number])[], unit: string) =>
			`polygon(${points.map(([x, y]) => `${x.toFixed(2)}${unit} ${y.toFixed(2)}${unit}`).join(",")})`;
		shutter.style.clipPath = shut ? polygon(aperture(iris, 50, 50, 50), "%") : "none";
		through.style.clipPath =
			shut && last
				? polygon(aperture(iris, cx - through.offsetLeft, cy - through.offsetTop, radius), "px")
				: "none";
		if (blades) {
			blades.setAttribute(
				"points",
				aperture(iris, 50, 50, 50)
					.map((p) => p.map((v) => v.toFixed(2)).join(","))
					.join(" "),
			);
			blades.style.opacity = shut ? "1" : "0";
		}

		px = still ? 0 : damp(px, aim.x, 4, dt);
		py = still ? 0 : damp(py, aim.y, 4, dt);
		stage.style.setProperty("--px", px.toFixed(4));
		stage.style.setProperty("--py", py.toFixed(4));
		slosh(still ? 0 : time, still ? 0 : 1.4 * Math.sin(time * 0.45) + px * 3);
	});

	addEventListener("scroll", loop.redraw, { passive: true });
	addEventListener("resize", loop.redraw);

	addEventListener(
		"pointermove",
		(e) => {
			if (e.pointerType !== "mouse") return;
			aim.x = (e.clientX / innerWidth) * 2 - 1;
			aim.y = (e.clientY / innerHeight) * 2 - 1;
		},
		{ passive: true },
	);
	// iOS needs a permission prompt for tilt; there the view just rides the slow roll.
	if ("DeviceOrientationEvent" in window && !("requestPermission" in DeviceOrientationEvent)) {
		addEventListener("deviceorientation", ({ beta, gamma }) => {
			if (beta === null || gamma === null) return;
			aim.x = clamp(gamma / 25, -1, 1);
			aim.y = clamp((beta - 45) / 25, -1, 1);
		});
	}

	for (const el of all<HTMLElement>(document, "[data-goto]")) {
		el.addEventListener("click", (e) => {
			e.preventDefault();
			goTo(Number(el.dataset.goto));
		});
	}
	captions.forEach((caption, i) => {
		caption.addEventListener("focusin", (e) => {
			if (i !== current && e.target instanceof HTMLElement && e.target.matches(":focus-visible"))
				goTo(i);
		});
	});
	for (const link of all<HTMLAnchorElement>(track, "a[data-embed]")) {
		link.addEventListener("click", (e) => {
			e.preventDefault();
			open(link.dataset);
		});
	}
	box.addEventListener("click", () => {
		const scene = scenes[current];
		if (scene?.dataset.embed) open(scene.dataset);
	});

	playHero(track.querySelector<HTMLVideoElement>("video[data-src]"));
};
