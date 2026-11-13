uniform sampler2D u_pressure;
uniform sampler2D u_divergence;

void main() {
	float l = texture(u_pressure, vL).x;
	float r = texture(u_pressure, vR).x;
	float t = texture(u_pressure, vT).x;
	float b = texture(u_pressure, vB).x;
	o = vec4((l + r + t + b - texture(u_divergence, vUv).x) * .25, 0., 0., 1.);
}
