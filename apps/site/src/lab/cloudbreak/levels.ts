export const CLOUD_TOP = 1500;
export const CLOUD_BASE = 900;
const FEET_PER_METRE = 3.28084;

export interface Level {
	id: string;
	label: string;
	/** Altitude of the eye when this section is centred, in metres. */
	altitude: number;
}

export const LEVELS = [
	{ id: "top", label: "Above", altitude: 3000 },
	{ id: "idea", label: "In cloud", altitude: 1200 },
	{ id: "break", label: "Cloud base", altitude: 760 },
	{ id: "clips", label: "Clips", altitude: 520 },
	{ id: "press", label: "Press", altitude: 260 },
	{ id: "newsletter", label: "Newsletter", altitude: 70 },
	{ id: "sea", label: "The sea", altitude: 12 },
] as const satisfies readonly Level[];

export type LevelId = (typeof LEVELS)[number]["id"];

export const level = (id: LevelId) => LEVELS.find((l) => l.id === id)?.altitude ?? 0;

const whole = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
/** Altimeters read coarsely up high and finely near the ground. */
const rounded = (value: number) => {
	const step = value > 1000 ? 10 : value > 100 ? 5 : 1;
	return whole.format(Math.round(value / step) * step);
};

export const formatMetres = (metres: number) => `${rounded(metres)} m`;
export const formatFeet = (metres: number) => `${rounded(metres * FEET_PER_METRE)} ft`;

export const stateAt = (metres: number) =>
	metres > CLOUD_TOP
		? "Above the deck"
		: metres > CLOUD_BASE
			? "In cloud"
			: metres > 40
				? "Below the base"
				: "On the swell";
