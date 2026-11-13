import type { Place } from "./astro";

/** High seas, about halfway between California and Hawaii: some 900 nautical miles from the nearest coast. */
export const PLACE: Place = { lat: 30, lng: -140 };
/** Nautical zone time: whole hours by longitude. */
export const ZONE_HOURS = Math.round(PLACE.lng / 15);
export const ZONE_LABEL = `UTC${ZONE_HOURS < 0 ? "−" : "+"}${Math.abs(ZONE_HOURS)}`;

const dm = (value: number, positive: string, negative: string) => {
	const abs = Math.abs(value);
	const degrees = Math.floor(abs);
	const minutes = Math.round((abs - degrees) * 60);
	return `${degrees}°${String(minutes).padStart(2, "0")}′${value >= 0 ? positive : negative}`;
};

export const POSITION = `${dm(PLACE.lat, "N", "S")} ${dm(PLACE.lng, "E", "W")}`;
