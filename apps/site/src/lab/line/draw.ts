import { clamp, lerp, onFrame, pageProgress, reducedMotion, smoothstep } from "@/lab/lib/motion";
import { barge, circle, crossing, fall, horizon, skyline, waves } from "./motifs";
import { type Point, type Run, toPath } from "./pen";

const DESKTOP = 768;
const STEP = 6;
/** How far down the viewport the pen is allowed to have drawn. */
const REACH = 0.74;

const root = document.querySelector<HTMLElement>("[data-line-root]");
const svg = root?.querySelector<SVGSVGElement>("[data-line-svg]");
const path = svg?.querySelector<SVGPathElement>("[data-line-path]");
const tip = svg?.querySelector<SVGCircleElement>("[data-line-tip]");

if (root && svg && path && tip) {
	const still = reducedMotion();
	const ticks = [...svg.querySelectorAll<SVGGElement>("[data-line-tick]")];
	let runs: Run[] = [];
	let total = 0;
	/** Deepest y the pen has reached by each sample along the line. */
	let depth: number[] = [];
	let tickAt: number[] = [];
	let drawn = 0;

	const box = (el: Element) => {
		const r = el.getBoundingClientRect();
		const o = root.getBoundingClientRect();
		const left = r.left - o.left;
		const top = r.top - o.top;
		return {
			left,
			top,
			right: left + r.width,
			bottom: top + r.height,
			width: r.width,
			height: r.height,
		};
	};
	const anchor = (name: string) => {
		const el = root.querySelector(`[data-line="${name}"]`);
		return el ? box(el) : null;
	};

	const compose = () => {
		const W = root.clientWidth;
		const wide = W >= DESKTOP;
		const gl = wide ? Math.max(20, (W - Math.min(W, 1280)) / 2 + 16) : 12;
		const gr = W - gl;
		const h = anchor("horizon");
		const title = anchor("title");
		const b = anchor("barge");
		const w = anchor("waves");
		const s = anchor("skyline");
		const c = anchor("circle");
		const stops = [...root.querySelectorAll("[data-line-stop]")].map(box);
		if (!h || !b || !w || !s || !c) return null;

		/** Off a drawing's left end and down into the margin. */
		const leave = (x: number, y: number): Point[] =>
			x - gl > 80
				? [
						[x - 50, y + 3],
						[lerp(gl, x, 0.35), y + 18],
						[gl, y + 70],
					]
				: [[gl, y + 54]];
		const bs = b.width / 100;
		const by = b.bottom - 2 * bs;
		const ss = s.width / 100;
		const sy = s.bottom - ss;
		const out: Run[] = [
			...horizon(-20, gr - 30, h.top, title && wide ? title.right + 24 : gr - 30, 15),
			{ smooth: true, pts: [[gr, h.top + 46]] },
			fall(gr, h.top + 110, by - 60),
			...barge({ x: b.left, y: by, scale: bs }),
			{ smooth: true, pts: leave(b.left, by) },
			fall(gl, by + 120, w.bottom - 70),
			...waves(
				w.left,
				w.width,
				w.bottom,
				w.height * 0.9,
				Math.max(3, Math.round(w.width / (wide ? 170 : 100))),
			),
			{ smooth: true, pts: [[gr, w.bottom + 46]] },
			fall(gr, w.bottom + 110, sy - 60),
			...skyline({ x: s.left, y: sy, scale: ss, flip: true }),
			{ smooth: true, pts: leave(s.left, sy) },
		];

		const marks: Point[] = [];
		const lane = (i: number) => (wide ? W * (i % 2 ? 0.72 : 0.28) : i % 2 ? gr : gl);
		let last: Point = [gl, sy + 70];
		stops.forEach((stop, i) => {
			const x = lane(i);
			const top: Point = [x, stop.top + 8];
			out.push(
				i === 0
					? fall(gl, sy + 120, Math.max(sy + 130, stop.top - (wide ? 150 : 30)))
					: crossing(last, top),
			);
			out.push({
				smooth: true,
				pts: [top, [x + 3, (stop.top + stop.bottom) / 2], [x, stop.bottom - 8]],
			});
			marks.push([x + 3, (stop.top + stop.bottom) / 2]);
			last = [x, stop.bottom - 8];
		});

		const r = c.width / 2;
		const cx = c.left + r;
		const cy = c.top + r;
		const side = last[0] > cx ? 1 : -1;
		out.push(
			{ smooth: true, pts: [[last[0], lerp(last[1], cy - r, 0.55)]] },
			circle(cx, cy, r, side),
		);
		return { out, marks };
	};

	const build = () => {
		const made = compose();
		if (!made) return;
		runs = made.out;
		path.setAttribute("d", toPath(runs));
		total = path.getTotalLength();
		path.setAttribute("pathLength", String(total));
		path.style.strokeDasharray = `${total} ${total}`;

		const count = Math.ceil(total / STEP);
		depth = [];
		const pts: DOMPoint[] = [];
		let deepest = -Infinity;
		for (let i = 0; i <= count; i++) {
			const p = path.getPointAtLength(Math.min(i * STEP, total));
			pts.push(p);
			deepest = Math.max(deepest, p.y);
			depth.push(deepest);
		}
		tickAt = made.marks.map(([x, y], t) => {
			let best = 0;
			let dist = Infinity;
			pts.forEach((p, i) => {
				const d = (p.x - x) ** 2 + (p.y - y) ** 2;
				if (d < dist) [best, dist] = [i, d];
			});
			ticks[t]?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
			return best * STEP;
		});
		if (still) drawn = total;
		render();
		root.setAttribute("data-line-ready", "");
	};

	/** Length of line whose every point lies above `y`. */
	const lengthAbove = (y: number) => {
		let lo = 0;
		let hi = depth.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if ((depth[mid] ?? Infinity) <= y) lo = mid + 1;
			else hi = mid;
		}
		return Math.min(lo * STEP, total);
	};

	const render = () => {
		path.style.strokeDashoffset = String(total - drawn);
		for (const [i, tick] of ticks.entries()) {
			tick.toggleAttribute("data-on", drawn >= (tickAt[i] ?? Infinity));
		}
		const done = drawn >= total - 1 || drawn < 1;
		tip.toggleAttribute("data-on", !done && !still);
		if (!done) {
			const p = path.getPointAtLength(drawn);
			tip.setAttribute("cx", p.x.toFixed(1));
			tip.setAttribute("cy", p.y.toFixed(1));
		}
	};

	const loop = onFrame(
		svg,
		(time, dt) => {
			if (!total || still) return;
			path.setAttribute("d", toPath(runs, time));
			const reach = lerp(REACH, 1.05, smoothstep(0.9, 1, pageProgress()));
			const target = lengthAbove(scrollY + innerHeight * reach);
			const gap = target - drawn;
			drawn = clamp(
				drawn + Math.sign(gap) * Math.min(Math.abs(gap), Math.max(700, Math.abs(gap) * 2.2) * dt),
				0,
				total,
			);
			render();
		},
		{ fps: 30, margin: "0px" },
	);

	let queued = false;
	const rebuild = () => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			build();
			loop.redraw();
		});
	};
	new ResizeObserver(rebuild).observe(root);
	document.fonts.ready.then(rebuild);
	addEventListener("pagehide", loop.stop, { once: true });
}
