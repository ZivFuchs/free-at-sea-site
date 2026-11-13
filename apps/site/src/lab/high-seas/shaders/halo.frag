precision mediump float;
uniform vec3 uColor;
uniform float uDim;
uniform float uReach;
varying vec2 vUv;

/* The plane spans `uReach` globe radii: a soft atmosphere outside the limb, a faint rim light inside it. */
void main() {
	float d = length(vUv) * uReach;
	float outside = exp(-(d - 1.) * 7.) * .34 * step(1., d);
	float inside = (pow(d, 7.) * .2 + .035) * step(d, 1.);
	float edge = 1. - smoothstep(uReach * .8, uReach, d);
	gl_FragColor = vec4(uColor, (outside + inside) * edge * uDim);
}
