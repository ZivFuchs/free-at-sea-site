precision highp float;
uniform float uTime;
uniform float uInner;
uniform float uGlow;
uniform float uFade;
uniform float uSoft;
uniform vec3 uTint;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;

#define PI 3.14159265
#define TAU 6.2831853

void main() {
	float u = vUv.x;
	float v = vUv.y;
	float f = 1. - abs(dot(normalize(vN), normalize(vView)));
	float rim = pow(f, 2.4);

	float sharp = mix(90., 10., uSoft);
	float spoke = abs(cos(u * PI * 16.));
	float reach = smoothstep(.34, .6, v) * (1. - smoothstep(.96, 1., v));
	float canal = pow(spoke, sharp) * reach;
	/* Finer branches between the main canals, only near the margin. */
	canal += .5 * pow(abs(cos(u * PI * 48.)), sharp) * smoothstep(.7, .9, v) * (1. - smoothstep(.96, 1., v));
	float ring = smoothstep(.03 + .05 * uSoft, 0., abs(v - .97));

	/* Four horseshoe gonads around the apex, open toward the margin. */
	float th = fract(u * 4.) - .5;
	vec2 q = vec2(th * (TAU / 4.) * sin(v * 1.78), (v - .2) * 1.2);
	float shoe = smoothstep(.04 + .04 * uSoft, 0., abs(length(q) - .085)) * (1. - smoothstep(.03, .08, q.y));

	float inner = step(uInner, .99);
	vec3 col = uTint * (.035 + .09 * f + rim * mix(.8, .12, inner) + canal * mix(.2, .06, inner) + ring * mix(.6, .08, inner));
	col += vec3(.9, .8, 1.) * shoe * mix(.0, .16, inner);

	/* Touched: a band of interference colour runs down the canals. */
	float band = pow(.5 + .5 * sin(v * 14. - uTime * 3.), 3.);
	vec3 irid = mix(vec3(.45, .95, 1.), vec3(.8, .6, 1.), .5 + .5 * sin(v * 9. - uTime * 1.3 + u * TAU));
	col += irid * band * (pow(spoke, 22.) * reach + ring * .5) * uGlow * .5;

	gl_FragColor = vec4(col * (1. + uGlow * .45) * uFade, 1.);
}
