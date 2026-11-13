import type { ExperimentGroup, ExperimentVariant } from "@/components/experiments/types";
import type { DonateVariantProps } from "./props";

interface VariantModule {
	default: (props: DonateVariantProps) => unknown;
	variant: ExperimentVariant;
}

/** Every `NN-Name.astro` here, in file order; each exports `variant` (id, label, note). */
const modules = import.meta.glob<VariantModule>("./[0-9][0-9]-*.astro", { eager: true });

export const DONATE_VARIANTS = Object.keys(modules)
	.sort()
	.map((path, i) => {
		const { default: Component, variant } = modules[path] as VariantModule;
		return { ...variant, label: `${i + 1} · ${variant.label}`, Component };
	});

export const donateExperiment: ExperimentGroup = {
	key: "donate",
	label: "Donate",
	variants: DONATE_VARIANTS.map(({ id, label, note }) => ({ id, label, note })),
};
