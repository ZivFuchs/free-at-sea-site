import { defineField, defineType } from "sanity";

/** Coverage of the film: an article, review, interview or broadcast elsewhere, linked from the site. */
export const press = defineType({
	name: "press",
	title: "Press",
	type: "document",
	fields: [
		defineField({
			name: "headline",
			type: "string",
			description: "The piece's own title",
			validation: (rule) => rule.required().max(160),
		}),
		defineField({
			name: "url",
			title: "Article link",
			type: "url",
			validation: (rule) => rule.required().uri({ scheme: ["https", "http"] }),
		}),
		defineField({
			name: "outlet",
			title: "Outlet name",
			type: "string",
			description: "Publication or show, e.g. “The Guardian”",
			validation: (rule) => rule.required().max(80),
		}),
		defineField({
			name: "logo",
			title: "Outlet logo",
			type: "image",
			description: "Ideally an SVG or a transparent PNG of the wordmark, single colour",
			options: { accept: "image/svg+xml,image/png,image/webp" },
		}),
		defineField({
			name: "thumbnail",
			type: "image",
			description: "Lead image from the piece, or a still from the film",
			options: { hotspot: true },
			fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
		}),
		defineField({ name: "publishedAt", title: "Published", type: "date" }),
		defineField({
			name: "kind",
			type: "string",
			options: {
				list: ["Review", "Feature", "Interview", "News", "Podcast", "Broadcast"],
				layout: "radio",
				direction: "horizontal",
			},
		}),
		defineField({ name: "author", type: "string", description: "Byline, if credited" }),
		defineField({
			name: "quote",
			title: "Pull quote",
			type: "text",
			rows: 3,
			description: "A line worth quoting on the site, verbatim from the piece",
			validation: (rule) => rule.max(280),
		}),
		defineField({
			name: "importance",
			type: "number",
			description: "Higher shows first on the site; ties fall back to newest",
			initialValue: 0,
			validation: (rule) => rule.integer(),
		}),
	],
	orderings: [
		{
			title: "Newest first",
			name: "publishedDesc",
			by: [{ field: "publishedAt", direction: "desc" }],
		},
	],
	preview: {
		select: {
			title: "headline",
			outlet: "outlet",
			date: "publishedAt",
			thumbnail: "thumbnail",
			logo: "logo",
		},
		prepare: ({ title, outlet, date, thumbnail, logo }) => ({
			title,
			subtitle: [outlet, date].filter(Boolean).join(" · "),
			media: thumbnail ?? logo,
		}),
	},
});
