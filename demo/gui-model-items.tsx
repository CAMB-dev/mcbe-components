import { BlockPreview, createGuiCuboidModel } from '../src';
import type { GuiModelItem, GuiModelMesh, GuiModelProjection, GuiTextureAtlasSource, InventoryItem } from '../src';

// One explicit observed profile, not an authoritative native CPU/default camera.
// Several Y offsets reproduce the same two captured half-precision submissions.
export const observedCuboidProjection: GuiModelProjection = {
  yaw: 45, pitch: 30, scale: .625, offset: [1 + 10 / Math.sqrt(2), 8.9375],
  originQuantization: 'physical-floor',
};
const texture = (name: string) => new URL(`../src/assets/item-renderers/${name}.png`, import.meta.url).href;
const stone = texture('stone');
// Explicit observed packing metadata; every tile remains an original source PNG.
// This is neither a captured atlas bitmap nor a recovered automatic packer.
export const observedBlockAtlas: GuiTextureAtlasSource = {
  kind: 'atlas', width: 1024, height: 512, tiles: [
    { origin: [96, 16], size: [16, 16], texture: stone },
    { origin: [848, 112], size: [16, 16], texture: texture('enchanting_table_top') },
    { origin: [832, 112], size: [16, 16], texture: texture('enchanting_table_side') },
    { origin: [864, 112], size: [16, 16], texture: new URL('./assets/gui-model/end_rod.png', import.meta.url).href },
  ],
};
function observedFaceUvs(model: GuiModelMesh, top: readonly [number, number], side: readonly [number, number]): GuiModelMesh {
  return { faces: model.faces.map(face => {
    // Only the three observed faces use this packing profile. Other faces retain
    // their original source texture instead of guessing an unobserved binding.
    if (!face.normal || !(face.normal[0] > 0 || face.normal[1] > 0 || face.normal[2] > 0)) return face;
    const [x, y] = face.normal[1] > 0 ? top : side;
    const move = ([u, v]: readonly [number, number]): readonly [number, number] => [u + x, v + y];
    const uv: typeof face.uv = [move(face.uv[0]), move(face.uv[1]), move(face.uv[2]), move(face.uv[3])];
    return { ...face, texture: 'blocks', uv };
  }) };
}
export const observedSlabModel: GuiModelItem = {
  model: observedFaceUvs(createGuiCuboidModel([0, 0, 0], [16, 8, 16], {
    colors: { up: [255, 255, 255, 255], east: [127, 127, 127, 255], south: [186, 186, 186, 255] },
  }), [96, 16], [96, 16]),
  projection: observedCuboidProjection,
  textureSizes: { all: [16, 16], blocks: [1024, 512] }, textures: { all: stone, blocks: observedBlockAtlas },
};
export const observedTableModel: GuiModelItem = {
  model: observedFaceUvs(createGuiCuboidModel([0, 0, 0], [16, 12, 16]), [848, 112], [832, 112]),
  projection: observedCuboidProjection,
  textureSizes: { top: [16, 16], side: [16, 16], bottom: [16, 16], blocks: [1024, 512] },
  textures: { top: texture('enchanting_table_top'), side: texture('enchanting_table_side'), bottom: texture('enchanting_table_bottom'), blocks: observedBlockAtlas },
};
export const sampleGuiBlockItems: readonly InventoryItem[] = [
  { name: 'Stone slab', icon: <BlockPreview block="stone-slab" decorative/>, guiModel: observedSlabModel },
  { name: 'Stone slab', icon: <BlockPreview block="stone-slab" decorative/>, guiModel: observedSlabModel },
  { name: 'Enchanting table', icon: <BlockPreview block="enchanting-table" decorative/>, guiModel: observedTableModel },
];
