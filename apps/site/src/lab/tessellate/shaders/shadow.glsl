uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowTexel;
uniform float uShadowBias;

/* 1 in sun, 0 in the shadow of another cell or building. */
float sunlit(vec3 world, vec3 n) {
	vec4 sc = uShadowMatrix * vec4(world + n * .09, 1.);
	vec3 c = sc.xyz / sc.w * .5 + .5;
	if (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1. || c.z > 1.) return 1.;
	// A texel of the map spans more depth the more the surface leans away from the sun.
	float ndl = clamp(dot(n, uSunDir), .06, 1.);
	float bias = uShadowBias * (1. + 2.5 * sqrt(1. - ndl * ndl) / ndl);
	float lit = 0.;
	for (int x = -1; x <= 1; x++) {
		for (int y = -1; y <= 1; y++) {
			lit += step(c.z - bias, texture2D(uShadowMap, c.xy + vec2(float(x), float(y)) * uShadowTexel).r);
		}
	}
	return lit / 9.;
}
