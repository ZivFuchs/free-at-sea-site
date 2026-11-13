uniform float u_alpha;
varying float v_alt;

void main() {
	gl_FragColor = vec4(vec3(.55, .75, .9) * u_alpha * smoothstep(0., .06, v_alt), 1.);
}
