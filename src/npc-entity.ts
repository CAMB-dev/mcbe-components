import geometryJson from './assets/npc-actor/npc.geo.json' with { type: 'json' };
import animationJson from './assets/npc-actor/npc.animation.json' with { type: 'json' };
import controllerJson from './assets/npc-actor/npc.render_controllers.json' with { type: 'json' };
import entityJson from './assets/npc-actor/npc.entity.json' with { type: 'json' };
import { npcActorSkins } from './npc-actor-assets';
import type { NpcActorSkinAlias, NpcActorSourceVariant } from './npc-actor-assets';
import type { GuiEntityBone, GuiEntityGeometry, GuiEntitySource, GuiNpcPortraitMaterial } from './gui-entity-geometry';
import type { GuiLayerCommand } from './gui-layer-component';

export type NpcSkinName = NpcActorSkinAlias;
export type NpcEntityVariant = NpcActorSourceVariant;
export interface NpcEntityOptions extends Omit<GuiEntityGeometry, 'source' | 'bonePose'> {
  /** Original controller alias or source array index. Omitted selects its first
   * entry; this is not an engine UI collection-binding default. */
  skin?: NpcSkinName | NpcEntityVariant;
  /** Complete final named matrices, including hidden bones. Live animation/query
   * resolution is host-owned; omission uses the finite authored folded-idle pose. */
  bonePose?: GuiEntityGeometry['bonePose'];
}

type Vec3 = readonly [number, number, number];
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const typedArrayTag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Float32Array.prototype), Symbol.toStringTag)!.get!;
function object(value: unknown, label: string, allowed?: readonly string[], required: readonly string[] = []): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new RangeError(`${label} requires a plain object.`);
  if (allowed && Reflect.ownKeys(value).some(key => typeof key !== 'string' || !allowed.includes(key))) throw new RangeError(`${label} contains an unsupported field.`);
  if (required.some(key => !own(value, key))) throw new RangeError(`${label} is missing an own field.`);
}
function finite(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new RangeError(`${label} must be finite float32.`);
}
function vector(value: unknown, length: number, label: string): number[] {
  if (!Array.isArray(value) || value.length !== length) throw new RangeError(`${label} requires ${length} components.`);
  const result: number[] = [];
  for (let i = 0; i < length; i++) { if (!own(value, String(i))) throw new RangeError(`${label} must be dense.`); finite(value[i], label); result.push(value[i]); }
  return result;
}
function vec3(value: unknown, label: string): Vec3 { const v = vector(value, 3, label); return [v[0]!, v[1]!, v[2]!]; }
function matrix(value: unknown, label: string): Float32Array {
  if (!ArrayBuffer.isView(value) || typedArrayTag.call(value) !== 'Float32Array' || (value as Float32Array).length !== 16) throw new RangeError(`${label} requires a Float32Array of length16.`);
  const values = value as Float32Array;
  for (const part of values) finite(part, label);
  return new Float32Array(values);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}

// Whole original JSON imports; fixed ZIP provenance and byte hashes are checked
// by prepare-npc-actor-assets.py. No runtime fetch/hash service or Molang eval.
function sourceModel(): GuiEntitySource {
  if (geometryJson.format_version !== '1.8.0' || controllerJson.format_version !== '1.8.0') throw new RangeError('Unsupported original NPC source version.');
  const raw = geometryJson['geometry.npc'];
  if (raw.texturewidth !== 64 || raw.textureheight !== 64 || raw.bones.length !== 10) throw new RangeError('Expected the fixed NPC64 source geometry.');
  const visibility = controllerJson.render_controllers['controller.render.npc'].part_visibility;
  if (visibility.length !== 1) throw new RangeError('Unsupported NPC part visibility declarations.');
  const parts: unknown = visibility[0]; object(parts, 'NPC part visibility');
  if (parts['*'] !== false || Object.values(parts).some(value => typeof value !== 'boolean')) throw new RangeError('NPC visibility requires an explicit false wildcard and boolean parts.');
  const names = new Set<string>();
  const bones: GuiEntityBone[] = raw.bones.map((value: unknown) => {
    object(value, 'NPC source bone', ['name', 'parent', 'pivot', 'cubes', 'neverRender'], ['name', 'pivot', 'cubes']);
    if (typeof value.name !== 'string' || !value.name || names.has(value.name) || (value.parent !== undefined && typeof value.parent !== 'string') || (value.neverRender !== undefined && value.neverRender !== false)) throw new RangeError('Unsupported NPC bone declaration.');
    names.add(value.name);
    if (!Array.isArray(value.cubes) || value.cubes.length > 16) throw new RangeError('Expected bounded NPC source cubes.');
    const cubes = value.cubes.map((cube: unknown) => {
      object(cube, 'NPC source cube', ['origin', 'size', 'uv', 'inflate'], ['origin', 'size', 'uv']);
      const uv = vector(cube.uv, 2, 'NPC cube UV');
      if (cube.inflate !== undefined) finite(cube.inflate, 'NPC cube inflate');
      return { origin: vec3(cube.origin, 'NPC cube origin'), size: vec3(cube.size, 'NPC cube size'), uv: [uv[0]!, uv[1]!] as const,
        ...(cube.inflate === undefined ? {} : { inflate: cube.inflate }) };
    });
    return { name: value.name, ...(value.parent === undefined ? {} : { parent: value.parent }), pivot: vec3(value.pivot, 'NPC bone pivot'), visible: own(parts, value.name) && parts[value.name] === true, cubes };
  });
  for (const key of Object.keys(parts)) if (key !== '*' && !names.has(key)) throw new RangeError('Unknown NPC visibility bone.');
  return freeze({ profile: 'npc-box64-rigid', textureSize: [64, 64], bones });
}
const SOURCE = sourceModel();
const byName = new Map(SOURCE.bones.map(bone => [bone.name, bone]));

const skinEntries = npcActorSkins.map(entry => ({ variant: entry.variant, alias: entry.alias, url: entry.url }));
const declaredSkins = controllerJson.render_controllers['controller.render.npc'].arrays.textures['Array.skins'];
const textureAliases: Readonly<Record<string, string>> = entityJson['minecraft:client_entity'].description.textures;
if (skinEntries.length !== 60 || declaredSkins.length !== skinEntries.length || entityJson['minecraft:client_entity'].description.geometry.default !== 'geometry.npc') throw new RangeError('Unsupported NPC skin/source mapping.');
for (const [index, entry] of skinEntries.entries()) {
  if (entry.variant !== index || declaredSkins[index] !== `Texture.${entry.alias}` || !own(textureAliases, entry.alias) || textureAliases[entry.alias] !== `textures/entity/npc/${entry.alias}`) throw new RangeError('NPC skin registry differs from its original controller.');
}
freeze(skinEntries);
/** Source controller order; these are entity aliases, not translated UI labels. */
export const npcSkinNames: readonly NpcSkinName[] = Object.freeze(skinEntries.map(entry => entry.alias));

function identity(): Float32Array { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let value = 0; for (let k = 0; k < 4; k++) value += a[k * 4 + r]! * b[c * 4 + k]!;
    out[c * 4 + r] = value;
  }
  return out;
}
function foldedIdle(): Readonly<Record<string, Float32Array>> {
  if (animationJson.format_version !== '1.8.0') throw new RangeError('Unsupported NPC animation source.');
  const arms = animationJson.animations['animation.npc.general'].bones.arms;
  const position = vec3(arms.position, 'NPC general arms position');
  const rotation: readonly unknown[] = arms.rotation;
  const match = typeof rotation[0] === 'string' ? /^(-?(?:0|[1-9]\d*)(?:\.\d+)?) - this$/.exec(rotation[0]) : null;
  if (!match || rotation[1] !== 0 || rotation[2] !== 0) throw new RangeError('Unsupported NPC folded-idle expression.');
  const angle = Number(match[1]); finite(angle, 'NPC authored arms angle');
  const root = byName.get('body'); if (!root) throw new RangeError('NPC body pivot is missing.');
  const result: Record<string, Float32Array> = Object.create(null);
  const visiting = new Set<string>();
  const resolve = (name: string): Float32Array => {
    if (own(result, name)) return result[name]!;
    const bone = byName.get(name); if (!bone || visiting.has(name)) throw new RangeError('Invalid NPC source bone hierarchy.');
    visiting.add(name);
    const parent = bone.parent === undefined ? undefined : byName.get(bone.parent);
    if (bone.parent !== undefined && !parent) throw new RangeError('NPC parent bone is missing.');
    const reference = parent?.pivot ?? root.pivot, local = identity();
    local[12] = bone.pivot[0] - reference[0]; local[13] = reference[1] - bone.pivot[1]; local[14] = bone.pivot[2] - reference[2];
    if (name === 'arms') {
      local[12] += position[0]; local[13] -= position[1]; local[14] += position[2];
      const rad = angle * Math.PI / 180, c = Math.fround(Math.cos(rad)), s = Math.fround(Math.sin(rad));
      local[5] = c; local[6] = s; local[9] = -s; local[10] = c;
    }
    result[name] = parent ? multiply(resolve(parent.name), local) : local;
    visiting.delete(name); return result[name]!;
  };
  for (const bone of SOURCE.bones) resolve(bone.name);
  return Object.freeze(result);
}
function pose(value: GuiEntityGeometry['bonePose'] | undefined): GuiEntityGeometry['bonePose'] {
  if (value === undefined) return foldedIdle();
  const names = SOURCE.bones.map(bone => bone.name);
  object(value, 'NPC bonePose', names, names);
  const result: Record<string, Float32Array> = Object.create(null);
  for (const name of names) result[name] = matrix(value[name], `bonePose.${name}`);
  return Object.freeze(result);
}
function rect(value: unknown, label: string, positive: boolean): readonly [number, number, number, number] {
  const v = vector(value, 4, label);
  if (v.some(part => !Number.isSafeInteger(part) || part < 0) || (positive && (!v[2] || !v[3])) || !Number.isSafeInteger(v[0]! + v[2]!) || !Number.isSafeInteger(v[1]! + v[3]!)) throw new RangeError(`${label} requires a bounded physical pixel rectangle.`);
  return [v[0]!, v[1]!, v[2]!, v[3]!];
}
function material(value: GuiNpcPortraitMaterial): GuiNpcPortraitMaterial {
  const fields = ['kind', 'tileLightColor', 'fogControl', 'fogColor', 'materialColor', 'uvAnimation', 'subPixelOffset'];
  object(value, 'NPC material', fields, fields);
  if (value.kind !== 'npc-portrait') throw new RangeError('Unsupported NPC material profile.');
  const tile = vector(value.tileLightColor, 4, 'NPC tileLightColor'), fog = vec3(value.fogControl, 'NPC fogControl');
  const color = vector(value.materialColor, 4, 'NPC materialColor'), uv = vector(value.uvAnimation, 4, 'NPC UV animation'), sub = vector(value.subPixelOffset, 2, 'NPC subpixel offset');
  const divisor = Math.fround(Math.fround(fog[1]) - Math.fround(fog[0]));
  if (!Number.isFinite(divisor) || divisor === 0 || Math.fround(fog[2]) === 0) throw new RangeError('NPC fog range and depth need finite nonzero float32 divisors.');
  return { kind: 'npc-portrait', tileLightColor: [tile[0]!,tile[1]!,tile[2]!,tile[3]!], fogControl: fog, fogColor: vec3(value.fogColor, 'NPC fogColor'),
    materialColor: [color[0]!,color[1]!,color[2]!,color[3]!], uvAnimation: [uv[0]!,uv[1]!,uv[2]!,uv[3]!], subPixelOffset: [sub[0]!,sub[1]!] };
}

/** Pure original-source NPC command. No IO, camera fit or captured transform is
 * supplied. Default pose is a finite authored folded idle, not a Molang engine. */
export function createNpcEntity(options: NpcEntityOptions): Extract<GuiLayerCommand, { kind: 'entity' }> {
  object(options, 'NPC options', ['skin', 'bonePose', 'model', 'view', 'projection', 'viewport', 'scissor', 'material'], ['model', 'view', 'projection', 'viewport', 'material']);
  const selected = options.skin === undefined ? skinEntries[0] : typeof options.skin === 'number'
    ? Number.isSafeInteger(options.skin) && options.skin >= 0 ? skinEntries[options.skin] : undefined
    : typeof options.skin === 'string' ? skinEntries.find(entry => entry.alias === options.skin) : undefined;
  if (!selected) throw new RangeError('NPC skin must be an exact original alias or source variant0..59.');
  return { kind: 'entity', texture: selected.url, source: SOURCE, bonePose: pose(options.bonePose),
    model: matrix(options.model, 'NPC model'), view: matrix(options.view, 'NPC view'), projection: matrix(options.projection, 'NPC projection'),
    viewport: rect(options.viewport, 'NPC viewport', true), ...(options.scissor === undefined ? {} : { scissor: rect(options.scissor, 'NPC scissor', false) }), material: material(options.material) };
}
