// Pure original-source layout and command composition; native numeric/font fidelity is qualified separately.
import type { GuiImageGeometry, GuiImageRect } from './gui-image-geometry';
import type { GuiLayerCommand } from './gui-layer-component';
import type { GuiTextGeometry, GuiTextRgba8 } from './gui-text-geometry';
import type { InventoryItem } from './inventory';
import type { CraftingScreenProps } from './crafting-screen';
import type { InventoryScreenLayout } from './inventory-screen-frame';
import type { RecipeBookItem, RecipeBookProps } from './recipe-book';
import type { RecipeCategory } from './inventory-screens';
import type { PixelTexture } from './item-renderer-engine';
import type { WorkstationImageProfile, WorkstationLabelMetrics, WorkstationTextStyle } from './workstation-source-layer';
import { resolveWorkstationFrame, sourceImage, sourceText, validateWorkstationLabelMetrics, layoutWorkstationWindow } from './workstation-source-layer';
import { layoutGuiText } from './gui-text-geometry';
import type { WorkstationControlState, WorkstationInputControlState } from './workstation-source-layer';
import { craftingImageAssets as assets } from './crafting-image-assets';

export interface CraftingScreenTextStyle extends WorkstationTextStyle {
  /** Required normal source inputs; no Anvil font/paint offset defaults. */
  metrics: WorkstationLabelMetrics;
}
export interface CraftingScreenInputTextStyle extends CraftingScreenTextStyle {
  /** Explicit normal source clipping policy; no captured rectangle is required. */
  clipQuantization: 'floor-min-ceil-max' | 'logical-stage-floor';
  scissor?: GuiTextGeometry['scissor'];
}
export interface CraftingScreenImageRenderProfile extends WorkstationImageProfile {
  /** Center the complete326x166 root if omitted, including compact75g padding. */
  origin?: readonly [number, number];
  /** Not implicitly inherited from another workstation's captures. */
  imagePhysicalPrecision?: GuiImageGeometry['physicalPrecision'];
  itemImages?: boolean;
  itemModels?: boolean;
  text?: {
    crafting?: CraftingScreenTextStyle;
    inventory?: CraftingScreenTextStyle;
    recipeTitle?: CraftingScreenTextStyle;
    query?: CraftingScreenInputTextStyle;
    placeholder?: CraftingScreenInputTextStyle;
    inventoryCount?: CraftingScreenTextStyle;
    recipeCount?: CraftingScreenTextStyle;
  };
}
export interface CraftingSourceContent {
  layout: InventoryScreenLayout;
  title: string;
  recipeBook: Pick<RecipeBookProps, 'title' | 'entries' | 'categories' | 'categoryId' | 'query' | 'craftableOnly' | 'selectedId' | 'creative' | 'disabled'> & { searchPlaceholder?: string };
  crafting: CraftingScreenProps['crafting'];
  showClose: boolean;
}
export interface CraftingSourceScroll {
  /** Actual native viewport scrollTop in its untransformed CSS coordinates, divided by2. */
  topGame: number;
  /** Derive from typed collection/source viewport, not a fitted DOM rectangle. */
  hasScrollbar: boolean;
}
export interface CraftingGeometry {
  root: GuiImageRect;
  rightOrigin: readonly [number, number];
  book?: GuiImageRect;
  fold?: GuiImageRect;
  tabs?: GuiImageRect;
  toolbar: GuiImageRect;
  toolbarBackground: GuiImageRect;
  rightSlots: readonly GuiImageRect[];
  rightItemRects: readonly GuiImageRect[];
  bookViewport?: GuiImageRect;
  recipeCells: readonly { index: number; id: string; cell: GuiImageRect; selected: GuiImageRect; item: GuiImageRect; modifier: GuiImageRect }[];
  /** Logical candidates only. Native quantization/scissor qualification is pending. */
  nativeQualified: false;
}

function nonnegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative.`);
  return value;
}
/** Shared with Survival later; compact still retains the complete326g root. */
export function layoutInventoryFrame(layout: InventoryScreenLayout, showClose: boolean) {
  if (layout !== 'recipe-book' && layout !== 'survival') throw new RangeError('Unknown crafting layout.');
  const wide = layout === 'recipe-book', rightX = wide ? 150 : 75;
  const width = showClose ? 99 : 84, right = rightX + 176;
  return { root: [0, 0, 326, 166] as GuiImageRect, rightOrigin: [rightX, 0] as const,
    toolbar: [right - width, -20, width, 20] as GuiImageRect,
    toolbarBackground: [right - width, -23, width, 28] as GuiImageRect,
    ...(wide ? { book: [0, 0, 146, 166] as GuiImageRect, fold: [142, 3, 12, 160] as GuiImageRect, tabs: [0, -23, 146, 27] as GuiImageRect } : {}) };
}
/** Workbench-specific slots; Survival uses a distinct46-slot arrangement. */
export function layoutCraftingRight(rightX: number): readonly GuiImageRect[] {
  return [
    ...Array.from({ length: 9 }, (_, i): GuiImageRect => [rightX + 29 + i % 3 * 18, 16 + Math.floor(i / 3) * 18, 18, 18]),
    [rightX + 123, 30, 26, 26],
    ...Array.from({ length: 27 }, (_, i): GuiImageRect => [rightX + 7 + i % 9 * 18, 86 + Math.floor(i / 9) * 18, 18, 18]),
    ...Array.from({ length: 9 }, (_, i): GuiImageRect => [rightX + 7 + i * 18, 143, 18, 18]),
  ];
}
/** Source arithmetic only. No DOM, capture buffers, IO, font lookup or shader execution. */
export function layoutCraftingSource(content: CraftingSourceContent, scroll: CraftingSourceScroll): CraftingGeometry {
  nonnegative(scroll.topGame, 'scroll.topGame');
  const frame = layoutInventoryFrame(content.layout, content.showClose);
  const rightSlots = layoutCraftingRight(frame.rightOrigin[0]);
  const result: CraftingGeometry = { ...frame,
    rightSlots, rightItemRects: rightSlots.map(([x, y, w, h]) => [x + (w - 16) / 2, y + (h - 16) / 2, 16, 16]),
    recipeCells: [], nativeQualified: false };
  if (content.layout !== 'recipe-book') return result;
  const search = content.recipeBook.categoryId === 'search', top = search ? 37 : 21, height = search ? 123 : 139;
  const viewportWidth = scroll.hasScrollbar ? 128 : 134, gridX = 6 + (viewportWidth - 7 * 18) / 2;
  result.bookViewport = [6, top, viewportWidth, height];
  const count = content.recipeBook.entries.length, cells = [] as CraftingGeometry['recipeCells'][number][];
  for (let index = 0; index < count; index++) {
    const entry = content.recipeBook.entries[index]; if (!entry) throw new RangeError('Sparse recipe entries are invalid.');
    const x = gridX + index % 7 * 18, y = top + Math.floor(index / 7) * 18 - scroll.topGame;
    // Include selected23x23 halo when testing visibility; physical scissor is applied to every run later.
    if (y + 20.5 <= top || y - 2.5 >= top + height) continue;
    cells.push({ index, id: entry.id, cell: [x, y, 18, 18], selected: [x - 2.5, y - 2.5, 23, 23],
      item: [x + 1, y + 1, 16, 16], modifier: [x + 10, y + 10, 7, 7] });
  }
  result.recipeCells = cells;
  return result;
}

/** Separate identities: right-slot46 never includes recipeN or category buttons. */
export function craftingRightItems(content: CraftingSourceContent): readonly (InventoryItem | null | undefined)[] {
  const data = content.crafting;
  return [...Array.from({ length: 9 }, (_, i) => data?.inputs?.[i]), data?.result,
    ...Array.from({ length: 27 }, (_, i) => data?.inventory?.[i]), ...Array.from({ length: 9 }, (_, i) => data?.hotbar?.[i])];
}
export function recipeArtOwnership(entry: RecipeBookItem, profile: CraftingScreenImageRenderProfile): 'dom' | 'sprite' | 'model' | 'empty' {
  if (entry.preview != null) return 'dom';
  // Explicit models use item.icon as their mounted atomic DOM fallback, just
  // like the existing workstation source path. entry.preview is a true override.
  if (profile.itemModels && entry.item?.guiModel) return 'model';
  if (entry.item?.icon != null) return 'dom';
  if (profile.itemImages && entry.item?.image?.trim()) return 'sprite';
  return entry.item ? 'dom' : 'empty';
}
export interface CraftingSourceQueue {
  /** One ordered queue for chrome, backgrounds, source items, text and overlays. */
  commands: readonly GuiLayerCommand[];
  domArt: { rightSlots: readonly number[]; recipeIds: readonly string[]; categoryIds: readonly string[] };
  /** A renderable custom ReactNode is an intentional DOM visual hole, not a resource error. */
  ownership: 'whole-current-request';
}

export interface CraftingSourceVisualState {
  right: readonly WorkstationControlState[];
  recipes: ReadonlyMap<string, WorkstationControlState>;
  categories: ReadonlyMap<string, WorkstationControlState>;
  toolbar: ReadonlyMap<string, WorkstationControlState>;
  filter: WorkstationControlState;
  search: WorkstationInputControlState;
  clear: WorkstationControlState;
  scrollbar: WorkstationControlState;
}
const idle = (): WorkstationControlState => ({ hover: false, focus: false, pressed: false, selected: false, disabled: false });
export function emptyCraftingSourceVisualState(): CraftingSourceVisualState {
  return { right: Array.from({ length: 46 }, idle), recipes: new Map(), categories: new Map(), toolbar: new Map(),
    filter: idle(), search: { ...idle(), composing: false }, clear: idle(), scrollbar: idle() };
}
const defaultCategories: readonly RecipeCategory[] = ['construction', 'equipment', 'items', 'nature', 'search'].map(id => ({ id, label: id }));
type Asset = { url: string; nineSlice?: import('./gui-image-geometry').GuiImageNineSlice };
type ImageCommand = Extract<GuiLayerCommand, { kind: 'image' }>;
// The source's uppercase textures/ui/White resolves to a solid material, not
// the unrelated lowercase15px white.png. This is a normal constant-color
// resource, not captured pixels or a claimed original PNG asset.
const solidWhite: PixelTexture = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
export interface PreparedCraftingSource {
  commands: readonly GuiLayerCommand[];
  geometry: CraftingGeometry;
  origin: readonly [number, number];
  outputRect: GuiImageRect;
  window: ReturnType<typeof layoutWorkstationWindow>;
  imageSlots: readonly number[];
  modelSlots: readonly number[];
  overlaySlots: readonly number[];
  recipeArtIds: readonly string[];
  recipePaintIds: readonly string[];
  categoryIconIds: readonly string[];
  recipeCountIds: readonly string[];
  inventoryCountSlots: readonly number[];
  textRoles: ReadonlySet<string>;
}

/** Convert normal global game bounds to an explicit bounded physical scissor. */
export function craftingSourceScissor(frame: WorkstationImageProfile['frame'], origin: readonly [number, number], rect: GuiImageRect,
  policy: 'floor-min-ceil-max' | 'logical-stage-floor' = 'floor-min-ceil-max'): GuiImageRect {
  const { width, height, guiScale } = frame;
  if (policy !== 'floor-min-ceil-max' && policy !== 'logical-stage-floor') throw new RangeError('Unknown crafting clip quantization.');
  const scalar = (value: number) => policy === 'logical-stage-floor' ? Math.floor(value) * guiScale : value * guiScale;
  const x0 = Math.max(0, Math.min(width, Math.floor(scalar(origin[0] + rect[0]))));
  const y0 = Math.max(0, Math.min(height, Math.floor(scalar(origin[1] + rect[1]))));
  const x1 = Math.max(x0, Math.min(width, Math.ceil(scalar(origin[0] + rect[0] + rect[2]))));
  const y1 = Math.max(y0, Math.min(height, Math.ceil(scalar(origin[1] + rect[1] + rect[3]))));
  return [x0, y0, x1 - x0, y1 - y0];
}
function count(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/** One normal-input queue. No resources are fetched and no custom ReactNode is evaluated. */
export function prepareCraftingSource(profile: CraftingScreenImageRenderProfile, content: CraftingSourceContent,
  visual: CraftingSourceVisualState, scroll: CraftingSourceScroll): PreparedCraftingSource {
  const resolved = resolveWorkstationFrame(profile, [326, 166]), origin = resolved.origin;
  if (profile.imagePhysicalPrecision !== undefined && profile.imagePhysicalPrecision !== 'float32') throw new RangeError('Unknown crafting image precision.');
  for (const flag of [profile.itemImages, profile.itemModels]) if (flag !== undefined && typeof flag !== 'boolean') throw new RangeError('Crafting item flags must be explicit booleans.');
  const ids = new Set<string>();
  for (const entry of content.recipeBook.entries) {
    if (!entry || typeof entry.id !== 'string' || ids.has(entry.id)) throw new RangeError('Recipe entries require unique string IDs.');
    ids.add(entry.id);
  }
  const categoryIds = new Set<string>();
  for (const category of content.recipeBook.categories ?? defaultCategories) {
    if (!category || typeof category.id !== 'string' || categoryIds.has(category.id)) throw new RangeError('Recipe categories require unique string IDs.');
    categoryIds.add(category.id);
  }
  const geometry = layoutCraftingSource(content, scroll), commands: GuiLayerCommand[] = [];
  const imageSlots: number[] = [], modelSlots: number[] = [], overlaySlots: number[] = [], recipeArtIds: string[] = [], categoryIconIds: string[] = [], recipePaintIds: string[] = [];
  const inventoryCountSlots: number[] = [], recipeCountIds: string[] = [], textRoles = new Set<string>();
  const image = (asset: Asset | PixelTexture, rect: GuiImageRect, alpha = 1, scissor?: GuiImageRect): ImageCommand => ({ kind: 'image',
    ...('url' in asset ? sourceImage(asset, rect, origin, alpha) : { texture: asset, rect: [rect[0] + origin[0], rect[1] + origin[1], rect[2], rect[3]] as const, hudOpacity: alpha }),
    ...(profile.imagePhysicalPrecision ? { physicalPrecision: profile.imagePhysicalPrecision } : {}), ...(scissor ? { scissor } : {}) });
  const emitText = (value: string, style: CraftingScreenTextStyle | undefined, rect: GuiImageRect, align: 'start' | 'end' | 'center', scissor?: GuiImageRect, color: GuiTextRgba8 = [76, 76, 76, 255]) => {
    if (!style) return false;
    validateWorkstationLabelMetrics(style.metrics);
    if (!value) return true;
    const command = sourceText(value, style, [0, 0], color);
    const measured = layoutGuiText({ ...profile.frame, ...command });
    const x = rect[0] + (align === 'start' ? 0 : (rect[2] - measured.logicalWidth) * (align === 'center' ? .5 : 1));
    const y = rect[1] + (rect[3] - style.metrics.lineHeight) / 2;
    commands.push({ ...command, origin: [origin[0] + x + style.metrics.paintOffset[0], origin[1] + y + style.metrics.paintOffset[1]],
      ...(scissor ? { scissor } : {}) });
    return true;
  };
  const item = (entry: InventoryItem | null | undefined, rect: GuiImageRect, state: WorkstationControlState, custom: boolean, scissor?: GuiImageRect) => {
    if (!entry || custom) return undefined;
    if (profile.itemModels && entry.guiModel) {
      const model = entry.guiModel;
      commands.push({ ...model, kind: 'model', origin: [origin[0] + rect[0], origin[1] + rect[1]],
        hudOpacity: (model.hudOpacity ?? 1) * (state.disabled ? .5 : 1), ...(scissor ? { scissor } : {}) });
      return 'model' as const;
    }
    if (entry.icon != null) return undefined;
    if (profile.itemImages && entry.image?.trim()) {
      commands.push({ kind: 'sprite', texture: entry.image.trim(), rect: [origin[0] + rect[0], origin[1] + rect[1], rect[2], rect[3]],
        color: [255, 255, 255, 255], hudOpacity: state.disabled ? .5 : 1, ...(scissor ? { scissor } : {}) });
      return 'image' as const;
    }
    return undefined;
  };
  // Toolbar/tab backgrounds precede the panels that occlude their body overlap.
  commands.push(image(assets.toolbar_background, geometry.toolbarBackground));
  const [toolX, toolY] = geometry.toolbar;
  for (const [index, id] of ['recipe-book', 'survival'].entries()) {
    const state = visual.toolbar.get(id) ?? idle(), selected = content.layout === id, x = toolX + 8 + index * 26;
    const key = selected ? state.focus || state.hover ? 'recipe_book_button_borderless_lightpressed' : 'recipe_book_button_borderless_lightpressednohover'
      : state.focus || state.hover ? 'recipe_book_button_borderless_lighthover' : 'recipe_book_button_borderless_light';
    commands.push(image(assets[key], [x + 1, toolY + 2, 23, 16]));
    commands.push({ ...image(assets.focus_border_white, [x, toolY + 1, 25, 18]), tint: state.focus ? [1, 1, 1, 1] : [.075, .075, .075, 1] });
    commands.push(image(id === 'recipe-book' ? assets.recipe_book_icon : assets.inventory_icon, [x + 3, toolY + 3, 19, 13]));
  }
  const helpX = toolX + 63;
  const help = visual.toolbar.get('help') ?? idle(), close = visual.toolbar.get('close') ?? idle();
  commands.push(image(help.pressed ? assets.how_to_play_button_pressed_light : help.hover || help.focus ? assets.how_to_play_button_hover_light : assets.how_to_play_button_default_light, [helpX, toolY + 2.5, 15, 15]));
  if (content.showClose) commands.push(image(close.pressed ? assets.close_button_pressed_light : close.hover || close.focus ? assets.close_button_hover_light : assets.close_button_default_light, [helpX + 15, toolY + 2.5, 15, 15]));
  const categories = content.recipeBook.categories ?? defaultCategories;
  const selectedTabs: GuiLayerCommand[] = [];
  if (geometry.book) categories.forEach((category, index) => {
    const state = visual.categories.get(category.id) ?? idle(), selected = category.id === content.recipeBook.categoryId;
    const edge = index === 0 ? 'LeftMost' : index === categories.length - 1 ? 'RightMost' : '';
    const key = `TabTop${selected ? 'Front' : 'Back'}${edge}${state.hover ? 'Hover' : ''}` as keyof typeof assets;
    const x = index === categories.length - 1 && index > 0 ? Math.max(index * 25, 121) : index * 25;
    const target = selected ? selectedTabs : commands;
    target.push(image(assets[key], [x, -23, 25, 27]));
    const iconName = ({ construction: 'icon_recipe_construction', equipment: 'icon_recipe_equipment', items: 'icon_recipe_item', nature: 'icon_recipe_nature', search: 'magnifyingGlass' } as const)[category.id as 'construction'];
    if (!category.icon && iconName) { target.push(image(assets[iconName], [x + 4, -18, 17, 17], category.disabled || content.recipeBook.disabled ? .5 : 1)); categoryIconIds.push(category.id); }
  });
  if (geometry.fold) commands.push(image(assets.recipe_back_panel, geometry.fold));
  if (geometry.book) commands.push(image(assets.dialog_background_opaque, geometry.book));
  commands.push(...selectedTabs);
  const rightX = geometry.rightOrigin[0];
  commands.push(image(assets.dialog_background_opaque, [rightX, 0, 176, 166]));
  commands.push(image(assets.arrow_large, [rightX + 90, 35.5, 22, 15]));
  const rightItems = craftingRightItems(content);
  geometry.rightSlots.forEach((rect, index) => {
    const state = visual.right[index] ?? idle(), value = rightItems[index];
    commands.push(image(state.selected ? assets.recipe_book_touch_cell_selected : assets.cell_image, rect));
    let sourceArt = false;
    if (count(value?.count) !== 0) {
      const kind = item(value, geometry.rightItemRects[index]!, state, false);
      sourceArt = !!kind;
      if (kind === 'image') imageSlots.push(index); else if (kind === 'model') modelSlots.push(index);
      const amount = count(value?.count);
      if (sourceArt && amount !== undefined && amount > 1 && emitText(String(amount), profile.text?.inventoryCount, [rect[0] + 1, rect[1] + rect[3] - 9, rect[2] - 2, 8], 'end', undefined, [255, 255, 255, 255])) inventoryCountSlots.push(index);
    }
    const overlayOwned = sourceArt || !value || count(value.count) === 0;
    if (overlayOwned) {
      overlaySlots.push(index);
      if (!state.disabled && state.hover) commands.push(image(assets.highlight_slot, [rect[0] + 1, rect[1] + 1, rect[2] - 2, rect[3] - 2], .8));
      if (!state.disabled && (state.hover || state.focus)) commands.push(image(assets.focus_border_white, rect));
    }
  });
  if (!content.crafting?.renderText) {
    if (emitText(content.title, profile.text?.crafting, [rightX + 14, 5, 84, 10], 'center')) textRoles.add('crafting');
    if (emitText(content.crafting?.inventoryLabel ?? 'Inventory', profile.text?.inventory, [rightX + 8, 72, 162, 10], 'start')) textRoles.add('inventory');
  }
  if (geometry.bookViewport) {
    const book = content.recipeBook, search = book.categoryId === 'search', viewport = geometry.bookViewport;
    const clip = craftingSourceScissor(profile.frame, origin, viewport);
    commands.push(image(assets.recipe_book_pane_bg, [6, viewport[1], 134, viewport[3]]));
    if (emitText(book.title, profile.text?.recipeTitle, [9, 8, search || book.creative ? 129 : 100, 10], 'end')) textRoles.add('recipeTitle');
    if (!book.creative) {
      const state = visual.filter, name = `craft_toggle_${book.craftableOnly ? 'on' : 'off'}${state.hover ? '_hover' : ''}` as keyof typeof assets;
      commands.push(image(assets[name], [113, search ? 19.5 : 4.5, 27, 15], book.disabled ? .5 : 1));
    }
    if (search) {
      commands.push(image(visual.search.hover || visual.search.focus ? assets.edit_box_indent_hover : assets.edit_box_indent, [6, 19, book.creative ? 134 : 104, 16], book.disabled ? .5 : 1));
      commands.push(image(assets.magnifying_glass, [10, 23, 8, 8], book.disabled ? .5 : 1));
      const role = book.query ? 'query' : 'placeholder', style = profile.text?.[role];
      if (style && !visual.search.focus && !visual.search.composing) {
        if (style.clipQuantization !== 'floor-min-ceil-max' && style.clipQuantization !== 'logical-stage-floor') throw new RangeError('An explicit source query clip quantization is required.');
        const value = book.query || book.searchPlaceholder || '', clipWidth = book.creative ? 128 : 98;
        const measured = layoutGuiText({ ...profile.frame, ...sourceText(value, style, [0, 0], [255, 255, 255, 255]) });
        const labelWidth = Math.max(clipWidth, measured.logicalWidth);
        // common.text_edit_control: right-middle min100% label, fixed10g
        // height and source label offset[10,0], independent of font metrics.
        const box: GuiImageRect = [9 + clipWidth - labelWidth + 10, 22, labelWidth, 10];
        const scissor = style.scissor ?? craftingSourceScissor(profile.frame, origin, [9, 21, book.creative ? 128 : 98, 12], style.clipQuantization);
        if (emitText(value, style, box, 'start', scissor, role === 'query' ? [255, 255, 255, 255] : [221, 221, 221, 255])) textRoles.add(role);
      }
      if (book.query) commands.push(image(visual.clear.hover ? assets.close_X_button_hover : assets.close_X_button, [book.creative ? 124 : 94, 19.5, 15, 15], book.disabled ? .5 : 1));
    }
    const selectedOverlays: GuiLayerCommand[] = [];
    for (const cell of geometry.recipeCells) {
      const entry = book.entries[cell.index]!, state = visual.recipes.get(cell.id) ?? idle();
      const ownership = recipeArtOwnership(entry, profile);
      // The shared canvas is behind semantic DOM. A host-owned art node must
      // keep its count/modifier/selection overlays above it, so retain this
      // entire entry's DOM paint rather than hiding only individual pieces.
      if (ownership === 'dom') continue;
      const blocked = !!(book.disabled || entry.disabled || entry.item?.disabled), paintState = { ...state, disabled: blocked };
      const slice = entry.backgroundSlice === undefined ? 1 : Number.isFinite(entry.backgroundSlice) ? Math.max(0, entry.backgroundSlice) : 0;
      // Unknown host nine-slice dimensions cannot be guessed from a5px stock
      // cell. Keep this entire entry's visual DOM and do not request its art.
      if (entry.backgroundImage && slice > 0 && !entry.backgroundSize) continue;
      if (entry.backgroundSize && (entry.backgroundSize.length !== 2 || [...entry.backgroundSize].some(value => !Number.isFinite(value) || value <= 0))) throw new RangeError('Source recipe backgroundSize requires two positive logical dimensions.');
      const background = entry.backgroundImage ? { url: entry.backgroundImage, ...(slice > 0 ? { nineSlice: { insets: slice, baseSize: entry.backgroundSize! } } : {}) } : assets.recipe_book_item_bg;
      commands.push(image(background, cell.cell, 1, clip));
      recipePaintIds.push(entry.id);
      if (ownership === 'model' || ownership === 'sprite') {
        if (item(entry.item, cell.item, paintState, false, clip)) recipeArtIds.push(entry.id);
      }
      if (entry.modifier && entry.modifier !== 'none') commands.push(image(entry.modifier === 'expand' ? assets.recipe_book_expand_icon : assets.recipe_book_collapse_icon, cell.modifier, 1, clip));
      const amount = count(entry.craftableCount);
      if (amount !== undefined && amount > 1 && emitText(String(amount), profile.text?.recipeCount, [cell.cell[0] + 1, cell.cell[1] + 9, 16, 8], 'end', clip, [255, 255, 255, 255])) recipeCountIds.push(entry.id);
      if (!blocked && state.hover) commands.push(image(assets.highlight_slot, cell.item, .8, clip));
      if (!blocked && (state.hover || state.focus)) commands.push(image(assets.focus_border_white, cell.cell, 1, clip));
      if (entry.id === book.selectedId) selectedOverlays.push(image(assets.pocket_ui_highlight_selected_slot, cell.selected, 1, clip));
    }
    commands.push(...selectedOverlays);
    // Source clipping remains on every recipe primitive. The native viewport is still the scroll owner.
    commands.push({ ...image(solidWhite, [6, viewport[1], viewport[2], 2], .5, clip), tint: [0, 0, 0, 1] });
    commands.push({ ...image(solidWhite, [6, viewport[1] - 1, viewport[2], 1]), tint: [.75, .75, .75, 1] });
    if (scroll.hasScrollbar) {
      const track: GuiImageRect = [136, viewport[1], 4, viewport[3]];
      const rows = Math.ceil(book.entries.length / 7), total = rows * 18, max = Math.max(0, total - viewport[3]);
      const extent = Math.min(viewport[3], Math.max(5, viewport[3] * viewport[3] / Math.max(viewport[3], total)));
      const top = viewport[1] + (max ? Math.min(max, scroll.topGame) / max * (viewport[3] - extent) : 0);
      commands.push(image(assets.ScrollGutterWithBG, track));
      commands.push(image(assets.ScrollBox, [136, top, 4, extent]));
    }
  }
  const window = layoutWorkstationWindow(profile, origin, commands, [652, 332]);
  return { commands, geometry, origin, outputRect: window.outputRect, window, imageSlots, modelSlots, overlaySlots, recipeArtIds, recipePaintIds, categoryIconIds,
    inventoryCountSlots, recipeCountIds, textRoles };
}
