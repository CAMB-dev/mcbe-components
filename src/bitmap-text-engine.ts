import type { PixelTexture } from './item-renderer-engine';

export interface BitmapGlyph {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  advance: number;
  offsetX?: number;
  offsetY?: number;
}
export interface BitmapFont {
  pages: readonly string[];
  glyphs: Readonly<Record<string, BitmapGlyph>>;
  lineHeight: number;
}
interface PlacedGlyph { glyph: BitmapGlyph; x: number; y: number }
export interface BitmapLayout {
  glyphs: readonly PlacedGlyph[];
  pages: readonly number[];
  width: number;
  height: number;
  /** Scaled CSS-pixel advance box, independent of glyph/shadow visual overhang. */
  logicalWidth: number;
  logicalHeight: number;
  originX: number;
  originY: number;
  scale: number;
}
type Rgba = readonly [number, number, number, number];
const finite = (value: number, name: string) => { if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`); return value; };
const coordinate = (value: number, name: string) => { if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer.`); return value; };

export function layoutBitmapText(font: BitmapFont, text: string, scale: number, shadow?: { offsetX: number; offsetY: number }): BitmapLayout {
  if (!font || !Array.isArray(font.pages) || !font.glyphs || !Number.isFinite(font.lineHeight) || font.lineHeight <= 0) throw new RangeError('Invalid bitmap font.');
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('scale must be positive and finite.');
  if (font.pages.some(page => typeof page !== 'string' || !page.trim())) throw new RangeError('Font pages must have non-empty source URLs.');
  if (shadow) { finite(shadow.offsetX, 'shadow.offsetX'); finite(shadow.offsetY, 'shadow.offsetY'); }
  const glyphs: PlacedGlyph[] = [], pages = new Set<number>();
  let pen = 0, line = 0, maxLineAdvance = 0, minX = 0, minY = 0, maxX = 0, maxY = text ? font.lineHeight : 0;
  for (const character of text.replace(/\r\n?/g, '\n')) {
    if (character === '\n') { maxLineAdvance = Math.max(maxLineAdvance, pen); pen = 0; line++; maxY = Math.max(maxY, (line + 1) * font.lineHeight); continue; }
    const glyph = Object.prototype.hasOwnProperty.call(font.glyphs, character) ? font.glyphs[character] : undefined;
    if (!glyph) throw new Error(`Missing bitmap glyph U+${character.codePointAt(0)!.toString(16).toUpperCase()}.`);
    coordinate(glyph.page, 'glyph.page'); coordinate(glyph.x, 'glyph.x'); coordinate(glyph.y, 'glyph.y'); coordinate(glyph.width, 'glyph.width'); coordinate(glyph.height, 'glyph.height');
    finite(glyph.advance, 'glyph.advance'); finite(glyph.offsetX ?? 0, 'glyph.offsetX'); finite(glyph.offsetY ?? 0, 'glyph.offsetY');
    const x = pen + (glyph.offsetX ?? 0), y = line * font.lineHeight + (glyph.offsetY ?? 0);
    if (glyph.width && glyph.height) {
      if (glyph.page >= font.pages.length) throw new RangeError('Glyph references an unavailable font page.');
      pages.add(glyph.page); glyphs.push({ glyph: { ...glyph }, x, y });
      minX = Math.min(minX, x, x + (shadow?.offsetX ?? 0)); minY = Math.min(minY, y, y + (shadow?.offsetY ?? 0));
      maxX = Math.max(maxX, x + glyph.width, x + glyph.width + (shadow?.offsetX ?? 0)); maxY = Math.max(maxY, y + glyph.height, y + glyph.height + (shadow?.offsetY ?? 0));
    }
    pen += glyph.advance; minX = Math.min(minX, pen); maxX = Math.max(maxX, pen);
  }
  const width = Math.ceil((maxX - minX) * scale), height = Math.ceil((maxY - minY) * scale);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width > 8192 || height > 8192 || width * height > 4194304) throw new RangeError('Bitmap text exceeds the whole-canvas size limit.');
  const logicalWidth = Math.max(0, maxLineAdvance, pen) * scale;
  const logicalHeight = text ? (line + 1) * font.lineHeight * scale : 0;
  return { glyphs, pages: [...pages], width, height, logicalWidth, logicalHeight, originX: -minX, originY: -minY, scale };
}

function sample(texture: PixelTexture, glyph: BitmapGlyph, x: number, y: number, sampling: 'point' | 'bilinear'): number[] {
  // Source-pixel half-texel clamp is a declared atlas-rectangle Web profile.
  x = Math.max(glyph.x + .5, Math.min(glyph.x + glyph.width - .5, x));
  y = Math.max(glyph.y + .5, Math.min(glyph.y + glyph.height - .5, y));
  const read = (u: number, v: number, channel: number) => texture.data[(Math.max(glyph.y, Math.min(glyph.y + glyph.height - 1, v)) * texture.width + Math.max(glyph.x, Math.min(glyph.x + glyph.width - 1, u))) * 4 + channel]! / 255;
  if (sampling === 'point') return [0, 1, 2, 3].map(channel => read(Math.floor(x), Math.floor(y), channel));
  const xx = x - .5, yy = y - .5, u = Math.floor(xx), v = Math.floor(yy), fx = xx - u, fy = yy - v;
  return [0, 1, 2, 3].map(channel => read(u, v, channel) * (1 - fx) * (1 - fy) + read(u + 1, v, channel) * fx * (1 - fy) + read(u, v + 1, channel) * (1 - fx) * fy + read(u + 1, v + 1, channel) * fx * fy);
}

/** Internal whole-run renderer. Bitmap equations precede explicit Web source-over. */
export function renderBitmapLayout(layout: BitmapLayout, pages: ReadonlyMap<number, PixelTexture>, color: Rgba, sampling: 'point' | 'bilinear', shader: 'bitmap' | 'bitmap-smooth', shadow?: { color: Rgba; offsetX: number; offsetY: number }): PixelTexture {
  if (!['point', 'bilinear'].includes(sampling) || !['bitmap', 'bitmap-smooth'].includes(shader)) throw new RangeError('Explicit supported bitmap sampling and shader are required.');
  for (const placed of layout.glyphs) {
    const page = pages.get(placed.glyph.page), glyph = placed.glyph;
    if (!page || !Number.isSafeInteger(page.width) || !Number.isSafeInteger(page.height) || page.width <= 0 || page.height <= 0 || page.data.length !== page.width * page.height * 4 || glyph.x + glyph.width > page.width || glyph.y + glyph.height > page.height) throw new RangeError('Glyph rectangle exceeds its source page.');
  }
  const buffer = new Float64Array(layout.width * layout.height * 4);
  const paint = (tint: Rgba, offsetX: number, offsetY: number) => {
    for (const placed of layout.glyphs) {
      const glyph = placed.glyph, page = pages.get(glyph.page)!;
      const left = (placed.x + layout.originX + offsetX) * layout.scale, top = (placed.y + layout.originY + offsetY) * layout.scale;
      const right = left + glyph.width * layout.scale, bottom = top + glyph.height * layout.scale;
      for (let y = Math.max(0, Math.ceil(top - .5)); y < Math.min(layout.height, Math.ceil(bottom - .5)); y++) for (let x = Math.max(0, Math.ceil(left - .5)); x < Math.min(layout.width, Math.ceil(right - .5)); x++) {
        const value = sample(page, glyph, glyph.x + (x + .5 - left) / layout.scale, glyph.y + (y + .5 - top) / layout.scale, sampling);
        if (shader === 'bitmap-smooth') for (let channel = 0; channel < 4; channel++) { const q = Math.max(0, Math.min(1, (value[channel]! - .3) * 5)); value[channel] = q * q * (3 - 2 * q); }
        for (let channel = 0; channel < 4; channel++) value[channel]! *= tint[channel]!;
        const index = (y * layout.width + x) * 4, sourceAlpha = value[3]!, destinationAlpha = buffer[index + 3]!, alpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
        if (!alpha) continue;
        for (let channel = 0; channel < 3; channel++) buffer[index + channel] = (value[channel]! * sourceAlpha + buffer[index + channel]! * destinationAlpha * (1 - sourceAlpha)) / alpha;
        buffer[index + 3] = alpha;
      }
    }
  };
  if (shadow) paint(shadow.color, shadow.offsetX, shadow.offsetY);
  paint(color, 0, 0);
  const data = new Uint8ClampedArray(buffer.length);
  for (let index = 0; index < data.length; index++) data[index] = Math.round(Math.max(0, Math.min(1, buffer[index]!)) * 255);
  return { width: layout.width, height: layout.height, data };
}
