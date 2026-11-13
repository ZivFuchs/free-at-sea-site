import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, onFrame, smoothstep } from "@/lab/lib/motion";
import body from "./glass.frag?raw";
import { type Field, textField } from "./sdf";

const VERTEX = "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const FRAGMENT = `#version 300 es\nprecision highp float;\n${noise}\n${body}`;
const RAD = Math.PI / 180;
const MAX_DPR = 1.5;
const SLOW_MS = 26;
const MIN_SCALE = 0.4;
/** Share of the cap height under water before any scroll, and how much further a full scroll sinks it. */
const SINK = 0.3;
const DIVE = 1.35;
/** Gap between the two rows of a portrait layout, in cap-heights. */
const ROW_GAP = 3;

type Vec3 = readonly [number, number, number];

interface SceneOptions {
	photo: string;
	title: string;
	/** Horizon as a fraction of the photo's height, pinned to the same fraction of the canvas. */
	horizon: number;
	/** 0 → 1 as the hero scrolls through: raises the water over the title. */
	level: () => number;
}

const compile = (gl: WebGL2RenderingContext, type: GLenum, source: string) => {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	console.error(gl.getShaderInfoLog(shader));
	return null;
};

const loadImage = (src: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = reject;
		image.src = src;
	});

/** Portrait screens stand the title in two rows, one behind the other, and look down more steeply. */
const framing = (aspect: number) =>
	aspect < 0.9
		? { rows: 2, fov: 58 * RAD, elevation: 18 * RAD, fill: 0.84 }
		: { rows: 1, fov: 40 * RAD, elevation: 10 * RAD, fill: 0.86 };

/**
 * The title as thick glass standing in the photograph's sea, ray-marched from a distance field of the real
 * letterforms. Resolves to `null` when WebGL2 or the font is unavailable, so the flat title stays.
 */
export const mountGlass = async (
	canvas: HTMLCanvasElement,
	{ photo, title, horizon, level }: SceneOptions,
) => {
	const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false });
	if (!gl) return null;
	const program = gl.createProgram();
	const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
	const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
	if (!vs || !fs) return null;
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

	const family = getComputedStyle(document.documentElement).getPropertyValue("--font-playfair");
	const [image] = await Promise.all([
		loadImage(photo),
		document.fonts.load(`900 100px ${family}`).catch(() => []),
	]);

	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	const at = (name: string) => gl.getUniformLocation(program, name);
	const bind = (unit: number, name: string) => {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.uniform1i(at(name), unit);
	};

	bind(0, "u_photo");
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.uniform1f(at("u_photoAspect"), image.naturalWidth / image.naturalHeight);
	gl.uniform1f(at("u_horizon"), horizon);
	bind(1, "u_sdf0");
	bind(2, "u_sdf1");

	const words = title.toUpperCase().split(" ");
	const lines = (rows: number) =>
		rows === 1 ? [words.join(" ")] : [words.slice(0, 1).join(" "), words.slice(1).join(" ")];

	let fields: Field[] = [];
	let rows = 0;
	const setRows = (count: number) => {
		if (count === rows) return true;
		const next = lines(count).map((line) =>
			textField(line, family, count === 1 ? 2048 : 1024, 512),
		);
		if (next.some((field) => !field)) return false;
		fields = next.filter((field) => field !== null);
		rows = count;
		fields.forEach((field, i) => {
			gl.activeTexture(gl.TEXTURE1 + i);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.R16F,
				field.width,
				field.height,
				0,
				gl.RED,
				gl.FLOAT,
				field.data,
			);
			gl.uniform3f(at(`u_row${i}`), field.half[0], field.half[1], field.centerY);
		});
		gl.uniform1f(at("u_rows"), count);
		return true;
	};

	let scale = 1;
	const resize = () => {
		const ratio = Math.min(devicePixelRatio, MAX_DPR) * scale;
		canvas.width = Math.round(canvas.clientWidth * ratio);
		canvas.height = Math.round(canvas.clientHeight * ratio);
		gl.viewport(0, 0, canvas.width, canvas.height);
	};

	const look = { x: 0, y: 0, tx: 0, ty: 0 };
	const onPointer = (event: PointerEvent) => {
		look.tx = event.clientX / innerWidth - 0.5;
		look.ty = event.clientY / innerHeight - 0.5;
	};
	addEventListener("pointermove", onPointer, { passive: true });

	let slow = 0;
	const loop = onFrame(canvas, (time, dt) => {
		const aspect = canvas.width / Math.max(canvas.height, 1);
		const frame = framing(aspect);
		if (!setRows(frame.rows)) return;

		const tanH = Math.tan(frame.fov / 2);
		const width = Math.max(...fields.map((field) => field.textWidth));
		const range = Math.max(width / (2 * frame.fill * tanH * aspect), 1 / (0.42 * tanH));
		const depth = frame.rows === 1 ? 0 : ROW_GAP / 2;
		look.x = damp(look.x, look.tx, 3, dt);
		look.y = damp(look.y, look.ty, 3, dt);
		const yaw = look.x * 0.07 + Math.sin(time * 0.11) * 0.012;
		const pitch = Math.atan((1 - 2 * horizon) * tanH) + look.y * 0.02;
		const orbit = frame.elevation - look.y * 0.03;
		const reach = range * Math.cos(orbit);
		const cam: Vec3 = [
			-Math.sin(yaw) * reach,
			0.25 + range * Math.sin(orbit),
			-Math.cos(yaw) * reach,
		];
		const fwd: Vec3 = [
			Math.sin(yaw) * Math.cos(pitch),
			-Math.sin(pitch),
			Math.cos(yaw) * Math.cos(pitch),
		];
		const right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
		const up: Vec3 = [
			fwd[1] * right[2] - fwd[2] * right[1],
			fwd[2] * right[0] - fwd[0] * right[2],
			fwd[0] * right[1] - fwd[1] * right[0],
		];

		gl.uniform2f(at("u_res"), canvas.width, canvas.height);
		gl.uniform1f(at("u_time"), time);
		gl.uniform1f(at("u_tanH"), tanH);
		gl.uniform1f(at("u_base"), -(SINK + DIVE * level()) + Math.sin(time * 0.6) * 0.012);
		gl.uniform3f(at("u_cam"), ...cam);
		gl.uniform3f(at("u_fwd"), ...fwd);
		gl.uniform3f(at("u_right"), ...right);
		gl.uniform3f(at("u_up"), ...up);
		gl.uniform2f(at("u_rowZ"), depth, -depth);
		gl.uniform3f(at("u_bounds"), width / 2 + 0.25, -depth, depth);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		slow = dt * 1000 > SLOW_MS ? slow + 1 : Math.max(slow - 1, 0);
		if (slow > 40 && scale > MIN_SCALE) {
			slow = 0;
			scale = Math.max(scale * 0.8, MIN_SCALE);
			resize();
		}
	});

	const observer = new ResizeObserver(() => {
		resize();
		loop.redraw();
	});
	observer.observe(canvas);

	addEventListener(
		"pagehide",
		() => {
			loop.stop();
			observer.disconnect();
			removeEventListener("pointermove", onPointer);
		},
		{ once: true },
	);

	return { redraw: loop.redraw };
};

/** 0 at the top of `section`, 1 once its sticky stage is about to release. */
export const diveProgress = (section: Element) => {
	const rect = section.getBoundingClientRect();
	return smoothstep(0.06, 0.92, clamp(-rect.top / Math.max(rect.height - innerHeight, 1)));
};
