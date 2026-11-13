import { clamp, onFrame, reducedMotion } from "@/lab/lib/motion";
import { createSonarAudio } from "./audio";

/** Wavefront speed, px/s. Slow enough to watch it travel. */
const SPEED = 640;
/** The return trails the ping: content resolves when the echo is back, later the farther it is. */
const RETURN = 0.68;
/** Soft edge of the reveal, px. */
const EDGE = 110;
/** Where a found element settles: dim, still readable. */
const GHOST = 0.64;
const UNSEEN = 0.04;
const DECAY = 0.32;
const BLIP_RATE = 1.5;
const RING_GAP = 140;
const MAX_DPR = 1.5;

interface Word {
	text: string;
	x: number;
	y: number;
}

interface Target {
	el: HTMLElement;
	glyphs: boolean;
	x: number;
	y: number;
	w: number;
	h: number;
	level: number;
	found: boolean;
	maskedBy: Ping | null;
	words: Word[] | null;
	font: string;
	spacing: string;
}

interface Ping {
	x: number;
	y: number;
	t0: number;
	range: number;
	blipped: Set<Target>;
	done: Set<Target>;
	radius: number;
}

interface Blip {
	target: Target;
	ping: Ping;
	t: number;
	fresh: boolean;
}

const seconds = () => performance.now() / 1000;

const span = (ping: Ping, t: Target) => {
	const nx = clamp(ping.x, t.x, t.x + t.w) - ping.x;
	const ny = clamp(ping.y, t.y, t.y + t.h) - ping.y;
	const fx = Math.max(Math.abs(ping.x - t.x), Math.abs(ping.x - t.x - t.w));
	const fy = Math.max(Math.abs(ping.y - t.y), Math.abs(ping.y - t.y - t.h));
	return { near: Math.hypot(nx, ny), far: Math.hypot(fx, fy) };
};

export const startEcho = (root: HTMLElement) => {
	const canvas = root.querySelector<HTMLCanvasElement>("[data-echo-canvas]");
	const ctx = canvas?.getContext("2d");
	const targets: Target[] = [...root.querySelectorAll<HTMLElement>("[data-echo]")].map((el) => ({
		el,
		glyphs: el.dataset.echo === "glyphs",
		x: 0,
		y: 0,
		w: 0,
		h: 0,
		level: UNSEEN,
		found: false,
		maskedBy: null,
		words: null,
		font: "",
		spacing: "0px",
	}));

	const show = (t: Target) => {
		t.el.style.opacity = t.level.toFixed(3);
		t.el.style.setProperty("--fresh", clamp((t.level - GHOST) / (1 - GHOST)).toFixed(3));
	};
	const unmask = (t: Target) => {
		if (!t.maskedBy) return;
		t.maskedBy = null;
		t.el.style.removeProperty("mask-image");
		t.el.style.removeProperty("-webkit-mask-image");
	};
	const reveal = (t: Target) => {
		unmask(t);
		t.level = 1;
		t.found = true;
		show(t);
	};

	if (!canvas || !ctx || reducedMotion()) {
		for (const t of targets) reveal(t);
		for (const el of root.querySelectorAll("[data-echo-live]")) el.remove();
		return;
	}

	const phosphor = getComputedStyle(root).getPropertyValue("--echo-phosphor").trim() || "#7ee2ec";
	const count = root.querySelector<HTMLElement>("[data-echo-count]");
	const readout = root.querySelector<HTMLElement>("[data-echo-readout]");
	const soundButton = root.querySelector<HTMLButtonElement>("[data-echo-sound]");
	const audio = createSonarAudio();
	const pings: Ping[] = [];
	const blips: Blip[] = [];
	let origin: Ping | null = null;
	let lastPing = -Infinity;
	let lastScroll = -Infinity;
	let pointer: { x: number; y: number; t: number } | null = null;
	let dpr = 1;

	const measure = () => {
		for (const t of targets) {
			const r = t.el.getBoundingClientRect();
			Object.assign(t, {
				x: r.left + scrollX,
				y: r.top + scrollY,
				w: r.width,
				h: r.height,
				words: null,
			});
		}
	};

	const resize = () => {
		dpr = Math.min(devicePixelRatio, MAX_DPR);
		canvas.width = Math.round(innerWidth * dpr);
		canvas.height = Math.round(innerHeight * dpr);
		measure();
	};

	/** Each word's position, so headings can be traced as letter outlines. */
	const words = (t: Target) => {
		if (t.words) return t.words;
		const style = getComputedStyle(t.el);
		t.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
		t.spacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
		ctx.font = t.font;
		const m = ctx.measureText("H");
		const upper = style.textTransform === "uppercase";
		const found: Word[] = [];
		const walker = document.createTreeWalker(t.el, NodeFilter.SHOW_TEXT);
		const range = document.createRange();
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			for (const match of (node.textContent ?? "").matchAll(/\S+/g)) {
				range.setStart(node, match.index);
				range.setEnd(node, match.index + match[0].length);
				const r = range.getClientRects()[0];
				if (!r) continue;
				const slack = r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent);
				found.push({
					text: upper ? match[0].toUpperCase() : match[0],
					x: r.left + scrollX,
					y: r.top + scrollY + slack / 2 + m.fontBoundingBoxAscent,
				});
			}
		}
		t.words = found;
		return found;
	};

	const ping = (x: number, y: number) => {
		const now = seconds();
		const corners = [0, innerWidth].flatMap((cx) =>
			[scrollY, scrollY + innerHeight].map((cy) => Math.hypot(cx - x, cy - y)),
		);
		origin = {
			x,
			y,
			t0: now,
			range: Math.max(...corners) * 1.1,
			blipped: new Set(),
			done: new Set(),
			radius: 0,
		};
		pings.push(origin);
		lastPing = now;
		audio.ping();
		loop.redraw();
	};

	const report = (p: Ping, t: Target, distance: number) => {
		if (count) {
			const found = targets.filter((x) => x.found || x.maskedBy).length + 1;
			count.textContent = `${String(Math.min(found, targets.length)).padStart(2, "0")}/${targets.length}`;
		}
		if (readout) {
			const bearing = (Math.atan2(t.x + t.w / 2 - p.x, p.y - t.y - t.h / 2) * 180) / Math.PI;
			readout.textContent = `${Math.round(distance)} m · ${String(Math.round((bearing + 360) % 360)).padStart(3, "0")}°`;
		}
		audio.contact((distance / SPEED) * (1 / RETURN - 1));
	};

	const step = (now: number, dt: number) => {
		for (let i = pings.length - 1; i >= 0; i--) {
			const p = pings[i];
			if (!p) continue;
			p.radius = (now - p.t0) * SPEED;
			const back = p.radius * RETURN;
			let pending = false;
			for (const t of targets) {
				if (p.done.has(t)) continue;
				const { near, far } = span(p, t);
				if (near > p.range) continue;
				if (p.radius < near) {
					pending = true;
					continue;
				}
				if (!p.blipped.has(t)) {
					p.blipped.add(t);
					blips.push({ target: t, ping: p, t: now, fresh: !t.found });
					if (!t.found) report(p, t, near);
				}
				if (back >= far + EDGE) {
					p.done.add(t);
					if (t.maskedBy === p || !t.maskedBy) reveal(t);
				} else {
					pending = true;
					if (back > near) {
						const mask = `radial-gradient(circle at ${(p.x - t.x).toFixed(1)}px ${(p.y - t.y).toFixed(1)}px, rgb(0 0 0 / 1) ${Math.max(0, back - EDGE).toFixed(1)}px, rgb(0 0 0 / ${t.level.toFixed(3)}) ${back.toFixed(1)}px)`;
						t.maskedBy = p;
						t.el.style.opacity = "1";
						t.el.style.setProperty("mask-image", mask);
						t.el.style.setProperty("-webkit-mask-image", mask);
					}
				}
			}
			if (!pending && p.radius > p.range) pings.splice(i, 1);
		}

		for (const t of targets) {
			if (t.maskedBy || !t.found || t.level <= GHOST + 0.004) continue;
			t.level = GHOST + (t.level - GHOST) * Math.exp(-DECAY * dt);
			show(t);
		}
	};

	const arc = (x: number, y: number, r: number) => {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
	};

	const contour = (t: Target, alpha: number) => {
		if (t.glyphs) {
			const list = words(t);
			ctx.font = t.font;
			ctx.letterSpacing = t.spacing;
			ctx.lineWidth = 0.9;
			ctx.globalAlpha = alpha;
			for (const w of list) ctx.strokeText(w.text, w.x, w.y);
			return;
		}
		const pad = 6;
		const [x, y, w, h] = [t.x - pad, t.y - pad, t.w + pad * 2, t.h + pad * 2];
		const tick = Math.min(14, w / 4, h / 4);
		ctx.lineWidth = 1;
		ctx.globalAlpha = alpha * 0.22;
		ctx.strokeRect(x, y, w, h);
		ctx.globalAlpha = alpha;
		ctx.lineWidth = 1.25;
		ctx.beginPath();
		for (const [cx, sx] of [
			[x, 1],
			[x + w, -1],
		] as const) {
			for (const [cy, sy] of [
				[y, 1],
				[y + h, -1],
			] as const) {
				ctx.moveTo(cx + sx * tick, cy);
				ctx.lineTo(cx, cy);
				ctx.lineTo(cx, cy + sy * tick);
			}
		}
		ctx.stroke();
	};

	const draw = (now: number) => {
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.setTransform(dpr, 0, 0, dpr, 0, -scrollY * dpr);
		ctx.strokeStyle = phosphor;
		ctx.textBaseline = "alphabetic";

		if (origin) {
			const fade = clamp(1 - (now - origin.t0) / 9);
			const { x, y, range } = origin;
			ctx.lineWidth = 1;
			ctx.globalAlpha = 0.07 * fade;
			for (let r = RING_GAP; r < range; r += RING_GAP) {
				arc(x, y, r);
				ctx.stroke();
			}
			ctx.globalAlpha = 0.22 * fade;
			ctx.beginPath();
			for (let deg = 0; deg < 360; deg += 10) {
				const a = (deg * Math.PI) / 180;
				const r = RING_GAP * 2;
				const len = deg % 30 === 0 ? 9 : 4;
				ctx.moveTo(x + Math.sin(a) * r, y - Math.cos(a) * r);
				ctx.lineTo(x + Math.sin(a) * (r + len), y - Math.cos(a) * (r + len));
			}
			ctx.moveTo(x - 7, y);
			ctx.lineTo(x + 7, y);
			ctx.moveTo(x, y - 7);
			ctx.lineTo(x, y + 7);
			ctx.stroke();
		}

		for (const p of pings) {
			const a = clamp(1 - p.radius / (p.range * 1.05)) ** 1.3;
			if (a <= 0) continue;
			for (let i = 0; i < 9; i++) {
				const r = p.radius - i * 8;
				if (r <= 0) break;
				ctx.globalAlpha = a * (i === 0 ? 0.9 : 0.34 * (1 - i / 9) ** 2);
				ctx.lineWidth = i === 0 ? 1.5 : 7;
				arc(p.x, p.y, r);
				ctx.stroke();
			}
		}

		for (let i = blips.length - 1; i >= 0; i--) {
			const b = blips[i];
			if (!b) continue;
			const alpha = Math.exp(-(now - b.t) * BLIP_RATE);
			if (alpha < 0.02) {
				blips.splice(i, 1);
				continue;
			}
			ctx.save();
			if (pings.includes(b.ping)) {
				arc(b.ping.x, b.ping.y, b.ping.radius);
				ctx.clip();
			}
			contour(b.target, alpha * (b.fresh ? 1 : 0.5));
			ctx.restore();
		}
		ctx.globalAlpha = 1;
	};

	/** Keeps the page usable without a single tap: sound again wherever something in view is still dark. */
	const auto = (now: number) => {
		if (pings.length > 0 || now - lastScroll < 0.3) return;
		const top = scrollY;
		const dark = targets.some((t) => !t.found && t.y < top + innerHeight * 0.92 && t.y + t.h > top);
		if (!(dark && now - lastPing > 1.4) && now - lastPing < 11) return;
		const held = pointer && now - pointer.t < 4 ? pointer : null;
		ping(held?.x ?? innerWidth / 2, (held?.y ?? innerHeight * 0.5) + scrollY);
	};

	const loop = onFrame(canvas, (_, dt) => {
		const now = seconds();
		step(now, dt);
		draw(now);
		auto(now);
	});

	const isControl = (target: EventTarget | null) =>
		target instanceof Element && target.closest("[data-echo-ui]") !== null;
	let touch: { x: number; y: number; t: number } | null = null;

	addEventListener("pointerdown", (e) => {
		if (isControl(e.target)) return;
		if (e.pointerType === "mouse") {
			if (e.button === 0) ping(e.clientX, e.clientY + scrollY);
		} else touch = { x: e.clientX, y: e.clientY, t: seconds() };
	});
	addEventListener("pointerup", (e) => {
		if (!touch || e.pointerType === "mouse") return;
		const tap =
			Math.hypot(e.clientX - touch.x, e.clientY - touch.y) < 10 && seconds() - touch.t < 0.4;
		touch = null;
		if (tap) ping(e.clientX, e.clientY + scrollY);
	});
	addEventListener(
		"pointermove",
		(e) => {
			if (e.pointerType === "mouse") pointer = { x: e.clientX, y: e.clientY, t: seconds() };
		},
		{ passive: true },
	);
	addEventListener("keydown", (e) => {
		if (e.code !== "Space" || e.target !== document.body) return;
		ping(innerWidth / 2, innerHeight / 2 + scrollY);
	});
	addEventListener(
		"scroll",
		() => {
			lastScroll = seconds();
		},
		{ passive: true },
	);
	addEventListener("resize", resize);
	new ResizeObserver(measure).observe(root);
	document.fonts.ready.then(measure);

	for (const t of targets) {
		t.el.addEventListener("focusin", () => reveal(t));
		t.el.addEventListener("pointerenter", (e) => {
			if (e.pointerType === "mouse" && t.found && !t.maskedBy) reveal(t);
		});
	}

	soundButton?.addEventListener("click", async () => {
		const on = await audio.toggle();
		soundButton.setAttribute("aria-pressed", String(on));
		soundButton.textContent = on ? "Sound on" : "Sound off";
		if (on) audio.ping();
	});
	addEventListener("pagehide", () => {
		loop.stop();
		audio.close();
	});

	resize();
	lastPing = seconds() - 0.5;
};
