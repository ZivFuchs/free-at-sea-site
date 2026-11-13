varying vec3 vDir;

void main() {
	vDir = position;
	vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.);
	gl_Position = p.xyww;
}
