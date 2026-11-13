uniform vec2 u_res;
uniform float u_time;
uniform float u_scale;
uniform vec2 u_s;
uniform vec2 u_e;
uniform vec2 u_r;
uniform float u_power;
uniform float u_horizon;
uniform float u_far;
uniform float u_flash;
uniform vec2 u_pointer;
uniform float u_hand;
uniform float u_ambient;

const vec3 LAMP = vec3(1., .93, .78);
const vec3 WARM = vec3(1., .82, .58);
const vec3 SHAFT = vec3(.8, .88, 1.);

/* Mirrors `intensity()` in optics.ts, plus a brighter core. */
float beam(vec2 p) {
	vec2 v = u_e - u_s;
	float t = clamp(dot(p - u_s, v) / max(dot(v, v), 1.), 0., 1.);
	float d = length(p - u_s - t * v);
	float r = mix(u_r.x, u_r.y, t);
	float q = d * d / (r * r);
	return u_power * (exp(-1.5 * q) + .45 * exp(-14. * q)) * (1. - .45 * t);
}

void main() {
	vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_scale;
	vec2 size = u_res / u_scale;
	float dy = p.y - u_horizon;
	float lamp = u_far * u_far * u_far;
	float sky = 1. - step(0., dy);
	vec3 col = vec3(0.);

	/* Last light along the horizon, and a few stars above it. */
	col += u_far * sky * vec3(.018, .034, .07) * exp(dy / (size.y * .16));
	vec2 grid = p / 11.;
	vec2 cell = floor(grid);
	float seen = step(.93, hash(cell)) * (.3 + .7 * hash(cell + 7.));
	float star = seen * exp(-dot(fract(grid) - .2 - .6 * hash2(cell), fract(grid) - .2 - .6 * hash2(cell)) * 260.);
	star *= .7 + .3 * sin(u_time * (1. + 3. * hash(cell + 3.)) + 40. * hash(cell + 11.));
	col += u_far * sky * smoothstep(0., -size.y * .06, dy) * star * vec3(.75, .82, 1.);

	/* The lamp, flaring as it swings toward us, and its broken path on the water. */
	float dl = length(p - u_s);
	col += lamp * LAMP * (.35 + 2.2 * u_flash) * (exp(-dl * dl / 5.) + .3 * exp(-dl / (7. + 46. * u_flash)));
	float below = step(0., dy);
	float spread = 5. + dy * .07;
	float path = exp(-pow((p.x - u_s.x) / spread, 2.)) * exp(-dy / (size.y * .3));
	float glint = smoothstep(.52, .8, noise(vec2(p.x * .11, dy * .55 - u_time * .9)));
	col += lamp * below * LAMP * path * glint * (.12 + 1.1 * u_flash);

	/* The shaft itself, uneven with sea mist. */
	float haze = .7 + .6 * fbm(p * .0035 + vec2(u_time * .025, u_time * -.01));
	col += mix(SHAFT, LAMP, .2) * beam(p) * haze * mix(.27, .4, u_far);

	col += WARM * u_hand * .09 * exp(-dot(p - u_pointer, p - u_pointer) / (170. * 170.));
	col += LAMP * u_ambient * .34 * exp(-length(p - vec2(size.x * .5, size.y * 1.12)) / (size.y * .3));

	col += (hash(gl_FragCoord.xy + fract(u_time) * 91.) - .5) / 255.;
	gl_FragColor = vec4(max(col, 0.), 1.);
}
