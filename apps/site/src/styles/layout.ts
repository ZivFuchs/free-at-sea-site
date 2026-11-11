import * as stylex from "@stylexjs/stylex";

export const layout = stylex.create({
	container: {
		marginInline: "auto",
		width: "100%",
		maxWidth: "80rem",
		paddingInline: { default: "1.5rem", "@media (min-width: 48rem)": "2.5rem" },
	},
});
