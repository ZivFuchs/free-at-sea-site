varying vec3 vDir;
void main() {
	vDir = position;
	vec4 p = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position, 1.);
	gl_Position = p.xyww;
}
