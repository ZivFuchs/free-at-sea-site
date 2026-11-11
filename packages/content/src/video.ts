export type VideoRef =
	| { provider: "youtube"; id: string }
	| { provider: "vimeo"; id: string; hash?: string };

const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_PATH = /^\/(?:embed|shorts|live|v)\/([\w-]{11})/;

/** YouTube or Vimeo watch/share/embed URL → provider + id, or `null` if unrecognised. */
export const parseVideoUrl = (input: string): VideoRef | null => {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		return null;
	}
	const host = url.hostname.replace(/^(www|m)\./, "");
	const segments = url.pathname.split("/").filter(Boolean);

	if (host === "youtu.be") {
		const id = segments[0];
		return id && YOUTUBE_ID.test(id) ? { provider: "youtube", id } : null;
	}
	if (host === "youtube.com" || host === "youtube-nocookie.com") {
		const id = url.searchParams.get("v") ?? url.pathname.match(YOUTUBE_PATH)?.[1];
		return id && YOUTUBE_ID.test(id) ? { provider: "youtube", id } : null;
	}
	if (host === "vimeo.com" || host === "player.vimeo.com") {
		const index = segments.findIndex((s) => /^\d+$/.test(s));
		if (index === -1) return null;
		const id = segments[index] as string;
		const hash = url.searchParams.get("h") ?? segments[index + 1]?.match(/^[\da-f]+$/)?.[0];
		return { provider: "vimeo", id, ...(hash && { hash }) };
	}
	return null;
};

/** Privacy-friendly player URL that starts playing on load. */
export const embedUrl = (ref: VideoRef): string => {
	if (ref.provider === "youtube") {
		return `https://www.youtube-nocookie.com/embed/${ref.id}?autoplay=1&rel=0&playsinline=1`;
	}
	const params = new URLSearchParams({ autoplay: "1", dnt: "1", ...(ref.hash && { h: ref.hash }) });
	return `https://player.vimeo.com/video/${ref.id}?${params}`;
};
