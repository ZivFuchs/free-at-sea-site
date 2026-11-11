export interface NavItem {
	label: string;
	href: string;
}

export const NAV: readonly NavItem[] = [
	{ label: "The Film", href: "/film" },
	{ label: "Screenings", href: "/screenings" },
	{ label: "About", href: "/about" },
];
