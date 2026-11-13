float seg(vec2 p, vec2 b, float r0, float r1) {
	float h = clamp(dot(p, b) / dot(b, b), 0., 1.);
	return length(p - b * h) - mix(r0, r1, h);
}

/* Top-down whale, head at +x, body length 2. Flukes foreshorten as they beat. */
float whale(vec2 q, float beat) {
	float s = clamp((q.x + 1.) * .5, 0., 1.);
	float w = mix(.022, .15, smoothstep(0., .62, s)) * sqrt(clamp((1. - s) / .3, 0., 1.));
	float d = max(abs(q.y) - w, abs(q.x) - 1.);

	vec2 f = vec2(q.x + .97, abs(q.y));
	float reach = .7 + .3 * abs(sin(beat));
	d = min(d, seg(f, vec2(-.13, .3) * vec2(1., reach), .05, .008));

	vec2 a = vec2(q.x - .34, abs(q.y) - .11);
	float sweep = .25 * sin(beat * .5);
	d = min(d, seg(a, vec2(-.3 + sweep * .2, .2 + sweep * .1), .034, .008));
	return d;
}

float ray(vec2 q, float beat) {
	q.y /= .82 + .18 * sin(beat);
	float wings = abs(q.y) * .62 + abs(q.x + .12 * abs(q.y) * abs(q.y) * 4.) * 1.25 - .34;
	float tail = seg(q + vec2(.25, 0.), vec2(-.75, .04 * sin(beat * .5)), .02, .003);
	float horns = seg(vec2(q.x - .26, abs(q.y) - .07), vec2(.09, -.015), .022, .012);
	return min(min(wings, tail), horns);
}

float creature(vec2 q) {
	if (u_kind < .5) return whale(q, u_beat);
	if (u_kind < 1.5) {
		q.y *= .72;
		float d = whale((q - vec2(.55, .1)) * 3.4, u_beat) / 3.4;
		d = min(d, whale((q - vec2(.05, -.32)) * 3.9, u_beat + 1.3) / 3.9);
		d = min(d, whale((q - vec2(-.35, .3)) * 3.1, u_beat + 2.4) / 3.1);
		d = min(d, whale((q - vec2(-.75, -.12)) * 4.6, u_beat + .7) / 4.6);
		return d;
	}
	return ray(q, u_beat);
}

vec2 local(vec2 p) {
	vec2 r = p - u_pos;
	return vec2(dot(r, u_dir), dot(r, vec2(-u_dir.y, u_dir.x))) / u_scale;
}

float surface(vec2 w, vec2 p, float t) {
	float h = .5 * sin(dot(w, vec2(3.1, 1.2)) + t * .42);
	h += .32 * sin(dot(w, vec2(-1.7, 4.3)) + t * .55 + 1.7);
	vec2 q = w * 4.2 + vec2(t * .1, -t * .07);
	h += .6 * (fbm3(q + .5 * vec2(fbm3(q + t * .06), fbm3(q + 5.2 - t * .045))) - .5);
	h += .05 * (noise(w * 21. + vec2(t * .35, t * .28)) - .5);
	/* The water humps over a large body, more as it rises. */
	vec2 l = local(p);
	h += u_vis * (.3 + .5 * u_surf) * exp(-(l.x * l.x * 1.6 + l.y * l.y * 14.));
	return h;
}

void main() {
	vec2 p = (gl_FragCoord.xy - .5 * u_res) / u_res.y;
	vec2 w = p - vec2(0., u_scroll);
	float t = u_time;

	float e = .012;
	float h = surface(w, p, t);
	vec2 g = vec2(surface(w + vec2(e, 0.), p + vec2(e, 0.), t), surface(w + vec2(0., e), p + vec2(0., e), t)) - h;
	vec3 n = normalize(vec3(-g, e * 5.5));

	/* Body of the water: deep blue, a little lighter where the swell lifts toward the light. */
	vec3 col = mix(vec3(.008, .055, .125), vec3(.022, .125, .235), .5 + .28 * h);
	col += vec3(0., .022, .03) * fbm3(w * .7 + t * .015);

	/* Sunlight in deep water converges on the point opposite the sun. */
	vec2 c = p - vec2(.12, -.08);
	float ang = atan(c.y, c.x);
	float rays = noise(vec2(ang * 9., t * .12)) * noise(vec2(ang * 23. + 3., t * .09 + 7.));
	col += vec3(.02, .09, .1) * rays * smoothstep(.05, .7, length(c)) * (1. - .7 * u_vis);

	/* What passes underneath, bent by the surface above it. */
	vec2 l = local(p + n.xy * .09);
	float flecks = 0.;
	if (u_kind > 2.5) {
		float blob = smoothstep(1., .25, length(l * vec2(.7, 1.5)) + .35 * (fbm3(l * 3. + t * .2) - .5));
		vec2 cell = l * 60. * u_scale + vec2(-t * .8, 0.);
		float turn = .5 + .5 * sin(t * 1.3 + l.x * 5. + 4. * fbm3(l * 2.5 - t * .3));
		flecks = blob * smoothstep(.78, 1., hash(floor(cell))) * smoothstep(.45, .1, length(fract(cell) - .5)) * turn;
		col *= 1. - .22 * blob * u_vis;
	} else {
		float d = creature(l) * u_scale;
		float blur = mix(.06, .034, u_surf) * (u_kind > .5 ? .45 : 1.);
		float shade = smoothstep(blur, -blur * .7, d);
		col *= 1. - shade * u_vis * mix(.66, .88, u_surf);
	}

	/* Sky on the surface: faint from straight above, stronger on tilted facets, with sparse glints. */
	float fres = pow(1. - n.z, 1.8);
	col += vec3(.36, .5, .62) * fres * 1.9;
	col += vec3(.9, .95, 1.) * pow(max(dot(n, normalize(vec3(.28, .36, 1.))), 0.), 420.) * .45;
	col += vec3(.55, .7, .75) * flecks * u_vis;

	/* A back breaks the surface: wet slate, a ridge of light, foam at its edge and one spreading ring. */
	if (u_surf > .001) {
		vec2 b = local(p) - vec2(.12, 0.);
		float rise = smoothstep(0., 1., u_surf);
		float db = length(b / vec2(.34 * rise + .001, .075 * rise + .001)) - 1.;
		float lace = smoothstep(.4, .75, fbm(w * 70. + vec2(t * .25, -t * .2))) * (.6 + .4 * noise(w * 260.));
		vec3 back = vec3(.1, .14, .19) + vec3(.16, .2, .23) * pow(max(1. - abs(b.y) / (.075 * rise + .001), 0.), 2.);
		back += vec3(.25, .3, .34) * fbm3(w * 30.) * fres * 3.;
		col = mix(col, back, smoothstep(.1, -.35, db) * rise);
		float edge = smoothstep(.45, 0., abs(db - .05)) * rise;
		float ring = smoothstep(.3, 0., abs(db - .3 - u_ring * 4.)) * (1. - u_ring) * step(.001, u_ring);
		col = mix(col, vec3(.86, .93, .96), clamp((edge * .85 + ring * .55) * lace, 0., 1.));
	}

	float v = length(p * vec2(.75, 1.));
	col *= 1. - .28 * v * v;
	col += (hash(gl_FragCoord.xy + fract(t) * 91.) - .5) / 255.;
	gl_FragColor = vec4(max(col, 0.), 1.);
}
