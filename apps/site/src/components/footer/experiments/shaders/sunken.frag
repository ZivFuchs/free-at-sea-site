const float SCALE = 3.;

float letters(vec2 p, float blur) {
	vec2 frag = p * u_res.y / SCALE + .5 * u_res;
	float width = min(.86 * u_res.x, .42 * u_res.y * u_textAspect);
	vec2 tuv = (frag - vec2(.5 * u_res.x, .76 * u_res.y)) / vec2(width, width / u_textAspect) + .5;
	vec2 inside = step(0., tuv) * step(tuv, vec2(1.));
	return texture2D(u_text, tuv, blur).r * inside.x * inside.y;
}

/* Drifts of sand bury parts of the letters. */
float exposed(vec2 p, float blur) {
	return letters(p, blur) * (1. - smoothstep(.5, .66, fbm(p * .9 + 4.)));
}

float height(vec2 p) {
	return mix(sandHeight(p), .75 + noise(p * 25.) * .04, exposed(p, 2.));
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = (gl_FragCoord.xy - .5 * u_res) / u_res.y * SCALE;
	float e = .02;
	float h = height(p);
	vec3 n = normalize(vec3(h - height(p + vec2(e, 0.)), h - height(p + vec2(0., e)), e * 1.5));

	float l = exposed(p, 2.);
	vec3 stone = vec3(.95, .93, .86) * (.85 + .2 * fbm(p * 6.));
	stone = mix(stone, vec3(.35, .5, .38), smoothstep(.6, .85, fbm(p * 3. + 2.)) * .4);
	vec3 albedo = mix(sandAlbedo(p), stone, smoothstep(.3, .7, l));
	float shadow = 1. - .6 * exposed(p + vec2(-.04, .05), 4.) * (1. - l);

	vec3 col = seabed(p, albedo, n, shadow);
	col *= mix(.35, 1., smoothstep(0., .6, uv.y)) * vignette(uv, .5);
	gl_FragColor = vec4(grade(col, .045), 1.);
}
