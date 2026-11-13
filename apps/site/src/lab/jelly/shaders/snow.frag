precision highp float;
varying float vAlpha;

void main() {
	float d = length(gl_PointCoord - .5);
	gl_FragColor = vec4(vec3(.55, .7, .85) * smoothstep(.5, .1, d) * vAlpha * .5, 1.);
}
