varying vec3 vDir;

void main() {
	vDir = position;
	vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.);
	gl_Position = p.xyww;
}
