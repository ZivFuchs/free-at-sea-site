attribute float aArm;
varying float vT;
varying float vSide;

void main() {
	float t = uv.y;
	float side = uv.x * 2. - 1.;
	float ang = (aArm + .5) * TAU / 4.;
	float c = squeeze(cycle() - .1 - t * .5);
	vec3 p = vec3(cos(ang), 0., sin(ang)) * (.05 + .16 * t);
	p.y = .05 - t * uLen * (1. - .2 * c);
	float loose = t * t;
	p.x += sin(uTime * .6 + t * 4. + aArm * 1.7 + uPhase * 6.) * .1 * loose;
	p.z += cos(uTime * .5 + t * 3.4 + aArm * 2.3) * .1 * loose;
	p += uDrag * loose;

	float w = .13 * (1. - t * .65) * (1. + .45 * sin(t * 24. + aArm * 2.));
	float tw = ang + t * 5. + aArm + sin(uTime * .4 + t * 3.) * .7;
	vec3 across = vec3(cos(tw), .55 * sin(t * 38. - uTime * 1.2 + aArm), sin(tw));
	p += across * w * side;

	vT = t;
	vSide = side;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}
