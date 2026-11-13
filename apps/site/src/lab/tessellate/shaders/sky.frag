varying vec3 vDir;

void main() {
	vec3 d = normalize(vDir);
	vec3 col = sky(d);
	float stars = step(.9975, hash21(floor(d.xz / max(d.y, .05) * 140.))) * uNight * smoothstep(.05, .4, d.y);
	gl_FragColor = vec4(grade(col + stars * .5), 1.);
}
