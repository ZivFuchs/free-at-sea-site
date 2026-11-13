import type { CompiledStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";

/** `sx()` for the arguments its type leaves out: themes and defined markers. */
export const attrs = (...styles: CompiledStyles[]) => {
	const { className, style } = stylex.props(...styles);
	return { class: className, style };
};
