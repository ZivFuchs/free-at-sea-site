// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig, envField, fontProviders } from "astro/config";
import { stylex } from "./stylex.mjs";

/** `/api/subscribe` lives in `src/worker.ts`, which `astro dev` doesn't run: accept and log instead. */
/** @type {import("astro").AstroIntegration} */
const devSubscribe = {
	name: "dev-subscribe",
	hooks: {
		"astro:server:setup": ({ server }) => {
			server.middlewares.use("/api/subscribe", (_req, res) => {
				console.info("[subscribe] dev: not sent to Brevo");
				res.statusCode = 204;
				res.end();
			});
		},
	},
};

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
		{
			provider: fontProviders.google(),
			name: "Playfair Display",
			cssVariable: "--font-playfair",
			weights: [900],
		},
	],
	integrations: [
		react(),
		devSubscribe,
		sitemap({ filter: (page) => !new URL(page).pathname.startsWith("/lab") }),
	],
	vite: {
		plugins: [...stylex()],
		resolve: {
			alias: { "@": new URL("./src", import.meta.url).pathname },
		},
	},
});
