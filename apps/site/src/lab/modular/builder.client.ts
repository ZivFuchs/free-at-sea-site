import { onFrame, reducedMotion } from "@/lab/lib/motion";
import {
	CELLS,
	decode,
	EMPTY,
	encode,
	indexAt,
	NEIGHBOURS,
	type Plan,
	position,
	RADIUS,
	SEED,
} from "./grid";
import { CELL_AREA, MODULES, moduleAt } from "./modules";

const HEIGHT = Math.cos(Math.PI / 6);
const HISTORY = 100;

/** Two crossing swells: height in hex radii and its slope across the screen, at a ground point. */
const swell = (x: number, y: number, t: number) => {
	const a = 0.55 * x + 0.8 * y - 1.05 * t;
	const b = -0.75 * x + 1.5 * y - 1.6 * t + 1;
	return {
		h: 0.085 * Math.sin(a) + 0.035 * Math.sin(b),
		slope: 0.085 * 0.55 * Math.cos(a) - 0.035 * 0.75 * Math.cos(b),
	};
};

interface Floater {
	el: HTMLElement;
	x: number;
	y: number;
}

const floater = (host: HTMLElement, x: number, y: number): Floater | null => {
	const el = host.querySelector<HTMLElement>("[data-float]");
	return el && { el, x, y };
};

export const mount = (root: HTMLElement) => {
	const sea = root.querySelector<HTMLElement>("[data-sea]");
	const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-cell]")];
	const live = root.querySelector<HTMLElement>("[data-live]");
	if (!sea || buttons.length !== CELLS.length) return;

	const still = reducedMotion();
	const arts = buttons.map((b) => b.querySelector<SVGGElement>("[data-art]"));
	const templates = new Map(
		[...root.querySelectorAll<HTMLTemplateElement>("template[data-module]")].map((t) => [
			Number(t.dataset.module),
			t.content.querySelector("g"),
		]),
	);
	const tools = [...root.querySelectorAll<HTMLInputElement>('input[name="tool"]')];
	const stat = (name: string) => root.querySelector<HTMLElement>(`[data-stat="${name}"]`);
	const action = (name: string) => root.querySelector<HTMLButtonElement>(`[data-action="${name}"]`);

	const decks = CELLS.flatMap((cell, i) => {
		const host = buttons[i];
		return (host && floater(host, cell.x, cell.y)) ?? [];
	});
	const water = [...root.querySelectorAll<HTMLElement>("[data-water]")].flatMap(
		(host) => floater(host, Number(host.dataset.x), Number(host.dataset.y)) ?? [],
	);

	let plan: Plan = SEED;
	let night = false;
	const past: string[] = [];
	/** Per cell: its raft's size, and when it last took a knock. */
	let raft: number[] = [];
	let rafts: number[][] = [];
	const knocked = CELLS.map(() => -Infinity);
	let now = 0;

	const group = () => {
		raft = CELLS.map(() => -1);
		rafts = [];
		plan.forEach((value, start) => {
			if (!value || raft[start] !== -1) return;
			const members = [start];
			raft[start] = rafts.length;
			for (const i of members) {
				for (const j of NEIGHBOURS[i] ?? []) {
					if (plan[j] && raft[j] === -1) {
						raft[j] = rafts.length;
						members.push(j);
					}
				}
			}
			rafts.push(members);
		});
	};

	const describe = (i: number, value: number) => {
		const cell = CELLS[i];
		if (!cell) return "";
		const { column, row } = position(cell);
		return `Column ${column}, row ${row}: ${moduleAt(value)?.label ?? "open water"}`;
	};

	const draw = (i: number, value: number, arrive: boolean) => {
		const [button, art] = [buttons[i], arts[i]];
		if (!button || !art) return;
		const source = templates.get(value);
		art.replaceChildren(...(source ? [...source.cloneNode(true).childNodes] : []));
		button.toggleAttribute("data-full", value > 0);
		button.setAttribute("aria-label", describe(i, value));
		if (arrive && value && !still) {
			knocked[i] = now;
			art.animate(
				[
					{ translate: "0 -0.45px", opacity: 0 },
					{ translate: "0 0", opacity: 1 },
				],
				{ duration: 420, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
			);
		}
	};

	const tally = () => {
		const placed = plan.map(moduleAt).filter((m) => m !== undefined);
		const power = placed.reduce((sum, m) => sum + m.power, 0);
		const set = (name: string, text: string) => {
			const el = stat(name);
			if (el) el.textContent = text;
		};
		set("residents", String(placed.reduce((sum, m) => sum + m.residents, 0)));
		set("power", String(Math.abs(power)));
		set("power-term", power < 0 ? "Power short" : "Power spare");
		set("footprint", (placed.length * CELL_AREA).toLocaleString("en"));
	};

	const sync = () => {
		const params = new URLSearchParams({ m: encode(plan), ...(night ? { n: "1" } : {}) });
		history.replaceState(null, "", `#${params}`);
		const undo = action("undo");
		if (undo) undo.disabled = past.length === 0;
		root.toggleAttribute("data-night", night);
		action("night")?.setAttribute("aria-pressed", String(night));
	};

	const apply = (next: Plan, { record = true, arrive = true } = {}) => {
		if (encode(next) === encode(plan)) return;
		if (record) {
			past.push(encode(plan));
			if (past.length > HISTORY) past.shift();
		}
		const previous = plan;
		plan = next;
		next.forEach((value, i) => {
			if (value !== previous[i]) draw(i, value, arrive);
		});
		group();
		tally();
		sync();
		loop.redraw();
	};

	const say = (text: string) => {
		if (live) live.textContent = text;
	};

	const tool = () => Number(tools.find((t) => t.checked)?.value ?? 1);

	const put = (i: number, value: number) => {
		apply(plan.map((v, j) => (j === i ? value : v)));
		say(describe(i, value));
	};

	/** Open water takes the chosen module; a module becomes the chosen one, or the next kind if it already is. */
	const act = (i: number) => {
		const [current, chosen] = [plan[i] ?? 0, tool()];
		if (!current || !chosen || current !== chosen) return put(i, chosen);
		put(i, (current % MODULES.length) + 1);
	};

	const focusCell = (i: number) => {
		for (const [j, button] of buttons.entries()) button.tabIndex = j === i ? 0 : -1;
		buttons[i]?.focus();
	};

	/** Rows interlock, so a sideways step drops or climbs half a row, whichever keeps the line. */
	const step = (i: number, key: string) => {
		const cell = CELLS[i];
		if (!cell) return undefined;
		const { q, r } = cell;
		const row = r + Math.floor(q / 2);
		const side = (dq: number) => {
			const level = row - Math.floor((q + dq) / 2);
			return indexAt(q + dq, level) ?? indexAt(q + dq, level + (level === r ? -1 : 1));
		};
		switch (key) {
			case "ArrowUp":
				return indexAt(q, r - 1);
			case "ArrowDown":
				return indexAt(q, r + 1);
			case "ArrowLeft":
				return side(-1);
			case "ArrowRight":
				return side(1);
			case "Home":
				return indexAt(-RADIUS, r + Math.ceil((q + RADIUS) / 2)) ?? 0;
			case "End":
				return CELLS.length - 1;
			default:
				return undefined;
		}
	};

	sea.addEventListener("click", (event) => {
		const button = (event.target as Element).closest<HTMLElement>("[data-cell]");
		if (!button) return;
		const i = Number(button.dataset.cell);
		for (const [j, other] of buttons.entries()) other.tabIndex = j === i ? 0 : -1;
		act(i);
	});

	root.addEventListener("keydown", (event) => {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target as Element;
		const digit = /^[0-9]$/.test(event.key) ? Number(event.key) : -1;
		const picked = tools.find((t) => Number(t.value) === digit);
		if (picked) {
			picked.checked = true;
			say(`${moduleAt(digit)?.label ?? "Open water"} chosen`);
			return;
		}
		const button = target.closest<HTMLElement>("[data-cell]");
		if (!button) return;
		const i = Number(button.dataset.cell);
		if (event.key === "Delete" || event.key === "Backspace") {
			event.preventDefault();
			return put(i, 0);
		}
		const next = step(i, event.key);
		if (next === undefined) return;
		event.preventDefault();
		focusCell(next);
	});

	action("undo")?.addEventListener("click", () => {
		const previous = decode(past.pop() ?? null);
		if (previous) apply(previous, { record: false });
		else sync();
		say("Undone");
	});
	action("clear")?.addEventListener("click", () => {
		apply(EMPTY);
		say("Plan cleared");
	});
	action("night")?.addEventListener("click", () => {
		night = !night;
		sync();
	});
	const share = action("share");
	share?.addEventListener("click", async () => {
		const label = share.textContent;
		await navigator.clipboard?.writeText(location.href).catch(() => {});
		share.textContent = "Link copied";
		setTimeout(() => {
			share.textContent = label;
		}, 1600);
	});

	const read = () => {
		const params = new URLSearchParams(location.hash.slice(1));
		const shared = decode(params.get("m"));
		night = params.get("n") === "1";
		if (shared) apply(shared, { record: false, arrive: false });
		root.toggleAttribute("data-night", night);
		action("night")?.setAttribute("aria-pressed", String(night));
	};

	const move = ({ el }: Floater, h: number, slope: number, dip = 0) => {
		el.style.transform = `translateY(${(dip - h * HEIGHT).toFixed(4)}em) rotate(${(-slope * 34).toFixed(3)}deg)`;
	};

	const loop = onFrame(sea, (time) => {
		now = time;
		const t = still ? 2 : time;
		for (const f of water) {
			const { h, slope } = swell(f.x, f.y, t);
			move(f, h, slope);
		}
		const waves = decks.map((f) => swell(f.x, f.y, t));
		// A raft rides the plane through its members' water; the more it joins, the less each wave moves it.
		const planes = rafts.map((members) => {
			const mean = (pick: (i: number) => number) =>
				members.reduce((sum, i) => sum + pick(i), 0) / members.length;
			return {
				x: mean((i) => decks[i]?.x ?? 0),
				h: mean((i) => waves[i]?.h ?? 0),
				slope: mean((i) => waves[i]?.slope ?? 0),
				stiff: 1 - 1 / members.length,
			};
		});
		decks.forEach((f, i) => {
			const wave = waves[i];
			if (!wave) return;
			const plane = planes[raft[i] ?? -1];
			if (!plane) {
				move(f, wave.h, wave.slope);
				return;
			}
			const flat = plane.h + plane.slope * (f.x - plane.x);
			const age = time - (knocked[i] ?? -Infinity);
			const dip = age < 3 ? 0.11 * Math.exp(-2.6 * age) * Math.cos(9 * age) : 0;
			move(
				f,
				wave.h + (flat - wave.h) * plane.stiff,
				wave.slope + (plane.slope - wave.slope) * plane.stiff,
				dip,
			);
		});
	});

	group();
	read();
	addEventListener("hashchange", read);
	addEventListener("pagehide", loop.stop, { once: true });
};
