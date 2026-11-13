uniform mat4 uInvProj;
uniform mat4 uCamWorld;
varying vec3 vDir;

void main() {
	vec4 v = uInvProj * vec4(position.xy, 1., 1.);
	vDir = mat3(uCamWorld) * (v.xyz / v.w);
	gl_Position = vec4(position.xy, 1., 1.);
}
