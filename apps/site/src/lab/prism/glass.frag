out vec4 o;

uniform vec2 u_res;
uniform float u_time;
uniform sampler2D u_photo;
uniform sampler2D u_sdf0;
uniform sampler2D u_sdf1;
uniform float u_photoAspect;
uniform float u_horizon;
uniform float u_tanH;
uniform float u_rows;
/* World y of the baseline: the water is y = 0, so negative sinks the letters. */
uniform float u_base;
uniform vec3 u_cam;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_fwd;
/* Per row: tile half extents (xy) and centre above the baseline (z). */
uniform vec3 u_row0;
uniform vec3 u_row1;
uniform vec2 u_rowZ;
/* Letter bounds: half width, nearest z, farthest z. */
uniform vec3 u_bounds;

const float ROUND = .075;
const float THICK = .2;
const vec3 SUN = normalize(vec3(.3, .5, .8));

float rowD(sampler2D s, vec3 p, vec3 r, float z) {
	vec2 q = vec2(p.x, p.y - u_base - r.z);
	float d2 = texture(s, clamp(q / (2. * r.xy) + .5, 0., 1.)).r + length(max(abs(q) - r.xy, 0.));
	vec2 w = vec2(d2 + ROUND, max(abs(p.z - z) - (THICK - ROUND), 0.));
	return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - ROUND;
}

float map(vec3 p) {
	float d = rowD(u_sdf0, p, u_row0, u_rowZ.x);
	if (u_rows > 1.5) d = min(d, rowD(u_sdf1, p, u_row1, u_rowZ.y));
	return d;
}

vec3 nrm(vec3 p) {
	const vec2 e = vec2(.012, -.012);
	return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

/* The backdrop, cover-fitted with the horizon pinned like the site hero. `uv` is screen space, y up. */
vec3 photo(vec2 uv) {
	float sa = u_res.x / u_res.y;
	vec2 st = vec2(uv.x, 1. - uv.y);
	if (sa > u_photoAspect) {
		float f = u_photoAspect / sa;
		st.y = (1. - f) * u_horizon + st.y * f;
	} else {
		float f = sa / u_photoAspect;
		st.x = (1. - f) * .5 + st.x * f;
	}
	return texture(u_photo, vec2(st.x, 1. - st.y)).rgb;
}

vec3 env(vec3 d) {
	if (d.y < 0.) return mix(vec3(.16, .3, .38), vec3(.03, .12, .2), clamp(-d.y * 2.5, 0., 1.));
	vec3 c = mix(vec3(.84, .88, .9), vec3(.5, .64, .78), pow(d.y, .55));
	float s = max(dot(d, SUN), 0.);
	return c + vec3(1., .95, .86) * (pow(s, 400.) * 8. + pow(s, 24.) * .4);
}

/* What the camera's photograph shows at world point `P`. */
vec3 seen(vec3 P) {
	vec3 c = P - u_cam;
	float z = dot(c, u_fwd);
	if (z < .01) return env(normalize(c));
	vec2 n = vec2(dot(c, u_right) / (z * u_tanH * u_res.x / u_res.y), dot(c, u_up) / (z * u_tanH));
	return photo(clamp(n * .5 + .5, .002, .998));
}

vec3 behind(vec3 p, vec3 d) {
	if (p.y < 0.) {
		vec3 q = p + d * .5;
		q.y = min(q.y, 0.);
		return seen(q) * vec3(.5, .82, .88);
	}
	if (d.y < -.001) return seen(p + d * (-p.y / d.y));
	return seen(p + d * 200.);
}

vec3 exitRay(vec3 ri, vec3 ne, float ior) {
	vec3 r = refract(ri, ne, ior);
	return dot(r, r) < .5 ? reflect(ri, ne) : r;
}

vec3 glass(vec3 p, vec3 rd) {
	vec3 n = nrm(p);
	float c = clamp(dot(-rd, n), 0., 1.);
	float F = .06 + .94 * pow(1. - c, 4.);
	vec3 ri = refract(rd, n, 1. / 1.5);
	vec3 q = p - n * .02;
	float len = .02;
	for (int i = 0; i < 26; i++) {
		float d = -map(q);
		if (d < .003) break;
		float s = max(d, .01);
		q += ri * s;
		len += s;
	}
	vec3 ne = -nrm(q);
	vec3 col = vec3(
		behind(q, exitRay(ri, ne, 1.44)).r,
		behind(q, exitRay(ri, ne, 1.5)).g,
		behind(q, exitRay(ri, ne, 1.56)).b
	);
	col *= exp(-len * vec3(1.8, .5, .45));
	/* Light gathered inside the thick parts. */
	col += vec3(.34, .6, .64) * (1. - exp(-len * 2.2)) * (.55 + .45 * max(dot(n, SUN), 0.));
	col += vec3(.5, .62, .66) * pow(max(n.y, 0.), 3.) * .5;
	return mix(col, env(reflect(rd, n)), F);
}

vec3 water(vec3 pw, vec3 rd, vec3 base, vec2 uv, float fade) {
	float dW = map(pw);
	float near = exp(-max(dW, 0.) * 2.2);
	vec2 g = normalize(vec2(map(pw + vec3(.02, 0., 0.)), map(pw + vec3(0., 0., .02))) - dW + 1e-5);
	vec2 slope = g * cos(dW * 30. - u_time * 2.4) * .16 * near;
	slope += (vec2(noise(pw.xz * 5. + u_time * .5), noise(pw.zx * 5. - u_time * .4)) - .5) * .12;
	vec3 nw = normalize(vec3(-slope.x, 1., -slope.y));
	vec3 col = photo(uv + slope * .012);

	vec3 rw = refract(rd, nw, 1. / 1.33);
	vec3 q = pw;
	float len = 0.;
	bool hit = false;
	for (int i = 0; i < 40; i++) {
		float d = map(q);
		if (d < .004) { hit = true; break; }
		q += rw * d;
		len += d;
		if (len > 3.) break;
	}
	if (hit) {
		vec3 n = nrm(q);
		vec3 sub = vec3(.55, .88, .9) * (.22 + .78 * pow(1. - abs(dot(n, rw)), 1.6));
		sub += vec3(.6, 1., .95) * caustic(q.xy * 4. + q.z, u_time * .6) * .5 * max(n.y + .3, 0.);
		float a = exp(-(len * .4 - q.y * .55));
		col = mix(col, mix(col * vec3(.45, .8, .85), sub, .8), a);
	}

	/* Sunlight that crossed the glass on its way to the water: a bright stain, dark at its rim. */
	float thr = 0.;
	vec3 s = pw + vec3(0., .01, 0.);
	for (int i = 0; i < 10; i++) {
		s += SUN * .1;
		thr += step(map(s), 0.);
	}
	thr *= .1;
	col *= 1. - .22 * smoothstep(0., .12, thr) * (1. - smoothstep(.12, .4, thr));
	col += base * vec3(.45, .95, .85) * smoothstep(.1, .5, thr) * (.35 + 1.6 * caustic(pw.xz * 5., u_time * .7));

	vec3 rr = reflect(rd, nw);
	vec3 m = pw + rr * .02;
	float lr = 0.;
	for (int i = 0; i < 24; i++) {
		float d = map(m);
		if (d < .005) {
			vec3 n = nrm(m);
			float Fw = .02 + .98 * pow(1. - clamp(dot(-rd, nw), 0., 1.), 5.);
			vec3 rc = env(reflect(rr, n)) * .55 + vec3(.2, .36, .42);
			col = mix(col, rc, clamp(Fw * 1.4, 0., .55) * exp(-lr * .8));
			break;
		}
		m += rr * d;
		lr += d;
		if (lr > 2.5 || m.y < 0.) break;
	}

	col += vec3(.9, .97, 1.) * smoothstep(.03, 0., abs(dW - .012)) * .5;
	return mix(base, col, fade);
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 ndc = uv * 2. - 1.;
	vec3 rd = normalize(u_fwd + ndc.x * u_tanH * (u_res.x / u_res.y) * u_right + ndc.y * u_tanH * u_up);
	vec3 col = photo(uv);

	vec3 lo = vec3(-u_bounds.x, u_base - .4, u_bounds.y - THICK - .05);
	vec3 hi = vec3(u_bounds.x, u_base + 1.2, u_bounds.z + THICK + .05);
	vec3 t0 = (lo - u_cam) / rd;
	vec3 t1 = (hi - u_cam) / rd;
	vec3 ta = min(t0, t1);
	vec3 tb = max(t0, t1);
	float tN = max(max(ta.x, ta.y), ta.z);
	float tF = min(min(tb.x, tb.y), tb.z);
	float tW = rd.y < 0. ? -u_cam.y / rd.y : 1e9;

	bool hit = false;
	float edge = 1.;
	float t = max(tN, 0.);
	float px = 2.5 * u_tanH / u_res.y;
	if (tN < tF) {
		float end = min(tF, tW);
		for (int i = 0; i < 72; i++) {
			if (t > end) break;
			float d = map(u_cam + rd * t);
			edge = min(edge, d / (t * px));
			if (d < .0015 * t) { hit = true; break; }
			t += d * .9;
		}
	}

	if (hit) {
		col = glass(u_cam + rd * t, rd);
	} else if (tW < 1e8) {
		vec3 pw = u_cam + rd * tW;
		vec2 out2 = max(vec2(abs(pw.x) - u_bounds.x, max(u_bounds.y - pw.z, pw.z - u_bounds.z)), 0.);
		float fade = 1. - smoothstep(.3, 1.6, length(out2));
		if (fade > 0.) col = water(pw, rd, col, uv, fade);
		col = mix(vec3(.82, .9, .94), col, smoothstep(0., 1., edge));
	} else {
		col = mix(vec3(.82, .9, .94), col, smoothstep(0., 1., edge));
	}

	o = vec4(col + (hash(gl_FragCoord.xy) - .5) / 255., 1.);
}
