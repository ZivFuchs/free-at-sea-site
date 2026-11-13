uniform vec2 u_res;
uniform float u_clock;
/* Depth of the eye in metres. */
uniform float u_m;
/* Viewport heights scrolled: parallax for everything suspended in the water. */
uniform float u_travel;
/* 0 → 1 as the seabed comes up under the lamp. */
uniform float u_floor;

/* Absorption per metre: red dies first, then green, blue last. */
const vec3 ABSORB = vec3(.22, .013, .0052);

float disc(vec2 p, float scale, float fall, float par, float size, float seed, float density) {
	p *= scale;
	p.y += u_clock * fall * scale - u_travel * par * scale;
	p.x += sin(p.y * .4 + seed) * .3 + u_clock * fall * scale * .25;
	vec2 id = floor(p);
	if (hash(id + seed) > density) return 0.;
	vec2 o = .5 + (hash2(id + seed * 1.7) - .5) * (1. - 2. * size);
	float d = length(fract(p) - o);
	return (1. - smoothstep(size * .2, size, d)) * (.3 + .7 * hash(id + seed + 4.1));
}

/* Points of living light: each cell flares slowly, rarely, on its own clock. */
vec3 sparks(vec2 p, float scale, float par, float seed) {
	p *= scale;
	p.y -= u_travel * par * scale;
	p += vec2(sin(u_clock * .07 + seed), cos(u_clock * .05 + seed)) * .4;
	vec2 id = floor(p);
	float h = hash(id + seed);
	if (h > .16) return vec3(0.);
	float k = h / .16;
	vec2 o = .2 + .6 * hash2(id + seed * 2.3);
	float d = length(fract(p) - o);
	float pulse = pow(max(0., sin(u_clock * (.25 + .35 * k) + k * 40.)), 10.);
	float glow = exp(-d * d * 900.) + .22 * exp(-d * d * 40.);
	return mix(vec3(.1, .75, 1.), vec3(.25, 1., .7), k) * glow * pulse;
}

/* A drifting chain of lights, a pulse running down it: a siphonophore, kept abstract. */
vec3 chain(vec2 p, float i) {
	float life = fract(i * .37 + u_travel * .21 + u_clock * .006 * (i + 1.));
	vec2 base = vec2(sin(u_clock * .04 * (i + 1.) + i * 2.1) * .3 * u_res.x / u_res.y, life * 1.8 - .9);
	float lean = sin(i * 5.3 + u_clock * .05) * .5;
	vec3 sum = vec3(0.);
	for (int j = 0; j < 9; j++) {
		float s = float(j) / 8.;
		vec2 at = base + vec2(sin(s * 3. + u_clock * .35 + i * 1.7) * .035 + lean * s * .12, -s * .2);
		float d = length(p - at);
		float beat = pow(.5 + .5 * sin(u_clock * 1.3 - s * 6. + i * 2.), 5.);
		sum += (exp(-d * d * 14000.) + .12 * exp(-d * d * 500.)) * (.15 + .85 * beat) * (1. - s * .5);
	}
	return sum * sin(life * 3.14159) * mix(vec3(.15, .6, 1.), vec3(.3, .95, .85), fract(i * .61));
}

float bed(vec2 p) {
	return fbm3(p * .35) * .9 + fbm3(p * 1.6) * .22 + sin(p.y * 7. + fbm3(p * .6) * 6.) * .03;
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = (gl_FragCoord.xy - .5 * u_res) / u_res.y;
	float aspect = u_res.x / u_res.y;

	/* Water colour: sunlight after its path down to this pixel's depth, plus the sideways path to the eye. */
	float span = 16. + u_m * .5;
	float z = max(0., u_m + 3. + (.5 - uv.y) * span);
	vec3 light = exp(-ABSORB * (z + 34.));
	vec3 col = light * vec3(.5, .8, .95) * .78 + vec3(.006, .02, .04) * exp(-u_m / 400.) + vec3(.002, .006, .014) * (.6 + .4 * uv.y);
	/* Scattered glow that outlasts the direct light a little, so the twilight has an overhead. */
	col += vec3(.0, .012, .05) * exp(-u_m / 700.) * smoothstep(-.6, .6, p.y);

	/* The underside of the surface. */
	if (u_m < 60.) {
		vec3 rd = normalize(vec3(p.x, p.y + .2, 1.1));
		if (rd.y > .02) {
			float h = 1.4 + u_m * .45;
			float t = h / rd.y;
			vec2 sp = rd.xz * t;
			float c = caustic(sp * 1.5 + vec2(0., u_clock * .12), u_clock * .5);
			float swell = fbm3(sp * .35 + vec2(u_clock * .1, 0.));
			float window = smoothstep(.2, .66, rd.y + (swell - .5) * .3);
			vec3 sky = mix(vec3(.08, .34, .5), vec3(.62, .86, .92), window);
			vec3 surf = sky * (.5 + .5 * swell) + c * vec3(.55, .85, .95) * (.25 + .6 * window);
			float fade = exp(-t * .1) * exp(-u_m / 14.) * smoothstep(.03, .2, rd.y);
			col = mix(col, surf, fade);
		}
	}

	/* Shafts of sun, fanning from above the frame. */
	float shafts = exp(-u_m / 75.);
	if (shafts > .004) {
		float a = atan(p.x - .12 * aspect, 1.7 - p.y);
		float r = noise(vec2(a * 16., u_clock * .22)) * noise(vec2(a * 41. + 3., u_clock * .35));
		r = smoothstep(.12, .7, r);
		col += r * shafts * smoothstep(-.75, .45, p.y) * vec3(.3, .75, .95) * .2;
	}

	/* The lamp we carry: only matters once nothing else is left. */
	float beam = u_floor * exp(-dot(p - vec2(0., -.22), p - vec2(0., -.22)) * 3.5);

	/* Seabed, coming up out of the black. */
	if (u_floor > .001) {
		vec3 rd = normalize(vec3(p.x, p.y - .16, 1.));
		if (rd.y < -.01) {
			float eye = mix(18., 2.1, smoothstep(0., 1., u_floor));
			float t = eye / -rd.y;
			vec2 fp = vec2(rd.x * t, t + u_clock * .03);
			float here = bed(fp);
			float lit = clamp(.5 + (here - bed(fp + vec2(.14, .1))) * 7., 0., 1.);
			vec2 off = vec2(rd.x * t, t - 6.);
			float pool = exp(-dot(off * vec2(1., .7), off * vec2(1., .7)) * .075);
			vec3 lamp = vec3(1., .95, .86) * exp(-vec3(.17, .075, .068) * (t + 1.)) * pool;
			vec3 ground = mix(vec3(.46, .44, .41), vec3(.66, .63, .58), fbm3(fp * 2.3) * .7 + noise(fp * 11.) * .3) * (.12 + .88 * lit) * lamp * 1.5;
			col = mix(col, ground, smoothstep(.01, .06, -rd.y));
		}
	}

	/* Marine snow: three planes, the nearest out of focus. */
	float density = mix(.06, .34, smoothstep(20., 1500., u_m));
	vec3 mote = light * vec3(.9, 1., 1.) * .9 + vec3(.035, .05, .065) + beam * vec3(.3, .36, .36);
	col += mote * disc(p, 30., .012, .16, .07, 3., density) * .5;
	col += mote * disc(p, 15., .02, .3, .09, 11., density) * .55;
	col += mote * disc(p, 5., .035, .6, .3, 23., density * .7) * .13;

	/* Bioluminescence: the only light the midnight zone makes for itself. */
	float living = smoothstep(450., 1300., u_m) * (1. - .7 * u_floor);
	if (living > .003) {
		vec3 glow = sparks(p, 5., .25, 7.) + sparks(p, 9., .14, 19.) * .6;
		for (int i = 0; i < 3; i++) glow += chain(p, float(i));
		col += glow * living * .8;
	}

	col *= 1. - .35 * pow(length((uv - .5) * vec2(1., .8)), 2.2);
	col = pow(max(col, 0.), vec3(.82));
	/* Deep water on a screen goes electric; hold it back to the film's slate blue. */
	float luma = dot(col, vec3(.2126, .7152, .0722));
	col = mix(vec3(luma) * vec3(.75, 1.05, 1.3), col, mix(.9, .62, smoothstep(10., 120., u_m)));
	col += (hash(gl_FragCoord.xy + fract(u_clock * 7.) * 311.) - .5) * 2.2 / 255.;
	gl_FragColor = vec4(col, 1.);
}
