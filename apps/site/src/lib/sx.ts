import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";

type Style = StyleXStyles | false | null | undefined;

/** `stylex.props` as Astro attributes: `.astro` files aren't StyleX-compiled, so their styles live in `*.styles.ts`. */
export const sx = (...styles: Style[]) => {
	const { className, style } = stylex.props(...styles);
	return { class: className, style };
};
