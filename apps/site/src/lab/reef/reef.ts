import { reducedMotion } from "@/lab/lib/motion";
import { brain } from "./grow/brain";
import { fan } from "./grow/fan";
import { polyp } from "./grow/polyp";
import { type Growth, mulberry, type Rng, type Site } from "./grow/types";

const KINDS = {
	fan: (site: Site) => fan(site),
	stag: (site: Site) => fan(site, true),
	brain,
	polyp,
} satisfies Record<string, (site: Site) => Growth>;
type Kind = keyof typeof KINDS;
const isKind = (value: string | undefined): value is Kind => !!value && value in KINDS;

/** Seconds for colour to return to a colony. */
const LIFE = 40;
const DPR = 1.5;
const PAD = 12;
const FRAME_BUDGET = 9;
const MAX_PLANTED = 8;
const INTERACTIVE = "a,button,input,textarea,select,label,summary,dialog,[data-reef-avoid]";

interface Colony {
	growth: Growth;
	kind: Kind;
	site: Site;
	canvas: HTMLCanvasElement;
	half: number;
	tint: string;
	visible: boolean;
	done: boolean;
	budget: number;
	life: number;
	dirty: boolean;
	baked: number;
	anchor: HTMLElement;
}

const alpha = (colour: string, a: number) => colour.replace(")", ` / ${a})`);

export const growReef = (field: HTMLElement) => {
	const { bone = "white", tints = "", colonyClass = "", anchorClass = "" } = field.dataset;
	const palette = tints.split("|");
	const still = reducedMotion();
	const fast = still || new URLSearchParams(location.search).has("grown");
	const today = new Date();
	const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
	const colonies: Colony[] = [];
	const planted: Colony[] = [];
	let rects: DOMRect[] = [];
	let width = 0;
	let pointer: { x: number; y: number } | null = null;

	const measure = () => {
		width = document.documentElement.clientWidth;
		rects = [...document.querySelectorAll("[data-reef-avoid]")].map((el) => {
			const r = el.getBoundingClientRect();
			return new DOMRect(r.x - PAD, r.y + scrollY - PAD, r.width + PAD * 2, r.height + PAD * 2);
		});
	};
	const blocked = (x: number, y: number) =>
		x < 0 ||
		x > width ||
		y < 0 ||
		y > document.documentElement.scrollHeight ||
		rects.some((r) => x > r.left && x < r.right && y > r.top && y < r.bottom);

	const watch = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const colony = colonies.find((c) => c.canvas === entry.target);
				if (colony) colony.visible = entry.isIntersecting;
			}
			wake();
		},
		{ rootMargin: "120px" },
	);

	const found = (anchor: HTMLElement, kind: Kind, scale: number, degrees: number, rng: Rng) => {
		const box = anchor.getBoundingClientRect();
		const r = Math.round(scale * Math.min(width * 0.36, 230));
		const site: Site = {
			x: box.x,
			y: box.y + scrollY,
			r,
			dir: (degrees * Math.PI) / 180,
			blocked,
			rng,
		};
		const half = r + 14;
		const canvas = document.createElement("canvas");
		canvas.className = colonyClass;
		canvas.width = canvas.height = Math.round(half * 2 * DPR);
		canvas.style.cssText = `left:${-half}px;top:${-half}px;width:${half * 2}px;height:${half * 2}px`;
		canvas.setAttribute("aria-hidden", "true");
		anchor.appendChild(canvas);
		const colony: Colony = {
			growth: KINDS[kind](site),
			kind,
			site,
			canvas,
			half,
			tint: palette[Math.floor(rng() * palette.length)] ?? bone,
			visible: false,
			done: false,
			budget: 0,
			life: 0,
			dirty: false,
			baked: 0,
			anchor,
		};
		colonies.push(colony);
		watch.observe(canvas);
		return colony;
	};

	const bake = (colony: Colony, now: number) => {
		const { canvas, half, site, growth, tint, kind } = colony;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		ctx.globalCompositeOperation = "source-over";
		ctx.globalAlpha = 1;
		ctx.clearRect(0, 0, half * 2, half * 2);
		ctx.translate(half - site.x, half - site.y);
		ctx.strokeStyle = ctx.fillStyle = bone;
		growth.draw(ctx);

		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-in";
		ctx.fillStyle = bone;
		ctx.fillRect(site.x - half, site.y - half, half * 2, half * 2);

		const rooted = kind === "fan" || kind === "stag";
		const radius = Math.max(1, site.r * (rooted ? 0.85 : 0.75) * (colony.life / LIFE));
		const gradient = ctx.createRadialGradient(site.x, site.y, 0, site.x, site.y, radius);
		gradient.addColorStop(0, alpha(tint, 0.95));
		gradient.addColorStop(0.55, alpha(tint, 0.7));
		gradient.addColorStop(1, alpha(tint, 0));
		ctx.globalCompositeOperation = "source-atop";
		ctx.fillStyle = gradient;
		ctx.fillRect(site.x - half, site.y - half, half * 2, half * 2);
		colony.dirty = false;
		colony.baked = now;
	};

	const clear = () => {
		for (const colony of colonies) {
			watch.unobserve(colony.canvas);
			colony.canvas.remove();
			if (planted.includes(colony)) colony.anchor.remove();
		}
		colonies.length = 0;
		planted.length = 0;
	};

	const build = () => {
		clear();
		measure();
		const anchors = [...document.querySelectorAll<HTMLElement>("[data-reef]")];
		anchors.forEach((anchor, i) => {
			const { reef: kind, r = "1", dir = "-90" } = anchor.dataset;
			if (!isKind(kind) || anchor.getClientRects().length === 0) return;
			found(anchor, kind, Number(r), Number(dir), mulberry(seed * 31 + i * 7919));
		});
		wake();
	};

	const plant = (x: number, y: number) => {
		if (blocked(x, y)) return;
		const rng = mulberry(seed + Math.round(x * 13 + y * 7) + planted.length);
		const anchor = document.createElement("i");
		anchor.className = anchorClass;
		const origin = field.getBoundingClientRect();
		anchor.style.cssText = `left:${x - origin.x}px;top:${y - scrollY - origin.y}px`;
		field.appendChild(anchor);
		const kinds = Object.keys(KINDS).filter(isKind);
		const kind = kinds[Math.floor(rng() * kinds.length)] ?? "brain";
		const colony = found(anchor, kind, 0.42 + rng() * 0.2, -90 + (rng() - 0.5) * 80, rng);
		planted.push(colony);
		const old = planted.length > MAX_PLANTED ? planted.shift() : null;
		if (old) {
			watch.unobserve(old.canvas);
			old.anchor.remove();
			colonies.splice(colonies.indexOf(old), 1);
		}
		wake();
	};

	let frame = 0;
	let last = 0;
	const tick = (ms: number) => {
		frame = 0;
		const now = ms / 1000;
		const dt = Math.min(now - last || 0.016, 0.1);
		last = now;
		const start = performance.now();
		const spent = () => performance.now() - start > FRAME_BUDGET;
		const growing = colonies.filter((c) => c.visible && !c.done);
		let active = growing.length > 0;

		if (fast) {
			while (growing.length > 0 && !spent()) {
				for (let i = growing.length - 1; i >= 0 && !spent(); i--) {
					const colony = growing[i];
					if (!colony) continue;
					colony.done = !colony.growth.step();
					if (colony.done) {
						colony.life = LIFE;
						bake(colony, now);
						growing.splice(i, 1);
					}
				}
			}
		} else {
			for (const colony of colonies) {
				if (!colony.visible) continue;
				if (!colony.done) {
					const near =
						pointer &&
						Math.hypot(pointer.x - colony.site.x, pointer.y + scrollY - colony.site.y) <
							colony.half + 80;
					colony.budget += dt * colony.growth.pace * (near ? 2.5 : 1);
					while (colony.budget >= 1 && !colony.done && !spent()) {
						colony.budget--;
						colony.done = !colony.growth.step();
					}
					colony.budget = Math.min(colony.budget, 3);
					colony.dirty = true;
				}
				if (colony.life < LIFE) {
					colony.life = Math.min(LIFE, colony.life + dt);
					colony.dirty = true;
					active = true;
				}
				if (colony.dirty && (colony.done || now - colony.baked > 0.12)) bake(colony, now);
			}
		}
		if (active && !document.hidden) frame = requestAnimationFrame(tick);
	};
	const wake = () => {
		if (!frame) frame = requestAnimationFrame(tick);
	};

	let timer = 0;
	addEventListener("resize", () => {
		if (document.documentElement.clientWidth === width) return;
		clearTimeout(timer);
		timer = window.setTimeout(build, 300);
	});
	document.addEventListener("visibilitychange", wake);
	addEventListener("pointermove", (e) => {
		pointer = e.pointerType === "mouse" ? { x: e.clientX, y: e.clientY } : null;
	});
	addEventListener("click", (e) => {
		if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
		plant(e.pageX, e.pageY);
	});

	const label = document.querySelector<HTMLElement>("[data-reef-date]");
	if (label)
		label.textContent = today.toLocaleDateString("en-GB", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});

	build();
};
