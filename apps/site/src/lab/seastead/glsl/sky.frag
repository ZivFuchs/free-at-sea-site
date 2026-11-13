uniform float u_day;
uniform vec3 u_paper;
varying vec3 vDir;

void main() {
	vec3 d = normalize(vDir);
	vec3 col = mix(u_paper, skyColor(d) + sunDisc(d), u_day);
	gl_FragColor = vec4(col, 1.);
	#include <colorspace_fragment>
}
