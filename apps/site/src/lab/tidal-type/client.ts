import { clamp, damp, elementProgress, onFrame, reducedMotion, smoothstep } from "@/lab/lib/motion";
import { rowPath, seaRows, swell, waveBox } from "./wave";

const still = reducedMotion();
const all = <T extends Element>(
	selector: string,
	root: Pick<Document, "querySelectorAll"> = document,
) => [...root.querySelectorAll<T>(selector)];
const num = (value: string | undefined, fallback: number) =>
	value === undefined ? fallback : Number(value);
/** Stable pseudo-random -1…1 per index. */
const jitter = (i: number, salt: number) => (Math.sin(i * 127.1 + salt * 311.7) * 43758.5453) % 1;

/* Hero: letters ride a swell that travels across the title; the type sea rolls beneath. */
for (const hero of all<HTMLElement>("[data-tt-hero]")) {
	const lines = all<HTMLElement>("[data-tt-line]", hero).map((line) => {
		const letters = all<HTMLElement>("[data-tt-letter]", line);
		return { letters, at: letters.map(() => 0) };
	});
	const measure = () => {
		for (const line of lines) {
			line.at = line.letters.map((el) => (el.offsetLeft + el.offsetWidth / 2) / innerWidth);
		}
	};
	measure();
	addEventListener("resize", measure);
	document.fonts.ready.then(measure);

	const rows = seaRows();
	const paths = all<SVGPathElement>("[data-tt-row]", hero);

	onFrame(
		hero,
		(time) => {
			const t = still ? 2.2 : time;
			for (const { letters, at } of lines) {
				letters.forEach((el, i) => {
					const x = (at[i] ?? 0) * 5.5;
					const lift = swell(x, t * 0.9);
					const slope = swell(x + 0.25, t * 0.9) - lift;
					el.style.transform = `translateY(${(lift * 0.03).toFixed(4)}em) rotate(${(slope * 7).toFixed(3)}deg)`;
				});
			}
			if (still) return;
			paths.forEach((path, i) => {
				const row = rows[i];
				if (row) path.setAttribute("d", rowPath(row, time));
			});
		},
		{ fps: 30, margin: "0px" },
	);
}

/* Wave-edged boxes: section edges and the sinking footer wordmark. */
for (const el of all<HTMLElement>("[data-tt-wavebox]")) {
	const { top, bottom, topAmp, bottomAmp, cycles } = el.dataset;
	const box = {
		top: num(top, 0),
		bottom: num(bottom, 100),
		topAmp: num(topAmp, 0),
		bottomAmp: num(bottomAmp, 0),
		cycles: num(cycles, 1.5),
	};
	if (!still) {
		onFrame(
			el,
			(time) => {
				el.style.clipPath = waveBox({ ...box, t: time * 0.6 });
			},
			{ fps: 30 },
		);
	}
}

/* Tide: each numeral fills from below as its heading rises through the viewport. */
for (const tide of all<HTMLElement>("[data-tt-tide]")) {
	const fill = tide.querySelector<HTMLElement>("[data-tt-fill]");
	if (!fill || still) continue;
	let level = 0;
	onFrame(tide, (time, dt) => {
		const r = tide.getBoundingClientRect();
		const target = smoothstep(0.08, 0.72, (innerHeight - r.top) / innerHeight);
		level = damp(level, target, 6, dt);
		fill.style.clipPath = waveBox({
			top: 108 - level * 118,
			bottom: 120,
			topAmp: 3.2 * Math.sin(Math.PI * clamp(level, 0.04, 0.96)) + 0.6,
			cycles: 1.4,
			t: time * 1.1,
		});
	});
}

/* Surf: a crest runs through the line in reading order, throwing each letter and setting it down again. */
for (const surf of all<HTMLElement>("[data-tt-surf]")) {
	const letters = all<HTMLElement>("[data-tt-letter]", surf);
	if (still || letters.length < 2) continue;
	const WIDTH = 0.11;
	onFrame(surf, () => {
		const front = -0.3 + 1.6 * smoothstep(0.22, 0.8, elementProgress(surf));
		letters.forEach((el, i) => {
			const d = (i / (letters.length - 1) - front) / WIDTH;
			const lift = Math.abs(d) < 1 ? (1 - d * d) ** 2 : 0;
			if (!lift) {
				el.style.transform = "";
				return;
			}
			const x = lift * 0.12 * jitter(i, 1);
			const y = -lift * (0.17 + 0.12 * Math.abs(jitter(i, 2)));
			const turn = lift * (10 + 26 * jitter(i, 3)) + d * lift * 14;
			el.style.transform = `translate(${x.toFixed(3)}em, ${y.toFixed(3)}em) rotate(${turn.toFixed(1)}deg)`;
		});
	});
}

/* Currents: rows drift at their own speed and direction; scrolling pushes them along. */
for (const sea of all<HTMLElement>("[data-tt-currents]")) {
	const rows = all<HTMLElement>("[data-tt-current]", sea).map((row) => ({
		row,
		track: row.firstElementChild as HTMLElement | null,
		speed: num(row.dataset.speed, 30),
		offset: 0,
		held: false,
	}));
	const toggle = sea.querySelector<HTMLButtonElement>("[data-tt-pause]");
	let paused = still;
	if (toggle) {
		toggle.hidden = still;
		toggle.addEventListener("click", () => {
			paused = !paused;
			toggle.setAttribute("aria-pressed", String(paused));
			toggle.textContent = paused ? "Resume currents" : "Hold currents";
		});
	}
	for (const item of rows) {
		item.row.addEventListener("pointerenter", () => (item.held = true));
		item.row.addEventListener("pointerleave", () => (item.held = false));
	}
	let lastY = scrollY;
	let push = 0;
	const place = (item: (typeof rows)[number]) => {
		const { track } = item;
		if (!track) return;
		const half = track.scrollWidth / 2;
		if (!half) return;
		const x = ((item.offset % half) + half) % half;
		track.style.transform = `translate3d(${(-x).toFixed(1)}px,0,0)`;
	};
	rows.forEach((item, i) => {
		item.offset = i * 180;
		place(item);
	});
	onFrame(sea, (_, dt) => {
		push = damp(push, (scrollY - lastY) / Math.max(dt, 0.001), 5, dt);
		lastY = scrollY;
		if (paused) return;
		for (const item of rows) {
			if (item.held) continue;
			item.offset +=
				(item.speed + Math.sign(item.speed) * Math.min(Math.abs(push), 2500) * 0.12) * dt;
			place(item);
		}
	});
}
