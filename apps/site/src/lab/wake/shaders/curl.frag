uniform sampler2D u_velocity;

void main() {
	float l = texture(u_velocity, vL).y;
	float r = texture(u_velocity, vR).y;
	float t = texture(u_velocity, vT).x;
	float b = texture(u_velocity, vB).x;
	o = vec4(.5 * (r - l - t + b), 0., 0., 1.);
}
