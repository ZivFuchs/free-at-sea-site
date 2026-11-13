/** Attributes for a subscribe `<form>` (`email` input, hidden `website` honeypot); `newsletter.client.ts` takes it from there. */
export const newsletterForm = () => ({
	"data-newsletter": "",
	action: "/api/subscribe",
	method: "post",
});
