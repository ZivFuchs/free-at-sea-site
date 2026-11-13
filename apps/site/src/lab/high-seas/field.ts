/** Layout of `assets/field.png`, shared by the bake script and the globe. */
export const FIELD = {
	width: 720,
	height: 360,
	/** Pixel value 1 + n means n × this many km from the nearest coast; 0 is land. */
	kmPerStep: 5,
	/** 200 nautical miles: where exclusive economic zones end and the high seas begin. */
	limitKm: 370.4,
} as const;
