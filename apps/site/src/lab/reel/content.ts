import { getClips } from "@/lib/clips";
import { buildOnce } from "@/lib/once";
import { getPress } from "@/lib/press";
import { REEL } from "./paths";

export { REEL };

const slug = (id: string) => id.replace(/^drafts\./, "");
export const pad = (n: number) => String(n).padStart(2, "0");

/** One navigable stop of the reel: a clip or a press piece, each with its own page. */
const stop = <T extends { id: string }>(kind: "clip" | "press", items: T[]) =>
	items.map((item, index) => ({
		...item,
		index,
		slug: slug(item.id),
		path: `${REEL}/${kind}/${slug(item.id)}`,
		/** Fragment on the home page that scrolls this stop into view. */
		anchor: `${kind}-${slug(item.id)}`,
	}));

const load = async () => {
	const [clips, press] = await Promise.all([getClips(), getPress()]);
	return {
		clips: stop(
			"clip",
			clips.map(({ _id, ...clip }) => ({ id: _id, ...clip })),
		),
		press: stop("press", press),
	};
};

export const getReel = buildOnce(load);

type Reel = Awaited<ReturnType<typeof getReel>>;
export type ReelClip = Reel["clips"][number];
export type ReelPress = Reel["press"][number];

/** What a detail page needs to link a neighbour. */
export interface Neighbour {
	path: string;
	title: string;
	image: string | null;
}
