import { defineField, defineType } from "sanity";
import { HeroVideoInput } from "../components/HeroVideoInput";

/** Singleton, id `homePage`. */
export const homePage = defineType({
	name: "homePage",
	title: "Homepage",
	type: "document",
	fields: [
		defineField({
			name: "heroVideo",
			title: "Hero background loop",
			type: "file",
			description:
				"Muted, seamless loop behind the homepage title. MP4 (H.264), 10–20s, ideally under 8 MB",
			options: { accept: "video/mp4,video/webm" },
			components: { input: HeroVideoInput },
		}),
		defineField({
			name: "heroPoster",
			title: "Hero poster",
			type: "image",
			description: "The loop's first frame, captured automatically. Shown until the loop plays",
			readOnly: true,
		}),
		defineField({ name: "heroPosterFor", type: "string", hidden: true, readOnly: true }),
		defineField({
			name: "newsletterImage",
			title: "Newsletter background",
			type: "image",
			description:
				"Wide photo behind the newsletter sign-up, shown darkened under the card. Set the hotspot to keep the subject in frame. Empty: the barge still",
			options: { hotspot: true },
		}),
	],
	preview: { prepare: () => ({ title: "Homepage" }) },
});
