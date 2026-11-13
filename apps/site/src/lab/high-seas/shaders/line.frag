precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uDim;
uniform float uBack;
varying float vFront;

void main() {
	gl_FragColor = vec4(uColor, uOpacity * uDim * mix(uBack, 1., vFront));
}
