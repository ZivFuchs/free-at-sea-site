/** Brevo list new subscribers join. */
const BREVO_LIST_ID = 3;

/**
 * `POST` handler for subscribe forms (`email` field, `website` honeypot): adds the contact to the Brevo list.
 * Served by `src/worker.ts`. 204 on success.
 */
export const subscribe = async (request: Request, apiKey: string | undefined) => {
	if (request.method !== "POST")
		return new Response(null, { status: 405, headers: { Allow: "POST" } });
	const form = await request.formData().catch(() => null);
	const email = form?.get("email");
	if (form?.get("website")) return new Response(null, { status: 204 });
	if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
		return new Response(null, { status: 400 });
	if (!apiKey) {
		console.error("[subscribe] BREVO_API_KEY unset");
		return new Response(null, { status: 503 });
	}
	const res = await fetch("https://api.brevo.com/v3/contacts", {
		method: "POST",
		headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
		body: JSON.stringify({ email: email.trim(), listIds: [BREVO_LIST_ID], updateEnabled: true }),
	});
	if (res.ok) return new Response(null, { status: 204 });
	console.error("[subscribe] Brevo", res.status, await res.text());
	return new Response(null, { status: res.status === 400 ? 400 : 502 });
};
