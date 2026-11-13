/**
 * Progressive subscribe forms: `<form data-newsletter>` with an `email` input. Sets `data-state` on the form
 * ("sending" | "done" | "error") and writes a message into its `[data-newsletter-status]` (an `aria-live` region).
 * With no `data-endpoint`, it's a demo: no request, success after a beat.
 */
const MESSAGES = {
	invalid: "That email doesn't look right.",
	sending: "Sending…",
	done: "Thanks. You're on the list.",
	error: "Something went wrong. Please try again.",
} as const;

const DEMO_DELAY = 700;

for (const form of document.querySelectorAll<HTMLFormElement>(
	"form[data-newsletter]:not([data-bound])",
)) {
	form.dataset.bound = "";
	form.noValidate = true;
	const input = form.querySelector<HTMLInputElement>('input[name="email"]');
	const status = form.querySelector<HTMLElement>("[data-newsletter-status]");
	const say = (state: keyof typeof MESSAGES) => {
		if (status) status.textContent = MESSAGES[state];
	};

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (!input || form.dataset.state === "sending") return;
		if (!input.checkValidity() || !input.value.trim()) {
			form.dataset.state = "error";
			say("invalid");
			input.focus();
			return;
		}
		form.dataset.state = "sending";
		say("sending");
		const endpoint = form.dataset.endpoint;
		try {
			if (endpoint) {
				const res = await fetch(endpoint, { method: "POST", body: new FormData(form) });
				if (!res.ok) throw new Error(String(res.status));
			} else {
				console.info("[newsletter] demo mode, not sent:", input.value);
				await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY));
			}
			form.dataset.state = "done";
			say("done");
			form.reset();
		} catch {
			form.dataset.state = "error";
			say("error");
		}
	});
	input?.addEventListener("input", () => {
		if (form.dataset.state === "error") delete form.dataset.state;
	});
}
