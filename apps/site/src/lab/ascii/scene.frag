uniform vec2 u_res;
uniform float u_time;
uniform float u_t;
uniform float u_px;
uniform vec2 u_cell;
uniform vec2 u_grid;
uniform float u_glyphs;
uniform float u_ramp;
uniform float u_letters;
uniform sampler2D u_atlas;
uniform sampler2D u_title;
uniform sampler2D u_photo;
uniform sampler2D u_clip;
uniform float u_horizon;
uniform float u_shift;
uniform float u_titleOn;
uniform float u_photoMix;
uniform float u_clipMix;
uniform float u_dim;
uniform float u_boot;
uniform vec3 u_view;
uniform float u_photoAspect;
uniform float u_clipAspect;
uniform vec3 u_ground;
uniform vec3 u_aqua;
uniform vec3 u_paper;
uniform vec3 u_r0;
uniform vec3 u_r1;
uniform vec3 u_r2;
uniform vec3 u_r3;

const vec3 LUMA = vec3(.299, .587, .114);
/* x across the frame; y as a fraction of the sky's height. */
const vec2 SUN = vec2(.8, .26);

float titleMask(vec2 uv) {
	float y = uv.y - u_shift;
	if (y < 0. || y > 1. || uv.x < 0. || uv.x > 1.) return 0.;
	return texture2D(u_title, vec2(uv.x, 1. - y)).r;
}

/* Low sun over a long swell. `uv.y` runs down from the top. */
float swell(vec2 uv) {
	float h = u_horizon;
	float a = u_res.x / u_res.y;
	if (uv.y < h) {
		float s = uv.y / h;
		float l = mix(.02, .26, pow(s, 2.6));
		float d = length(vec2((uv.x - SUN.x) * a, uv.y - h * SUN.y));
		l += smoothstep(.062, .05, d) * .6 + .2 * exp(-d * 6.);
		l += .16 * smoothstep(.5, .74, fbm(vec2(uv.x * a * 1.5 + u_t * .012, uv.y * 12.))) * smoothstep(.2, .8, s);
		return l;
	}
	float d = (uv.y - h) / (1. - h);
	float x = (uv.x - .5) * a;
	/* Crests evenly spaced in log depth, so they bunch toward the horizon like real perspective. */
	float phase = 14. * log2(d * 10. + 1.) - u_t * .7 + sin(x * 4. / (d + .3) + u_t * .13) * 1.1 + fbm(vec2(x * 3., d * 5.)) * 3.;
	float crest = pow(.5 + .5 * sin(phase), 9.);
	float near = smoothstep(.03, .16, d);
	float l = mix(.1, .03 + .62 * crest * mix(.6, 1., d), near);
	float gx = abs(uv.x - SUN.x) * a;
	l += exp(-gx * gx / (.002 + .05 * d * d)) * (.25 + .75 * crest) * (1. - d * .6) * .7;
	float m = titleMask(vec2(uv.x + sin(uv.y * 80. + u_t * 1.2) * .005, h - (uv.y - h) * 1.7));
	l += m * .16 * u_titleOn * smoothstep(.3, 0., d);
	return l;
}

/* The barge still: `u_view` is the centre (xy, y down) and the width of photo shown. */
float photo(vec2 uv) {
	float a = u_res.x / u_res.y;
	vec2 q = u_view.xy + (uv - .5) * vec2(u_view.z, u_view.z / a * u_photoAspect);
	float l = dot(texture2D(u_photo, vec2(q.x, 1. - q.y)).rgb, LUMA);
	l = smoothstep(.05, .62, l) * .72;
	l += (noise(q * vec2(170., 280.) + vec2(u_t * .35, -u_t * .22)) - .5) * .09 * smoothstep(.18, .3, q.y);
	return l;
}

float clip(vec2 uv) {
	float a = u_res.x / u_res.y;
	vec2 q = .5 + (uv - .5) * vec2(min(1., a / u_clipAspect), min(1., u_clipAspect / a));
	return smoothstep(.03, .85, dot(texture2D(u_clip, vec2(q.x, 1. - q.y)).rgb, LUMA));
}

float order(vec2 cell) {
	return cell.y + cell.x / u_grid.x;
}

/* Scenes swap like a terminal repainting: row by row, left to right. */
float scene(vec2 uv, float idx) {
	float n = u_grid.y + 1.;
	if (idx < u_clipMix * n) return clip(uv);
	if (idx < u_photoMix * n) return photo(uv);
	return swell(uv);
}

float ripple(vec3 r, vec2 p) {
	float age = u_time - r.z;
	if (age < 0. || age > 2.2) return 0.;
	float d = length(p - r.xy) / u_px - age * 260.;
	return exp(-d * d / 700.) * (1. - age / 2.2);
}

float caret(float idx, float mixed) {
	float at = mixed * (u_grid.y + 1.);
	return step(.002, mixed) * step(mixed, .998) * step(at, idx) * step(idx, at + 1.5 / u_grid.x);
}

void main() {
	vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
	vec2 cell = floor(p / u_cell);
	vec2 f = fract(p / u_cell);
	vec2 centre = (cell + .5) * u_cell;
	vec2 uv = centre / u_res;
	vec2 d = u_cell / u_res;
	float idx = order(cell);

	float l = scene(uv, idx);
	float lx = scene(uv + vec2(d.x, 0.), idx) - scene(uv - vec2(d.x, 0.), idx);
	float ly = scene(uv + vec2(0., d.y), idx) - scene(uv - vec2(0., d.y), idx);

	float h1 = hash(cell + 7.3);
	float slot = clamp(floor(clamp(l, 0., .999) * u_ramp + (h1 - .5) * .8), 0., u_ramp - 1.);
	float tone = l;

	/* Strong gradients become strokes along the edge: ~ - | / \ */
	float ax = abs(lx);
	float ay = abs(ly);
	if (length(vec2(lx, ly)) > .16 && l > .12) {
		if (ay > ax * 2.2) slot = u_ramp + step(.7, h1);
		else if (ax > ay * 2.2) slot = u_ramp + 2.;
		else slot = u_ramp + (lx * ly > 0. ? 3. : 4.);
		tone = max(l, .5);
	}

	vec3 ink = mix(u_aqua * .45, u_aqua, smoothstep(.1, .6, tone));
	ink = mix(ink, u_paper, smoothstep(.62, .95, tone));
	float amount = mix(.4, 1., smoothstep(0., .5, tone)) * u_dim;

	float tm = titleMask(uv) * step(h1, u_titleOn * 1.05) * step(.001, u_titleOn);
	if (tm > .5) {
		slot = u_ramp + 5. + mod(cell.x + cell.y * 4., u_letters);
		ink = u_paper;
		amount = 1.;
	} else if (tm > .22) {
		slot = 3.;
		ink = u_paper;
		amount = .55;
	}

	float stir = ripple(u_r0, centre) + ripple(u_r1, centre) + ripple(u_r2, centre) + ripple(u_r3, centre);
	if (stir > hash(cell * 1.31 + floor(u_time * 12.) * 17.) * .85 + .12) {
		slot = 1. + floor(hash(cell + floor(u_time * 10.)) * (u_ramp - 1.));
		ink = mix(ink, u_paper, .7);
		amount = max(amount, min(stir * 1.5, 1.) * .9);
	}

	float glyph = texture2D(u_atlas, vec2((slot + f.x) / u_glyphs, 1. - f.y)).r;
	float shown = step(idx, u_boot * (u_grid.y + 1.));
	vec3 col = u_ground + ink * glyph * amount * shown;

	float block = step(.12, f.x) * step(f.x, .88) * step(.1, f.y) * step(f.y, .9);
	float cursor = max(max(caret(idx, u_photoMix), caret(idx, u_clipMix)), caret(idx, u_boot));
	col = mix(col, u_paper, cursor * block * .9);

	gl_FragColor = vec4(col, 1.);
}
