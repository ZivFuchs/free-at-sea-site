import { HOME_PAGE_QUERY, type HOME_PAGE_QUERY_RESULT } from "@fas/content";
import { image } from "@/lib/image";
import { sanity } from "@/lib/sanity";

type PosterImage = NonNullable<NonNullable<HOME_PAGE_QUERY_RESULT>["heroPoster"]>;

const POSTER_WIDTHS = [768, 1280, 1920, 2880];

const poster = (source: PosterImage) => {
	const url = (width: number) => image.image(source).width(width).auto("format").url();
	return { src: url(1920), srcset: POSTER_WIDTHS.map((w) => `${url(w)} ${w}w`).join(", ") };
};

export type Poster = ReturnType<typeof poster>;
export type Home = Awaited<ReturnType<typeof getHome>>;

/** Optional singleton: fields are `null` until a Homepage document is published. */
export const getHome = async () => {
	const home = await sanity.fetch(HOME_PAGE_QUERY);
	return {
		heroVideo: home?.heroVideo ?? null,
		heroPoster: home?.heroPoster?.asset ? poster(home.heroPoster) : null,
	};
};
