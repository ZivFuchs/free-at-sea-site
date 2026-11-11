void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	vec2 p = (gl_FragCoord.xy - .5 * u_res) / u_res.y * 3.;
	float e = .02;
	float h = sandHeight(p);
	vec3 n = normalize(vec3(h - sandHeight(p + vec2(e, 0.)), h - sandHeight(p + vec2(0., e)), e * 1.5));
	vec3 col = seabed(p, sandAlbedo(p), n, 1.);
	col *= mix(.35, 1., smoothstep(0., .75, uv.y)) * vignette(uv, .5);
	gl_FragColor = vec4(grade(col, .045), 1.);
}
