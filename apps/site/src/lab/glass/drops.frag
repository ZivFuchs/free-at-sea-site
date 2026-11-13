precision highp float;

uniform vec2 u_res;
uniform vec3 u_balls[8];
/* Canvas px per CSS px. */
uniform float u_px;

/* Towards the light, y down: up and to the left. */
const vec2 LIGHT = vec2(-.55, -.835);

float field(vec2 p, out vec2 grad) {
	float f = 0.;
	grad = vec2(0.);
	for (int i = 0; i < 8; i++) {
		vec3 b = u_balls[i];
		if (b.z <= 0.) continue;
		vec2 d = p - b.xy;
		float d2 = dot(d, d) + 1.;
		float r2 = b.z * b.z;
		f += r2 / d2;
		grad -= 2. * r2 * d / (d2 * d2);
	}
	return f;
}

void main() {
	vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
	vec2 gf;
	float f = field(p, gf);
	/* 0 at a drop's centre, 1 on its outline. */
	float rho = inversesqrt(max(f, 1e-4));
	vec2 gr = -.5 * rho * rho * rho * gf;
	float slope = max(length(gr), 1e-6);
	vec2 n = gr / slope;
	float inside = clamp((1. - rho) / slope + .5, 0., 1.);

	float h = sqrt(max(1. - rho * rho, 0.));
	vec3 normal = normalize(vec3(n * rho, h + .12));
	vec3 light = normalize(vec3(LIGHT, .8));
	float spec = pow(max(reflect(-light, normal).z, 0.), 120.);
	float sheen = pow(max(reflect(-light, normal).z, 0.), 9.) * .1;

	float facing = dot(n, LIGHT);
	float rim = smoothstep(.45, 1., rho);
	/* A drop is dark on the side the light enters and bright where it gathers on the far side. */
	float shade = rim * max(facing, 0.) * .5 + smoothstep(1. - 2.5 * slope * u_px, 1., rho) * .3;
	float glow = rim * rim * max(-facing, 0.) * .5 + spec + sheen;

	vec2 gs;
	float beyond = inversesqrt(max(field(p + LIGHT * 9. * u_px, gs), 1e-4));
	float shadow = smoothstep(1.12, .8, beyond) * (1. - inside) * .3;

	float white = clamp(glow, 0., 1.) * inside;
	float black = shade * inside + shadow;
	gl_FragColor = vec4(vec3(white), white + black * (1. - white));
}
