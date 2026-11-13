uniform sampler2D u_caustic;
uniform sampler2D u_field;
uniform vec2 u_fieldSize;
uniform vec4 u_rect;
uniform float u_focus;
uniform float u_texel;
uniform float u_gain;
uniform float u_dispersion;
uniform vec2 u_res;
uniform vec2 u_buf;
uniform float u_scroll;
uniform float u_time;
uniform float u_deep;
uniform vec3 u_shallow;
uniform vec3 u_mid;
uniform vec3 u_abyss;
out vec4 o;

vec3 light(vec2 px, float soft) {
	vec2 uv = vec2(px.x, u_res.y - px.y) / u_res;
	vec2 r = soft / u_buf;
	vec3 c = texture(u_caustic, uv).rgb * 2.;
	c += texture(u_caustic, uv + vec2(r.x, 0.)).rgb;
	c += texture(u_caustic, uv - vec2(r.x, 0.)).rgb;
	c += texture(u_caustic, uv + vec2(0., r.y)).rgb;
	c += texture(u_caustic, uv - vec2(0., r.y)).rgb;
	return c / 6. * 4.;
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_buf;
	vec2 page = vec2(uv.x, 1. - uv.y) * u_res + vec2(0., u_scroll);
	float deep = u_deep;

	/* Sand: ripple marks and grain, fading as the floor falls away. */
	float marks = sin(page.y * .085 + fbm(page * .011) * 7. + sin(page.x * .012) * 1.4);
	float grain = hash(floor(page * 1.5)) - .5;
	float sand = 1. + (marks * .035 + grain * .05 + (fbm3(page * .004) - .5) * .14) * (1. - deep);

	vec3 ground = mix(mix(u_shallow, u_mid, smoothstep(0., .55, deep)), u_abyss, smoothstep(.4, 1., deep));

	/* The lens over the words, as a map from seabed back to surface: px came from px − k∇φ, and gathers
	 * det(I − k∇∇φ) = 1 + k(words − halo) + k² det(∇∇φ) times the light. Exact where the letters are, so they stay sharp. */
	vec2 tuv = (page - vec2(0., u_scroll) - u_rect.xy) / u_rect.zw;
	vec2 edge = smoothstep(0., .12, tuv) * smoothstep(0., .12, 1. - tuv);
	float lens = u_focus * edge.x * edge.y;
	/* The surface never quite holds still: the letters' edges swim by a pixel or two. */
	vec2 swim = vec2(fbm3(page * .012 + u_time * .21), fbm3(page.yx * .012 - u_time * .17)) - .5;
	tuv += swim * 6. / u_rect.zw;
	vec3 field = texture(u_field, tuv).rgb;
	vec2 t = 1. / u_fieldSize;
	vec2 gx = (texture(u_field, tuv + vec2(t.x, 0.)).rg - texture(u_field, tuv - vec2(t.x, 0.)).rg) * .5;
	vec2 gy = (texture(u_field, tuv + vec2(0., t.y)).rg - texture(u_field, tuv - vec2(0., t.y)).rg) * .5;
	float curl = gx.x * gy.y - .25 * (gx.y + gy.x) * (gx.y + gy.x);

	vec2 here = page - vec2(0., u_scroll);
	float soft = mix(1.3, 5., deep);
	vec3 c;
	float glow = 0.;
	for (int i = 0; i < 3; i++) {
		float k = u_gain * lens * (1. + float(i - 1) * u_dispersion);
		float gathered = max(1. + k * field.b + k * k * curl, 0.);
		c[i] = light(here - k * field.rg * u_texel, soft)[i] * gathered;
		glow += max(gathered - 1., 0.) / 3.;
	}
	float reach = mix(.82, .3, smoothstep(0., .9, deep));
	/* Gathered light keeps its full strength at any depth; the halo it was borrowed from fades with the rest. */
	vec3 lit = 1. + max(c - 1., 0.) * mix(reach, 1., lens) + min(c - 1., 0.) * reach;

	vec3 col = ground * sand * (.57 + .47 * lit);
	/* Where rays pile up the sand bleaches to warm white. */
	col += max(lit - 1.5, 0.) * vec3(1., .97, .88) * mix(.2, .1, deep);

	/* Down here the gathered light has to carry the words on its own. */
	col += glow * lens * vec3(.42, .72, .86) * deep * .34;

	vec2 v = uv - .5;
	col *= 1. - .16 * dot(v, v);
	col += (hash(gl_FragCoord.xy + fract(u_time) * 91.) - .5) / 255.;
	o = vec4(col, 1.);
}
