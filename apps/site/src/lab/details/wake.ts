import { reducedMotion } from "@/lab/lib/motion";

interface Point {
	/** Page coordinates, so the trail stays put when the page scrolls under a finger. */
	x: number;
	y: number;
	/** Unit normal to the direction of travel. */
	nx: number;
	ny: number;
	speed: number;
	born: number;
	/** Starts a new stroke: not joined to the point before. */
	head: boolean;
}

interface Ring {
	x: number;
	y: number;
	born: number;
}

const LIFE = 1.7;
const RING_LIFE = 1.4;
const SPREAD = 34;
const MIN_STEP = 6;
const MAX_DPR = 2;

/** A faint V-shaped wake behind the pointer or finger, on a transparent fixed canvas. Returns a stop function. */
export const startWake = (canvas: HTMLCanvasElement) => {
	const ctx = canvas.getContext("2d");
	if (!ctx || reducedMotion()) return undefined;

	const tint = getComputedStyle(canvas).color;
	let points: Point[] = [];
	let rings: Ring[] = [];
	let last: { x: number; y: number } | null = null;
	let frame = 0;

	const size = () => {
		const dpr = Math.min(devicePixelRatio, MAX_DPR);
		canvas.width = Math.round(innerWidth * dpr);
		canvas.height = Math.round(innerHeight * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	};

	const draw = (ms: number) => {
		frame = 0;
		const now = ms / 1000;
		points = points.filter((p) => now - p.born < LIFE);
		rings = rings.filter((r) => now - r.born < RING_LIFE);
		ctx.clearRect(0, 0, innerWidth, innerHeight);
		ctx.strokeStyle = tint;
		ctx.lineCap = "round";

		// Each arm is the trail pushed out along its normals, drawn as curves through the midpoints so it never kinks.
		const arm = (p: Point, side: number) => {
			const out = side * SPREAD * Math.sqrt(now - p.born);
			return { x: p.x + p.nx * out, y: p.y - scrollY + p.ny * out };
		};
		for (const side of [-1, 1]) {
			for (let i = 2; i < points.length; i++) {
				const [p0, p1, p2] = [points[i - 2], points[i - 1], points[i]];
				if (!p0 || !p1 || !p2 || p1.head || p2.head) continue;
				const [a, b, c] = [arm(p0, side), arm(p1, side), arm(p2, side)];
				const age = now - p1.born;
				ctx.globalAlpha = 0.34 * (1 - age / LIFE) ** 2 * Math.min(1, p1.speed / 12);
				ctx.lineWidth = 0.75 + age * 1.25;
				ctx.beginPath();
				ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
				ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
				ctx.stroke();
			}
		}

		for (const ring of rings) {
			const t = (now - ring.born) / RING_LIFE;
			for (const [delay, strength] of [
				[0, 0.4],
				[0.22, 0.22],
			] as const) {
				const u = (t - delay) / (1 - delay);
				if (u <= 0) continue;
				ctx.globalAlpha = strength * (1 - u) ** 2;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(ring.x, ring.y - scrollY, 6 + 46 * Math.sqrt(u), 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		if (points.length || rings.length) frame = requestAnimationFrame(draw);
	};
	const wake = () => {
		frame ||= requestAnimationFrame(draw);
	};

	const move = (x: number, y: number) => {
		const px = x;
		const py = y + scrollY;
		if (!last) {
			last = { x: px, y: py };
			return;
		}
		const dx = px - last.x;
		const dy = py - last.y;
		const step = Math.hypot(dx, dy);
		if (step < MIN_STEP) return;
		const tail = points.at(-1);
		const head = !tail || step > 160;
		// Ease the heading toward the new direction, so a jittery hand still leaves clean arms.
		let nx = -dy / step;
		let ny = dx / step;
		if (tail && !head) {
			const mx = tail.nx * 0.55 + nx * 0.45;
			const my = tail.ny * 0.55 + ny * 0.45;
			const m = Math.hypot(mx, my) || 1;
			nx = mx / m;
			ny = my / m;
		}
		points.push({ x: px, y: py, nx, ny, speed: step, born: performance.now() / 1000, head });
		last = { x: px, y: py };
		wake();
	};
	const lift = () => {
		last = null;
		const tail = points.at(-1);
		if (tail) points.push({ ...tail, head: true });
	};
	const drop = (x: number, y: number) => {
		rings.push({ x, y: y + scrollY, born: performance.now() / 1000 });
		wake();
	};

	const onPointerMove = (e: PointerEvent) =>
		e.pointerType === "mouse" && move(e.clientX, e.clientY);
	const onPointerDown = (e: PointerEvent) => drop(e.clientX, e.clientY);
	const onTouchMove = (e: TouchEvent) => {
		const touch = e.touches[0];
		if (touch) move(touch.clientX, touch.clientY);
	};

	size();
	addEventListener("resize", size);
	addEventListener("pointermove", onPointerMove, { passive: true });
	addEventListener("pointerdown", onPointerDown, { passive: true });
	addEventListener("touchmove", onTouchMove, { passive: true });
	addEventListener("touchend", lift, { passive: true });
	document.addEventListener("pointerleave", lift);

	return () => {
		cancelAnimationFrame(frame);
		ctx.clearRect(0, 0, innerWidth, innerHeight);
		removeEventListener("resize", size);
		removeEventListener("pointermove", onPointerMove);
		removeEventListener("pointerdown", onPointerDown);
		removeEventListener("touchmove", onTouchMove);
		removeEventListener("touchend", lift);
		document.removeEventListener("pointerleave", lift);
	};
};
