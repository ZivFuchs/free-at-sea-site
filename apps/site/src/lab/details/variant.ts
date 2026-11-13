interface Hooks<E extends HTMLElement> {
	/** Starts the variant on one of its elements; returns its teardown. */
	on: (el: E) => (() => void) | undefined;
}

/**
 * Wires every element of one experiment variant to the panel: `on` when it becomes the shown variant,
 * its returned teardown when it stops being so. Idempotent, whichever of this and the panel script runs first.
 */
export const variant = <E extends HTMLElement = HTMLElement>(
	group: string,
	id: string,
	{ on }: Hooks<E>,
) => {
	const els = document.querySelectorAll<E>(`[data-experiment="${group}"][data-variant="${id}"]`);
	for (const el of els) {
		let active = false;
		let off: (() => void) | undefined;
		const sync = () => {
			const next = el.hasAttribute("data-active") && !el.hidden;
			if (next === active) return;
			active = next;
			if (active) off = on(el);
			else off?.();
		};
		el.addEventListener(`${group}:activate`, sync);
		el.addEventListener(`${group}:deactivate`, sync);
		sync();
	}
};
