uniform sampler2D u_velocity;

void main() {
	float l = texture(u_velocity, vL).x;
	float r = texture(u_velocity, vR).x;
	float t = texture(u_velocity, vT).y;
	float b = texture(u_velocity, vB).y;
	o = vec4(.5 * (r - l + t - b), 0., 0., 1.);
}
