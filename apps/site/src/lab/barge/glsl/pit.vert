varying vec3 vWorld;
varying vec3 vLocal;
void main() {
	vLocal = position;
	vec4 world = modelMatrix * vec4(position, 1.);
	vWorld = world.xyz;
	gl_Position = projectionMatrix * viewMatrix * world;
}
