precision highp float;

uniform vec3 uFog;

varying vec2 vUv;
varying float vPhase;
varying float vFlash;
varying float vSoft;
varying float vFog;
varying float vLight;

void main() {
	/* x: -1 tail tip → 1 snout. y: -.5 belly → .5 back. */
	vec2 q = vec2(vUv.x * 2. - 1., vUv.y - .5);
	q.y += sin(vPhase - q.x * 2.2) * .11 * smoothstep(.35, -1., q.x);

	float taper = mix(.55, 1., smoothstep(-.5, .25, q.x));
	float body = length(vec2((q.x - .2) / .72, q.y / (.19 * taper))) - 1.;
	float t = clamp((-.42 - q.x) / .5, 0., 1.);
	float fork = mix(.035, .26, t) - abs(q.y);
	float notch = (q.x + .78) * .9 + abs(q.y) * .2;
	float tail = (q.x < -.42 && q.x > -.95) ? min(fork, notch + .16) : -1.;

	float edge = max(fwidth(q.y) * 1.2, vSoft);
	float cover = max(smoothstep(edge / .19, -edge / .19, body), smoothstep(-edge, edge, tail));
	if (cover < .01) discard;

	vec3 back = vec3(.07, .15, .23);
	vec3 flank = vec3(.6, .73, .82);
	vec3 belly = vec3(.85, .92, .96);
	float h = q.y / (.19 * taper);
	vec3 col = mix(belly, flank, smoothstep(-.9, -.1, h));
	col = mix(col, back, smoothstep(.15, .8, h));
	col += vec3(.9, .95, 1.) * vFlash * exp(-h * h * 3.) * .7;
	col *= vLight;

	float fore = step(.001, vSoft);
	col = mix(col, uFog, max(vFog, fore * .55));
	float alpha = cover * (1. - vFog * .92) * mix(.92, .3, fore);
	gl_FragColor = vec4(col * alpha, alpha);
}
