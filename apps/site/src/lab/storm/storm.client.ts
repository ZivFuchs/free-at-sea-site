import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, lerp, reducedMotion, smoothstep } from "@/lab/lib/motion";
import rain from "./rain.frag?raw";

const PRECISION =
	"#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";
const SOFT_WIDTH = 512;
/** CSS px of viewport height at which drops are their designed size. */
const DESIGN_HEIGHT = 820;
const STILL_TIME = 40;

const WEATHER = ["rain", "wet", "gloom", "veil", "washed", "wind"] as const;
type Weather = Record<(typeof WEATHER)[number], number>;

const STATES = ["Fair", "Glass falling", "Squall", "Clearing", "Washed clean"] as const;

const load = (src: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});

/** The weather at this scroll position: calm over the hero, squall mid-page, cleared by the last section. */
const forecast = (hero: HTMLElement, clearing: HTMLElement): Weather => {
	const out = Math.max(0, scrollY) / Math.max(1, hero.offsetHeight);
	const back = clamp((innerHeight - clearing.getBoundingClientRect().top) / innerHeight);
	const rain = smoothstep(0.4, 1.5, out) * (1 - smoothstep(0, 0.55, back));
	const washed = smoothstep(0.3, 1, back);
	return {
		rain,
		wet: Math.max(rain, smoothstep(0.25, 0.7, out) * 0.3 * (1 - back), washed * 0.28),
		gloom: smoothstep(0.12, 0.95, out) * (1 - smoothstep(0.1, 0.8, back)),
		veil: smoothstep(0.3, 1, out) * (1 - smoothstep(0.15, 0.85, back)) * 0.22,
		washed,
		wind: smoothstep(0.8, 1.8, out) * (1 - smoothstep(0, 0.4, back)),
	};
};

const describe = ({ rain, gloom, washed }: Weather) => {
	if (washed > 0.6) return STATES[4];
	if (washed > 0.02) return STATES[3];
	if (rain > 0.45) return STATES[2];
	return gloom > 0.08 ? STATES[1] : STATES[0];
};

export const storm = async (root: HTMLElement) => {
	const canvas = root.querySelector("canvas");
	const hero = document.querySelector<HTMLElement>("[data-storm-hero]");
	const clearing = document.querySelector<HTMLElement>("[data-storm-clearing]");
	if (!canvas || !hero || !clearing) return;
	const ready = () => hero.setAttribute("data-ready", "");

	const still = reducedMotion();
	const { scene = "", fallback = "", video: videoSrc, horizon = "0.5" } = root.dataset;
	const readout = {
		baro: document.querySelector<HTMLElement>("[data-storm-baro]"),
		wind: document.querySelector<HTMLElement>("[data-storm-wind]"),
		state: document.querySelector<HTMLElement>("[data-storm-state]"),
	};

	let target = forecast(hero, clearing);
	const now = { ...target };
	const report = () => {
		for (const key of WEATHER) root.style.setProperty(`--${key}`, now[key].toFixed(3));
		document.documentElement.style.setProperty("--storm", now.gloom.toFixed(3));
		const set = (el: HTMLElement | null, text: string) => {
			if (el && el.textContent !== text) el.textContent = text;
		};
		set(readout.baro, String(Math.round(lerp(1017, 994, now.gloom) + now.washed * 9)));
		set(readout.wind, String(Math.round(6 + now.wind * 28 + now.gloom * 5)).padStart(2, "0"));
		set(readout.state, describe(now));
	};
	report();

	const soft = document.createElement("canvas");
	const pen = soft.getContext("2d");
	const size: [number, number] = [1, 1];
	const blurred = (source: HTMLImageElement | HTMLVideoElement, w: number, h: number) => {
		size[0] = w;
		size[1] = h;
		soft.width = SOFT_WIDTH;
		soft.height = Math.round((SOFT_WIDTH * h) / w);
		if (pen) {
			pen.filter = "blur(2px)";
			pen.drawImage(source, 0, 0, soft.width, soft.height);
		}
		return soft;
	};

	let shader: ReturnType<typeof runShader> = null;
	const update = () => {
		target = forecast(hero, clearing);
		if (shader) return shader.redraw();
		Object.assign(now, target);
		report();
	};
	addEventListener("scroll", update, { passive: true });
	addEventListener("resize", update);

	const image = await load(scene).catch(() => load(fallback).catch(() => null));
	let clock = STILL_TIME;
	let last = 0;
	shader =
		image &&
		runShader(canvas, {
			fragment: PRECISION + noise + rain,
			resolution: innerWidth < 768 ? 0.8 : 1,
			textures: { u_scene: image, u_soft: blurred(image, image.naturalWidth, image.naturalHeight) },
			uniforms: (time) => {
				const dt = last ? Math.min(time - last, 0.1) : 0;
				last = time;
				for (const key of WEATHER)
					now[key] = still ? target[key] : damp(now[key], target[key], 3, dt);
				// Drops run faster in the thick of it.
				if (!still) clock += dt * (0.7 + now.rain * 0.9);
				report();
				return {
					u_tex: size,
					u_horizon: Number(horizon),
					u_zoom: innerHeight / DESIGN_HEIGHT,
					u_t: clock,
					u_rain: now.rain,
					u_wet: now.wet,
					u_gloom: now.gloom,
					u_veil: now.veil,
					u_washed: now.washed,
					u_wind: now.wind,
				};
			},
		});

	ready();
	if (!shader || !image) return;
	const live = shader;
	canvas.setAttribute("data-live", "");

	const saving = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
		?.saveData;
	if (
		!videoSrc ||
		still ||
		saving ||
		!("requestVideoFrameCallback" in HTMLVideoElement.prototype)
	) {
		return;
	}
	const video = document.createElement("video");
	Object.assign(video, { crossOrigin: "anonymous", muted: true, loop: true, playsInline: true });
	const pump = () => {
		try {
			// Throws if the CDN sends no CORS headers: the still stays.
			live.texture("u_scene", video);
			live.texture("u_soft", blurred(video, video.videoWidth, video.videoHeight));
		} catch {
			video.pause();
			live.texture("u_scene", image);
			live.texture("u_soft", blurred(image, image.naturalWidth, image.naturalHeight));
			return;
		}
		video.requestVideoFrameCallback(pump);
	};
	video.requestVideoFrameCallback(pump);
	video.src = videoSrc;
	video.play().catch(() => {});
	addEventListener("pagehide", () => {
		video.pause();
		live.stop();
	});
};
