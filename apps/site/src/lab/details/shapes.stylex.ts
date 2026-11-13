import * as stylex from "@stylexjs/stylex";

/** Wave silhouettes as mask tiles (repeat-x): filled below the curve, or the curve alone as a line. */
export const shape = stylex.defineConsts({
	ripple:
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 8' preserveAspectRatio='none'%3E%3Cpath d='M0 4Q16 -2 32 4T64 4V8H0Z'/%3E%3C/svg%3E\")",
	swell:
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 40' preserveAspectRatio='none'%3E%3Cpath d='M0 14Q60 0 120 14T240 14V40H0Z'/%3E%3C/svg%3E\")",
	swellLine:
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 40' preserveAspectRatio='none'%3E%3Cpath d='M0 14Q60 0 120 14T240 14' fill='none' stroke='%23000' stroke-width='1.5' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E\")",
});
