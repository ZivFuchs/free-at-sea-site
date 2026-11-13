export interface Section {
	id: string;
	label: string;
}

/** The page's stops, top to bottom. Wrappers carry `id` and `data-section={label}`. */
export const SECTIONS = [
	{ id: "d-surface", label: "Surface" },
	{ id: "d-clips", label: "Clips" },
	{ id: "d-press", label: "Press" },
	{ id: "d-newsletter", label: "Newsletter" },
] as const satisfies readonly Section[];

export const NAV: readonly Section[] = SECTIONS.slice(1);
