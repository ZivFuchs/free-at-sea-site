import { defineQuery } from "groq";

export const SITE_SETTINGS_QUERY =
	defineQuery(`*[_type == "siteSettings" && _id == "siteSettings"][0]{
	title, tagline, description, email
}`);

export const HOME_PAGE_QUERY = defineQuery(`*[_type == "homePage" && _id == "homePage"][0]{
	"heroVideo": heroVideo.asset->url,
	heroPoster,
	newsletterImage
}`);

export const DONATIONS_QUERY = defineQuery(`*[_type == "donations" && _id == "donations"][0]{
	heading, blurb, note, currency, amounts[]{ value, oneTime, monthly, suggested },
	customOneTime, customMonthly, wallets[]{ label, symbol, chain, network, address, memo },
	other[]{ label, url }
}`);

export const CLIPS_QUERY =
	defineQuery(`*[_type == "clip" && defined(url)] | order(order asc, _createdAt desc){
	_id, title, url, caption, thumbnail
}`);

export const PRESS_QUERY =
	defineQuery(`*[_type == "press" && defined(url) && defined(outlet)] | order(coalesce(importance, 0) desc, publishedAt desc){
	_id, headline, url, outlet, author, kind, quote, publishedAt,
	"logo": logo.asset->{ url, "aspect": metadata.dimensions.aspectRatio },
	thumbnail
}`);
