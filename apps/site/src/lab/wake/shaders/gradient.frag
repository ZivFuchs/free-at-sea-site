uniform sampler2D u_pressure;
uniform sampler2D u_velocity;

void main() {
	float l = texture(u_pressure, vL).x;
	float r = texture(u_pressure, vR).x;
	float t = texture(u_pressure, vT).x;
	float b = texture(u_pressure, vB).x;
	o = vec4(texture(u_velocity, vUv).xy - .5 * vec2(r - l, t - b), 0., 1.);
}
