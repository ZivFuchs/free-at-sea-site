varying float vFront;

void main() {
	vec3 n = normalize(mat3(modelMatrix) * position);
	vFront = smoothstep(-.05, .3, n.z);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
