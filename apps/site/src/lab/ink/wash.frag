/* Watercolour washes on white, composited by `mix-blend-mode: multiply` over the paper.
 * Pigment is tracked as absorbance (Beer–Lambert), so overlapping washes glaze like real ones. */
#define MAX 8
#define BLOOMS 4

uniform vec2 u_res;
uniform float u_scale;
uniform vec2 u_origin;
uniform int u_count;
/* x, y, w, h in CSS px */
uniform vec4 u_rect[MAX];
/* kind, pigment, second pigment, strength */
uniform vec4 u_a[MAX];
/* progress, dryness, stroke angle, seed */
uniform vec4 u_b[MAX];
uniform sampler2D u_photo;
/* uv scale, uv offset for object-fit: cover */
uniform vec4 u_cover;
/* x, y, age 0–1, radius */
uniform vec4 u_bloom[BLOOMS];

vec3 absorb(float id) {
	if (id < .5) return -log(vec3(.06, .23, .46));
	if (id < 1.5) return -log(vec3(.17, .22, .40));
	if (id < 2.5) return -log(vec3(.10, .41, .40));
	if (id < 3.5) return -log(vec3(.88, .66, .38));
	return -log(vec3(.12, .14, .19));
}

float box(vec2 q, vec2 hs, float r) {
	vec2 d = abs(q) - hs + r;
	return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r;
}

void main() {
	vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_scale;
	vec2 wp = p + u_origin;

	/* Paper tooth: pigment settles in the valleys. */
	float tooth = noise(wp * .45) * .6 + noise(wp * 1.3 + 40.) * .4;

	/* Clean water dropped into a wash pushes pigment out to a frilled ring. */
	float thin = 1.;
	float ring = 0.;
	for (int j = 0; j < BLOOMS; j++) {
		vec4 b = u_bloom[j];
		if (b.w <= 0.) continue;
		float grow = 1. - exp(-b.z * 5.);
		float r = b.w * (.25 + .75 * grow);
		float d = length(p - b.xy) + (fbm3(wp * .05 + b.xy) - .5) * r * .7 + (noise(wp * .35) - .5) * 4.;
		thin *= 1. - .3 * smoothstep(r, r - 5., d) * grow;
		ring += .5 * exp(-abs(d - r) / 2.2) * grow;
	}

	vec3 A = vec3(0.);
	vec3 photo = vec3(1.);

	for (int i = 0; i < MAX; i++) {
		if (i >= u_count) break;
		vec4 r = u_rect[i];
		vec4 a = u_a[i];
		vec4 b = u_b[i];
		vec2 hs = r.zw * .5;
		vec2 q = p - (r.xy + hs);
		if (abs(q.x) > hs.x + 48. || abs(q.y) > hs.y + 48.) continue;

		float kind = a.x;
		float progress = b.x;
		float dry = b.y;
		vec2 np = wp + b.w * vec2(37.1, 91.7);
		float big = fbm3(np * .011) - .5;
		float fine = fbm3(np * .07) - .5;
		float m = min(hs.x, hs.y);

		float d;
		float soft = 1.2;
		if (kind > 5.5) {
			/* Wet into wet: no edge at all, just pigment diffusing out. */
			d = (length(q / hs) - 1.) * m + big * m * .6;
			soft = m * .9;
		} else if (kind < 1.5 && kind > .5) {
			d = (length(q / hs) - 1.) * m + big * m * .5 + fine * 8.;
		} else if (kind > 2.5 && kind < 3.5) {
			/* Sea: a ruled, slightly dry top edge (the horizon), loose everywhere else. */
			float loose = box(q + vec2(0., hs.y), vec2(hs.x, hs.y * 2.), m * .4) + big * 34. + fine * 9.;
			d = max(loose, -(q.y + hs.y) + fine * 1.2);
		} else if (kind > 4.5 && kind < 5.5) {
			d = box(q, hs, 5.) + big * 9. + fine * 5.;
		} else if (kind > 3.5 && kind < 4.5) {
			d = box(q, hs, min(hs.y, 2.5)) + fine * 1.6;
		} else {
			d = box(q, hs, m * .45) + big * min(m * .7, 40.) + fine * 9.;
		}

		/* The loaded brush travels along the stroke; the wet front fingers ahead unevenly. */
		vec2 dir = vec2(cos(b.z), sin(b.z));
		float span = abs(dir.x) * hs.x + abs(dir.y) * hs.y;
		float f = dot(q, dir) / (2. * span) + .5 + big * .22 + fine * .05;
		float front = mix(-.25, 1.35, progress);
		float painted = 1. - smoothstep(front - .035, front, f);
		float bead = exp(-abs(f - front) / .018) * (1. - dry) * step(progress, .999);

		float cover = smoothstep(soft, -soft, d) * painted;
		if (cover <= 0.) continue;

		float inside = max(-d, 0.);
		float rim = kind > 5.5 ? 0. : exp(-inside / 2.6) + .3 * exp(-inside / 13.);
		float load = .78 + .5 * fbm3(np * .0045 + 5.);
		float density = a.w * load * mix(1.3, 1., dry) * (1. + mix(.12, .95, dry) * rim + .8 * bead);
		density *= 1. + (.5 - tooth) * mix(.15, .5, dry);

		if (kind < 2.5) {
			/* Back-runs: paler cauliflower patches with a dark fringe, appearing as the wash dries. */
			float v = fbm3(np * .0075 + 11.) + fine * .1;
			density *= 1. - .28 * smoothstep(.56, .6, v) * dry;
			density *= 1. + .42 * exp(-abs(v - .58) / .011) * dry;
		}
		if (kind > 1.5 && kind < 2.5) {
			float gy = (q.y + hs.y) / r.w;
			density *= mix(1., .04, smoothstep(0., .95, gy)) * (.85 + .3 * noise(vec2(np.x * .004, np.y * .03)));
		}
		if (kind > 2.5 && kind < 3.5) {
			/* Horizontal strokes, and paper left bare where a fast brush skipped the tooth: glitter. */
			float gy = (q.y + hs.y) / r.w;
			density *= (.62 + .7 * noise(vec2(np.x * .006, np.y * .11))) * mix(1.25, .8, gy);
			float path = exp(-pow(q.x / (hs.x * .3), 2.)) * (1. - .5 * gy);
			float skip = smoothstep(.5, .7, noise(vec2(np.x * .018, np.y * .3)) * .78 + tooth * .3);
			density *= 1. - skip * (.12 + .8 * path);
		}
		if (kind > 3.5 && kind < 4.5) {
			float drag = noise(vec2(np.x * .025, np.y * .7)) * .55 + tooth * .5;
			cover *= smoothstep(.3, .44, drag + .3 * (1. - abs(q.x) / hs.x));
		}

		density *= thin * (1. + ring);
		vec3 k = mix(absorb(a.y), absorb(a.z), .65 * smoothstep(.35, .65, fbm3(np * .006 + b.w)));

		if (kind > 4.5) {
			/* The picture starts as an underpainting and develops behind the wet front. */
			float develop = smoothstep(.0, .45, front - f) * smoothstep(.15, .7, progress);
			vec2 uv = (q / r.zw) * u_cover.xy + u_cover.zw + .5;
			vec3 c = texture2D(u_photo, uv).rgb;
			c = mix(c, vec3(dot(c, vec3(.299, .587, .114))), .12);
			c *= 1. + (.5 - tooth) * .1;
			photo = mix(photo, c, cover * develop);
			A += cover * k * density * (.05 + .5 * (1. - develop) + .22 * rim);
		} else {
			A += cover * k * density;
		}
	}

	gl_FragColor = vec4(exp(-A) * photo, 1.);
}
