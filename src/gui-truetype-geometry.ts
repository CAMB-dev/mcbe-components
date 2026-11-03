import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageLayoutOptions, GuiImageRect, GuiImageRgba } from './gui-image-geometry';
import type { GuiTextRgba8 } from './gui-text-geometry';
import { packGuiHalf, packGuiUv } from './gui-precision';

/** Variable atlas rectangle and independent local-space glyph metrics. */
export interface GuiTrueTypeGlyph {
  page: number;
  atlasRect: readonly [number, number, number, number];
  offset: readonly [number, number];
  size: readonly [number, number];
  advance: number;
}
export interface GuiTrueTypeFont {
  pages: readonly string[];
  /** Complete square source pages, one physical size per URL. */
  pageSizes: readonly number[];
  lineHeight: number;
  glyphs: Readonly<Record<string, GuiTrueTypeGlyph>>;
}
export interface GuiTrueTypeGeometry {
  text: string;
  font: GuiTrueTypeFont;
  /** Evaluated GLOBAL origin, independent of the local glyph scale. */
  origin: readonly [number, number];
  /** Applied to the projection columns, after local half packing. Default: 1. */
  projectionScale?: number;
  /** Default keeps the float32 origin; floor is an explicit host policy. */
  originQuantization?: 'float32' | 'physical-floor';
  sampling?: 'point' | 'bilinear';
  color?: GuiTextRgba8;
  tint?: GuiImageRgba;
  hudOpacity?: number;
  shadow?: { offset: readonly [number, number]; tint: GuiImageRgba };
  scissor?: GuiImageRect;
}
export interface GuiTrueTypeLayoutOptions extends Omit<GuiImageLayoutOptions, 'images'>, GuiTrueTypeGeometry {}
export interface GuiTrueTypeVertex {
  /** Geometric z=0; no bitmap-cell corner tag. */
  position: readonly [number, number, 0];
  uvRaw: readonly [number, number];
  rgba: GuiTextRgba8;
}
export interface GuiTrueTypeRun {
  page: number;
  pass: 'shadow' | 'main';
  paintOrigin: readonly [number, number];
  mvp: Float32Array;
  vertices: GuiTrueTypeVertex[];
  indices: number[];
  sampling: 'point' | 'bilinear';
  tint: GuiImageRgba;
  hudOpacity: number;
  scissor: GuiImageRect;
}
export interface GuiTrueTypeLayout {
  width: number; height: number; guiScale: number;
  outputRect: GuiImageRect;
  logicalStage: readonly [number, number];
  projectionSize: readonly [number, number];
  logicalWidth: number; logicalHeight: number;
  runs: GuiTrueTypeRun[];
}
const f32 = Math.fround;
const WHITE: GuiImageRgba = [1, 1, 1, 1];
function finite(v: number, name: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isFinite(f32(v))) throw new RangeError(`${name} must be finite float32.`);
  return v;
}
function positive(v: number, name: string): number {
  finite(v, name); if (f32(v) <= 0) throw new RangeError(`${name} must be positive.`); return v;
}
function pair(v: readonly number[], name: string): void {
  if (!v || v.length !== 2) throw new RangeError(`${name} requires two values.`);
  finite(v[0]!, name); finite(v[1]!, name);
}
function unitColor(v: GuiImageRgba, name: string): GuiImageRgba {
  if (!v || v.length !== 4) throw new RangeError(`${name} requires four normalized values.`);
  for (const c of v) if (finite(c, name) < 0 || c > 1) throw new RangeError(`${name} must be normalized.`);
  return [...v];
}
function glyphValid(g: GuiTrueTypeGlyph, sizes: readonly number[]): void {
  if (!g || !Number.isSafeInteger(g.page) || g.page < 0 || g.page >= sizes.length) throw new RangeError('Invalid TrueType glyph page.');
  const r = g.atlasRect, size = sizes[g.page]!;
  if (!r || r.length !== 4 || [...r].some(v => !Number.isSafeInteger(v) || v < 0) || r[0] + r[2] > size || r[1] + r[3] > size) throw new RangeError('TrueType glyph rectangle exceeds its page.');
  pair(g.offset, 'glyph.offset'); pair(g.size, 'glyph.size'); finite(g.advance, 'glyph.advance');
  if (g.size[0] < 0 || g.size[1] < 0 || (g.size[0] === 0) !== (g.size[1] === 0)
    || (r[2] === 0) !== (r[3] === 0) || (r[2] === 0) !== (g.size[0] === 0)) throw new RangeError('TrueType glyph ink requires positive source and local dimensions; advance-only glyphs require zero dimensions.');
}

/** Normal variable-glyph atlas layout. No rasterization, IO, captured matrix or vertex input. */
export function layoutGuiTrueTypeText(options: GuiTrueTypeLayoutOptions): GuiTrueTypeLayout {
  const { width, height, guiScale, text, font } = options;
  const frame = layoutGuiImages({ width, height, guiScale, images: [], outputRect: options.outputRect, scissor: options.scissor });
  if (typeof text !== 'string' || text.length > 8192) throw new RangeError('Bounded TrueType text is required.');
  if (!font || !Array.isArray(font.pages) || !font.pages.length || font.pages.length > 256 || !Array.isArray(font.pageSizes) || font.pages.length !== font.pageSizes.length
    || !font.glyphs || typeof font.glyphs !== 'object' || Array.isArray(font.glyphs)) throw new RangeError('Explicit TrueType pages and metrics are required.');
  for (let p = 0; p < font.pages.length; p++) {
    const size = font.pageSizes[p];
    if (typeof font.pages[p] !== 'string' || !font.pages[p]!.trim() || !Number.isSafeInteger(size) || size! < 1 || size! > 4096) throw new RangeError('TrueType page declarations must be dense and bounded.');
  }
  positive(font.lineHeight, 'font.lineHeight'); pair(options.origin, 'origin');
  const scale = f32(positive(options.projectionScale ?? 1, 'projectionScale'));
  const sampling = options.sampling ?? 'point', quantization = options.originQuantization ?? 'float32';
  if (!['point', 'bilinear'].includes(sampling) || !['float32', 'physical-floor'].includes(quantization)) throw new RangeError('Unsupported TrueType sampling or origin policy.');
  const color: GuiTextRgba8 = options.color ?? [255, 255, 255, 255];
  if (!color || color.length !== 4 || [...color].some(v => !Number.isSafeInteger(v) || v < 0 || v > 255)) throw new RangeError('TrueType color requires four bytes.');
  const tint = unitColor(options.tint ?? WHITE, 'tint'), hud = finite(options.hudOpacity ?? 1, 'hudOpacity');
  if (hud < 0 || hud > 1) throw new RangeError('hudOpacity must be normalized.');
  const shadow = options.shadow; if (shadow) pair(shadow.offset, 'shadow.offset');
  const shadowTint = shadow && unitColor(shadow.tint, 'shadow.tint');
  const batches = new Map<number, { vertices: GuiTrueTypeVertex[]; indices: number[] }>();
  let pen = 0, line = 0, maxAdvance = 0, count = 0;
  for (const char of text.replace(/\r\n?/g, '\n')) {
    if (++count > 4096) throw new RangeError('TrueType text exceeds its character budget.');
    if (char === '\n') { maxAdvance = Math.max(maxAdvance, pen); pen = 0; line++; continue; }
    const glyph = Object.prototype.hasOwnProperty.call(font.glyphs, char) ? font.glyphs[char] : undefined;
    if (!glyph) throw new Error(`Missing TrueType glyph U+${char.codePointAt(0)!.toString(16).toUpperCase()}.`);
    glyphValid(glyph, font.pageSizes);
    if (glyph.size[0]) {
      const x = f32(f32(pen) + f32(glyph.offset[0])), y = f32(f32(f32(line) * f32(font.lineHeight)) + f32(glyph.offset[1]));
      const left = packGuiHalf(x), top = packGuiHalf(y), right = packGuiHalf(f32(x + f32(glyph.size[0]))), bottom = packGuiHalf(f32(y + f32(glyph.size[1])));
      const [u, v, w, h] = glyph.atlasRect, size = font.pageSizes[glyph.page]!;
      const u0 = packGuiUv(u / size), v0 = packGuiUv(v / size), u1 = packGuiUv((u + w) / size), v1 = packGuiUv((v + h) / size);
      let batch = batches.get(glyph.page); if (!batch) { batch = { vertices: [], indices: [] }; batches.set(glyph.page, batch); }
      const base = batch.vertices.length;
      batch.vertices.push(...[[left, bottom, u0, v1], [right, bottom, u1, v1], [right, top, u1, v0], [left, top, u0, v0]].map(([px, py, tu, tv]): GuiTrueTypeVertex => ({ position: [px!, py!, 0], uvRaw: [tu!, tv!], rgba: [...color] })));
      batch.indices.push(base + 1, base + 2, base, base, base + 2, base + 3);
    }
    pen = finite(f32(f32(pen) + f32(glyph.advance)), 'text advance');
  }
  maxAdvance = Math.max(maxAdvance, pen);
  const logicalWidth = finite(f32(maxAdvance * scale), 'logicalWidth'), logicalHeight = finite(f32(f32(f32(line + 1) * f32(font.lineHeight)) * scale), 'logicalHeight');
  const p00 = frame.mvp[0]!, p11 = frame.mvp[5]!, sx = f32(p00 * scale), sy = f32(p11 * scale);
  positive(Math.abs(sx), 'projection.x'); positive(Math.abs(sy), 'projection.y');
  const runs: GuiTrueTypeRun[] = [], pages = [...batches.keys()].sort((a, b) => a - b);
  const paint = (pass: GuiTrueTypeRun['pass'], offset: readonly [number, number], ink: GuiImageRgba) => {
    const quantize = (v: number, d: number) => {
      const value = f32(f32(v) + f32(d));
      return finite(quantization === 'physical-floor' ? f32(f32(Math.floor(f32(value * f32(guiScale)))) * f32(1 / f32(guiScale))) : value, 'paint origin');
    };
    const origin = [quantize(options.origin[0], offset[0]), quantize(options.origin[1], offset[1])] as const;
    const mvp = new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, f32(-.001), 0, f32(f32(p00 * origin[0]) - 1), f32(f32(p11 * origin[1]) + 1), 0, 1]);
    for (const value of mvp) finite(value, 'MVP');
    for (const page of pages) {
      const batch = batches.get(page)!;
      runs.push({ page, pass, paintOrigin: [...origin], mvp: new Float32Array(mvp),
        vertices: batch.vertices.map(v => ({ position: [...v.position], uvRaw: [...v.uvRaw], rgba: [...v.rgba] })), indices: [...batch.indices],
        sampling, tint: [...ink], hudOpacity: hud, scissor: [...(options.scissor ?? [0, 0, width, height])] });
    }
  };
  if (shadow && shadowTint) paint('shadow', shadow.offset, shadowTint);
  paint('main', [0, 0], tint);
  return { width, height, guiScale, outputRect: [...frame.outputRect], logicalStage: [...frame.logicalStage], projectionSize: [...frame.projectionSize], logicalWidth, logicalHeight, runs };
}
