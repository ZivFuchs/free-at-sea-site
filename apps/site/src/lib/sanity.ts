import { SANITY_PERSPECTIVE } from "astro:env/server";
import { makeClient } from "@fas/content";

const token = import.meta.env.SANITY_API_READ_TOKEN;

// Without a token the API hides drafts silently, so staging would quietly show published content.
if (SANITY_PERSPECTIVE === "drafts" && !token) {
	throw new Error("SANITY_PERSPECTIVE=drafts requires SANITY_API_READ_TOKEN");
}

export const sanity = makeClient({
	projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
	dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? "production",
	token,
	perspective: SANITY_PERSPECTIVE,
});
