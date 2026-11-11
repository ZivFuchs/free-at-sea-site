export type ColSpan = 3 | 4 | 5 | 6 | 7 | 8 | 12;
export type RowSpan = 2 | 3 | 4 | 5 | 6;
/** Phone shape: `lead` and `wide` take the full width, `half` pairs up. */
export type PhoneShape = "lead" | "half" | "wide";

export interface Cell {
	cols: ColSpan;
	rows: RowSpan;
	phone: PhoneShape;
}

type Span = [ColSpan, RowSpan];

const FIXED: Record<number, Span[]> = {
	1: [[12, 4]],
	2: [
		[7, 4],
		[5, 4],
	],
	3: [
		[8, 5],
		[4, 3],
		[4, 2],
	],
	4: [
		[7, 4],
		[5, 6],
		[3, 2],
		[4, 2],
	],
};

/** 5+: a 7/5 pair (flipped each time) alternating with a row of thirds; leftovers widen to fill the row. */
const flow = (count: number): Span[] => {
	const spans: Span[] = [];
	let flip = false;
	let pair = true;
	while (spans.length < count) {
		const left = count - spans.length;
		if (pair) {
			if (left === 1) spans.push([12, 4]);
			else spans.push(flip ? [5, 4] : [7, 4], flip ? [7, 4] : [5, 4]);
			flip = !flip;
		} else if (left === 1) spans.push([12, 3]);
		else if (left === 2) spans.push([6, 3], [6, 3]);
		else spans.push([4, 3], [4, 3], [4, 3]);
		pair = !pair;
	}
	return spans;
};

const phone = (i: number, count: number): PhoneShape => {
	if (i % 3 === 0) return i === 0 || i < count - 1 ? "lead" : "wide";
	return i % 3 === 1 && i === count - 1 ? "wide" : "half";
};

/** Desktop spans on a 12-column grid (placed densely, in order) plus the phone shape per clip. */
export const compose = (count: number): Cell[] =>
	(FIXED[count] ?? flow(count)).map(([cols, rows], i) => ({ cols, rows, phone: phone(i, count) }));
