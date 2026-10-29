import type { GuiImageTexture } from './gui-image-webgl';
import type { PixelTexture } from './item-renderer-engine';

/** Caller-owned original images placed at explicit atlas texel coordinates. */
export interface GuiTextureAtlasSource {
  kind: 'atlas';
  width: number;
  height: number;
  tiles: readonly {
    origin: readonly [number, number];
    size: readonly [number, number];
    /** Complete original image; nested atlases are not supported. */
    texture: string | PixelTexture;
  }[];
}

/** Decoded original images for GPU assembly, without an intermediate Canvas2D. */
export interface GuiTextureAtlas {
  kind: 'atlas';
  width: number;
  height: number;
  tiles: readonly {
    origin: readonly [number, number];
    texture: GuiImageTexture;
  }[];
}

export type GuiLayerTextureSource = string | PixelTexture | GuiTextureAtlasSource;
export type GuiLayerTexture = GuiImageTexture | GuiTextureAtlas;

interface AtlasLayoutTile {
  origin: readonly [number, number];
  size: readonly [number, number];
}

function dimension(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > 8192) throw new RangeError(`${name} must be a positive integer at most8192.`);
}

function pair(value: readonly [number, number], name: string, positive: boolean): void {
  if (!Array.isArray(value) || value.length !== 2) throw new RangeError(`${name} requires two integer components.`);
  for (let index = 0; index < 2; index++) {
    if (!Object.prototype.hasOwnProperty.call(value, index) || !Number.isSafeInteger(value[index]) || value[index]! < (positive ? 1 : 0)) {
      throw new RangeError(`${name} requires ${positive ? 'positive' : 'nonnegative'} integer components.`);
    }
  }
}

/** Internal metadata-only preflight. Never reads source images, performs IO or allocates pixels. */
export function validateGuiTextureAtlasLayout(width: number, height: number, tiles: readonly AtlasLayoutTile[]): void {
  dimension(width, 'Atlas width'); dimension(height, 'Atlas height');
  if (width * height > 16777216) throw new RangeError('Atlas dimensions exceed the16MP limit.');
  if (!Array.isArray(tiles) || tiles.length > 256) throw new RangeError('Atlas requires at most256 explicit tiles.');
  for (let index = 0; index < tiles.length; index++) {
    if (!Object.prototype.hasOwnProperty.call(tiles, index) || !tiles[index] || typeof tiles[index] !== 'object') throw new RangeError('Sparse atlas tiles are not supported.');
    const tile = tiles[index]!;
    pair(tile.origin, 'Atlas tile origin', false); pair(tile.size, 'Atlas tile size', true);
    const [x, y] = tile.origin, [w, h] = tile.size;
    if (w > width || h > height || x > width - w || y > height - h) throw new RangeError('Atlas tile exceeds the declared atlas.');
    for (let previous = 0; previous < index; previous++) {
      const other = tiles[previous]!;
      if (x < other.origin[0] + other.size[0] && x + w > other.origin[0]
        && y < other.origin[1] + other.size[1] && y + h > other.origin[1]) throw new RangeError('Atlas tiles must not overlap.');
    }
  }
}

/**
 * Assemble caller-provided complete straight RGBA8 images at explicit texel
 * positions. Gaps stay transparent zero; bytes are not resampled, premultiplied,
 * tinted or color-converted. This pure helper needs no browser, GPU or IO.
 */
export function assembleGuiTextureAtlas(options: {
  width: number;
  height: number;
  tiles: readonly { origin: readonly [number, number]; texture: PixelTexture }[];
}): PixelTexture {
  if (!options || typeof options !== 'object' || !Array.isArray(options.tiles) || options.tiles.length > 256) throw new RangeError('Explicit bounded atlas options are required.');
  const tiles: { origin: readonly [number, number]; size: readonly [number, number]; texture: PixelTexture }[] = [];
  for (let index = 0; index < options.tiles.length; index++) {
    if (!Object.prototype.hasOwnProperty.call(options.tiles, index)) throw new RangeError('Sparse atlas tiles are not supported.');
    const tile = options.tiles[index];
    if (!tile || typeof tile !== 'object' || !tile.texture || typeof tile.texture !== 'object') throw new RangeError('Atlas tiles require complete RGBA8 images.');
    const texture = tile.texture;
    if (('kind' in texture && texture.kind === 'atlas') || Object.prototype.toString.call(texture) === '[object ImageBitmap]') throw new RangeError('CPU atlas assembly requires pixel tiles, not bitmaps or nested atlases.');
    dimension(texture.width, 'Tile width'); dimension(texture.height, 'Tile height');
    if (texture.width * texture.height > 16777216 || !texture.data
      || !['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(texture.data))
      || texture.data.length !== texture.width * texture.height * 4) throw new RangeError('Atlas tiles require complete straight RGBA8 pixels.');
    pair(tile.origin, 'Atlas tile origin', false);
    tiles.push({ origin: [tile.origin[0], tile.origin[1]], size: [texture.width, texture.height], texture });
  }
  validateGuiTextureAtlasLayout(options.width, options.height, tiles);
  const data = new Uint8ClampedArray(options.width * options.height * 4);
  for (const tile of tiles) {
    const rowBytes = tile.texture.width * 4;
    for (let row = 0; row < tile.texture.height; row++) {
      const source = row * rowBytes, target = ((tile.origin[1] + row) * options.width + tile.origin[0]) * 4;
      data.set(tile.texture.data.subarray(source, source + rowBytes), target);
    }
  }
  return { width: options.width, height: options.height, data };
}
