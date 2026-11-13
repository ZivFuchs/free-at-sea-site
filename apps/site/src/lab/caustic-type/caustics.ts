import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { GROUND } from "./palette";
import type { Field } from "./poisson";
import floorFrag from "./shaders/floor.frag?raw";
import meshFrag from "./shaders/mesh.frag?raw";
import meshVert from "./shaders/mesh.vert?raw";

const MAX_DPR = 1.5;
/** CSS px between rays, and how far past the viewport the surface extends (rays refract in from outside). */
const CELL = 2.4;
const OVERSCAN = 0.14;
const MAX_SIDE = 640;
/** Red, green and blue bend by slightly different amounts, which fringes the brightest lines. */
const DISPERSION = 0.03;
/** How hard the lens over the words pulls: letters end near 1 + GAIN times the ambient light. */
const GAIN = 2.5;
/** Ray bend per unit of surface slope, as a fraction of the wave unit: enough for the rays to cross. */
const REFRACT = 0.15;
const SCREEN_VERT = "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const HEADER = "#version 300 es\nprecision highp float;\n";

export interface FieldTexture extends Pick<Field, "width" | "height"> {
	texture: WebGLTexture;
}

export interface Frame {
	time: number;
	scroll: number;
	/** 0 on the sand shelf → 1 past the drop-off. */
	deep: number;
	/** Words the light is gathering into, if any: viewport rect in CSS px, its texel size, strength 0–1. */
	focus: {
		field: FieldTexture;
		rect: readonly [number, number, number, number];
		texel: number;
		amount: number;
	} | null;
	/** Up to three taps: page x, page y, start time, strength. */
	pokes: Float32Array;
}

const program = (gl: WebGL2RenderingContext, vertex: string, fragment: string) => {
	const out = gl.createProgram();
	for (const [type, source] of [
		[gl.VERTEX_SHADER, vertex],
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
		gl.attachShader(out, shader);
	}
	gl.bindAttribLocation(out, 0, vertex === SCREEN_VERT ? "a" : "a_uv");
	gl.linkProgram(out);
	if (!gl.getProgramParameter(out, gl.LINK_STATUS)) return null;
	const cache = new Map<string, WebGLUniformLocation | null>();
	return {
		use: () => gl.useProgram(out),
		at: (name: string) => {
			if (!cache.has(name)) cache.set(name, gl.getUniformLocation(out, name));
			return cache.get(name) ?? null;
		},
	};
};

/** Mesh-based caustics: a grid of rays refracted through the surface, brightness from how they bunch. */
export const createCaustics = (canvas: HTMLCanvasElement) => {
	const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false });
	if (!gl) return null;
	const mesh = program(gl, meshVert, meshFrag);
	const floor = program(gl, SCREEN_VERT, HEADER + noise + floorFrag);
	if (!mesh || !floor) return null;

	const grid = gl.createVertexArray();
	const gridVerts = gl.createBuffer();
	const gridIndex = gl.createBuffer();
	gl.bindVertexArray(grid);
	gl.bindBuffer(gl.ARRAY_BUFFER, gridVerts);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridIndex);

	const screen = gl.createVertexArray();
	gl.bindVertexArray(screen);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	const texture = (filter: GLenum) => {
		const t = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return t;
	};

	const field = ({ width, height, data }: Field): FieldTexture => {
		const t = texture(gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, data);
		return { texture: t, width, height };
	};
	const flat = field({ width: 1, height: 1, data: new Float32Array(4) });

	const light = texture(gl.LINEAR);
	const target = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, target);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, light, 0);

	let count = 0;
	let width = 0;
	let height = 0;
	let scale = 1;

	const resize = () => {
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		scale = Math.min(devicePixelRatio, MAX_DPR);
		canvas.width = Math.round(width * scale);
		canvas.height = Math.round(height * scale);
		gl.bindTexture(gl.TEXTURE_2D, light);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA8,
			canvas.width,
			canvas.height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null,
		);

		const span = 1 + 2 * OVERSCAN;
		const nx = Math.min(Math.ceil((width * span) / CELL), MAX_SIDE);
		const ny = Math.min(Math.ceil((height * span) / CELL), MAX_SIDE);
		const verts = new Float32Array((nx + 1) * (ny + 1) * 2);
		for (let y = 0; y <= ny; y++) {
			for (let x = 0; x <= nx; x++) {
				const i = (y * (nx + 1) + x) * 2;
				verts[i] = (x / nx) * span - OVERSCAN;
				verts[i + 1] = (y / ny) * span - OVERSCAN;
			}
		}
		const index = new Uint32Array(nx * ny * 6);
		for (let y = 0; y < ny; y++) {
			for (let x = 0; x < nx; x++) {
				const a = y * (nx + 1) + x;
				index.set([a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1], (y * nx + x) * 6);
			}
		}
		count = index.length;
		gl.bindVertexArray(grid);
		gl.bindBuffer(gl.ARRAY_BUFFER, gridVerts);
		gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
	};

	const draw = ({ time, scroll, deep, focus, pokes }: Frame) => {
		if (!count) return;
		const unit = Math.min(Math.max(Math.min(width, height) * 0.2, 96), 160);
		const lens = focus?.field ?? flat;

		gl.bindFramebuffer(gl.FRAMEBUFFER, target);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);
		mesh.use();
		gl.uniform2f(mesh.at("u_res"), width, height);
		gl.uniform1f(mesh.at("u_scroll"), scroll);
		gl.uniform1f(mesh.at("u_time"), time);
		gl.uniform1f(mesh.at("u_unit"), unit);
		gl.uniform1f(mesh.at("u_refract"), unit * REFRACT);
		gl.uniform1f(mesh.at("u_px"), scale);
		gl.uniform4fv(mesh.at("u_poke"), pokes);
		gl.uniform4f(mesh.at("u_rect"), ...(focus?.rect ?? ([0, 0, 1, 1] as const)));
		gl.uniform1f(mesh.at("u_focus"), focus?.amount ?? 0);
		gl.bindVertexArray(grid);
		for (let channel = 0; channel < 3; channel++) {
			gl.colorMask(channel === 0, channel === 1, channel === 2, false);
			gl.uniform1f(mesh.at("u_ior"), 1 + (channel - 1) * DISPERSION);
			gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
		}
		gl.colorMask(true, true, true, true);
		gl.disable(gl.BLEND);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		floor.use();
		gl.uniform2f(floor.at("u_res"), width, height);
		gl.uniform2f(floor.at("u_buf"), canvas.width, canvas.height);
		gl.uniform1f(floor.at("u_scroll"), scroll);
		gl.uniform1f(floor.at("u_time"), time);
		gl.uniform1f(floor.at("u_deep"), deep);
		gl.uniform3f(floor.at("u_shallow"), ...GROUND.shallow);
		gl.uniform3f(floor.at("u_mid"), ...GROUND.mid);
		gl.uniform3f(floor.at("u_abyss"), ...GROUND.abyss);
		gl.uniform4f(floor.at("u_rect"), ...(focus?.rect ?? ([0, 0, 1, 1] as const)));
		gl.uniform1f(floor.at("u_focus"), focus?.amount ?? 0);
		gl.uniform1f(floor.at("u_texel"), focus?.texel ?? 1);
		gl.uniform1f(floor.at("u_gain"), GAIN);
		gl.uniform1f(floor.at("u_dispersion"), DISPERSION * 2);
		gl.uniform2f(floor.at("u_fieldSize"), lens.width, lens.height);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, lens.texture);
		gl.uniform1i(floor.at("u_field"), 1);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, light);
		gl.uniform1i(floor.at("u_caustic"), 0);
		gl.bindVertexArray(screen);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	};

	return {
		field,
		release: ({ texture }: FieldTexture) => gl.deleteTexture(texture),
		resize,
		draw,
		dispose: () => gl.getExtension("WEBGL_lose_context")?.loseContext(),
	};
};

export type Caustics = NonNullable<ReturnType<typeof createCaustics>>;
