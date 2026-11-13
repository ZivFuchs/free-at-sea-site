uniform float uTime;
uniform float uPhase;
uniform float uRate;
uniform float uLen;
uniform vec3 uDrag;

#define PI 3.14159265
#define TAU 6.2831853

/* Contraction 0–1 over one pulse: quick squeeze, slow relax. */
float squeeze(float p) {
	p = fract(p);
	return smoothstep(0., .2, p) * (1. - smoothstep(.2, .95, p));
}

float cycle() {
	return uTime * uRate + uPhase;
}

/* Bell surface: u around, v from apex (0) to margin (1). The squeeze travels apex → margin. */
vec3 bell(float u, float v, float scale) {
	float c = squeeze(cycle() - v * .16);
	float a = v * 1.78;
	float m = smoothstep(.2, 1., v);
	float r = pow(sin(a), .82) * (1. - .36 * c * m);
	float y = cos(a) * .56 * (1. + .16 * c) - .14 * c * m * v;
	r *= 1. + .022 * sin(u * TAU * 16.) * pow(v, 8.);
	float th = u * TAU;
	return vec3(cos(th) * r, y, sin(th) * r) * scale;
}
