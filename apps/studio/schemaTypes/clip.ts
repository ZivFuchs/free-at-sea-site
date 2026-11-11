import { parseVideoUrl } from "@fas/content";
import { defineField, defineType } from "sanity";

/** A clip from the film, hosted on YouTube or Vimeo and embedded on the site. */
export const clip = defineType({
	name: "clip",
	title: "Clip",
	type: "document",
	fields: [
		defineField({ name: "title", type: "string", validation: (rule) => rule.required().max(80) }),
		defineField({
			name: "url",
			title: "Video URL",
			type: "url",
			description:
				"YouTube or Vimeo link (watch, share or embed URL; unlisted Vimeo links work too)",
			validation: (rule) =>
				rule
					.required()
					.uri({ scheme: ["https"] })
					.custom(
						(url) => !url || parseVideoUrl(url) !== null || "Must be a YouTube or Vimeo video URL",
					),
		}),
		defineField({ name: "caption", type: "text", rows: 2, validation: (rule) => rule.max(200) }),
		defineField({
			name: "thumbnail",
			type: "image",
			description: "Optional. Defaults to the video's own thumbnail",
			options: { hotspot: true },
		}),
		defineField({
			name: "order",
			type: "number",
			description: "Lower shows first. The first clip is featured",
			initialValue: 0,
		}),
	],
	orderings: [
		{ title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] },
	],
	preview: { select: { title: "title", subtitle: "url", media: "thumbnail" } },
});
