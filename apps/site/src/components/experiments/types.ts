export interface ExperimentVariant {
	id: string;
	label: string;
	note: string;
}

/**
 * One switchable slot on the page. Every element carrying `data-experiment="<key>"` and
 * `data-variant="<id>"` is shown or hidden by the panel and receives `<key>:activate` /
 * `<key>:deactivate` events; `#<key>=<id>` in the URL picks one on load.
 */
export interface ExperimentGroup {
	key: string;
	label: string;
	variants: readonly ExperimentVariant[];
}
