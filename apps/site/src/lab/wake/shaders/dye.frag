/* Advects the dye (r: foam, g: ink off the title) and feeds it: the title's letterforms seep ink,
 * and the odd whitecap breaks on its own. */
uniform sampler2D u_velocity;
uniform sampler2D u_dye;
uniform sampler2D u_mask;
uniform vec2 u_texel;
uniform vec2 u_shift;
uniform vec2 u_decay;
uniform vec4 u_rect;
uniform float u_seed;
uniform float u_caps;
uniform float u_dt;
uniform float u_time;
uniform float u_aspect;
uniform float u_scroll;

void main() {
	vec2 c = vUv - u_dt * texture(u_velocity, vUv).xy * u_texel - u_shift;
	vec2 inside = step(vec2(0.), c) * step(c, vec2(1.));
	vec2 dye = texture(u_dye, c).rg * inside.x * inside.y / (1. + u_decay * u_dt);

	vec2 m = (vUv - u_rect.xy) / u_rect.zw;
	vec2 within = step(vec2(0.), m) * step(m, vec2(1.));
	float letter = texture(u_mask, m).r * within.x * within.y;
	dye.g = mix(dye.g, max(dye.g, letter), u_seed * (1. - exp(-2.5 * u_dt)));

	vec2 p = vec2(vUv.x * u_aspect, vUv.y + u_scroll);
	float patch_ = noise(p * 2.3 + vec2(u_time * .05, -u_time * .03));
	float fleck = noise(p * vec2(60., 95.) + vec2(u_time * .22, u_time * .15));
	dye.r += u_caps * u_dt * smoothstep(.56, .8, patch_) * smoothstep(.84, .96, fleck) * step(dye.r, .5);

	o = vec4(dye, 0., 1.);
}
