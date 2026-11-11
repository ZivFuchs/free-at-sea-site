#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_time;
uniform sampler2D u_text;
uniform float u_textAspect;

#define TAU 6.28318530718

float hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * .1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .103, .0973));
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3. - 2. * f);
	return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}

const mat2 OCTAVE = mat2(1.6, 1.2, -1.2, 1.6);

float fbm(vec2 p) {
	float v = 0.;
	float a = .5;
	for (int i = 0; i < 5; i++) {
		v += a * noise(p);
		p = OCTAVE * p;
		a *= .5;
	}
	return v;
}

float fbm3(vec2 p) {
	float v = 0.;
	float a = .5;
	for (int i = 0; i < 3; i++) {
		v += a * noise(p);
		p = OCTAVE * p;
		a *= .5;
	}
	return v / .875;
}

/* Tileable water caustics (after joltz0r), period TAU. */
float caustic(vec2 p, float t) {
	p = mod(p, TAU) - 250.;
	vec2 i = p;
	float c = 1.;
	for (int n = 0; n < 5; n++) {
		float tt = t * (1. - 3.5 / float(n + 1));
		i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
		c += 1. / length(vec2(p.x / (sin(i.x + tt) / .005), p.y / (cos(i.y + tt) / .005)));
	}
	c /= 5.;
	c = 1.17 - pow(c, 1.4);
	return pow(abs(c), 8.);
}

/* Sparse drifting specks, one per lit cell. Large `size` at low `scale` reads as out-of-focus bokeh. */
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

float vignette(vec2 uv, float strength) {
	return 1. - strength * pow(length((uv - .5) * vec2(1., .8)), 2.2);
}

/* Film grain, plus dither so the dark gradients don't band. */
vec3 grade(vec3 col, float grain) {
	float n = hash(gl_FragCoord.xy + fract(u_time * 7.) * 311.) - .5;
	return max(col, 0.) + n * grain + (hash(gl_FragCoord.yx + 17.) - .5) / 255.;
}
