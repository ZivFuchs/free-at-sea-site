const MAX_WIDTH = 900;

/**
 * Rasterises the heading's `[data-word]` spans as laid out and returns `count` points inside the letterforms,
 * as CSS-pixel offsets from the heading's centre (x right, y down).
 */
export const sampleTitle = (
	heading: HTMLElement,
	count: number,
): Float32Array<ArrayBuffer> | null => {
	const box = heading.getBoundingClientRect();
	if (!box.width || !box.height) return null;
	const scale = Math.min(1, MAX_WIDTH / box.width);
	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(box.width * scale);
	canvas.height = Math.ceil(box.height * scale);
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return null;

	const style = getComputedStyle(heading);
	ctx.font = `${style.fontWeight} ${Number.parseFloat(style.fontSize) * scale}px ${style.fontFamily}`;
	ctx.letterSpacing = `${(Number.parseFloat(style.letterSpacing) || 0) * scale}px`;
	ctx.fillStyle = "#fff";
	for (const word of heading.querySelectorAll<HTMLElement>("[data-word]")) {
		const text = word.textContent ?? "";
		const shown = style.textTransform === "uppercase" ? text.toUpperCase() : text;
		const range = document.createRange();
		range.selectNodeContents(word);
		const r = range.getBoundingClientRect();
		const m = ctx.measureText(shown);
		const ascent = m.fontBoundingBoxAscent;
		const baseline =
			(r.top - box.top) * scale +
			(r.height * scale - (ascent + m.fontBoundingBoxDescent)) / 2 +
			ascent;
		ctx.fillText(shown, (r.left - box.left) * scale, baseline);
	}

	const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const filled: number[] = [];
	for (let i = 3, px = 0; i < data.length; i += 4, px++) if ((data[i] ?? 0) > 140) filled.push(px);
	if (!filled.length) return null;

	const points = new Float32Array(count * 2);
	for (let i = 0; i < count; i++) {
		const px = filled[Math.floor(Math.random() * filled.length)] ?? 0;
		points[i * 2] = ((px % width) + Math.random()) / scale - box.width / 2;
		points[i * 2 + 1] = (Math.floor(px / width) + Math.random()) / scale - box.height / 2;
	}
	return points.length && height ? points : null;
};
