import { damp, reducedMotion } from "@/lab/lib/motion";

/**
 * Shared by every lamp layer: tracks the pointer or finger and writes `--lamp-x`, `--lamp-y` (px) and
 * `--lamp` (0–1, lit only over `[data-lamp]` ground) on the root. Reference-counted.
 */
let users = 0;
let stop: (() => void) | undefined;

const start = () => {
	const root = document.documentElement;
	const follow = reducedMotion() ? 1000 : 9;
	let target = { x: innerWidth / 2, y: innerHeight / 2 };
	let at = { ...target };
	let present = false;
	let level = 0;
	let frame = 0;
	let last = 0;

	const tick = (ms: number) => {
		frame = 0;
		const dt = Math.min((ms - last) / 1000, 0.1);
		last = ms;
		const under = present ? document.elementFromPoint(target.x, target.y) : null;
		const goal = under?.closest("[data-lamp]") ? 1 : 0;
		at = { x: damp(at.x, target.x, follow, dt), y: damp(at.y, target.y, follow, dt) };
		level = damp(level, goal, 4, dt);
		root.style.setProperty("--lamp-x", `${at.x.toFixed(1)}px`);
		root.style.setProperty("--lamp-y", `${at.y.toFixed(1)}px`);
		root.style.setProperty("--lamp", level.toFixed(3));
		const settled =
			Math.abs(level - goal) < 0.005 && Math.hypot(at.x - target.x, at.y - target.y) < 0.5;
		if (!settled) queue();
	};
	const queue = () => {
		if (frame) return;
		last = performance.now();
		frame = requestAnimationFrame(tick);
	};

	const to = (x: number, y: number) => {
		target = { x, y };
		if (!present) at = { x, y };
		present = true;
		queue();
	};
	const away = () => {
		present = false;
		queue();
	};
	const onPointer = (e: PointerEvent) => e.pointerType === "mouse" && to(e.clientX, e.clientY);
	const onTouch = (e: TouchEvent) => {
		const touch = e.touches[0];
		if (touch) to(touch.clientX, touch.clientY);
	};

	addEventListener("pointermove", onPointer, { passive: true });
	addEventListener("touchstart", onTouch, { passive: true });
	addEventListener("touchmove", onTouch, { passive: true });
	addEventListener("touchend", away, { passive: true });
	addEventListener("scroll", queue, { passive: true });
	document.addEventListener("pointerleave", away);

	return () => {
		cancelAnimationFrame(frame);
		removeEventListener("pointermove", onPointer);
		removeEventListener("touchstart", onTouch);
		removeEventListener("touchmove", onTouch);
		removeEventListener("touchend", away);
		removeEventListener("scroll", queue);
		document.removeEventListener("pointerleave", away);
		for (const name of ["--lamp-x", "--lamp-y", "--lamp"]) root.style.removeProperty(name);
	};
};

export const startLamp = () => {
	if (users++ === 0) stop = start();
	return () => {
		if (--users === 0) stop?.();
	};
};
