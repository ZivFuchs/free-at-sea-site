import { SITE_SETTINGS_QUERY, type SITE_SETTINGS_QUERY_RESULT } from "@fas/content";
import { buildOnce } from "@/lib/once";
import { sanity } from "@/lib/sanity";

export type SiteSettings = NonNullable<SITE_SETTINGS_QUERY_RESULT>;

export const getSite = buildOnce(
	(): Promise<SiteSettings> =>
		sanity.fetch(SITE_SETTINGS_QUERY).then((settings) => {
			if (!settings) {
				throw new Error(
					"No published `siteSettings` document (id: siteSettings) in Sanity. Open the Studio, fill in Site Settings, and publish.",
				);
			}
			return settings;
		}),
);
