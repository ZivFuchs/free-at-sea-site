precision highp float;
uniform float uGlow;
uniform float uFade;
uniform vec3 uTint;
varying float vT;
varying float vSide;

void main() {
	float edge = pow(abs(vSide), 3.);
	float fade = pow(1. - vT, .7) * smoothstep(0., .04, vT);
	gl_FragColor = vec4(uTint * (.05 + .3 * edge) * fade * (1. + uGlow * .6) * uFade, 1.);
}
