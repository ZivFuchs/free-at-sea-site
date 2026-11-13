import { runShader } from "@/lab/lib/gl";
import noise from "@/lab/lib/glsl/noise.glsl?raw";
import { clamp, damp, reducedMotion } from "@/lab/lib/motion";
import {
	type Almanac,
	almanac,
	type Horizontal,
	moon as moonAt,
	sunPosition,
	TIDE_RANGE,
	TIME,
	tideHeight,
	turn,
} from "./astro";
import { PLACE, ZONE_HOURS } from "./place";
import { css, paletteAt, type Sky, skyFor } from "./sky";
import fragment from "./sky.frag?raw";

const { MINUTE, HOUR, DAY } = TIME;
const POINTS = [
	"N",
	"NNE",
	"NE",
	"ENE",
	"E",
	"ESE",
	"SE",
	"SSE",
	"S",
	"SSW",
	"SW",
	"WSW",
	"W",
	"WNW",
	"NW",
	"NNW",
];
/** Clear of the header, px. */
const SKY_TOP = 112;
const CHART = { width: 1440, height: 300, min: -90, max: 90, tide: 100 };
const SCRUB_HOURS = 12;
const RETURN_MS = 900;
const KEY_IDLE_MS = 3000;

const zoned = (date: Date) => new Date(date.getTime() + ZONE_HOURS * HOUR);
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (date: Date) => {
	const z = zoned(date);
	return `${pad(z.getUTCHours())}:${pad(z.getUTCMinutes())}`;
};
const day = new Intl.DateTimeFormat("en-GB", {
	weekday: "short",
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});
const signed = (value: number, digits: number, unit: string) =>
	`${value < 0 ? "−" : "+"}${Math.abs(value).toFixed(digits)}${unit}`;
const bearing = (azimuth: number) => `${String(Math.round(azimuth) % 360).padStart(3, "0")}°`;
const point = (azimuth: number) => POINTS[Math.round(azimuth / 22.5) % 16] ?? "N";

const root = document.documentElement;
const hero = document.querySelector<HTMLElement>("[data-almanac-hero]");

if (hero) {
	const still = reducedMotion();
	const canvas = hero.querySelector<HTMLCanvasElement>("canvas[data-sky]");
	const line = hero.querySelector<HTMLElement>("[data-horizon]");
	const compass = hero.querySelector<HTMLElement>("[data-compass]");
	const labels = {
		sun: hero.querySelector<HTMLElement>('[data-body="sun"]'),
		moon: hero.querySelector<HTMLElement>('[data-body="moon"]'),
	};
	const fields = new Map(
		[...document.querySelectorAll<HTMLElement>("[data-field]")].map((el) => [el.dataset.field, el]),
	);
	const set = (name: string, text: string) => {
		const el = fields.get(name);
		if (el && el.textContent !== text) el.textContent = text;
	};

	const at = new URLSearchParams(location.search).get("at");
	const fixed = at && !Number.isNaN(Date.parse(at)) ? Date.parse(at) : null;
	let offset = 0;
	const current = () => new Date((fixed ?? Date.now()) + offset);

	let data: Almanac = almanac(current(), PLACE);
	let sky: Sky = skyFor(data);
	let view = Number.NaN;
	let drawn = Number.NaN;

	const featured = (): Horizontal =>
		data.sun.altitude > -6 || data.moon.altitude <= 0 ? data.sun : data.moon;

	const frame = () => {
		const height = hero.clientHeight || 1;
		const width = hero.clientWidth || 1;
		const hz = 1 - (line?.offsetTop ?? height / 2) / height;
		const top = 1 - SKY_TOP / height;
		const fov = clamp((width / height) * 62, 38, 110);
		const project = ({ altitude, azimuth }: Horizontal) => ({
			x: 0.5 + turn(view, azimuth) / fov,
			y: altitude >= 0 ? hz + (top - hz) * (altitude / 90) ** 0.7 : hz + (altitude / 90) * 0.5,
		});
		return { width, height, hz, fov, sun: project(data.sun), moon: project(data.moon) };
	};

	const ticks = compass
		? Array.from({ length: 36 }, (_, i) => {
				const tick = compass.firstElementChild?.cloneNode(true) as HTMLElement;
				const label = tick.querySelector("span");
				const azimuth = i * 10;
				if (label)
					label.textContent =
						azimuth % 90 === 0
							? point(azimuth)
							: azimuth % 30 === 0
								? String(azimuth).padStart(3, "0")
								: "";
				if (azimuth % 30 === 0) tick.setAttribute("data-major", "");
				compass.appendChild(tick);
				return { tick, azimuth };
			})
		: [];
	compass?.firstElementChild?.remove();

	/** Places the DOM that rides the sky: body captions and the bearing scale. */
	const place = ({ width, height, hz, fov, sun, moon }: ReturnType<typeof frame>) => {
		for (const [key, at] of [
			["sun", sun],
			["moon", moon],
		] as const) {
			const label = labels[key];
			if (!label) continue;
			const shown = data[key].altitude > 0.5 && at.x > 0.04 && at.x < 0.96;
			label.toggleAttribute("data-shown", shown);
			const flip = at.x > 0.6;
			label.toggleAttribute("data-flip", flip);
			label.style.transform = `translate(${at.x * width}px, ${(1 - at.y) * height}px)`;
		}
		if (compass && !(Math.abs(view - drawn) <= 0.01)) {
			drawn = view;
			compass.style.top = `${(1 - hz) * height}px`;
			for (const { tick, azimuth } of ticks) {
				const x = 0.5 + turn(view, azimuth) / fov;
				tick.hidden = x < -0.05 || x > 1.05;
				if (!tick.hidden) tick.style.transform = `translateX(${x * width}px)`;
			}
		}
	};

	let last = 0;
	const shader =
		canvas &&
		runShader(canvas, {
			fragment: `precision highp float;\n${noise}\n${fragment}`,
			fps: 30,
			uniforms: (time) => {
				const target = featured().azimuth;
				const dt = last ? Math.min(time - last, 0.1) : 0;
				last = time;
				view = Number.isNaN(view) || still ? target : view + damp(0, turn(view, target), 2.2, dt);
				const f = frame();
				place(f);
				const { palette } = sky;
				return {
					u_hz: f.hz,
					u_sun: [f.sun.x, f.sun.y],
					u_moon: [f.moon.x, f.moon.y],
					u_moonK: data.moon.fraction,
					u_moonTilt: data.moon.tilt,
					u_sunAlt: data.sun.altitude,
					u_moonAlt: data.moon.altitude,
					u_stars: sky.stars,
					u_moonlight: sky.moonlight,
					u_pan: view / 360,
					u_zenith: palette.zenith,
					u_horizon: palette.horizon,
					u_seaFar: palette.seaFar,
					u_seaNear: palette.seaNear,
					u_glow: palette.glow,
				};
			},
		});
	if (shader) canvas?.setAttribute("data-live", "");

	const chart = document.querySelector<HTMLElement>("[data-chart]");
	const paths = {
		sun: chart?.querySelector<SVGPathElement>('[data-path="sun"]'),
		moon: chart?.querySelector<SVGPathElement>('[data-path="moon"]'),
		tide: chart?.querySelector<SVGPathElement>('[data-path="tide"]'),
	};
	const altitudeY = (altitude: number) =>
		((CHART.max - clamp(altitude, CHART.min, CHART.max)) / (CHART.max - CHART.min)) * CHART.height;
	const tideY = (height: number) => CHART.tide * (0.5 - (height / TIDE_RANGE) * 0.42);
	let drawnDay = "";

	const midnight = (date: Date) => {
		const z = zoned(date);
		return Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate()) - ZONE_HOURS * HOUR;
	};

	/** Sky tones across a span of time, as a CSS gradient. */
	const gradient = (from: number, span: number, tone: "horizon" | "zenith", stops = 48) =>
		`linear-gradient(90deg, ${Array.from({ length: stops + 1 }, (_, i) =>
			css(paletteAt(sunPosition(new Date(from + (span * i) / stops), PLACE).altitude)[tone]),
		).join(", ")})`;

	const drawChart = (date: Date) => {
		const start = midnight(date);
		const key = String(start);
		if (!chart || key === drawnDay) return;
		drawnDay = key;
		const samples = Array.from({ length: 145 }, (_, i) => i * 10);
		const curve = (y: (at: Date) => number) =>
			samples
				.map((m, i) => `${i ? "L" : "M"}${m} ${y(new Date(start + m * MINUTE)).toFixed(1)}`)
				.join("");
		paths.sun?.setAttribute(
			"d",
			curve((t) => altitudeY(sunPosition(t, PLACE).altitude)),
		);
		paths.moon?.setAttribute(
			"d",
			curve((t) => altitudeY(moonAt(t, PLACE).altitude)),
		);
		paths.tide?.setAttribute("d", `${curve((t) => tideY(tideHeight(t, PLACE)))}V${CHART.tide}H0Z`);
		chart.style.setProperty("--alm-day", gradient(start, DAY, "zenith"));
	};

	const paint = () => {
		const date = current();
		data = almanac(date, PLACE);
		sky = skyFor(data);
		const { sun, moon, sunEvents, tide } = data;

		for (const [name, tone] of Object.entries({
			"--alm-zenith": sky.palette.zenith,
			"--alm-horizon": sky.palette.horizon,
			"--alm-sea-far": sky.palette.seaFar,
			"--alm-sea-near": sky.palette.seaNear,
			"--alm-accent": sky.palette.accent,
			"--app-ocean": sky.palette.ground,
			"--color-background-body": sky.palette.ground,
		})) {
			root.style.setProperty(name, css(tone));
		}
		root.style.setProperty("--alm-tide", String(clamp(0.5 + (tide.height / TIDE_RANGE) * 0.5)));
		root.style.setProperty("--alm-stars", sky.stars.toFixed(3));

		set("time", clock(date));
		set("date", day.format(zoned(date)));
		set("light", sky.light);
		set("sunAlt", signed(sun.altitude, 1, "°"));
		set("sunBrg", `Bearing ${bearing(sun.azimuth)} ${point(sun.azimuth)}`);
		sunEvents.forEach(({ kind, at }, i) => {
			set(`event${i}Kind`, kind);
			set(`event${i}Time`, clock(at));
		});
		set("moonName", moon.name);
		set("moonLit", `${Math.round(moon.fraction * 100)}% lit`);
		set(
			"moonAlt",
			moon.altitude > 0
				? `Alt ${signed(moon.altitude, 0, "°")} · ${bearing(moon.azimuth)}`
				: "Below the horizon",
		);
		set("tide", signed(tide.height, 2, " m"));
		set("tideState", tide.rising ? "Rising" : "Falling");
		set("tideNext", tide.next ? `${tide.next.kind} ${clock(tide.next.at)}` : "");
		set("sunCaption", `Sun ${signed(sun.altitude, 0, "°")}`);
		set("moonCaption", `Moon ${signed(moon.altitude, 0, "°")}`);

		drawChart(date);
		if (chart) {
			const x = (date.getTime() - midnight(date)) / DAY;
			chart.style.setProperty("--alm-x", String(x));
			chart.style.setProperty("--alm-sun-y", String(altitudeY(sun.altitude) / CHART.height));
			chart.style.setProperty("--alm-moon-y", String(altitudeY(moon.altitude) / CHART.height));
		}

		if (shader) shader.redraw();
		else {
			view = featured().azimuth;
			place(frame());
		}
	};

	// The site header picks ink over a light film poster; this sky sets its own tone.
	document.querySelector<HTMLElement>("[data-site-header]")?.style.removeProperty("--top");

	const scrub = document.querySelector<HTMLInputElement>("[data-scrub]");
	const hold = document.querySelector<HTMLButtonElement>("[data-hold]");
	const track = () =>
		scrub?.style.setProperty(
			"--alm-track",
			gradient((fixed ?? Date.now()) - SCRUB_HOURS * HOUR, 2 * SCRUB_HOURS * HOUR, "horizon", 36),
		);

	const describe = () => {
		const minutes = Math.round(offset / MINUTE);
		const abs = Math.abs(minutes);
		set(
			"scrub",
			minutes === 0 ? "Now" : `${minutes < 0 ? "−" : "+"}${Math.floor(abs / 60)}h ${pad(abs % 60)}`,
		);
		scrub?.setAttribute(
			"aria-valuetext",
			minutes === 0 ? `Now, ${clock(current())}` : `${clock(current())} zone time`,
		);
	};

	let returning = 0;
	let idle = 0;
	const release = () => {
		clearTimeout(idle);
		if (!scrub || offset === 0 || hold?.getAttribute("aria-pressed") === "true") return;
		const from = offset;
		const began = performance.now();
		const step = (now: number) => {
			const t = still ? 1 : clamp((now - began) / RETURN_MS);
			offset = from * (1 - t * t * (3 - 2 * t));
			scrub.value = String(Math.round(offset / MINUTE));
			describe();
			paint();
			returning = t < 1 ? requestAnimationFrame(step) : 0;
		};
		returning = requestAnimationFrame(step);
	};

	if (scrub) {
		scrub.addEventListener("input", () => {
			cancelAnimationFrame(returning);
			offset = Number(scrub.value) * MINUTE;
			describe();
			paint();
		});
		scrub.addEventListener("pointerup", release);
		scrub.addEventListener("pointercancel", release);
		scrub.addEventListener("blur", release);
		scrub.addEventListener("keyup", () => {
			clearTimeout(idle);
			idle = window.setTimeout(release, KEY_IDLE_MS);
		});
		scrub.addEventListener("keydown", (event) => {
			if (event.key === "Escape") release();
		});
	}
	hold?.addEventListener("click", () => {
		const on = hold.getAttribute("aria-pressed") !== "true";
		hold.setAttribute("aria-pressed", String(on));
		if (!on) release();
	});

	const tick = () => {
		track();
		paint();
		setTimeout(tick, MINUTE - (Date.now() % MINUTE) + 50);
	};
	tick();
	describe();
	hero.setAttribute("data-ready", "");
	new ResizeObserver(() => {
		drawn = Number.NaN;
		paint();
	}).observe(hero);
	addEventListener("pagehide", () => shader?.stop(), { once: true });
}
