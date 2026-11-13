varying vec3 vWorld;

void main() {
	vec2 p = position.xz;
	float h = swell(p, 1.).x * smoothstep(900., 250., length(p));
	vWorld = vec3(p.x, h, p.y);
	gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
}
