precision highp float;
#include_noise
#include_waves
uniform vec4 uProfile; // hull section on the cut face: stern x, bow x, keel y, deck y
uniform float uCutZ;
uniform vec3 uSunTint;
varying vec3 vWorld;

/* The sea in section: walls of the block cut out of the water, lit from above. */
void main() {
	vec2 slope;
	float surface = swell(vWorld.xz, slope);
	if (vWorld.y > surface) discard;

	// Leave the hull's own section open on the cut face.
	if (abs(vWorld.z - uCutZ) < .02) {
		float keel = uProfile.z;
		float stern = uProfile.x + 2.5 * (1. - smoothstep(keel, keel + 3.6, vWorld.y));
		float bow = uProfile.y - 9. * (1. - smoothstep(keel, keel + 2.6, vWorld.y));
		if (vWorld.x > stern && vWorld.x < bow && vWorld.y > keel && vWorld.y < uProfile.w) discard;
	}

	float depth = surface - vWorld.y;
	vec3 shallow = vec3(.03, .22, .3);
	vec3 deep = vec3(.008, .05, .1);
	vec3 col = mix(shallow, deep, 1. - exp(-depth * .28));
	float rays = caustic(vWorld.xy * vec2(.5, .12) + vec2(vWorld.z * .3, 0.), uTime * .5);
	col += uSunTint * rays * .3 * exp(-depth * .35);
	col += vec3(.5, .8, .85) * (1. - smoothstep(0., .1, depth)) * .35;
	gl_FragColor = vec4(col, 1.);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
