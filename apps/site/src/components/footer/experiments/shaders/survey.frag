float terrain(vec2 p) {
	vec2 w = p + vec2(fbm3(p * .2), fbm3(p * .2 + 5.)) * 2.;
	return fbm3(p * .12) * 2.8 + pow(sin(w.x * 1.1 + w.y * .35) * .5 + .5, 2.) * .22;
}

float surface(vec2 p) {
	return terrain(p) + fbm(p * 2.5) * .08;
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 s = (gl_FragCoord.xy - .5 * u_res) / u_res.y;
	float t = u_time;

	vec3 ro = vec3(sin(t * .05) * 1.5, 0., t * .45);
	ro.y = (terrain(ro.xz) + terrain(ro.xz + vec2(0., 3.))) * .5 + 1.25;
	vec3 fw = normalize(vec3(cos(t * .05) * .08, -.42, 1.));
	vec3 rt = normalize(cross(vec3(0., 1., 0.), fw));
	vec3 rd = normalize(fw * 1.6 + rt * s.x + cross(fw, rt) * s.y);

	float d = .1;
	bool hit = false;
	for (int i = 0; i < 80; i++) {
		vec3 pos = ro + rd * d;
		float h = pos.y - terrain(pos.xz);
		if (h < .002 * d) {
			hit = true;
			break;
		}
		d += h * .6;
		if (d > 28.) break;
	}

	vec3 fog = vec3(.004, .02, .03);
	vec3 col = fog;
	if (hit) {
		vec3 pos = ro + rd * d;
		vec2 e = vec2(.02, 0.);
		vec3 n = normalize(vec3(
			surface(pos.xz - e.xy) - surface(pos.xz + e.xy),
			2. * e.x,
			surface(pos.xz - e.yx) - surface(pos.xz + e.yx)
		));
		vec3 l = ro + vec3(0., -.3, 0.) - pos;
		float ld = length(l);
		l /= ld;
		float cone = smoothstep(.45, .9, dot(-l, fw));
		vec3 albedo = vec3(.62, .56, .46) * (.75 + .5 * fbm(pos.xz * 4.));
		vec3 lamp = albedo * max(dot(n, l), 0.) * cone * 6. / (1. + ld * ld * .3);
		col = fog + lamp * exp(-vec3(.4, .13, .09) * d);
	}
	col += vec3(.05, .13, .15) * pow(max(dot(rd, fw), 0.), 6.) * .6;
	col += vec3(.6, .75, .8) * motes(s, 16., .03, .18, 3.) * .3 * exp(-length(s) * 1.5);

	col = col / (1. + col) * mix(.45, 1., smoothstep(0., .6, uv.y));
	gl_FragColor = vec4(grade(col * vignette(uv, .7), .03), 1.);
}
