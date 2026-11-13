uniform vec3 uCloud;
uniform float uClouds;
uniform float uStars;
uniform float uSunSize;
varying vec3 vDir;

float stars(vec3 d) {
	vec3 q = d * 140.;
	vec3 id = floor(q);
	float pick = hash(id.xy + id.z * 37.);
	if (pick < .94) return 0.;
	vec3 o = vec3(hash2(id.xz + 3.), hash(id.yz + 7.)) - .5;
	float r = length(fract(q) - .5 - o * .5);
	float twinkle = .75 + .25 * sin(uTime * (1. + pick * 3.) + pick * 400.);
	return smoothstep(.11, 0., r) * (.3 + .7 * hash(id.zy + 11.)) * twinkle;
}

void main() {
	vec3 d = normalize(vDir);
	vec3 c = atmosphere(d);

	float sa = acos(clamp(dot(d, uSunDir), -1., 1.));
	c += uSun * ((1. - smoothstep(uSunSize * .9, uSunSize, sa)) * 5. + exp(-sa * 30.) * .7 + exp(-sa * 9.) * .1);

	float ma = acos(clamp(dot(d, uMoonDir), -1., 1.));
	float mare = .82 + .18 * noise((d.xy - uMoonDir.xy) * 260.);
	c += uMoon * ((1. - smoothstep(.0135, .015, ma)) * 1.6 * mare + exp(-ma * 45.) * .22 + exp(-ma * 10.) * .035);

	c += vec3(.8, .88, 1.) * stars(d) * uStars * smoothstep(.02, .22, d.y);

	// High cirrus, streaked along the horizon and lit from the sun's side.
	float h = max(d.y, 0.);
	vec2 p = d.xz / (h + .14);
	float n = fbm(p * vec2(.5, 1.5) + vec2(uTime * .003, 0.));
	float cover = smoothstep(.5, .84, n) * smoothstep(.012, .16, h) * uClouds;
	float sd = max(dot(d, uSunDir), 0.);
	c = mix(c, uCloud * (.75 + 1.4 * pow(sd, 5.)) + uSun * pow(sd, 20.) * .08, cover * .42);

	gl_FragColor = vec4(film(c), 1.);
}
