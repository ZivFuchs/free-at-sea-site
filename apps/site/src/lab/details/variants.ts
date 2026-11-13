import type { ExperimentGroup } from "@/components/experiments/types";

const OFF = {
	id: "off",
	label: "Off",
	note: "Nothing added: the homepage as it is today.",
} as const;

export const detailGroups: readonly ExperimentGroup[] = [
	{
		key: "header",
		label: "Header",
		variants: [
			{
				id: "current",
				label: "Current",
				note: "The live header: a hairline along its bottom edge fills with scroll.",
			},
			{
				id: "tide",
				label: "Tide",
				note: "The bar itself fills with water as you read: empty at the top of the page, brim-full at the bottom, its surface gently moving.",
			},
			{
				id: "sounding",
				label: "Sounding",
				note: "A slim instrument: a depth reading that follows your scroll, and a ruler along the bottom whose marks are the navigation.",
			},
		],
	},
	{
		key: "nav",
		label: "Section rail",
		variants: [
			OFF,
			{
				id: "dots",
				label: "Rail",
				note: "A tick per section on the right edge, low enough for a thumb. The current one lengthens and names itself while you scroll.",
			},
		],
	},
	{
		key: "dividers",
		label: "Dividers",
		variants: [
			OFF,
			{
				id: "swell",
				label: "Swell",
				note: "Sections meet in a slow swell instead of a straight cut: two wave layers drifting against each other, the far one shifting with scroll.",
			},
			{
				id: "foam",
				label: "Foam",
				note: "A fine lace of foam washes across each boundary as it comes into view, then draws back.",
			},
		],
	},
	{
		key: "cursor",
		label: "Cursor",
		variants: [
			OFF,
			{
				id: "wake",
				label: "Wake",
				note: "The pointer (or a finger) leaves a faint V of wake that spreads and is gone in under two seconds. A tap drops a ring.",
			},
			{
				id: "lamp",
				label: "Lamp",
				note: "Below the hero, a soft pool of light follows the pointer like a dive torch, lifting whatever it passes over.",
			},
		],
	},
	{
		key: "press",
		label: "Press",
		variants: [
			{ id: "current", label: "Current", note: "The live rack of cover cards." },
			{
				id: "buoyant",
				label: "Buoyant",
				note: "The covers float. Each bobs on its own slow phase, dips where you press it, and rocks when the rack is flung.",
			},
			{
				id: "flotsam",
				label: "Flotsam",
				note: "Covers scattered like prints on water. Drag them about; they glide to rest. Focus one and it squares up on top.",
			},
		],
	},
	{
		key: "reveal",
		label: "Section entry",
		variants: [
			OFF,
			{
				id: "surface",
				label: "Surface",
				note: "Each section rises into focus as it enters, as if coming up through water. Tied to scroll, so it never plays without you.",
			},
			{
				id: "tide-in",
				label: "Tide in",
				note: "Headings fill from the left behind a wave-edged front as they enter.",
			},
		],
	},
	{
		key: "sound",
		label: "Sound",
		variants: [
			OFF,
			{
				id: "ambient",
				label: "Ambient",
				note: "A small switch, bottom left. Synthesised swell and wash (no recordings) that grows closer and darker as you go down the page. Never starts itself.",
			},
		],
	},
	{
		key: "intro",
		label: "Intro",
		variants: [
			OFF,
			{
				id: "surfacing",
				label: "Surfacing",
				note: "A second and a half on arrival: dark water, the surface brightening overhead, then the page breaks through. Any key or tap skips it. Reselect to replay.",
			},
		],
	},
];
