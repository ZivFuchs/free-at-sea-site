uniform vec2 u_res;
uniform float u_time;
uniform float u_horizon;
uniform vec3 u_zenith;
uniform vec3 u_glow;
uniform vec3 u_far;
uniform vec3 u_near;
uniform vec3 u_light;
/* x: 0–1 across the frame. y: height above the horizon, in frame heights. */
uniform vec2 u_orb;
uniform float u_radius;
uniform float u_night;
uniform float u_power;

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	float aspect = u_res.x / u_res.y;
	/* Frame heights, origin on the horizon under the centre, y up. */
	vec2 pos = vec2((uv.x - .5) * aspect, u_horizon - (1. - uv.y));
	vec2 orb = vec2((u_orb.x - .5) * aspect, u_orb.y);
	float t = u_time;
	vec3 col;

	if (pos.y > 0.) {
		float h = pos.y / u_horizon;
		col = mix(u_glow, u_zenith, pow(h, .7));
		float d = length(pos - orb);
		col += u_light * (exp(-d * d / .02) * .14 + exp(-d / .2) * .12) * (1. - .5 * u_night);

		vec2 cell = gl_FragCoord.xy / u_res.y * 90.;
		vec2 id = floor(cell);
		float star = step(.965, hash(id)) * (1. - smoothstep(.0, .32, length(fract(cell) - .5 - (hash2(id) - .5) * .5)));
		col += star * u_night * smoothstep(.05, .5, h) * (.55 + .45 * sin(t * (1. + hash(id + 3.) * 2.) + hash(id) * 40.));

		float disc = 1. - smoothstep(u_radius - .0012, u_radius + .0012, d);
		/* The moon keeps a little of its face. */
		float face = 1. - .22 * u_night * fbm3((pos - orb) / u_radius * 1.6 + 5.);
		col = mix(col, mix(u_light, vec3(1.), .7) * face, disc);
	} else {
		float s = -pos.y / (1. - u_horizon);
		/* A camera a little above the water: distance grows fast toward the horizon, but not without end. */
		float z = 1. / (s + .16);
		vec2 w = vec2(pos.x * z, z);
		/* Cycles per pixel of a unit-frequency wave here; octaves finer than a pixel settle to their mean. */
		float grain = z * z / (u_res.y * (1. - u_horizon));

		float swell = fbm3(vec2(w.x * .7, w.y * 1.1 + t * .09));
		float a = mix(.5, noise(vec2(w.x * 5., w.y * 15. + t * .7)), 1. - smoothstep(.12, .45, 15. * grain));
		float b = mix(.5, noise(vec2(w.x * 15. + t * .25, w.y * 46. - t * 1.2)), 1. - smoothstep(.12, .45, 46. * grain));
		float c = mix(.5, noise(vec2(w.x * 38. - t * .3, w.y * 120. + t * 1.6)), 1. - smoothstep(.12, .45, 120. * grain));
		float ripple = a * b * (.35 + 1.3 * c);

		col = mix(u_far, u_near, pow(s, .45)) * (.86 + .34 * (swell - .5));
		/* Grazing water mirrors the sky just above it. */
		col = mix(col, u_glow, exp(-s * 10.) * .62);
		col += u_glow * (ripple - .25) * .22 * (1. - .6 * s);

		float spark = smoothstep(.23, .4, ripple + (swell - .5) * .2);
		float dx = pos.x - orb.x;
		float width = u_radius * .6 + .01 + s * .12;
		float column = exp(-dx * dx / (width * width));
		float reach = mix(1., .22, smoothstep(0., .85, s));
		col += mix(u_light, vec3(1.), .25) * column * (spark * 1.15 + .1 * exp(-s * 5.)) * reach * u_power;
		col += u_light * exp(-dx * dx / (width * width * 12.)) * exp(-s * 2.5) * .06 * u_power;
	}

	float v = length((uv - .5) * vec2(.9, 1.));
	col *= 1. - .22 * v * v;
	gl_FragColor = vec4(col + (hash(gl_FragCoord.xy + 7.) - .5) / 255., 1.);
}
