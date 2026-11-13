import noise from "@/lab/lib/glsl/noise.glsl?raw";
import compositeSource from "./composite.frag?raw";
import fieldSource from "./field.frag?raw";

const HEAD = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
${noise}
`;
const VERTEX = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const MAX_DPR = 1.5;
/** CSS pixels per field texel: the field only carries soft light, the specks are drawn at full resolution. */
const FIELD_SCALE = 3;

export const SEGMENTS = 6;
export const RECTS = 4;
export const BURSTS = 3;

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** One frame of disturbance, in CSS pixels from the canvas's top left. */
export interface Disturbance {
	time: number;
	dt: number;
	scroll: number;
	/** Pixels the page moved up since the last frame. */
	shift: number;
	swash: number;
	/** Title write-on front, 0 → 1 across the title; beyond 1.15 it is off. */
	write: number;
	ember: number;
	/** Lights the whole title at once: the still frame. */
	fill: number;
	title: Box | null;
	/** `[ax, ay, bx, by, power]`, at most `SEGMENTS`. */
	segments: readonly (readonly [number, number, number, number, number])[];
	/** `[left, top, right, bottom, power]`, at most `RECTS`. */
	rects: readonly (readonly [number, number, number, number, number])[];
	/** `[x, y, radius]`, at most `BURSTS`. */
	bursts: readonly (readonly [number, number, number])[];
}

const pack = (rows: readonly (readonly number[])[], count: number, width: number, from = 0) => {
	const out = new Float32Array(count * width);
	rows.slice(0, count).forEach((row, i) => {
		out.set(row.slice(from, from + width), i * width);
	});
	return out;
};

export const createWater = (canvas: HTMLCanvasElement) => {
	const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false });
	if (!gl) return null;

	const compile = (type: GLenum, source: string) => {
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
		console.error(gl.getShaderInfoLog(shader));
		return null;
	};
	const link = (fragment: string) => {
		const vs = compile(gl.VERTEX_SHADER, VERTEX);
		const fs = compile(gl.FRAGMENT_SHADER, HEAD + fragment);
		if (!vs || !fs) return null;
		const program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.bindAttribLocation(program, 0, "a");
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
		const locations = new Map<string, WebGLUniformLocation | null>();
		return {
			program,
			at: (name: string) => {
				if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
				return locations.get(name) ?? null;
			},
		};
	};

	const field = link(fieldSource);
	const composite = link(compositeSource);
	if (!field || !composite) return null;

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	const texture = () => {
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	};

	const maskTexture = texture();
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

	const buffers = [0, 1].map(() => ({ tex: texture(), fbo: gl.createFramebuffer() }));
	let read = 0;
	let size = { width: 1, height: 1 };
	let cells = { width: 0, height: 0 };

	const resize = () => {
		const scale = Math.min(devicePixelRatio, MAX_DPR);
		size = { width: canvas.clientWidth, height: canvas.clientHeight };
		canvas.width = Math.round(size.width * scale);
		canvas.height = Math.round(size.height * scale);
		const next = {
			width: Math.max(16, Math.round(size.width / FIELD_SCALE)),
			height: Math.max(16, Math.round(size.height / FIELD_SCALE)),
		};
		if (next.width === cells.width && next.height === cells.height) return;
		cells = next;
		for (const { tex, fbo } of buffers) {
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				cells.width,
				cells.height,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				null,
			);
			gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
			gl.clearColor(0, 0, 0, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}
	};

	const bind = (unit: number, tex: WebGLTexture | null) => {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, tex);
	};

	return {
		resize,
		/** The title's letterforms, drawn white on black at the title's box. */
		mask: (source: TexImageSource) => {
			bind(1, maskTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		},
		clear: () => {
			if (!cells.width) return;
			for (const { fbo } of buffers) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
				gl.clear(gl.COLOR_BUFFER_BIT);
			}
		},
		step: (d: Disturbance) => {
			gl.useProgram(field.program);
			const from = buffers[read];
			const to = buffers[1 - read];
			if (!from || !to || !cells.width) return;
			gl.bindFramebuffer(gl.FRAMEBUFFER, to.fbo);
			gl.viewport(0, 0, cells.width, cells.height);
			bind(0, from.tex);
			bind(1, maskTexture);
			gl.uniform1i(field.at("u_prev"), 0);
			gl.uniform1i(field.at("u_mask"), 1);
			gl.uniform2f(field.at("u_res"), cells.width, cells.height);
			gl.uniform2f(field.at("u_size"), size.width, size.height);
			gl.uniform1f(field.at("u_time"), d.time);
			gl.uniform1f(field.at("u_dt"), d.dt);
			gl.uniform1f(field.at("u_shift"), d.shift / size.height);
			gl.uniform1f(field.at("u_scroll"), d.scroll);
			gl.uniform1f(field.at("u_swash"), d.swash);
			gl.uniform1f(field.at("u_write"), d.write);
			gl.uniform1f(field.at("u_ember"), d.ember);
			gl.uniform1f(field.at("u_fill"), d.fill);
			const t = d.title;
			gl.uniform4f(field.at("u_title"), t?.x ?? 0, t?.y ?? -9999, t?.width ?? 1, t?.height ?? 1);
			gl.uniform4fv(field.at("u_seg"), pack(d.segments, SEGMENTS, 4));
			gl.uniform1fv(field.at("u_segPow"), pack(d.segments, SEGMENTS, 1, 4));
			gl.uniform4fv(field.at("u_rect"), pack(d.rects, RECTS, 4));
			gl.uniform1fv(field.at("u_rectPow"), pack(d.rects, RECTS, 1, 4));
			gl.uniform3fv(field.at("u_burst"), pack(d.bursts, BURSTS, 3));
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			read = 1 - read;
		},
		draw: ({ time, scroll }: Pick<Disturbance, "time" | "scroll">) => {
			gl.useProgram(composite.program);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, canvas.width, canvas.height);
			bind(0, buffers[read]?.tex ?? null);
			gl.uniform1i(composite.at("u_field"), 0);
			gl.uniform2f(composite.at("u_res"), canvas.width, canvas.height);
			gl.uniform2f(composite.at("u_size"), size.width, size.height);
			gl.uniform1f(composite.at("u_time"), time);
			gl.uniform1f(composite.at("u_scroll"), scroll);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		},
	};
};

export type Water = NonNullable<ReturnType<typeof createWater>>;
