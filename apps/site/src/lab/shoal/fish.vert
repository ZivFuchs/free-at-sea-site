attribute vec3 iPos;
attribute vec3 iDir;
attribute vec4 iMisc;

uniform float uFogNear;
uniform float uFogFar;

varying vec2 vUv;
varying float vPhase;
varying float vFlash;
varying float vSoft;
varying float vFog;
varying float vLight;

void main() {
	vec4 mv = modelViewMatrix * vec4(iPos, 1.);
	float l = length(iDir.xy);
	vec2 f = l > .001 ? iDir.xy / l : vec2(1., 0.);
	vec2 up = vec2(-f.y, f.x) * (f.x < 0. ? -1. : 1.);
	float size = iMisc.y;
	mv.xy += f * position.x * size * max(l, .35) + up * position.y * size;
	gl_Position = projectionMatrix * mv;

	vUv = uv;
	vPhase = iMisc.x;
	vFlash = iMisc.z;
	vSoft = iMisc.w;
	vFog = smoothstep(uFogNear, uFogFar, -mv.z);
	vLight = clamp(.8 + iPos.y * .09, .55, 1.15);
}
