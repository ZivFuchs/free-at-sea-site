#define HULLS 12

uniform float u_time;
uniform float u_day;
uniform vec3 u_paper;
uniform vec3 u_line;
uniform vec3 u_deep;
uniform vec3 u_hulls[HULLS];
varying vec3 vWorld;

float grid(vec2 p, float cell) {
	vec2 q = p / cell;
	vec2 g = abs(fract(q - .5) - .5) / fwidth(q);
	return 1. - min(min(g.x, g.y), 1.);
}

float swell(vec2 p) {
	float t = u_time;
	return noise(p * .11 + vec2(t * .16, t * .1)) * .9
		+ noise(p * .37 - vec2(t * .22, -t * .3)) * .32
		+ noise(p * 1.3 + vec2(-t * .4, t * .5)) * .1;
}

void main() {
	vec2 p = vWorld.xz;
	vec3 toCam = cameraPosition - vWorld;
	float dist = length(toCam);
	vec3 V = toCam / dist;

	float fade = exp(-dist / 320.);
	float lines = grid(p, 10.) * .09 * exp(-dist / 150.) + grid(p, 50.) * .2 * fade;
	vec3 draft = u_paper + u_line * lines;

	float e = .25;
	float calm = 1. / (1. + dist * .006);
	vec3 N = normalize(vec3(
		(swell(p - vec2(e, 0.)) - swell(p + vec2(e, 0.))) * calm,
		e * 1.6,
		(swell(p - vec2(0., e)) - swell(p + vec2(0., e))) * calm
	));
	float fresnel = .03 + .97 * pow(1. - max(dot(N, V), 0.), 5.);
	vec3 R = reflect(-V, N);
	R.y = abs(R.y);
	vec3 water = mix(u_deep, skyColor(R), fresnel);
	float s = max(dot(R, u_sun), 0.);
	water += u_glow * (pow(s, 900.) * 3. + pow(s, 90.) * .22);

	float shade = 0.;
	for (int i = 0; i < HULLS; i++) {
		float d = length(p - u_hulls[i].xy);
		shade = max(shade, 1. - smoothstep(u_hulls[i].z * .85, u_hulls[i].z * 1.7, d));
	}
	water *= 1. - .38 * shade;
	water = mix(water, u_horizon, smoothstep(250., 2600., dist));

	gl_FragColor = vec4(mix(draft, water, u_day), 1.);
	#include <colorspace_fragment>
}
