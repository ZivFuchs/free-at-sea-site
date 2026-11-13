import { clamp } from "@/lab/lib/motion";

const SECONDS = 4;
const LEVEL = 0.16;
/** Low-pass cutoff: open at the surface, nearly shut in the abyss. */
const cutoff = (metres: number) => 2200 * Math.exp(-clamp(metres / 4000) * 3.2) + 90;

/** Opt-in water ambience: brown noise under a low-pass that closes with depth, breathing on a slow swell. */
export const ambience = (button: HTMLButtonElement, depth: () => number) => {
	let context: AudioContext | null = null;
	let filter: BiquadFilterNode | null = null;
	let master: GainNode | null = null;
	let timer = 0;

	const build = () => {
		const ctx = new AudioContext();
		const buffer = ctx.createBuffer(2, ctx.sampleRate * SECONDS, ctx.sampleRate);
		for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
			const data = buffer.getChannelData(channel);
			let value = 0;
			for (let i = 0; i < data.length; i++) {
				value = (value + 0.02 * (Math.random() * 2 - 1)) / 1.02;
				data[i] = value * 3.5;
			}
		}
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.Q.value = 0.4;
		const swell = ctx.createGain();
		swell.gain.value = 0.75;
		const lfo = ctx.createOscillator();
		lfo.frequency.value = 0.09;
		const lfoDepth = ctx.createGain();
		lfoDepth.gain.value = 0.25;
		lfo.connect(lfoDepth).connect(swell.gain);
		master = ctx.createGain();
		master.gain.value = 0;
		source.connect(filter).connect(swell).connect(master).connect(ctx.destination);
		source.start();
		lfo.start();
		context = ctx;
	};

	const follow = () => {
		if (context && filter)
			filter.frequency.setTargetAtTime(cutoff(depth()), context.currentTime, 0.4);
	};

	const set = async (on: boolean) => {
		if (on && !context) build();
		if (!context || !master) return;
		if (on) await context.resume();
		master.gain.setTargetAtTime(on ? LEVEL : 0, context.currentTime, 0.5);
		clearInterval(timer);
		if (on) {
			follow();
			timer = window.setInterval(follow, 200);
		} else {
			setTimeout(() => button.getAttribute("aria-pressed") === "false" && context?.suspend(), 2500);
		}
		button.setAttribute("aria-pressed", String(on));
	};

	button.addEventListener("click", () => set(button.getAttribute("aria-pressed") !== "true"));
	document.addEventListener("visibilitychange", () => {
		if (document.hidden && button.getAttribute("aria-pressed") === "true") set(false);
	});
	addEventListener("pagehide", () => context?.close());
};
