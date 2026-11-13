import * as stylex from "@stylexjs/stylex";
import { water } from "./palette.stylex";

export const styles = stylex.create({
	tank: {
		position: "relative",
		overflow: "clip",
		touchAction: "pan-y",
		"--buoy-meniscus": water.meniscus,
		"--buoy-glint": water.glint,
		"--buoy-shallow": water.shallow,
		"--buoy-mid": water.mid,
		"--buoy-deep": water.deep,
	},
	list: {
		position: "relative",
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "center",
		alignItems: "flex-end",
		gap: "1rem",
	},
	water: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		pointerEvents: "none",
	},
});
