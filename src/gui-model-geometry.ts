import type { ItemMeshFace, Vec3 } from './item-renderer-engine';
import type { GuiLayerTextureSource } from './gui-texture-atlas';
import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageLayout, GuiImageLayoutOptions, GuiImageMesh, GuiImageRect, GuiImageRgba } from './gui-image-geometry';
import type { GuiTextRgba8 } from './gui-text-geometry';
import { packGuiHalf, packGuiUv } from './gui-precision';

/** Local source geometry; color is an explicit material byte input, not inferred lighting. */
export interface GuiModelFace extends Omit<ItemMeshFace, 'brightness'> { color?: GuiTextRgba8 }
export interface GuiModelMesh { faces: readonly GuiModelFace[] }
export interface GuiModelProjection {
  yaw: number;
  pitch: number;
  /** Game units per local model unit; no bounds fitting or implicit /16 conversion. */
  scale: number;
  /** Explicit projected translation in game units. No native camera offset is assumed. */
  offset: readonly [number, number];
  originQuantization: 'none' | 'physical-floor';
}
export interface GuiModelGeometry {
  model: GuiModelMesh;
  origin: readonly [number, number];
  projection: GuiModelProjection;
  /** Original texture dimensions, keyed like face.texture. Only own keys are read. */
  textureSizes: Readonly<Record<string, readonly [number, number]>>;
  tint?: GuiImageRgba;
  hudOpacity?: number;
  scissor?: GuiImageRect;
}
export interface GuiModelLayoutOptions extends Omit<GuiImageLayoutOptions, 'images'>, GuiModelGeometry {}
export interface GuiModelRun {
  faceIndex: number;
  /** Resolved own metadata key, including an explicit own "all" fallback. */
  texture: string;
  mesh: GuiImageMesh;
  color: GuiTextRgba8;
}
export interface GuiModelLayout extends Omit<GuiImageLayout, 'meshes'> {
  paintOrigin: readonly [number, number];
  runs: GuiModelRun[];
}
/** Optional inventory data; the workstation supplies its source origin and scissor. */
export type GuiModelItem = Omit<GuiModelGeometry, 'origin' | 'scissor'> & {
  textures: Readonly<Record<string, GuiLayerTextureSource>>;
};
export type GuiCuboidFace = 'up' | 'east' | 'south' | 'down' | 'west' | 'north';
export interface GuiCuboidModelOptions {
  textures?: Partial<Record<GuiCuboidFace, string>>;
  colors?: Partial<Record<GuiCuboidFace, GuiTextRgba8>>;
}

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const WHITE: GuiImageRgba = [1, 1, 1, 1];
const WHITE_BYTES: GuiTextRgba8 = [255, 255, 255, 255];
function finite(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new RangeError(`${name} must be finite float32.`);
  return value;
}
function vector(value: readonly number[], length: number, name: string): void {
  if (!Array.isArray(value) || value.length !== length) throw new RangeError(`${name} requires ${length} components.`);
  for (const part of value) finite(part, name);
}
function colorBytes(value: GuiTextRgba8, name: string): GuiTextRgba8 {
  if (!Array.isArray(value) || value.length !== 4 || [...value].some(part => !Number.isSafeInteger(part) || part < 0 || part > 255)) throw new RangeError(`${name} requires four RGBA8 bytes.`);
  return [value[0], value[1], value[2], value[3]];
}
function colorUnit(value: GuiImageRgba, name: string): GuiImageRgba {
  vector(value, 4, name);
  if (value.some(part => part < 0 || part > 1)) throw new RangeError(`${name} requires normalized components.`);
  return [...value];
}
function textureKey(value: string, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new RangeError(`${name} requires a nonempty texture key.`);
  return value;
}

/**
 * Pure local-model projection into the whole source framebuffer. Explicit source
 * origin/angles/scale/offset are caller inputs; this does not recover a native
 * CPU camera or fit a model to a local canvas. Only final GLOBAL XY is half-packed.
 */
export function layoutGuiModel(options: GuiModelLayoutOptions): GuiModelLayout {
  const frame = layoutGuiImages({ width: options.width, height: options.height, guiScale: options.guiScale,
    outputRect: options.outputRect, scissor: options.scissor, images: [] });
  const { model, projection, textureSizes } = options;
  if (!model || !Array.isArray(model.faces) || model.faces.length > 4096) throw new RangeError('A bounded source model face array is required.');
  vector(options.origin, 2, 'model.origin');
  if (!projection || (projection.originQuantization !== 'none' && projection.originQuantization !== 'physical-floor')) throw new RangeError('An explicit model projection and origin quantization are required.');
  finite(projection.yaw, 'model.yaw'); finite(projection.pitch, 'model.pitch');
  finite(projection.scale, 'model.scale');
  if (projection.scale <= 0) throw new RangeError('Model scale must be positive.');
  vector(projection.offset, 2, 'model.offset');
  if (!textureSizes || typeof textureSizes !== 'object' || Array.isArray(textureSizes) || Object.getOwnPropertyNames(textureSizes).length > 256) throw new RangeError('Bounded original model texture dimensions are required.');
  for (const key of Object.getOwnPropertyNames(textureSizes)) {
    textureKey(key, 'model.textureSizes key');
    const size = textureSizes[key];
    if (!Array.isArray(size) || size.length !== 2 || [...size].some(part => !Number.isSafeInteger(part) || part < 1 || part > 8192) || size[0]! * size[1]! > 16777216) throw new RangeError('Model texture dimensions must be bounded positive integers.');
  }
  const tint = colorUnit(options.tint ?? WHITE, 'model.tint'), hudOpacity = finite(options.hudOpacity ?? 1, 'model.hudOpacity');
  if (hudOpacity < 0 || hudOpacity > 1) throw new RangeError('Model hudOpacity must be normalized.');
  const origin = options.origin.map(value => projection.originQuantization === 'physical-floor'
    ? finite(Math.floor(finite(value * frame.guiScale, 'model physical origin')) / frame.guiScale, 'model paint origin') : value) as unknown as readonly [number, number];
  const yaw = projection.yaw * Math.PI / 180, pitch = projection.pitch * Math.PI / 180;
  const sinY = Math.sin(yaw), cosY = Math.cos(yaw), sinP = Math.sin(pitch), cosP = Math.cos(pitch);
  const direction: Vec3 = [sinY * cosP, sinP, cosY * cosP];
  const scissor: GuiImageRect = options.scissor ?? [0, 0, frame.width, frame.height];
  const runs: GuiModelRun[] = [];
  const used = new Set<string>(); let usedPixels = 0;
  for (let faceIndex = 0; faceIndex < model.faces.length; faceIndex++) {
    const face: GuiModelFace | undefined = model.faces[faceIndex];
    if (!face || !Array.isArray(face.vertices) || face.vertices.length !== 4 || !Array.isArray(face.uv) || face.uv.length !== 4) throw new RangeError('Every model face requires four source vertices and UV pairs.');
    for (let index = 0; index < 4; index++) { vector(face.vertices[index]!, 3, 'model vertex'); vector(face.uv[index]!, 2, 'model source UV'); }
    if (face.normal !== undefined) vector(face.normal, 3, 'model face normal');
    const color = colorBytes(face.color ?? WHITE_BYTES, 'model face color');
    if (face.texture !== undefined) textureKey(face.texture, 'model face texture');
    if (face.normal && face.normal[0] * direction[0] + face.normal[1] * direction[1] + face.normal[2] * direction[2] <= 0) continue;
    const preferred = face.texture ?? 'all';
    const texture = own(textureSizes, preferred) ? preferred : own(textureSizes, 'all') ? 'all' : undefined;
    if (texture === undefined) throw new RangeError('A visible source model face has no declared texture dimensions.');
    const [textureWidth, textureHeight] = textureSizes[texture]!;
    if (!used.has(texture)) { used.add(texture); usedPixels += textureWidth * textureHeight; }
    if (usedPixels > 33554432) throw new RangeError('Model source textures exceed the combined pixel budget.');
    const projected = face.vertices.map(([x, y, z]) => [
      finite(origin[0] + projection.offset[0] + projection.scale * (cosY * x - sinY * z), 'projected global x'),
      finite(origin[1] + projection.offset[1] + projection.scale * (sinP * (sinY * x + cosY * z) - cosP * y), 'projected global y'),
    ] as const);
    const vertices = projected.map(([x, y], index) => {
      const [u, v] = face.uv[index]!;
      if (u < 0 || v < 0 || u > textureWidth || v > textureHeight) throw new RangeError('Model source UV exceeds the declared original texture.');
      return { position: [packGuiHalf(x), packGuiHalf(y)] as const, uvRaw: [packGuiUv(u / textureWidth), packGuiUv(v / textureHeight)] as const };
    });
    const xs = projected.map(point => point[0]), ys = projected.map(point => point[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
    runs.push({ faceIndex, texture, color, mesh: { imageIndex: faceIndex,
      // For projected models this diagnostic rectangle is the unrounded global
      // point bounds, not an axis-aligned image layout or a child-placement box.
      drawRect: [minX, minY, maxX - minX, maxY - minY], vertices, indices: [1, 2, 0, 0, 2, 3],
      tint: [...tint], hudOpacity, scissor: [...scissor] } });
  }
  return { width: frame.width, height: frame.height, guiScale: frame.guiScale, outputRect: [...frame.outputRect],
    logicalStage: [...frame.logicalStage], projectionSize: [...frame.projectionSize], mvp: frame.mvp, paintOrigin: [...origin], runs };
}

/**
 * A source cuboid in the standard 0..16 block/texture coordinate convention.
 * Bounds must stay inside that reference cube. Custom models may instead supply
 * arbitrary local positions and explicit in-texture UVs through GuiModelMesh.
 */
export function createGuiCuboidModel(min: Vec3, max: Vec3, options: GuiCuboidModelOptions = {}): GuiModelMesh {
  vector(min, 3, 'cuboid minimum'); vector(max, 3, 'cuboid maximum');
  if (min.some((part, index) => part < 0 || max[index]! > 16 || part >= max[index]!)) throw new RangeError('Cuboid bounds require 0 <= min < max <= 16 on every axis.');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new RangeError('Cuboid options must be an object.');
  for (const value of [options.textures, options.colors]) if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) throw new RangeError('Cuboid face options must be records.');
  const [x0, y0, z0] = min, [x1, y1, z1] = max;
  const definitions: readonly { name: GuiCuboidFace; normal: Vec3; vertices: GuiModelFace['vertices']; texture: string }[] = [
    { name: 'up', normal: [0, 1, 0], texture: 'top', vertices: [[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1]] },
    { name: 'east', normal: [1, 0, 0], texture: 'side', vertices: [[x1,y1,z1],[x1,y0,z1],[x1,y0,z0],[x1,y1,z0]] },
    { name: 'south', normal: [0, 0, 1], texture: 'side', vertices: [[x1,y1,z1],[x0,y1,z1],[x0,y0,z1],[x1,y0,z1]] },
    { name: 'down', normal: [0, -1, 0], texture: 'bottom', vertices: [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]] },
    { name: 'west', normal: [-1, 0, 0], texture: 'side', vertices: [[x0,y1,z1],[x0,y1,z0],[x0,y0,z0],[x0,y0,z1]] },
    { name: 'north', normal: [0, 0, -1], texture: 'side', vertices: [[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[x0,y0,z0]] },
  ];
  return { faces: definitions.map(({ name, normal, vertices, texture }) => {
    const chosen = options.textures && own(options.textures, name) ? options.textures[name] : undefined;
    const color = options.colors && own(options.colors, name) ? options.colors[name] : undefined;
    return { vertices, normal, texture: chosen === undefined ? texture : textureKey(chosen, 'cuboid texture'),
      uv: vertices.map(([x, y, z]) => name === 'up' || name === 'down' ? [16 - z, x]
        : name === 'east' || name === 'west' ? [16 - z, 16 - y] : [x, 16 - y]) as unknown as GuiModelFace['uv'],
      ...(color === undefined ? {} : { color: colorBytes(color, 'cuboid face color') }) };
  }) };
}
