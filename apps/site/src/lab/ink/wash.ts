import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, reducedMotion } from "@/lab/lib/motion";
import fragment from "./wash.frag?raw";
import { KINDS, PIGMENTS, type Wash } from "./washes";

const MAX = 8;
const BLOOMS = 4;
const MAX_DPR = 1.5;
const MAX_PIXELS = 2.6e6;
const DRY_SECONDS = 6;
const BLOOM_SECONDS = 3;
const BLOOM_TRAVEL = 240;
const VERTEX = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

interface Bloom {
	x: number;
	y: number;
	radius: number;
	born: number;
}

interface Sheet {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	washes: readonly Wash[];
	origin: number;
	/** Seconds painted so far, and when the last wash is dry. */
	time: number;
	end: number;
	started: boolean;
	visible: boolean;
	stale: boolean;
	blooms: Bloom[];
	photo: { texture: WebGLTexture; aspect: number } | null;
	/** Waiting on its photograph. */
	pending: boolean;
}

const parse = (canvas: HTMLCanvasElement): readonly Wash[] =>
	(JSON.parse(canvas.dataset.wash ?? "[]") as Wash[]).slice(0, MAX);

/** A tile of paper tooth for the page ground, so bare paper and painted paper share a surface. */
const grain = () => {
	const size = 192;
	const tile = document.createElement("canvas");
	tile.width = tile.height = size;
	const ctx = tile.getContext("2d");
	if (!ctx) return null;
	const image = ctx.createImageData(size, size);
	for (let i = 0; i < size * size; i++) {
		const v = 252 - Math.random() * 15 - (Math.random() < 0.015 ? 12 : 0);
		image.data.set([v, v, v, 255], i * 4);
	}
	ctx.putImageData(image, 0, 0);
	return tile.toDataURL();
};

/**
 * Paints every `canvas[data-wash]` under `root`. One hidden WebGL context renders each sheet and copies it into
 * the sheet's own 2D canvas, so sheets scroll with the page and cost nothing once dry.
 */
export const paint = (root: HTMLElement) => {
	const tile = grain();
	if (tile) root.style.setProperty("--ink-grain", `url(${tile})`);

	const canvases = [...root.querySelectorAll<HTMLCanvasElement>("canvas[data-wash]")];
	const surface = document.createElement("canvas");
	const gl = surface.getContext("webgl", { alpha: false, antialias: false, depth: false });
	const program = gl?.createProgram();
	const compile = (type: GLenum, source: string) => {
		const shader = gl?.createShader(type);
		if (!gl || !shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
		console.error(gl.getShaderInfoLog(shader));
		return null;
	};
	const vs = compile(gl?.VERTEX_SHADER ?? 0, VERTEX);
	const fs = compile(gl?.FRAGMENT_SHADER ?? 0, `precision highp float;\n${noise}\n${fragment}`);
	const fail = () => {
		root.setAttribute("data-ink-flat", "");
		for (const img of root.querySelectorAll<HTMLElement>("[data-wash-fallback]"))
			img.hidden = false;
	};
	if (!gl || !program || !vs || !fs) return fail();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return fail();

	// biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	const at = (name: string) => gl.getUniformLocation(program, name);
	const uniform = {
		res: at("u_res"),
		scale: at("u_scale"),
		origin: at("u_origin"),
		count: at("u_count"),
		rect: at("u_rect"),
		a: at("u_a"),
		b: at("u_b"),
		cover: at("u_cover"),
		bloom: at("u_bloom"),
	};
	const blank = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, blank);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		1,
		1,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		new Uint8Array([255, 255, 255, 255]),
	);

	const still = reducedMotion();
	const sheets: Sheet[] = [];
	let frame = 0;
	let last = 0;

	const request = () => {
		frame ||= requestAnimationFrame(tick);
	};

	const load = (sheet: Sheet, src: string) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => {
			const texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			sheet.photo = { texture, aspect: image.naturalWidth / image.naturalHeight };
			sheet.pending = false;
			sheet.stale = true;
			request();
		};
		/* No CORS, no texture: show the plain image instead. */
		image.onerror = () => {
			const fallback =
				sheet.canvas.parentElement?.querySelector<HTMLElement>("[data-wash-fallback]");
			if (fallback) fallback.hidden = false;
			sheet.canvas.hidden = true;
		};
		image.src = src;
	};

	const draw = (sheet: Sheet, now: number) => {
		const { canvas, ctx, washes } = sheet;
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (!w || !h) return;
		const scale = Math.min(devicePixelRatio, MAX_DPR, Math.sqrt(MAX_PIXELS / (w * h)));
		const W = Math.round(w * scale);
		const H = Math.round(h * scale);
		if (canvas.width !== W || canvas.height !== H) {
			canvas.width = W;
			canvas.height = H;
		}
		if (surface.width < W || surface.height < H) {
			surface.width = Math.max(surface.width, W);
			surface.height = Math.max(surface.height, H);
		}
		gl.viewport(0, 0, W, H);

		const rect = new Float32Array(MAX * 4);
		const a = new Float32Array(MAX * 4);
		const b = new Float32Array(MAX * 4);
		let cover: [number, number, number, number] = [1, 1, 0, 0];
		washes.forEach((wash, i) => {
			const [x, y, ww, hh] = wash.rect;
			const { delay = 0, duration = 1.5 } = wash;
			rect.set([x * w, y * h, ww * w, hh * h], i * 4);
			a.set(
				[
					KINDS.indexOf(wash.kind),
					PIGMENTS.indexOf(wash.pigment),
					PIGMENTS.indexOf(wash.mix ?? wash.pigment),
					wash.strength,
				],
				i * 4,
			);
			b.set(
				[
					clamp((sheet.time - delay) / duration),
					clamp((sheet.time - delay - duration) / DRY_SECONDS),
					((wash.angle ?? 0) * Math.PI) / 180,
					i * 3.7 + 1,
				],
				i * 4,
			);
			if (wash.kind === "photo" && sheet.photo) {
				const ratio = (ww * w) / (hh * h) / sheet.photo.aspect;
				cover = ratio > 1 ? [1, 1 / ratio, 0, 0] : [ratio, 1, 0, 0];
			}
		});
		const bloom = new Float32Array(BLOOMS * 4);
		sheet.blooms.forEach(({ x, y, radius, born }, i) => {
			bloom.set([x, y, still ? 1 : clamp((now - born) / 1000 / BLOOM_SECONDS), radius], i * 4);
		});

		gl.bindTexture(gl.TEXTURE_2D, sheet.photo?.texture ?? blank);
		gl.uniform2f(uniform.res, W, H);
		gl.uniform1f(uniform.scale, scale);
		gl.uniform2f(uniform.origin, sheet.origin, sheet.origin * 0.37);
		gl.uniform1i(uniform.count, washes.length);
		gl.uniform4fv(uniform.rect, rect);
		gl.uniform4fv(uniform.a, a);
		gl.uniform4fv(uniform.b, b);
		gl.uniform4f(uniform.cover, ...cover);
		gl.uniform4fv(uniform.bloom, bloom);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		ctx.drawImage(surface, 0, surface.height - H, W, H, 0, 0, W, H);
	};

	function tick(now: number) {
		frame = 0;
		const dt = Math.min((now - last) / 1000, 0.1);
		last = now;
		let busy = false;
		for (const sheet of sheets) {
			if (!sheet.visible || !sheet.started || sheet.pending) continue;
			const wet = sheet.time < sheet.end;
			const blooming = sheet.blooms.some(({ born }) => now - born < BLOOM_SECONDS * 1000);
			if (!wet && !blooming && !sheet.stale) continue;
			if (wet) sheet.time = still ? sheet.end : sheet.time + dt;
			sheet.stale = false;
			draw(sheet, now);
			busy ||= sheet.time < sheet.end || blooming;
		}
		if (busy && !document.hidden) request();
	}

	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const sheet = sheets.find(({ canvas }) => canvas === entry.target);
				if (!sheet) continue;
				sheet.visible = entry.isIntersecting;
				const { height } = entry.intersectionRect;
				if (entry.intersectionRatio >= 0.3 || height > innerHeight * 0.35) sheet.started = true;
				if (sheet.visible) sheet.stale = true;
			}
			last = performance.now();
			request();
		},
		{ threshold: [0, 0.3, 0.6] },
	);
	const resize = new ResizeObserver((entries) => {
		for (const { target } of entries) {
			const sheet = sheets.find(({ canvas }) => canvas === target);
			if (sheet) sheet.stale = true;
		}
		request();
	});

	for (const canvas of canvases) {
		const ctx = canvas.getContext("2d");
		if (!ctx) continue;
		const washes = parse(canvas);
		const sheet: Sheet = {
			canvas,
			ctx,
			washes,
			origin: Math.random() * 4000,
			time: 0,
			end:
				Math.max(...washes.map(({ delay = 0, duration = 1.5 }) => delay + duration)) + DRY_SECONDS,
			started: false,
			visible: false,
			stale: true,
			blooms: [],
			photo: null,
			pending: Boolean(canvas.dataset.photo),
		};
		sheets.push(sheet);
		if (canvas.dataset.photo) load(sheet, canvas.dataset.photo);
		io.observe(canvas);
		resize.observe(canvas);
	}

	/* The pointer is a brush loaded with clean water. */
	let travel = 0;
	const wet = (x: number, y: number) => {
		const now = performance.now();
		for (const sheet of sheets) {
			if (!sheet.visible || !sheet.started || sheet.time < 1) continue;
			const box = sheet.canvas.getBoundingClientRect();
			if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
			sheet.blooms.push({
				x: x - box.left,
				y: y - box.top,
				radius: 22 + Math.random() * 30,
				born: now,
			});
			if (sheet.blooms.length > BLOOMS) sheet.blooms.shift();
		}
		last = now;
		request();
	};
	if (!still) {
		addEventListener("pointerdown", ({ clientX, clientY }) => wet(clientX, clientY), {
			passive: true,
		});
		addEventListener(
			"pointermove",
			({ clientX, clientY, movementX, movementY, pointerType }) => {
				if (pointerType !== "mouse") return;
				travel += Math.hypot(movementX, movementY);
				if (travel < BLOOM_TRAVEL) return;
				travel = 0;
				wet(clientX, clientY);
			},
			{ passive: true },
		);
	}
	document.addEventListener("visibilitychange", () => {
		last = performance.now();
		request();
	});
	addEventListener("pagehide", () => {
		cancelAnimationFrame(frame);
		io.disconnect();
		resize.disconnect();
	});
};
