attribute float aTier;
attribute float aPart;
attribute vec2 aHome;
attribute vec2 aSeed;
attribute vec2 aTiming;
attribute vec3 aShape;
attribute float aKind;
attribute vec4 aRand;

uniform float uProgress;
uniform float uSpread;

varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec2 vLocal;
varying float vPart;
varying float vKind;
varying float vLock;
varying float vHeight;
varying vec4 vRand;

void main() {
	float lock = smoothstep(aTiming.x, aTiming.x + .07, uProgress);
	float join = smoothstep(aTiming.y, aTiming.y + .16, uProgress);
	float building = step(3.5, aKind);

	float spread = mix(uSpread, 1., join);
	vec2 c = aSeed * spread + (aHome - aSeed) * mix(spread, 1., lock);
	vec2 adrift = (aRand.xy - .5) * .9 + .32 * vec2(sin(uTime * .21 + aRand.x * 40.), cos(uTime * .17 + aRand.y * 40.));
	c += adrift * (1. - lock);
	float yaw = ((aRand.z - .5) * 1.1 + .14 * sin(uTime * .12 + aRand.w * 30.)) * (1. - lock);

	vec3 w = swell(c, 1. - lock);
	vec2 slope = w.yz * (1. - lock * .85);

	float height = aShape.y * mix(1., smoothstep(aTiming.x + .04, aTiming.x + .2, uProgress), building);
	float y = aShape.z + (aTier < 1.5 ? height - (aTier > .5 ? min(.055, height) : 0.) : 0.);

	float cy = cos(yaw), sy = sin(yaw);
	mat2 turn = mat2(cy, sy, -sy, cy);
	vec2 flat_ = turn * position.xz * aShape.x;
	vec3 n = normal;
	n.xz = turn * n.xz;

	vec3 ax = normalize(vec3(1., slope.x, 0.));
	vec3 az = normalize(vec3(0., slope.y, 1.));
	vec3 up = normalize(vec3(-slope.x, 1., -slope.y));

	vWorld = vec3(c.x, w.x, c.y) + ax * flat_.x + up * y + az * flat_.y;
	vNormal = normalize(ax * n.x + up * n.y + az * n.z);
	vUv = uv;
	vLocal = position.xz;
	vPart = aPart;
	vKind = aKind;
	vLock = lock;
	vHeight = aShape.y;
	vRand = aRand;
	gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
}
