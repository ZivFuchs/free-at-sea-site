/* Vorticity confinement, plus the two outside forces: a slow ambient current (curl of drifting noise, so it
 * adds no divergence) and the push of the page scrolling past. */
uniform sampler2D u_velocity;
uniform sampler2D u_curl;
uniform float u_confine;
uniform float u_ambient;
uniform float u_push;
uniform float u_dt;
uniform float u_time;
uniform float u_aspect;

float stream(vec2 p) {
	return noise(p * 1.7 + vec2(u_time * .021, -u_time * .016)) + .5 * noise(p * 4.1 - vec2(u_time * .034, u_time * .027));
}

void main() {
	float l = texture(u_curl, vL).x;
	float r = texture(u_curl, vR).x;
	float t = texture(u_curl, vT).x;
	float b = texture(u_curl, vB).x;
	float c = texture(u_curl, vUv).x;
	vec2 force = .5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
	force = force / (length(force) + 1e-4) * u_confine * c;
	force.y *= -1.;

	vec2 p = vec2(vUv.x * u_aspect, vUv.y);
	float e = .02;
	float s = stream(p);
	vec2 current = vec2(stream(p + vec2(0., e)) - s, s - stream(p + vec2(e, 0.))) / e;

	vec2 v = texture(u_velocity, vUv).xy;
	vec2 drive = u_ambient * (current + vec2(.35, .1));
	v += force * u_dt + (drive - v) * step(length(v), length(drive) * 2.) * min(u_dt * .6, 1.);
	v.y += u_push * (.4 + 1.2 * noise(p * 5. + u_time * .1));
	o = vec4(v, 0., 1.);
}
