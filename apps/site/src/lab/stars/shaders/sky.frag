uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_tan;
/* view → horizon, horizon → equatorial */
uniform mat3 u_viewT;
uniform mat3 u_mT;
uniform vec3 u_sun;
uniform float u_dark;

const vec3 GNP = vec3(-.8677, -.1980, .4560);
const vec3 GC = vec3(-.0549, -.8734, -.4838);
const vec3 LMC = vec3(.0547, .3417, -.9382);
const vec3 SMC = vec3(.2879, .0675, -.9553);

float milkyWay(vec3 e) {
	float b = dot(e, GNP);
	float x = dot(e, GC);
	float y = dot(e, cross(GNP, GC));
	float w = .11 + .09 * max(x, 0.);
	float band = exp(-b * b / (w * w));
	vec2 p = vec2(x * 3. + b * 9., y * 3. - b * 7.);
	float cloud = fbm(p * 1.6 + 4.);
	float rift = smoothstep(.42, .7, fbm(p * 2.7 + 11.)) * exp(-b * b / .006);
	float glow = band * (.3 + .7 * smoothstep(-.6, 1., x)) * (.35 + cloud) * (1. - .75 * rift);
	float lmc = exp(-(1. - dot(e, LMC)) / .0022) * (.6 + .8 * fbm(e.xy * 40.));
	float smc = exp(-(1. - dot(e, SMC)) / .0007) * .8;
	return glow + .55 * lmc + .4 * smc;
}

/* `d`: unit direction in horizon coordinates, above the horizon. */
vec3 sky(vec3 d, float stars) {
	float alt = max(d.z, 0.);
	float low = exp(-alt * 5.5);
	vec3 col = mix(vec3(.0035, .006, .016), vec3(.012, .021, .04), low);
	col += stars * u_dark * vec3(.48, .56, .76) * .12 * milkyWay(u_mT * d) * (1. - .8 * low);

	float twilight = 1. - u_dark;
	float toward = dot(normalize(d.xy), normalize(u_sun.xy));
	float near = pow(max(toward, 0.), 2.5);
	col += twilight * mix(vec3(.006, .018, .055), vec3(.014, .04, .1), low) * (.5 + .5 * toward);
	col += twilight * near * near * exp(-alt * 11.) * vec3(.3, .14, .06);
	col += twilight * near * exp(-alt * 3.5) * vec3(.02, .05, .09);
	return col;
}

void main() {
	vec2 ndc = gl_FragCoord.xy / u_res * 2. - 1.;
	vec3 d = u_viewT * normalize(vec3(ndc * u_tan, 1.));
	vec3 col;

	if (d.z >= 0.) {
		col = sky(d, 1.);
	} else {
		/* Sea: the sky mirrored in a slow swell, darker, hazing into the horizon. */
		vec2 q = d.xy / max(-d.z, .004);
		float t = u_time * .12;
		vec2 slope = vec2(
			sin(q.y * .9 + t * 2.) * .5 + noise(q * vec2(.6, 2.2) + vec2(t, -t * .7)) - .5,
			sin(q.y * .37 - t * 1.3) + noise(q * vec2(.9, 3.1) - vec2(t * .6, t)) - .5
		);
		vec3 r = normalize(vec3(d.xy + slope * .05, -d.z + slope.y * .02));
		float fresnel = .18 + .82 * pow(1. - r.z, 4.);
		col = sky(r, .7) * fresnel + vec3(.001, .002, .005);
		float swell = sin(q.y * .9 + t * 2. + noise(q * .3) * 3.) * .5 + .5;
		col *= .82 + .3 * swell * exp(d.z * 6.);
		col = mix(col, sky(vec3(d.xy, 0.), 0.) * .8, exp(d.z * 60.));
	}

	col += (hash(gl_FragCoord.xy + fract(u_time) * 91.) - .5) / 255.;
	gl_FragColor = vec4(pow(max(col, 0.), vec3(1. / 2.2)), 1.);
}
