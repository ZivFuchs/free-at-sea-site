import { clamp, damp, lerp, onFrame, reducedMotion } from "@/lab/lib/motion";
import type { Audio } from "./audio";
import { createPlot } from "./plot";
import { createSea, type Mix, SOURCES, ZONES } from "./signal";

const STILL_SEED = 7;

const mixAt = (zone: number): Mix => {
	const i = Math.min(Math.floor(zone), ZONES.length - 2);
	const [a, b] = [ZONES[i], ZONES[i + 1]];
	if (!a || !b) throw new Error("No listening zones");
	return Object.fromEntries(SOURCES.map((s) => [s, lerp(a.mix[s], b.mix[s], zone - i)])) as Mix;
};

const depthAt = (zone: number) => {
	const i = Math.min(Math.floor(zone), ZONES.length - 2);
	const [a, b] = [ZONES[i]?.depth ?? 1, ZONES[i + 1]?.depth ?? 1];
	const metres = a * (b / a) ** (zone - i);
	const step = metres < 20 ? 1 : metres < 200 ? 5 : 50;
	return Math.round(metres / step) * step;
};

/** The spectrogram backdrop: listening depth follows the `[data-listen="<zone>"]` section nearest mid-screen. */
export const hydrophone = (root: HTMLElement) => {
	const canvas = root.querySelector("canvas");
	const plot = canvas && createPlot(canvas);
	if (!canvas || !plot) return;

	const still = reducedMotion();
	const stops = [...document.querySelectorAll<HTMLElement>("[data-listen]")];
	const depth = document.querySelector<HTMLElement>("[data-hydro-depth]");
	const layer = document.querySelector<HTMLElement>("[data-hydro-zone]");
	const toggle = document.querySelector<HTMLButtonElement>("[data-hydro-listen]");

	/** Fractional zone at mid-screen, interpolated between the stops either side. */
	const target = () => {
		const mid = innerHeight / 2;
		let [zone, before] = [Number(stops[0]?.dataset.listen ?? 0), Number.NEGATIVE_INFINITY];
		for (const stop of stops) {
			const r = stop.getBoundingClientRect();
			const [at, value] = [r.top + r.height / 2, Number(stop.dataset.listen)];
			if (at >= mid)
				return before === Number.NEGATIVE_INFINITY
					? value
					: lerp(zone, value, (mid - before) / (at - before));
			[zone, before] = [value, at];
		}
		return zone;
	};

	let zone = target();
	let now = 0;
	let sea = createSea(still ? STILL_SEED : Date.now(), -20);
	let audio: Audio | null = null;
	let shown = "";
	let plate = Math.round(zone);

	const refill = () => {
		sea = createSea(still ? STILL_SEED : Date.now(), now - plot.span - 2);
		plot.prefill(sea, mixAt(zone), now);
	};
	plot.resize();
	refill();
	root.setAttribute("data-live", "");

	const loop = onFrame(canvas, (_, dt) => {
		if (plot.resize()) refill();
		zone = still ? target() : damp(zone, target(), 2.5, dt);
		// Reduced motion: a still plate per listening depth.
		if (still && Math.round(zone) !== plate) {
			plate = Math.round(zone);
			zone = plate;
			refill();
		}
		const mix = mixAt(clamp(zone, 0, ZONES.length - 1));
		if (!still) {
			now += dt;
			for (const e of sea.advance(now, mix, plot.span + 2)) audio?.play(e, e.start - now);
			plot.step(sea, mix, now);
			audio?.update(mix, now, zone);
		}
		plot.draw(sea, mix, now);

		const label = `${depthAt(zone).toLocaleString("en")} m`;
		if (label !== shown && depth) depth.textContent = shown = label;
		const name = ZONES[Math.round(zone)]?.name ?? "";
		if (layer && layer.textContent !== name) layer.textContent = name;
	});
	addEventListener("scroll", loop.redraw, { passive: true });
	addEventListener("resize", loop.redraw);

	toggle?.addEventListener("click", async () => {
		const on = toggle.getAttribute("aria-pressed") !== "true";
		toggle.setAttribute("aria-pressed", String(on));
		audio ??= (await import("./audio")).createAudio();
		await audio.turn(on);
	});
	document.addEventListener("visibilitychange", () => audio?.hold(document.hidden));
	addEventListener("pagehide", () => {
		loop.stop();
		audio?.close();
	});
};
