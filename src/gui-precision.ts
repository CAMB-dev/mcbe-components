/** Shared source-geometry packing; these helpers are not public package exports. */
function roundEven(value: number): number {
  const lower = Math.floor(value), fraction = value - lower;
  return fraction > .5 || (fraction === .5 && lower % 2 !== 0) ? lower + 1 : lower;
}

/** IEEE binary16 round-to-nearest, ties-to-even. Native ties are outside the observed-source proof. */
export function packGuiHalf(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Image vertex exceeds finite half precision.');
  const magnitude = Math.abs(value);
  if (magnitude >= 65520) throw new RangeError('Image vertex exceeds finite half precision.');
  const step = magnitude < 2 ** -14 ? 2 ** -24 : 2 ** (Math.floor(Math.log2(magnitude)) - 10);
  const rounded = roundEven(magnitude / step) * step;
  return value < 0 || Object.is(value, -0) ? -rounded : rounded;
}

/** Packed unsigned-normalized attributes; GPU fetch is raw / 65535. */
export function packGuiUv(value: number): number {
  return Math.min(65535, Math.max(0, Math.ceil(Math.fround(Math.fround(value) * 65535))));
}
