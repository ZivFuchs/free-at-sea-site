attribute vec3 a_dir;
attribute vec2 a_info;

uniform mat3 u_m;
uniform mat3 u_view;
uniform vec2 u_proj;
uniform float u_dpr;
uniform float u_time;
uniform float u_limit;
uniform float u_mirror;

varying vec3 v_col;
varying float v_alpha;

void main() {
	vec3 h = u_m * a_dir;
	float alt = h.z;
	float seed = fract(sin(dot(a_dir.xy, vec2(127.1, 311.7))) * 43758.5453);
	float mag = a_info.x;
	float flux = pow(10., -.4 * mag);

	if (u_mirror > .5) {
		h.z = -h.z;
		h.x += sin(u_time * 1.1 + seed * 40.) * .004;
	}
	vec3 v = u_view * h;
	gl_Position = vec4(v.xy * u_proj, 0., v.z);

	/* Extinction: about 0.2 mag per air mass. */
	float air = 1. / (max(alt, 0.) + .025);
	float dim = pow(10., -.4 * .2 * (air - 1.));
	float seen = smoothstep(u_limit + .5, u_limit - .9, mag + .2 * (air - 1.));
	float low = pow(1. - clamp(alt, 0., 1.), 6.);
	float twinkle = 1. + (.06 + .5 * low) * sin(u_time * (5. + seed * 9.) + seed * 60.);

	float size = 1.2 + 3.3 * pow(flux, .3);
	v_alpha = clamp(.2 + 1.25 * pow(flux, .4), 0., 1.5) * dim * seen * twinkle * step(0., alt);

	/* Colour from temperature: cool stars amber, hot stars blue-white. */
	float k = clamp((a_info.y - 30.) / 90., 0., 1.);
	v_col = mix(vec3(1., .66, .42), vec3(1., .96, .9), smoothstep(0., .35, k));
	v_col = mix(v_col, vec3(.72, .82, 1.), smoothstep(.4, 1., k));
	/* Low stars redden. */
	v_col *= mix(vec3(1.), vec3(1., .82, .62), low);

	if (u_mirror > .5) {
		v_alpha *= .5 * step(mag, 2.6) * (.55 + .45 * sin(u_time * 2.3 + seed * 30.));
		size *= 3.;
	}
	gl_PointSize = u_dpr * size * 2.6;
}
