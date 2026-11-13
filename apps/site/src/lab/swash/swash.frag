uniform vec2 u_res;
uniform float u_time;
/* Height of the water's edge, in screen heights from the bottom. */
uniform float u_front;
/* 1 while the edge advances, 0 while it drains. */
uniform float u_rise;
uniform float u_seed;
uniform float u_amp;

/* x: distance to nearest cell point, y: gap to the second (0 on cell walls). */
vec2 voro(vec2 p) {
	vec2 n = floor(p);
	vec2 f = fract(p);
	float f1 = 8.;
	float f2 = 8.;
	for (int j = -1; j <= 1; j++) {
		for (int i = -1; i <= 1; i++) {
			vec2 g = vec2(float(i), float(j));
			vec2 o = .5 + .4 * sin(u_time * .5 + TAU * hash2(n + g));
			float d = length(g + o - f);
			if (d < f1) {
				f2 = f1;
				f1 = d;
			} else if (d < f2) {
				f2 = d;
			}
		}
	}
	return vec2(f1, f2 - f1);
}

float lace(vec2 p) {
	vec2 w = vec2(fbm3(p * .45 + 3.), fbm3(p * .45 + 11.)) - .5;
	return 1. - smoothstep(.012, .085, voro(p + w * 1.3).y);
}

void over(inout vec4 dst, vec3 col, float a) {
	dst = vec4(col * a + dst.rgb * (1. - a), a + dst.a * (1. - a));
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 q = vec2(uv.x * u_res.x / u_res.y, uv.y);
	float t = u_time;

	float lobes = (noise(vec2(q.x * 1.4 + u_seed * 7.3, t * .08)) - .5) * .13
		+ (noise(vec2(q.x * 4.5 - u_seed * 3.1, t * .15 + 4.)) - .5) * .045
		+ (noise(vec2(q.x * 16., t * .4)) - .5) * .009;
	float d = u_front + lobes * u_amp - uv.y;
	if (d < -.3) {
		gl_FragColor = vec4(0.);
		return;
	}

	vec2 lp = vec2(q.x, q.y - u_front * .6);
	float fine = lace(lp * 34. + 5.);
	float patches = smoothstep(.4, .7, fbm3(lp * 2.5 + vec2(0., t * .05)));
	float fall = 1. - u_rise;
	vec4 col = vec4(0.);

	if (d < 0.) {
		/* Left behind on the sand: a wet sheen, a hairline shadow under the lip, lace and bubbles going out. */
		float wet = exp(d * 16.) * fall;
		float lip = 1. - smoothstep(0., .006, -d);
		over(col, vec3(.02, .07, .11), wet * .16 + lip * .16);
		float bubbles = (1. - smoothstep(.03, .075, voro(lp * 90.).x)) * smoothstep(.5, .75, noise(lp * 14.)) * exp(d * 24.);
		over(col, vec3(1.), clamp(bubbles * .6 + fine * patches * exp(d * 38.) * .6, 0., 1.) * fall);
	} else {
		float depth = smoothstep(0., .28, d);
		vec3 water = mix(vec3(.62, .88, .86), vec3(.1, .5, .58), smoothstep(0., .14, d));
		water = mix(water, vec3(.02, .13, .22), smoothstep(.12, .55, d));
		water += caustic(q * 5., t * .6) * .12 * (1. - depth);
		float lip = smoothstep(0., .003, d);
		over(col, water, mix(.12, 1., depth) * lip);

		float width = mix(.007, .04, u_rise) * (.6 + .8 * noise(vec2(q.x * 7., t * .5)));
		float edge = 1. - smoothstep(width * .4, width, d);
		float froth = exp(-d / .07) * u_rise * (.35 + .65 * fine);
		float adrift = (lace(lp * 15.) * .5 + fine * .3) * patches * (.25 + .75 * exp(-d * 4.));
		over(col, vec3(1.), clamp(edge * (.62 + .38 * fine) + froth * .7 + adrift, 0., 1.) * lip);
	}

	gl_FragColor = col;
}
