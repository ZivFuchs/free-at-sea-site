uniform vec2 u_res;
uniform float u_time;
uniform float u_scroll;
uniform float u_px;
uniform sampler2D u_map;

/* Painted with overlay: 0.5 leaves the page alone, above it lights, below it shades, and ink stays ink. */
void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec4 m = texture2D(u_map, uv);
	vec2 g = (m.rg - .5) * 2.;
	float h = (m.b - .5) * 2.;

	vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_px;
	p.y += u_scroll;
	p += g * 46.;

	float t = u_time * .5;
	vec2 sway = vec2(fbm3(p * .003 + t * .04), fbm3(p * .003 - t * .04 + 7.3)) - .5;
	vec2 q = p / 46. + sway * 2.2;
	float fine = caustic(q, t);
	float broad = caustic(q * .47 + 4.2, t * .7 + 1.7);
	float net = clamp(fine * .75 + broad * .9, 0., 1.);
	float patch_ = smoothstep(.3, .7, fbm3(p * .0016 - t * .02));

	/* Water dims and cools the sand a touch; where light focuses it comes back to full brightness and past. */
	vec3 water = vec3(.4, .435, .445);
	float light = net * mix(.22, .44, patch_);
	float facet = dot(g, normalize(vec2(-.6, -.8)));
	float shade = facet * .7;

	vec3 warm = vec3(1., .985, .94);
	vec3 cool = vec3(.82, .93, 1.);
	vec3 col = water + warm * light + mix(cool, warm, step(0., shade)) * shade * .5;
	gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}
