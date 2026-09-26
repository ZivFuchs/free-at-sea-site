import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
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
