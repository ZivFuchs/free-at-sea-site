import { clamp, reducedMotion } from "@/lab/lib/motion";

interface Print {
	el: HTMLElement;
	x: number;
	y: number;
	vx: number;
	vy: number;
}

const SLOP = 6;
const FRICTION = 3.2;
/** How far past the pile's edges a print may be pushed, in px. */
const OVERHANG = 40;

/** Makes every `[data-print]` in `area` draggable, gliding to rest when let go. Returns a stop function. */
export const startFlotsam = (area: HTMLElement) => {
	const glide = !reducedMotion();
	const prints: Print[] = [...area.querySelectorAll<HTMLElement>("[data-print]")].map((el) => ({
		el,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
	}));
	let top = prints.length;
	let frame = 0;
	let last = 0;

	const place = (p: Print) => {
		p.el.style.setProperty("--dx", `${p.x.toFixed(1)}px`);
		p.el.style.setProperty("--dy", `${p.y.toFixed(1)}px`);
		p.el.style.setProperty("--swing", `${clamp(p.vx / 260, -4, 4).toFixed(2)}deg`);
	};

	/** Keeps a print's resting box within the pile, give or take the overhang. */
	const bound = (p: Print) => {
		const a = area.getBoundingClientRect();
		const r = p.el.getBoundingClientRect();
		const over = (lo: number, hi: number) => (lo < 0 ? -lo : hi > 0 ? -hi : 0);
		const fx = over(r.left - a.left + OVERHANG, r.right - a.right - OVERHANG);
		const fy = over(r.top - a.top + OVERHANG, r.bottom - a.bottom - OVERHANG);
		if (fx) {
			p.x += fx;
			p.vx = 0;
		}
		if (fy) {
			p.y += fy;
			p.vy = 0;
		}
	};

	const tick = (ms: number) => {
		frame = 0;
		const dt = Math.min((ms - last) / 1000, 0.05);
		last = ms;
		let moving = false;
		for (const p of prints) {
			if (p.el.hasAttribute("data-held") || (!p.vx && !p.vy)) continue;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			const slow = Math.exp(-FRICTION * dt);
			p.vx *= slow;
			p.vy *= slow;
			bound(p);
			if (Math.hypot(p.vx, p.vy) < 4) p.vx = p.vy = 0;
			else moving = true;
			place(p);
		}
		if (moving) frame = requestAnimationFrame(tick);
	};
	const run = () => {
		if (frame) return;
		last = performance.now();
		frame = requestAnimationFrame(tick);
	};

	const stops = prints.map((p) => {
		let from: { px: number; py: number; x: number; y: number } | null = null;
		let dragged = false;
		let lastMove = { t: 0, x: 0, y: 0 };

		const raise = () => {
			p.el.style.zIndex = String(++top);
		};
		const down = (e: PointerEvent) => {
			if (e.button !== 0) return;
			from = { px: e.clientX, py: e.clientY, x: p.x, y: p.y };
			dragged = false;
			p.vx = p.vy = 0;
			lastMove = { t: e.timeStamp, x: e.clientX, y: e.clientY };
		};
		const move = (e: PointerEvent) => {
			if (!from) return;
			const dx = e.clientX - from.px;
			const dy = e.clientY - from.py;
			if (!dragged) {
				if (Math.hypot(dx, dy) < SLOP) return;
				dragged = true;
				p.el.setPointerCapture(e.pointerId);
				p.el.setAttribute("data-held", "");
				raise();
			}
			const dt = Math.max((e.timeStamp - lastMove.t) / 1000, 0.001);
			p.vx = p.vx * 0.5 + ((e.clientX - lastMove.x) / dt) * 0.5;
			p.vy = p.vy * 0.5 + ((e.clientY - lastMove.y) / dt) * 0.5;
			lastMove = { t: e.timeStamp, x: e.clientX, y: e.clientY };
			p.x = from.x + dx;
			p.y = from.y + dy;
			place(p);
		};
		const up = (e: PointerEvent) => {
			if (!from) return;
			from = null;
			p.el.removeAttribute("data-held");
			if (!dragged) return;
			// A pause before letting go means it was set down, not thrown.
			if (!glide || e.timeStamp - lastMove.t > 90) p.vx = p.vy = 0;
			bound(p);
			place(p);
			run();
		};
		const click = (e: MouseEvent) => {
			if (!dragged) return;
			e.preventDefault();
			dragged = false;
		};
		const noGhost = (e: DragEvent) => e.preventDefault();

		p.el.addEventListener("pointerdown", down);
		p.el.addEventListener("pointermove", move);
		p.el.addEventListener("pointerup", up);
		p.el.addEventListener("pointercancel", up);
		p.el.addEventListener("click", click, true);
		p.el.addEventListener("dragstart", noGhost);
		p.el.addEventListener("focusin", raise);
		return () => {
			p.el.removeEventListener("pointerdown", down);
			p.el.removeEventListener("pointermove", move);
			p.el.removeEventListener("pointerup", up);
			p.el.removeEventListener("pointercancel", up);
			p.el.removeEventListener("click", click, true);
			p.el.removeEventListener("dragstart", noGhost);
			p.el.removeEventListener("focusin", raise);
			for (const name of ["--dx", "--dy", "--swing", "z-index"]) p.el.style.removeProperty(name);
			p.el.removeAttribute("data-held");
		};
	});

	return () => {
		cancelAnimationFrame(frame);
		for (const stop of stops) stop();
	};
};
