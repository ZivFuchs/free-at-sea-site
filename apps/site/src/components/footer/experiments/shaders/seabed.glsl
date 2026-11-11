/* Top-down sunlit sand. Needs common.glsl. */

float sandHeight(vec2 p) {
	vec2 w = p + vec2(fbm3(p * .45), fbm3(p * .45 + 7.3)) * 1.4;
	float ripples = pow(sin(w.x * 6. + w.y * 1.8) * .5 + .5, 1.6);
	return ripples * .22 + fbm3(p * 1.4) * .5;
}

vec3 sandAlbedo(vec2 p) {
	vec3 a = vec3(.8, .74, .6) * (.8 + .3 * fbm(p * 5. + 11.)) * (.92 + .16 * noise(p * 90.));
	return a * (.9 + .3 * step(.95, hash(floor(p * 160.))));
}

/* Sun through a moving surface onto relief with normal `n`. `shade` is cast shadow, 0–1. */
vec3 seabed(vec2 p, vec3 albedo, vec3 n, float shade) {
	float t = u_time * .3 + 23.;
	vec2 cp = p * 4.2 + n.xy * .6;
	vec3 c = vec3(caustic(cp + vec2(.05, 0.), t), caustic(cp, t), caustic(cp - vec2(.05, 0.), t));
	c = pow(c, vec3(1.6)) * (.4 + 1.4 * fbm3(p * .35 + vec2(u_time * .02, 0.)));
	float diff = max(dot(n, normalize(vec3(-.35, .45, 1.))), 0.);
	vec3 light = vec3(.22, .55, .68) * (.3 + .55 * diff) + c * vec3(.75, 1., 1.) * 1.1;
	return mix(albedo * light * shade, vec3(.01, .08, .11), .22);
}
