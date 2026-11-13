varying vec2 vUv;

void main() {
	vUv = uv * 2. - 1.;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
