import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, lerp, reducedMotion, smoothstep } from "@/lab/lib/motion";
import body from "./engraving.frag?raw";
import head from "./head.glsl?raw";

type Rgb = readonly [number, number, number];

const FRAGMENT = [head, noise, body].join("\n");
/** Line spacing in CSS px: coarse while engraved, fine as the plate resolves. */
const PITCH = { hero: [6.5, 3.4], clip: [4.6, 3] } as const;

/** A theme colour as sRGB 0–1, whatever notation the token uses. */
const themeColor = (token: string): Rgb => {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 1;
	const ctx = canvas.getContext("2d");
	if (!ctx) return [0, 0, 0];
	ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token);
	ctx.fillRect(0, 0, 1, 1);
	const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
	return [r / 255, g / 255, b / 255];
};

/** Decoded with CORS so WebGL may read it; rejects when the host doesn't allow that. */
const load = async (src: string) => {
	const img = new Image();
	img.crossOrigin = "anonymous";
	img.src = src;
	await img.decode();
	return img;
};

const vec2 = (x: number, y: number) => [x, y] as const;

const scale = (canvas: HTMLCanvasElement) => canvas.width / Math.max(canvas.clientWidth, 1);

/** Hero: engraved vignette that develops into the full-bleed photograph as its pinned section scrolls through. */
const hero = async (canvas: HTMLCanvasElement, ink: Rgb, paper: Rgb) => {
	const section = canvas.closest<HTMLElement>("[data-engraving-hero]");
	const { src = "", local = "", video: videoSrc, horizon = "0.5" } = canvas.dataset;
	if (!section) return;
	const remote = src === local ? null : await load(src).catch(() => null);
	const img = remote ?? (await load(local));
	let aspect = img.naturalWidth / img.naturalHeight;
	const focus = vec2(0.5, 1 - Number(horizon));

	const progress = () => {
		const r = section.getBoundingClientRect();
		return clamp(-r.top / Math.max(r.height - innerHeight, 1));
	};

	const shader = runShader(canvas, {
		fragment: FRAGMENT,
		textures: { u_img: img },
		uniforms: () => {
			const p = progress();
			const reveal = smoothstep(0.3, 0.9, p);
			const vignette = 1 - smoothstep(0.12, 0.7, p);
			section.style.setProperty("--open", (1 - vignette).toFixed(3));
			const portrait = canvas.height > canvas.width;
			return {
				u_aspect: aspect,
				u_focus: focus,
				u_pitch: lerp(PITCH.hero[0], PITCH.hero[1], smoothstep(0, 0.85, p)) * scale(canvas),
				u_reveal: reveal,
				u_vignette: vignette,
				u_centre: vec2(0.5, portrait ? 0.43 : 0.4),
				u_radius: portrait ? vec2(0.64, 0.26) : vec2(0.46, 0.28),
				u_persp: 1,
				u_levels: vec2(-0.12, 0.9),
				u_ink: ink,
				u_paper: paper,
			};
		},
	});
	if (!shader) return;
	canvas.setAttribute("data-live", "");
	addEventListener("scroll", shader.redraw, { passive: true });

	if (!videoSrc || !remote || reducedMotion()) return;
	const video = document.createElement("video");
	video.crossOrigin = "anonymous";
	video.muted = true;
	video.loop = true;
	video.playsInline = true;
	video.src = videoSrc;
	const pump = () => {
		shader.texture("u_img", video);
		video.requestVideoFrameCallback(pump);
	};
	video.addEventListener(
		"playing",
		() => {
			aspect = video.videoWidth / video.videoHeight;
			video.requestVideoFrameCallback(pump);
		},
		{ once: true },
	);
	new IntersectionObserver(([entry]) => {
		if (entry?.isIntersecting) video.play().catch(() => {});
		else video.pause();
	}).observe(section);
	addEventListener("pagehide", () => video.pause());
};

/** A clip poster: engraved at rest, developed while hovered, focused or (on touch) centred on screen. */
const clip = async (canvas: HTMLCanvasElement, ink: Rgb, paper: Rgb) => {
	const figure = canvas.closest<HTMLElement>("[data-plate-figure]");
	if (!figure) return;
	/** No shader (CORS or WebGL): the poster itself goes monochrome until developed. */
	const fallback = () => {
		const sync = () => figure.toggleAttribute("data-mono", !figure.hasAttribute("data-developed"));
		new MutationObserver(sync).observe(figure, { attributeFilter: ["data-developed"] });
		sync();
	};
	const img = await load(canvas.dataset.src ?? "").catch(() => null);
	if (!img) return fallback();

	let reveal = 0;
	let last = 0;
	const shader = runShader(canvas, {
		fragment: FRAGMENT,
		textures: { u_img: img },
		uniforms: (time) => {
			const target = figure.hasAttribute("data-developed") ? 1 : 0;
			reveal = reducedMotion() ? target : damp(reveal, target, 3.2, Math.min(time - last, 0.1));
			last = time;
			return {
				u_aspect: img.naturalWidth / img.naturalHeight,
				u_focus: vec2(0.5, 0.5),
				u_pitch: lerp(PITCH.clip[0], PITCH.clip[1], reveal) * scale(canvas),
				u_reveal: reveal,
				u_vignette: 0,
				u_centre: vec2(0.5, 0.5),
				u_radius: vec2(1, 1),
				u_persp: 0,
				u_levels: vec2(-0.3, 0.72),
				u_ink: ink,
				u_paper: paper,
			};
		},
	});
	if (!shader) return fallback();
	canvas.setAttribute("data-live", "");
	new MutationObserver(shader.redraw).observe(figure, { attributeFilter: ["data-developed"] });
};

export const engrave = () => {
	const ink = themeColor("--app-ink");
	const paper = themeColor("--app-paper");
	const touch = matchMedia("(hover: none)").matches;

	for (const canvas of document.querySelectorAll<HTMLCanvasElement>("canvas[data-plate]")) {
		if (canvas.dataset.plate === "hero") {
			hero(canvas, ink, paper).catch(() => {});
			continue;
		}
		const figure = canvas.closest<HTMLElement>("[data-plate-figure]");
		if (!figure) continue;
		const develop = (on: boolean) => figure.toggleAttribute("data-developed", on);
		if (touch) {
			new IntersectionObserver(([entry]) => develop(entry?.isIntersecting ?? false), {
				rootMargin: "-38% 0px -38% 0px",
			}).observe(figure);
		} else {
			figure.addEventListener("pointerenter", () => develop(true));
			figure.addEventListener("pointerleave", () => develop(figure.matches(":focus-within")));
			figure.addEventListener("focusin", () => develop(true));
			figure.addEventListener("focusout", () => develop(figure.matches(":hover")));
		}
		const lazy = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				lazy.disconnect();
				clip(canvas, ink, paper);
			},
			{ rootMargin: "400px" },
		);
		lazy.observe(canvas);
	}
};
