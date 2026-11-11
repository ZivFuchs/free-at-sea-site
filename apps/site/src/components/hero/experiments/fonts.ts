import type { Font } from "astro:assets";
import type { ComponentProps } from "astro/types";
import type { ExperimentGroup, ExperimentVariant } from "@/components/experiments/types";

interface HeroFont extends ExperimentVariant {
	cssVariable: ComponentProps<typeof Font>["cssVariable"];
	/** Scales the title so every face spans roughly the same width. */
	size: number;
	tracking?: string;
}

export const HERO_FONTS: readonly HeroFont[] = [
	{
		id: "anton",
		label: "Anton",
		note: "Heavy condensed grotesk. Film-poster weight, the current pick.",
		cssVariable: "--font-anton",
		size: 1,
	},
	{
		id: "bebas",
		label: "Bebas Neue",
		note: "Tall condensed caps, lighter than Anton. Clean, more modern documentary.",
		cssVariable: "--font-bebas",
		size: 1.2,
	},
	{
		id: "big-shoulders",
		label: "Big Shoulders",
		note: "Black, squared-off industrial signage letters. Harbours, containers, barges.",
		cssVariable: "--font-big-shoulders",
		size: 0.69,
	},
	{
		id: "cinzel",
		label: "Cinzel",
		note: "Roman inscription capitals. The epic-film register, timeless rather than modern.",
		cssVariable: "--font-cinzel",
		size: 0.65,
		tracking: "0.04em",
	},
	{
		id: "playfair",
		label: "Playfair",
		note: "High-contrast black serif. Elegant and literary, reads as prestige documentary.",
		cssVariable: "--font-playfair",
		size: 0.7,
	},
	{
		id: "unbounded",
		label: "Unbounded",
		note: "Wide, rounded geometric. Futurist and hopeful: the seastead as frontier tech.",
		cssVariable: "--font-unbounded",
		size: 0.55,
	},
];

export const heroFontExperiment: ExperimentGroup = {
	key: "hero-font",
	label: "Hero font",
	variants: HERO_FONTS,
};
