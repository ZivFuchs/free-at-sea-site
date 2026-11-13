export type Mood = "Living water" | "The deep" | "Seastead future";

export interface LabEntry {
	slug: string;
	title: string;
	/** A whole alternate homepage, or a page of switchable section variants. */
	kind: "page" | "sections";
	moods: readonly Mood[];
	tech: readonly string[];
	pitch: string;
}

/** Every experiment under `/lab/<slug>`. Design-review scaffolding: not meant to ship. */
export const LAB: readonly LabEntry[] = [
	{
		slug: "descent",
		title: "The Descent",
		kind: "page",
		moods: ["The deep"],
		tech: ["Fragment shader", "Scroll-driven", "Web Audio"],
		pitch:
			"The page is a dive. Scroll is depth: sunlit shafts give way to twilight, then a black midnight zone lit by bioluminescence, with the seabed as the footer.",
	},
	{
		slug: "swell",
		title: "Swell",
		kind: "page",
		moods: ["Living water"],
		tech: ["three.js", "Gerstner waves", "Sky model"],
		pitch:
			"A real 3D ocean under a physical sky. Scrolling turns the day: dawn at the hero, noon, golden hour, then night with the moon on the water. The whole palette follows the sun.",
	},
	{
		slug: "seastead",
		title: "Seastead",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["three.js", "Procedural model", "Camera path"],
		pitch:
			"A floating settlement, modelled in code, that assembles from blueprint to built as you scroll, the camera touring it module by module.",
	},
	{
		slug: "high-seas",
		title: "High Seas",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["three.js", "Geodata", "Globe"],
		pitch:
			"A globe of light where land is dim and the high seas glow: the half of the planet no nation owns. Scroll turns it from place to place.",
	},
	{
		slug: "reel",
		title: "The Reel",
		kind: "page",
		moods: ["Living water"],
		tech: ["View Transitions", "Scroll-driven CSS", "Multi-page"],
		pitch:
			"Film first. A drifting filmstrip where every clip and article opens into its own page, the poster morphing across the navigation. No canvas at all.",
	},
	{
		slug: "wake",
		title: "Wake",
		kind: "page",
		moods: ["Living water"],
		tech: ["GPU fluid simulation", "WebGL2"],
		pitch:
			"The page is a sheet of water with real fluid dynamics. Your finger or cursor leaves a wake; the title bleeds into it like ink.",
	},
	{
		slug: "shallows",
		title: "Shallows",
		kind: "page",
		moods: ["Living water"],
		tech: ["Ripple simulation", "SVG displacement", "Caustics"],
		pitch:
			"Daylight. The page lies under a hand's depth of clear water: touches send rings that actually refract the text, and caustics net across the paper.",
	},
	{
		slug: "shoal",
		title: "Shoal",
		kind: "page",
		moods: ["The deep", "Living water"],
		tech: ["GPU particles", "Flocking", "three.js"],
		pitch:
			"Thousands of fish. They school into the title, scatter from your touch, and regroup as each section's emblem while they follow you down the page.",
	},
	{
		slug: "waterline",
		title: "Waterline",
		kind: "page",
		moods: ["Living water", "The deep"],
		tech: ["Clip-path", "SVG filters", "Dual render"],
		pitch:
			"A split-level shot. A living waterline crosses the screen: above it the page in air, below it the same page underwater. Scroll and the sea rises.",
	},
	{
		slug: "tidal-type",
		title: "Tidal Type",
		kind: "page",
		moods: ["Living water"],
		tech: ["Kinetic typography", "SVG", "Scroll-driven CSS"],
		pitch:
			"Only type. Headlines roll as swell, lines of text ride wave paths, words break like surf at section edges. The sea drawn with letters.",
	},
	{
		slug: "drift",
		title: "Drift",
		kind: "page",
		moods: ["The deep", "Seastead future"],
		tech: ["three.js", "Z-axis scroll", "Video textures"],
		pitch:
			"Scroll moves you forward, not down. Clips, quotes and headlines hang in dark water like lit screens, drifting past as you swim through them.",
	},
	{
		slug: "storm",
		title: "Squall",
		kind: "page",
		moods: ["Living water"],
		tech: ["Raindrop refraction shader", "Weather"],
		pitch:
			"A squall crosses the page. Rain beads on the lens and refracts the footage behind it, the light drops, then it clears to a washed sky.",
	},
	{
		slug: "porthole",
		title: "Porthole",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["Clip-path iris", "Gyro parallax"],
		pitch:
			"The site seen from inside a cabin: one round window onto the sea. Sections iris open and closed through it, and the view shifts as you tilt.",
	},
	{
		slug: "echo",
		title: "Echo",
		kind: "page",
		moods: ["The deep"],
		tech: ["Sonar reveal", "Distance fields"],
		pitch:
			"A dark page you sound out. Each ping sends a ring through the water and the content answers back as it passes.",
	},
	{
		slug: "bathymetry",
		title: "Bathymetry",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["three.js", "Procedural terrain", "Contour shader"],
		pitch:
			"A survey flight over an unmapped seafloor: contour-lit ridges and trenches rendered live, the page as the survey log.",
	},
	{
		slug: "almanac",
		title: "Almanac",
		kind: "page",
		moods: ["Living water"],
		tech: ["Astronomy maths", "Live sky"],
		pitch:
			"The page keeps real time. Sun height, moon phase and tide are computed for this moment, so it never looks the same twice.",
	},
	{
		slug: "kelp",
		title: "Kelp",
		kind: "page",
		moods: ["Living water"],
		tech: ["Verlet strands", "Canvas"],
		pitch:
			"A kelp forest grows up the margins, each frond swaying on simulated current, sunlight flickering down between them.",
	},
	{
		slug: "jelly",
		title: "Medusa",
		kind: "page",
		moods: ["The deep"],
		tech: ["three.js", "Vertex-shader creatures"],
		pitch:
			"Procedural jellyfish pulse slowly through black water, lit from within. They brighten when you come near.",
	},
	{
		slug: "sparkle",
		title: "Phosphorescence",
		kind: "page",
		moods: ["The deep"],
		tech: ["Particles", "Motion-triggered light"],
		pitch:
			"Night water full of living light. Every scroll and touch disturbs it and the sea answers in blue sparks that fade.",
	},
	{
		slug: "modular",
		title: "Modular",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["CSS 3D", "Interactive builder"],
		pitch:
			"Build your own seastead. Tap to add floating modules to an isometric platform that bobs on the swell.",
	},
	{
		slug: "buoy",
		title: "Buoyancy",
		kind: "page",
		moods: ["Living water"],
		tech: ["Rigid-body buoyancy", "Wave sim"],
		pitch:
			"The page's cards really float. A simulated water surface carries them; drag one under and it bobs back up.",
	},
	{
		slug: "line",
		title: "One Line",
		kind: "page",
		moods: ["Living water"],
		tech: ["SVG stroke", "Scroll-drawn"],
		pitch:
			"A single unbroken line draws the whole page: horizon, swell, the barge, a skyline at sea, drawn as you scroll.",
	},
	{
		slug: "ink",
		title: "Wash",
		kind: "page",
		moods: ["Living water"],
		tech: ["Watercolour shader", "Paper"],
		pitch:
			"Each section is painted in as a wet wash on paper: pigment blooms, pools at the edges and dries as you read.",
	},
	{
		slug: "glass",
		title: "Lens",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["SVG refraction", "Metaballs"],
		pitch:
			"Drops of water sit on the page as lenses, magnifying and bending whatever is beneath as they slide and merge.",
	},
	{
		slug: "currents",
		title: "Currents",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["Flow field", "Particle streamlines"],
		pitch:
			"The world's ocean currents drawn as thousands of drifting streamlines, the content anchored in the flow.",
	},
	{
		slug: "stars",
		title: "Dead Reckoning",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["Star catalogue", "Celestial sphere"],
		pitch:
			"Night at sea, navigated by stars. The real sky turns overhead as you scroll and sections hang on constellations.",
	},
	{
		slug: "beam",
		title: "Beam",
		kind: "page",
		moods: ["The deep"],
		tech: ["Volumetric light", "Masking"],
		pitch:
			"A dark page swept by one slow beam of light. What it touches is revealed, then recedes into the dark.",
	},
	{
		slug: "scope",
		title: "Scope",
		kind: "page",
		moods: ["Living water"],
		tech: ["Cinemascope", "Scroll as timecode"],
		pitch:
			"The page cut like a film: anamorphic frame, timecode for scroll, hard cuts and dissolves between shots, copy as subtitles.",
	},
	{
		slug: "caustic-type",
		title: "Caustics",
		kind: "page",
		moods: ["Living water"],
		tech: ["Shader", "Light-formed type"],
		pitch:
			"Sunlight through moving water gathers on the seabed and, for a moment, focuses into the title.",
	},
	{
		slug: "ascii",
		title: "Text Mode",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["Character rendering", "Video sampling"],
		pitch:
			"The ocean rendered entirely in characters: the film's footage and a live swell as a field of glyphs.",
	},
	{
		slug: "engraving",
		title: "Engraving",
		kind: "page",
		moods: ["Living water"],
		tech: ["Video shader", "Line halftone"],
		pitch:
			"The hero footage redrawn live as a sea chart engraving: fine parallel lines that swell and thin with the light.",
	},
	{
		slug: "slit-scan",
		title: "Slit Scan",
		kind: "page",
		moods: ["Living water"],
		tech: ["Video time displacement"],
		pitch:
			"Time smeared across space: the footage slit-scanned so swell becomes streaks, with scroll scrubbing through it.",
	},
	{
		slug: "scrub",
		title: "Approach",
		kind: "page",
		moods: ["Living water"],
		tech: ["Scroll-scrubbed video", "Pinned copy"],
		pitch:
			"Scroll flies the camera. The hero footage scrubs frame by frame with the scrollbar, copy pinned to moments in it.",
	},
	{
		slug: "sea-legs",
		title: "Sea Legs",
		kind: "page",
		moods: ["Living water"],
		tech: ["Device orientation", "Inertia"],
		pitch:
			"The horizon stays level while everything else sways. Tilt the phone and the page rolls like a deck under you.",
	},
	{
		slug: "tessellate",
		title: "Tessellate",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["three.js instancing", "Hex field"],
		pitch:
			"A field of hexagonal pontoons rides a swell, then locks together cell by cell into platforms.",
	},
	{
		slug: "panorama",
		title: "Passage",
		kind: "page",
		moods: ["Living water"],
		tech: ["Horizontal scroll", "Continuous horizon"],
		pitch:
			"The page runs sideways along one unbroken horizon, like a passage under sail. Sections come over the horizon as landfalls.",
	},
	{
		slug: "below",
		title: "Below",
		kind: "page",
		moods: ["The deep"],
		tech: ["Depth shading", "Silhouette"],
		pitch:
			"Calm surface, seen from above. Now and then something enormous passes underneath the page.",
	},
	{
		slug: "swash",
		title: "Swash",
		kind: "page",
		moods: ["Living water"],
		tech: ["Discrete slides", "Foam shader"],
		pitch:
			"Full-screen pages, changed by the sea: each swipe a wave washes up the screen, and the next page is what it leaves behind.",
	},
	{
		slug: "sail",
		title: "Sail",
		kind: "page",
		moods: ["Living water"],
		tech: ["Cloth simulation", "Video texture"],
		pitch:
			"The film projected on a sail. A simulated canvas fills and luffs in the wind with the footage playing across it.",
	},
	{
		slug: "scale",
		title: "Scale",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["Continuous zoom", "SVG"],
		pitch: "One continuous zoom out: a person, a platform, a settlement, an ocean, a planet.",
	},
	{
		slug: "scan",
		title: "Scan",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["Point cloud", "Relief from photo"],
		pitch:
			"The barge photograph lifted into a cloud of points you can orbit, like a lidar survey of the vessel.",
	},
	{
		slug: "titles",
		title: "Title Sequence",
		kind: "page",
		moods: ["Living water"],
		tech: ["Timed animation", "Credits roll"],
		pitch: "The site opens like the film: a composed title sequence, and ends on a credits roll.",
	},
	{
		slug: "css-only",
		title: "No Script",
		kind: "page",
		moods: ["Living water"],
		tech: ["Scroll-driven CSS", "@property", "Zero JS"],
		pitch:
			"How far the platform goes with no JavaScript at all: atmosphere, parallax and transitions in pure CSS.",
	},
	{
		slug: "cloudbreak",
		title: "Cloudbreak",
		kind: "page",
		moods: ["Living water"],
		tech: ["Raymarched clouds", "Sky to sea"],
		pitch:
			"You start above the weather. Scroll drops you through the cloud deck until the sea opens out below.",
	},
	{
		slug: "reef",
		title: "Reef",
		kind: "page",
		moods: ["The deep"],
		tech: ["Differential growth", "Generative"],
		pitch:
			"Coral grows around the content while you read: branching, generative, different every visit.",
	},
	{
		slug: "barge",
		title: "The Barge",
		kind: "page",
		moods: ["Seastead future"],
		tech: ["three.js", "3D model", "Clip plane"],
		pitch: "The film's vessel as a 3D model: orbit it, cut it open, see it ride the swell.",
	},
	{
		slug: "prism",
		title: "Glass Title",
		kind: "page",
		moods: ["Living water"],
		tech: ["Ray-marched glass", "Dispersion"],
		pitch:
			"The title cast in thick glass and half sunk in water, bending and splitting the light behind it.",
	},
	{
		slug: "hydrophone",
		title: "Hydrophone",
		kind: "page",
		moods: ["The deep"],
		tech: ["Synthesised spectrogram", "Web Audio"],
		pitch:
			"Listening to the deep. A scrolling spectrogram of synthesised whale song and ship noise is the page's backdrop.",
	},
	{
		slug: "heroes",
		title: "Hero variants",
		kind: "sections",
		moods: ["Living water", "The deep", "Seastead future"],
		tech: ["Shaders", "Masks", "Parallax"],
		pitch: "The current homepage with a stack of alternative heroes to switch between.",
	},
	{
		slug: "details",
		title: "Detail variants",
		kind: "sections",
		moods: ["Living water", "The deep", "Seastead future"],
		tech: ["Header", "Dividers", "Cursor", "Cards", "Sound"],
		pitch:
			"The current homepage with switchable details: header, section dividers, cursor wake, press cards, newsletter confirmation, ambient sound.",
	},
];

export const labEntry = (slug: string) => {
	const entry = LAB.find((e) => e.slug === slug);
	if (!entry) throw new Error(`Unknown lab entry: ${slug}`);
	return entry;
};
