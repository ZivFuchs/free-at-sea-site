in vec2 a;
uniform vec2 u_texel;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;

void main() {
	vUv = a * .5 + .5;
	vL = vUv - vec2(u_texel.x, 0.);
	vR = vUv + vec2(u_texel.x, 0.);
	vT = vUv + vec2(0., u_texel.y);
	vB = vUv - vec2(0., u_texel.y);
	gl_Position = vec4(a, 0., 1.);
}
