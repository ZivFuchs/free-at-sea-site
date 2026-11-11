vec3 water(float y) {
	return mix(vec3(.006, .03, .05), vec3(.05, .24, .32), pow(clamp(y, 0., 1.), 1.4));
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	float aspect = u_res.x / u_res.y;
	vec2 p = vec2((uv.x - .5) * aspect, uv.y);
	float t = u_time;
	float aa = 1.5 / u_res.y;

	vec3 col = water(uv.y);

	vec2 d = p - vec2(-.15 * aspect, 2.6);
	float a = atan(d.x, -d.y);
	float shafts = pow(noise(vec2(a * 22., t * .07)), 2.5) + .6 * pow(noise(vec2(a * 55. + 9., t * .11)), 3.);
	shafts *= exp(-abs(a) * 1.8) * smoothstep(-.1, 1., uv.y);
	col += vec3(.3, .62, .7) * shafts * .45;

	float far = .3 + .1 * fbm(vec2(p.x * .7 + 4., 1.));
	col = mix(col, water(far) * .75, 1. - smoothstep(far - aa, far + aa, uv.y));

	float near = .14 + .09 * fbm(vec2(p.x * 1.3, 5.)) + .012 * sin(p.x * 7.);
	float below = max(near - uv.y, 0.);
	float lit = caustic(vec2(p.x * 2.5, below * 14.), t * .35 + 23.) * exp(-below * 22.);
	vec3 ground = vec3(.012, .035, .05) + vec3(.1, .24, .26) * lit + vec3(.04, .1, .12) * exp(-below * 120.);
	col = mix(col, ground, 1. - smoothstep(near - aa, near + aa, uv.y));

	float light = .25 + shafts * 2.;
	float m = motes(p, 38., .012, .12, 1.) * .5 + motes(p, 18., .02, .16, 7.) * .8 + motes(p, 7., .035, .3, 13.) * .5;
	col += vec3(.7, .9, 1.) * m * light * .35;

	gl_FragColor = vec4(grade(col * vignette(uv, .45), .04), 1.);
}
