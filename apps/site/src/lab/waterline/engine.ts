import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, lerp, onFrame, reducedMotion } from "@/lab/lib/motion";
import water from "./water.frag?raw";

/** Surface height at the top of the page, as a fraction of the viewport. The hero title is centred on it. */
export const REST = 0.62;
/** Height once the deep zone arrives: off the top, viewer fully under. */
const GONE = -0.12;
/** How much bigger submerged things look at the hero. Eases to 0 with the dive so click targets line up. */
const MAGNIFY = 0.075;
const TENSION = 46;
const DAMPING = 2.4;
const SPREAD = 0.2;

const FRAGMENT = `precision highp float;\n${noise}\n${water}`;

export const waterline = (root: HTMLElement) => {
	const find = <T extends Element>(selector: string) => root.querySelector<T>(selector);
	const sea = find<HTMLElement>("[data-sea]");
	const copy = find<HTMLElement>("[data-copy]");
	const deep = find<HTMLElement>("[data-deep]");
	const air = find<HTMLElement>("[data-air]");
	const surface = find<SVGSVGElement>("[data-surface]");
	const canvas = find<HTMLCanvasElement>("canvas");
	const turbulence = find<SVGFETurbulenceElement>("feTurbulence");
	if (!sea || !copy || !deep || !air || !surface) return;
	if (!CSS.supports("clip-path", "polygon(0 0, 1px 0, 0 1px)")) return;

	const strokes = [...surface.querySelectorAll("path")];
	const still = reducedMotion();
	let height = new Float32Array(0);
	let speed = new Float32Array(0);
	let lastY = scrollY;
	let surge = 0;
	let surgeSpeed = 0;
	let energy = 0;
	let line = REST;
	let frames = 0;
	const pointer = { y: 0, seen: false };

	const fit = () => {
		const n = Math.round(clamp(innerWidth / 12, 36, 128)) + 1;
		height = new Float32Array(n);
		speed = new Float32Array(n);
		surface.setAttribute("height", String(innerHeight));
	};

	const simulate = (time: number, dt: number, scrollSpeed: number) => {
		const pull = clamp(-scrollSpeed * 0.014, -44, 44);
		surgeSpeed += ((pull - surge) * 70 - surgeSpeed * 8) * dt;
		surge += surgeSpeed * dt;
		energy = Math.max(energy * Math.exp(-0.9 * dt), clamp(Math.abs(scrollSpeed) / 2600));

		const n = height.length;
		for (let i = 0; i < n; i++) {
			const chop = scrollSpeed * 0.01 * Math.sin(i * 0.47 + time * 2.3);
			speed[i] =
				(speed[i] ?? 0) + (-TENSION * (height[i] ?? 0) - DAMPING * (speed[i] ?? 0) + chop) * dt;
		}
		for (let pass = 0; pass < 3; pass++) {
			for (let i = 0; i < n; i++) {
				const h = height[i] ?? 0;
				if (i > 0) speed[i - 1] = (speed[i - 1] ?? 0) + SPREAD * (h - (height[i - 1] ?? 0));
				if (i < n - 1) speed[i + 1] = (speed[i + 1] ?? 0) + SPREAD * (h - (height[i + 1] ?? 0));
			}
		}
		for (let i = 0; i < n; i++) height[i] = clamp((height[i] ?? 0) + (speed[i] ?? 0) * dt, -60, 60);
	};

	const swell = (x: number, time: number) => {
		const amp = (2.5 + 9 * energy) * clamp(innerWidth / 900, 0.6, 1.2);
		return (
			amp * Math.sin(x * 0.011 + time * 1.05) +
			amp * 0.55 * Math.sin(x * 0.024 - time * 1.6 + 1.3) +
			amp * 0.28 * Math.sin(x * 0.052 + time * 2.5)
		);
	};

	const tick = (time: number, dt: number) => {
		const y = scrollY;
		const w = innerWidth;
		const h = innerHeight;
		const top = sea.getBoundingClientRect().top;
		const end = deep.offsetTop - h * 0.35;
		line = lerp(REST, GONE, (end > 0 ? clamp(y / end) : 1) ** 1.5);
		if (!still) simulate(time, dt, (y - lastY) / dt);
		lastY = y;

		const base = line * h + surge;
		const n = height.length;
		const points: string[] = [];
		const local: string[] = [];
		for (let i = 0; i < n; i++) {
			const x = (i / (n - 1)) * w;
			const at = base + (still ? 0 : (height[i] ?? 0) + swell(x, time));
			points.push(`${x.toFixed(1)} ${at.toFixed(1)}`);
			local.push(`${x.toFixed(1)}px ${(at - top).toFixed(1)}px`);
		}
		const floor = h - top + 80;
		sea.style.clipPath = `polygon(${local.join(",")},${w}px ${floor}px,0px ${floor}px)`;

		const visible = base > -60;
		surface.style.visibility = visible ? "visible" : "hidden";
		if (visible) {
			surface.style.transform = `translateY(${-top}px)`;
			const d = `M${points.join("L")}`;
			for (const stroke of strokes) stroke.setAttribute("d", d);
		}

		const scale = 1 + MAGNIFY * clamp(line / REST) ** 1.5;
		const sway = still ? 0 : Math.sin(time * 0.55) * 1.5;
		copy.style.transformOrigin = `50% ${(base - top).toFixed(1)}px`;
		copy.style.transform = `translateX(${sway.toFixed(2)}px) scale(${scale.toFixed(4)})`;

		if (!still && turbulence && visible && frames++ % 3 === 0) {
			turbulence.setAttribute(
				"baseFrequency",
				`${(0.004 + 0.0008 * Math.sin(time * 0.5)).toFixed(5)} ${(0.012 + 0.002 * Math.cos(time * 0.37)).toFixed(5)}`,
			);
		}
	};

	fit();
	const shader =
		canvas &&
		runShader(canvas, {
			fragment: FRAGMENT,
			resolution: 0.5,
			fps: 30,
			uniforms: () => {
				const max = document.documentElement.scrollHeight - innerHeight;
				return { u_line: line + surge / innerHeight, u_depth: max > 0 ? clamp(scrollY / max) : 0 };
			},
		});
	if (canvas && !shader) canvas.hidden = true;

	root.setAttribute("data-on", "");
	const loop = onFrame(root, tick, { margin: "0px" });
	const redraw = () => {
		loop.redraw();
		if (still) shader?.redraw();
	};
	addEventListener("scroll", redraw, { passive: true });
	addEventListener("resize", () => {
		fit();
		redraw();
	});

	if (!still) {
		addEventListener(
			"pointermove",
			({ pointerType, clientX, clientY }) => {
				if (pointerType !== "mouse") return;
				const n = height.length;
				const i = Math.round((clientX / innerWidth) * (n - 1));
				const at = line * innerHeight + surge + (height[i] ?? 0);
				const crossed = pointer.seen && (pointer.y - at) * (clientY - at) < 0;
				const near = Math.abs(clientY - at) < 36;
				if (crossed || near) {
					const kick = clamp((clientY - pointer.y) * (crossed ? 14 : 5), -420, 420);
					for (let k = -2; k <= 2; k++) {
						const j = i + k;
						if (j >= 0 && j < n) speed[j] = (speed[j] ?? 0) + kick * (1 - Math.abs(k) / 3);
					}
				}
				pointer.y = clientY;
				pointer.seen = true;
			},
			{ passive: true },
		);
	}

	/* The submerged copy is inert and sits over the real links, so it borrows their hover and focus. */
	const twin = (target: EventTarget | null) => {
		const key = target instanceof Element && target.closest<HTMLElement>("[data-key]")?.dataset.key;
		return key ? sea.querySelector(`[data-key="${key}"]`) : null;
	};
	air.addEventListener("pointerover", ({ target }) => twin(target)?.setAttribute("data-hot", ""));
	air.addEventListener("pointerout", ({ target }) => twin(target)?.removeAttribute("data-hot"));
	air.addEventListener("focusin", ({ target }) => {
		if (target instanceof Element && target.matches(":focus-visible"))
			twin(target)?.setAttribute("data-focus", "");
	});
	air.addEventListener("focusout", ({ target }) => twin(target)?.removeAttribute("data-focus"));

	addEventListener("pagehide", () => {
		loop.stop();
		shader?.stop();
	});
};
