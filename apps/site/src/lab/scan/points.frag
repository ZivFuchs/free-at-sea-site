precision mediump float;
varying vec3 vColor;

void main() {
	vec2 c = gl_PointCoord - .5;
	if (dot(c, c) > .25) discard;
	gl_FragColor = vec4(vColor, 1.);
}
