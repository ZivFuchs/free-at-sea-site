uniform vec4 uWaves[6];
uniform vec3 uDeep;
uniform vec3 uScatter;
uniform float uFog;
varying vec3 vWorld;
varying vec2 vP0;
varying float vH;

/* Mirror lobe that widens with unresolved roughness, stretched towards the viewer as real glitter is. */
float glint(vec3 r, vec3 light, float rough) {
	vec3 dv = r - light;
	float m = dot(dv, dv) + 6. * rough * dv.x * dv.x;
	return exp(-.5 * mix(2600., 70., rough) * m) * mix(4.5, 1.1, rough);
}

void main() {
	vec3 toCam = cameraPosition - vWorld;
	float dist = length(toCam);
	vec3 V = toCam / dist;
	// Waves smaller than a pixel stop tilting the normal and become roughness instead.
	float fp = length(fwidth(vP0));
	vec2 slope = vec2(0.);
	float lost = 0.;

	for (int i = 0; i < 6; i++) {
		vec4 w = uWaves[i];
		float k = TAU / w.z;
		float keep = 1. - smoothstep(.15 * w.z, .5 * w.z, fp);
		slope += w.xy * (w.w * cos(k * (dot(w.xy, vP0) - sqrt(9.8 / k) * uTime)) * keep);
		lost += w.w * w.w * (1. - keep);
	}

	vec2 q = vP0 + 1.6 * vec2(noise(vP0 * .08 + uTime * .03), noise(vP0.yx * .08 - uTime * .03));
	for (int i = 0; i < 10; i++) {
		float fi = float(i);
		float len = 5.6 * pow(.74, fi) * (1. + .22 * sin(fi * 5.1));
		float a = 1.5708 + sin(fi * 2.399 + 1.) * .85;
		vec2 d = vec2(cos(a), sin(a));
		float k = TAU / len;
		float keep = 1. - smoothstep(.15 * len, .5 * len, fp);
		// Each train comes and goes in groups, which breaks the lattice a plain sum of sines makes.
		float group = .35 + 1.3 * noise(q * (.5 / len) + fi * 7.3 + uTime * .02);
		slope += d * (.031 * group * cos(k * (dot(d, q) - sqrt(9.8 / k) * uTime) + fi * 1.7) * keep);
		lost += .0023 * (1. - keep);
	}

	float rough = clamp(sqrt(lost) * 5., 0., 1.);
	vec3 N = normalize(vec3(-slope.x, 1., -slope.y));
	float fresnel = (.02 + .98 * pow(1. - max(dot(N, V), 0.), 5.)) * mix(1., .72, rough);

	vec3 R = reflect(-V, N);
	R.y = abs(R.y);
	vec3 mirror = normalize(R + vec3(0., rough * .07, 0.));
	vec3 sky = atmosphere(mirror) + uSun * exp(-acos(clamp(dot(mirror, uSunDir), -1., 1.)) * 9.) * .1;

	float crest = smoothstep(-.5, 1., vH);
	vec3 body = mix(uDeep, uScatter, crest * .22);

	vec3 c = mix(body, sky, fresnel);
	c += uSun * glint(R, uSunDir, rough) + uMoon * glint(R, uMoonDir, rough) * .7;

	vec3 haze = atmosphere(normalize(vec3(-V.x, .004, -V.z)));
	c = mix(c, haze, 1. - exp(-dist * uFog));

	gl_FragColor = vec4(film(c), 1.);
}
