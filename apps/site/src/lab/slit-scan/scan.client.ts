import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, elementProgress, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import display from "./shaders/display.frag?raw";
import vertex from "./shaders/quad.vert?raw";
import source from "./shaders/source.frag?raw";

const HEADER = "#version 300 es\nprecision highp float;\n";
const MODES = { scan: 0, record: 1, radial: 2, live: 3 } as const;
type Mode = keyof typeof MODES;

/** Rows of the wave record written per second; a frame enters the history every other row. */
const ROW_HZ = 30;
const MAX_DPR = 1.5;
const IDLE_MS = 2500;

interface Plate {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	mode: Mode;
	visible: boolean;
	/** Where "now" sits in the frame, 0–1 from the top left. */
	point: { x: number; y: number };
	target: { x: number; y: number };
	touched: number;
	readout: HTMLElement | null;
}

const isMode = (value: string | undefined): value is Mode => !!value && value in MODES;

const program = (gl: WebGL2RenderingContext, fragment: string) => {
	const build = (type: GLenum, text: string) => {
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, text);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
		console.error(gl.getShaderInfoLog(shader));
		return null;
	};
	const vs = build(gl.VERTEX_SHADER, vertex);
	const fs = build(gl.FRAGMENT_SHADER, fragment);
	const linked = gl.createProgram();
	if (!vs || !fs) return null;
	gl.attachShader(linked, vs);
	gl.attachShader(linked, fs);
	gl.bindAttribLocation(linked, 0, "a");
	gl.linkProgram(linked);
	if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) return null;
	const cache = new Map<string, WebGLUniformLocation | null>();
	return {
		use: () => gl.useProgram(linked),
		at: (name: string) => {
			if (!cache.has(name)) cache.set(name, gl.getUniformLocation(linked, name));
			return cache.get(name) ?? null;
		},
	};
};

const loadImage = (src: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});

export const start = async (root: HTMLElement) => {
	const still = reducedMotion();
	const small = matchMedia("(max-width: 47.99rem)").matches;
	/** History: frames kept, and their size. Phones keep fewer, smaller frames. */
	const layers = small ? 40 : 64;
	const size = small ? { w: 384, h: 216 } : { w: 640, h: 360 };
	const rows = small ? 384 : 640;
	const frameSeconds = 2 / ROW_HZ;

	const stage = document.createElement("canvas");
	const gl = stage.getContext("webgl2", { alpha: false, antialias: false, depth: false });
	const sourceProgram = gl && program(gl, HEADER + noise + source);
	const displayProgram = gl && program(gl, HEADER + display);
	const stillSrc = root.dataset.still;
	if (!gl || !sourceProgram || !displayProgram || !stillSrc) return;
	const image = await loadImage(stillSrc).catch(() => null);
	if (!image) return;

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	const texture = (unit: number, target: GLenum, wrapT: GLenum) => {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(target, gl.createTexture());
		gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
	};
	const UNIT = { input: 0, history: 1, strip: 2 } as const;

	texture(UNIT.input, gl.TEXTURE_2D, gl.CLAMP_TO_EDGE);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

	texture(UNIT.history, gl.TEXTURE_2D_ARRAY, gl.CLAMP_TO_EDGE);
	gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, size.w, size.h, layers);
	const history = gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY) as WebGLTexture;
	texture(UNIT.strip, gl.TEXTURE_2D, gl.REPEAT);
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, size.w, rows);
	const strip = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture;

	const historyTarget = gl.createFramebuffer();
	const stripTarget = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, stripTarget);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, strip, 0);

	let head = 0;
	let row = 0;
	let ticks = 0;
	let line = 0.5;

	/** Writes one row of the wave record, and every other call one frame of history, for scene time `t`. */
	const capture = (t: number) => {
		sourceProgram.use();
		gl.uniform1i(sourceProgram.at("u_img"), UNIT.input);
		gl.uniform1f(sourceProgram.at("u_t"), t);

		row = (row + 1) % rows;
		gl.bindFramebuffer(gl.FRAMEBUFFER, stripTarget);
		gl.viewport(0, row, size.w, 1);
		gl.uniform1f(sourceProgram.at("u_line"), line);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		if (ticks++ % 2) return;
		head = (head + 1) % layers;
		gl.bindFramebuffer(gl.FRAMEBUFFER, historyTarget);
		gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, history, 0, head);
		gl.viewport(0, 0, size.w, size.h);
		gl.uniform1f(sourceProgram.at("u_line"), -1);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	};

	/** Scene clock: starts mid-swell, and pre-rolls a full history so the first frame is already scanned. */
	let clock = 40;
	for (let i = 0; i < rows; i++) {
		clock += 1 / ROW_HZ;
		capture(clock);
	}

	const plates: Plate[] = [
		...root.querySelectorAll<HTMLCanvasElement>("canvas[data-plate]"),
	].flatMap((canvas) => {
		const ctx = canvas.getContext("2d");
		const mode = canvas.dataset.plate;
		if (!ctx || !isMode(mode)) return [];
		const centre = { x: mode === "scan" ? 0.3 : 0.5, y: 0.5 };
		return {
			canvas,
			ctx,
			mode,
			visible: false,
			point: { ...centre },
			target: { ...centre },
			touched: -Infinity,
			readout: root.querySelector<HTMLElement>(`[data-readout="${mode}"]`),
		};
	});

	const resize = () => {
		const scale = Math.min(devicePixelRatio, MAX_DPR);
		for (const { canvas } of plates) {
			canvas.width = Math.round(canvas.clientWidth * scale);
			canvas.height = Math.round(canvas.clientHeight * scale);
		}
		stage.width = Math.max(1, ...plates.map((p) => p.canvas.width));
		stage.height = Math.max(1, ...plates.map((p) => p.canvas.height));
		loop.redraw();
	};

	/** How far the time gradient is opened: scroll deepens it. */
	const amount = ({ mode, canvas }: Plate) =>
		mode === "scan"
			? 0.35 + 0.65 * clamp(scrollY / Math.max(canvas.clientHeight, 1))
			: 0.3 + 0.7 * smoothstep(0.15, 0.6, elementProgress(canvas));

	const draw = (plate: Plate, phase: number, dt: number, now: number) => {
		const { canvas, ctx, mode, point, target } = plate;
		const { width: w, height: h } = canvas;
		if (!w || !h) return;
		if (!still && now - plate.touched > IDLE_MS && mode !== "record") {
			target.x = (mode === "scan" ? 0.3 : 0.5) + 0.22 * Math.sin(now / 9000);
			target.y = 0.5 + (mode === "radial" ? 0.12 * Math.cos(now / 7000) : 0);
		}
		point.x = still ? target.x : damp(point.x, target.x, 4, dt);
		point.y = still ? target.y : damp(point.y, target.y, 4, dt);
		const open = amount(plate);

		displayProgram.use();
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, w, h);
		gl.uniform1i(displayProgram.at("u_hist"), UNIT.history);
		gl.uniform1i(displayProgram.at("u_strip"), UNIT.strip);
		gl.uniform2f(displayProgram.at("u_res"), w, h);
		gl.uniform1f(displayProgram.at("u_mode"), MODES[mode]);
		gl.uniform1f(displayProgram.at("u_head"), head);
		gl.uniform1f(displayProgram.at("u_layers"), layers);
		gl.uniform1f(displayProgram.at("u_phase"), phase);
		gl.uniform1f(displayProgram.at("u_amount"), open);
		gl.uniform1f(displayProgram.at("u_aspect"), size.w / size.h);
		gl.uniform1f(displayProgram.at("u_row"), row);
		gl.uniform1f(displayProgram.at("u_rows"), rows);
		gl.uniform2f(displayProgram.at("u_p"), point.x, 1 - point.y);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		ctx.drawImage(stage, 0, stage.height - h, w, h, 0, 0, w, h);
		canvas.setAttribute("data-live", "");

		if (plate.readout) {
			const seconds = mode === "record" ? rows / ROW_HZ : open * (layers - 3) * frameSeconds;
			const text = `${seconds.toFixed(1)} s`;
			if (plate.readout.textContent !== text) plate.readout.textContent = text;
		}
	};

	let owed = 0;
	const loop = onFrame(root, (time, dt) => {
		if (!still) {
			owed = Math.min(owed + dt * ROW_HZ, 4);
			while (owed >= 1) {
				owed -= 1;
				clock += 1 / ROW_HZ;
				capture(clock);
			}
		}
		// Fraction of a history frame elapsed since the newest was written, so "now" advances every display frame.
		const phase = still ? 1 : clamp((((ticks + 1) % 2) + owed) / 2);
		for (const plate of plates) if (plate.visible) draw(plate, phase, dt, time * 1000);
	});

	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const plate = plates.find((p) => p.canvas === entry.target);
				if (plate) plate.visible = entry.isIntersecting;
			}
			loop.redraw();
		},
		{ rootMargin: "100px" },
	);

	for (const plate of plates) {
		io.observe(plate.canvas);
		if (plate.mode === "record" || plate.mode === "live") continue;
		const follow = (event: PointerEvent) => {
			const r = plate.canvas.getBoundingClientRect();
			plate.target.x = clamp((event.clientX - r.left) / r.width);
			plate.target.y = clamp((event.clientY - r.top) / r.height);
			plate.touched = performance.now();
			loop.redraw();
		};
		plate.canvas.addEventListener("pointermove", follow, { passive: true });
		plate.canvas.addEventListener("pointerdown", follow, { passive: true });
	}

	const slider = root.querySelector<HTMLInputElement>("input[data-line]");
	const marker = root.querySelector<HTMLElement>("[data-line-marker]");
	const setLine = () => {
		if (!slider) return;
		const fromTop = Number(slider.value) / 100;
		line = 1 - fromTop;
		marker?.style.setProperty("--line", String(fromTop));
		if (still) {
			for (let i = 0; i < rows; i++) capture(clock + i / ROW_HZ);
			loop.redraw();
		}
	};
	slider?.addEventListener("input", setLine);

	new ResizeObserver(resize).observe(root);
	addEventListener("scroll", loop.redraw, { passive: true });
	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			io.disconnect();
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		},
		{ once: true },
	);
	resize();
};
