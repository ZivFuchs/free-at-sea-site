import { type Mix, type SoundEvent, VESSEL_LINES, vesselLevel, vesselShift } from "./signal";

const noise = (ctx: AudioContext, seconds: number, fill: (i: number) => number) => {
	const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = fill(i);
	return buffer;
};

/** Plays the same events the plot draws. Opt-in only: construct it from a user gesture. */
export const createAudio = () => {
	const ctx = new AudioContext();
	const master = ctx.createGain();
	master.gain.value = 0;
	/** The water column: highs die with depth. */
	const water = ctx.createBiquadFilter();
	water.type = "lowpass";
	water.frequency.value = 16000;
	const bus = ctx.createGain();
	bus.connect(water).connect(master).connect(ctx.destination);

	// A long tail without a convolver: two cross-fed delays, darkened each pass.
	const [left, right] = [ctx.createDelay(1), ctx.createDelay(1)];
	left.delayTime.value = 0.31;
	right.delayTime.value = 0.47;
	const [feed, damp] = [ctx.createGain(), ctx.createBiquadFilter()];
	feed.gain.value = 0.42;
	damp.type = "lowpass";
	damp.frequency.value = 2400;
	bus.connect(left).connect(right).connect(damp).connect(feed).connect(left);
	right.connect(water);

	const white = noise(ctx, 2, () => Math.random() * 2 - 1);
	const snaps = noise(ctx, 4, () => (Math.random() < 0.0006 ? Math.random() * 2 - 1 : 0));
	const tick = noise(ctx, 0.004, (i) => (Math.random() * 2 - 1) * Math.exp(-i / 40));

	const bed = (buffer: AudioBuffer, type: BiquadFilterType, frequency: number) => {
		const [source, filter, gain] = [
			ctx.createBufferSource(),
			ctx.createBiquadFilter(),
			ctx.createGain(),
		];
		source.buffer = buffer;
		source.loop = true;
		filter.type = type;
		filter.frequency.value = frequency;
		gain.gain.value = 0;
		source.connect(filter).connect(gain).connect(bus);
		source.start();
		return gain.gain;
	};
	const rain = bed(white, "bandpass", 9000);
	const shrimp = bed(snaps, "highpass", 3000);
	const wash = bed(white, "lowpass", 180);
	const hull = ctx.createGain();
	hull.gain.value = 0;
	hull.connect(bus);
	const lines = VESSEL_LINES.slice(0, 4).map((f, i) => {
		const [osc, gain] = [ctx.createOscillator(), ctx.createGain()];
		osc.frequency.value = f;
		gain.gain.value = 0.5 / (i + 1);
		osc.connect(gain).connect(hull);
		osc.start();
		return { osc, f };
	});

	const burst = (buffer: AudioBuffer, type: BiquadFilterType, frequency: number, at: number) => {
		const [source, filter, gain] = [
			ctx.createBufferSource(),
			ctx.createBiquadFilter(),
			ctx.createGain(),
		];
		source.buffer = buffer;
		filter.type = type;
		filter.frequency.value = Math.min(frequency, ctx.sampleRate * 0.45);
		source.connect(filter).connect(gain).connect(bus);
		source.start(at);
		return { source, gain: gain.gain };
	};

	return {
		/** Schedules one event, `lead` seconds from now. */
		play(e: SoundEvent, lead: number) {
			if (lead < 0.02) return;
			const at = ctx.currentTime + lead;
			if (e.kind === "click") {
				burst(tick, "bandpass", Math.sqrt(e.low * e.high), at).gain.value = e.level * 0.5;
				return;
			}
			if (e.kind === "band") {
				const { source, gain } = burst(white, "lowpass", e.high * 2, at);
				gain.setValueAtTime(0, at);
				gain.linearRampToValueAtTime(e.level * 0.9, at + e.duration / 2);
				gain.linearRampToValueAtTime(0, at + e.duration);
				source.stop(at + e.duration);
				return;
			}
			for (let h = 1; h <= Math.min(e.harmonics, 3); h++) {
				if (Math.max(...e.contour) * h > 18000) break;
				const [osc, gain] = [ctx.createOscillator(), ctx.createGain()];
				osc.frequency.setValueCurveAtTime(
					Float32Array.from(e.contour, (f) => f * h),
					at,
					e.duration,
				);
				const peak = (e.level * 0.16) / h ** 1.4;
				gain.gain.setValueAtTime(0, at);
				gain.gain.linearRampToValueAtTime(peak, at + e.duration * 0.1);
				gain.gain.setValueAtTime(peak, at + e.duration * 0.8);
				gain.gain.linearRampToValueAtTime(0, at + e.duration);
				osc.connect(gain).connect(bus);
				osc.start(at);
				osc.stop(at + e.duration + 0.05);
			}
		},
		/** Follows the continuous sources and the listening depth (`zone`: 0 surface → 3 abyss). */
		update(mix: Mix, now: number, zone: number) {
			const t = ctx.currentTime;
			const ship = mix.vessel * vesselLevel(now);
			rain.setTargetAtTime(mix.rain * 0.035, t, 0.4);
			shrimp.setTargetAtTime(mix.shrimp * 0.5, t, 0.4);
			wash.setTargetAtTime(0.05 + ship * 0.25, t, 0.4);
			hull.gain.setTargetAtTime(ship * 0.1, t, 0.4);
			for (const { osc, f } of lines) osc.frequency.setTargetAtTime(f * vesselShift(now), t, 0.5);
			water.frequency.setTargetAtTime(16000 * 0.42 ** zone, t, 0.6);
		},
		async turn(on: boolean) {
			if (on) await ctx.resume();
			master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.25);
		},
		/** Holds the clock while the plot is paused, so scheduled sound cannot run ahead of it. */
		hold: (paused: boolean) => (paused ? ctx.suspend() : ctx.resume()),
		close: () => ctx.close(),
	};
};

export type Audio = ReturnType<typeof createAudio>;
