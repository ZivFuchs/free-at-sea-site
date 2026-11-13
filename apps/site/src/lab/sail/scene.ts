import {
	BufferAttribute,
	BufferGeometry,
	CylinderGeometry,
	DataTexture,
	DoubleSide,
	Line,
	LinearFilter,
	LineBasicMaterial,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	PlaneGeometry,
	Raycaster,
	Scene,
	ShaderMaterial,
	type Texture,
	TextureLoader,
	Vector2,
	Vector3,
	Vector4,
	VideoTexture,
	WebGLRenderer,
} from "three";
import { clamp, damp, lerp, smoothstep } from "@/lab/lib/motion";
import { type ClothShape, createCloth } from "./cloth";
import sailFrag from "./sail.frag?raw";
import sailVert from "./sail.vert?raw";
import skyFrag from "./sky.frag?raw";
import skyVert from "./sky.vert?raw";

export interface SailSources {
	/** Same-origin still: the fallback for every slot. */
	still: string;
	video: string | null;
	/** One poster per clip, shown in turn after the hero. */
	posters: readonly (string | null)[];
}

interface Slot {
	texture: Texture;
	aspect: number;
}

const SHAPE = { luff: 0.07, width: 3.9, height: 3, peak: 0.36, footRise: 0.2 } satisfies Omit<
	ClothShape,
	"nx" | "ny"
>;
const CENTRE = new Vector3(SHAPE.luff + SHAPE.width / 2, 1.62, 0.3);
const SAIL_ASPECT = SHAPE.width / (SHAPE.height + SHAPE.peak / 2);
const SUN = new Vector3(-0.42, 0.07, -1).normalize();
const RIG = 0x0b0e17;
const FOV = 34;
const STEP = 1 / 60;
const MAX_DPR = 1.75;
const FADE = 1.1;
const DEG = Math.PI / 180;

/** Steady breeze with slow gusts; every so often it dies, backs, and the sail snaps full again. */
const breeze = (t: number) => {
	const c = (t + 9) % 27;
	const lull =
		c < 20
			? 1
			: c < 22.5
				? lerp(1, -0.22, smoothstep(20, 21.2, c))
				: c < 23.2
					? lerp(-0.22, 1.45, smoothstep(22.5, 23.2, c))
					: lerp(1.45, 1, smoothstep(23.2, 26, c));
	return {
		lull,
		strength: (0.95 + 0.2 * Math.sin(t * 0.6) + 0.12 * Math.sin(t * 1.7 + 1.3)) * lull,
	};
};

/** `scale.xy, offset.xy` that cover-fits an image of `aspect` onto the sail; `bias` picks the crop. */
const fit = (aspect: number, bias: number, into: Vector4) =>
	aspect > SAIL_ASPECT
		? into.set(SAIL_ASPECT / aspect, 1, (1 - SAIL_ASPECT / aspect) * bias, 0)
		: into.set(1, aspect / SAIL_ASPECT, 0, (1 - aspect / SAIL_ASPECT) * 0.5);

const spar = (from: Vector3, to: Vector3, radius: number, material: MeshBasicMaterial) => {
	const dir = to.clone().sub(from);
	const mesh = new Mesh(new CylinderGeometry(radius * 0.8, radius, dir.length(), 10), material);
	mesh.position.copy(from).addScaledVector(dir, 0.5);
	mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
	return mesh;
};

const line = (points: Vector3[], material: LineBasicMaterial) =>
	new Line(new BufferGeometry().setFromPoints(points), material);

export const createSail = (canvas: HTMLCanvasElement, sources: SailSources, still: boolean) => {
	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
	} catch {
		return null;
	}

	const coarse = matchMedia("(pointer: coarse)").matches;
	const cloth = createCloth({ ...SHAPE, nx: coarse ? 30 : 44, ny: coarse ? 24 : 34 });
	const scene = new Scene();
	const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);

	const sky = new Mesh(
		new PlaneGeometry(2, 2),
		new ShaderMaterial({
			vertexShader: skyVert,
			fragmentShader: skyFrag,
			depthTest: false,
			depthWrite: false,
			uniforms: {
				uInvProj: { value: new Matrix4() },
				uCam: { value: new Matrix4() },
				uSun: { value: SUN },
				uTime: { value: 0 },
			},
		}),
	);
	sky.frustumCulled = false;
	sky.renderOrder = -1;
	scene.add(sky);

	const blank = new DataTexture(new Uint8Array([10, 14, 24, 255]), 1, 1);
	blank.needsUpdate = true;
	const empty: Slot = { texture: blank, aspect: 16 / 9 };
	/** 0 is the film; a slot that hasn't loaded (or can't: cross-origin without CORS) shows the film instead. */
	const loaded: (Slot | undefined)[] = [];
	const slot = (i: number) => loaded[i] ?? loaded[0] ?? empty;
	const prepare = (texture: Texture) => {
		texture.minFilter = LinearFilter;
		texture.generateMipmaps = false;
		return texture;
	};
	const loader = new TextureLoader().setCrossOrigin("anonymous");
	[sources.still, ...sources.posters].forEach((url, i) => {
		if (!url) return;
		loader.load(
			url,
			(texture) => {
				loaded[i] ??= {
					texture: prepare(texture),
					aspect: texture.image.width / texture.image.height,
				};
			},
			undefined,
			() => {},
		);
	});

	let video: HTMLVideoElement | null = null;
	if (sources.video && !still) {
		video = document.createElement("video");
		video.crossOrigin = "anonymous";
		video.muted = true;
		video.loop = true;
		video.playsInline = true;
		video.addEventListener(
			"playing",
			() => {
				if (video)
					loaded[0] = {
						texture: prepare(new VideoTexture(video)),
						aspect: video.videoWidth / video.videoHeight,
					};
			},
			{ once: true },
		);
		video.src = sources.video;
		video.play().catch(() => {});
	}

	const geometry = new BufferGeometry();
	const position = new BufferAttribute(cloth.pos, 3);
	const normal = new BufferAttribute(cloth.normal, 3);
	geometry.setAttribute("position", position);
	geometry.setAttribute("normal", normal);
	geometry.setAttribute("uv", new BufferAttribute(cloth.uv, 2));
	geometry.setIndex(cloth.index);
	const material = new ShaderMaterial({
		vertexShader: sailVert,
		fragmentShader: sailFrag,
		side: DoubleSide,
		uniforms: {
			uA: { value: blank },
			uB: { value: blank },
			uFitA: { value: new Vector4(1, 1, 0, 0) },
			uFitB: { value: new Vector4(1, 1, 0, 0) },
			uMix: { value: 0 },
			uBeam: { value: 0 },
			uSun: { value: SUN },
		},
	});
	const sail = new Mesh(geometry, material);
	sail.frustumCulled = false;
	scene.add(sail);

	const dark = new MeshBasicMaterial({ color: RIG });
	const rope = new LineBasicMaterial({ color: RIG });
	const head = SHAPE.height + 0.05;
	const mastTop = new Vector3(0, head + 0.75, 0);
	const anchor = new Vector3(SHAPE.luff + SHAPE.width * 0.86, -1.2, 0.6);
	const sheetRest =
		anchor.distanceTo(new Vector3(SHAPE.luff + SHAPE.width, SHAPE.footRise, 0)) * 1.03;
	const sheetLine = line([anchor, anchor.clone()], rope);
	sheetLine.frustumCulled = false;
	scene.add(
		spar(new Vector3(0, -7, 0), mastTop, 0.05, dark),
		spar(
			new Vector3(-0.12, head - 0.012, 0),
			new Vector3(SHAPE.luff + SHAPE.width + 0.1, head + SHAPE.peak * 1.04, 0),
			0.02,
			dark,
		),
		line([mastTop, new Vector3(-5.5, -7, -1.2)], rope),
		line([mastTop, new Vector3(2.2, -7, -5)], rope),
		line(
			[mastTop, new Vector3(SHAPE.luff + SHAPE.width + 0.08, head + SHAPE.peak * 1.04 + 0.02, 0)],
			rope,
		),
		sheetLine,
	);

	const wind = { x: 0, y: 0, z: 1, time: 0, flutter: 0.3 };
	const sheet = { x: anchor.x, y: anchor.y, z: anchor.z, length: sheetRest };
	const aim = new Vector2();
	const ray = new Raycaster();
	let gust = 0;
	let lean = 0;
	let clock = 0;
	let budget = 0;
	let progress = 0;
	let ease = 0;
	let azimuth = 30 * DEG;
	let from = 0;
	let to = 0;
	let mix = 1;
	let beam = 0;
	let phone = false;

	const simulate = (steps: number) => {
		for (let i = 0; i < steps; i++) {
			clock += STEP;
			const { lull, strength } = still ? { lull: 1, strength: 1 } : breeze(clock);
			const sway = Math.sin(clock * 0.13) * 0.22 + lean * 0.4;
			const scale = (strength + gust) / Math.hypot(sway, 0.04, 1);
			wind.x = sway * scale;
			wind.y = 0.04 * scale;
			wind.z = scale;
			wind.time = clock;
			wind.flutter = 0.3 + 0.55 * clamp(1 - Math.abs(lull));
			sheet.length = sheetRest + ease * 0.42;
			cloth.step(STEP, wind, sheet);
			gust *= 0.985;
		}
	};
	simulate(still ? 420 : 200);

	const place = () => {
		const target = clamp(progress * 2.4);
		const swing =
			(lerp(30, -7, smoothstep(0, 1, target)) + (still ? 0 : Math.sin(clock * 0.11) * 1.6)) * DEG;
		azimuth = still ? swing : azimuth + (swing - azimuth) * 0.08;
		const half = Math.tan((FOV / 2) * DEG);
		const distance = Math.max(
			SHAPE.height / 2 / (half * (phone ? 0.42 : 0.6)),
			SHAPE.width / 2 / (half * camera.aspect * (phone ? 0.84 : 0.5)),
		);
		camera.position.set(
			CENTRE.x + Math.sin(azimuth) * distance,
			CENTRE.y - distance * 0.075,
			CENTRE.z + Math.cos(azimuth) * distance,
		);
		camera.lookAt(CENTRE);
		camera.updateMatrixWorld();
		const u = sky.material.uniforms;
		u.uInvProj.value.copy(camera.projectionMatrixInverse);
		u.uCam.value.copy(camera.matrixWorld);
		u.uTime.value = clock;
	};

	const resize = () => {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (!width || !height) return;
		phone = width / height < 0.85;
		renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_DPR));
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		// Desktop: sail to the right of the copy. Phone: sail above it.
		if (phone) camera.setViewOffset(width, height, 0, height * 0.15, width, height);
		else camera.setViewOffset(width, height, -width * 0.17, -height * 0.02, width, height);
		camera.updateProjectionMatrix();
	};

	const frame = (dt: number) => {
		if (!still) {
			budget = Math.min(budget + dt, STEP * 3);
			const steps = Math.floor(budget / STEP);
			budget -= steps * STEP;
			simulate(steps);
		}
		ease = still ? clamp(progress * 2.4) : damp(ease, clamp(progress * 2.4), 2, dt);
		mix = still ? 1 : Math.min(mix + dt / FADE, 1);
		beam = damp(beam, slot(0) === empty ? 0 : 1, still ? 60 : 1.2, dt);
		lean = damp(lean, 0, 0.6, dt);

		const u = material.uniforms;
		const a = slot(from);
		const b = slot(to);
		const drift = still ? 0 : Math.sin(clock * 0.05) * 0.06;
		u.uA.value = a.texture;
		u.uB.value = b.texture;
		fit(a.aspect, from === 0 ? 0.08 + drift : 0.5, u.uFitA.value);
		fit(b.aspect, to === 0 ? 0.08 + drift : 0.5, u.uFitB.value);
		u.uMix.value = smoothstep(0, 1, mix);
		u.uBeam.value = beam;

		position.needsUpdate = true;
		normal.needsUpdate = true;
		const sheetAt = sheetLine.geometry.getAttribute("position");
		sheetAt.setXYZ(
			0,
			cloth.pos[cloth.clew * 3],
			cloth.pos[cloth.clew * 3 + 1],
			cloth.pos[cloth.clew * 3 + 2],
		);
		sheetAt.needsUpdate = true;

		place();
		renderer.render(scene, camera);
	};

	return {
		resize,
		frame,
		/** `p`: 0–1 through the stage; `shown`: which slot the projector is on (0 = the film). */
		setProgress: (p: number, shown: number) => {
			progress = p;
			const next = clamp(shown, 0, sources.posters.length);
			if (next === to) return;
			from = mix > 0.5 ? to : from;
			to = next;
			mix = 0;
			gust += 0.5;
		},
		/** Pointer in NDC with its speed (0–1): a hand of wind pressed into the cloth. */
		pointer: (x: number, y: number, speed: number) => {
			ray.setFromCamera(aim.set(x, y), camera);
			const { origin, direction } = ray.ray;
			const t = (CENTRE.z - origin.z) / direction.z;
			if (t <= 0) return;
			const force = 70 * clamp(speed);
			cloth.push(
				origin.x + direction.x * t,
				origin.y + direction.y * t,
				CENTRE.z,
				1,
				direction.x * force,
				direction.y * force,
				direction.z * force,
			);
			gust = Math.min(gust + speed * 0.05, 0.6);
			lean = clamp(lean + x * speed * 0.2, -1, 1);
		},
		dispose: () => {
			video?.pause();
			video?.removeAttribute("src");
			geometry.dispose();
			material.dispose();
			renderer.dispose();
		},
	};
};
