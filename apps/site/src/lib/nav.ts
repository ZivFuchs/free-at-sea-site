export interface NavItem {
	label: string;
	href: string;
}

/** The homepage is the only page for now, so the nav jumps to its sections. */
export const NAV: readonly NavItem[] = [
	{ label: "Clips", href: "/#clips" },
	{ label: "Press", href: "/#press" },
	{ label: "Newsletter", href: "/#newsletter" },
];
