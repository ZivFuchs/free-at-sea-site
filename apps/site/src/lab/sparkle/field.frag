/* Excitation field: last frame's light, decayed and carried with the page, plus this frame's disturbances. */
uniform sampler2D u_prev;
uniform sampler2D u_mask;
uniform vec2 u_res;
uniform vec2 u_size;
uniform float u_time;
uniform float u_dt;
uniform float u_shift;
uniform float u_scroll;
uniform float u_swash;
uniform float u_write;
uniform float u_ember;
uniform float u_fill;
uniform vec4 u_title;
uniform vec4 u_seg[6];
uniform float u_segPow[6];
uniform vec4 u_rect[4];
uniform float u_rectPow[4];
uniform vec3 u_burst[3];

float segment(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a;
	vec2 ba = b - a;
	return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.));
}

float previous(vec2 uv) {
	if (uv.y < 0. || uv.y > 1.) return 0.;
	return texture2D(u_prev, uv).r;
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = vec2(uv.x, 1. - uv.y) * u_size;
	/* Page coordinates: patterns stay with the content as it scrolls. */
	vec2 q = p + vec2(0., u_scroll);

	vec2 px = 1. / u_res;
	vec2 drift = (vec2(noise(q * .02 + u_time * .15), noise(q * .02 - u_time * .13 + 40.)) - .5) * px * 1.6;
	vec2 from = uv - vec2(0., u_shift) + drift;
	float e = previous(from);
	float around = previous(from + vec2(px.x, 0.)) + previous(from - vec2(px.x, 0.))
		+ previous(from + vec2(0., px.y)) + previous(from - vec2(0., px.y));
	e = mix(e, around * .25, .12);
	e = e * exp(-u_dt / 1.5) - .09 * u_dt;

	float ragged = .35 + 1.1 * noise(q * .09 + u_time * .6);
	for (int i = 0; i < 6; i++) {
		float r = 10. + 22. * u_segPow[i];
		float d = segment(p, u_seg[i].xy, u_seg[i].zw);
		e += min(u_segPow[i] * 1.5, 1.) * exp(-d * d / (r * r)) * ragged;
	}

	for (int i = 0; i < 3; i++) {
		float d = abs(length(p - u_burst[i].xy) - u_burst[i].z);
		e += step(.5, u_burst[i].z) * exp(-d * d / 90.) * ragged * u_dt * 9.;
	}

	float shimmer = pow(noise(q * .16 + vec2(0., u_time * 2.5)), 2.) * 2.2;
	for (int i = 0; i < 4; i++) {
		vec2 half_ = (u_rect[i].zw - u_rect[i].xy) * .5;
		vec2 b = abs(p - (u_rect[i].xy + half_)) - half_;
		float d = abs(length(max(b, 0.)) + min(max(b.x, b.y), 0.));
		e += u_rectPow[i] * exp(-d * d / 26.) * shimmer * u_dt * 3.2;
	}

	float bands = smoothstep(.56, .86, fbm3(q * vec2(.004, .007) + vec2(u_time * .03, 0.)));
	e += u_swash * bands * (.3 + .9 * noise(q * .05 + u_time)) * u_dt * 2.2;

	vec2 t = (p - u_title.xy) / u_title.zw;
	if (t.x > 0. && t.x < 1. && t.y > 0. && t.y < 1.) {
		float m = texture2D(u_mask, t).r;
		float front = exp(-pow((t.x - u_write + .02 * sin(t.y * 9. + u_time * 3.)) / .045, 2.));
		float glint = pow(noise(q * .12 + vec2(u_time * .35, -u_time * .5)), 4.);
		e += m * (front * 9. * u_dt * step(u_write, 1.15) + u_ember * glint * u_dt * 3.2 + u_fill);
	}

	gl_FragColor = vec4(clamp(e, 0., 1.), 0., 0., 1.);
}
