import { defineQuery } from "groq";

export const SITE_SETTINGS_QUERY =
	defineQuery(`*[_type == "siteSettings" && _id == "siteSettings"][0]{
	title, tagline, description, email
}`);

export const CLIPS_QUERY =
	defineQuery(`*[_type == "clip" && defined(url)] | order(order asc, _createdAt desc){
	_id, title, url, caption, thumbnail
}`);
