import noise from "@/lab/lib/glsl/noise.glsl?raw";

const PRECISION = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

/** A fragment body with the precision line and the shared noise helpers in front. */
export const fragment = (body: string) => `${PRECISION}${noise}\n${body}`;
