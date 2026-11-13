precision mediump float;
uniform vec3 uCoastal;
uniform vec3 uHigh;
varying float vAlpha;
varying float vHigh;

void main() {
	float d = length(gl_PointCoord - .5);
	float disc = 1. - smoothstep(.3, .5, d);
	gl_FragColor = vec4(mix(uCoastal, uHigh, vHigh), disc * vAlpha);
}
