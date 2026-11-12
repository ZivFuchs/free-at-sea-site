import { defineQuery } from "groq";

export const SITE_SETTINGS_QUERY =
	defineQuery(`*[_type == "siteSettings" && _id == "siteSettings"][0]{
	title, tagline, description, email
}`);

export const HOME_PAGE_QUERY = defineQuery(`*[_type == "homePage" && _id == "homePage"][0]{
	"heroVideo": heroVideo.asset->url,
	heroPoster
}`);

export const CLIPS_QUERY =
	defineQuery(`*[_type == "clip" && defined(url)] | order(order asc, _createdAt desc){
	_id, title, url, caption, thumbnail
}`);
