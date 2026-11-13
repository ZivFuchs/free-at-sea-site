/* One moment of the scene: the still, flown like a hovering drone over a moving swell.
 * `u_line` ≥ 0 renders that single scanline (for the wave record). */
in vec2 v;
out vec4 o;
uniform sampler2D u_img;
uniform float u_t;
uniform float u_line;

const vec2 BARGE = vec2(.5, .41);
const float ASPECT = 16. / 9.;

void main() {
	vec2 uv = vec2(v.x, u_line < 0. ? v.y : u_line);
	float zoom = .46 + .03 * sin(u_t * .23);
	float turn = .3 * sin(u_t * .41) + .12 * sin(u_t * .97 + 1.3);
	vec2 pan = vec2(.07 * sin(u_t * .53) + .03 * sin(u_t * 1.19 + 1.), .03 * sin(u_t * .37 + 2.));
	vec2 d = (uv - .5) * vec2(ASPECT, 1.) * zoom;
	d = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * d;
	vec2 p = BARGE + d / vec2(ASPECT, 1.) + pan;

	vec2 q = vec2(p.x * 8., p.y * 36.);
	float swell = fbm(q + vec2(u_t * .5, u_t * 2.2));
	float chop = fbm3(q * 2.9 - vec2(u_t * .9, u_t * 2.6));
	p += .0025 * vec2(sin(q.y * 1.3 + u_t * 1.5), cos(q.x * 2. + u_t * 1.1));

	vec3 col = texture(u_img, p).rgb;
	col *= 1. + .5 * (swell - .5) + .22 * (chop - .5);
	col += pow(max(chop * swell * 2.2 - .62, 0.) * 2.2, 2.) * vec3(.3, .42, .5);
	o = vec4(col, 1.);
}
