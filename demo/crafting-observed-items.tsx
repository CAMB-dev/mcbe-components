import { BannerPreview, BlockPreview, createGuiCuboidModel } from '../src';
import type { GuiCuboidFace, GuiModelFace, GuiModelItem, InventoryItem, ItemMesh, RecipeBookItem, Vec3 } from '../src';
import { craftingObservedTextures as materials } from './crafting-observed-materials';
import type { CraftingObservedTexture } from './crafting-observed-materials';
import { observedCuboidProjection, observedTableModel, sampleGuiBlockItems } from './gui-model-items';

type Box = readonly [Vec3, Vec3];
type Material = (typeof materials)[CraftingObservedTexture];
export interface ObservedRecipe extends RecipeBookItem { category: 'construction' | 'search' }
export interface ObservedPreviewCallbacks {
  onBlockReady?: (index: number) => void;
  onBannerReady?: (index: number) => void;
}
const allFaces = { up: 'all', east: 'all', south: 'all', down: 'all', west: 'all', north: 'all' } as const;
function colors(preserveAlpha: boolean) {
  const rgba = (v: number): readonly [number, number, number, number] => [v, v, v, preserveAlpha ? 0 : 255];
  return { up: rgba(255), east: rgba(127), south: rgba(186), down: rgba(255), west: rgba(255), north: rgba(255) };
}

/** Ordinary local-UV cuboids and an explicit finite demo projection.
 * The source primitive keeps each complete box; it does not clip shared faces
 * or serialize captured vertices. This is not an engine model/camera default. */
export function createObservedBlockItem(boxes: readonly Box[], textures: Readonly<Record<string, Material>>,
  faces: Partial<Record<GuiCuboidFace, string>> = allFaces, preserveAlpha = false): GuiModelItem {
  return {
    model: { faces: boxes.flatMap(([min, max]) => createGuiCuboidModel(min, max, { textures: faces, colors: colors(preserveAlpha) }).faces) },
    projection: observedCuboidProjection,
    textures: Object.fromEntries(Object.entries(textures).map(([key, value]) => [key, value.src])),
    textureSizes: Object.fromEntries(Object.entries(textures).map(([key, value]) => [key, [value.width, value.height] as const])),
  };
}

export function createObservedStairItem(texture: Material): GuiModelItem {
  return createObservedBlockItem([[[0, 0, 0], [8, 16, 16]], [[8, 0, 0], [16, 8, 16]]], { all: texture }, allFaces, true);
}

/** Symmetric thin-Z pane authoring: broad north/south faces use glass body.
 * End/cap edge assignments are a normal preview choice, not a complete recovery
 * of the world's asymmetric block bindings or native visual geometry. */
export function createObservedPaneItem(): GuiModelItem {
  return createObservedBlockItem([[[0, 0, 7], [16, 16, 9]]], { edge: materials.glass_pane_top_red, body: materials.glass_red },
    { up: 'edge', down: 'edge', east: 'edge', west: 'edge', north: 'body', south: 'body' }, true);
}

export function createObservedCandleItem(texture: Material): GuiModelItem {
  const face: GuiModelFace = { vertices: [[0, 0, 16], [16, 0, 16], [16, 0, 0], [0, 0, 0]],
    uv: [[0, 16], [16, 16], [16, 0], [0, 0]], normal: [0, 1, 0], texture: 'all', color: [255, 255, 255, 0] };
  return { model: { faces: [face] }, projection: { yaw: 0, pitch: 90, scale: 1, offset: [0, 0], originQuantization: 'physical-floor' },
    textureSizes: { all: [texture.width, texture.height] }, textures: { all: texture.src } };
}

function modelPreview(item: GuiModelItem, onReady?: () => void) {
  const model: ItemMesh = { bounds: [[0, 0, 0], [16, 16, 16]], faces: item.model.faces };
  // This helper's local materials are whole URLs. ObservedTableModel has its own
  // ordinary BlockPreview fallback and never enters this URL-only conversion.
  const textures = Object.fromEntries(Object.entries(item.textures).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
  return <BlockPreview model={model} textures={textures} size={32} resolution={80} decorative onReady={onReady}/>;
}

/** Real preview, with source collision-shape boxes and whole original textures.
 * Part assignments are an authored approximation; native visual30-face
 * decomposition, material UV and centering remain unverified. */
export function ObservedGrindstonePreview({ onReady }: { onReady?: () => void }) {
  const boxes: readonly Box[] = [[[2, 0, 6], [4, 13, 10]], [[12, 0, 6], [14, 13, 10]], [[4, 4, 2], [12, 16, 14]],
    [[2, 7, 5], [4, 13, 6]], [[2, 7, 10], [4, 13, 11]], [[12, 7, 5], [14, 13, 6]], [[12, 7, 10], [14, 13, 11]]];
  const model: ItemMesh = { bounds: [[0, 0, 0], [16, 16, 16]], faces: boxes.flatMap(([min, max], index) => {
    const textures = index === 2 ? { up: 'round', down: 'round', east: 'side', west: 'side', north: 'round', south: 'round' }
      : Object.fromEntries(Object.keys(allFaces).map(face => [face, index < 2 ? 'leg' : 'pivot']));
    return createGuiCuboidModel(min, max, { textures }).faces;
  }) };
  return <BlockPreview model={model} textures={{ all: materials.log_big_oak.src, leg: materials.log_big_oak.src,
    pivot: materials.grindstone_pivot.src, round: materials.grindstone_round.src, side: materials.grindstone_side.src }}
    size={32} resolution={80} decorative onReady={onReady}/>;
}

/** Whole16x48 source TGA; frame0 is an explicit static Web preview choice.
 * Source east/west saw bindings motivate an X-normal blade. Its authored
 * Y9..16 span uses frame0 rows9..16 and keeps the whole texture width,
 * including transparent border columns. Native mounting, lighting and phase
 * remain unverified; this is not captured geometry or recovered animation. */
export function ObservedStonecutterPreview({ onReady }: { onReady?: () => void }) {
  const vertices: GuiModelFace['vertices'] = [[8, 9, 16], [8, 9, 0], [8, 16, 0], [8, 16, 16]];
  const uv: GuiModelFace['uv'] = [[0, 16], [16, 16], [16, 9], [0, 9]];
  const model: ItemMesh = { bounds: [[0, 0, 0], [16, 16, 16]], faces: [
    ...createGuiCuboidModel([0, 0, 0], [16, 9, 16]).faces,
    { vertices, uv, normal: [1, 0, 0], texture: 'saw' },
    { vertices: [vertices[3], vertices[2], vertices[1], vertices[0]], uv: [uv[3], uv[2], uv[1], uv[0]], normal: [-1, 0, 0], texture: 'saw' },
  ] };
  return <BlockPreview model={model} textures={{ all: materials.stonecutter2_side.src, top: materials.stonecutter2_top.src,
    side: materials.stonecutter2_side.src, bottom: materials.stonecutter2_bottom.src, saw: materials.stonecutter2_saw.src }}
    size={32} resolution={80} decorative onReady={onReady}/>;
}

export function ObservedBannerPreview({ onReady }: { onReady?: () => void }) {
  return <BannerPreview view="item" width={32} height={32} baseTexture={materials.banner_base.src} decorative onReady={onReady}/>;
}

/** Caller-owned finite visual collection. IDs describe gallery order only.
 * No recipe IDs, ingredient rules, craftability or item counts are inferred. */
export function createObservedRecipeEntries(callbacks: ObservedPreviewCallbacks = {}): ObservedRecipe[] {
  const entries: ObservedRecipe[] = [];
  const add = (label: string, item: InventoryItem, preview?: RecipeBookItem['preview']) => {
    const index = entries.length;
    entries.push({ id: `demo-observed-index-${index}`, label, category: index < 10 ? 'construction' : 'search',
      backgroundImage: materials.recipe_book_red_button.src, backgroundSize: [3, 3], backgroundSlice: 1,
      modifier: 'none', disabled: false, item, ...(preview ? { preview } : {}) });
  };
  const block = (name: string, guiModel: GuiModelItem) => {
    const index = entries.length;
    add(name, { name, guiModel, icon: modelPreview(guiModel, () => callbacks.onBlockReady?.(index)) });
  };
  const single = (texture: Material, max: Vec3, preserve = false) => createObservedBlockItem([[[0, 0, 0], max]], { all: texture }, allFaces, preserve);
  block('Stone stair', createObservedStairItem(materials.stone));
  block('Red wool stair', createObservedStairItem(materials.wool_colored_red));
  block('Blue wool stair', createObservedStairItem(materials.wool_colored_blue));
  block('Red glass pane', createObservedPaneItem());
  block('Stone slab', single(materials.stone, [16, 8, 16]));
  block('Red wool slab', single(materials.wool_colored_red, [16, 8, 16], true));
  block('Blue wool slab', single(materials.wool_colored_blue, [16, 8, 16], true));
  block('Stone bricks', single(materials.stonebrick, [16, 16, 16]));
  block('Lapis block', single(materials.lapis_block, [16, 16, 16]));
  block('Red carpet', single(materials.wool_colored_red, [16, 1, 16], true));
  const planes: readonly [CraftingObservedTexture, string][] = [
    ['dye_powder_red', 'Red dye'], ['dye_powder_orange', 'Orange dye'], ['dye_powder_cyan', 'Cyan dye'],
    ['dye_powder_light_blue', 'Light blue dye'], ['dye_powder_blue_new', 'Blue dye'], ['dye_powder_purple', 'Purple dye'],
    ['dye_powder_magenta', 'Magenta dye'], ['dye_powder_pink', 'Pink dye'], ['dye_powder_blue', 'Lapis lazuli'],
    ['wood_sword', 'Wooden sword'], ['diamond_sword', 'Diamond sword'], ['bundle_red', 'Red bundle'], ['bundle_blue', 'Blue bundle'],
    ['bed_red', 'Red bed'], ['bed_blue', 'Blue bed'], ['red_cushion', 'Red cushion'], ['blue_cushion', 'Blue cushion'],
  ];
  planes.forEach(([key, name]) => add(name, { name, image: materials[key].src }));
  for (const [texture, name] of [[materials.blue_candle, 'Blue candle'], [materials.red_candle, 'Red candle']] as const)
    add(name, { name, image: texture.src, guiModel: createObservedCandleItem(texture) });
  block('Crafting table', createObservedBlockItem([[[0, 0, 0], [16, 16, 16]]], {
    top: materials.crafting_table_top, front: materials.crafting_table_front, side: materials.crafting_table_side,
  // The fixed positive view culls the unobserved bottom; no bottom texture is
  // invented from a visible face or claimed valid for arbitrary cameras.
  }, { up: 'top', east: 'side', south: 'front', west: 'side', north: 'front', down: 'unbound-bottom' }));
  add('Grindstone', { name: 'Grindstone' }, <ObservedGrindstonePreview onReady={() => callbacks.onBlockReady?.(30)}/>);
  add('Enchanting table', { name: 'Enchanting table', guiModel: observedTableModel,
    icon: <BlockPreview block="enchanting-table" size={32} resolution={80} decorative onReady={() => callbacks.onBlockReady?.(31)}/> });
  add('Stonecutter', { name: 'Stonecutter' }, <ObservedStonecutterPreview onReady={() => callbacks.onBlockReady?.(32)}/>);
  block('Stone button', createObservedBlockItem([[[5, 6, 14], [11, 10, 16]]], { all: materials.stone }));
  block('Stone pressure plate', createObservedBlockItem([[[1, 0, 1], [15, 1, 15]]], { all: materials.stone }, allFaces, true));
  add('Banner', { name: 'Banner' }, <ObservedBannerPreview onReady={() => callbacks.onBannerReady?.(35)}/>);
  return entries;
}

export function createObservedHotbar(): InventoryItem[] {
  return [...sampleGuiBlockItems, { name: 'Diamond sword', image: materials.diamond_sword.src },
    ...[1, 15, 30, 45, 58].map(damage => ({ name: 'Wooden sword', image: materials.wood_sword.src, durability: (59 - damage) / 59 }))];
}
