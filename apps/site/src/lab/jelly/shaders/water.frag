precision highp float;
uniform float uDepth;
varying vec2 vUv;

void main() {
	/* Last light from the surface, straight overhead, gone a screen or two down. */
	float glow = exp(-length((vUv - vec2(.5, 1.25)) * vec2(1.1, 1.)) * 2.6) * (1. - uDepth);
	vec3 col = vec3(.012, .02, .036) + vec3(.02, .09, .16) * glow;
	gl_FragColor = vec4(col, 1.);
}
