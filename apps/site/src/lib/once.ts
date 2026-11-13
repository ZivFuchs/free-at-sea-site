/**
 * Shares one fetch across a build (every page's header, footer and sections read the same data). In dev the
 * server lives on, so it refetches each time and CMS edits show on reload.
 */
export const buildOnce = <T>(load: () => Promise<T>): (() => Promise<T>) => {
	let pending: Promise<T> | undefined;
	return () => {
		if (import.meta.env.DEV) return load();
		pending ??= load();
		return pending;
	};
};
