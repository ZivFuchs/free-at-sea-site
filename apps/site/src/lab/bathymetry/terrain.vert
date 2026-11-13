attribute float aDepth;
attribute float aOffset;
varying float vDepth;
varying float vOffset;
varying vec3 vNormal;
varying vec3 vWorld;

void main() {
	vDepth = aDepth;
	vOffset = aOffset;
	vNormal = normal;
	vWorld = position;
	gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.);
}
