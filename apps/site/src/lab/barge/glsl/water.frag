precision highp float;
#include_noise
#include_sky
#include_waves
uniform vec3 uHull; // heading-aligned hull centre x, z and half length
uniform vec2 uHullSize; // half length, half beam
uniform vec4 uPit; // sectioned block of sea: min x, max x, cut z, far z (cut z > far z: closed)
varying vec3 vWorld;
varying vec2 vSlope;

float hullDistance(vec2 p) {
	vec2 q = abs(p - uHull.xy) - uHullSize + 1.;
	return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - 1.;
}

void main() {
	vec2 p = vWorld.xz;
	float d = hullDistance(p);
	// Open the surface only where the hull actually sits in it: the raked ends overhang the water.
	float along = p.x - uHull.x;
	if (d < -.35 && along > -uHullSize.x + 1.6 && along < uHullSize.x - 5.6) discard;
	if (p.x > uPit.x && p.x < uPit.y && p.y > uPit.z && p.y < uPit.w) discard;

	vec3 view = normalize(cameraPosition - vWorld);
	float dist = length(cameraPosition - vWorld);

	// Wind ripple under the swell: fades with distance so it turns to roughness, not shimmer.
	float fine = exp(-dist / 260.);
	float t = uTime * .6;
	// Stretched along the crests, so it reads as wind lines rather than blotches.
	vec2 r = vec2(dot(p, vec2(.83, .56)), dot(p, vec2(-.56, .83))) * vec2(.5, 1.9);
	vec2 ripple = vec2(
		noise(r + vec2(t, 0.)) - noise(r * 2.1 - vec2(0., t * 1.3)),
		noise(r * 1.4 + vec2(-t, 3.)) - noise(r * 3.1 + vec2(7., t))
	) * .6;
	// Capillary chop, only up close.
	float close = exp(-dist / 45.);
	vec2 chop = vec2(noise(p * 9. + vec2(t * 2., 0.)) - noise(p * 17. - t), noise(p.yx * 8. - vec2(t * 1.7, 2.)) - noise(p.yx * 19. + t));
	vec3 n = normalize(vec3(-vSlope.x - ripple.x * .16 * fine - chop.x * .2 * close, 1., -vSlope.y - ripple.y * .16 * fine - chop.y * .2 * close));

	float fres = .02 + .98 * pow(1. - max(dot(n, view), 0.), 5.);
	vec3 refl = reflect(-view, n);
	refl.y = abs(refl.y);
	vec3 sky = skyColor(refl);

	vec3 deep = vec3(.006, .045, .085);
	vec3 scatter = vec3(.02, .16, .2);
	float crest = smoothstep(-.3, .9, vWorld.y);
	vec3 body = mix(deep, scatter, crest * .35 + .12 * max(dot(view, -uSun), 0.));

	vec3 col = mix(body, sky, fres * .8);

	// Sun glitter: a wide rough lobe plus sharp sparkles from the ripple.
	float spec = max(dot(refl, uSun), 0.);
	float sparkle = step(.72, noise(p * 6. + ripple * 4. + t * 2.));
	col += vec3(1., .86, .66) * (pow(spec, 90.) * 1.6 + pow(spec, 700.) * 14. * (.3 + sparkle)) * mix(.35, 1., fine);

	// The hull on the water: soft shade down-sun, a darker contact line, broken foam where swell slaps steel.
	float shade = hullDistance(p + uSun.xz / max(uSun.y, .2) * 2.2);
	col *= 1. - .42 * (1. - smoothstep(-1., 5., shade));
	col *= 1. - .3 * (1. - smoothstep(0., 1.6, d));
	float lace = fbm(p * 1.4 + vec2(t * .3, -t * .2));
	float foam = (1. - smoothstep(.1, 2.2 + 1.2 * lace, d)) * smoothstep(.42, .7, lace + .25 * sin(d * 3. - uTime * 1.2));
	col = mix(col, vec3(.86, .92, .93), foam * .6);

	// Haze to the horizon.
	vec3 haze = skyColor(normalize(vec3(-view.x, .02, -view.z)));
	col = mix(col, haze, 1. - exp(-pow(dist / 2600., 1.5)));

	gl_FragColor = vec4(col, 1.);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
