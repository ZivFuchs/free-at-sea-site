import noise from "@/lab/lib/glsl/noise.glsl?raw";
import {
	clamp,
	damp,
	lerp,
	onFrame,
	pageProgress,
	reducedMotion,
	smoothstep,
} from "@/lab/lib/motion";
import catalogue from "./assets/stars.json";
import { FIGURES, FIXES, NAMED, place, type StarKey } from "./figures";
import lineFrag from "./shaders/line.frag?raw";
import lineVert from "./shaders/line.vert?raw";
import skyFrag from "./shaders/sky.frag?raw";
import starFrag from "./shaders/star.frag?raw";
import starVert from "./shaders/star.vert?raw";
import {
	altitude,
	apply,
	arc,
	azimuth,
	clock,
	equatorial,
	nightSpan,
	RAD,
	SITE,
	sunPlace,
	toHorizon,
	toView,
	transpose,
	type Vec3,
} from "./sky";

const PRECISION =
	"#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";
const QUAD = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const MAX_DPR = 1.5;
/** Camera: facing south, where the sky turns about the pole. Yaw swings from dusk's side to dawn's over the night. */
const YAW = { dusk: 194, dawn: 166 };
const LOOK = { yaw: 3, pitch: 1.5 };
/** Sextant picks up a named star within this many degrees. */
const PICK = 3.5;

const program = (gl: WebGLRenderingContext, vertex: string, fragment: string) => {
	const made = gl.createProgram();
	for (const [type, source] of [
		[gl.VERTEX_SHADER, vertex],
		[gl.FRAGMENT_SHADER, PRECISION + fragment],
	] as const) {
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
			return null;
		}
		gl.attachShader(made, shader);
	}
	gl.bindAttribLocation(made, 0, "a");
	gl.bindAttribLocation(made, 0, "a_dir");
	gl.bindAttribLocation(made, 1, "a_info");
	gl.linkProgram(made);
	if (!gl.getProgramParameter(made, gl.LINK_STATUS)) return null;
	const locations = new Map<string, WebGLUniformLocation | null>();
	return {
		use: () => gl.useProgram(made),
		uniform: (name: string) => {
			if (!locations.has(name)) locations.set(name, gl.getUniformLocation(made, name));
			return locations.get(name) ?? null;
		},
	};
};

/** Nearest catalogue star to a hand-entered place, so figures meet their stars exactly. */
const snap = (key: StarKey): Vec3 => {
	const [ra, dec] = place(key);
	const want = equatorial(ra * 15, dec);
	let best = want;
	let near = Math.cos(0.5 * RAD);
	for (const [r = 0, d = 0] of catalogue) {
		const v = equatorial(r, d);
		const dot = v[0] * want[0] + v[1] * want[1] + v[2] * want[2];
		if (dot > near) {
			near = dot;
			best = v;
		}
	}
	return best;
};

const centroid = (points: readonly Vec3[]): Vec3 => {
	const sum = points.reduce<Vec3>((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
	const length = Math.hypot(...sum) || 1;
	return [sum[0] / length, sum[1] / length, sum[2] / length];
};

export const startSky = (root: HTMLElement) => {
	const canvas = root.querySelector<HTMLCanvasElement>("[data-sky]");
	if (!canvas) return;
	const still = reducedMotion();
	const dawn = root.querySelector<HTMLElement>("[data-dawn]");
	/** The night runs from the top of the page to first light, wherever that sits in the document. */
	const nightProgress = () => {
		const end = dawn ? dawn.getBoundingClientRect().top + scrollY - innerHeight * 0.25 : 0;
		return end > 0 ? clamp(scrollY / end) : pageProgress();
	};

	const sun = sunPlace(new Date());
	const sunDir = equatorial(sun.ra, sun.dec);
	const night = nightSpan(SITE.lat, sun);

	const placed = new Map<StarKey, Vec3>();
	const at = (key: StarKey) => {
		let dir = placed.get(key);
		if (!dir) {
			dir = snap(key);
			placed.set(key, dir);
		}
		return dir;
	};

	const labels = [
		...[...root.querySelectorAll<HTMLElement>("[data-star]")].map((el) => ({
			el,
			dir: at(el.dataset.star as StarKey),
			name: NAMED[el.dataset.star as keyof typeof NAMED],
			lift: 0,
		})),
		...[...root.querySelectorAll<HTMLElement>("[data-figure]")].flatMap((el) => {
			const figure = FIGURES.find((f) => f.name === el.dataset.figure);
			return figure
				? [{ el, dir: centroid(figure.lines.flat().map(at)), name: undefined, lift: 6 }]
				: [];
		}),
	];
	const fixes = FIXES.map((key) => ({
		dir: at(key),
		alt: root.querySelector<HTMLElement>(`[data-fix="${key}"] [data-fix-alt]`),
		az: root.querySelector<HTMLElement>(`[data-fix="${key}"] [data-fix-az]`),
	}));
	const readout = {
		time: root.querySelector<HTMLElement>('[data-readout="time"]'),
		lst: root.querySelector<HTMLElement>('[data-readout="lst"]'),
	};
	const sextant = root.querySelector<HTMLElement>("[data-sextant]");
	const sextantAlt = sextant?.querySelector<HTMLElement>("[data-sextant-alt]");
	const sextantName = sextant?.querySelector<HTMLElement>("[data-sextant-name]");
	const write = (el: HTMLElement | null | undefined, text: string) => {
		if (el && el.textContent !== text) el.textContent = text;
	};

	const gl = canvas.getContext("webgl", { alpha: false, antialias: true, depth: false });
	const skyProgram = gl && program(gl, QUAD, `${noise}\n${skyFrag}`);
	const starProgram = gl && program(gl, starVert, starFrag);
	const lineProgram = gl && program(gl, lineVert, lineFrag);
	const ready = gl && skyProgram && starProgram && lineProgram;

	const buffer = (data: number[]) => {
		const made = gl?.createBuffer() ?? null;
		gl?.bindBuffer(gl.ARRAY_BUFFER, made);
		gl?.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
		return made;
	};
	const quad = buffer([-1, -1, 3, -1, -1, 3]);
	const stars = buffer(
		catalogue.flatMap(([ra = 0, dec = 0, mag = 6, kelvin = 60]) => [
			...equatorial(ra, dec),
			mag,
			kelvin,
		]),
	);
	const segments = FIGURES.flatMap((f) => f.lines.flat());
	const lines = buffer(segments.flatMap((key) => [...at(key)]));

	const state = {
		progress: pageProgress(),
		yaw: 0,
		pitch: 0,
		pointer: null as { x: number; y: number } | null,
	};
	const look = { yaw: 0, pitch: 0 };
	let size = { width: 1, height: 1, tanX: 1, tanY: 1, pitch: 24 };

	const resize = () => {
		const { clientWidth: width, clientHeight: height } = canvas;
		const portrait = width / height < 0.8;
		const half = portrait ? 38 : 30;
		const tanY = Math.tan(half * RAD);
		size = { width, height, tanX: (tanY * width) / height, tanY, pitch: portrait ? 27 : 22 };
		const dpr = Math.min(devicePixelRatio, MAX_DPR);
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		gl?.viewport(0, 0, canvas.width, canvas.height);
		loop.redraw();
	};

	const loop = onFrame(canvas, (time, dt) => {
		const target = nightProgress();
		state.progress = still ? target : damp(state.progress, target, 5, dt);
		state.yaw = still ? look.yaw : damp(state.yaw, look.yaw, 3, dt);
		state.pitch = still ? look.pitch : damp(state.pitch, look.pitch, 3, dt);
		const p = state.progress;
		const lst = night.start + p * night.span;
		const m = toHorizon(SITE.lat, lst);
		const view = toView(lerp(YAW.dusk, YAW.dawn, p) + state.yaw, size.pitch + state.pitch);
		const sunHere = apply(m, sunDir);
		const dark = smoothstep(-5, -15, altitude(sunHere));
		const limit = lerp(1.2, 5.6, dark);
		const seconds = still ? 0 : time;

		if (ready) {
			const proj = [1 / size.tanX, 1 / size.tanY] as const;
			gl.disable(gl.BLEND);
			skyProgram.use();
			gl.bindBuffer(gl.ARRAY_BUFFER, quad);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
			gl.uniform2f(skyProgram.uniform("u_res"), canvas.width, canvas.height);
			gl.uniform1f(skyProgram.uniform("u_time"), seconds);
			gl.uniform2f(skyProgram.uniform("u_tan"), size.tanX, size.tanY);
			gl.uniformMatrix3fv(skyProgram.uniform("u_viewT"), false, transpose(view));
			gl.uniformMatrix3fv(skyProgram.uniform("u_mT"), false, transpose(m));
			gl.uniform3f(skyProgram.uniform("u_sun"), ...sunHere);
			gl.uniform1f(skyProgram.uniform("u_dark"), dark);
			gl.drawArrays(gl.TRIANGLES, 0, 3);

			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE);

			lineProgram.use();
			gl.bindBuffer(gl.ARRAY_BUFFER, lines);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
			gl.uniformMatrix3fv(lineProgram.uniform("u_m"), false, m);
			gl.uniformMatrix3fv(lineProgram.uniform("u_view"), false, view);
			gl.uniform2f(lineProgram.uniform("u_proj"), ...proj);
			gl.uniform1f(lineProgram.uniform("u_alpha"), 0.2 * dark);
			gl.drawArrays(gl.LINES, 0, segments.length);

			starProgram.use();
			gl.bindBuffer(gl.ARRAY_BUFFER, stars);
			gl.enableVertexAttribArray(1);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
			gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
			gl.uniformMatrix3fv(starProgram.uniform("u_m"), false, m);
			gl.uniformMatrix3fv(starProgram.uniform("u_view"), false, view);
			gl.uniform2f(starProgram.uniform("u_proj"), ...proj);
			gl.uniform1f(starProgram.uniform("u_dpr"), canvas.width / size.width);
			gl.uniform1f(starProgram.uniform("u_time"), seconds);
			gl.uniform1f(starProgram.uniform("u_limit"), limit);
			for (const mirror of [1, 0]) {
				gl.uniform1f(starProgram.uniform("u_mirror"), mirror);
				gl.drawArrays(gl.POINTS, 0, catalogue.length);
			}
			gl.disableVertexAttribArray(1);
		}

		const project = (direction: Vec3) => {
			const here = apply(m, direction);
			const v = apply(view, here);
			return {
				here,
				inFront: v[2] > 0.05,
				x: (v[0] / v[2] / size.tanX + 1) * 0.5 * size.width,
				y: (1 - v[1] / v[2] / size.tanY) * 0.5 * size.height,
			};
		};

		for (const { el, dir, lift } of labels) {
			const { here, inFront, x, y } = project(dir);
			const shown = inFront && here[2] > 0.06 && x > -60 && x < size.width + 60 && y > 0;
			el.style.opacity = shown ? String(dark * smoothstep(0.06, 0.16, here[2])) : "0";
			if (shown)
				el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - lift).toFixed(1)}px, 0)`;
		}
		for (const { dir, alt, az } of fixes) {
			const here = apply(m, dir);
			write(alt, arc(altitude(here)));
			write(az, `${String(Math.round(azimuth(here))).padStart(3, "0")}°`);
		}
		write(readout.time, clock(lst - sun.ra + 180));
		write(readout.lst, clock(lst, true));

		if (sextant) {
			const { pointer } = state;
			if (!pointer) sextant.style.opacity = "0";
			else {
				const ray: Vec3 = [
					(pointer.x / size.width) * 2 * size.tanX - size.tanX,
					size.tanY - (pointer.y / size.height) * 2 * size.tanY,
					1,
				];
				const length = Math.hypot(...ray);
				const here = apply(transpose(view), [ray[0] / length, ray[1] / length, ray[2] / length]);
				const equ = apply(transpose(m), here);
				let found: (typeof labels)[number] | undefined;
				let near = Math.cos(PICK * RAD);
				for (const label of labels) {
					const dot = label.dir[0] * equ[0] + label.dir[1] * equ[1] + label.dir[2] * equ[2];
					if (label.name && dot > near) {
						near = dot;
						found = label;
					}
				}
				const shot = found ? apply(m, found.dir) : here;
				const spot = found ? project(found.dir) : pointer;
				sextant.style.opacity = shot[2] > 0 ? "1" : "0";
				sextant.style.transform = `translate3d(${spot.x.toFixed(1)}px, ${spot.y.toFixed(1)}px, 0)`;
				sextant.toggleAttribute("data-locked", Boolean(found));
				write(
					sextantAlt,
					`Hs ${arc(altitude(shot))} · Zn ${String(Math.round(azimuth(shot))).padStart(3, "0")}°`,
				);
				write(sextantName, found?.name ?? "Open sky");
			}
		}
	});

	const quiet = "a, button, input, iframe, dialog, label, [data-quiet]";
	let fade = 0;
	const point = (event: PointerEvent) => {
		const over = event.target instanceof Element && event.target.closest(quiet);
		state.pointer = over ? null : { x: event.clientX, y: event.clientY };
		if (event.pointerType === "mouse") {
			look.yaw = (event.clientX / innerWidth - 0.5) * 2 * LOOK.yaw;
			look.pitch = (0.5 - event.clientY / innerHeight) * 2 * LOOK.pitch;
		} else {
			clearTimeout(fade);
			fade = window.setTimeout(() => {
				state.pointer = null;
				loop.redraw();
			}, 2500);
		}
		loop.redraw();
	};
	const leave = () => {
		state.pointer = null;
		loop.redraw();
	};
	addEventListener("pointermove", point, { passive: true });
	addEventListener("pointerdown", point, { passive: true });
	document.documentElement.addEventListener("pointerleave", leave);
	addEventListener("scroll", loop.redraw, { passive: true });
	const observer = new ResizeObserver(resize);
	observer.observe(canvas);
	if (ready) canvas.setAttribute("data-on", "");

	addEventListener("pagehide", (event) => {
		if (event.persisted) return;
		loop.stop();
		observer.disconnect();
	});
};
