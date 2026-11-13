import { clamp, pageProgress, smoothstep } from "@/lab/lib/motion";
import { onScroll } from "./scroll";

/** Drives the site header's scroll variables (`--solid`, `--flip`, `--mark`, `--tide`) on a stand-in header. */
export const headerScroll = (header: HTMLElement, extra?: () => void) =>
	onScroll(() => {
		const y = Math.max(0, scrollY);
		const solid = clamp(y / Math.max(header.offsetHeight, innerHeight * 0.3));
		header.style.setProperty("--tide", String(pageProgress()));
		header.style.setProperty("--solid", String(solid));
		header.style.setProperty("--flip", String(smoothstep(0.25, 0.5, solid)));
		header.style.setProperty("--mark", String(smoothstep(0, innerHeight * 0.12, y)));
		extra?.();
	});
