/* Adds `u_value` along the stroke from `u_from` to `u_to` with a Gaussian falloff, up to `u_cap` when set. */
uniform sampler2D u_target;
uniform vec2 u_from;
uniform vec2 u_to;
uniform vec3 u_value;
uniform float u_radius;
uniform float u_aspect;
uniform float u_cap;

void main() {
	vec2 scale = vec2(u_aspect, 1.);
	vec2 p = (vUv - u_from) * scale;
	vec2 s = (u_to - u_from) * scale;
	float h = clamp(dot(p, s) / max(dot(s, s), 1e-6), 0., 1.);
	vec2 d = p - s * h;
	vec4 was = texture(u_target, vUv);
	vec4 next = was + vec4(u_value * exp(-dot(d, d) / u_radius), 0.);
	o = u_cap > 0. ? max(was, min(next, vec4(u_cap))) : next;
}
