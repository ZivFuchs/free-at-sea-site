import type { ExperimentGroup, ExperimentVariant } from "@/components/experiments/types";
import abyss from "./shaders/abyss.frag?raw";
import common from "./shaders/common.glsl?raw";
import descent from "./shaders/descent.frag?raw";
import seabed from "./shaders/seabed.glsl?raw";
import shallows from "./shaders/shallows.frag?raw";
import sunken from "./shaders/sunken.frag?raw";
import survey from "./shaders/survey.frag?raw";

interface FooterVariant extends ExperimentVariant {
	sources: readonly string[];
	resolution?: number;
	/** Sets the site title into the scene. */
	wordmark?: boolean;
	/** Instrument readouts over the scene, left and right. */
	hud?: readonly [string, string];
}

export const FOOTER_VARIANTS: readonly FooterVariant[] = [
	{
		id: "shallows",
		label: "1 · Shallows",
		note: "Looking straight down at rippled sand in shallow water, sunlight netting across it in caustics that split faintly into colour.",
		sources: [common, seabed, shallows],
	},
	{
		id: "descent",
		label: "2 · Descent",
		note: "Side-on in the water column: shafts of light fanning down, drifting particles catching them, the floor in haze below.",
		sources: [common, descent],
	},
	{
		id: "abyss",
		label: "3 · Abyss",
		note: "The midnight zone. Almost black, marine snow falling with depth of field, bioluminescence pulsing now and then.",
		sources: [common, abyss],
	},
	{
		id: "survey",
		label: "4 · Survey",
		note: "An ROV gliding over the deep floor by lamplight, the water eating reds first. Rendered terrain, not an image.",
		sources: [common, survey],
		resolution: 0.4,
		hud: ["ROV-2 · Cam 1", "Depth 3,812 m"],
	},
	{
		id: "sunken",
		label: "5 · Sunken",
		note: "The title lies on the sunlit floor like stone, half buried by drifts, caustics playing over it. Echoes the submerged hero title.",
		sources: [common, seabed, sunken],
		wordmark: true,
	},
];

export const footerExperiment: ExperimentGroup = {
	key: "footer",
	label: "Footer",
	variants: FOOTER_VARIANTS,
};
