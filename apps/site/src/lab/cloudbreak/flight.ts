import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, lerp, pageProgress, reducedMotion, smoothstep } from "@/lab/lib/motion";
import { CLOUD_BASE, CLOUD_TOP, formatFeet, formatMetres, stateAt } from "./levels";
import sky from "./sky.frag?raw";

const PRECISION =
	"#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";

interface Anchor {
	/** Page y of the viewport centre at which the eye is at `altitude`. */
	y: number;
	altitude: number;
}

/** Scroll is altitude: drives the sky shader, the altimeter, and the type colours that keep copy legible. */
export const flight = (root: HTMLElement) => {
	const canvas = root.querySelector<HTMLCanvasElement>("[data-sky]");
	const metres = root.querySelector<HTMLElement>("[data-metres]");
	const feet = root.querySelector<HTMLElement>("[data-feet]");
	const state = root.querySelector<HTMLElement>("[data-state]");
	const sections = [...root.querySelectorAll<HTMLElement>("[data-alt]")];
	const ticks = [...root.querySelectorAll<HTMLAnchorElement>("[data-tick]")];
	const still = reducedMotion();
	const small = matchMedia("(max-width: 48rem), (pointer: coarse)").matches;

	let anchors: Anchor[] = [];
	let target = sections.length ? Number(sections[0]?.dataset.alt) : 0;
	let eye = target;

	const altitudeAt = (y: number) => {
		const next = anchors.findIndex((a) => a.y >= y);
		const [a, b] = [anchors[next - 1], anchors[next]];
		if (!b) return anchors.at(-1)?.altitude ?? 0;
		if (!a) return b.altitude;
		return lerp(a.altitude, b.altitude, (y - a.y) / Math.max(b.y - a.y, 1));
	};

	let queued = 0;
	const read = () => {
		queued = 0;
		target = altitudeAt(scrollY + innerHeight / 2);
		if (metres) metres.textContent = formatMetres(target);
		if (feet) feet.textContent = formatFeet(target);
		if (state) state.textContent = stateAt(target);
		/* Copy low in the frame meets cloud first; the header, at the top, only once the eye is inside it. */
		const leaving = 1 - smoothstep(CLOUD_BASE - 70, CLOUD_BASE - 20, target);
		root.style.setProperty(
			"--ink",
			String(Math.min(smoothstep(CLOUD_TOP + 1100, CLOUD_TOP + 700, target), 1 - leaving)),
		);
		root.style.setProperty(
			"--ink-top",
			String(Math.min(smoothstep(CLOUD_TOP, CLOUD_TOP - 120, target), 1 - leaving)),
		);
		root.style.setProperty("--p", String(pageProgress()));
		const current = ticks.findLast((tick) => Number(tick.dataset.tickAlt) >= target - 1);
		for (const tick of ticks) tick.toggleAttribute("data-current", tick === current);
		if (still) shader?.redraw();
	};

	const measure = () => {
		const half = innerHeight / 2;
		const max = document.documentElement.scrollHeight - innerHeight;
		anchors = sections.map((el, i) => {
			const top = el.getBoundingClientRect().top + scrollY;
			const y =
				i === sections.length - 1 ? max + half : top + Math.min(el.offsetHeight, innerHeight) / 2;
			return { y: clamp(y, half, max + half), altitude: Number(el.dataset.alt) };
		});
		for (const tick of ticks) {
			const el = root.querySelector<HTMLElement>(`[data-level="${tick.dataset.tick}"]`);
			const at = anchors[el ? sections.indexOf(el) : -1];
			if (at)
				tick.parentElement?.style.setProperty("--at", String(max > 0 ? (at.y - half) / max : 0));
		}
		read();
	};

	let last = 0;
	const shader =
		canvas &&
		runShader(canvas, {
			fragment: PRECISION + noise + sky,
			resolution: small ? 0.4 : 0.5,
			fps: small ? 30 : 60,
			uniforms: (time) => {
				const dt = still || !last ? 1 : Math.min(time - last, 0.1);
				last = time;
				eye = still ? target : damp(eye, target, 5, dt);
				return { u_clock: still ? 40 : time, u_alt: eye, u_steps: small ? 44 : 54 };
			},
		});
	if (shader) canvas?.setAttribute("data-live", "");

	const queue = () => {
		if (!queued) queued = requestAnimationFrame(read);
	};
	addEventListener("scroll", queue, { passive: true });
	addEventListener("resize", measure);
	const sizes = new ResizeObserver(measure);
	sizes.observe(document.body);
	measure();

	addEventListener("pagehide", () => {
		shader?.stop();
		sizes.disconnect();
	});
};
