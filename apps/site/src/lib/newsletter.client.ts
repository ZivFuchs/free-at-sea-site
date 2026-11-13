/**
 * Progressive subscribe forms: `<form data-newsletter>` with an `email` input. Sets `data-state` on the form
 * ("sending" | "done" | "error") and writes a message into its `[data-newsletter-status]` (an `aria-live` region).
 */
const MESSAGES = {
	invalid: "That email doesn't look right.",
	sending: "Sending…",
	done: "Thanks. You're on the list.",
	error: "Something went wrong. Please try again.",
} as const;

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
		try {
			const res = await fetch(form.action, { method: "POST", body: new FormData(form) });
			if (res.status === 400) {
				form.dataset.state = "error";
				say("invalid");
				return;
			}
			if (!res.ok) throw new Error(String(res.status));
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
