uniform vec3 u_sun;
uniform vec3 u_zenith;
uniform vec3 u_horizon;
uniform vec3 u_glow;

vec3 skyColor(vec3 d) {
	float h = max(d.y, 0.);
	vec3 col = mix(u_horizon, u_zenith, pow(h, .42));
	float s = max(dot(d, u_sun), 0.);
	col += u_glow * (pow(s, 6.) * .28 + pow(s, 60.) * .35);
	return col;
}

vec3 sunDisc(vec3 d) {
	float s = max(dot(d, u_sun), 0.);
	return u_glow * smoothstep(.9995, .9999, s) * 1.6;
}
