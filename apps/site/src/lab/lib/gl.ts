import { onFrame } from "./motion";

const VERTEX = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const MAX_DPR = 1.5;

type UniformValue = number | readonly [number, number] | readonly [number, number, number];

export interface ShaderOptions {
	/** Full fragment source. Gets `u_res` (px) and `u_time` (s) set each frame. */
	fragment: string;
	/** Fraction of (capped) device resolution to render at. Raymarched scenes want less. */
	resolution?: number;
	fps?: number;
	/** Extra uniforms, read every frame. */
	uniforms?: (time: number) => Record<string, UniformValue>;
	/** Sampler uniforms, bound once (call `texture()` on the result to update one). */
	textures?: Record<string, TexImageSource>;
}

const compile = (gl: WebGLRenderingContext, type: GLenum, source: string) => {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	console.error(gl.getShaderInfoLog(shader));
	return null;
};

/**
 * Runs a full-canvas fragment shader: sized to the canvas's CSS box, paused off screen, one still frame
 * under reduced motion. Returns `null` when WebGL or the shader is unavailable, so callers can fall back.
 */
export const runShader = (
	canvas: HTMLCanvasElement,
	{ fragment, resolution = 1, fps = 60, uniforms, textures = {} }: ShaderOptions,
) => {
	const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false });
	if (!gl) return null;
	const program = gl.createProgram();
	const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
	const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
	if (!vs || !fs) return null;
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

	const locations = new Map<string, WebGLUniformLocation | null>();
	const location = (name: string) => {
		if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
		return locations.get(name) ?? null;
	};

	const units = new Map<string, number>();
	const texture = (name: string, source: TexImageSource) => {
		let unit = units.get(name);
		if (unit === undefined) {
			unit = units.size;
			units.set(name, unit);
			gl.activeTexture(gl.TEXTURE0 + unit);
			gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.uniform1i(location(name), unit);
		}
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		loop.redraw();
	};

	const loop = onFrame(
		canvas,
		(time) => {
			gl.uniform2f(location("u_res"), canvas.width, canvas.height);
			gl.uniform1f(location("u_time"), time);
			for (const [name, value] of Object.entries(uniforms?.(time) ?? {})) {
				const at = location(name);
				if (typeof value === "number") gl.uniform1f(at, value);
				else if (value.length === 2) gl.uniform2f(at, value[0], value[1]);
				else gl.uniform3f(at, value[0], value[1], value[2]);
			}
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		},
		{ fps },
	);

	const resize = new ResizeObserver(() => {
		const scale = Math.min(devicePixelRatio, MAX_DPR) * resolution;
		canvas.width = Math.round(canvas.clientWidth * scale);
		canvas.height = Math.round(canvas.clientHeight * scale);
		gl.viewport(0, 0, canvas.width, canvas.height);
		loop.redraw();
	});
	resize.observe(canvas);

	for (const [name, source] of Object.entries(textures)) texture(name, source);

	return {
		redraw: loop.redraw,
		texture,
		stop: () => {
			loop.stop();
			resize.disconnect();
		},
	};
};
