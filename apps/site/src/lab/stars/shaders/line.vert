attribute vec3 a_dir;
uniform mat3 u_m;
uniform mat3 u_view;
uniform vec2 u_proj;
varying float v_alt;

void main() {
	vec3 h = u_m * a_dir;
	v_alt = h.z;
	vec3 v = u_view * h;
	gl_Position = vec4(v.xy * u_proj, 0., v.z);
}
