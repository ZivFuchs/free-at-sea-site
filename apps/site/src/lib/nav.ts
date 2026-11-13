import { SHOW_NEWSLETTER } from "@/lib/newsletter";

export interface NavItem {
	label: string;
	href: string;
}

/** The homepage is the only page for now, so the nav jumps to its sections. */
export const NAV: readonly NavItem[] = [
	{ label: "Clips", href: "/#clips" },
	{ label: "Press", href: "/#press" },
	...(SHOW_NEWSLETTER ? [{ label: "Newsletter", href: "/#newsletter" }] : []),
];
