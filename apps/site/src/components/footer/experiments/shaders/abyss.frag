void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = (gl_FragCoord.xy - .5 * u_res) / u_res.y;

	vec3 col = mix(vec3(.002, .006, .012), vec3(.016, .06, .09), pow(uv.y, 2.5));

	float snow = motes(p, 60., .004, .1, 2.) * .35 + motes(p, 30., .007, .12, 5.) * .6 +
		motes(p, 14., .012, .18, 8.) * .8 + motes(p, 5., .02, .38, 11.) * .35;
	col += vec3(.55, .65, .7) * snow * (.25 + .75 * uv.y) * .4;

	vec2 q = p * 2.2 + vec2(u_time * .02, 0.);
	vec2 id = floor(q);
	vec3 bio = vec3(0.);
	for (int j = -1; j <= 1; j++) {
		for (int i = -1; i <= 1; i++) {
			vec2 c = id + vec2(float(i), float(j));
			float h = hash(c + 3.7);
			if (h > .22) continue;
			vec2 o = hash2(c * 1.3) + .15 * vec2(sin(u_time * .21 + h * 40.), cos(u_time * .17 + h * 70.));
			float d = length(q - c - o);
			float phase = hash(c + 9.1);
			float pulse = pow(max(sin(u_time * (.25 + phase * .3) + phase * TAU), 0.), 6.);
			vec3 hue = mix(vec3(.1, .85, .8), vec3(.25, .45, 1.), hash(c + 1.9));
			bio += hue * pulse * (exp(-d * d * 900.) * 1.2 + exp(-d * 7.) * .12);
		}
	}
	col += bio;

	gl_FragColor = vec4(grade(col * vignette(uv, .6), .05), 1.);
}
