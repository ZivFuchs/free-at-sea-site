import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, lerp, reducedMotion, smoothstep } from "@/lab/lib/motion";
import scene from "./scene.frag?raw";

/** Dark to light. Strokes (`EDGES`) are kept out of it so waves read as lines, not texture. */
const RAMP = [" ", ".", "·", ":", ";", "+", "=", "*", "o", "a", "%", "#"] as const;
const EDGES = ["~", "-", "|", "/", "\\"] as const;
/** Glyph cell height over width. */
const LEADING = 1.8;
/** Where the barge sits in the still, and how much of the still's width frames it. */
const BARGE = { x: 0.5, y: 0.615, wide: 0.3, tall: 0.19 } as const;
const HORIZON = 0.56;
const RIPPLE_GAP = 26;

type Rgb = readonly [number, number, number];
type Ripple = readonly [number, number, number];

const cssRgb = (value: string): Rgb => {
	const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	if (!ctx) return [1, 1, 1];
	ctx.fillStyle = value;
	ctx.fillRect(0, 0, 1, 1);
	const [r = 255, g = 255, b = 255] = ctx.getImageData(0, 0, 1, 1).data;
	return [r / 255, g / 255, b / 255];
};

const token = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

const loadImage = (src: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});

const blank = () => {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 2;
	canvas.getContext("2d")?.fillRect(0, 0, 2, 2);
	return canvas;
};

const init = (root: HTMLElement) => {
	const canvas = root.querySelector<HTMLCanvasElement>("[data-ascii-canvas]");
	const resolve = root.querySelector<HTMLElement>("[data-ascii-resolve]");
	const content = root.querySelector<HTMLElement>("[data-ascii-content]");
	const readout = root.querySelector<HTMLElement>("[data-ascii-readout]");
	if (!canvas || !resolve || !content) return;

	const still = reducedMotion();
	const title = (root.dataset.title ?? "").toUpperCase();
	const letters = [...title.replaceAll(" ", "")];
	const glyphs = [...RAMP, ...EDGES, ...letters];
	const mono = getComputedStyle(root).fontFamily;
	const display = token(document.documentElement, "--font-anton") || "sans-serif";
	const colours = {
		ground: cssRgb(token(root, "--ascii-ground")),
		aqua: cssRgb(token(root, "--ascii-aqua")),
		paper: cssRgb(token(root, "--ascii-paper")),
	};

	const atlas = document.createElement("canvas");
	const titleMask = document.createElement("canvas");
	let cell: readonly [number, number] = [0, 0];
	let photoAspect = 16 / 9;
	let clipAspect = 16 / 9;
	let clipTarget = 0;
	let clipMix = 0;
	let boot = still ? 1 : 0;
	let last = 0;
	let label = "";
	const ripples: Ripple[] = [
		[0, 0, -9],
		[0, 0, -9],
		[0, 0, -9],
		[0, 0, -9],
	];
	let nextRipple = 0;

	const captions = [...root.querySelectorAll<HTMLElement>("[data-ascii-caption]")];

	const frame = (time: number) => {
		const dt = last ? Math.min(time - last, 0.1) : 1 / 30;
		last = time;
		const vw = canvas.clientWidth || innerWidth;
		const vh = canvas.clientHeight || innerHeight;
		const px = canvas.width / vw || 1;
		const aspect = vw / vh;
		const portrait = aspect < 0.8;

		const r = resolve.getBoundingClientRect();
		const p = clamp(-r.top / Math.max(r.height - vh, 1));
		/** 0 as the content's top reaches the viewport bottom, 1 once it has risen a full screen. */
		const settled = clamp((vh - content.getBoundingClientRect().top) / vh);
		const hero = clamp(scrollY / vh);

		const coarse = clamp(vw / (portrait ? 40 : 112), 8, 15);
		const fine = Math.max(4.5, coarse * 0.46);
		const size = lerp(lerp(coarse, fine, smoothstep(0.22, 0.7, p)), coarse * 0.8, settled);
		const cw = Math.max(3, Math.round(size * px));
		const ch = Math.round(cw * LEADING);
		if (cw !== cell[0]) {
			cell = [cw, ch];
			drawAtlas(cw, ch);
		}

		boot = still ? 1 : Math.min(1, boot + dt / 1.4);
		clipMix = still ? clipTarget : damp(clipMix, clipTarget, 5, dt);
		const photoMix = smoothstep(0.02, 0.26, p) * (1 - smoothstep(0.05, 0.7, settled));

		const zoom = smoothstep(0.28, 0.9, p);
		const cover = Math.min(1, aspect / photoAspect);
		const wide = lerp(cover, portrait ? BARGE.tall : BARGE.wide, zoom);
		const tall = (wide / aspect) * photoAspect;
		const view: Rgb = [
			clamp(lerp(0.5, BARGE.x, zoom), wide / 2, 1 - wide / 2),
			clamp(lerp(0.5, BARGE.y, zoom), tall / 2, 1 - tall / 2),
			wide,
		];

		for (const [i, caption] of captions.entries()) {
			const at = (i + 0.5) / captions.length;
			const on = 1 - smoothstep(0.3, 0.5, Math.abs(p - at) * captions.length);
			caption.style.opacity = String(p <= 0 || p >= 1 ? 0 : on);
		}

		const cols = Math.ceil(canvas.width / cw);
		const rows = Math.ceil(canvas.height / ch);
		if (readout) {
			const what = clipMix > 0.5 ? "clip" : photoMix > 0.5 ? "barge" : "swell";
			const next = `${cols}×${rows} · ${(cw / px).toFixed(1)}px · ${what}`;
			if (next !== label) {
				label = next;
				readout.textContent = next;
			}
		}

		return {
			u_t: still ? 20 : Math.floor(time * 15) / 15,
			u_px: px,
			u_cell: [cw, ch],
			u_grid: [cols, rows],
			u_glyphs: glyphs.length,
			u_ramp: RAMP.length,
			u_letters: Math.max(letters.length, 1),
			u_horizon: HORIZON - hero * 0.12,
			u_shift: -hero * 0.12,
			u_titleOn: 1 - smoothstep(0.12, 0.62, hero),
			u_photoMix: photoMix,
			u_clipMix: clipMix,
			u_dim: lerp(lerp(1, 0.32, settled), 0.62, clipMix * settled),
			u_boot: boot,
			u_view: view,
			u_photoAspect: photoAspect,
			u_clipAspect: clipAspect,
			u_ground: colours.ground,
			u_aqua: colours.aqua,
			u_paper: colours.paper,
			u_r0: ripples[0] ?? [0, 0, -9],
			u_r1: ripples[1] ?? [0, 0, -9],
			u_r2: ripples[2] ?? [0, 0, -9],
			u_r3: ripples[3] ?? [0, 0, -9],
		} as const;
	};

	const shader = runShader(canvas, {
		fragment: `precision highp float;\n${noise}\n${scene}`,
		fps: 30,
		uniforms: frame,
		textures: { u_atlas: blank(), u_title: blank(), u_photo: blank(), u_clip: blank() },
	});
	if (!shader) {
		for (const el of root.querySelectorAll("[data-ascii-canvas], h1"))
			el.setAttribute("data-fallback", "");
		return;
	}

	function drawAtlas(cw: number, ch: number) {
		atlas.width = glyphs.length * cw;
		atlas.height = ch;
		const ctx = atlas.getContext("2d");
		if (!ctx) return;
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, atlas.width, ch);
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		const size = cw / 0.6;
		for (const [i, glyph] of glyphs.entries()) {
			const letter = i >= RAMP.length + EDGES.length;
			ctx.font = `${letter ? 700 : 400} ${size}px ${mono}`;
			ctx.fillText(glyph, (i + 0.5) * cw, ch * 0.72, cw * 1.1);
		}
		shader?.texture("u_atlas", atlas);
	}

	/** The title as a coverage mask the size of the viewport, standing on the horizon. */
	const drawTitle = async () => {
		await document.fonts.load(`100px ${display}`).catch(() => {});
		const vw = canvas.clientWidth || innerWidth;
		const vh = canvas.clientHeight || innerHeight;
		const w = Math.min(1280, Math.max(512, Math.round(vw)));
		const h = Math.round((w * vh) / vw);
		titleMask.width = w;
		titleMask.height = h;
		const ctx = titleMask.getContext("2d");
		if (!ctx) return;
		const words = title.split(" ");
		const lines =
			vw / vh < 0.8 && words.length > 1 ? [words[0] ?? "", words.slice(1).join(" ")] : [title];
		ctx.font = `100px ${display}`;
		const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
		const size = Math.min(
			(100 * w * (lines.length > 1 ? 0.86 : 0.8)) / widest,
			(h * 0.36) / lines.length,
		);
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, w, h);
		ctx.filter = `blur(${w / 500}px)`;
		ctx.fillStyle = "white";
		ctx.font = `${size}px ${display}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		for (const [i, line] of lines.entries()) {
			ctx.fillText(line, w / 2, h * HORIZON - (lines.length - 1 - i) * size * 0.98 - size * 0.03);
		}
		shader.texture("u_title", titleMask);
	};

	drawTitle();
	let width = innerWidth;
	addEventListener("resize", () => {
		if (innerWidth === width) return;
		width = innerWidth;
		drawTitle();
	});

	const photo = root.dataset.photo;
	if (photo) {
		loadImage(photo)
			.then((img) => {
				photoAspect = img.naturalWidth / img.naturalHeight;
				shader.texture("u_photo", img);
			})
			.catch(() => {});
	}

	/* Clip rows put their poster on the grid while hovered, focused, or (touch) crossing mid-screen. */
	const rows = [...root.querySelectorAll<HTMLElement>("[data-ascii-clip]")];
	const posters = new Map<string, Promise<HTMLImageElement | null>>();
	let showing = "";
	const show = (src: string) => {
		showing = src;
		if (!src) {
			clipTarget = 0;
			shader.redraw();
			return;
		}
		if (!posters.has(src))
			posters.set(
				src,
				loadImage(src).catch(() => null),
			);
		posters.get(src)?.then((img) => {
			if (!img || showing !== src) return;
			try {
				shader.texture("u_clip", img);
				clipAspect = img.naturalWidth / img.naturalHeight;
				clipMix = still ? 1 : 0;
				clipTarget = 1;
			} catch {
				clipTarget = 0;
			}
		});
	};
	for (const row of rows) {
		const src = row.dataset.poster ?? "";
		row.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && show(src));
		row.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && show(""));
		row.addEventListener("focus", () => show(src));
		row.addEventListener("blur", () => show(""));
	}
	if (matchMedia("(hover: none)").matches && rows.length > 0) {
		const centred = new Set<HTMLElement>();
		const io = new IntersectionObserver(
			(entries) => {
				for (const { target, isIntersecting } of entries) {
					if (!(target instanceof HTMLElement)) continue;
					if (isIntersecting) centred.add(target);
					else centred.delete(target);
				}
				show(rows.find((row) => centred.has(row))?.dataset.poster ?? "");
			},
			{ rootMargin: "-46% 0px -46% 0px" },
		);
		for (const row of rows) io.observe(row);
	}

	if (!still) {
		let at: readonly [number, number] = [-99, -99];
		const stir = (e: PointerEvent, force = false) => {
			if (!force && Math.hypot(e.clientX - at[0], e.clientY - at[1]) < RIPPLE_GAP) return;
			at = [e.clientX, e.clientY];
			const px = canvas.width / (canvas.clientWidth || 1);
			ripples[nextRipple] = [e.clientX * px, e.clientY * px, performance.now() / 1000];
			nextRipple = (nextRipple + 1) % ripples.length;
		};
		addEventListener("pointermove", (e) => stir(e), { passive: true });
		addEventListener("pointerdown", (e) => stir(e, true), { passive: true });
	} else {
		addEventListener("scroll", shader.redraw, { passive: true });
	}

	addEventListener("pagehide", shader.stop, { once: true });
};

for (const root of document.querySelectorAll<HTMLElement>("[data-ascii]")) init(root);
