uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uSun;
uniform vec3 uMoon;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uTime;

/* Sky radiance without discs: also what the water mirrors. */
vec3 atmosphere(vec3 d) {
	float h = max(d.y, 0.);
	vec3 c = mix(uHorizon, uZenith, 1. - exp(-h * 5.));
	float sd = max(dot(d, uSunDir), 0.);
	c += uGlow * (pow(sd, 5.) * exp(-h * 8.) * .7 + pow(sd, 40.) * .3);
	float md = max(dot(d, uMoonDir), 0.);
	c += uMoon * pow(md, 30.) * .05;
	return c;
}

/* Filmic curve (ACES fit), display gamma, and dither against banding in the dark gradients. */
vec3 film(vec3 c) {
	c = (c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14);
	c = pow(clamp(c, 0., 1.), vec3(1. / 2.2));
	return c + (hash(gl_FragCoord.xy + fract(uTime) * 61.) - .5) / 255.;
}
