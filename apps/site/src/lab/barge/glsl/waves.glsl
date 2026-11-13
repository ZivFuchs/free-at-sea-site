/* Swell as a sum of sines; mirrored in `ocean.ts` so the hull rides the same surface. */
#define WAVES 6
uniform vec4 uWave[WAVES]; // dir.x, dir.z, wavenumber, amplitude
uniform vec2 uWavePhase[WAVES]; // angular speed, phase
uniform float uTime;

float swell(vec2 p, out vec2 slope) {
	float h = 0.;
	slope = vec2(0.);
	for (int i = 0; i < WAVES; i++) {
		vec4 w = uWave[i];
		float a = dot(w.xy, p) * w.z - uWavePhase[i].x * uTime + uWavePhase[i].y;
		h += w.w * sin(a);
		slope += w.xy * (w.z * w.w * cos(a));
	}
	return h;
}
