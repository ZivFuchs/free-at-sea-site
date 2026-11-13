attribute float aHigh;
attribute float aFar;
uniform float uSize;
uniform float uTime;
uniform float uDim;
varying float vAlpha;
varying float vHigh;

void main() {
	vec3 n = normalize(mat3(modelMatrix) * position);
	float front = smoothstep(-.05, .3, n.z);
	/* Long slow bands of brightness crossing the open ocean, like swell seen from orbit. */
	float swell = .5 + .5 * sin(dot(position, vec3(2.1, 5.3, 3.7)) * 2.2 - uTime * .45);
	float lit = mix(.27, .62 + .18 * aFar + .2 * swell, aHigh);
	vHigh = aHigh;
	/* Rows bunch up toward the limb: thin them so the edge doesn't burn out. */
	float limb = mix(.45, 1., smoothstep(0., .55, abs(n.z)));
	vAlpha = lit * limb * mix(.07, 1., front) * uDim;
	gl_PointSize = max(1., uSize * mix(.62, 1.1, aHigh) * mix(.7, 1., front));
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
