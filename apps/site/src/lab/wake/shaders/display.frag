/* The sea from high above: fine wind ripple over deep blue, bent by the currents; dye reads as aerated
 * turquoise that breaks into foam lace where it is dense. */
uniform sampler2D u_dye;
uniform sampler2D u_velocity;
uniform vec2 u_res;
uniform float u_time;
uniform float u_scroll;

const vec3 DEEP = vec3(.012, .05, .095);
const vec3 SWELL = vec3(.035, .125, .19);
const vec3 AERATED = vec3(.12, .43, .5);
const vec3 FOAM = vec3(.9, .95, .96);
const vec3 INK = vec3(.5, .74, .8);
const vec2 SUN = vec2(-.55, .83);

float ripple(vec2 p) {
	float t = u_time;
	float h = .5 * noise(p * vec2(9., 15.) + vec2(t * .3, t * .18));
	h += .3 * noise(p * vec2(23., 36.) + vec2(-t * .45, t * .38));
	h += .2 * noise(p * vec2(57., 84.) - vec2(t * .7, -t * .55));
	return h;
}

float body(vec2 d) {
	return d.r + .6 * d.g;
}

void main() {
	float aspect = u_res.x / u_res.y;
	vec2 vel = texture(u_velocity, vUv).xy;
	vec2 dye = texture(u_dye, vUv).rg;
	vec2 p = vec2(vUv.x * aspect, vUv.y + u_scroll) - vel * .0009;

	float e = .0035;
	float h = ripple(p);
	vec2 slope = vec2(h - ripple(p + vec2(e, 0.)), h - ripple(p + vec2(0., e))) / e;

	vec2 px = 1.5 / u_res;
	vec2 relief = vec2(
		body(texture(u_dye, vUv - vec2(px.x, 0.)).rg) - body(texture(u_dye, vUv + vec2(px.x, 0.)).rg),
		body(texture(u_dye, vUv - vec2(0., px.y)).rg) - body(texture(u_dye, vUv + vec2(0., px.y)).rg)
	);
	slope = slope * .05 + relief * 3. + vel * .003;

	float lit = dot(slope, SUN);
	float broad = fbm3(p * 1.3 + vec2(u_time * .012, 0.));
	vec3 col = mix(DEEP, SWELL, clamp(.12 + .6 * broad + lit * .9, 0., 1.));
	col += vec3(.5, .62, .7) * pow(max(lit - .3, 0.), 2.) * 1.3 * smoothstep(.35, .75, broad);

	float churn = clamp(dye.r, 0., 1.5);
	col = mix(col, AERATED, smoothstep(.02, .7, churn) * .72);
	float lace = smoothstep(.22, .78, fbm3(p * vec2(34., 46.) + vel * .012 + vec2(0., u_time * .05)));
	float foam = smoothstep(.5, 1.1, churn * (.3 + 1.3 * lace));
	col = mix(col, FOAM, foam * .85);

	float ink = clamp(dye.g, 0., 1.);
	col = mix(col, INK, ink * .5 * (.45 + .9 * lace));

	vec2 v = vUv - .5;
	col *= 1. - .5 * dot(v, v);
	col += (hash(gl_FragCoord.xy + fract(u_time) * 91.) - .5) / 128.;
	o = vec4(max(col, 0.), 1.);
}
