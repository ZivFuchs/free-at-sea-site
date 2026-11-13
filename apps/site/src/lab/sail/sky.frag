precision highp float;

uniform vec3 uSun;
uniform float uTime;
varying vec3 vDir;

float hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * .1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3. - 2. * f);
	return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}

/* After sunset: indigo overhead, mauve, then a band of ember where the sun went down. */
vec3 sky(vec3 d) {
	float h = max(d.y, 0.);
	vec3 sun = normalize(vec3(uSun.x, 0., uSun.z));
	float toward = max(dot(normalize(vec3(d.x, 0., d.z)), sun), 0.);
	vec3 col = mix(vec3(.33, .3, .44), vec3(.055, .075, .17), smoothstep(0., .55, h));
	vec3 low = mix(vec3(.5, .4, .5), vec3(.98, .6, .38), pow(toward, 3.));
	col = mix(col, low, exp(-h * 7.));
	col += vec3(1., .5, .25) * pow(toward, 14.) * exp(-h * 16.) * .32;
	return col;
}

void main() {
	vec3 d = normalize(vDir);
	vec3 col;
	if (d.y >= 0.) {
		col = sky(d);
	} else {
		vec2 p = d.xz / -d.y;
		float chop = noise(vec2(p.x * .9, p.y * 5.) + vec2(uTime * .12, uTime * .35)) - .5;
		vec3 r = normalize(vec3(d.x, -d.y + chop * .05, d.z));
		float fresnel = .08 + .82 * pow(1. + d.y, 6.);
		col = mix(vec3(.022, .04, .085), sky(r), fresnel * (.85 + chop * .5));
		col = mix(col, sky(vec3(d.x, 0., d.z)) * .82, exp(d.y * 55.));
	}
	col += (hash(gl_FragCoord.xy) - .5) / 255.;
	gl_FragColor = vec4(col, 1.);
}
