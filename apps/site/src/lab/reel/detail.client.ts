import { REEL } from "./paths";

const frame = document.querySelector<HTMLElement>("[data-frame]");
const play = frame?.querySelector<HTMLButtonElement>("[data-play]");
play?.addEventListener("click", () => {
	const iframe = document.createElement("iframe");
	iframe.src = play.dataset.play ?? "";
	iframe.title = play.getAttribute("aria-label") ?? "";
	iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
	iframe.allowFullscreen = true;
	iframe.className = frame?.dataset.fill ?? "";
	play.replaceWith(iframe);
	iframe.focus();
});

/** Arrived from the reel: go back in history, so it returns to the same scroll position. */
document.querySelector("a[data-back]")?.addEventListener("click", (event) => {
	if (!("navigation" in window)) return;
	const { from, navigationType } = navigation.activation ?? {};
	if (navigationType !== "push" || !from?.url) return;
	if (new URL(from.url).pathname.replace(/\/$/, "") !== REEL) return;
	event.preventDefault();
	history.back();
});

addEventListener("keydown", (event) => {
	if (event.metaKey || event.ctrlKey || event.altKey || event.target instanceof HTMLIFrameElement)
		return;
	const rel = event.key === "ArrowRight" ? "next" : event.key === "ArrowLeft" ? "prev" : null;
	if (rel) document.querySelector<HTMLAnchorElement>(`a[rel="${rel}"]`)?.click();
});
