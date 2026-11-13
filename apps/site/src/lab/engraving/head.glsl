#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_time;
uniform sampler2D u_img;
/* Image width / height, and the point (y up) pinned under cover-fit: its y is also the horizon. */
uniform float u_aspect;
uniform vec2 u_focus;
/* Line spacing in device px at the foot of the frame. */
uniform float u_pitch;
/* 0 engraving, 1 photograph. */
uniform float u_reveal;
/* 1 feathers the plate into the paper around `u_centre`. */
uniform float u_vignette;
uniform vec2 u_centre;
uniform vec2 u_radius;
/* 1: lines recede to the horizon and the sky is stippled. */
uniform float u_persp;
/* Luminance mapped to paper (y) and solid ink (x). */
uniform vec2 u_levels;
uniform vec3 u_ink;
uniform vec3 u_paper;
