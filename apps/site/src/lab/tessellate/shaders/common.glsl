uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uDeep;
uniform float uNight;
uniform float uCalm;

/* Height in x, slope (d/dx, d/dz) in yz. `chop` scales the shortest train, which locked cells ignore. */
vec3 swell(vec2 p, float chop) {
	vec3 r = vec3(0.);
	vec2 d; float k; float ph; float a;

	d = normalize(vec2(1., .35)); k = 6.2831853 / 46.; a = .5 * uCalm;
	ph = k * dot(d, p) - .52 * uTime; r.x += a * sin(ph); r.yz += a * k * d * cos(ph);

	d = normalize(vec2(.8, -.6)); k = 6.2831853 / 24.; a = .22 * uCalm;
	ph = k * dot(d, p) - .78 * uTime; r.x += a * sin(ph); r.yz += a * k * d * cos(ph);

	d = normalize(vec2(-.2, 1.)); k = 6.2831853 / 13.; a = .085 * chop * uCalm;
	ph = k * dot(d, p) - 1.1 * uTime; r.x += a * sin(ph); r.yz += a * k * d * cos(ph);

	return r;
}

vec3 sky(vec3 d) {
	float t = pow(clamp(d.y, 0., 1.), .5);
	vec3 c = mix(uHorizon, uZenith, t);
	float s = max(dot(d, uSunDir), 0.);
	return c + uSunCol * (smoothstep(.99988, .99996, s) * 6. + pow(s, 1500.) * .8 + pow(s, 90.) * .1 + pow(s, 8.) * .035);
}

/* Haze toward the horizon only: looking straight down stays clear. */
vec3 haze(vec3 col, vec3 eye, vec3 world) {
	vec3 v = world - eye;
	float d = length(v);
	float level = pow(1. - abs(v.y / d), 6.);
	return mix(col, uHorizon, 1. - exp(-d * .0036 * level));
}

vec3 grade(vec3 c) {
	c = 1. - exp(-c * 1.25);
	return pow(c, vec3(1. / 2.2));
}

float hash21(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * .1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3. - 2. * f);
	return mix(mix(hash21(i), hash21(i + vec2(1., 0.)), u.x), mix(hash21(i + vec2(0., 1.)), hash21(i + vec2(1., 1.)), u.x), u.y);
}
