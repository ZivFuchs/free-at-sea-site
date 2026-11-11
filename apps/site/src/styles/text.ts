import * as stylex from "@stylexjs/stylex";
import { font } from "@/theme/tokens.stylex";

/** Type steps (size + leading), as in Tailwind's scale. */
export const text = stylex.create({
	xs: { fontSize: "0.75rem", lineHeight: "calc(1 / 0.75)" },
	sm: { fontSize: "0.875rem", lineHeight: "calc(1.25 / 0.875)" },
	lg: { fontSize: "1.125rem", lineHeight: "calc(1.75 / 1.125)" },
	xl2: { fontSize: "1.5rem", lineHeight: "calc(2 / 1.5)" },
	xl3: { fontSize: "1.875rem", lineHeight: "calc(2.25 / 1.875)" },
	wordmark: { fontWeight: 700, letterSpacing: "-0.025em" },
	navLink: {
		fontFamily: font.sans,
		letterSpacing: "0.025em",
		transitionProperty: "color",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
});
