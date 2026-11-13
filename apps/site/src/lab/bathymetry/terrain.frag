precision highp float;

uniform vec3 uCamera;
uniform vec3 uFog;
uniform float uFogDensity;
/** Along-track km of the ship (the camera's ground position) and of the travelling ping front. */
uniform float uShip;
uniform float uPing;
uniform float uSwath;

varying float vDepth;
varying float vOffset;
varying vec3 vNormal;
varying vec3 vWorld;

/* Hypsometric tint: abyss indigo → blue → teal → pale aqua on the shallows. */
vec3 tint(float depth) {
	vec3 c = vec3(.03, .034, .11);
	c = mix(c, vec3(.05, .09, .27), smoothstep(8500., 4800., depth));
	c = mix(c, vec3(.05, .145, .33), smoothstep(5200., 3400., depth));
	c = mix(c, vec3(.075, .29, .43), smoothstep(3400., 1700., depth));
	c = mix(c, vec3(.17, .46, .53), smoothstep(1700., 500., depth));
	c = mix(c, vec3(.4, .7, .7), smoothstep(500., 60., depth));
	return c;
}

/* Anti-aliased iso-depth line every `interval` m, `width` px wide; fades out where lines would crowd. */
float contour(float depth, float interval, float width) {
	float fw = fwidth(depth);
	float d = abs(fract(depth / interval - .5) - .5) * interval;
	float line = 1. - smoothstep(width * .5, width * .5 + 1., d / max(fw, 1e-4));
	return line * (1. - smoothstep(.18, .5, fw / interval));
}

void main() {
	vec3 n = normalize(vNormal);
	float s = -vWorld.z;
	vec3 view = uCamera - vWorld;
	float dist = length(view);

	float sun = clamp(dot(n, normalize(vec3(-.6, .5, .45))), 0., 1.);
	float slope = 1. - n.y;
	vec3 base = tint(vDepth);
	vec3 col = base * (.4 + 1.15 * sun);

	float minor = contour(vDepth, 100., 1.);
	float major = contour(vDepth, 500., 1.6);
	vec3 ink = mix(base, vec3(.8, .95, .96), .74);

	// Surveyed ground: inside the swath, behind the ship. Elsewhere only the major lines, faint.
	float inSwath = 1. - smoothstep(uSwath - 3.5, uSwath, abs(vOffset));
	float mapped = inSwath * (1. - smoothstep(uShip + 34., uShip + 60., s));
	float known = .4 + .6 * mapped;
	col *= .58 + .5 * mapped;
	float shallow = smoothstep(1600., 300., vDepth);
	vec3 pen = mix(ink, base * .3, shallow);
	col = mix(col, pen, max(minor * (.07 + .4 * mapped), major * .68 * known));

	// The ping: a thin bright front crossing the swath, with a short afterglow behind it.
	float behind = uPing - s;
	float front = (1. - smoothstep(0., .18, abs(behind))) * inSwath;
	float glow = step(0., behind) * exp(-behind * .16) * inSwath;
	col += ink * (front * .55 + glow * (.1 + .32 * max(minor, major))) * (1. - .75 * shallow);
	// Swath edges and the survey line itself, drawn on the floor.
	float px = fwidth(vOffset);
	float edge = 1. - smoothstep(0., 1.4 * px, abs(abs(vOffset) - uSwath + 1.));
	float track = (1. - smoothstep(0., 1.2 * px, abs(vOffset))) * step(.5, fract(s * .5));
	col += ink * (edge * .1 + track * .3) * (1. - smoothstep(60., 140., dist));

	float fog = 1. - exp(-pow(dist * uFogDensity, 1.6));
	col = mix(col, uFog, fog);
	col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
	gl_FragColor = vec4(col, 1.);
}
