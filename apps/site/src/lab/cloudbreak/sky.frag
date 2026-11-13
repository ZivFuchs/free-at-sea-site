uniform vec2 u_res;
uniform float u_alt;
uniform float u_clock;
uniform float u_steps;

#define BASE 900.
#define TOP 1500.
#define SUN normalize(vec3(.3, .37, .93))
#define FOCAL 1.4

vec2 drift() {
	return vec2(u_clock * 7., u_clock * 26.);
}

float hash3(vec3 p) {
	p = fract(p * .1031);
	p += dot(p, p.zyx + 31.32);
	return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
	vec3 i = floor(p);
	vec3 f = fract(p);
	f = f * f * (3. - 2. * f);
	return mix(
		mix(mix(hash3(i), hash3(i + vec3(1., 0., 0.)), f.x), mix(hash3(i + vec3(0., 1., 0.)), hash3(i + vec3(1., 1., 0.)), f.x), f.y),
		mix(mix(hash3(i + vec3(0., 0., 1.)), hash3(i + vec3(1., 0., 1.)), f.x), mix(hash3(i + vec3(0., 1., 1.)), hash3(i + vec3(1., 1., 1.)), f.x), f.y),
		f.z
	);
}

vec3 sky(vec3 rd) {
	float y = max(rd.y, 0.);
	float s = max(dot(rd, SUN), 0.);
	vec3 col = mix(vec3(.66, .8, .93), vec3(.04, .17, .5), 1. - exp(-y * 4.6));
	col = mix(col, vec3(.98, .86, .7), exp(-y * 13.) * (.25 + .45 * s * s));
	col += vec3(1., .8, .55) * (pow(s, 10.) * .22 + pow(s, 90.) * .5);
	col += vec3(1., .96, .88) * smoothstep(.9994, .9998, s) * 5. * step(TOP, u_alt);
	return col;
}

/* Deck coverage seen from straight above, 0–1. */
float cover(vec2 xz) {
	return fbm3((xz + drift()) * .0005);
}

float density(vec3 p) {
	float h = (p.y - BASE) / (TOP - BASE);
	if (h < 0. || h > 1.) return 0.;
	float d = cover(p.xz) * smoothstep(0., .12, h) * (1. - .8 * h * h) - .26;
	if (d < -.1) return 0.;
	vec3 q = p + vec3(drift().x, 0., drift().y);
	d -= .16 * noise3(q * vec3(.004, .006, .004)) + .07 * noise3(q * .013);
	return clamp(d * 5., 0., 1.);
}

/* rgb: light scattered toward the eye, a: what is left of the background. */
vec4 clouds(vec3 ro, vec3 rd, float tmax, float jitter, vec3 haze) {
	float ta = (BASE - ro.y) / rd.y;
	float tb = (TOP - ro.y) / rd.y;
	float t0 = max(min(ta, tb), 0.);
	float t1 = min(max(ta, tb), tmax);
	if (abs(rd.y) < 1e-5 || t1 <= t0) return vec4(0., 0., 0., 1.);
	t1 = min(t1, t0 + 26000.);

	float mu = dot(rd, SUN);
	float phase = .55 + .35 * pow(max(mu, 0.), 6.) + 1.6 * pow(max(mu, 0.), 40.);
	vec3 light = vec3(0.);
	float trans = 1.;
	float t = t0;
	for (int i = 0; i < 56; i++) {
		if (float(i) >= u_steps || t > t1 || trans < .02) break;
		float dt = max(30., t * .03);
		vec3 p = ro + rd * (t + dt * (.2 + .6 * jitter));
		float d = density(p);
		if (d > .003) {
			float h = (p.y - BASE) / (TOP - BASE);
			float toSun = density(p + SUN * 90.);
			float shade = exp(-toSun * 3.2) * mix(.3, 1., smoothstep(.1, .75, h));
			float powder = 1. - exp(-d * 6.);
			vec3 c = vec3(1., .96, .88) * shade * phase * mix(.75, 1., powder) + vec3(.6, .7, .84) * mix(.34, .95, h);
			c = mix(haze, c, exp(-t / 52000.));
			float a = 1. - exp(-d * dt * .011);
			light += c * a * trans;
			trans *= 1. - a;
		}
		t += dt;
	}
	/* Past the far haze the deck dissolves into the horizon rather than aliasing against it. */
	float near = exp(-t0 / 70000.);
	return vec4(light * near, mix(1., trans, near));
}

float swell(vec2 x, float fp) {
	float c = u_clock;
	float h = 1.1 * (1. - smoothstep(6., 34., fp)) * sin(dot(x, vec2(.36, .93)) / 21. + c * .55);
	h += 1.2 * (1. - smoothstep(8., 30., fp)) * noise(x / 46. + vec2(c * .04, c * .1));
	h += .34 * (1. - smoothstep(3.5, 14., fp)) * noise(OCTAVE * x / 11. + vec2(-c * .08, c * .17));
	h += .09 * (1. - smoothstep(.9, 3.5, fp)) * noise(OCTAVE * OCTAVE * x / 5.5 + vec2(c * .3, -c * .2));
	return h;
}

vec3 sea(vec3 p, vec3 rd, float t) {
	float fp = t / (u_res.y * FOCAL) / max(-rd.y, .03);
	vec2 x = p.xz + vec2(0., u_clock * 2.);
	float e = .35 + fp * .6;
	float h = swell(x, fp);
	vec3 n = normalize(vec3(h - swell(x + vec2(e, 0.), fp), e, h - swell(x + vec2(0., e), fp)));
	float calm = smoothstep(.5, 16., fp);

	/* Sunlight reaching this patch through the deck: the moving cloud shadows. */
	float lit = 1. - .82 * smoothstep(.33, .5, cover(p.xz + SUN.xz / SUN.y * (BASE + 250.)));
	float overhead = smoothstep(.33, .5, cover(p.xz));

	vec3 r = reflect(rd, n);
	r.y = abs(r.y);
	vec3 above = mix(sky(r), vec3(.4, .45, .52) * (.7 + .3 * lit), overhead * .85);
	float fres = .02 + .98 * pow(1. - max(dot(n, -rd), 0.), 5.);
	vec3 col = mix(vec3(.01, .05, .09) * (.4 + .6 * lit), above, fres);
	col += vec3(1., .93, .8) * pow(max(dot(r, SUN), 0.), mix(380., 26., calm)) * mix(2.2, .5, calm) * lit * exp(-fp * .012);

	float caps = smoothstep(.71, .8, noise(x * .021 + 3.)) * smoothstep(.45, .75, noise(x * .17));
	col += vec3(.75, .8, .84) * caps * (.25 + .75 * lit) * (1. - smoothstep(4., 30., fp)) * .5;
	return col;
}

void main() {
	vec2 uv = (gl_FragCoord.xy - .5 * u_res) / u_res.y;
	float under = smoothstep(1700., 700., u_alt);
	float pitch = mix(-.13, .035, under);
	vec3 rd = normalize(vec3(uv, FOCAL));
	rd.yz = vec2(rd.y * cos(pitch) + rd.z * sin(pitch), rd.z * cos(pitch) - rd.y * sin(pitch));
	vec3 ro = vec3(0., u_alt, 0.);

	vec3 haze = sky(normalize(vec3(rd.x, .003, rd.z))) * mix(1., .8, under);
	float tsea = rd.y < -1e-4 ? ro.y / -rd.y : 1e9;
	vec3 col = tsea < 1e8 ? mix(haze, sea(ro + rd * tsea, rd, tsea), exp(-tsea / mix(60000., 26000., under))) : sky(rd);

	float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
	vec4 deck = clouds(ro, rd, tsea, jitter, haze);
	col = col * deck.a + deck.rgb;

	/* Inside the layer: whiteout, brighter toward the top, with wisps going by. */
	float h = (u_alt - BASE) / (TOP - BASE);
	float inside = smoothstep(1.02, .78, h) * smoothstep(-.03, .14, h);
	float wisps = fbm3(uv * 2.2 + vec2(u_clock * .11, u_clock * .05 - u_alt * .004));
	vec3 white = vec3(.82, .85, .88) * mix(.6, 1.02, clamp(h, 0., 1.)) * (.93 + .14 * wisps);
	col = mix(col, white, inside * .92);

	col = mix(col, 1. - exp(-col), smoothstep(.75, 1.6, max(col.r, max(col.g, col.b))));
	gl_FragColor = vec4(col + (hash(gl_FragCoord.yx + 17.) - .5) / 255., 1.);
}
