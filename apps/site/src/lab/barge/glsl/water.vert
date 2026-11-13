#include_waves
varying vec3 vWorld;
varying vec2 vSlope;
void main() {
	vec4 world = modelMatrix * vec4(position, 1.);
	world.y = swell(world.xz, vSlope);
	vWorld = world.xyz;
	gl_Position = projectionMatrix * viewMatrix * world;
}
