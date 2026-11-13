varying vec3 vWorld;

void main() {
	vec2 p = vWorld.xz;
	vec3 toEye = cameraPosition - vWorld;
	float dist = length(toEye);
	vec3 V = toEye / dist;

	vec3 w = swell(p, 1.);
	// Wind ripple, fading with distance so it never aliases.
	float fine = 1. / (1. + dist * .03);
	vec2 q = p * 1.7 + uTime * vec2(.22, .13);
	vec2 q2 = p * 4.3 - uTime * vec2(.17, .31);
	vec2 rip = vec2(
		vnoise(q + vec2(.37, 0.)) - vnoise(q - vec2(.37, 0.)) + .5 * (vnoise(q2 + vec2(.3, 0.)) - vnoise(q2 - vec2(.3, 0.))),
		vnoise(q + vec2(0., .37)) - vnoise(q - vec2(0., .37)) + .5 * (vnoise(q2 + vec2(0., .3)) - vnoise(q2 - vec2(0., .3)))
	) * .32 * fine * (.4 + .6 * uCalm);

	vec3 N = normalize(vec3(-w.y - rip.x, 1., -w.z - rip.y));
	float fres = .02 + .98 * pow(1. - max(dot(N, V), 0.), 5.);
	vec3 R = reflect(-V, N);
	R.y = abs(R.y);

	vec3 body = uDeep * (1. + .9 * max(w.x, 0.) + .35 * max(dot(N, uSunDir), 0.));
	float lit = mix(sunlit(vWorld, vec3(0., 1., 0.)), 1., uNight);
	vec3 col = mix(body * (.62 + .38 * lit), sky(R), fres * (.75 + .25 * lit));
	// Roughened sun: a glitter path, not a mirror.
	float s = max(dot(R, uSunDir), 0.);
	col += uSunCol * (pow(s, 380.) * 2.2 + pow(s, 40.) * .06) * fres * 6. * lit;

	gl_FragColor = vec4(grade(haze(col, cameraPosition, vWorld)), 1.);
}
