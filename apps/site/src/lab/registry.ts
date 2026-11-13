export type Mood = "Living water" | "The deep" | "Seastead future";

export interface LabEntry {
	slug: string;
	title: string;
	moods: readonly Mood[];
	tech: readonly string[];
	pitch: string;
}

/** Every experiment under `/lab/<slug>`. Design-review scaffolding: not meant to ship. */
export const LAB: readonly LabEntry[] = [
	{
		slug: "descent",
		title: "The Descent",
		moods: ["The deep"],
		tech: ["Fragment shader", "Scroll-driven", "Web Audio"],
		pitch:
			"The page is a dive. Scroll is depth: sunlit shafts give way to twilight, then a black midnight zone lit by bioluminescence, with the seabed as the footer.",
	},
	{
		slug: "swell",
		title: "Swell",
		moods: ["Living water"],
		tech: ["three.js", "Gerstner waves", "Sky model"],
		pitch:
			"A real 3D ocean under a physical sky. Scrolling turns the day: dawn at the hero, noon, golden hour, then night with the moon on the water. The whole palette follows the sun.",
	},
	{
		slug: "seastead",
		title: "Seastead",
		moods: ["Seastead future"],
		tech: ["three.js", "Procedural model", "Camera path"],
		pitch:
			"A floating settlement, modelled in code, that assembles from blueprint to built as you scroll, the camera touring it module by module.",
	},
	{
		slug: "high-seas",
		title: "High Seas",
		moods: ["Seastead future"],
		tech: ["three.js", "Geodata", "Globe"],
		pitch:
			"A globe of light where land is dim and the high seas glow: the half of the planet no nation owns. Scroll turns it from place to place.",
	},
	{
		slug: "bathymetry",
		title: "Bathymetry",
		moods: ["Seastead future"],
		tech: ["three.js", "Procedural terrain", "Contour shader"],
		pitch:
			"A survey flight over an unmapped seafloor: contour-lit ridges and trenches rendered live, the page as the survey log.",
	},
	{
		slug: "modular",
		title: "Modular",
		moods: ["Seastead future"],
		tech: ["CSS 3D", "Interactive builder"],
		pitch:
			"Build your own seastead. Tap to add floating modules to an isometric platform that bobs on the swell.",
	},
	{
		slug: "line",
		title: "One Line",
		moods: ["Living water"],
		tech: ["SVG stroke", "Scroll-drawn"],
		pitch:
			"A single unbroken line draws the whole page: horizon, swell, the barge, a skyline at sea, drawn as you scroll.",
	},
	{
		slug: "ascii",
		title: "Text Mode",
		moods: ["Seastead future"],
		tech: ["Character rendering", "Video sampling"],
		pitch:
			"The ocean rendered entirely in characters: the film's footage and a live swell as a field of glyphs.",
	},
	{
		slug: "tessellate",
		title: "Tessellate",
		moods: ["Seastead future"],
		tech: ["three.js instancing", "Hex field"],
		pitch:
			"A field of hexagonal pontoons rides a swell, then locks together cell by cell into platforms.",
	},
	{
		slug: "scan",
		title: "Scan",
		moods: ["Seastead future"],
		tech: ["Point cloud", "Relief from photo"],
		pitch:
			"The barge photograph lifted into a cloud of points you can orbit, like a lidar survey of the vessel.",
	},
	{
		slug: "cloudbreak",
		title: "Cloudbreak",
		moods: ["Living water"],
		tech: ["Raymarched clouds", "Sky to sea"],
		pitch:
			"You start above the weather. Scroll drops you through the cloud deck until the sea opens out below.",
	},
	{
		slug: "reef",
		title: "Reef",
		moods: ["The deep"],
		tech: ["Differential growth", "Generative"],
		pitch:
			"Coral grows around the content while you read: branching, generative, different every visit.",
	},
	{
		slug: "barge",
		title: "The Barge",
		moods: ["Seastead future"],
		tech: ["three.js", "3D model", "Clip plane"],
		pitch: "The film's vessel as a 3D model: orbit it, cut it open, see it ride the swell.",
	},
];

export const labEntry = (slug: string) => {
	const entry = LAB.find((e) => e.slug === slug);
	if (!entry) throw new Error(`Unknown lab entry: ${slug}`);
	return entry;
};
