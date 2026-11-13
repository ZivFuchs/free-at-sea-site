uniform float uInner;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;

void main() {
	float u = uv.x;
	float v = mix(.006, 1., uv.y);
	vec3 p = bell(u, v, uInner);
	vec3 n = normalize(cross(bell(u, v + .004, uInner) - p, bell(u + .004, v, uInner) - p));
	vec4 mv = modelViewMatrix * vec4(p, 1.);
	vUv = vec2(u, v);
	vN = normalMatrix * n;
	vView = -mv.xyz;
	gl_Position = projectionMatrix * mv;
}
