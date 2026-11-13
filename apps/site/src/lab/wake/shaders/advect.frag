/* Semi-Lagrangian advection of the velocity field by itself. Velocity is in texels per second.
 * `u_shift` slides the field with page scroll; what slides in from outside is still water. */
uniform sampler2D u_velocity;
uniform vec2 u_texel;
uniform vec2 u_shift;
uniform float u_dt;
uniform float u_decay;

void main() {
	vec2 c = vUv - u_dt * texture(u_velocity, vUv).xy * u_texel - u_shift;
	vec2 inside = step(vec2(0.), c) * step(c, vec2(1.));
	o = vec4(texture(u_velocity, c).xy * inside.x * inside.y / (1. + u_decay * u_dt), 0., 1.);
}
