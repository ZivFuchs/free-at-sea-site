uniform vec2 u_res;
uniform float u_time;
uniform sampler2D u_img;
uniform float u_imgAspect;
uniform float u_horizon;
uniform vec2 u_lean;

/* Hand-placed in image space (y down): the barge and its tender stay rigid while the sea moves. */
const vec2 BARGE = vec2(.497, .612);
const vec2 TENDER = vec2(.655, .67);

float solids(vec2 q) {
	vec2 b = (q - BARGE) / vec2(.078, .052);
	vec2 t = (q - TENDER) / vec2(.024, .018);
	return max(1. - smoothstep(.55, 1., length(b)), 1. - smoothstep(.5, 1., length(t)));
}

/* 0 at the horizon and in the sky, 1 at the bottom edge of the photo. */
float nearness(vec2 q) {
	return clamp((q.y - u_horizon) / (1. - u_horizon), 0., 1.);
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = vec2(uv.x, 1. - uv.y);

	/* object-fit: cover, horizon pinned, pulled in a touch so parallax never runs off the edge. */
	float aspect = u_res.x / u_res.y;
	vec2 span = (aspect > u_imgAspect ? vec2(1., u_imgAspect / aspect) : vec2(aspect / u_imgAspect, 1.)) * .955;
	vec2 pin = vec2(.5, u_horizon);
	vec2 q = (1. - span) * pin + p * span;

	float solid = solids(q);
	float near = mix(nearness(q), nearness(BARGE) + .1, solid);
	q -= u_lean * (near - .3) * vec2(.022, .012);

	float sea = smoothstep(u_horizon + .01, u_horizon + .12, q.y) * (1. - solids(q));
	float d = nearness(q);
	/* The sea plane, seen from above and behind: ripples shrink toward the horizon. */
	vec2 w = vec2((q.x - .5) * u_imgAspect, 1.) / (d * .9 + .1);
	float t = u_time;
	vec2 flow = vec2(
		noise(w * 5. + vec2(t * .22, t * .13)) - .5,
		noise(w * 5. + vec2(-t * .17, t * .2) + 31.) - .5
	) + .5 * vec2(
		noise(w * 13. + vec2(t * .5, -t * .3)) - .5,
		noise(w * 13. + vec2(t * .35, t * .45) + 7.) - .5
	);
	q += flow * sea * (.0016 + .0042 * d);

	vec3 col = texture2D(u_img, vec2(q.x, 1. - q.y)).rgb;

	/* Sun glitter: sparse pinpoints, each winking on its own clock, gathered in slow-moving fields. */
	vec2 c = q * vec2(u_imgAspect * 150., 300.);
	vec2 id = floor(c);
	vec2 f = fract(c) - .5 - (hash2(id) - .5) * .5;
	float point = (1. - smoothstep(.05, .24, length(f * vec2(1., 1.6)))) * step(.84, hash(id + 1.3));
	float wink = pow(.5 + .5 * sin(t * (1.2 + 2.6 * hash(id + 7.)) + 40. * hash(id)), 6.);
	float field = smoothstep(.4, .68, fbm3(w * .9 + vec2(t * .04, -t * .03)));
	col += vec3(.8, .95, 1.) * point * wink * field * sea * smoothstep(.02, .3, d) * .6;

	/* Slow light moving over the swell. */
	col *= 1. + (fbm3(w * 1.3 + vec2(t * .05, t * .03)) - .5) * .12 * sea;

	gl_FragColor = vec4(col + (hash(gl_FragCoord.xy) - .5) / 255., 1.);
}
