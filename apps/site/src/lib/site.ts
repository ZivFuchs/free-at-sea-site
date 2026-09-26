import { SITE_SETTINGS_QUERY, type SITE_SETTINGS_QUERY_RESULT } from "@fas/content";
import { sanity } from "@/lib/sanity";

export type SiteSettings = NonNullable<SITE_SETTINGS_QUERY_RESULT>;

let pending: Promise<SiteSettings> | undefined;

/** Memoised for the build: every page's header, footer and metadata read the same fetch. */
export const getSite = (): Promise<SiteSettings> =>
	(pending ??= sanity.fetch(SITE_SETTINGS_QUERY).then((settings) => {
		if (!settings) {
			throw new Error(
				"No published `siteSettings` document (id: siteSettings) in Sanity. Open the Studio, fill in Site Settings, and publish.",
			);
		}
		return settings;
	}));
