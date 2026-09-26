import { defineField, defineType } from "sanity";

/** Singleton, id `siteSettings`. Site-wide copy only — navigation stays in the site's routes. */
export const siteSettings = defineType({
	name: "siteSettings",
	title: "Site Settings",
	type: "document",
	fields: [
		defineField({
			name: "title",
			type: "string",
			description: "Film title, used as the wordmark and default page title",
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "tagline",
			type: "string",
			description: "One line, used as the homepage headline",
			validation: (rule) => rule.required().max(120),
		}),
		defineField({
			name: "description",
			type: "text",
			rows: 3,
			description: "Default meta description, used when a page sets none",
			validation: (rule) => rule.required().max(200),
		}),
		defineField({
			name: "email",
			title: "Contact email",
			type: "string",
			validation: (rule) => rule.email(),
		}),
	],
	preview: { select: { title: "title", subtitle: "tagline" } },
});
