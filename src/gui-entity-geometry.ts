import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageLayoutOptions, GuiImageRect } from './gui-image-geometry';
import { packGuiHalf, packGuiUv } from './gui-precision';

type Vec2 = readonly [number, number];
type Vec3 = readonly [number, number, number];
type Vec4 = readonly [number, number, number, number];

/** Original box UV net; inflation changes positions, never the source UV size. */
export interface GuiEntityCube { origin: Vec3; size: Vec3; uv: Vec2; inflate?: number }
export interface GuiEntityBone {
  name: string;
  parent?: string;
  pivot: Vec3;
  visible: boolean;
  cubes: readonly GuiEntityCube[];
}
/** Finite rigid NPC profile. Mirroring, rotated cubes and other texture sizes are unsupported. */
export interface GuiEntitySource {
  profile: 'npc-box64-rigid';
  textureSize: readonly [64, 64];
  bones: readonly GuiEntityBone[];
}
/** Alpha rewrite1/cutoff0.5 profile; optional native shader branches are not inferred. */
export interface GuiNpcPortraitMaterial {
  kind: 'npc-portrait';
  tileLightColor: Vec4;
  fogControl: Vec3;
  fogColor: Vec3;
  materialColor: Vec4;
  uvAnimation: Vec4;
  subPixelOffset: Vec2;
}
export interface GuiEntityGeometry {
  source: GuiEntitySource;
  /** Complete final local-to-posed matrices, including invisible bones, keyed by source name.
   * Parent matrices are not implicitly multiplied a second time. */
  bonePose: Readonly<Record<string, Float32Array>>;
  model: Float32Array;
  view: Float32Array;
  projection: Float32Array;
  /** Physical framebuffer rectangle, independent of source GUI units and CSS/DPR. */
  viewport: GuiImageRect;
  scissor?: GuiImageRect;
  material: GuiNpcPortraitMaterial;
}
export interface GuiEntityMesh {
  positions: Float32Array;
  uvRaw: Uint16Array;
  normals: Int8Array;
  colors: Uint8Array;
  boneIndices: Uint16Array;
  indices: Uint16Array;
  /** All declarations, including invisible bones, in stable source order. */
  boneNames: readonly string[];
}
export interface GuiEntityLayoutOptions extends Omit<GuiImageLayoutOptions, 'images'>, GuiEntityGeometry {}
export interface GuiEntityLayout {
  width: number;
  height: number;
  guiScale: number;
  outputRect: GuiImageRect;
  mesh: GuiEntityMesh;
  palette: Float32Array;
  model: Float32Array;
  view: Float32Array;
  projection: Float32Array;
  viewport: GuiImageRect;
  scissor: GuiImageRect;
  material: GuiNpcPortraitMaterial;
}

const MAX_BONES = 32;
const MAX_CUBES = 256;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const typedArrayTag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Float32Array.prototype), Symbol.toStringTag)!.get!;
const compiled = new WeakMap<GuiEntityMesh, { source: GuiEntitySource; signature: string; snapshot: GuiEntityMesh }>();

function object(value: unknown, name: string, allowed?: readonly string[], required: readonly string[] = []): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new RangeError(`${name} must be a plain object.`);
  if (allowed && Reflect.ownKeys(value).some(key => typeof key !== 'string' || !allowed.includes(key))) throw new RangeError(`${name} contains an unsupported field.`);
  if (required.some(key => !own(value, key))) throw new RangeError(`${name} is missing an own field.`);
}
function dense(value: unknown, max: number, name: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new RangeError(`${name} must be a bounded dense array.`);
  for (let i = 0; i < value.length; i++) if (!own(value, String(i))) throw new RangeError(`${name} must not be sparse.`);
}
function finite(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new RangeError(`${name} must be finite float32.`);
}
function vector(value: unknown, length: number, name: string): void {
  dense(value, length, name);
  if (value.length !== length) throw new RangeError(`${name} requires ${length} components.`);
  for (const part of value) finite(part, name);
}
function name(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 256) throw new RangeError(`${label} must be a nonempty bounded name.`);
}
function matrix(value: unknown, label: string): Float32Array {
  // The intrinsic getter reads the actual typed-array kind across realms and
  // does not trust an object's own, forgeable Symbol.toStringTag property.
  if (!ArrayBuffer.isView(value) || typedArrayTag.call(value) !== 'Float32Array' || (value as Float32Array).length !== 16) throw new RangeError(`${label} requires a Float32Array matrix of length16.`);
  const values = value as Float32Array;
  for (const part of values) finite(part, label);
  return new Float32Array(values);
}
function pixelRect(value: GuiImageRect, width: number, height: number, label: string, positive: boolean): GuiImageRect {
  vector(value, 4, label);
  if (value.some(part => !Number.isSafeInteger(part) || part < 0) || value[0] + value[2] > width || value[1] + value[3] > height || (positive && (!value[2] || !value[3]))) throw new RangeError(`${label} must be an integer rectangle inside the framebuffer.`);
  return [...value];
}
function copyMesh(mesh: GuiEntityMesh): GuiEntityMesh {
  return { positions: new Float32Array(mesh.positions), uvRaw: new Uint16Array(mesh.uvRaw), normals: new Int8Array(mesh.normals),
    colors: new Uint8Array(mesh.colors), boneIndices: new Uint16Array(mesh.boneIndices), indices: new Uint16Array(mesh.indices), boneNames: [...mesh.boneNames] };
}

/** Validate even invisible source branches; they cannot smuggle unsupported models into a cache. */
function sourceSignature(source: GuiEntitySource): string {
  object(source, 'entity.source', ['profile', 'textureSize', 'bones'], ['profile', 'textureSize', 'bones']);
  if (source.profile !== 'npc-box64-rigid') throw new RangeError('Unsupported entity source profile.');
  vector(source.textureSize, 2, 'entity.textureSize');
  if (source.textureSize[0] !== 64 || source.textureSize[1] !== 64) throw new RangeError('NPC box textures must be64x64.');
  dense(source.bones, MAX_BONES, 'entity.bones');
  if (!source.bones.length) throw new RangeError('At least one entity bone is required.');
  const names = new Set<string>(); let cubes = 0;
  for (const bone of source.bones) {
    object(bone, 'entity.bone', ['name', 'parent', 'pivot', 'visible', 'cubes'], ['name', 'pivot', 'visible', 'cubes']);
    name(bone.name, 'bone.name');
    if (names.has(bone.name)) throw new RangeError('Duplicate entity bone name.');
    names.add(bone.name);
    if (bone.parent !== undefined) name(bone.parent, 'bone.parent');
    if (typeof bone.visible !== 'boolean') throw new RangeError('Each bone needs explicit visibility.');
    vector(bone.pivot, 3, 'bone.pivot');
    dense(bone.cubes, MAX_CUBES, 'bone.cubes');
    cubes += bone.cubes.length;
    if (cubes > MAX_CUBES) throw new RangeError('Entity source exceeds256 cubes.');
    for (const cube of bone.cubes) {
      object(cube, 'entity.cube', ['origin', 'size', 'uv', 'inflate'], ['origin', 'size', 'uv']);
      vector(cube.origin, 3, 'cube.origin'); vector(cube.size, 3, 'cube.size'); vector(cube.uv, 2, 'cube.uv');
      if (cube.size.some(part => !Number.isSafeInteger(part) || part < 1 || part > 64) || cube.uv.some(part => !Number.isSafeInteger(part) || part < 0 || part > 64)) throw new RangeError('NPC sizes and source UVs must be bounded integer texels.');
      const [w, h, d] = cube.size;
      if (cube.uv[0] + 2 * (w + d) > 64 || cube.uv[1] + d + h > 64) throw new RangeError('NPC box UV net exceeds the64x64 texture.');
      const inflate = cube.inflate ?? 0; finite(inflate, 'cube.inflate');
      if (inflate < 0 || inflate > 64) throw new RangeError('NPC inflate must be between0 and64 source units.');
      // Pack both endpoints before allocation, including hidden geometry.
      for (let axis = 0; axis < 3; axis++) {
        const start = cube.origin[axis]! - bone.pivot[axis]! - inflate;
        const end = cube.origin[axis]! + cube.size[axis]! - bone.pivot[axis]! + inflate;
        packGuiHalf(start); packGuiHalf(end);
      }
    }
  }
  const byName = new Map(source.bones.map(bone => [bone.name, bone]));
  for (const bone of source.bones) {
    const ancestors = new Set<string>(); let current: GuiEntityBone | undefined = bone;
    while (current) {
      if (ancestors.has(current.name)) throw new RangeError('Entity bone parents contain a cycle.');
      ancestors.add(current.name);
      if (current.parent === undefined) break;
      const parent = byName.get(current.parent);
      if (!parent) throw new RangeError('Entity bone parent is missing.');
      current = parent;
    }
  }
  return JSON.stringify(source.bones.map(bone => [bone.name, bone.parent ?? null, [...bone.pivot], bone.visible,
    bone.cubes.map(cube => [[...cube.origin], [...cube.size], [...cube.uv], cube.inflate ?? 0])]),
  (_key, value: unknown) => typeof value === 'number' && Object.is(value, -0) ? '-0' : value);
}

/** Private pure compiler. The packed32 inset is a finite NPC64 profile; equivalent
 * native operation orders were not uniquely distinguished by the observed mesh. */
export function compileGuiEntitySource(source: GuiEntitySource): GuiEntityMesh {
  const signature = sourceSignature(source);
  const positions: number[] = [], uvRaw: number[] = [], normals: number[] = [], colors: number[] = [], boneIndices: number[] = [], indices: number[] = [];
  for (let bi = 0; bi < source.bones.length; bi++) {
    const bone = source.bones[bi]!;
    if (!bone.visible) continue;
    for (const cube of bone.cubes) {
      const [ox, oy, oz] = cube.origin, [w, h, d] = cube.size, [u, v] = cube.uv, [px, py, pz] = bone.pivot, f = cube.inflate ?? 0;
      const x0 = ox - px - f, x1 = ox + w - px + f, y0 = py - oy - h - f, y1 = py - oy + f, z0 = oz - pz - f, z1 = oz + d - pz + f;
      const faces: readonly { corners: readonly Vec3[]; normal: Vec4; uv: Vec4; bottom?: boolean }[] = [
        { corners: [[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1]], normal: [0,127,0,0], uv: [u+d+w,v,w,d], bottom: true },
        { corners: [[x1,y0,z1],[x0,y0,z1],[x0,y0,z0],[x1,y0,z0]], normal: [0,-127,0,0], uv: [u+d,v,w,d] },
        { corners: [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]], normal: [0,0,-127,0], uv: [u+d,v+d,w,h] },
        { corners: [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], normal: [0,0,127,0], uv: [u+2*d+w,v+d,w,h] },
        { corners: [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]], normal: [127,0,0,0], uv: [u+d+w,v+d,d,h] },
        { corners: [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]], normal: [-127,0,0,0], uv: [u,v+d,d,h] },
      ];
      for (const face of faces) {
        const [su, sv, sw, sh] = face.uv, loU = packGuiUv(su / 64) + 32, hiU = packGuiUv((su + sw) / 64) - 32;
        const loV = packGuiUv(sv / 64) + 32, hiV = packGuiUv((sv + sh) / 64) - 32;
        const tex: readonly Vec2[] = face.bottom ? [[hiU,hiV],[loU,hiV],[loU,loV],[hiU,loV]] : [[hiU,loV],[loU,loV],[loU,hiV],[hiU,hiV]];
        const first = positions.length / 3;
        for (let i = 0; i < 4; i++) {
          positions.push(...face.corners[i]!.map(packGuiHalf)); uvRaw.push(...tex[i]!); normals.push(...face.normal); colors.push(255,255,255,255); boneIndices.push(bi);
        }
        indices.push(...[1,2,0,0,2,3].map(i => first + i));
      }
    }
  }
  const mesh: GuiEntityMesh = { positions: new Float32Array(positions), uvRaw: new Uint16Array(uvRaw), normals: new Int8Array(normals),
    colors: new Uint8Array(colors), boneIndices: new Uint16Array(boneIndices), indices: new Uint16Array(indices), boneNames: source.bones.map(bone => bone.name) };
  compiled.set(mesh, { source, signature, snapshot: copyMesh(mesh) });
  return mesh;
}

function material(value: GuiNpcPortraitMaterial): GuiNpcPortraitMaterial {
  const fields = ['kind', 'tileLightColor', 'fogControl', 'fogColor', 'materialColor', 'uvAnimation', 'subPixelOffset'];
  object(value, 'entity.material', fields, fields);
  if (value.kind !== 'npc-portrait') throw new RangeError('Unsupported entity material profile.');
  vector(value.tileLightColor, 4, 'material.tileLightColor'); vector(value.fogControl, 3, 'material.fogControl'); vector(value.fogColor, 3, 'material.fogColor');
  vector(value.materialColor, 4, 'material.materialColor'); vector(value.uvAnimation, 4, 'material.uvAnimation'); vector(value.subPixelOffset, 2, 'material.subPixelOffset');
  const divisor = Math.fround(Math.fround(value.fogControl[1]) - Math.fround(value.fogControl[0]));
  if (!Number.isFinite(divisor) || divisor === 0) throw new RangeError('Entity fog range needs a finite nonzero float32 divisor.');
  if (Math.fround(value.fogControl[2]) === 0) throw new RangeError('Entity fog distance needs a nonzero float32 divisor.');
  return { kind: value.kind, tileLightColor: [...value.tileLightColor], fogControl: [...value.fogControl], fogColor: [...value.fogColor],
    materialColor: [...value.materialColor], uvAnimation: [...value.uvAnimation], subPixelOffset: [...value.subPixelOffset] };
}

/** Pure layout with caller-owned final matrices. No camera, pose, source layout,
 * parent transform or actor appearance is inferred from a captured frame. */
export function layoutGuiEntity(options: GuiEntityLayoutOptions, cached?: GuiEntityMesh): GuiEntityLayout {
  const frame = layoutGuiImages({ width: options.width, height: options.height, guiScale: options.guiScale, outputRect: options.outputRect, scissor: options.scissor, images: [] });
  const signature = sourceSignature(options.source), mesh = cached ?? compileGuiEntitySource(options.source), entry = compiled.get(mesh);
  if (!entry || entry.source !== options.source || entry.signature !== signature) throw new RangeError('Compiled entity mesh does not match the current source.');
  object(options.bonePose, 'entity.bonePose');
  const names = entry.snapshot.boneNames, keys = Reflect.ownKeys(options.bonePose);
  if (keys.length !== names.length || keys.some(key => typeof key !== 'string' || !names.includes(key))) throw new RangeError('Entity bone poses must match all declared source names.');
  const palette = new Float32Array(names.length * 16);
  names.forEach((key, i) => {
    if (!own(options.bonePose, key)) throw new RangeError('Entity bone pose is missing an own matrix.');
    palette.set(matrix(options.bonePose[key], `bonePose.${key}`), i * 16);
  });
  return { width: frame.width, height: frame.height, guiScale: frame.guiScale, outputRect: [...frame.outputRect], mesh: copyMesh(entry.snapshot), palette,
    model: matrix(options.model, 'entity.model'), view: matrix(options.view, 'entity.view'), projection: matrix(options.projection, 'entity.projection'),
    viewport: pixelRect(options.viewport, frame.width, frame.height, 'entity.viewport', true),
    scissor: pixelRect(options.scissor ?? [0,0,frame.width,frame.height], frame.width, frame.height, 'entity.scissor', false), material: material(options.material) };
}
