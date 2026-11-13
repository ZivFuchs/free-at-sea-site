attribute vec3 color;
attribute float aSize;
attribute float aRange;
attribute float aSeed;
attribute float aKind;

uniform float uScale;
uniform float uFill;
uniform float uTime;
uniform float uReveal;
uniform float uMaxRange;
uniform float uRangeMix;
uniform float uHeightMix;
uniform float uSlice;
uniform float uSlicePos;
uniform vec2 uAxis;
uniform float uDissolve;
uniform vec3 uGround;

varying vec3 vColor;

vec3 rangeRamp(float t) {
	vec3 near = vec3(.78, .97, 1.);
	vec3 mid = vec3(.2, .68, .82);
	vec3 far = vec3(.1, .2, .5);
	return t < .35 ? mix(near, mid, t / .35) : mix(mid, far, (t - .35) / .65);
}

void main() {
	vec3 p = position;
	float d = uDissolve;
	vec3 drift = vec3(sin(aSeed * 91. + uTime * .21), cos(aSeed * 57. + uTime * .17), sin(aSeed * 33. + uTime * .19));
	p += drift * d * (30. + 260. * aSeed);
	p.y += d * d * 160. * aSeed;

	vec4 mv = modelViewMatrix * vec4(p, 1.);
	gl_Position = projectionMatrix * mv;

	float lum = dot(color, vec3(.3, .59, .11));
	vec3 col = color;

	float bands = aRange / 250.;
	float ring = 1. - smoothstep(0., .035, abs(fract(bands + .5) - .5));
	vec3 ranged = rangeRamp(clamp(aRange / uMaxRange, 0., 1.)) * (.3 + 1.5 * lum) + ring * .6;
	ranged = mix(ranged, vec3(1., .78, .5) * (.5 + lum), step(1.5, aKind));
	col = mix(col, ranged, uRangeMix);

	float h = clamp(position.y / 6., 0., 1.);
	vec3 high = mix(vec3(.04, .13, .22) * (.5 + 1.6 * lum), mix(vec3(.25, .8, .9), vec3(1., .96, .88), h), step(1.5, aKind));
	high = mix(high, uGround * 1.6, step(.5, aKind) * (1. - step(1.5, aKind)));
	col = mix(col, high, uHeightMix);

	float slab = 1. - smoothstep(.8, 2.4, abs(dot(position.xz, uAxis) - uSlicePos));
	slab *= step(1.5, aKind);
	col = mix(col, mix(col * mix(1., .5, step(1.5, aKind)), vec3(.85, 1., 1.), slab), uSlice);

	float front = uReveal * uMaxRange * 1.2;
	float seen = 1. - smoothstep(front - 50., front, aRange);
	float edge = exp(-pow((aRange - front) / 45., 2.)) * (1. - step(.999, uReveal));
	col = mix(uGround, col, seen) + vec3(.45, .9, 1.) * edge;

	col = mix(col, uGround * 1.9 + .04, d * .82);
	vColor = col;

	float size = aSize * uScale * mix(1., uFill, 1. - step(1.5, aKind)) / -mv.z;
	size *= mix(1., .35 + .5 * aSeed, d);
	gl_PointSize = clamp(size, 1.3, 72.);
	if (seen + edge < .01 || aSeed < d * .7) gl_Position = vec4(2., 2., 2., 1.);
}
