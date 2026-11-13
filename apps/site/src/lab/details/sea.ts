/** Seconds of noise, looped. Long enough that the ear finds no repeat. */
const LOOP_S = 6;
const LEVEL = 0.5;

const noise = (ctx: AudioContext, brown: boolean) => {
	const buffer = ctx.createBuffer(1, ctx.sampleRate * LOOP_S, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	let last = 0;
	for (let i = 0; i < data.length; i++) {
		const white = Math.random() * 2 - 1;
		last = brown ? (last + 0.02 * white) / 1.02 : white;
		data[i] = brown ? last * 3.5 : white;
	}
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.loop = true;
	source.start();
	return source;
};

/** A slow sine added to `param`'s base value. */
const lfo = (ctx: AudioContext, param: AudioParam, hz: number, depth: number) => {
	const osc = ctx.createOscillator();
	const amount = ctx.createGain();
	osc.frequency.value = hz;
	amount.gain.value = depth;
	osc.connect(amount).connect(param);
	osc.start();
};

/**
 * A synthesised seascape: a low swell, a wash of surf that comes and goes, and a rumble underneath.
 * `depth(0–1)` closes the water over it: 0 is open air at the surface, 1 is well under. Must start from a user gesture.
 */
export const startSea = () => {
	const ctx = new AudioContext();
	const master = ctx.createGain();
	const lid = ctx.createBiquadFilter();
	lid.type = "lowpass";
	lid.frequency.value = 7000;
	master.gain.value = 0;
	master.gain.setTargetAtTime(LEVEL, ctx.currentTime, 0.8);
	lid.connect(master).connect(ctx.destination);

	const brown = noise(ctx, true);
	const white = noise(ctx, false);

	const swellTone = ctx.createBiquadFilter();
	swellTone.type = "lowpass";
	swellTone.frequency.value = 480;
	const swell = ctx.createGain();
	swell.gain.value = 0.5;
	brown.connect(swellTone).connect(swell).connect(lid);
	lfo(ctx, swell.gain, 0.09, 0.3);
	lfo(ctx, swellTone.frequency, 0.13, 170);

	const washTone = ctx.createBiquadFilter();
	washTone.type = "bandpass";
	washTone.frequency.value = 1900;
	washTone.Q.value = 0.5;
	const wash = ctx.createGain();
	wash.gain.value = 0.05;
	const washLevel = ctx.createGain();
	white.connect(washTone).connect(wash).connect(washLevel).connect(lid);
	lfo(ctx, wash.gain, 0.07, 0.045);
	lfo(ctx, washTone.frequency, 0.05, 500);

	const rumbleTone = ctx.createBiquadFilter();
	rumbleTone.type = "lowpass";
	rumbleTone.frequency.value = 90;
	const rumble = ctx.createGain();
	rumble.gain.value = 0.3;
	brown.connect(rumbleTone).connect(rumble).connect(lid);

	return {
		depth: (d: number) => {
			const now = ctx.currentTime;
			lid.frequency.setTargetAtTime(7000 * (500 / 7000) ** d, now, 1.2);
			washLevel.gain.setTargetAtTime(1 - 0.85 * d, now, 1.2);
			rumble.gain.setTargetAtTime(0.3 + 0.5 * d, now, 1.2);
		},
		stop: () => {
			master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
			setTimeout(() => ctx.close(), 700);
		},
	};
};
