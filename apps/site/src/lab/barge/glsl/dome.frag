precision highp float;
#include_noise
#include_sky
varying vec3 vDir;
void main() {
	vec3 d = normalize(vDir);
	vec3 col = skyColor(d) + sunDisc(d);
	// High cirrus, thinning overhead.
	vec2 c = d.xz / (d.y + .12);
	float cirrus = smoothstep(.5, .95, fbm(c * vec2(.5, 1.6) + 3.)) * smoothstep(.02, .3, d.y) * .5;
	col = mix(col, vec3(1., .95, .88), cirrus);
	if (d.y < 0.) col = mix(vec3(.05, .16, .25), skyColor(vec3(d.x, 0., d.z)), exp(d.y * 14.));
	gl_FragColor = vec4(col, 1.);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
