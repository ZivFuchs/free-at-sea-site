precision highp float;

uniform sampler2D uA;
uniform sampler2D uB;
uniform vec4 uFitA;
uniform vec4 uFitB;
uniform float uMix;
uniform float uBeam;
uniform vec3 uSun;

varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;

float hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * .1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

void main() {
	bool lee = gl_FrontFacing;
	vec3 n = normalize(vN) * (lee ? 1. : -1.);
	vec3 sun = normalize(uSun);

	/* Canvas: weave, horizontal panel seams with a stitch line, hemmed edges. */
	vec3 albedo = vec3(.9, .87, .8) * (.955 + .045 * hash(floor(vUv * vec2(560., 430.))));
	float panel = abs(fract(vUv.y * 6. + .5) - .5);
	albedo *= 1. - .13 * (1. - smoothstep(.0, .012, panel));
	albedo *= 1. - .05 * (1. - smoothstep(.02, .03, abs(panel - .035)));
	float edge = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y));
	albedo *= 1. - .16 * (1. - smoothstep(.006, .02, edge));

	/* Dusk: cool sky fill, the low sun glowing through the cloth from behind. */
	vec3 light = vec3(.17, .2, .31) * (.72 + .28 * n.y);
	light += vec3(1., .6, .36) * pow(max(dot(-n, sun), 0.), 1.4) * .34;
	light += vec3(1., .7, .5) * max(dot(n, sun), 0.) * .7;

	/* The projector's rectangle of light, on the lee side; it bleeds through to the back, dimmer. */
	vec2 uv = (vUv - .5) / .93 + .5;
	vec2 soft = smoothstep(vec2(0.), vec2(.012), uv) * smoothstep(vec2(0.), vec2(.012), 1. - uv);
	vec3 film = mix(
		texture2D(uA, uv * uFitA.xy + uFitA.zw).rgb,
		texture2D(uB, uv * uFitB.xy + uFitB.zw).rgb,
		uMix
	);
	film = pow(film, vec3(1.12)) * 1.22;
	float facing = pow(max(dot(n, normalize(vec3(.05, -.06, lee ? 1. : -1.))), 0.), .7);
	float throw = soft.x * soft.y * (1. - .5 * dot(uv - .5, uv - .5)) * facing * (lee ? 1. : .3);

	vec3 col = albedo * (light * (1. - .35 * throw * uBeam) + film * throw * uBeam);
	col += (hash(gl_FragCoord.xy) - .5) / 255.;
	gl_FragColor = vec4(col, 1.);
}
