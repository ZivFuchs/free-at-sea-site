uniform float uTime;
uniform float uSize;
uniform vec3 uBox;
attribute float aSeed;
varying float vAlpha;

void main() {
	vec3 p = position;
	p.y -= uTime * (.04 + .05 * aSeed);
	p.x += sin(uTime * .2 + aSeed * 40.) * .15;
	/* Wrap the cloud around the camera so it never runs out. */
	p = cameraPosition + mod(p - cameraPosition + uBox * .5, uBox) - uBox * .5;
	vec4 mv = viewMatrix * vec4(p, 1.);
	float d = -mv.z;
	gl_PointSize = uSize * (.5 + aSeed) / max(d, .3);
	/* Close specks are large and faint, as if out of focus. */
	vAlpha = (.25 + .75 * aSeed) * smoothstep(.2, 1.2, d) * (1. - smoothstep(6., 12., d)) * mix(.35, 1., smoothstep(1., 4., d));
	gl_Position = projectionMatrix * mv;
}
