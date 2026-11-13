precision highp float;
uniform float uGlow;
uniform float uFade;
uniform vec3 uTint;
varying float vT;

void main() {
	gl_FragColor = vec4(uTint * .26 * pow(1. - vT, 1.3) * (1. + uGlow) * uFade, 1.);
}
