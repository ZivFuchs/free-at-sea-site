import { EXPERIMENTS } from "astro:env/server";

/** Where subscriptions POST (`email` form field). `null` until a provider is chosen: forms then run in demo mode. */
export const NEWSLETTER_ENDPOINT: string | null = null;

/** Demo mode only where it fools no one: dev and staging. */
export const SHOW_NEWSLETTER = Boolean(NEWSLETTER_ENDPOINT) || EXPERIMENTS || import.meta.env.DEV;

/** Attributes for a subscribe `<form>`; `newsletter.client.ts` takes it from there. */
export const newsletterForm = () => ({
	"data-newsletter": "",
	"data-endpoint": NEWSLETTER_ENDPOINT ?? "",
	action: NEWSLETTER_ENDPOINT ?? undefined,
	method: "post",
});
