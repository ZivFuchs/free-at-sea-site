uniform vec2 u_res;
uniform float u_time;
/* uv-space, y up */
uniform float u_hz;
uniform vec2 u_sun;
uniform vec2 u_moon;
uniform float u_moonK;
uniform float u_moonTilt;
uniform float u_sunAlt;
uniform float u_moonAlt;
uniform float u_stars;
uniform float u_moonlight;
uniform float u_pan;
uniform vec3 u_zenith;
uniform vec3 u_horizon;
uniform vec3 u_seaFar;
uniform vec3 u_seaNear;
uniform vec3 u_glow;

const float DISC = .026;
const vec3 MOON = vec3(.95, .94, .88);

float stars(vec2 p, float density) {
	vec2 id = floor(p);
	float seed = hash(id);
	if (seed < density) return 0.;
	vec2 o = .5 + (hash2(id) - .5) * .7;
	float d = length(fract(p) - o);
	float mag = pow(hash(id + 9.3), 5.);
	float twinkle = .8 + .2 * sin(u_time * (1. + 2. * seed) + seed * 40.);
	return (1. - smoothstep(0., .05 + .12 * mag, d)) * (.25 + .75 * mag) * twinkle;
}

/* Glitter under a light at x: a tight column at the horizon, breaking into dashes towards the viewer. */
float glitter(float dx, float depth, float rough) {
	float width = .01 + depth * (.07 + .2 * rough);
	float path = exp(-dx * dx / (width * width));
	vec2 sp = vec2(dx / (depth + .08) * 9., log(depth + .02) * 46.);
	float sparkle = noise(sp + vec2(u_time * .3, -u_time * .8));
	sparkle = smoothstep(.5, .9, sparkle * (.75 + .5 * noise(sp * .37 + u_time * .15)));
	return path * (.16 + .95 * sparkle) * exp(-depth * 2.6);
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	float asp = u_res.x / u_res.y;
	float sunUp = smoothstep(-1.1, .2, u_sunAlt);
	float moonUp = smoothstep(-1.3, .4, u_moonAlt);
	float twilight = smoothstep(-15., -5., u_sunAlt) * (1. - smoothstep(6., 22., u_sunAlt));
	float low = 1. - smoothstep(4., 30., u_sunAlt);
	vec3 sunCol = mix(vec3(1., .98, .93), u_glow, low * .7);
	vec2 sunAt = vec2(u_sun.x, max(u_sun.y, u_hz));
	vec3 col;

	if (uv.y >= u_hz) {
		float h = (uv.y - u_hz) / (1. - u_hz);
		col = mix(u_horizon, u_zenith, smoothstep(0., 1., pow(h, .6)));

		vec2 ds = (uv - sunAt) * vec2(asp, 1.);
		col = mix(col, u_glow, exp(-length(ds * vec2(.5, 1.8)) * 3.4) * twilight * .6);
		float d = length((uv - u_sun) * vec2(asp, 1.));
		col += sunCol * exp(-d * mix(11., 16., low)) * mix(.42, .28, low) * sunUp;
		col = mix(col, sunCol * 1.15, (1. - smoothstep(DISC - .003, DISC, d)) * sunUp);

		float extinction = smoothstep(0., .22, h);
		vec2 sp = vec2((uv.x + u_pan) * asp, uv.y);
		float s = stars(sp * 70., .93) + stars(sp * 150. + 31., .9) * .5;
		col += vec3(.85, .9, 1.) * s * u_stars * extinction;

		vec2 dm = (uv - u_moon) * vec2(asp, 1.) / (DISC * 1.25);
		float r = length(dm);
		if (r < 1.2 && moonUp > 0.) {
			float t = radians(u_moonTilt);
			vec2 bright = vec2(-sin(t), cos(t));
			float x = dot(dm, bright);
			float y = dot(dm, vec2(bright.y, -bright.x));
			float lit = smoothstep(-.05, .05, x + (2. * u_moonK - 1.) * sqrt(max(1. - y * y, 0.)));
			float disc = 1. - smoothstep(.94, 1., r);
			float night = 1. - smoothstep(-8., 2., u_sunAlt);
			vec3 face = mix(mix(col, MOON, .8), MOON * (.84 + .22 * fbm3(dm * 2.3 + 4.)), night);
			vec3 shade = col + vec3(.016, .022, .034) * night;
			col = mix(col, mix(shade, face, lit), disc * moonUp);
		}
		col += MOON * exp(-length((uv - u_moon) * vec2(asp, 1.)) * 7.) * .16 * u_moonlight;
	} else {
		float depth = (u_hz - uv.y) / u_hz;
		float z = 1. / (depth + .03);
		vec2 w = vec2((uv.x - .5) * asp * z * .9 + u_pan * 4., z * 1.5);
		col = mix(u_seaFar, u_seaNear, pow(depth, .55));

		float swell = fbm(w * vec2(1.1, 2.6) + vec2(u_time * .04, u_time * .1));
		col *= 1. + (swell - .5) * .34 * smoothstep(0., .25, depth);
		col = mix(col, u_horizon, exp(-depth * 16.) * .5);

		float dxs = (uv.x - u_sun.x) * asp;
		col += u_glow * exp(-dxs * dxs / .2) * exp(-depth * 4.5) * twilight * .3;
		col += sunCol * glitter(dxs, depth, 1. - low) * sunUp * mix(.5, 1., low);
		float dxm = (uv.x - u_moon.x) * asp;
		col += MOON * glitter(dxm, depth, .25) * u_moonlight * .55;
	}

	float n = hash(gl_FragCoord.xy + fract(u_time) * 91.) - .5;
	gl_FragColor = vec4(col + n * .012, 1.);
}
