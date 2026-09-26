// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
	site: "https://freeatseafilm.com",
	server: { port: 4324 },
	adapter: cloudflare(),
	env: {
		schema: {
			NOINDEX: envField.boolean({ context: "server", access: "public", default: false }),
			SANITY_PERSPECTIVE: envField.enum({
				context: "server",
				access: "public",
				values: ["published", "drafts"],
				default: "published",
			}),
		},
	},
	integrations: [react(), sitemap()],
	vite: {
		plugins: [tailwindcss()],
		resolve: {
			alias: { "@": new URL("./src", import.meta.url).pathname },
		},
	},
});
