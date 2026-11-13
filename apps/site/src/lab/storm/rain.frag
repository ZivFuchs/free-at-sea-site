uniform vec2 u_res;
uniform sampler2D u_scene;
uniform sampler2D u_soft;
uniform vec2 u_tex;
uniform float u_horizon;
uniform float u_zoom;
uniform float u_t;
uniform float u_rain;
uniform float u_wet;
uniform float u_gloom;
uniform float u_veil;
uniform float u_washed;
uniform float u_wind;

const vec3 OCEAN = vec3(.027, .094, .165);
const vec3 OVERCAST = vec3(.58, .64, .68);

vec3 hash3(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * vec3(.1031, .103, .0973));
	q += dot(q, q.yxz + 33.33);
	return fract((q.xxy + q.yzz) * q.zyx);
}

/* `object-fit: cover; object-position: 50% horizon`, so the canvas lines up with the still under it. */
vec2 cover(vec2 uv) {
	vec2 size = u_tex * max(u_res.x / u_tex.x, u_res.y / u_tex.y);
	vec2 st = (vec2(uv.x, 1. - uv.y) * u_res - (u_res - size) * vec2(.5, u_horizon)) / size;
	return vec2(st.x, 1. - st.y);
}

/* A lens: paraboloid, so its gradient magnifies and flips whatever is behind. */
float dome(float d) {
	return max(0., 1. - d * d);
}

/* Stick-slip: a drop hangs, lets go, hangs again. */
float slip(float x) {
	return x + sin(x * TAU * 4.) * .036;
}

/* Running drops, one per cell of a tall grid. x: lens height, y: the track it wiped clear. */
vec2 runners(vec2 p, float t, float seed, float amount, vec2 cells) {
	vec2 g = p * cells;
	float col = floor(g.x);
	g.y += hash(vec2(col, seed)) * 13.7;
	vec2 id = vec2(col, floor(g.y));
	vec3 r = hash3(id + seed * 7.1);
	float k = smoothstep(r.z, r.z + .12, amount * 1.12);
	if (k <= 0.) return vec2(0.);

	vec2 f = fract(g);
	float ph = fract(t * (.035 + .05 * r.x) + r.y);
	float y = mix(.9, .1, slip(ph));
	float life = smoothstep(0., .1, ph) * smoothstep(1., .92, ph);
	float cx = .5 + (r.x - .5) * .5;
	float wa = r.y * TAU;
	float x = cx + sin((y + id.y) * 5. + wa) * .07 + sin((y + id.y) * 13. + wa * 1.7) * .025;
	float px = cx + sin((f.y + id.y) * 5. + wa) * .07 + sin((f.y + id.y) * 13. + wa * 1.7) * .025;

	float size = (.011 + .011 * r.z) * (.6 + .4 * k);
	vec2 d = vec2((f.x - x) / cells.x, (f.y - y) / cells.y);
	d.y *= d.y > 0. ? .72 : 1.12;
	float drop = dome(length(d) / size);

	float above = smoothstep(0., .02, f.y - y);
	float fade = smoothstep(1., y, f.y);
	fade *= fade;
	float dx = abs(f.x - px) / cells.x;
	float w = size * .5 * fade + 1e-4;
	float trail = smoothstep(w, w * .4, dx) * above * fade;

	float by = (fract(f.y * 9. + r.x) - .5) / 9. / cells.y;
	float bead = dome(length(vec2(dx, by)) / (size * .3 * (.4 + fade))) * above * step(.02, fade);

	return vec2(drop + bead * .7, trail) * life * k;
}

/* Standing beads that land, sit, and slowly dry. */
float beads(vec2 p, float t, float density, float amount, float seed) {
	vec2 g = p * density;
	vec2 id = floor(g);
	vec3 r = hash3(id + seed);
	float k = smoothstep(r.z, r.z + .1, amount * 1.1);
	if (k <= 0.) return 0.;
	float ph = fract(t * .025 * (.5 + r.x) + r.y);
	float life = smoothstep(0., .02, ph) * smoothstep(1., .45, ph);
	vec2 c = .5 + (r.xy - .5) * .56;
	float size = .07 + .13 * r.z * r.z;
	vec2 d = fract(g) - c;
	d.y *= d.y > 0. ? .9 : 1.08;
	return dome(length(d) / size) * life * k;
}

vec2 field(vec2 p) {
	vec2 a = runners(p, u_t, 1., u_rain, vec2(8., 1.3));
	vec2 b = runners(p * 1.7 + 3.1, u_t * 1.25, 2., u_rain * .8, vec2(8., 1.1));
	float s = beads(p, u_t, 22., u_wet, 3.) * .55 + beads(p + 7.3, u_t * 1.4, 41., u_wet * .5, 4.) * .3;
	return vec2(a.x + b.x * .6 + s, max(a.y, b.y));
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = gl_FragCoord.xy / u_res.y * u_zoom;
	p.x += p.y * u_wind * .14;

	vec2 f = vec2(0.);
	vec2 grad = vec2(0.);
	if (u_wet > .002) {
		float e = u_zoom * 1.5 / u_res.y;
		f = field(p);
		grad = vec2(field(p + vec2(e, 0.)).x - f.x, field(p + vec2(0., e)).x - f.x) / e;
	}
	float lens = smoothstep(0., .06, f.x);
	float clear = max(lens, f.y * .8);

	vec2 bend = grad * .0011 / u_zoom * vec2(u_res.y / u_res.x, 1.);
	vec2 st = cover(uv + bend * lens);
	float blur = smoothstep(0., .7, u_gloom) * .62 * (1. - clear);
	vec3 col = mix(texture2D(u_scene, st).rgb, texture2D(u_soft, st).rgb, blur);

	// Mist on the glass, wiped where a drop has run.
	col = mix(col, OVERCAST, u_rain * .13 * (1. - clear));

	// The bead itself: a dark meniscus, a little gathered light, one small glint from the sky.
	float gl = length(grad);
	vec2 n = grad / max(gl, 1e-4);
	float rim = lens * (1. - smoothstep(0., .45, f.x));
	col *= 1. - rim * .13;
	col += lens * .045;
	col += lens * smoothstep(.72, 1., dot(n, normalize(vec2(.45, -.9)))) * smoothstep(20., 70., gl) * .22;

	// Weather: the light greys and drops, then comes back clean.
	float lum = dot(col, vec3(.299, .587, .114));
	col = mix(col, lum * OVERCAST * 1.7, u_gloom * .62);
	col = col * (1. - u_gloom * .12) + u_gloom * .03;
	col = mix(col, (col - .5) * 1.08 + .53, u_washed * .6);
	col = mix(col, col * vec3(.97, 1., 1.03), u_washed);

	// Rain in the air, only when it blows.
	vec2 q = vec2(uv.x * u_res.x / u_res.y + uv.y * (.2 + u_wind * .35), uv.y);
	float streak = smoothstep(.8, 1., noise(vec2(q.x * 330., q.y * 4. + u_t * 13.))) * noise(vec2(q.x * 9., u_t * 1.7));
	col += streak * .035 * u_rain * u_wind;

	// Behind the page's content the scene sinks into the page blue; beads keep a little of their light.
	col = mix(col, OCEAN, u_veil * (1. - lens * .3));

	col += (hash(gl_FragCoord.xy + fract(u_t) * 311.) - .5) / 255. * 2.;
	gl_FragColor = vec4(col, 1.);
}
