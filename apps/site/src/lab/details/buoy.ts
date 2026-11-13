import { clamp, onFrame } from "@/lab/lib/motion";

interface Float {
	el: HTMLElement;
	/** Own slow bob: phase and rate. */
	phase: number;
	rate: number;
	/** Sprung state and velocity: heave (px), roll (deg), and tilt toward a press (deg). */
	y: number;
	vy: number;
	roll: number;
	vroll: number;
	tx: number;
	vtx: number;
	ty: number;
	vty: number;
	/** Where it is being pressed, −1…1 from the centre, or null. */
	press: { x: number; y: number } | null;
}

const STIFF = 46;
const DRAG = 5.5;
const HEAVE = 4.5;
const ROLL = 0.8;
const PRESS_DIP = 7;
const PRESS_TILT = 5;

const spring = (
	pos: number,
	vel: number,
	target: number,
	dt: number,
	stiff = STIFF,
	drag = DRAG,
) => {
	const next = vel + (-stiff * (pos - target) - drag * vel) * dt;
	return [pos + next * dt, next] as const;
};

/** Floats every `[data-float]` in `track`: bobbing, dipping under a press, rocking when the rack is flung. */
export const startBuoy = (track: HTMLElement) => {
	const floats: Float[] = [...track.querySelectorAll<HTMLElement>("[data-float]")].map((el, i) => ({
		el,
		phase: i * 1.9,
		rate: 0.55 + ((i * 37) % 10) / 40,
		y: 0,
		vy: 0,
		roll: 0,
		vroll: 0,
		tx: 0,
		vtx: 0,
		ty: 0,
		vty: 0,
		press: null,
	}));

	let lastScroll = track.scrollLeft;
	let fling = 0;

	const loop = onFrame(track, (time, dt) => {
		const speed = (track.scrollLeft - lastScroll) / dt;
		lastScroll = track.scrollLeft;
		fling += (clamp(speed / 260, -5, 5) - fling) * Math.min(1, dt * 10);

		for (const f of floats) {
			const bob = Math.sin(time * f.rate + f.phase);
			const sway = Math.sin(time * f.rate * 0.7 + f.phase * 1.7);
			const dip = f.press ? PRESS_DIP : 0;
			[f.y, f.vy] = spring(f.y, f.vy, bob * HEAVE + dip + Math.abs(fling) * 1.5, dt);
			[f.roll, f.vroll] = spring(f.roll, f.vroll, sway * ROLL + fling, dt, STIFF * 0.7, DRAG * 0.8);
			[f.tx, f.vtx] = spring(f.tx, f.vtx, f.press ? -f.press.y * PRESS_TILT : bob * 0.6, dt);
			[f.ty, f.vty] = spring(f.ty, f.vty, f.press ? f.press.x * PRESS_TILT : sway * 0.8, dt);
			f.el.style.setProperty("--y", `${f.y.toFixed(2)}px`);
			f.el.style.setProperty("--roll", `${f.roll.toFixed(3)}deg`);
			f.el.style.setProperty("--tx", `${f.tx.toFixed(3)}deg`);
			f.el.style.setProperty("--ty", `${f.ty.toFixed(3)}deg`);
			f.el.style.setProperty("--sheen", (f.ty * 9 + f.roll * 14 + bob * 6).toFixed(2));
		}
	});

	const stops = floats.map((f) => {
		const at = (e: PointerEvent) => {
			const r = f.el.getBoundingClientRect();
			f.press = {
				x: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
				y: clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
			};
		};
		const down = (e: PointerEvent) => {
			at(e);
			f.vy += 60;
		};
		const release = () => {
			f.press = null;
		};
		f.el.addEventListener("pointerenter", down);
		f.el.addEventListener("pointermove", at);
		f.el.addEventListener("pointerdown", down);
		f.el.addEventListener("pointerleave", release);
		f.el.addEventListener("pointercancel", release);
		return () => {
			f.el.removeEventListener("pointerenter", down);
			f.el.removeEventListener("pointermove", at);
			f.el.removeEventListener("pointerdown", down);
			f.el.removeEventListener("pointerleave", release);
			f.el.removeEventListener("pointercancel", release);
			for (const name of ["--y", "--roll", "--tx", "--ty", "--sheen"])
				f.el.style.removeProperty(name);
		};
	});

	return () => {
		loop.stop();
		for (const stop of stops) stop();
	};
};
