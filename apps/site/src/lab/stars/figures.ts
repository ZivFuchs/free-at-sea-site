/** `[right ascension in hours, declination in degrees]`, J2000. Snapped to the catalogue at load. */
type Place = readonly [ra: number, dec: number];

const STARS = {
	acrux: [12.443, -63.1],
	mimosa: [12.795, -59.69],
	gacrux: [12.519, -57.11],
	deltaCru: [12.252, -58.75],
	rigilKent: [14.66, -60.84],
	hadar: [14.064, -60.37],
	epsCen: [13.665, -53.47],
	zetaCen: [13.926, -47.29],
	gammaCen: [12.692, -48.96],
	deltaCen: [12.139, -50.72],
	menkent: [14.111, -36.37],
	etaCen: [14.592, -42.16],
	atria: [16.811, -69.03],
	betaTrA: [15.919, -63.43],
	gammaTrA: [15.315, -68.68],
	canopus: [6.399, -52.7],
	miaplacidus: [9.22, -69.72],
	avior: [8.375, -59.51],
	iotaCar: [9.285, -59.28],
	deltaVel: [8.745, -54.71],
	kappaVel: [9.368, -55.01],
	suhail: [9.133, -43.43],
	achernar: [1.629, -57.24],
	peacock: [20.427, -56.73],
	alnair: [22.137, -46.96],
	fomalhaut: [22.961, -29.62],
	antares: [16.49, -26.43],
	sigmaSco: [16.353, -25.59],
	tauSco: [16.598, -28.22],
	epsSco: [16.836, -34.29],
	muSco: [16.865, -38.05],
	zetaSco: [16.91, -42.36],
	etaSco: [17.203, -43.24],
	sargas: [17.622, -43.0],
	iotaSco: [17.793, -40.13],
	kappaSco: [17.708, -39.03],
	shaula: [17.56, -37.1],
	dschubba: [16.006, -22.62],
	acrab: [16.091, -19.81],
	piSco: [15.981, -26.11],
	kausAustralis: [18.403, -34.38],
	sirius: [6.752, -16.72],
	adhara: [6.977, -28.97],
	rigel: [5.242, -8.2],
	betelgeuse: [5.92, 7.41],
	bellatrix: [5.419, 6.35],
	saiph: [5.796, -9.67],
	alnitak: [5.679, -1.94],
	alnilam: [5.604, -1.2],
	mintaka: [5.533, -0.3],
	spica: [13.42, -11.16],
} as const satisfies Record<string, Place>;

export type StarKey = keyof typeof STARS;
export const place = (key: StarKey): Place => STARS[key];

/** Stars a navigator shoots, labelled on the sky. */
export const NAMED = {
	acrux: "Acrux",
	gacrux: "Gacrux",
	rigilKent: "Rigil Kent.",
	hadar: "Hadar",
	canopus: "Canopus",
	achernar: "Achernar",
	miaplacidus: "Miaplacidus",
	avior: "Avior",
	suhail: "Suhail",
	atria: "Atria",
	peacock: "Peacock",
	alnair: "Al Na'ir",
	fomalhaut: "Fomalhaut",
	antares: "Antares",
	shaula: "Shaula",
	kausAustralis: "Kaus Aust.",
	menkent: "Menkent",
	sirius: "Sirius",
	adhara: "Adhara",
	rigel: "Rigel",
	betelgeuse: "Betelgeuse",
	spica: "Spica",
} as const satisfies Partial<Record<StarKey, string>>;

interface Figure {
	name: string;
	lines: readonly (readonly [StarKey, StarKey])[];
}

export const FIGURES: readonly Figure[] = [
	{
		name: "Crux",
		lines: [
			["acrux", "gacrux"],
			["mimosa", "deltaCru"],
		],
	},
	{
		name: "Centaurus",
		lines: [
			["rigilKent", "hadar"],
			["hadar", "epsCen"],
			["epsCen", "zetaCen"],
			["epsCen", "gammaCen"],
			["gammaCen", "deltaCen"],
			["zetaCen", "etaCen"],
			["zetaCen", "menkent"],
		],
	},
	{
		name: "Triangulum Australe",
		lines: [
			["atria", "betaTrA"],
			["betaTrA", "gammaTrA"],
			["gammaTrA", "atria"],
		],
	},
	{
		name: "False Cross",
		lines: [
			["deltaVel", "iotaCar"],
			["kappaVel", "avior"],
		],
	},
	{
		name: "Scorpius",
		lines: [
			["acrab", "dschubba"],
			["dschubba", "piSco"],
			["dschubba", "sigmaSco"],
			["sigmaSco", "antares"],
			["antares", "tauSco"],
			["tauSco", "epsSco"],
			["epsSco", "muSco"],
			["muSco", "zetaSco"],
			["zetaSco", "etaSco"],
			["etaSco", "sargas"],
			["sargas", "iotaSco"],
			["iotaSco", "kappaSco"],
			["kappaSco", "shaula"],
		],
	},
	{
		name: "Orion",
		lines: [
			["betelgeuse", "bellatrix"],
			["betelgeuse", "alnitak"],
			["bellatrix", "mintaka"],
			["mintaka", "alnilam"],
			["alnilam", "alnitak"],
			["alnitak", "saiph"],
			["mintaka", "rigel"],
			["saiph", "rigel"],
		],
	},
];

/** The fixes tabulated in the passage. */
export const FIXES = ["acrux", "canopus", "achernar"] as const satisfies readonly StarKey[];
