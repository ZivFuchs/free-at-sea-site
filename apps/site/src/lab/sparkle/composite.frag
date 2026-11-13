/* Organisms: fixed specks that each light once the field passes their own threshold. Black is transparent (screen blend). */
uniform sampler2D u_field;
uniform vec2 u_res;
uniform vec2 u_size;
uniform float u_time;
uniform float u_scroll;

vec2 layer(vec2 q, float size, float radius, float e, float seed) {
	/* Each layer's lattice is turned and only part filled, so no grid shows through. */
	float turn = seed * 1.3;
	vec2 g = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * q / size;
	vec2 id = floor(g);
	vec2 h = hash2(id + seed);
	if (hash(id - seed * 5.7) > .55) return vec2(0.);
	vec2 at = .5 + (h - .5) * .78 + .08 * vec2(sin(u_time * .31 + h.x * TAU), cos(u_time * .27 + h.y * TAU));
	float d = length(fract(g) - at) * size;
	float threshold = .04 + .8 * hash(id + seed * 3.1);
	float lit = smoothstep(threshold, threshold + .1, e);
	float twinkle = .5 + .5 * sin(u_time * (3. + 7. * h.x) + h.y * TAU);
	float r = radius * (.7 + .6 * h.y);
	return vec2(lit * (.35 + .65 * twinkle) * exp(-d * d / (r * r)) * (.6 + .8 * e), h.x);
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = vec2(uv.x, 1. - uv.y) * u_size;
	vec2 q = p + vec2(0., u_scroll);
	float e = texture2D(u_field, uv).r;

	vec2 dust = layer(q, 3.4, .8, e, 1.);
	vec2 mid = layer(q, 7., 1.25, e, 7.);
	vec2 big = layer(q, 19., 2.4, e, 13.);
	float light = dust.x * .7 + mid.x + big.x * 1.2;
	float hue = (dust.y * dust.x + mid.y * mid.x + big.y * big.x) / max(dust.x + mid.x + big.x, 1e-3);

	/* Rare lone flashes in still water. */
	vec2 cell = floor(q / 64.);
	float phase = u_time / 5. + hash(cell) * 5.;
	float slot = floor(phase);
	if (hash(cell + slot * 17.3) > .988) {
		float age = fract(phase) * 5.;
		vec2 at = (cell + .2 + .6 * hash2(cell + slot)) * 64.;
		float d = length(q - at);
		float envelope = smoothstep(0., .07, age) * exp(-age * 2.4);
		light += envelope * (exp(-d * d / 3.) + .25 * exp(-d * d / 60.));
		hue = .4;
	}

	vec3 tint = mix(vec3(.04, .78, 1.), vec3(.3, 1., .78), hue);
	vec3 col = tint * light;
	col += vec3(.02, .42, .72) * (e * e * .3 + e * .04);
	col += vec3(.7, .95, 1.) * max(light - .75, 0.) * .6;
	col += (hash(gl_FragCoord.xy + fract(u_time) * 91.) - .5) / 255.;
	gl_FragColor = vec4(max(col, 0.), 1.);
}
