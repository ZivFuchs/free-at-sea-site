import { damp, onFrame, pageProgress, reducedMotion, smoothstep } from "@/lab/lib/motion";
import { clock, cssVars, sample } from "./day";

type Ocean = ReturnType<typeof import("./ocean")["createOcean"]>;

const root = document.querySelector<HTMLElement>("[data-swell]");
const canvas = root?.querySelector("canvas");

if (root && canvas) {
	const header = root.querySelector<HTMLElement>("[data-site-header]");
	const layer = root.querySelector<HTMLElement>("[data-title]");
	const time = root.querySelector<HTMLElement>("[data-clock-time]");
	const phase = root.querySelector<HTMLElement>("[data-clock-phase]");
	const still = reducedMotion();
	// The sky above the header is dark at dawn whatever the CMS poster looks like.
	header?.style.removeProperty("--top");

	let ocean: Ocean | null = null;
	let t = pageProgress();
	let applied = -1;
	let shown = -1;

	const loop = onFrame(canvas, (seconds, dt) => {
		const target = pageProgress();
		t = still ? target : damp(t, target, 4, dt);
		const moment = sample(t);

		if (Math.abs(t - applied) > 2e-4) {
			applied = t;
			for (const [name, value] of Object.entries(cssVars(moment)))
				root.style.setProperty(name, value);
			if (time) time.textContent = clock(moment);
			if (phase) phase.textContent = moment.phase;
		}

		// The title holds the horizon and dissolves as the sun clears it; the header wordmark takes over.
		const title = 1 - smoothstep(0.06, 0.5, scrollY / innerHeight);
		if (title !== shown) {
			shown = title;
			root.style.setProperty("--sw-title", String(title));
			header?.style.setProperty("--mark", String(1 - title));
			layer?.toggleAttribute("data-gone", title === 0);
		}

		ocean?.render(still ? 14 : seconds, moment);
	});

	addEventListener("scroll", loop.redraw, { passive: true });
	addEventListener("resize", loop.redraw);

	import("./ocean")
		.then(({ createOcean }) => {
			ocean = createOcean(canvas);
			loop.redraw();
			requestAnimationFrame(() => canvas.setAttribute("data-live", ""));
		})
		.catch((error: unknown) => console.warn("Swell: no WebGL, keeping the gradient sky.", error));

	canvas.addEventListener("webglcontextlost", (event) => {
		event.preventDefault();
		canvas.removeAttribute("data-live");
	});
	canvas.addEventListener("webglcontextrestored", () => canvas.setAttribute("data-live", ""));

	addEventListener("pagehide", ({ persisted }) => {
		if (persisted) return;
		loop.stop();
		ocean?.dispose();
	});
}
