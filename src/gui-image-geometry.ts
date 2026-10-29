import { packGuiHalf as half, packGuiUv as packedUv } from './gui-precision';

/** x/y/width/height. Image rectangles use GLOBAL game units, scissors physical target pixels. */
export type GuiImageRect = readonly [number, number, number, number];
export type GuiImageRgba = readonly [number, number, number, number];
export interface GuiImageNineSlice {
  /** Destination edge widths in game units: left, top, right, bottom. */
  insets: number | readonly [number, number, number, number];
  /** Logical source size, independent of the PNG's physical pixel dimensions. */
  baseSize: readonly [number, number];
}
export interface GuiImageGeometry {
  /** Already-evaluated global source layout; never use the expanded draw size as a child stride. */
  rect: GuiImageRect;
  /** Opt in float32 scalar multiplication before physical floor/ceil quantization. */
  physicalPrecision?: 'float32';
  /** Normalized source x/y/width/height; omission uses the complete original texture. */
  uvRect?: GuiImageRect;
  nineSlice?: GuiImageNineSlice;
  tint?: GuiImageRgba;
  hudOpacity?: number;
  /** Physical framebuffer scissor. It is intersected with the layer scissor. */
  scissor?: GuiImageRect;
}
export interface GuiImageLayoutOptions {
  /** Actual physical framebuffer dimensions, independent of CSS/devicePixelRatio. */
  width: number;
  height: number;
  guiScale: number;
  images: readonly GuiImageGeometry[];
  /** Physical framebuffer scissor; omission uses the whole target. */
  scissor?: GuiImageRect;
  /** Exact physical output window. Projection and source layout still use the WHOLE framebuffer. */
  outputRect?: GuiImageRect;
}
export interface GuiImageVertex {
  /** Exact float16-representable absolute game coordinates, expanded to JS numbers. */
  position: readonly [number, number];
  /** Unsigned normalized 16-bit attributes; the GPU fetch divides by 65535. */
  uvRaw: readonly [number, number];
}
export interface GuiImageMesh {
  imageIndex: number;
  /** Physical-origin/size quantized game rectangle, before half packing. */
  drawRect: GuiImageRect;
  vertices: readonly GuiImageVertex[];
  indices: readonly number[];
  tint: GuiImageRgba;
  hudOpacity: number;
  scissor: GuiImageRect;
}
export interface GuiImageLayout {
  width: number;
  height: number;
  guiScale: number;
  outputRect: GuiImageRect;
  /** ceil(framebuffer/guiScale), for SOURCE layout only; it is not the projection extent. */
  logicalStage: readonly [number, number];
  projectionSize: readonly [number, number];
  /** Column-major top-left orthographic projection, based on the unrounded extent. */
  mvp: Float32Array;
  meshes: readonly GuiImageMesh[];
}

const MAX_DIMENSION = 8192;
const MAX_PIXELS = 16777216;
const MAX_IMAGES = 4096;
const WHITE: GuiImageRgba = [1, 1, 1, 1];
function finite(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new RangeError(`${name} must be a finite float32 value.`);
  return value;
}
function positive(value: number, name: string): number {
  finite(value, name); if (value <= 0) throw new RangeError(`${name} must be positive.`); return value;
}
function unit(value: number, name: string): number {
  finite(value, name); if (value < 0 || value > 1) throw new RangeError(`${name} must be between zero and one.`); return value;
}
function sourceRect(value: GuiImageRect, name: string): void {
  if (!value || value.length !== 4) throw new RangeError(`${name} requires x, y, width and height.`);
  finite(value[0], `${name}.x`); finite(value[1], `${name}.y`);
  positive(value[2], `${name}.width`); positive(value[3], `${name}.height`);
  finite(value[0] + value[2], `${name}.right`); finite(value[1] + value[3], `${name}.bottom`);
}
function pixelRect(value: GuiImageRect, width: number, height: number, name: string): void {
  if (!value || value.length !== 4 || value.some(part => !Number.isSafeInteger(part) || part < 0)
    || value[0] + value[2] > width || value[1] + value[3] > height) throw new RangeError(`${name} must be an integer rectangle inside the framebuffer.`);
}
function intersection(a: GuiImageRect, b: GuiImageRect): GuiImageRect {
  const x = Math.max(a[0], b[0]), y = Math.max(a[1], b[1]);
  return [x, y, Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - x), Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - y)];
}
/**
 * Source-layout adapter for ordinary UI/Blit images. The observed positive,
 * symmetric full-source cases match two native GUI scales; other explicit host
 * rectangles/UVs are supported semantics, not recovered native CPU layout code.
 */
export function layoutGuiImages(options: GuiImageLayoutOptions): GuiImageLayout {
  const { width, height, guiScale } = options;
  if (!Number.isSafeInteger(width) || width < 1 || width > MAX_DIMENSION || !Number.isSafeInteger(height) || height < 1 || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new RangeError('GUI image framebuffer must have bounded positive integer dimensions.');
  }
  positive(guiScale, 'guiScale');
  const projectionWidth = positive(width / guiScale, 'projection width'), projectionHeight = positive(height / guiScale, 'projection height');
  if (!Number.isFinite(Math.fround(2 / projectionWidth)) || !Number.isFinite(Math.fround(2 / projectionHeight)) || !Math.fround(2 / projectionWidth) || !Math.fround(2 / projectionHeight)) throw new RangeError('GUI projection exceeds float32 precision.');
  if (!Array.isArray(options.images) || options.images.length > MAX_IMAGES) throw new RangeError('A bounded GUI image array is required.');
  const full: GuiImageRect = [0, 0, width, height], layerScissor = options.scissor ?? full;
  pixelRect(layerScissor, width, height, 'scissor');
  const outputRect = options.outputRect ?? full; pixelRect(outputRect, width, height, 'outputRect');
  if (!outputRect[2] || !outputRect[3]) throw new RangeError('GUI output window must have positive dimensions.');
  const meshes = options.images.map((image: GuiImageGeometry, imageIndex: number): GuiImageMesh => {
    if (!image) throw new RangeError('A GUI image is missing.');
    if (image.physicalPrecision !== undefined && image.physicalPrecision !== 'float32') throw new RangeError('Image physicalPrecision must be float32 or omitted.');
    sourceRect(image.rect, 'image.rect');
    const uv = image.uvRect ?? [0, 0, 1, 1]; sourceRect(uv, 'image.uvRect');
    unit(uv[0], 'uv.x'); unit(uv[1], 'uv.y');
    if (uv[0] + uv[2] > 1 || uv[1] + uv[3] > 1) throw new RangeError('Source UV rectangle exceeds the texture.');
    const tint = image.tint ?? WHITE;
    if (!tint || tint.length !== 4) throw new RangeError('Image tint requires four components.');
    tint.forEach(channel => unit(channel, 'image.tint'));
    const hudOpacity = unit(image.hudOpacity ?? 1, 'image.hudOpacity');
    if (image.scissor) pixelRect(image.scissor, width, height, 'image.scissor');
    const scissor = image.scissor ? intersection(layerScissor, image.scissor) : layerScissor;
    const [x, y, w, h] = image.rect;
    const physical = (value: number, name: string) => finite(image.physicalPrecision === 'float32' ? Math.fround(Math.fround(value) * Math.fround(guiScale)) : value * guiScale, name);
    const left = Math.floor(physical(x, 'physical x')) / guiScale, top = Math.floor(physical(y, 'physical y')) / guiScale;
    const drawnWidth = Math.ceil(physical(w, 'physical width')) / guiScale, drawnHeight = Math.ceil(physical(h, 'physical height')) / guiScale;
    const right = left + drawnWidth, bottom = top + drawnHeight;
    const vertices: GuiImageVertex[] = [], indices: number[] = [];
    const quad = (x0: number, y0: number, x1: number, y1: number, u0: number, v0: number, u1: number, v1: number) => {
      const start = vertices.length;
      vertices.push({ position: [half(x0), half(y1)], uvRaw: [packedUv(u0), packedUv(v1)] },
        { position: [half(x1), half(y1)], uvRaw: [packedUv(u1), packedUv(v1)] },
        { position: [half(x1), half(y0)], uvRaw: [packedUv(u1), packedUv(v0)] },
        { position: [half(x0), half(y0)], uvRaw: [packedUv(u0), packedUv(v0)] });
      indices.push(start + 1, start + 2, start, start, start + 2, start + 3);
    };
    if (image.nineSlice) {
      const { insets, baseSize } = image.nineSlice;
      if (!baseSize || baseSize.length !== 2) throw new RangeError('Nine-slice requires an explicit logical baseSize.');
      positive(baseSize[0], 'nineSlice.baseSize.width'); positive(baseSize[1], 'nineSlice.baseSize.height');
      const edges = typeof insets === 'number' ? [insets, insets, insets, insets] as const : insets;
      if (!edges || edges.length !== 4 || edges.some(edge => !Number.isFinite(edge) || edge < 0)) throw new RangeError('Nine-slice requires nonnegative logical insets.');
      const [l, t, r, b] = edges;
      if (l > baseSize[0] || r > baseSize[0] || t > baseSize[1] || b > baseSize[1] || l + r > drawnWidth || t + b > drawnHeight) throw new RangeError('Nine-slice edges exceed a source dimension or the drawn rectangle.');
      const xs = [left, left + l, right - r, right], ys = [top, top + t, bottom - b, bottom];
      // Source bands may reverse: original highlight_slot is base1/edge1,
      // producing UV cuts [0,1,0,1]. Destination bands must remain ordered.
      const us = [uv[0], uv[0] + uv[2] * l / baseSize[0], uv[0] + uv[2] * (1 - r / baseSize[0]), uv[0] + uv[2]];
      const vs = [uv[1], uv[1] + uv[3] * t / baseSize[1], uv[1] + uv[3] * (1 - b / baseSize[1]), uv[1] + uv[3]];
      // Native patch/draw order, including degenerate zero-edge patches.
      for (const [column, row] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [2, 1], [1, 2], [2, 2]] as const) {
        quad(xs[column]!, ys[row]!, xs[column + 1]!, ys[row + 1]!, us[column]!, vs[row]!, us[column + 1]!, vs[row + 1]!);
      }
    } else quad(left, top, right, bottom, uv[0], uv[1], uv[0] + uv[2], uv[1] + uv[3]);
    return { imageIndex, drawRect: [left, top, drawnWidth, drawnHeight], vertices, indices, tint: [...tint], hudOpacity, scissor };
  });
  return { width, height, guiScale, outputRect, logicalStage: [Math.ceil(projectionWidth), Math.ceil(projectionHeight)], projectionSize: [projectionWidth, projectionHeight],
    mvp: new Float32Array([2 / projectionWidth, 0, 0, 0, 0, -2 / projectionHeight, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1]), meshes };
}
