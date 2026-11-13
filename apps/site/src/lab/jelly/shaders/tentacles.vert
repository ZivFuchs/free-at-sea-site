attribute float aU;
attribute float aT;
attribute float aSeed;
varying float vT;

void main() {
	vec3 p = bell(aU, 1., 1.);
	float c = squeeze(cycle() - .18 - aT * .8);
	float loose = aT * aT;
	p.xz *= 1. - (.2 + .5 * aSeed) * smoothstep(0., .7, aT);
	p.y -= aT * uLen * (.35 + 1.1 * aSeed * aSeed) * (1. - .14 * c);
	float k = 3. + 5. * fract(aSeed * 7.3);
	p.x += sin(uTime * .45 + aT * k + aSeed * 30.) * (.1 + .25 * fract(aSeed * 3.7)) * loose;
	p.z += cos(uTime * .4 + aT * k * .8 + aSeed * 17.) * (.1 + .25 * fract(aSeed * 5.1)) * loose;
	p.x += sin(aT * 9. + aSeed * 50. - uTime * .7) * .03 * aT;
	p += uDrag * loose * 1.6;
	vT = aT;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}
