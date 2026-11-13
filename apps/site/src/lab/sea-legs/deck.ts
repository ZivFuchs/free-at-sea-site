import { clamp, onFrame, reducedMotion } from "@/lab/lib/motion";

/** Degrees. The deck never rolls or pitches further than this; wide screens get less, as their edges travel further. */
const MAX_ROLL = 4;
const MIN_ROLL = 2;
const ROLL_WIDTH = 2800;
const MAX_PITCH = 2;
const MAX_HEAVE = 10;
/** How far the horizon follows a tilted phone before it stops. */
const MAX_TILT = 8;
const MAX_SWING = 24;
/** Horizon rise per degree of pitch, px. */
const LOOK = 5;

interface Spring {
	x: number;
	v: number;
}

const spring = (): Spring => ({ x: 0, v: 0 });

/** Damped spring toward `target`; returns the acceleration applied. */
const step = (s: Spring, target: number, omega: number, zeta: number, dt: number) => {
	const a = -omega * omega * (s.x - target) - 2 * zeta * omega * s.v;
	s.v += a * dt;
	s.x += s.v * dt;
	return a;
};

type OrientationPermission = typeof DeviceOrientationEvent & {
	requestPermission?: () => Promise<PermissionState>;
};

const signed = (deg: number) => `${deg < 0 ? "−" : "+"}${Math.abs(deg).toFixed(1)}°`;

export const startDeck = (root: HTMLElement) => {
	const deck = root.querySelector<HTMLElement>("[data-deck]");
	const scene = root.querySelector<HTMLElement>("[data-scene]");
	const steady = root.querySelector<HTMLButtonElement>("[data-steady]");
	if (!deck || !scene || !steady) return;

	if (reducedMotion()) {
		steady.setAttribute("aria-pressed", "true");
		steady.disabled = true;
		return;
	}

	const rules = [...root.querySelectorAll<HTMLElement>("[data-level]")];
	const dial = root.querySelector<SVGGElement>("[data-dial]");
	const rollOut = root.querySelector<HTMLElement>("[data-roll]");
	const pitchOut = root.querySelector<HTMLElement>("[data-pitch]");
	const ask = root.querySelector<HTMLButtonElement>("[data-ask]");
	const hint = root.querySelector<HTMLElement>("[data-hint]");
	const weights = [...root.querySelectorAll<HTMLElement>("[data-hang]")].map((el, i) => ({
		el,
		swing: spring(),
		// Shorter lines swing faster.
		omega: 7.5 / Math.sqrt(Number(el.dataset.hang) || 1),
		zeta: 0.09 + (i % 3) * 0.02,
	}));

	const coarse = matchMedia("(pointer: coarse)").matches;
	const maxRoll = coarse ? 3 : clamp(ROLL_WIDTH / innerWidth, MIN_ROLL, MAX_ROLL);

	const roll = spring();
	const pitch = spring();
	const heave = spring();
	const gain = spring();
	gain.x = 1;
	/** Screen angle of the true horizon: 0 until a gyro says the phone is tilted. */
	const horizon = spring();
	const settled = spring();
	const pointer = { x: 0, y: 0 };
	const tilt = { on: false, gamma: 0, beta: 0, base: Number.NaN };
	let calm = false;
	let lastScroll = scrollY;
	let lastText = 0;

	const pivot = () => {
		const origin = `50% ${scrollY + innerHeight / 2 - deck.offsetTop}px`;
		deck.style.transformOrigin = origin;
		scene.style.transformOrigin = origin;
	};

	const loop = onFrame(root, (time, rawDt) => {
		const dt = Math.min(rawDt, 1 / 30);
		step(gain, calm ? 0 : 1, 3, 1, dt);

		const swell = Math.sin(time * 0.52) + 0.4 * Math.sin(time * 0.83 + 1.3);
		const nod = 0.8 * Math.sin(time * 0.41 + 0.6);
		let rollTarget = (swell * 0.3 + pointer.x * 0.6) * maxRoll;
		let pitchTarget = nod + pointer.y;

		if (tilt.on) {
			step(horizon, -clamp(tilt.gamma, -MAX_TILT, MAX_TILT), 9, 0.9, dt);
			step(settled, horizon.x, 1.6, 1, dt);
			// The deck is the phone: it only lags behind a sudden tilt, then rights itself.
			rollTarget = swell * 0.2 * maxRoll + (horizon.x - settled.x) * 0.5;
			tilt.base += (tilt.beta - tilt.base) * Math.min(dt * 0.4, 1);
			pitchTarget = nod * 0.6 + clamp((tilt.beta - tilt.base) * 0.2, -1.2, 1.2);
		}

		const accel = step(roll, clamp(rollTarget, -maxRoll, maxRoll) * gain.x, 2.4, 0.42, dt);
		step(pitch, clamp(pitchTarget, -MAX_PITCH, MAX_PITCH) * gain.x, 2, 0.55, dt);
		step(heave, 5 * Math.sin(time * 0.47) * gain.x, 5, 0.3, dt);
		roll.x = clamp(roll.x, -maxRoll, maxRoll);
		heave.x = clamp(heave.x, -MAX_HEAVE, MAX_HEAVE);

		const level = horizon.x * gain.x;
		deck.style.transform = `translateY(${heave.x.toFixed(2)}px) perspective(1400px) rotateX(${pitch.x.toFixed(3)}deg) rotate(${roll.x.toFixed(3)}deg)`;
		scene.style.transform = `rotate(${(-roll.x).toFixed(3)}deg) translateY(${(-heave.x).toFixed(2)}px) rotate(${level.toFixed(3)}deg) translateY(${(pitch.x * LOOK).toFixed(2)}px)`;
		const flat = `rotate(${(level - roll.x).toFixed(3)}deg)`;
		for (const rule of rules) rule.style.transform = flat;

		for (const w of weights) {
			step(w.swing, level, w.omega, w.zeta, dt);
			// The pivot rides the deck, so its roll accelerating kicks the weight.
			w.swing.v -= accel * 0.5 * dt;
			const local = clamp(w.swing.x - roll.x, -MAX_SWING, MAX_SWING);
			w.el.style.transform = `rotate(${local.toFixed(3)}deg)`;
		}

		dial?.setAttribute(
			"transform",
			`rotate(${((level - roll.x) * 3).toFixed(2)}) translate(0 ${(pitch.x * 2.5).toFixed(2)})`,
		);
		if (time - lastText > 0.12) {
			lastText = time;
			if (rollOut) rollOut.textContent = signed(roll.x - level);
			if (pitchOut) pitchOut.textContent = signed(pitch.x);
		}
	});

	const onScroll = () => {
		const dy = scrollY - lastScroll;
		lastScroll = scrollY;
		// Scrolling fast lifts and drops the deck.
		heave.v = clamp(heave.v - dy * 0.9, -160, 160);
		pivot();
	};

	const onPointer = (event: PointerEvent) => {
		if (event.pointerType !== "mouse") return;
		pointer.x = (event.clientX / innerWidth) * 2 - 1;
		pointer.y = (event.clientY / innerHeight) * 2 - 1;
	};

	const onTilt = (event: DeviceOrientationEvent) => {
		if (event.gamma === null || event.beta === null) return;
		const angle = screen.orientation?.angle ?? 0;
		const [side, fore] =
			angle === 90
				? [event.beta, -event.gamma]
				: angle === 270
					? [-event.beta, event.gamma]
					: [event.gamma, event.beta];
		tilt.gamma = side;
		tilt.beta = fore;
		if (!tilt.on) {
			tilt.on = true;
			tilt.base = fore;
			if (hint) hint.textContent = "Tilt the phone. The horizon holds.";
		}
	};

	const Orientation =
		"DeviceOrientationEvent" in window ? (DeviceOrientationEvent as OrientationPermission) : null;
	if (coarse && Orientation?.requestPermission && ask) {
		ask.hidden = false;
		ask.addEventListener("click", async () => {
			const answer = await Orientation.requestPermission?.().catch(() => "denied" as const);
			if (answer === "granted") addEventListener("deviceorientation", onTilt);
			ask.hidden = true;
		});
	} else if (Orientation && coarse) {
		addEventListener("deviceorientation", onTilt);
	}

	steady.addEventListener("click", () => {
		calm = !calm;
		steady.setAttribute("aria-pressed", String(calm));
	});

	pivot();
	addEventListener("scroll", onScroll, { passive: true });
	addEventListener("resize", pivot);
	addEventListener("pointermove", onPointer, { passive: true });
	addEventListener("pagehide", loop.stop, { once: true });
};
