#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_time;
/* Page scroll in viewport heights: the surface travels with the page. */
uniform float u_scroll;
/* The thing below: centre (screen space, y up, viewport height = 1), heading, size. */
uniform vec2 u_pos;
uniform vec2 u_dir;
uniform float u_scale;
/* 0 whale, 1 pod, 2 ray, 3 school. */
uniform float u_kind;
uniform float u_vis;
uniform float u_beat;
/* 0 deep, 1 back through the surface; u_ring 0 → 1 as the foam ring spreads. */
uniform float u_surf;
uniform float u_ring;
