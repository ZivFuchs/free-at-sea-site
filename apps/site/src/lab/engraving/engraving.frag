vec2 imgUv(vec2 uv) {
	float ca = u_res.x / u_res.y;
	vec2 s = ca > u_aspect ? vec2(1., u_aspect / ca) : vec2(ca / u_aspect, 1.);
	return u_focus + (uv - u_focus) * s;
}

float luma(vec3 c) {
	return dot(c, vec3(.299, .587, .114));
}

/* One ruled line set: `c` counts lines, `w` is ink coverage (0-1), `pitch` the local spacing in px.
 * Below ~2px the lines can't be drawn, so they melt into their average tone. */
float rule(float c, float w, float pitch) {
	float t = abs(fract(c) - .5) * 2.;
	float aa = 1.4 / pitch;
	float ink = 1. - smoothstep(w - aa, w + aa, t);
	return mix(clamp(w, 0., 1.), ink, smoothstep(1.6, 3., pitch)) * smoothstep(0., .07, w);
}

void main() {
	vec2 frag = gl_FragCoord.xy;
	vec2 uv = frag / u_res;
	vec2 iu = imgUv(uv);
	vec3 photo = texture2D(u_img, iu).rgb;
	vec2 tap = vec2(2.5 / u_res.x, 0.);
	float l = (luma(photo) * 2. + luma(texture2D(u_img, iu + tap).rgb) + luma(texture2D(u_img, iu - tap).rgb)) * .25;
	float dark = pow(1. - smoothstep(u_levels.x, u_levels.y, l), 1.6);
	/* Contours: a burin line wherever the tone steps, so pale forms keep their drawing. */
	vec2 e = vec2(1.6) / u_res;
	vec2 grad = vec2(
		luma(texture2D(u_img, iu + vec2(e.x, 0.)).rgb) - luma(texture2D(u_img, iu - vec2(e.x, 0.)).rgb),
		luma(texture2D(u_img, iu + vec2(0., e.y)).rgb) - luma(texture2D(u_img, iu - vec2(0., e.y)).rgb)
	);
	float contour = smoothstep(.07, .2, length(grad));

	vec2 q = (uv - u_centre) / u_radius;
	float edge = length(q) + (fbm(uv * vec2(u_res.x / u_res.y, 1.) * 5.) - .5) * .3;
	float mask = mix(1., 1. - smoothstep(.62, 1.02, edge), u_vignette);
	dark = dark * mask - (1. - mask) * .12;
	dark += (noise(frag * .55) - .5) * .1 * mask;

	float d = u_focus.y - uv.y;
	float ink;
	if (u_persp > .5 && d < 0.) {
		float cell = u_pitch * .85;
		vec2 g = mat2(.866, -.5, .5, .866) * frag / cell;
		vec2 f = fract(g) - .5 - (hash2(floor(g)) - .5) * .35;
		float r = sqrt(clamp(dark, 0., 1.)) * .6;
		float aa = 1.2 / cell;
		ink = (1. - smoothstep(r - aa, r + aa, length(f))) * smoothstep(0., .05, dark);
	} else {
		float c;
		float pitch = u_pitch;
		if (u_persp > .5) {
			float d0 = .28;
			float n = (u_focus.y + d0) * u_res.y / u_pitch;
			c = n * log(d + d0);
			pitch = u_pitch * (d + d0) / (u_focus.y + d0);
		} else {
			c = dot(frag, vec2(.1, .995)) / u_pitch;
		}
		float x = (frag.x - .5 * u_res.x) / pitch;
		float swell = sin(x * .33 + u_time * .7 + sin(c * .21) * 1.7) * .3 + sin(x * .09 - u_time * .35 + c * .05) * .45;
		ink = rule(c + swell, dark * 1.15 - .06, pitch);
		float hatch = u_pitch * 1.1;
		ink = max(ink, rule(dot(frag, vec2(.819, .574)) / hatch, (dark - .66) * 1.6, hatch));
		ink = max(ink, rule(dot(frag, vec2(-.819, .574)) / hatch, (dark - .88) * 3., hatch));
	}
	ink = max(ink, contour * mask * .9);
	ink *= .9 + .1 * noise(frag * .9);

	vec3 engraved = mix(u_paper, u_ink, clamp(ink, 0., 1.));
	vec3 print = mix(u_paper, photo, mask);
	float develop = smoothstep(0., 1., u_reveal * 1.45 - fbm(uv * 4. + 7.) * .45);
	gl_FragColor = vec4(mix(engraved, print, develop), 1.);
}
