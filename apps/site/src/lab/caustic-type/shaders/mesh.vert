#version 300 es
precision highp float;

/* One vertex per light ray: starts on the water surface, lands on the seabed where refraction sends it. */
in vec2 a_uv;

uniform vec2 u_res;
uniform float u_scroll;
uniform float u_time;
uniform float u_unit;
uniform float u_refract;
uniform float u_ior;
uniform vec4 u_rect;
uniform float u_focus;
uniform vec4 u_poke[3];

out vec2 v_old;

float surface(vec2 p) {
	float t = u_time;
	p += .32 * vec2(sin(p.y * .83 + t * .23), cos(p.x * .71 - t * .19));
	p += .11 * vec2(cos(p.y * 2.3 - t * .31), sin(p.x * 2.1 + t * .27));
	float h = 0.;
	float f = 1.25;
	for (int i = 0; i < 9; i++) {
		float a = float(i) * 2.399 + .6;
		h += sin(dot(vec2(cos(a), sin(a)), p) * f + t * (.42 + .2 * sqrt(f)) + float(i) * 1.7) / pow(f, 1.24);
		f *= 1.27;
	}
	return h;
}

/* A tap's ring, in page px. */
float pokes(vec2 page) {
	float h = 0.;
	for (int i = 0; i < 3; i++) {
		float age = u_time - u_poke[i].z;
		if (age < 0. || age > 5.) continue;
		float r = length(page - u_poke[i].xy) - age * 150.;
		h += u_poke[i].w * exp(-age * .9) * cos(r * .09) * exp(-r * r / 2600.);
	}
	return h;
}

void main() {
	vec2 px = a_uv * u_res;
	vec2 page = px + vec2(0., u_scroll);
	vec2 w = page / u_unit;

	const float E = .012;
	float h0 = surface(w);
	vec2 g = vec2(surface(w + vec2(E, 0.)) - h0, surface(w + vec2(0., E)) - h0) / E;

	float p0 = pokes(page);
	g += vec2(pokes(page + vec2(1., 0.)) - p0, pokes(page + vec2(0., 1.)) - p0);

	vec2 tuv = (px - u_rect.xy) / u_rect.zw;
	vec2 edge = smoothstep(0., .3, tuv) * smoothstep(0., .3, 1. - tuv);

	/* Over the words the water stills, so the lens below them has clean light to work with. */
	vec2 d = u_refract * g * (1. - .5 * u_focus * edge.x * edge.y);

	v_old = px;
	vec2 landed = (px + d * u_ior) / u_res;
	gl_Position = vec4(landed.x * 2. - 1., 1. - landed.y * 2., 0., 1.);
}
