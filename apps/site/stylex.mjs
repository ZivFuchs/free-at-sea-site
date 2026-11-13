import { fileURLToPath } from "node:url";
import { astryxStylex } from "@astryxdesign/build/vite";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

/* Astro builds server then client; every page links the stylesheet from the SERVER build, so only it may write. */
const WRITERS = new Set(["@stylexjs/unplugin", "astryx-build-layer-split"]);

const serverOnly = (plugin, hooks) =>
	Object.fromEntries(
		hooks
			.filter((h) => typeof plugin[h] === "function")
			.map((h) => [
				h,
				function (...args) {
					if (this.environment?.name === "client") return;
					return plugin[h].apply(this, args);
				},
			]),
	);

export const stylex = () =>
	astryxStylex({
		rootDir: here("."),
		stylexOverrides: {
			aliases: { "@/*": [here("src/*")] },
			/* Every page links global.css. Without this, StyleX picks the first CSS asset, which another imported .css can become. */
			cssInjectionTarget: (file) => /(^|\/)global\.[^/]+\.css$/.test(file),
		},
	}).map((plugin) =>
		WRITERS.has(plugin.name)
			? { ...plugin, ...serverOnly(plugin, ["generateBundle", "writeBundle"]) }
			: plugin,
	);
