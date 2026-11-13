import type { ExperimentGroup } from "@/components/experiments/types";
import { HERO_KEY } from "./shared";

export const heroExperiment = {
	key: HERO_KEY,
	label: "Hero",
	variants: [
		{
			id: "current",
			label: "1 · Current",
			note: "The homepage hero as it is: footage, title hung from the horizon.",
		},
		{
			id: "letters",
			label: "2 · Letters",
			note: "The film inside the title. Paper ground, the letters its only windows onto the footage. Scroll and you fall through the T into the full frame.",
		},
		{
			id: "depth",
			label: "3 · Living still",
			note: "The photograph in 2.5D. It leans with your pointer or phone, the water flows and glints, the barge holds perfectly still.",
		},
		{
			id: "sinking",
			label: "4 · Sinking",
			note: "The title stands on the horizon, then goes under as you scroll: crisp above the waterline, a rippling ghost below it.",
		},
		{
			id: "forecast",
			label: "5 · Forecast",
			note: "Seastead instruments. The footage sits quiet under a thin title-safe overlay: position, swell, wind, an attitude line rolling a hair. Readings are invented.",
		},
		{
			id: "first-light",
			label: "6 · First light",
			note: "No photo. A drawn sea under your own sky: sun or moon low behind the title by your local clock. Add ?hour=6.2 (or 13, 18.8, 23) before the # to preview.",
		},
	],
} as const satisfies ExperimentGroup;

export type HeroVariantId = (typeof heroExperiment.variants)[number]["id"];
