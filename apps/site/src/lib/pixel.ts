export type Rgb = readonly [number, number, number];

/** Colour of a 1×1 8-bit PNG (e.g. an image CDN's average of a region). `null` if it can't be read. */
export const pngPixel = async (url: string): Promise<Rgb | null> => {
	const res = await fetch(url).catch(() => null);
	if (!res?.ok) return null;
	const bytes = new Uint8Array(await res.arrayBuffer());
	const view = new DataView(bytes.buffer);
	const idat: Uint8Array[] = [];
	let colorType = -1;
	let palette: Uint8Array | undefined;
	for (let i = 8; i + 8 <= bytes.length; ) {
		const length = view.getUint32(i);
		const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
		const data = bytes.subarray(i + 8, i + 8 + length);
		if (type === "IHDR") colorType = data[9] ?? -1;
		else if (type === "PLTE") palette = data;
		else if (type === "IDAT") idat.push(data);
		i += 12 + length;
	}
	const stream = new Blob(idat as BlobPart[])
		.stream()
		.pipeThrough(new DecompressionStream("deflate"));
	// One pixel: every PNG filter leaves the first pixel as-is, so skip the filter byte and read it.
	const [, a = 0, b = 0, c = 0] = new Uint8Array(await new Response(stream).arrayBuffer());
	if (colorType === 2 || colorType === 6) return [a, b, c];
	if (colorType === 0 || colorType === 4) return [a, a, a];
	if (colorType === 3 && palette)
		return [palette[a * 3] ?? 0, palette[a * 3 + 1] ?? 0, palette[a * 3 + 2] ?? 0];
	return null;
};

/** WCAG relative luminance (0–1). */
export const luminance = ([r, g, b]: Rgb) => {
	const linear = (v: number) => {
		const s = v / 255;
		return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

/** Above this luminance, black text out-contrasts white (WCAG). */
export const LIGHT_LUMINANCE = 0.179;
