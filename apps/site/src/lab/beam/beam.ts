import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, pageProgress, reducedMotion, smoothstep } from "@/lab/lib/motion";
import fragment from "./beam.frag?raw";
import { HORIZON, intensity, PERIOD, shaft } from "./optics";

/** What the light reveals: our own marked blocks, and the reused sections' headings, cards and panels. */
const TARGETS = "[data-lit], #clips h2, #clips li, #press h2, #press li, #newsletter, footer";
/** Opacity of anything the light has not reached. */
const DARK = 0.14;
/** Seconds for the afterglow to fall to 1/e. */
const AFTERGLOW = 2.4;
const HAND_RADIUS = 230;
/** Where the lamp rests under reduced motion: just past pointing at the viewer. */
const STILL_PHASE = 0.015;
/** Phase at load: the first sweep arrives about a second in. */
const LEAD = 0.86;

declare global {
	interface Window {
		/** Review hook: holds the lamp at a fixed phase (0–1). */
		beamPhase?: number;
	}
}

interface Target {
	el: HTMLElement;
	/** Document coordinates. */
	left: number;
	top: number;
	width: number;
	height: number;
	lit: number;
	shown: number;
}

export const start = () => {
	const root = document.querySelector<HTMLElement>("[data-beam]");
	const canvas = root?.querySelector<HTMLCanvasElement>("canvas[data-beam-light]");
	const hero = root?.querySelector<HTMLElement>("[data-beam-hero]");
	const steady = root?.querySelector<HTMLButtonElement>("[data-beam-steady]");
	if (!root || !canvas || !hero) return;

	// The header reads dark-on-light over a pale hero poster; this hero is night.
	root.querySelector<HTMLElement>("[data-site-header]")?.style.removeProperty("--top");

	const still = reducedMotion();
	const targets: Target[] = [...root.querySelectorAll<HTMLElement>(TARGETS)]
		.filter((el) => !el.closest("dialog"))
		.map((el) => ({ el, left: 0, top: 0, width: 0, height: 0, lit: 0, shown: -1 }));

	const measure = () => {
		for (const target of targets) {
			const r = target.el.getBoundingClientRect();
			target.left = r.left + scrollX;
			target.top = r.top + scrollY;
			target.width = r.width;
			target.height = r.height;
		}
	};

	const pointer = { x: 0, y: 0, on: false, strength: 0 };
	let allLit = still;
	let ambient = 0;
	let last = 0;

	const state = (time: number) => {
		const view = {
			width: innerWidth,
			height: innerHeight,
			horizon: hero.offsetTop + hero.offsetHeight * HORIZON - scrollY,
		};
		const near = smoothstep(0.45, 1, scrollY / innerHeight);
		const phase = window.beamPhase ?? (still ? STILL_PHASE : (time / PERIOD + LEAD) % 1);
		const beam = shaft(phase, near, view);
		return {
			view,
			near,
			beam,
			flash: (1 - near) * Math.max(Math.cos(phase * Math.PI * 2), 0) ** 6,
		};
	};

	const reveal = (beam: ReturnType<typeof state>["beam"], dt: number) => {
		const fade = Math.exp(-dt / AFTERGLOW);
		const focused = document.activeElement;
		for (const target of targets) {
			const x = target.left - scrollX;
			const y = target.top - scrollY;
			if (y > innerHeight + 200 || y + target.height < -200) continue;
			const cy = y + target.height / 2;
			let light = Math.max(
				intensity(beam, x + target.width * 0.2, cy),
				intensity(beam, x + target.width * 0.5, cy),
				intensity(beam, x + target.width * 0.8, cy),
			);
			if (pointer.strength > 0.01) {
				const dx = pointer.x - clamp(pointer.x, x, x + target.width);
				const dy = pointer.y - clamp(pointer.y, y, y + target.height);
				light += pointer.strength * Math.exp(-(dx * dx + dy * dy) / (HAND_RADIUS * HAND_RADIUS));
			}
			if (allLit || target.el.contains(focused)) light = 1;
			target.lit = Math.max(clamp(Math.max(light * 1.7, ambient)), target.lit * fade);
			const shown = Math.round((DARK + (1 - DARK) * target.lit * (2 - target.lit)) * 100) / 100;
			if (shown !== target.shown) {
				target.shown = shown;
				target.el.style.opacity = String(shown);
			}
		}
	};

	const shader = runShader(canvas, {
		fragment: `precision highp float;\n${noise}\n${fragment}`,
		resolution: 0.75,
		uniforms: (time) => {
			const dt = last ? Math.min(time - last, 0.1) : 1 / 60;
			last = time;
			const { view, near, beam, flash } = state(time);
			ambient = smoothstep(0.84, 0.99, pageProgress());
			pointer.strength = damp(pointer.strength, pointer.on ? 1 : 0, 6, dt);
			reveal(beam, still ? 100 : dt);
			return {
				u_scale: canvas.width / Math.max(canvas.clientWidth, 1),
				u_s: [beam.sx, beam.sy],
				u_e: [beam.ex, beam.ey],
				u_r: [beam.r0, beam.r1],
				u_power: beam.power,
				u_horizon: view.horizon,
				u_far: 1 - near,
				u_flash: flash,
				u_pointer: [pointer.x, pointer.y],
				u_hand: pointer.strength,
				u_ambient: ambient,
			};
		},
	});

	// No WebGL: nothing to sweep, so nothing stays dark.
	if (!shader) {
		canvas.hidden = true;
		return;
	}

	measure();
	new ResizeObserver(measure).observe(root);
	addEventListener("scroll", shader.redraw, { passive: true });
	root.addEventListener("focusin", shader.redraw);

	const track = (event: PointerEvent) => {
		pointer.x = event.clientX;
		pointer.y = event.clientY;
		pointer.on = event.pointerType === "mouse" || event.buttons > 0 || event.type === "pointerdown";
		shader.redraw();
	};
	const release = (event: PointerEvent) => {
		if (event.pointerType !== "mouse" || event.type === "pointerleave") pointer.on = false;
	};
	addEventListener("pointermove", track, { passive: true });
	addEventListener("pointerdown", track, { passive: true });
	addEventListener("pointerup", release, { passive: true });
	addEventListener("pointercancel", release, { passive: true });
	document.documentElement.addEventListener("pointerleave", release);

	steady?.addEventListener("click", () => {
		allLit = still || !allLit;
		steady.setAttribute("aria-pressed", String(allLit));
		shader.redraw();
	});
	if (still) steady?.setAttribute("aria-pressed", "true");

	addEventListener("pagehide", shader.stop, { once: true });
};
