/**
 * Donation section behaviour, shared by every layout. Inside a `[data-donate]` root:
 * - tabs: `[data-tab=<id>]` buttons (role=tab) show `[data-panel=<id>]`;
 * - card: `[data-frequency=oneTime|monthly]`, amount buttons `[data-amount][data-one-time][data-monthly]`, and the
 *   `[data-cta]` link (with `[data-cta-label]`, `[data-cta-suffix]`) that follows the selection;
 * - crypto: `[data-wallet=<i>]` buttons show `[data-wallet-pane=<i>]`; `[data-copy=<text>]` buttons copy, with a
 *   `[data-copy-label]` and `data-copied` while confirming.
 * Selection is `aria-pressed` / `aria-selected`; style off those.
 */
const COPIED_MS = 1800;

for (const root of document.querySelectorAll<HTMLElement>("[data-donate]:not([data-bound])")) {
	root.dataset.bound = "";
	const press = (group: Iterable<HTMLElement>, on: HTMLElement) => {
		for (const el of group) el.setAttribute("aria-pressed", String(el === on));
	};

	// Tabs: Card / Crypto / Other, with arrow-key movement.
	const tabs = [...root.querySelectorAll<HTMLButtonElement>("[data-tab]")];
	const select = (tab: HTMLButtonElement) => {
		for (const t of tabs) {
			const on = t === tab;
			t.setAttribute("aria-selected", String(on));
			t.tabIndex = on ? 0 : -1;
			const panel = root.querySelector<HTMLElement>(`[data-panel="${t.dataset.tab}"]`);
			if (panel) panel.hidden = !on;
		}
	};
	tabs.forEach((tab, i) => {
		tab.addEventListener("click", () => select(tab));
		tab.addEventListener("keydown", (event) => {
			const by = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
			if (!by) return;
			const next = tabs[(i + by + tabs.length) % tabs.length];
			if (!next) return;
			select(next);
			next.focus();
		});
	});

	// Card: frequency × amount → the Stripe link on the big button.
	const cta = root.querySelector<HTMLAnchorElement>("[data-cta]");
	const ctaLabel = root.querySelector<HTMLElement>("[data-cta-label]");
	const ctaSuffix = root.querySelector<HTMLElement>("[data-cta-suffix]");
	const frequencies = [...root.querySelectorAll<HTMLButtonElement>("[data-frequency]")];
	const amounts = [...root.querySelectorAll<HTMLButtonElement>("[data-amount]")];
	let frequency: "oneTime" | "monthly" = amounts.some((a) => a.dataset.oneTime)
		? "oneTime"
		: "monthly";
	const link = (a: HTMLElement) =>
		(frequency === "oneTime" ? a.dataset.oneTime : a.dataset.monthly) ?? "";
	const update = () => {
		for (const a of amounts) a.hidden = !link(a);
		let current = amounts.find((a) => a.getAttribute("aria-pressed") === "true" && !a.hidden);
		if (!current) {
			current = amounts.find((a) => !a.hidden);
			if (current) press(amounts, current);
		}
		if (!cta || !current) return;
		cta.href = link(current);
		if (ctaLabel)
			ctaLabel.textContent = current.dataset.amount ? `Donate ${current.dataset.amount}` : "Donate";
		if (ctaSuffix) ctaSuffix.hidden = frequency !== "monthly";
	};
	for (const f of frequencies) {
		f.addEventListener("click", () => {
			frequency = f.dataset.frequency === "monthly" ? "monthly" : "oneTime";
			press(frequencies, f);
			update();
		});
	}
	for (const a of amounts) {
		a.addEventListener("click", () => {
			press(amounts, a);
			update();
		});
	}
	update();

	// Crypto: one wallet shown at a time; copy with feedback.
	const walletButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-wallet]")];
	const walletPanes = [...root.querySelectorAll<HTMLElement>("[data-wallet-pane]")];
	for (const button of walletButtons) {
		button.addEventListener("click", () => {
			press(walletButtons, button);
			for (const pane of walletPanes)
				pane.hidden = pane.dataset.walletPane !== button.dataset.wallet;
		});
	}
	for (const button of root.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
		const label = button.querySelector<HTMLElement>("[data-copy-label]");
		let timer: ReturnType<typeof setTimeout> | undefined;
		button.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(button.dataset.copy ?? "");
				button.dataset.copied = "";
				if (label) label.textContent = "Copied";
			} catch {
				if (label) label.textContent = "Press and hold to copy";
			}
			clearTimeout(timer);
			timer = setTimeout(() => {
				delete button.dataset.copied;
				if (label) label.textContent = "Copy address";
			}, COPIED_MS);
		});
	}
}
