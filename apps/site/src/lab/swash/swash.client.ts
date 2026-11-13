import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, onFrame, reducedMotion } from "@/lab/lib/motion";
import fragment from "./swash.frag?raw";

const VERTEX = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const MAX_DPR = 1.5;
/** Edge height (screen heights) with a slide fully under water: above the top, with room for its lobes. */
const COVERED = 1.6;
/** Share of a transition spent rising or draining; the rest holds the screen covered while slides swap. */
const TRAVEL = 0.8;

const UNIFORMS = ["u_res", "u_time", "u_front", "u_rise", "u_seed", "u_amp"] as const;
type Uniform = (typeof UNIFORMS)[number];

const compile = (gl: WebGLRenderingContext, type: GLenum, source: string) => {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	console.error(gl.getShaderInfoLog(shader));
	return null;
};

/** The foam overlay: a transparent canvas, so the slides show through wherever the water isn't. */
const water = (canvas: HTMLCanvasElement) => {
	const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false });
	if (!gl) return null;
	const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
	const fs = compile(gl, gl.FRAGMENT_SHADER, `precision highp float;\n${noise}\n${fragment}`);
	if (!vs || !fs) return null;
	const program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	const at = Object.fromEntries(
		UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]),
	) as Record<Uniform, WebGLUniformLocation | null>;

	const resize = new ResizeObserver(() => {
		const scale = Math.min(devicePixelRatio, MAX_DPR);
		canvas.width = Math.round(canvas.clientWidth * scale);
		canvas.height = Math.round(canvas.clientHeight * scale);
		gl.viewport(0, 0, canvas.width, canvas.height);
	});
	resize.observe(canvas);

	return {
		draw: (values: Record<Exclude<Uniform, "u_res">, number>) => {
			gl.uniform2f(at.u_res, canvas.width, canvas.height);
			for (const [name, value] of Object.entries(values)) gl.uniform1f(at[name as Uniform], value);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		},
		stop: () => resize.disconnect(),
	};
};

const pad = (n: number) => String(n).padStart(2, "0");

const start = (root: HTMLElement) => {
	const slides = [...root.querySelectorAll<HTMLElement>("[data-slide]")];
	const dots = [...document.querySelectorAll<HTMLAnchorElement>("[data-swash-dot]")];
	const counter = document.querySelector<HTMLElement>("[data-swash-count]");
	const canvas = root.querySelector("canvas");
	const still = reducedMotion();
	const sea = !still && canvas ? water(canvas) : null;
	/** With the overlay running, slides stack in a pinned stage and the wave swaps them; otherwise they simply scroll. */
	const live = sea !== null;
	if (live) root.setAttribute("data-swash", "");

	let active = -1;
	const show = (index: number) => {
		if (index === active) return;
		active = index;
		for (const [i, slide] of slides.entries()) {
			slide.toggleAttribute("data-hidden", live && i !== index);
			if (i !== index) slide.querySelector("iframe")?.remove();
		}
		for (const [i, dot] of dots.entries()) {
			if (i === index) dot.setAttribute("aria-current", "true");
			else dot.removeAttribute("aria-current");
		}
		if (counter) counter.textContent = pad(index + 1);
	};

	const position = () => root.scrollTop / Math.max(root.clientHeight, 1);
	const nearest = () => {
		if (live) return clamp(Math.round(position()), 0, slides.length - 1);
		let best = 0;
		for (const [i, slide] of slides.entries()) {
			if (slide.offsetTop <= root.scrollTop + root.clientHeight / 2) best = i;
		}
		return best;
	};
	const go = (index: number) => {
		const target = slides[clamp(index, 0, slides.length - 1)];
		if (!target) return;
		const top = live ? slides.indexOf(target) * root.clientHeight : target.offsetTop;
		root.scrollTo({ top, behavior: still ? "auto" : "smooth" });
	};

	show(nearest());
	root.addEventListener("scroll", () => show(nearest()), { passive: true });

	for (const [i, dot] of dots.entries()) {
		dot.addEventListener("click", (event) => {
			event.preventDefault();
			go(i);
		});
	}

	root.addEventListener("focusin", (event) => {
		if (!(event.target instanceof Element)) return;
		const slide = event.target.closest<HTMLElement>("[data-slide]");
		if (slide && slides.indexOf(slide) !== active) go(slides.indexOf(slide));
	});

	const STEPS: Record<string, (from: number) => number> = {
		ArrowDown: (from) => from + 1,
		PageDown: (from) => from + 1,
		ArrowUp: (from) => from - 1,
		PageUp: (from) => from - 1,
		Home: () => 0,
		End: () => slides.length - 1,
	};
	document.addEventListener("keydown", (event) => {
		const step = STEPS[event.key];
		const typing = event.target instanceof Element && event.target.closest("input, textarea");
		if (!step || typing || event.metaKey || event.ctrlKey || event.altKey) return;
		event.preventDefault();
		go(step(active));
	});

	for (const play of root.querySelectorAll<HTMLAnchorElement>("a[data-embed]")) {
		const frame = play.closest("[data-slide]")?.querySelector<HTMLElement>("[data-frame]");
		if (!frame) continue;
		play.addEventListener("click", (event) => {
			if (event.metaKey || event.ctrlKey || event.shiftKey) return;
			event.preventDefault();
			const iframe = document.createElement("iframe");
			iframe.src = play.dataset.embed ?? "";
			iframe.title = play.dataset.title ?? "";
			iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
			iframe.allowFullscreen = true;
			iframe.className = frame.dataset.fill ?? "";
			frame.querySelector("iframe")?.remove();
			frame.appendChild(iframe);
		});
	}

	if (!sea || !canvas) return;
	let last = 0;
	let rise = 0;
	const loop = onFrame(canvas, (time, dt) => {
		const p = position();
		const f = p - Math.floor(p);
		const cover = clamp((1 - Math.abs(2 * f - 1)) / TRAVEL);
		const eased = cover * cover * (3 - 2 * cover);
		/** At rest a small wave laps the bottom edge. */
		const lap =
			0.03 + 0.04 * (0.5 + 0.5 * Math.sin(time * 0.55)) * (0.7 + 0.3 * Math.sin(time * 0.13));
		const front = lap * (1 - eased) + COVERED * eased;
		const speed = (front - last) / dt;
		last = front;
		if (Math.abs(speed) > 0.004) rise = damp(rise, speed > 0 ? 1 : 0, 9, dt);
		sea.draw({
			u_time: time,
			u_front: front,
			u_rise: rise,
			u_seed: Math.floor(p),
			u_amp: 0.45 + 0.55 * eased,
		});
	});
	addEventListener("pagehide", () => {
		loop.stop();
		sea.stop();
	});
};

for (const root of document.querySelectorAll<HTMLElement>("[data-swash-root]")) start(root);
