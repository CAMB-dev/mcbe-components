import type { BitmapFont, BitmapGlyph } from './bitmap-text-engine';
import type { BitmapUnicodeVertex } from './bitmap-text-webgl';
import type { GuiImageLayoutOptions, GuiImageRect, GuiImageRgba } from './gui-image-geometry';
import { packGuiHalf, packGuiUv } from './gui-precision';

/** Actual vertex-color bytes, before normalized GPU fetch and tint multiplication. */
export type GuiTextRgba8 = readonly [number, number, number, number];
export interface GuiTextFont extends BitmapFont {
  /** Square source-page dimensions, in pixels, in the same order as pages. */
  pageSizes: readonly (128 | 256)[];
  /** Full source-cell height; default8, for example, uses 12 on a 128px page. */
  cellHeight: number;
}
export interface GuiTextGeometry {
  text: string;
  font: GuiTextFont;
  /** Global game-space paint origin, already evaluated/aligned by the host. */
  origin: readonly [number, number];
  /** Game units per font-metric/source-pixel unit. */
  fontScale: number;
  sampling: 'point' | 'bilinear';
  shader: 'bitmap' | 'bitmap-smooth';
  color?: GuiTextRgba8;
  tint?: GuiImageRgba;
  hudOpacity?: number;
  /** Independent shader tint; it replaces the main tint, without baking color bytes. */
  shadow?: { offset: readonly [number, number]; tint: GuiImageRgba };
  /** Physical framebuffer pixels, with top-left origin. */
  scissor?: GuiImageRect;
}
export interface GuiTextLayoutOptions extends Omit<GuiImageLayoutOptions, 'images'>, GuiTextGeometry {}
export interface GuiTextRun {
  page: number;
  pass: 'shadow' | 'main';
  /** Physical-floor-quantized global origin, converted back to float32 game units. */
  paintOrigin: readonly [number, number];
  mvp: Float32Array;
  vertices: BitmapUnicodeVertex[];
  indices: number[];
  glyphHeight: number;
  halfTexelOffset: number;
  sampling: 'point' | 'bilinear';
  shader: 'bitmap' | 'bitmap-smooth';
  tint: GuiImageRgba;
  hudOpacity: number;
  scissor: GuiImageRect;
}
export interface GuiTextLayout {
  width: number;
  height: number;
  guiScale: number;
  outputRect: GuiImageRect;
  /** Source-layout stage only; projection uses the unrounded framebuffer extent. */
  logicalStage: readonly [number, number];
  projectionSize: readonly [number, number];
  /** Logical advances in game units, independent of visual overhang and shadow. */
  logicalWidth: number;
  logicalHeight: number;
  /** Ascending source-page batches; every shadow batch precedes every main batch. */
  runs: GuiTextRun[];
}

const MAX_DIMENSION = 8192;
const MAX_PIXELS = 16777216;
const MAX_CHARACTERS = 4096;
const WHITE: GuiImageRgba = [1, 1, 1, 1];
const WHITE_BYTES: GuiTextRgba8 = [255, 255, 255, 255];
const f32 = Math.fround;

function finite(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isFinite(f32(value))) throw new RangeError(`${name} must be a finite float32 value.`);
  return value;
}
function positive(value: number, name: string): number {
  finite(value, name);
  if (value <= 0 || f32(value) <= 0) throw new RangeError(`${name} must be positive.`);
  return value;
}
function integer(value: number, min: number, max: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} is out of range.`);
  return value;
}
function rgba(value: GuiImageRgba, name: string): GuiImageRgba {
  if (!value || value.length !== 4) throw new RangeError(`${name} requires four components.`);
  for (const channel of value) {
    finite(channel, name);
    if (channel < 0 || channel > 1) throw new RangeError(`${name} must have normalized components.`);
  }
  return [...value];
}
function pair(value: readonly [number, number], name: string): void {
  if (!value || value.length !== 2) throw new RangeError(`${name} requires two components.`);
  finite(value[0], `${name}.x`); finite(value[1], `${name}.y`);
}
function pixelRect(value: GuiImageRect, width: number, height: number, name: string): GuiImageRect {
  if (!value || value.length !== 4 || value.some(part => !Number.isSafeInteger(part) || part < 0)
    || value[0] + value[2] > width || value[1] + value[3] > height) throw new RangeError(`${name} must be an integer rectangle inside the framebuffer.`);
  return [...value];
}
function glyphSize(glyph: BitmapGlyph, font: GuiTextFont): void {
  integer(glyph.page, 0, font.pages.length - 1, 'glyph.page');
  const pageSize = font.pageSizes[glyph.page]!;
  integer(glyph.x, 0, pageSize, 'glyph.x'); integer(glyph.y, 0, pageSize, 'glyph.y');
  integer(glyph.width, 0, pageSize, 'glyph.width'); integer(glyph.height, 0, pageSize, 'glyph.height');
  if (glyph.x + glyph.width > pageSize || glyph.y + glyph.height > pageSize) throw new RangeError('Glyph rectangle exceeds its declared page.');
  if ((glyph.width === 0) !== (glyph.height === 0)) throw new RangeError('An advance-only glyph must have both dimensions zero.');
  if (glyph.width && (glyph.width !== pageSize / 16 || glyph.height !== font.cellHeight)) throw new RangeError('Packed bitmap glyphs require complete source cells.');
  finite(glyph.advance, 'glyph.advance'); finite(glyph.offsetX ?? 0, 'glyph.offsetX'); finite(glyph.offsetY ?? 0, 'glyph.offsetY');
}

/**
 * Pure packed-bitmap-cell geometry. Glyph bearings remain local; no DOM canvas
 * origin, ink trimming, CJK centering inset, captured vertex buffer or MVP is used.
 * The explicit float32 origin/MVP profile matches the two observed source scales;
 * the -0.001 depth coefficient is observed, not a recovered near/far algorithm.
 */
export function layoutGuiText(options: GuiTextLayoutOptions): GuiTextLayout {
  const { width, height, guiScale, font, text, fontScale } = options;
  integer(width, 1, MAX_DIMENSION, 'width'); integer(height, 1, MAX_DIMENSION, 'height');
  if (width * height > MAX_PIXELS) throw new RangeError('GUI text framebuffer exceeds the pixel limit.');
  positive(guiScale, 'guiScale'); positive(fontScale, 'fontScale');
  const projectionWidth = positive(width / guiScale, 'projection width'), projectionHeight = positive(height / guiScale, 'projection height');
  const frameScale = f32(guiScale), metricScale = f32(fontScale);
  const p00 = f32(2 / f32(f32(width) / frameScale)), p11 = f32(-2 / f32(f32(height) / frameScale)), inverseScale = f32(1 / frameScale);
  if (!Number.isFinite(p00) || !Number.isFinite(p11) || !p00 || !p11 || !Number.isFinite(inverseScale) || !inverseScale) throw new RangeError('GUI text projection exceeds float32 precision.');
  if (typeof text !== 'string' || text.length > MAX_CHARACTERS * 2) throw new RangeError('A bounded text string is required.');
  if (!font || !Array.isArray(font.pages) || !font.pages.length || font.pages.length > 256 || font.pages.some(page => typeof page !== 'string' || !page.trim())
    || !font.glyphs || typeof font.glyphs !== 'object' || !Array.isArray(font.pageSizes) || font.pageSizes.length !== font.pages.length
    || font.pageSizes.some(size => size !== 128 && size !== 256)) throw new RangeError('Explicit bitmap pages, page sizes and glyph metrics are required.');
  for (let page = 0; page < font.pages.length; page++) {
    if (typeof font.pages[page] !== 'string' || !font.pages[page]!.trim() || (font.pageSizes[page] !== 128 && font.pageSizes[page] !== 256)) throw new RangeError('Sparse bitmap page declarations are not supported.');
  }
  positive(font.lineHeight, 'font.lineHeight'); integer(font.cellHeight, 1, Math.min(...font.pageSizes), 'font.cellHeight');
  pair(options.origin, 'origin');
  if (!['point', 'bilinear'].includes(options.sampling) || !['bitmap', 'bitmap-smooth'].includes(options.shader)) throw new RangeError('Explicit supported text sampling and shader are required.');
  const color = options.color ?? WHITE_BYTES;
  if (!color || color.length !== 4) throw new RangeError('Vertex color requires four bytes.');
  for (const channel of color) integer(channel, 0, 255, 'color');
  const tint = rgba(options.tint ?? WHITE, 'tint'), hudOpacity = options.hudOpacity ?? 1;
  finite(hudOpacity, 'hudOpacity');
  if (hudOpacity < 0 || hudOpacity > 1) throw new RangeError('hudOpacity must be normalized.');
  const shadow = options.shadow;
  if (shadow) pair(shadow.offset, 'shadow.offset');
  const shadowTint = shadow ? rgba(shadow.tint, 'shadow.tint') : undefined;
  const full: GuiImageRect = [0, 0, width, height];
  const scissor = pixelRect(options.scissor ?? full, width, height, 'scissor');
  const outputRect = pixelRect(options.outputRect ?? full, width, height, 'outputRect');
  if (!outputRect[2] || !outputRect[3]) throw new RangeError('GUI text output window must have positive dimensions.');

  // Keep the established BitmapFont CRLF/pen/bearing semantics, without the
  // local-canvas ceil/bounds budget imposed by layoutBitmapText.
  const batches = new Map<number, { vertices: BitmapUnicodeVertex[]; indices: number[] }>();
  let pen = 0, line = 0, maxAdvance = 0, count = 0;
  for (const character of text.replace(/\r\n?/g, '\n')) {
    if (++count > MAX_CHARACTERS) throw new RangeError('GUI text exceeds the character limit.');
    if (character === '\n') { maxAdvance = Math.max(maxAdvance, pen); pen = 0; line++; continue; }
    const glyph = Object.prototype.hasOwnProperty.call(font.glyphs, character) ? font.glyphs[character] : undefined;
    if (!glyph) throw new Error(`Missing bitmap glyph U+${character.codePointAt(0)!.toString(16).toUpperCase()}.`);
    glyphSize(glyph, font);
    const x = finite(f32(f32(pen) + f32(glyph.offsetX ?? 0)), 'glyph local x');
    const y = finite(f32(f32(f32(line) * f32(font.lineHeight)) + f32(glyph.offsetY ?? 0)), 'glyph local y');
    if (glyph.width) {
      const size = font.pageSizes[glyph.page]!;
      const left = packGuiHalf(f32(x * metricScale)), top = packGuiHalf(f32(y * metricScale));
      const right = packGuiHalf(f32(f32(x + f32(glyph.width)) * metricScale)), bottom = packGuiHalf(f32(f32(y + f32(glyph.height)) * metricScale));
      const uvRaw = [packGuiUv(glyph.x / size), packGuiUv(glyph.y / size)] as const;
      let batch = batches.get(glyph.page);
      if (!batch) { batch = { vertices: [], indices: [] }; batches.set(glyph.page, batch); }
      const start = batch.vertices.length;
      for (const [xx, yy, corner] of [[left, bottom, 0], [right, bottom, 1], [right, top, 2], [left, top, 3]] as const) {
        batch.vertices.push({ position: [xx, yy, corner], uvRaw: [...uvRaw], rgba: [...color] });
      }
      batch.indices.push(start + 1, start + 2, start, start, start + 2, start + 3);
    }
    pen = finite(f32(pen + f32(glyph.advance)), 'line advance');
  }
  const logicalWidth = finite(f32(Math.max(0, maxAdvance, pen) * metricScale), 'logicalWidth');
  const logicalHeight = finite(text ? f32(f32(f32(line + 1) * f32(font.lineHeight)) * metricScale) : 0, 'logicalHeight');
  const runs: GuiTextRun[] = [];
  const pages = [...batches.keys()].sort((a, b) => a - b);
  const paint = (pass: 'shadow' | 'main', offset: readonly [number, number], runTint: GuiImageRgba) => {
    const quantize = (value: number, shift: number) => {
      const physical = Math.floor(finite(f32(f32(f32(value) + f32(shift)) * frameScale), 'physical text origin'));
      return finite(f32(physical * inverseScale), 'paint origin');
    };
    const paintOrigin = [quantize(options.origin[0], offset[0]), quantize(options.origin[1], offset[1])] as const;
    const mvp = new Float32Array([p00, 0, 0, 0, 0, p11, 0, 0, 0, 0, f32(-.001), 0,
      f32(f32(p00 * paintOrigin[0]) - 1), f32(f32(p11 * paintOrigin[1]) + 1), 0, 1]);
    for (const value of mvp) finite(value, 'MVP');
    for (const page of pages) {
      const batch = batches.get(page)!, size = font.pageSizes[page]!;
      runs.push({ page, pass, paintOrigin: [...paintOrigin], mvp: new Float32Array(mvp),
        vertices: batch.vertices.map(vertex => ({ position: [...vertex.position], uvRaw: [...vertex.uvRaw], rgba: [...vertex.rgba] })), indices: [...batch.indices],
        glyphHeight: font.cellHeight / size, halfTexelOffset: .5 / size,
        sampling: options.sampling, shader: options.shader, tint: [...runTint], hudOpacity, scissor: [...scissor] });
    }
  };
  if (shadow && shadowTint) paint('shadow', shadow.offset, shadowTint);
  paint('main', [0, 0], tint);
  return { width, height, guiScale, outputRect, logicalStage: [Math.ceil(projectionWidth), Math.ceil(projectionHeight)],
    projectionSize: [projectionWidth, projectionHeight], logicalWidth, logicalHeight, runs };
}
