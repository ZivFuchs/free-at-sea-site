import { clamp, damp, onFrame } from "@/lab/lib/motion";
import fragment from "./drops.frag?raw";
import { lensFilter, refracts, texel } from "./lens";

const VERTEX = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const MAX_DPR = 2;
/** Longest side of the refraction map in texels; the browser upscales it. */
const MAP_MAX = matchMedia("(min-width: 48rem)").matches ? 320 : 208;
const SLOTS = 8;

interface Drop {
	/** Rest position as a fraction of the hero, radius and drift reach as fractions of its shorter side. */
	x: number;
	y: number;
	r: number;
	reach: number;
	speed: number;
	phase: number;
}

/** The first drop is the loupe: it follows the pointer while one is over the hero. */
const DROPS: readonly Drop[] = [
	{ x: 0.5, y: 0.66, r: 0.115, reach: 0.05, speed: 0.11, phase: 0 },
	{ x: 0.15, y: 0.34, r: 0.15, reach: 0.025, speed: 0.07, phase: 1.3 },
	{ x: 0.74, y: 0.43, r: 0.12, reach: 0.03, speed: 0.09, phase: 2.1 },
	{ x: 0.86, y: 0.55, r: 0.07, reach: 0.085, speed: 0.13, phase: 4.4 },
	{ x: 0.14, y: 0.74, r: 0.06, reach: 0.04, speed: 0.1, phase: 3.2 },
	{ x: 0.63, y: 0.19, r: 0.036, reach: 0.03, speed: 0.08, phase: 0.7 },
];

/** Bend at the outline as a fraction of the drop's radius. */
const PEAK = 0.5;
/** Bend at `rho` (0 centre, 1 outline): a gentle magnifier whose rim gathers in what lies around it. */
const bend = (rho: number) => rho * (0.2 + (PEAK - 0.2) * rho ** 4);

const shading = (canvas: HTMLCanvasElement) => {
	const gl = canvas.getContext("webgl", {
		premultipliedAlpha: true,
		antialias: false,
		depth: false,
	});
	if (!gl) return null;
	const program = gl.createProgram();
	for (const [type, source] of [
		[gl.VERTEX_SHADER, VERTEX],
		[gl.FRAGMENT_SHADER, fragment],
	] as const) {
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
			return null;
		}
		gl.attachShader(program, shader);
	}
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram is not a React hook
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	const res = gl.getUniformLocation(program, "u_res");
	const balls = gl.getUniformLocation(program, "u_balls");
	const px = gl.getUniformLocation(program, "u_px");

	return (drops: Float32Array, width: number, height: number) => {
		const scale = Math.min(devicePixelRatio, MAX_DPR);
		const w = Math.round(width * scale);
		const h = Math.round(height * scale);
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
			gl.viewport(0, 0, w, h);
		}
		gl.uniform2f(res, w, h);
		gl.uniform1f(px, scale);
		gl.uniform3fv(
			balls,
			drops.map((v) => v * scale),
		);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	};
};

/**
 * Water drops resting on the hero. `layer` covers it and bends whatever is behind through a metaball
 * displacement map redrawn as the drops slide and merge; `canvas` paints their highlights and shadows.
 */
export const mountDrops = (hero: HTMLElement, layer: HTMLElement, canvas: HTMLCanvasElement) => {
	const reach = Math.max(...DROPS.map(({ r }) => r)) * Math.min(innerWidth, innerHeight) * 1.15;
	const filter = refracts() ? lensFilter(reach * PEAK * 2, true) : null;
	const shade = shading(canvas);
	const map = document.createElement("canvas");
	const ctx = map.getContext("2d");
	if (filter) layer.style.setProperty("--lens", filter.url);

	/** x, y, r per drop in CSS px. */
	const drops = new Float32Array(SLOTS * 3);
	let pointer: { x: number; y: number } | null = null;
	let placed = false;
	let rho = new Float32Array(0);

	const place = (time: number, dt: number, width: number, height: number) => {
		const side = Math.min(width, height);
		DROPS.forEach(({ x, y, r, reach, speed, phase }, i) => {
			const a = time * speed * Math.PI * 2 + phase;
			let tx = x * width + Math.sin(a) * reach * side;
			let ty = y * height + Math.cos(a * 0.8) * reach * side;
			if (i === 0 && pointer) ({ x: tx, y: ty } = pointer);
			const rate = placed ? (i === 0 ? 7 : 2) : Number.POSITIVE_INFINITY;
			drops[i * 3] = damp(drops[i * 3] ?? tx, tx, rate, dt);
			drops[i * 3 + 1] = damp(drops[i * 3 + 1] ?? ty, ty, rate, dt);
			drops[i * 3 + 2] = r * side;
		});
		placed = true;
	};

	const refract = (width: number, height: number) => {
		if (!filter || !ctx) return;
		const k = MAP_MAX / Math.max(width, height);
		const cols = Math.round(width * k);
		const rows = Math.round(height * k);
		if (map.width !== cols || map.height !== rows) {
			map.width = cols;
			map.height = rows;
			rho = new Float32Array(cols * rows);
		}
		const cell = 1 / k;
		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const x = (i + 0.5) * cell;
				const y = (j + 0.5) * cell;
				let f = 0;
				for (let b = 0; b < DROPS.length * 3; b += 3) {
					const dx = x - (drops[b] ?? 0);
					const dy = y - (drops[b + 1] ?? 0);
					f += (drops[b + 2] ?? 0) ** 2 / (dx * dx + dy * dy + 1);
				}
				rho[j * cols + i] = 1 / Math.sqrt(Math.max(f, 1e-4));
			}
		}
		const image = ctx.createImageData(cols, rows);
		const at = (i: number, j: number) =>
			rho[clamp(j, 0, rows - 1) * cols + clamp(i, 0, cols - 1)] ?? 2;
		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const here = at(i, j);
				if (here > 1.3) continue;
				const gx = (at(i + 1, j) - at(i - 1, j)) / (2 * cell);
				const gy = (at(i, j + 1) - at(i, j - 1)) / (2 * cell);
				const slope = Math.hypot(gx, gy) || 1e-6;
				const amount = (-Math.min(1 / slope, reach) * bend(Math.min(here, 1))) / (reach * PEAK * 2);
				const cover = clamp((1 - here) / (slope * cell) + 0.5);
				texel(image.data, (j * cols + i) * 4, (gx / slope) * amount, (gy / slope) * amount, cover);
			}
		}
		ctx.putImageData(image, 0, 0);
		filter.image(map.toDataURL(), width, height);
	};

	const loop = onFrame(
		hero,
		(time, dt) => {
			const { clientWidth: width, clientHeight: height } = hero;
			place(time, dt, width, height);
			refract(width, height);
			shade?.(drops, width, height);
		},
		{ fps: 30, margin: "0px" },
	);

	hero.addEventListener("pointermove", (event) => {
		const box = hero.getBoundingClientRect();
		pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
		loop.redraw();
	});
	for (const type of ["pointerleave", "pointercancel"] as const) {
		hero.addEventListener(type, () => {
			pointer = null;
		});
	}
	new ResizeObserver(() => {
		placed = false;
		loop.redraw();
	}).observe(hero);
	addEventListener("pagehide", loop.stop);
};
