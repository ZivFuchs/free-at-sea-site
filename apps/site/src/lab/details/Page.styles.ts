import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
	/** A wrapper that isn't there: the sticky header inside still sticks to the page. */
	contents: { display: { default: "contents", ":is([hidden])": "none" } },
});
