import { defineTheme } from "@astryxdesign/core/theme";

const SANS =
	'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

const PAPER = "oklch(0.985 0.003 230)";
const INK = "oklch(0.2 0.03 240)";
const MUTED = "oklch(0.48 0.02 240)";
const ACCENT = "oklch(0.45 0.09 230)";

export const freeAtSeaTheme = defineTheme({
	name: "free-at-sea",
	typography: {
		body: { family: "Georgia", fallbacks: '"Times New Roman", serif' },
		heading: { weight: "normal" },
		code: {
			family: "ui-monospace",
			fallbacks: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		},
	},
	tokens: {
		"--color-accent": ACCENT,
		"--color-on-accent": PAPER,
		"--color-background-body": PAPER,
		"--color-text-primary": INK,
		"--color-text-secondary": MUTED,
		"--focus-outline-color": ACCENT,
	},
	localTokens: {
		"--app-paper": PAPER,
		"--app-ink": INK,
		"--app-muted": MUTED,
		"--app-accent": ACCENT,
		"--app-font-sans": SANS,
		"--app-font-display": "var(--font-anton), Impact, sans-serif",
	},
});
