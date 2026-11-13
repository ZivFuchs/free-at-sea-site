import noise from "@/lab/lib/glsl/noise.glsl?raw";
import advect from "./shaders/advect.frag?raw";
import curl from "./shaders/curl.frag?raw";
import display from "./shaders/display.frag?raw";
import divergence from "./shaders/divergence.frag?raw";
import dye from "./shaders/dye.frag?raw";
import forces from "./shaders/forces.frag?raw";
import gradient from "./shaders/gradient.frag?raw";
import io from "./shaders/io.glsl?raw";
import pressure from "./shaders/pressure.frag?raw";
import quad from "./shaders/quad.vert?raw";
import splat from "./shaders/splat.frag?raw";

const HEADER = "#version 300 es\nprecision highp float;\nprecision highp sampler2D;\n";
const SOURCES = { advect, curl, display, divergence, dye, forces, gradient, pressure, splat };
type ProgramName = keyof typeof SOURCES;

/** Quality steps, best first: short-side texels of the solver and dye grids, pressure iterations, canvas scale. */
const TIERS = [
	{ sim: 160, dye: 720, iterations: 18, scale: 1 },
	{ sim: 128, dye: 512, iterations: 14, scale: 1 },
	{ sim: 96, dye: 384, iterations: 10, scale: 0.85 },
	{ sim: 72, dye: 256, iterations: 8, scale: 0.7 },
] as const;
export const LAST_TIER = TIERS.length - 1;
const MAX_DPR = 1.5;

type Vec2 = readonly [number, number];
type Uniform =
	| number
	| Vec2
	| readonly [number, number, number]
	| readonly [number, number, number, number];

interface Target {
	texture: WebGLTexture;
	fbo: WebGLFramebuffer;
	width: number;
	height: number;
}
interface Pair {
	read: Target;
	write: Target;
}

/** A stroke through the water, in viewport fractions (y up). `force` is in viewport heights per second. */
export interface Stroke {
	from: Vec2;
	to: Vec2;
	force: Vec2;
	foam?: number;
	ink?: number;
	/** Gaussian radius as a fraction of viewport height. */
	radius: number;
}

export interface StepInput {
	dt: number;
	time: number;
	/** Page scroll this frame, in viewport heights (positive: content moved up). */
	scrolled: number;
	/** Title box in viewport fractions (x, y, w, h; y up), and how strongly it seeps (0–1). */
	title: readonly [number, number, number, number];
	seep: number;
}

/** How far the water follows the page when it scrolls: less than 1 reads as depth. */
const FOLLOW = 0.6;

/**
 * Stable-fluids solver (Stam) on the GPU: velocity and dye grids, vorticity confinement, Jacobi pressure
 * projection. Returns `null` without WebGL2 float render targets.
 */
export const createFluid = (canvas: HTMLCanvasElement, startTier = 0) => {
	const gl = canvas.getContext("webgl2", {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
	});
	if (!gl) return null;
	if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float"))
		return null;

	const compile = (type: GLenum, source: string) => {
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
		console.error(gl.getShaderInfoLog(shader));
		return null;
	};

	const vertex = compile(gl.VERTEX_SHADER, HEADER + quad);
	const link = (fragment: string) => {
		const fs = compile(gl.FRAGMENT_SHADER, HEADER + noise + io + fragment);
		if (!vertex || !fs) return null;
		const program = gl.createProgram();
		gl.attachShader(program, vertex);
		gl.attachShader(program, fs);
		gl.bindAttribLocation(program, 0, "a");
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
		const locations = new Map<string, WebGLUniformLocation | null>();
		return { program, locations };
	};
	type Program = NonNullable<ReturnType<typeof link>>;

	const programs = {} as Record<ProgramName, Program>;
	for (const name of Object.keys(SOURCES) as ProgramName[]) {
		const program = link(SOURCES[name]);
		if (!program) return null;
		programs[name] = program;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	const target = (
		width: number,
		height: number,
		internal: GLenum,
		format: GLenum,
		filter: GLenum,
	): Target => {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, gl.HALF_FLOAT, null);
		const fbo = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		return { texture, fbo, width, height };
	};
	const pair = (...args: Parameters<typeof target>): Pair => ({
		read: target(...args),
		write: target(...args),
	});
	const swap = (p: Pair) => {
		[p.read, p.write] = [p.write, p.read];
	};
	const release = (...targets: Target[]) => {
		for (const { texture, fbo } of targets) {
			gl.deleteTexture(texture);
			gl.deleteFramebuffer(fbo);
		}
	};

	const mask = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, mask);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([0]));

	let tier = Math.min(startTier, LAST_TIER);
	let aspect = 1;
	let scroll = 0;

	const allocate = () => {
		const size = (short: number): [number, number] =>
			aspect >= 1 ? [Math.round(short * aspect), short] : [short, Math.round(short / aspect)];
		const { sim, dye } = TIERS[tier] ?? TIERS[LAST_TIER];
		const [sw, sh] = size(sim);
		const [dw, dh] = size(dye);
		return {
			velocity: pair(sw, sh, gl.RG16F, gl.RG, gl.LINEAR),
			dye: pair(dw, dh, gl.RG16F, gl.RG, gl.LINEAR),
			pressure: pair(sw, sh, gl.R16F, gl.RED, gl.NEAREST),
			divergence: target(sw, sh, gl.R16F, gl.RED, gl.NEAREST),
			curl: target(sw, sh, gl.R16F, gl.RED, gl.NEAREST),
		};
	};
	let grids = allocate();
	const reallocate = () => {
		const { velocity, dye, pressure, divergence, curl } = grids;
		release(
			velocity.read,
			velocity.write,
			dye.read,
			dye.write,
			pressure.read,
			pressure.write,
			divergence,
			curl,
		);
		grids = allocate();
	};

	/** Draws `name` into `into` (or the canvas) with `uniforms`; textures bind to units in order. */
	const draw = (
		name: ProgramName,
		into: Target | null,
		uniforms: Record<string, Uniform>,
		textures: Record<string, WebGLTexture>,
	) => {
		const { program, locations } = programs[name];
		const at = (key: string) => {
			if (!locations.has(key)) locations.set(key, gl.getUniformLocation(program, key));
			return locations.get(key) ?? null;
		};
		// biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
		gl.useProgram(program);
		gl.bindFramebuffer(gl.FRAMEBUFFER, into?.fbo ?? null);
		gl.viewport(0, 0, into?.width ?? canvas.width, into?.height ?? canvas.height);
		for (const [key, value] of Object.entries(uniforms)) {
			if (typeof value === "number") gl.uniform1f(at(key), value);
			else if (value.length === 2) gl.uniform2f(at(key), ...value);
			else if (value.length === 3) gl.uniform3f(at(key), ...value);
			else gl.uniform4f(at(key), ...value);
		}
		Object.entries(textures).forEach(([key, texture], unit) => {
			gl.activeTexture(gl.TEXTURE0 + unit);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(at(key), unit);
		});
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	};

	const texel = ({ width, height }: Target): Vec2 => [1 / width, 1 / height];

	const stroke = ({ from, to, force, foam = 0, ink = 0, radius }: Stroke) => {
		const { velocity, dye } = grids;
		const shape = { u_from: from, u_to: to, u_radius: radius * radius, u_aspect: aspect };
		// Viewport heights per second → solver texels per second.
		const scale = velocity.read.height;
		draw(
			"splat",
			velocity.write,
			{ ...shape, u_cap: 0, u_value: [force[0] * scale, force[1] * scale, 0] },
			{ u_target: velocity.read.texture },
		);
		swap(velocity);
		if (!foam && !ink) return;
		draw(
			"splat",
			dye.write,
			{ ...shape, u_cap: 0.95, u_value: [foam, ink, 0] },
			{ u_target: dye.read.texture },
		);
		swap(dye);
	};

	const step = ({ dt, time, scrolled, title, seep }: StepInput) => {
		const { velocity, dye, pressure, divergence, curl } = grids;
		const cell = texel(velocity.read);
		const shift: Vec2 = [0, scrolled * FOLLOW];
		scroll += scrolled * FOLLOW;

		draw("curl", curl, { u_texel: cell }, { u_velocity: velocity.read.texture });
		draw(
			"forces",
			velocity.write,
			{
				u_texel: cell,
				u_confine: 4,
				u_ambient: velocity.read.height * 0.018,
				u_push: Math.max(-1, Math.min(1, scrolled * 6)) * velocity.read.height * 0.35,
				u_dt: dt,
				u_time: time,
				u_aspect: aspect,
			},
			{ u_velocity: velocity.read.texture, u_curl: curl.texture },
		);
		swap(velocity);

		draw("divergence", divergence, { u_texel: cell }, { u_velocity: velocity.read.texture });
		for (let i = 0; i < (TIERS[tier]?.iterations ?? 8); i++) {
			draw(
				"pressure",
				pressure.write,
				{ u_texel: cell },
				{ u_pressure: pressure.read.texture, u_divergence: divergence.texture },
			);
			swap(pressure);
		}
		draw(
			"gradient",
			velocity.write,
			{ u_texel: cell },
			{ u_pressure: pressure.read.texture, u_velocity: velocity.read.texture },
		);
		swap(velocity);

		draw(
			"advect",
			velocity.write,
			{ u_texel: cell, u_shift: shift, u_dt: dt, u_decay: 0.45 },
			{ u_velocity: velocity.read.texture },
		);
		swap(velocity);
		draw(
			"dye",
			dye.write,
			{
				u_texel: cell,
				u_shift: shift,
				u_decay: [0.55, 0.38],
				u_rect: title,
				u_seed: seep,
				u_caps: 0.35,
				u_dt: dt,
				u_time: time,
				u_aspect: aspect,
				u_scroll: scroll,
			},
			{ u_velocity: velocity.read.texture, u_dye: dye.read.texture, u_mask: mask },
		);
		swap(dye);
	};

	const render = (time: number) => {
		draw(
			"display",
			null,
			{
				u_texel: texel(grids.dye.read),
				u_res: [canvas.width, canvas.height],
				u_time: time,
				u_scroll: scroll,
			},
			{ u_dye: grids.dye.read.texture, u_velocity: grids.velocity.read.texture },
		);
	};

	const fit = () => {
		const scale = Math.min(devicePixelRatio, MAX_DPR) * (TIERS[tier]?.scale ?? 1);
		canvas.width = Math.round(canvas.clientWidth * scale);
		canvas.height = Math.round(canvas.clientHeight * scale);
	};

	return {
		stroke,
		step,
		render,
		get tier() {
			return tier;
		},
		/** Sizes the canvas and grids to its CSS box. Clears the water. */
		resize: () => {
			fit();
			aspect = canvas.width / canvas.height;
			reallocate();
		},
		/** Drops to a cheaper tier. Clears the water. */
		degrade: () => {
			if (tier >= LAST_TIER) return;
			tier++;
			fit();
			reallocate();
		},
		/** White-on-black letterforms that seep ink. */
		setMask: (source: TexImageSource) => {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, mask);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, source);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		},
		lost: () => gl.isContextLost(),
	};
};

export type Fluid = NonNullable<ReturnType<typeof createFluid>>;
