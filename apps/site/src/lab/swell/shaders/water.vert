uniform vec4 uWaves[6];
varying vec3 vWorld;
varying vec2 vP0;
varying float vH;

void main() {
	vec2 p0 = position.xz;
	float r = length(p0);
	vec3 p = position;
	for (int i = 0; i < 6; i++) {
		vec4 w = uWaves[i];
		float k = TAU / w.z;
		float f = k * (dot(w.xy, p0) - sqrt(9.8 / k) * uTime);
		float a = w.w / k * exp(-r / (w.z * 40.));
		p.xz += w.xy * (a * cos(f));
		p.y += a * sin(f);
	}
	vWorld = p;
	vP0 = p0;
	vH = p.y;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}
