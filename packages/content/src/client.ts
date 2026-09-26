import { type ClientConfig, createClient, type SanityClient } from "@sanity/client";

/** Pinned once; the Studio's own uploads and queries use it too. */
export const SANITY_API_VERSION = "2026-09-01";

export type SanityConfig = Required<Pick<ClientConfig, "projectId" | "dataset">> &
	Pick<ClientConfig, "token" | "perspective">;

export const makeClient = (config: SanityConfig): SanityClient =>
	createClient({
		apiVersion: SANITY_API_VERSION,
		// Queries run at build time, often seconds after a publish webhook fires. The CDN caches for
		// ~60s, which is long enough to build a site from pre-publish content — verified in practice.
		useCdn: false,
		// Since @sanity/client v7 the default perspective includes drafts; pin it so a read token
		// never leaks unpublished content into a production build. Staging overrides it to preview drafts.
		perspective: "published",
		stega: false,
		maxRetries: 3,
		timeout: 15_000,
		...config,
	});
