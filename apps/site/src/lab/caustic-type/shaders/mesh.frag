#version 300 es
precision highp float;

in vec2 v_old;
uniform float u_px;
out vec4 o;

/* Brightness is how much surface this pixel of seabed collects: area before refraction over area after. */
void main() {
	vec2 a = dFdx(v_old);
	vec2 b = dFdy(v_old);
	float gathered = abs(a.x * b.y - a.y * b.x) * u_px * u_px;
	o = vec4(vec3(min(gathered, 9.) * .25), 1.);
}
