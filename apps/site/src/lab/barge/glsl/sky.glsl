/* Late-afternoon sky shared by the dome and the water's reflection. `d` is a normalised view ray. */
uniform vec3 uSun;

vec3 skyColor(vec3 d) {
	float h = max(d.y, 0.);
	vec3 zenith = vec3(.13, .31, .62);
	vec3 horizon = vec3(.70, .80, .88);
	vec3 col = mix(horizon, zenith, pow(h, .38));
	float s = max(dot(d, uSun), 0.);
	vec3 warm = vec3(1., .78, .52);
	col += warm * (.22 * pow(s, 6.) + .5 * pow(s, 48.)) * (1. - .5 * h);
	col = mix(col, vec3(.93, .84, .72), (1. - smoothstep(0., .16, h)) * (.14 + .5 * pow(s, 3.)));
	return col;
}

vec3 sunDisc(vec3 d) {
	float s = max(dot(d, uSun), 0.);
	return vec3(1., .9, .72) * (smoothstep(.9994, .9998, s) * 30. + pow(s, 900.) * 4.);
}
