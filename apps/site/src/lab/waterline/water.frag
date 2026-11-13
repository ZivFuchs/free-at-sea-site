uniform vec2 u_res;
uniform float u_time;
/* Surface height from the top of the viewport, in viewport heights. */
uniform float u_line;
/* 0 at the top of the page, 1 at the seabed. */
uniform float u_depth;

float motes(vec2 p, float scale, float speed, float size, float seed) {
	p *= scale;
	p.y += u_time * speed * scale;
	p.x += sin(p.y * .35 + seed) * .35 + u_time * speed * scale * .3;
	vec2 id = floor(p);
	if (hash(id + seed) > .3) return 0.;
	vec2 o = .5 + (hash2(id + seed * 1.7) - .5) * (1. - 2. * size);
	float d = length(fract(p) - o);
	return (1. - smoothstep(size * .25, size, d)) * (.35 + .65 * hash(id + seed + 4.1));
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	float aspect = u_res.x / u_res.y;
	float d = (1. - uv.y) - u_line;
	vec2 p = vec2((uv.x - .5) * aspect, d);
	float depth = max(d, 0.) * .75 + u_depth * 1.15;

	vec3 col = mix(vec3(.05, .31, .40), vec3(.02, .16, .28), smoothstep(0., .5, depth));
	col = mix(col, vec3(.008, .045, .10), smoothstep(.45, 1.7, depth));

	float dim = exp(-depth * 1.9);
	vec2 dir = p - vec2(.22 + .05 * sin(u_time * .05), -1.1);
	float a = dir.x / dir.y;
	float rays = noise(vec2(a * 8. + u_time * .05, u_time * .09)) * noise(vec2(a * 21. - u_time * .035, 3. + u_time * .06));
	col += vec3(.45, .85, .8) * smoothstep(.12, .62, rays) * dim * .3;

	col += vec3(.6, .95, .9) * caustic(vec2(p.x * 5., d * 13.) + 2., u_time * .55) * exp(-max(d, 0.) * 8.) * .22 * (1. - .6 * u_depth);
	col += vec3(.35, .7, .7) * exp(-max(d, 0.) * 16.) * .12;

	float specks = motes(p, 8., .006, .05, 1.) + .6 * motes(p, 15., .01, .045, 5.) + .35 * motes(p, 4., .004, .09, 9.);
	col += vec3(.7, .95, .95) * specks * (.05 + .1 * dim);

	col *= 1. - .35 * pow(length((uv - .5) * vec2(1., .8)), 2.2);
	col += (hash(gl_FragCoord.xy + fract(u_time * 7.) * 311.) - .5) * .018;
	gl_FragColor = vec4(max(col, 0.), 1.);
}
