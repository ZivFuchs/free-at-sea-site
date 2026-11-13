import { runShader } from "@/lab/lib/gl";
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
import water from "./water.frag?raw";

const FRAGMENT = `precision highp float;\n${noise}\n${water}`;
/** Distance between stops and the stage's focal length, px. */
const SPACING = 1500;
const PERSPECTIVE = 1000;
/** Stops of fog before a plane is fully lost. */
const FOG = 2.4;
/** Opacity of a plane one stop ahead. */
const FAR = 0.3;
const INTRO = 1.25;
const WIDE = "(min-width: 48rem)";

const root = document.querySelector<HTMLElement>("[data-drift-root]");

if (root) {
	const html = document.documentElement;
	const canvas = root.querySelector<HTMLCanvasElement>("canvas");
	const stage = root.querySelector<HTMLElement>("[data-stage]");
	const world = root.querySelector<HTMLElement>("[data-world]");
	const track = root.querySelector<HTMLElement>("[data-track]");
	const readout = root.querySelector<HTMLElement>("[data-readout]");
	const planes = [...root.querySelectorAll<HTMLElement>("[data-plane]")];
	const ticks = [...root.querySelectorAll<HTMLButtonElement>("[data-go]")];
	const last = planes.length - 1;
	const pad = (n: number) => String(n).padStart(2, "0");

	const drifting =
		!!stage &&
		!!world &&
		!!track &&
		!reducedMotion() &&
		CSS.supports("transform-style", "preserve-3d");

	let cam = -INTRO;
	let speed = 0;
	const look = { x: 0, y: 0, tx: 0, ty: 0 };

	/* ── Clip playback: the screen comes forward to fill the view ── */
	let playing = -1;
	let focused = -1;
	let focus = 0;
	const fit = { scale: 1, lift: 0 };

	const stop = () => {
		if (playing < 0) return;
		const plane = planes[playing];
		plane?.querySelector("iframe")?.remove();
		plane?.querySelector<HTMLElement>("[data-play]")?.removeAttribute("hidden");
		plane?.querySelector<HTMLElement>("[data-close]")?.setAttribute("hidden", "");
		playing = -1;
		root.removeAttribute("data-playing");
		if (!drifting) root.style.removeProperty("--focus");
	};

	const play = (index: number) => {
		stop();
		const plane = planes[index];
		const frame = plane?.querySelector<HTMLElement>("[data-frame]");
		const button = plane?.querySelector<HTMLElement>("[data-play]");
		if (!plane || !frame || !button) return;
		const iframe = document.createElement("iframe");
		iframe.src = button.dataset.embed ?? "";
		iframe.title = button.dataset.title ?? "";
		iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
		iframe.allowFullscreen = true;
		iframe.className = frame.dataset.fill ?? "";
		frame.appendChild(iframe);
		button.hidden = true;
		const close = plane.querySelector<HTMLElement>("[data-close]");
		close?.removeAttribute("hidden");
		close?.focus({ preventScroll: true });

		let top = frame.offsetHeight / 2;
		for (
			let el: HTMLElement | null = frame;
			el && el !== plane;
			el = el.offsetParent as HTMLElement | null
		)
			top += el.offsetTop;
		const chrome = matchMedia(WIDE).matches ? 120 : 72;
		fit.scale = Math.max(
			1,
			Math.min(
				(innerWidth * 0.98) / frame.offsetWidth,
				(innerHeight - chrome) / frame.offsetHeight,
			),
		);
		fit.lift = plane.offsetHeight / 2 - top;
		playing = focused = index;
		root.setAttribute("data-playing", "");
	};

	root.addEventListener("click", (event) => {
		if (!(event.target instanceof Element)) return;
		const button = event.target.closest<HTMLElement>("[data-play], [data-close]");
		const plane = button?.closest<HTMLElement>("[data-plane]");
		if (!button || !plane) return;
		if (button.hasAttribute("data-close")) {
			stop();
			plane.querySelector<HTMLElement>("[data-play]")?.focus({ preventScroll: true });
		} else play(planes.indexOf(plane));
	});

	/* ── Backdrop ── */
	const shader =
		canvas &&
		runShader(canvas, {
			fragment: FRAGMENT,
			resolution: 0.8,
			uniforms: () => ({
				u_z: drifting ? cam : pageProgress() * last,
				u_speed: speed,
				u_look: [look.x, look.y],
				u_dim: drifting ? clamp(cam / last) : pageProgress(),
			}),
		});
	if (canvas && !shader) canvas.hidden = true;

	if (!drifting) {
		addEventListener("scroll", () => shader?.redraw(), { passive: true });
		addEventListener("keydown", (event) => event.key === "Escape" && stop());
	} else if (stage && world && track) {
		root.setAttribute("data-drift", "");
		stage.style.perspective = `${PERSPECTIVE}px`;
		html.style.scrollSnapType = "y proximity";
		html.style.scrollPaddingTop = "0px";

		const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
		/** Which shoulder each plane hangs off, far away; the first and last sit dead ahead. */
		const sides = planes.map((_, i) => (i === 0 || i === last ? 0 : i % 2 ? 1 : -1));
		const shown = planes.map(() => true);
		let step = 1;
		let current = -1;

		const measure = () => {
			step =
				track.firstElementChild instanceof HTMLElement
					? track.firstElementChild.offsetHeight
					: innerHeight;
		};
		measure();
		addEventListener("resize", measure);

		const position = () => clamp(scrollY / step, 0, last);
		const go = (index: number, smooth = true) =>
			scrollTo({ top: clamp(index, 0, last) * step, behavior: smooth ? "smooth" : "instant" });

		const mark = (index: number) => {
			current = index;
			ticks.forEach((tick, i) => {
				if (i === index) tick.setAttribute("aria-current", "step");
				else tick.removeAttribute("aria-current");
			});
			if (readout)
				readout.textContent = `${pad(index + 1)} / ${pad(planes.length)} · ${planes[index]?.dataset.label ?? ""}`;
		};

		let intro = INTRO - Math.min(position(), INTRO);

		const frame = onFrame(root, (time, dt) => {
			const t = position();
			const i = Math.floor(t);
			intro = damp(intro, 0, 1.5, dt);
			const before = cam;
			cam = damp(cam, i + smoothstep(0.2, 0.8, t - i) - intro, 10, dt);
			speed = damp(speed, (cam - before) / dt, 8, dt);
			if (Math.round(t) !== current) mark(Math.round(t));
			if (playing >= 0 && Math.abs(t - playing) > 0.3) stop();

			focus = damp(focus, playing >= 0 ? 1 : 0, 7, dt);
			if (focus < 0.002 && playing < 0) focus = 0;
			root.style.setProperty("--focus", focus.toFixed(3));

			look.x = damp(look.x, look.tx, 3, dt);
			look.y = damp(look.y, look.ty, 3, dt);
			const calm = 1 - focus;
			// Swimming: sway and roll peak mid-stroke and settle level at each stop.
			const stroke = Math.sin(cam * Math.PI) * calm;
			const sway = stroke * innerWidth * 0.02;
			const heave = Math.sin(time * 0.25) * 6 * calm;
			const roll = stroke * 1.6;
			world.style.transform = `translate3d(${sway.toFixed(1)}px,${heave.toFixed(1)}px,0) rotateX(${(look.y * 2.2 * calm).toFixed(2)}deg) rotateY(${(look.x * 3 * calm).toFixed(2)}deg) rotateZ(${roll.toFixed(2)}deg)`;

			const wide = innerWidth >= 768;
			planes.forEach((plane, index) => {
				const r = index - cam;
				const side = sides[index] ?? 0;
				const hero = index === focused;
				let opacity: number;
				let x: number;
				let y: number;
				let z: number;
				let turn: number;
				if (r >= 0) {
					const far = smoothstep(0, 1, r);
					opacity = r < 1 ? lerp(1, FAR, r) : FAR * (1 - smoothstep(1, FOG, r));
					// Offsets are apparent (on-screen) sizes, so undo the perspective shrink.
					const reach = far * (1 + (r * SPACING) / PERSPECTIVE);
					x = side * innerWidth * (wide ? 0.3 : 0.24) * reach;
					y = (index % 4 < 2 ? -1 : 1) * innerHeight * 0.24 * reach * Math.abs(side);
					z = -r * SPACING;
					turn = -side * 18 * far;
				} else {
					const past = clamp(-r / 0.5);
					opacity = 1 - smoothstep(0.12, 0.9, past);
					x = side * innerWidth * 0.75 * past * past;
					y = 0;
					z = -r * SPACING * 0.8;
					turn = side * 24 * past * past;
				}
				if (!hero) opacity *= calm;

				const visible = opacity > 0.004;
				if (!visible && !shown[index]) return;
				shown[index] = visible;
				if (!visible) {
					plane.style.opacity = "0";
					plane.style.pointerEvents = "none";
					plane.style.transform = "translate3d(0,0,-4000px)";
					return;
				}
				const idle = 1 - (hero ? focus : 0);
				x += Math.cos(time * 0.37 + index * 2.1) * 5 * idle;
				y += Math.sin(time * 0.5 + index * 1.7) * 7 * idle;
				const scale = hero ? lerp(1, fit.scale, focus) : 1;
				if (hero) y += fit.lift * scale * focus;
				plane.style.opacity = opacity.toFixed(3);
				plane.style.pointerEvents = Math.abs(r) < 0.3 ? "auto" : "none";
				plane.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${turn.toFixed(2)}deg) rotateZ(${(side * 2 * clamp(r)).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
				plane.style.setProperty("--on", (1 - smoothstep(0.03, 0.4, Math.abs(r))).toFixed(3));
				if (fine)
					plane.style.filter = r > 0.2 ? `blur(${Math.min(r * 2.4, 6).toFixed(1)}px)` : "none";
			});
		});

		const typing = (target: EventTarget | null) =>
			target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable]");
		const pressing = (target: EventTarget | null) =>
			target instanceof HTMLElement && target.matches("button, a, summary");
		const KEYS: Record<string, (at: number) => number> = {
			ArrowDown: (at) => at + 1,
			ArrowRight: (at) => at + 1,
			PageDown: (at) => at + 1,
			j: (at) => at + 1,
			" ": (at) => at + 1,
			ArrowUp: (at) => at - 1,
			ArrowLeft: (at) => at - 1,
			PageUp: (at) => at - 1,
			k: (at) => at - 1,
			Home: () => 0,
			End: () => last,
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
			if (event.key === "Escape") return stop();
			const move = KEYS[event.key];
			if (!move || (event.key === " " && pressing(event.target))) return;
			event.preventDefault();
			go(move(Math.round(position())));
		};
		addEventListener("keydown", onKey);

		root.addEventListener("click", (event) => {
			if (!(event.target instanceof Element)) return;
			const tick = event.target.closest<HTMLElement>("[data-go]");
			if (tick) return go(Number(tick.dataset.go));
			const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
			const index = anchor ? planes.findIndex((plane) => `#${plane.id}` === anchor.hash) : -1;
			if (index < 0) return;
			event.preventDefault();
			go(index);
		});

		root.addEventListener("focusin", (event) => {
			const plane =
				event.target instanceof Element ? event.target.closest<HTMLElement>("[data-plane]") : null;
			const index = plane ? planes.indexOf(plane) : -1;
			if (index >= 0 && Math.abs(position() - index) > 0.3) go(index);
		});

		addEventListener("pointermove", (event) => {
			if (event.pointerType !== "mouse") return;
			look.tx = (event.clientX / innerWidth) * 2 - 1;
			look.ty = -((event.clientY / innerHeight) * 2 - 1);
		});
		const needsPermission =
			"DeviceOrientationEvent" in window && "requestPermission" in DeviceOrientationEvent;
		const onTilt = ({ beta, gamma }: DeviceOrientationEvent) => {
			if (beta === null || gamma === null) return;
			look.tx = clamp(gamma / 25, -1, 1);
			look.ty = clamp((beta - 50) / 25, -1, 1);
		};
		if (!needsPermission) addEventListener("deviceorientation", onTilt);

		addEventListener(
			"pagehide",
			() => {
				frame.stop();
				shader?.stop();
				html.style.scrollSnapType = "";
				html.style.scrollPaddingTop = "";
			},
			{ once: true },
		);
	}
}
