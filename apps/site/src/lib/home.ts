import { HOME_PAGE_QUERY, type HOME_PAGE_QUERY_RESULT } from "@fas/content";
import { image } from "@/lib/image";
import { LIGHT_LUMINANCE, luminance, pngPixel } from "@/lib/pixel";
import { sanity } from "@/lib/sanity";

type PosterImage = NonNullable<NonNullable<HOME_PAGE_QUERY_RESULT>["heroPoster"]>;

const POSTER_WIDTHS = [768, 1280, 1920, 2880];
/** Share of the poster's height behind the overlay header (a 4.5rem bar over a cover-fitted 16:9 frame). */
const HEADER_BAND = 0.1;

const poster = (source: PosterImage) => {
	const url = (width: number) => image.image(source).width(width).auto("format").url();
	return { src: url(1920), srcset: POSTER_WIDTHS.map((w) => `${url(w)} ${w}w`).join(", ") };
};

/** Whether the strip of poster behind the header is light (wants dark text), averaged to one pixel by Sanity. */
const backdrop = async (source: PosterImage): Promise<"light" | "dark" | null> => {
	const [, width, height] = source.asset?._ref.match(/-(\d+)x(\d+)-/)?.map(Number) ?? [];
	if (!width || !height) return null;
	const band = image
		.image(source)
		.rect(0, 0, width, Math.round(height * HEADER_BAND))
		.width(1)
		.height(1)
		.format("png")
		.url();
	const rgb = await pngPixel(band);
	return rgb && (luminance(rgb) > LIGHT_LUMINANCE ? "light" : "dark");
};

export type Poster = ReturnType<typeof poster>;
export type Home = Awaited<ReturnType<typeof getHome>>;

const load = async () => {
	const home = await sanity.fetch(HOME_PAGE_QUERY);
	const source = home?.heroPoster?.asset ? home.heroPoster : null;
	return {
		heroVideo: home?.heroVideo ?? null,
		heroPoster: source && poster(source),
		/** Tone of the hero right behind the header at the top of the page, so its text can contrast. */
		heroBackdrop: source && (await backdrop(source)),
	};
};

let pending: ReturnType<typeof load> | undefined;

/** Optional singleton: fields are `null` until a Homepage document is published. Memoised for the build. */
export const getHome = () => (pending ??= load());
