uniform mat4 uInvProj;
uniform mat4 uCam;
varying vec3 vDir;

void main() {
	gl_Position = vec4(position.xy, 1., 1.);
	vec4 v = uInvProj * vec4(position.xy, 1., 1.);
	vDir = mat3(uCam) * (v.xyz / v.w);
}
