varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;

void main() {
	vUv = uv;
	vN = normal;
	vW = position;
	gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.);
}
