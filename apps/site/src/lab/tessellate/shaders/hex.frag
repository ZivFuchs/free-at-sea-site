varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec2 vLocal;
varying float vPart;
varying float vKind;
varying float vLock;
varying float vHeight;
varying vec4 vRand;

const vec3 CONCRETE = vec3(.74, .75, .73);
const vec3 LAMP = vec3(1., .66, .34);

/* 1 at the edge of a pointy-top hexagon of circumradius 1. */
float hexDist(vec2 p) {
	p = abs(p);
	return max(p.x, p.x * .5 + p.y * .8660254) / .8660254;
}

void main() {
	vec3 N = normalize(vNormal);
	vec3 V = normalize(cameraPosition - vWorld);
	float hd = hexDist(vLocal);
	float px = fwidth(hd);
	float building = step(3.5, vKind);
	float top = 1. - step(.5, vPart);
	float wall = step(1.5, vPart);

	vec3 albedo = CONCRETE * (.93 + .1 * vRand.w);
	float gloss = 0.;
	vec3 glow = vec3(0.);
	float ao = 1.;

	if (building > .5) {
		albedo = mix(vec3(.86, .85, .82), vec3(.8, .82, .84), vRand.z);
		if (wall > .5) {
			float rows = max(1., floor(vHeight / .26));
			vec2 g = vec2(vUv.x * 3., vUv.y * rows);
			vec2 cell = floor(g);
			vec2 f = fract(g);
			float pane = smoothstep(.2, .26, f.x) * smoothstep(.8, .74, f.x) * smoothstep(.28, .36, f.y) * smoothstep(.8, .72, f.y);
			float lit = step(.45, hash21(cell + vRand.xy * 91.));
			albedo = mix(albedo, vec3(.1, .15, .2), pane);
			gloss = pane * .6;
			glow = LAMP * pane * lit * uNight * 1.6;
			ao = mix(.72, 1., smoothstep(0., .5, vUv.y));
		} else if (top > .5) {
			// Pale roof with a parapet line; some keep a lit skylight.
			albedo = vec3(.9, .9, .88) * mix(.82, 1., smoothstep(.98, .8, hd));
			float skylight = smoothstep(.34, .3, hd) * step(.5, vRand.y);
			albedo = mix(albedo, vec3(.2, .26, .32), skylight);
			glow = LAMP * skylight * uNight * 1.5;
		}
	} else if (top > .5) {
		// Deck: a scored border, then whatever the cell carries.
		float inner = smoothstep(.78, .78 - px * 1.5, hd);
		float score = smoothstep(px * 1.5, 0., abs(hd - .8));
		albedo *= 1. - .16 * score;
		albedo *= .96 + .06 * vnoise(vWorld.xz * 2.3);

		if (vKind > .5 && vKind < 1.5) {
			vec2 g = vLocal * 3.2;
			vec2 f = abs(fract(g) - .5);
			float line = smoothstep(.5 - fwidth(g.x) * 1.5, .5, max(f.x, f.y));
			vec3 panel = mix(vec3(.05, .09, .2), vec3(.3, .36, .46), line);
			albedo = mix(albedo, panel, inner);
			gloss = inner * (1. - line);
		} else if (vKind > 1.5 && vKind < 2.5) {
			float n = vnoise(vWorld.xz * 3.1) * .6 + vnoise(vWorld.xz * 9.) * .4;
			vec3 green = mix(vec3(.17, .29, .14), vec3(.36, .44, .2), n);
			float bed = smoothstep(.72, .72 - px * 1.5, hd);
			albedo = mix(albedo, green, bed);
		} else if (vKind > 2.5) {
			float r = length(vLocal);
			float pr = fwidth(r);
			float ring = smoothstep(pr * 1.5, 0., abs(r - .26)) + smoothstep(pr * 1.5, 0., abs(r - .2));
			albedo *= 1. - .3 * min(ring, 1.);
			albedo = mix(albedo, albedo * .88, smoothstep(.2, .2 - pr, r));
		}

		// Mooring lamps on some locked decks.
		float lamp = step(.72, vRand.x) * vLock * uNight;
		vec2 at = vLocal - .6 * vec2(cos(vRand.y * 6.2831), sin(vRand.y * 6.2831));
		float d = length(at);
		glow = LAMP * lamp * (smoothstep(.11, .05, d) * 4. + .7 * exp(-d * d * 6.));

		ao = mix(.86, 1., smoothstep(1., .82, hd));
	} else if (wall > .5) {
		// Hull: stained toward the waterline.
		float wet = smoothstep(.88, .62, vUv.y);
		albedo = mix(albedo * .82, vec3(.1, .14, .15), wet * .85);
		ao = mix(.55, 1., smoothstep(.3, 1., vUv.y));
	} else {
		albedo *= 1.04;
	}

	float lit = sunlit(vWorld, N);
	float sun = max(dot(N, uSunDir), 0.) * lit;
	vec3 ambient = mix(uDeep * 1.5 + uHorizon * .12, mix(uHorizon, uZenith, .55), N.y * .5 + .5);
	vec3 col = albedo * (uSunCol * sun * .66 + ambient * .7) * ao;

	vec3 R = reflect(-V, N);
	float fres = .04 + .5 * pow(1. - max(dot(N, V), 0.), 4.);
	col += gloss * (sky(vec3(R.x, abs(R.y), R.z)) * fres + uSunCol * pow(max(dot(R, uSunDir), 0.), 180.) * .9 * lit);
	col += glow;

	gl_FragColor = vec4(grade(haze(col, cameraPosition, vWorld)), 1.);
}
