import { clamp, onFrame, reducedMotion } from "@/lab/lib/motion";

/** px, s. Water density is 1, so mass = density × area. */
const DX = 6;
const G = 1800;
const WAVE_C2 = 250 ** 2;
const ANCHOR = 5;
const WATER_DAMP = 1.5;
const SMOOTH = 0.08;
const DT = 1 / 120;
const MAX_STEPS = 5;
const NX = 6;
const NY = 5;
const DRAG = 3;
const COUPLE = 7;
const BOW = 0.9;
const FLANK = 6;
const MOOR = 7;
const RIGHTING = 9;
const GRAB = 140;
const GRAB_DAMP = 16;
const DRAG_THRESHOLD = 6;
const MAX_TILT = 26;
const MAX_DPR = 2;

interface Row {
	top: number;
	bottom: number;
	level: number;
	eta: Float32Array;
	vel: Float32Array;
	tmp: Float32Array;
	bodies: Body[];
}

interface Body {
	el: HTMLElement;
	row: Row;
	w: number;
	h: number;
	/** Centre of mass below the hull centre, px: what keeps a tall letter upright. */
	keel: number;
	density: number;
	mass: number;
	inertia: number;
	x: number;
	y: number;
	a: number;
	vx: number;
	vy: number;
	va: number;
	home: number;
	/** Seconds until it is let go above the water; `Infinity` while waiting off screen. */
	hold: number;
	grab: { lx: number; ly: number; px: number; py: number } | null;
}

/** Sideways gravity shared by every tank: device tilt plus a decaying kick from scrolling. */
const sway = { tilt: 0, scroll: 0 };

const num = (el: HTMLElement, key: string, fallback: number) => {
	const v = Number(el.dataset[key]);
	return Number.isFinite(v) && el.dataset[key] !== undefined ? v : fallback;
};

const surface = (row: Row, x: number) => {
	const f = clamp(x / DX, 0, row.eta.length - 1.001);
	const i = Math.floor(f);
	const t = f - i;
	const a = row.eta[i] ?? 0;
	const b = row.eta[i + 1] ?? a;
	return {
		i,
		y: row.level - (a + (b - a) * t),
		slope: -(b - a) / DX,
		vy: -((row.vel[i] ?? 0) * (1 - t) + (row.vel[i + 1] ?? 0) * t),
	};
};

const poke = (row: Row, x: number, strength: number, radius: number) => {
	const from = Math.max(0, Math.floor((x - radius * 3) / DX));
	const to = Math.min(row.vel.length - 1, Math.ceil((x + radius * 3) / DX));
	let sum = 0;
	for (let i = from; i <= to; i++) {
		const k = strength * Math.exp(-(((i * DX - x) / radius) ** 2));
		row.vel[i] = (row.vel[i] ?? 0) + k;
		sum += k;
	}
	// Water pushed down here comes up alongside.
	const share = sum / (2 * FLANK);
	for (let k = 1; k <= FLANK; k++) {
		for (const i of [from - k, to + k]) {
			if (i >= 0 && i < row.vel.length) row.vel[i] = (row.vel[i] ?? 0) - share;
		}
	}
};

const stepWater = (row: Row, width: number, slope: number, dt: number, swell: number) => {
	const { eta, vel, tmp } = row;
	const n = eta.length;
	const k = WAVE_C2 / (DX * DX);
	for (let i = 0; i < n; i++) {
		const e = eta[i] ?? 0;
		const l = eta[i > 0 ? i - 1 : 0] ?? 0;
		const r = eta[i < n - 1 ? i + 1 : n - 1] ?? 0;
		const rest = slope * (i * DX - width / 2);
		tmp[i] = k * (l + r - 2 * e) - ANCHOR * (e - rest) - WATER_DAMP * (vel[i] ?? 0);
	}
	for (let i = 0; i < n; i++) vel[i] = (vel[i] ?? 0) + (tmp[i] ?? 0) * dt;
	for (let i = 0; i < 4; i++) vel[i] = (vel[i] ?? 0) + swell * dt;
	for (let i = 0; i < n; i++) {
		const l = vel[i > 0 ? i - 1 : 0] ?? 0;
		const r = vel[i < n - 1 ? i + 1 : n - 1] ?? 0;
		tmp[i] = l + r - 2 * (vel[i] ?? 0);
	}
	for (let i = 0; i < n; i++) {
		vel[i] = (vel[i] ?? 0) + SMOOTH * (tmp[i] ?? 0);
		eta[i] = (eta[i] ?? 0) + (vel[i] ?? 0) * dt;
	}
};

const extent = (b: Body) => {
	const c = Math.abs(Math.cos(b.a));
	const s = Math.abs(Math.sin(b.a));
	return { x: (c * b.w + s * b.h) / 2, y: (s * b.w + c * b.h) / 2 };
};

const stepBody = (b: Body, width: number, gx: number, dt: number) => {
	const { row } = b;
	const cos = Math.cos(b.a);
	const sin = Math.sin(b.a);
	const cw = b.w / NX;
	const ch = b.h / NY;
	let fx = b.mass * gx - MOOR * b.mass * (b.x - b.home);
	let fy = b.mass * G;
	let torque = -b.inertia * (RIGHTING * Math.sin(b.a) + 1.6 * b.va);
	let wet = 0;
	let displaced = 0;
	const span = Math.max(1, Math.round(cw / DX / 2));

	for (let ix = 0; ix < NX; ix++) {
		for (let iy = 0; iy < NY; iy++) {
			const lx = (ix + 0.5) * cw - b.w / 2;
			const ly = (iy + 0.5) * ch - b.h / 2 - b.keel;
			const rx = lx * cos - ly * sin;
			const ry = lx * sin + ly * cos;
			const s = surface(row, b.x + rx);
			const sub = clamp((b.y + ry - s.y) / ch + 0.5);
			if (sub <= 0) continue;
			const area = cw * ch * sub;
			wet += area;
			const relX = b.vx - b.va * ry;
			const relY = b.vy + b.va * rx - s.vy;
			const px = G * area * s.slope * 0.6 - DRAG * area * relX;
			const py = -G * area - DRAG * area * relY;
			fx += px;
			fy += py;
			torque += rx * py - ry * px;
			// The hull carries the water under it along: it sinks, the surface dips, and rises at its sides.
			const push = (COUPLE * sub * relY * dt) / NY;
			for (let c = s.i - span; c <= s.i + span; c++) {
				if (c < 0 || c >= row.vel.length) continue;
				row.vel[c] = (row.vel[c] ?? 0) - push;
				displaced += push;
			}
		}
	}

	if (b.grab) {
		const rx = b.grab.lx * cos - b.grab.ly * sin;
		const ry = b.grab.lx * sin + b.grab.ly * cos;
		const px = b.mass * (GRAB * (b.grab.px - b.x - rx) - GRAB_DAMP * (b.vx - b.va * ry));
		const py = b.mass * (GRAB * (b.grab.py - b.y - ry) - GRAB_DAMP * (b.vy + b.va * rx));
		fx += px;
		fy += py;
		torque += (rx * py - ry * px) * 0.6;
	}

	const e = extent(b);
	const left = Math.floor((b.x - e.x) / DX);
	const right = Math.ceil((b.x + e.x) / DX);
	const bow = BOW * b.vx * (wet / (b.w * b.h)) * dt;
	for (let k = 1; k <= FLANK; k++) {
		const share = displaced / (2 * FLANK);
		if (left - k >= 0) row.vel[left - k] = (row.vel[left - k] ?? 0) + share - bow;
		if (right + k < row.vel.length) row.vel[right + k] = (row.vel[right + k] ?? 0) + share + bow;
	}

	b.vx += (fx / b.mass) * dt;
	b.vy += (fy / b.mass) * dt;
	b.va += (torque / b.inertia) * dt;
	b.x += b.vx * dt;
	b.y += b.vy * dt;
	b.a += b.va * dt;

	if (b.x - e.x < 0) {
		b.x = e.x;
		b.vx = Math.abs(b.vx) * 0.3;
	} else if (b.x + e.x > width) {
		b.x = width - e.x;
		b.vx = -Math.abs(b.vx) * 0.3;
	}
	if (b.y + e.y > row.bottom) {
		b.y = row.bottom - e.y;
		b.vy = -Math.abs(b.vy) * 0.2;
	}
};

const collide = (a: Body, b: Body) => {
	const ea = extent(a);
	const eb = extent(b);
	const dx = b.x - a.x;
	const dy = b.y - b.keel - (a.y - a.keel);
	const ox = ea.x + eb.x - Math.abs(dx);
	const oy = ea.y + eb.y - Math.abs(dy);
	if (ox <= 0 || oy <= 0) return;
	const total = a.mass + b.mass;
	const sideways = ox < oy;
	const dir = Math.sign(sideways ? dx : dy) || 1;
	const depth = (sideways ? ox : oy) * 0.5;
	const rel = sideways ? b.vx - a.vx : b.vy - a.vy;
	const impulse = rel * dir < 0 ? (-(1 + 0.25) * rel) / total : 0;
	if (sideways) {
		a.x -= (dir * depth * b.mass) / total;
		b.x += (dir * depth * a.mass) / total;
		a.vx -= impulse * b.mass;
		b.vx += impulse * a.mass;
		// A knock off-centre sets both rocking.
		a.va += (dir * impulse * b.mass) / (a.h * 3);
		b.va += (dir * impulse * a.mass) / (b.h * 3);
	} else {
		a.y -= (dir * depth * b.mass) / total;
		b.y += (dir * depth * a.mass) / total;
		a.vy -= impulse * b.mass;
		b.vy += impulse * a.mass;
	}
};

/** Fills rows left to right with whole units (a word, a card), as text wraps. */
const wrap = (
	items: { w: number; unit: string }[],
	width: number,
	gap: number,
	unitGap: number,
) => {
	const units: { from: number; to: number; w: number }[] = [];
	items.forEach((item, i) => {
		const last = units.at(-1);
		if (last && items[i - 1]?.unit === item.unit) {
			last.to = i + 1;
			last.w += gap + item.w;
		} else units.push({ from: i, to: i + 1, w: item.w });
	});
	const rows: { units: typeof units; w: number }[] = [];
	for (const unit of units) {
		const row = rows.at(-1);
		if (row && row.w + unitGap + unit.w <= width) {
			row.units.push(unit);
			row.w += unitGap + unit.w;
		} else rows.push({ units: [unit], w: unit.w });
	}
	return rows;
};

const mount = (tank: HTMLElement) => {
	const list = tank.querySelector<HTMLElement>("[data-bodies]");
	const canvas = tank.querySelector("canvas");
	const ctx = canvas?.getContext("2d");
	if (!list || !canvas || !ctx) return;
	const els = [...list.querySelectorAll<HTMLElement>("[data-body]")];
	const still = reducedMotion();
	const css = getComputedStyle(tank);
	const paint = (name: string) => css.getPropertyValue(`--buoy-${name}`).trim();
	const colours = {
		meniscus: paint("meniscus"),
		glint: paint("glint"),
		shallow: paint("shallow"),
		mid: paint("mid"),
		deep: paint("deep"),
	};

	let width = 0;
	let height = 0;
	let rows: Row[] = [];
	let bodies: Body[] = [];
	let released = still;
	let time = 0;

	const place = (b: Body) => {
		const cx = b.x + b.keel * Math.sin(b.a);
		const cy = b.y - b.keel * Math.cos(b.a);
		b.el.style.transform = `translate3d(${cx - b.w / 2}px,${cy - b.h / 2}px,0) rotate(${b.a}rad)`;
	};

	const step = (dt: number, lively: boolean) => {
		time += dt;
		const limit = (G * 16) / Math.max(width / 2, 1);
		const gx = clamp(sway.tilt + sway.scroll, -limit, limit);
		rows.forEach((row, r) => {
			stepWater(row, width, -gx / G, dt, lively ? 55 * Math.sin(time * 1.9 + r * 2.1) : 0);
			for (const b of row.bodies) {
				if (b.hold > 0) {
					if (released) b.hold -= dt;
					if (b.hold <= 0) b.el.style.opacity = "1";
					continue;
				}
				stepBody(b, width, gx, dt);
			}
			for (let i = 0; i < row.bodies.length; i++) {
				for (let j = i + 1; j < row.bodies.length; j++) {
					const a = row.bodies[i];
					const b = row.bodies[j];
					if (a && b && a.hold <= 0 && b.hold <= 0) collide(a, b);
				}
			}
		});
	};

	const draw = () => {
		ctx.clearRect(0, 0, width, height);
		for (const row of rows) {
			const trace = (lift: number) => {
				ctx.beginPath();
				for (let i = 0; i < row.eta.length; i++) {
					const y = row.level - (row.eta[i] ?? 0) + lift;
					if (i === 0) ctx.moveTo(0, y);
					else ctx.lineTo(i * DX, y);
				}
			};
			const fill = ctx.createLinearGradient(0, row.level - 12, 0, row.bottom);
			fill.addColorStop(0, colours.shallow);
			fill.addColorStop(0.35, colours.mid);
			fill.addColorStop(1, colours.deep);
			trace(0);
			ctx.lineTo(width, row.bottom);
			ctx.lineTo(0, row.bottom);
			ctx.closePath();
			ctx.fillStyle = fill;
			ctx.fill();
			trace(3.5);
			ctx.strokeStyle = colours.glint;
			ctx.lineWidth = 4;
			ctx.stroke();
			trace(0);
			ctx.strokeStyle = colours.meniscus;
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
		for (const b of bodies) place(b);
	};

	const layout = () => {
		for (const el of els) el.removeAttribute("style");
		list.removeAttribute("style");
		width = tank.clientWidth;
		const sizes = els.map((el) => ({
			w: el.offsetWidth,
			h: el.offsetHeight,
			unit: el.dataset.unit ?? String(els.indexOf(el)),
		}));
		const tallest = Math.max(...sizes.map((s) => s.h), 1);
		const gap = num(tank, "gap", 0) * tallest;
		const unitGap = num(tank, "unitGap", 0.12) * tallest;
		const air = num(tank, "air", 1.15);
		const depth = num(tank, "depth", 0.8);
		const columns = Math.ceil(width / DX) + 1;

		bodies = [];
		rows = [];
		let top = 0;
		for (const line of wrap(sizes, width - 24, gap, unitGap)) {
			const items = line.units.flatMap((u) =>
				sizes.slice(u.from, u.to).map((s, k) => ({ s, i: u.from + k })),
			);
			const h = Math.max(...items.map(({ s }) => s.h));
			const row: Row = {
				top,
				level: top + h * air,
				bottom: top + h * (air + depth),
				eta: new Float32Array(columns),
				vel: new Float32Array(columns),
				tmp: new Float32Array(columns),
				bodies: [],
			};
			let x = (width - line.w) / 2;
			let unit = items[0]?.s.unit;
			for (const { s, i } of items) {
				const el = els[i];
				if (!el) continue;
				if (s.unit !== unit) x += unitGap - gap;
				unit = s.unit;
				const density = num(el, "density", 0.35);
				const keel = num(el, "keel", 0) * s.h;
				const mass = density * s.w * s.h;
				const rest = row.level - s.h / 2 + density * s.h + keel;
				const body: Body = {
					el,
					row,
					w: s.w,
					h: s.h,
					keel,
					density,
					mass,
					inertia: (mass * (s.w * s.w + s.h * s.h)) / 12 + mass * keel * keel,
					x: x + s.w / 2,
					y: released ? rest : row.level - s.h * 1.7 + keel,
					a: released ? 0 : (((i * 7919) % 13) / 13 - 0.5) * 0.5,
					vx: 0,
					vy: 0,
					va: 0,
					home: x + s.w / 2,
					hold: released ? 0 : 0.1 + i * 0.11,
					grab: null,
				};
				row.bodies.push(body);
				bodies.push(body);
				x += s.w + gap;
			}
			rows.push(row);
			top = row.bottom;
		}
		height = top;

		list.style.height = `${height}px`;
		for (const b of bodies) {
			Object.assign(b.el.style, {
				position: "absolute",
				left: "0",
				top: "0",
				width: `${b.w}px`,
				height: `${b.h}px`,
				margin: "0",
				opacity: b.hold > 0 ? "0" : "1",
			});
		}
		const dpr = Math.min(devicePixelRatio, MAX_DPR);
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (released) for (let i = 0; i < 360; i++) step(DT, false);
		tank.setAttribute("data-live", "");
		draw();
	};

	layout();
	const loop = onFrame(tank, (_, dt) => {
		const steps = Math.min(MAX_STEPS, Math.max(1, Math.round(dt / DT)));
		for (let i = 0; i < steps; i++) step(DT, true);
		draw();
	});

	new ResizeObserver(() => {
		if (tank.clientWidth === width) return;
		released = true;
		layout();
		loop.redraw();
	}).observe(tank);

	if (!still) {
		const seen = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				released = true;
				seen.disconnect();
			},
			{ threshold: 0.3 },
		);
		seen.observe(tank);
	}
	if (still) return;

	const local = (e: PointerEvent) => {
		const r = list.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};
	const rowAt = (y: number) => rows.find((row) => y < row.bottom) ?? rows.at(-1);

	let held: { body: Body; id: number; sx: number; sy: number; moved: boolean } | null = null;
	let last: { x: number; y: number; t: number } | null = null;

	tank.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		const p = local(e);
		const el = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-body]") : null;
		const body = bodies.find((b) => b.el === el && b.hold <= 0);
		if (!body) {
			const row = rowAt(p.y);
			if (row) poke(row, p.x, -520, 22);
			return;
		}
		const dx = p.x - body.x;
		const dy = p.y - body.y;
		const cos = Math.cos(body.a);
		const sin = Math.sin(body.a);
		body.grab = { lx: dx * cos + dy * sin, ly: -dx * sin + dy * cos, px: p.x, py: p.y };
		held = { body, id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false };
		body.el.setAttribute("data-held", "");
	});

	addEventListener(
		"pointermove",
		(e) => {
			const p = local(e);
			if (held?.id === e.pointerId && held.body.grab) {
				held.moved ||= Math.hypot(e.clientX - held.sx, e.clientY - held.sy) > DRAG_THRESHOLD;
				const { row, h } = held.body;
				held.body.grab.px = clamp(p.x, 0, width);
				held.body.grab.py = clamp(p.y, row.top - h, row.bottom);
				return;
			}
			// A cursor crossing the surface drags a little water with it.
			if (e.pointerType !== "mouse" || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
				last = null;
				return;
			}
			const now = performance.now();
			const row = rowAt(p.y);
			if (row && last && now - last.t < 80) {
				const s = surface(row, p.x);
				if ((last.y - s.y) * (p.y - s.y) <= 0 || Math.abs(p.y - s.y) < 10) {
					const vy = ((p.y - last.y) / Math.max(now - last.t, 1)) * 1000;
					const vx = ((p.x - last.x) / Math.max(now - last.t, 1)) * 1000;
					poke(row, p.x, clamp(-vy * 0.25 - Math.abs(vx) * 0.04, -260, 260), 14);
				}
			}
			last = { x: p.x, y: p.y, t: now };
		},
		{ passive: true },
	);

	const release = (e: PointerEvent) => {
		if (held?.id !== e.pointerId) return;
		const { body, moved } = held;
		body.grab = null;
		body.el.removeAttribute("data-held");
		held = null;
		if (!moved) return;
		// The click that follows a drag is not a click.
		const swallow = (click: Event) => {
			click.preventDefault();
			click.stopPropagation();
		};
		body.el.addEventListener("click", swallow, { capture: true, once: true });
		setTimeout(() => body.el.removeEventListener("click", swallow, { capture: true }), 0);
	};
	addEventListener("pointerup", release);
	addEventListener("pointercancel", release);
	tank.addEventListener("dragstart", (e) => e.preventDefault());
};

export const mountTanks = () => {
	const tanks = [...document.querySelectorAll<HTMLElement>("[data-tank]")];
	if (!tanks.length) return;
	document.fonts.ready.then(() => {
		for (const tank of tanks) mount(tank);
	});
	if (reducedMotion()) return;

	let y = scrollY;
	let then = performance.now();
	addEventListener(
		"scroll",
		() => {
			const now = performance.now();
			const v = ((scrollY - y) / Math.max(now - then, 8)) * 1000;
			y = scrollY;
			then = now;
			sway.scroll = clamp(sway.scroll + v * 0.004, -70, 70);
		},
		{ passive: true },
	);
	const decay = () => {
		sway.scroll *= 0.9;
		requestAnimationFrame(decay);
	};
	requestAnimationFrame(decay);

	const onTilt = (e: DeviceOrientationEvent) => {
		const side = screen.orientation?.angle === 90 ? (e.beta ?? 0) : (e.gamma ?? 0);
		sway.tilt = G * 0.5 * Math.sin((clamp(side, -MAX_TILT, MAX_TILT) * Math.PI) / 180);
	};
	type Permissioned = typeof DeviceOrientationEvent & {
		requestPermission?: () => Promise<PermissionState>;
	};
	const Orientation: Permissioned = DeviceOrientationEvent;
	const button = document.querySelector<HTMLButtonElement>("[data-tilt]");
	if (!Orientation.requestPermission) {
		addEventListener("deviceorientation", onTilt);
		return;
	}
	if (!button || !matchMedia("(pointer: coarse)").matches) return;
	button.hidden = false;
	button.addEventListener("click", async () => {
		const answer = await Orientation.requestPermission?.().catch(() => "denied" as const);
		if (answer === "granted") addEventListener("deviceorientation", onTilt);
		button.hidden = true;
	});
};
