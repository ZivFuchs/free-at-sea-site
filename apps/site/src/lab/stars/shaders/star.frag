uniform float u_mirror;
varying vec3 v_col;
varying float v_alpha;

void main() {
	vec2 p = (gl_PointCoord - .5) * 2.;
	float glow;
	if (u_mirror > .5) {
		/* A wavering column of glitter on the water. */
		glow = exp(-p.x * p.x * 90.) * exp(-p.y * p.y * 3.5) * .35;
	} else {
		float r = length(p);
		glow = exp(-r * r * 11.) + .16 * exp(-r * 3.4);
	}
	gl_FragColor = vec4(v_col * glow * v_alpha, 1.);
}
