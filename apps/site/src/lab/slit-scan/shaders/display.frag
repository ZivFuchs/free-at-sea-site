/* Time-displaced view of the frame history. Modes: 0 horizontal scan, 1 wave record, 2 radial, 3 live. */
precision highp sampler2DArray;
in vec2 v;
out vec4 o;
uniform sampler2DArray u_hist;
uniform sampler2D u_strip;
uniform vec2 u_res;
uniform float u_mode;
uniform float u_head;
uniform float u_layers;
uniform float u_phase;
uniform float u_amount;
uniform float u_aspect;
uniform float u_row;
uniform float u_rows;
uniform vec2 u_p;

vec2 cover(vec2 uv) {
	float a = u_res.x / u_res.y;
	vec2 s = a > u_aspect ? vec2(1., u_aspect / a) : vec2(a / u_aspect, 1.);
	return (uv - .5) * s + .5;
}

/* The frame `d` captures ago, blended between its two nearest layers. */
vec3 at(vec2 uv, float d) {
	d = clamp(d + 1. - u_phase, 0., u_layers - 2.);
	float l = floor(d);
	vec3 a = texture(u_hist, vec3(uv, mod(u_head - l + u_layers, u_layers))).rgb;
	vec3 b = texture(u_hist, vec3(uv, mod(u_head - l - 1. + u_layers, u_layers))).rgb;
	return mix(a, b, d - l);
}

void main() {
	vec2 uv = cover(v);
	float span = u_layers - 3.;
	vec3 col;
	if (u_mode < .5) {
		float d = abs(v.x - u_p.x) / max(u_p.x, 1. - u_p.x);
		col = at(uv, span * u_amount * d);
	} else if (u_mode < 1.5) {
		float back = (1. - v.y) * (u_rows - 2.) + 1.;
		col = texture(u_strip, vec2(uv.x, (u_row - back + .5) / u_rows)).rgb;
	} else if (u_mode < 2.5) {
		float a = u_res.x / u_res.y;
		vec2 k = a > 1. ? vec2(a, 1.) : vec2(1., 1. / a);
		float r = length((v - u_p) * k) / (.5 * length(k));
		col = at(uv, span * u_amount * min(r, 1.));
	} else {
		col = at(uv, 0.);
	}
	float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5;
	o = vec4(col + n / 255., 1.);
}
