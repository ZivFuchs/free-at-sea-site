import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
	server: { port: 3335 },
	api: {
		projectId: "k50pujy4",
		dataset: "production",
	},
	typegen: {
		path: "../../packages/content/src/**/*.ts",
		generates: "../../packages/content/src/generated/sanity.types.ts",
		overloadClientMethods: true,
	},
	deployment: {
		autoUpdates: true,
	},
});
