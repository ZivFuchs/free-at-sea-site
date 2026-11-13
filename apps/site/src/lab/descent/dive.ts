import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, lerp, pageProgress, reducedMotion } from "@/lab/lib/motion";
import water from "./water.frag?raw";
import { formatMetres, zoneAt } from "./zones";

const PRECISION =
	"#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";

interface Anchor {
	/** Page y of the viewport centre at which the eye is at `depth`. */
	y: number;
	depth: number;
}

/** Sunlight left at a depth, as the shader computes it: the ground colour when WebGL is missing. */
const waterColour = (metres: number) => {
	const [r, g, b] = [0.22, 0.013, 0.0052].map((k) => Math.exp(-k * (metres + 37)) ** 0.82);
	return `rgb(${[0.39 * (r ?? 0), 0.62 * (g ?? 0) + 0.02, 0.74 * (b ?? 0) + 0.04].map((v) => Math.round(v * 255)).join(" ")})`;
};

export const dive = (root: HTMLElement) => {
	const canvas = root.querySelector<HTMLCanvasElement>("[data-water]");
	const readout = root.querySelector<HTMLElement>("[data-readout]");
	const zone = root.querySelector<HTMLElement>("[data-zone]");
	const gauge = root.querySelector<HTMLElement>("[data-gauge]");
	const floor = root.querySelector<HTMLElement>('[data-stop="seabed"]');
	const sections = [...root.querySelectorAll<HTMLElement>("[data-depth]")];
	const ticks = [...root.querySelectorAll<HTMLAnchorElement>("[data-tick]")];
	const still = reducedMotion();

	let anchors: Anchor[] = [];
	let target = { metres: 0, travel: 0, floor: 0 };
	const eye = { ...target };

	const measure = () => {
		const half = innerHeight / 2;
		const max = document.documentElement.scrollHeight - innerHeight;
		anchors = sections.map((el, i) => {
			const top = el.getBoundingClientRect().top + scrollY;
			const y =
				i === sections.length - 1 ? max + half : top + Math.min(el.offsetHeight, innerHeight) / 2;
			return { y: clamp(y, half, max + half), depth: Number(el.dataset.depth) };
		});
		for (const tick of ticks) {
			const el = root.querySelector<HTMLElement>(`[data-stop="${tick.dataset.tick}"]`);
			const at = anchors[el ? sections.indexOf(el) : -1];
			if (at)
				tick.parentElement?.style.setProperty("--at", String(max > 0 ? (at.y - half) / max : 0));
		}
		read();
	};

	const metresAt = (y: number) => {
		const next = anchors.findIndex((a) => a.y >= y);
		const [a, b] = [anchors[next - 1], anchors[next]];
		if (!b) return anchors.at(-1)?.depth ?? 0;
		if (!a) return b.depth;
		return lerp(a.depth, b.depth, (y - a.y) / Math.max(b.y - a.y, 1));
	};

	let queued = 0;
	const read = () => {
		queued = 0;
		const metres = metresAt(scrollY + innerHeight / 2);
		const rect = floor?.getBoundingClientRect();
		target = {
			metres,
			travel: still ? 0 : scrollY / innerHeight,
			floor: rect ? clamp((innerHeight - rect.top) / Math.min(rect.height, innerHeight)) : 0,
		};
		if (readout) readout.textContent = formatMetres(metres);
		if (zone) zone.textContent = zoneAt(metres).name;
		gauge?.style.setProperty("--p", String(pageProgress()));
		const current = ticks.findLast((tick) => Number(tick.dataset.tickDepth) <= metres + 1);
		for (const tick of ticks) tick.toggleAttribute("data-current", tick === current);
		if (!shader) root.style.setProperty("--water", waterColour(metres));
		else if (still) shader.redraw();
	};

	let last = 0;
	const shader =
		canvas &&
		runShader(canvas, {
			fragment: PRECISION + noise + water,
			resolution: 0.8,
			uniforms: (time) => {
				const dt = still || !last ? 1 : Math.min(time - last, 0.1);
				last = time;
				eye.metres = still ? target.metres : damp(eye.metres, target.metres, 5, dt);
				eye.travel = still ? 0 : damp(eye.travel, target.travel, 5, dt);
				eye.floor = still ? target.floor : damp(eye.floor, target.floor, 4, dt);
				return {
					u_clock: still ? 20 : time,
					u_m: eye.metres,
					u_travel: eye.travel,
					u_floor: eye.floor,
				};
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

	/** Current depth of the eye, for anything else that follows the dive. */
	return () => target.metres;
};
