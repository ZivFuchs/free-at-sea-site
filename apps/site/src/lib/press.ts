import { PRESS_QUERY, type PRESS_QUERY_RESULT } from "@fas/content";
import { image } from "@/lib/image";
import { sanity } from "@/lib/sanity";

type PressDoc = PRESS_QUERY_RESULT[number];

const THUMB_WIDTHS = [480, 800, 1200, 1600];

export interface PressItem {
	id: string;
	headline: string;
	url: string;
	outlet: string;
	author: string | null;
	kind: string | null;
	quote: string | null;
	/** ISO date, and a short display form ("Jan 2025"). */
	date: string | null;
	dateLabel: string | null;
	/** Outlet wordmark (often a dark SVG): `aspect` is width / height. */
	logo: { src: string; aspect: number } | null;
	thumbnail: { src: string; srcset: string; alt: string } | null;
}

const monthYear = new Intl.DateTimeFormat("en-GB", {
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

const resolve = (doc: PressDoc): PressItem => {
	const thumb = doc.thumbnail?.asset ? doc.thumbnail : null;
	const url = (w: number) => (thumb ? image.image(thumb).width(w).auto("format").url() : "");
	return {
		id: doc._id,
		headline: doc.headline ?? doc.outlet ?? "",
		url: doc.url ?? "",
		outlet: doc.outlet ?? "",
		author: doc.author,
		kind: doc.kind,
		quote: doc.quote,
		date: doc.publishedAt,
		dateLabel: doc.publishedAt ? monthYear.format(new Date(doc.publishedAt)) : null,
		logo: doc.logo?.url ? { src: doc.logo.url, aspect: doc.logo.aspect ?? 4 } : null,
		thumbnail: thumb
			? {
					src: url(1200),
					srcset: THUMB_WIDTHS.map((w) => `${url(w)} ${w}w`).join(", "),
					alt: thumb.alt ?? "",
				}
			: null,
	};
};

/** Published press, most important first, then newest. */
export const getPress = async (): Promise<PressItem[]> =>
	(await sanity.fetch(PRESS_QUERY)).map(resolve);
