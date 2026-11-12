import {
	CLIPS_QUERY,
	type CLIPS_QUERY_RESULT,
	embedUrl,
	parseVideoUrl,
	type VideoRef,
} from "@fas/content";
import { image } from "@/lib/image";
import { sanity } from "@/lib/sanity";

type ClipDoc = CLIPS_QUERY_RESULT[number];

export interface Clip extends Pick<ClipDoc, "_id" | "title" | "url" | "caption"> {
	embed: string;
	thumbnail: string | null;
}

const THUMB_WIDTH = 1280;

const ok = async (url: string) =>
	(await fetch(url, { method: "HEAD" }).catch(() => null))?.ok ?? false;

/** Provider's own poster: YouTube's max-res still when it exists, else Vimeo's oEmbed thumbnail. */
const providerThumbnail = async (ref: VideoRef, url: string): Promise<string | null> => {
	if (ref.provider === "youtube") {
		const max = `https://i.ytimg.com/vi/${ref.id}/maxresdefault.jpg`;
		return (await ok(max)) ? max : `https://i.ytimg.com/vi/${ref.id}/hqdefault.jpg`;
	}
	const oembed = `https://vimeo.com/api/oembed.json?${new URLSearchParams({ url, width: String(THUMB_WIDTH) })}`;
	const res = await fetch(oembed).catch(() => null);
	if (!res?.ok) return null;
	const { thumbnail_url } = (await res.json()) as { thumbnail_url?: string };
	return thumbnail_url ?? null;
};

const resolveClip = async ({ thumbnail, ...doc }: ClipDoc): Promise<Clip | null> => {
	const ref = parseVideoUrl(doc.url);
	if (!ref) return null;
	return {
		...doc,
		embed: embedUrl(ref),
		thumbnail: thumbnail?.asset
			? image
					.image(thumbnail)
					.width(THUMB_WIDTH)
					.height((THUMB_WIDTH * 9) / 16)
					.auto("format")
					.url()
			: await providerThumbnail(ref, doc.url),
	};
};

/** Published clips with playable embed URLs. */
export const getClips = async (): Promise<Clip[]> =>
	(await Promise.all((await sanity.fetch(CLIPS_QUERY)).map(resolveClip))).filter(
		(clip) => clip !== null,
	);
