// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig, envField, fontProviders } from "astro/config";
import { stylex } from "./stylex.mjs";

export default defineConfig({
	site: "https://freeatseafilm.com",
	server: { port: 4324 },
	adapter: cloudflare(),
	env: {
		schema: {
			NOINDEX: envField.boolean({ context: "server", access: "public", default: false }),
			EXPERIMENTS: envField.boolean({ context: "server", access: "public", default: false }),
			SANITY_PERSPECTIVE: envField.enum({
				context: "server",
				access: "public",
				values: ["published", "drafts"],
				default: "published",
			}),
		},
	},
	fonts: [
		{ provider: fontProviders.google(), name: "Anton", cssVariable: "--font-anton" },
		// Hero font experiment candidates
		{ provider: fontProviders.google(), name: "Bebas Neue", cssVariable: "--font-bebas" },
		{
			provider: fontProviders.google(),
			name: "Big Shoulders Display",
			cssVariable: "--font-big-shoulders",
			weights: [900],
		},
		{
			provider: fontProviders.google(),
			name: "Cinzel",
			cssVariable: "--font-cinzel",
			weights: [700],
		},
		{
			provider: fontProviders.google(),
			name: "Playfair Display",
			cssVariable: "--font-playfair",
			weights: [900],
		},
		{
			provider: fontProviders.google(),
			name: "Unbounded",
			cssVariable: "--font-unbounded",
			weights: [800],
		},
	],
	integrations: [react(), sitemap()],
	vite: {
		plugins: [...stylex()],
		resolve: {
			alias: { "@": new URL("./src", import.meta.url).pathname },
		},
	},
});
