uniform vec2 u_res;
uniform float u_time;
/* Camera travel in stops, its speed (stops/s), look offset (-1..1), and how far through the page (0..1). */
uniform float u_z;
uniform float u_speed;
uniform vec2 u_look;
uniform float u_dim;

const int LAYERS = 7;

/* Marine snow: flat layers of specks projected from a vanishing point, so travel reads as flying through them. */
float snow(vec2 q) {
	float rad = length(q);
	vec2 rdir = q / max(rad, 1e-4);
	vec2 tdir = vec2(-rdir.y, rdir.x);
	float streak = min(abs(u_speed) * 2.2 * rad, 1.6);
	float acc = 0.;
	for (int k = 0; k < LAYERS; k++) {
		float fk = float(k);
		float depth = 1. - fract(fk / float(LAYERS) + u_z * .21);
		float dist = mix(.1, 1.7, depth);
		vec2 c = q * dist * 9. + vec2(fk * 7.3 + sin(u_time * .09 + fk) * .25, fk * 3.1 + u_time * .035);
		vec2 id = floor(c);
		if (hash(id + fk * 13.7) > .2) continue;
		vec2 o = .5 + (hash2(id + fk * 5.1) - .5) * .7;
		vec2 v = fract(c) - o;
		float d = length(vec2(dot(v, rdir) / (1. + streak), dot(v, tdir) * (1. + streak * .8)));
		float size = .014 + .03 * hash(id + 2.7);
		float soft = mix(.9, .25, smoothstep(0., .5, depth));
		float mote = 1. - smoothstep(size * (1. - soft), size, d);
		float fade = smoothstep(0., .22, depth) * smoothstep(1., .72, depth);
		acc += mote * fade * (.25 + .75 * hash(id + 9.3)) / (1. + streak * .5);
	}
	return acc;
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = (gl_FragCoord.xy - .5 * u_res) / u_res.y;
	vec2 vp = u_look * vec2(.07, .045);
	float light = 1. - .5 * u_dim;

	vec3 deep = vec3(.003, .014, .03);
	vec3 mid = vec3(.01, .058, .1);
	vec3 top = vec3(.028, .15, .225);
	vec3 col = mix(deep, mid, smoothstep(-.05, .8, uv.y));
	col = mix(col, top, pow(smoothstep(.4, 1.2, uv.y), 2.) * light);

	float r = length((p - vp) * vec2(1., 1.3));
	col += vec3(.016, .075, .11) * exp(-r * r * 4.5) * (.6 + .4 * light);

	vec2 src = vec2(vp.x * .6 + .1, 1.3);
	vec2 d = p - src;
	float a = atan(d.x, -d.y);
	float rays = smoothstep(.42, .8, fbm(vec2(a * 10., u_time * .035 + u_z * .12)));
	rays *= .55 + .45 * noise(vec2(a * 31. + 4., u_time * .07));
	float fall = smoothstep(2.1, .35, length(d)) * smoothstep(.75, .05, abs(a));
	col += vec3(.045, .15, .18) * rays * fall * light;

	col += vec3(.5, .72, .78) * snow(p - vp) * .55;

	col *= 1. - .6 * pow(length((uv - .5) * vec2(1.05, .9)) * 1.25, 2.4);
	col += (hash(gl_FragCoord.xy + fract(u_time * 7.) * 311.) - .5) * 2.5 / 255.;
	gl_FragColor = vec4(max(col, 0.), 1.);
}
