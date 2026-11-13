/** Opt-in sonar chirp: a sine blip into a feedback delay, so it rings off into the dark. */
export const createSonarAudio = () => {
	let ctx: AudioContext | null = null;
	let bus: GainNode | null = null;

	const start = () => {
		ctx = new AudioContext();
		bus = ctx.createGain();
		const delay = ctx.createDelay(1);
		const feedback = ctx.createGain();
		const damp = ctx.createBiquadFilter();
		delay.delayTime.value = 0.37;
		feedback.gain.value = 0.48;
		damp.type = "lowpass";
		damp.frequency.value = 1700;
		bus.connect(ctx.destination);
		bus.connect(delay).connect(damp).connect(feedback).connect(delay);
		damp.connect(ctx.destination);
	};

	const chirp = (frequency: number, gain: number, delay = 0) => {
		if (!ctx || !bus) return;
		const at = ctx.currentTime + delay;
		const osc = ctx.createOscillator();
		const env = ctx.createGain();
		osc.frequency.setValueAtTime(frequency, at);
		osc.frequency.exponentialRampToValueAtTime(frequency * 0.94, at + 0.25);
		env.gain.setValueAtTime(0.0001, at);
		env.gain.exponentialRampToValueAtTime(gain, at + 0.008);
		env.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
		osc.connect(env).connect(bus);
		osc.start(at);
		osc.stop(at + 0.75);
	};

	return {
		get on() {
			return ctx?.state === "running";
		},
		async toggle() {
			if (!ctx) start();
			else if (ctx.state === "running") await ctx.suspend();
			else await ctx.resume();
			return ctx?.state === "running";
		},
		ping: () => chirp(1180, 0.16),
		/** The return: quieter, a touch higher, after the travel time. */
		contact: (seconds: number) => chirp(1420, 0.035, seconds),
		close: () => ctx?.close(),
	};
};
