import { useState } from 'react';
import { Button, Combobox, CraftingScreen, Switch } from '../src';
import type { CraftingLayout, CraftingScreenImageRenderProfile, CraftingScreenTextStyle, InventoryItem, InventorySlotAction, RecipeBookAction, RecipeBookItem } from '../src';
import { nativeGuiCraftingLabels } from 'virtual:mcbeui-game-font';
import { gameItemTextures } from './materials';
import type { GameItemName } from './materials';
import { sampleGuiBlockItems } from './gui-model-items';
import { createObservedHotbar, createObservedRecipeEntries } from './crafting-observed-items';

const categories = [
  { id: 'construction', label: '建筑' }, { id: 'equipment', label: '装备' },
  { id: 'items', label: '物品' }, { id: 'nature', label: '自然' }, { id: 'search', label: '全部配方' },
];
const sprite = (key: GameItemName, name: string, count = 1): InventoryItem => ({ name, image: gameItemTextures[key].src, count });
const redBackground = new URL('./assets/minecraft/recipe-red-button.png', import.meta.url).href;
interface DemoRecipe extends RecipeBookItem { category: string; group?: boolean }
// A small host-owned demonstration collection, not Minecraft's recipe database.
const samples: readonly DemoRecipe[] = [
  { id: 'stone-group', category: 'construction', item: { ...sampleGuiBlockItems[0]!, count: 64 }, label: 'Stone slab group', craftableCount: 8, group: true },
  { id: 'table', category: 'construction', item: sampleGuiBlockItems[2], craftableCount: 0 },
  { id: 'diamond-sword', category: 'equipment', item: sprite('sword', 'Diamond sword'), craftableCount: 1 },
  { id: 'iron-sword', category: 'equipment', item: sprite('ironSword', 'Iron sword'), craftableCount: 3 },
  { id: 'netherite-sword', category: 'equipment', item: sprite('netheriteSword', 'Netherite sword'), craftableCount: 0 },
  { id: 'diamond', category: 'items', item: sprite('diamond', 'Diamond', 64), craftableCount: 7 },
  { id: 'paper', category: 'items', item: sprite('paper', 'Paper', 32), craftableCount: 12 },
  { id: 'map', category: 'items', item: sprite('emptyMap', 'Empty map'), craftableCount: 0 },
  { id: 'bottle', category: 'items', item: sprite('glassBottle', 'Glass bottle', 8), craftableCount: 2 },
  { id: 'iron', category: 'items', item: sprite('ironIngot', 'Iron ingot', 16), craftableCount: 4 },
  { id: 'gold', category: 'items', item: sprite('goldIngot', 'Gold ingot', 16), craftableCount: 0 },
  { id: 'apple', category: 'nature', item: sprite('apple', 'Apple', 5), craftableCount: 5 },
  { id: 'steak', category: 'nature', item: sprite('steak', 'Steak', 8), craftableCount: 3 },
  { id: 'coal', category: 'nature', item: sprite('coal', 'Coal', 16), craftableCount: 0 },
  { id: 'stick', category: 'nature', item: sprite('stick', 'Stick', 32), craftableCount: 16 },
];
const groupChildren: readonly DemoRecipe[] = [
  { id: 'slab-a', category: 'construction', item: sampleGuiBlockItems[0], label: 'Stone slab · sample A', craftableCount: 8 },
  { id: 'slab-b', category: 'construction', item: sampleGuiBlockItems[1], label: 'Stone slab · sample B', craftableCount: 0 },
];
const startingInputs: readonly (InventoryItem | null)[] = [null, sprite('diamond', 'Diamond', 2), null, null, sprite('diamond', 'Diamond', 2), null, null, sprite('stick', 'Stick', 4), null];
const startingInventory: readonly (InventoryItem | null)[] = Array.from({ length: 27 }, (_, index) => index < samples.length ? samples[index]!.item ?? null : null);
const startingHotbar: readonly (InventoryItem | null)[] = [...sampleGuiBlockItems, sprite('sword', 'Diamond sword'), sprite('apple', 'Apple', 5), null, sprite('coal', 'Coal', 16), null, sprite('stick', 'Stick', 32)];
const initialSlots = () => ({ inputs: [...startingInputs], inventory: [...startingInventory], hotbar: [...startingHotbar], result: samples[2]!.item ?? null, held: null as InventoryItem | null });
const observedRecipes = createObservedRecipeEntries();
const observedSlots = () => ({ inputs: Array<InventoryItem | null>(9).fill(null), inventory: Array<InventoryItem | null>(27).fill(null),
  hotbar: createObservedHotbar(), result: null as InventoryItem | null, held: null as InventoryItem | null });

export function CraftingLayerExamples() {
  const [source, setSource] = useState(true), [images, setImages] = useState(true), [models, setModels] = useState(true), [original, setOriginal] = useState(true);
  const [scale, setScale] = useState('2'), [display, setDisplay] = useState('browse');
  const [layout, setLayout] = useState<CraftingLayout>('recipe-book'), [category, setCategory] = useState('construction');
  const [query, setQuery] = useState(''), [craftable, setCraftable] = useState(false), [expanded, setExpanded] = useState(false);
  const [collection, setCollection] = useState('sample'), [selected, setSelected] = useState('');
  const [slots, setSlots] = useState(initialSlots), [selectedInput, setSelectedInput] = useState(-1);
  const [shown, setShown] = useState(true), [receipt, setReceipt] = useState('Select a recipe, or pick up and place an item.');
  const guiScale = Number(scale), displayScale = display === 'native' ? guiScale / 2 : 1;
  const expandedSamples = samples.flatMap(entry => entry.group ? [{ ...entry, modifier: expanded ? 'collapse' as const : 'expand' as const }, ...(expanded ? groupChildren : [])] : [entry]);
  const records: readonly DemoRecipe[] = collection === 'observed36' ? observedRecipes : collection === 'empty' ? [] : collection === 'many'
    ? Array.from({ length: 8 }, (_, batch) => expandedSamples.map(entry => ({ ...entry, id: `${entry.id}-${batch}`, label: `${entry.label ?? entry.item?.name} · sample ${batch + 1}` }))).flat()
    : expandedSamples;
  const entries = records.filter(entry => (category === 'search' || entry.category === category)
    && (!craftable || (entry.craftableCount ?? 0) > 0)
    && (category !== 'search' || !query.trim() || `${entry.label ?? ''} ${entry.item?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())))
    .map(entry => ({ ...entry, ...((entry.craftableCount ?? 0) === 0 ? { backgroundImage: redBackground, backgroundSlice: 1, backgroundSize: [3, 3] as const } : {}) }));
  const labels = nativeGuiCraftingLabels;
  const labelStyle: CraftingScreenTextStyle | undefined = original && labels ? {
    // The captured GUI4 label profile uses POINT; the GUI5 profile uses LINEAR.
    font: labels, fontScale: .5, sampling: guiScale === 4 ? 'point' : 'bilinear', shader: 'bitmap-smooth', metrics: { lineHeight: 8, paintOffset: [0, 0] },
  } : undefined;
  const imageRender: CraftingScreenImageRenderProfile | undefined = source ? {
    frame: scale === '2' ? { width: 1280, height: 720, guiScale } : { width: 2570, height: 1402, guiScale },
    displayScale, imagePhysicalPrecision: 'float32', itemImages: images, itemModels: models,
    text: labelStyle ? { crafting: labelStyle, inventory: labelStyle, recipeTitle: labelStyle } : undefined,
  } : undefined;
  const chooseRecipe = (id: string, action: RecipeBookAction = 'primary') => {
    const entry = entries.find(candidate => candidate.id === id);
    setSelected(id);
    if (collection === 'observed36') {
      setReceipt(entry ? `${action}: inspect ${entry.label ?? entry.item?.name}. No crafting rule is supplied for this collection.` : 'Recipe selection cleared.');
      return;
    }
    if (entry?.group && action === 'primary') setExpanded(value => !value);
    if (entry) setSlots(previous => ({ ...previous, result: (entry.craftableCount ?? 0) > 0 ? { ...entry.item, name: entry.item?.name ?? entry.label ?? id, count: 1 } : null }));
    setReceipt(entry ? `${action}: ${entry.label ?? entry.item?.name}; craftable count ${entry.craftableCount ?? 0}.` : 'Recipe selection cleared.');
  };
  const slotAction = (area: 'inputs' | 'inventory' | 'hotbar', index: number, action: InventorySlotAction) => {
    if (area === 'inputs') setSelectedInput(index);
    if (action === 'primary') setSlots(previous => {
      const next = [...previous[area]], item = next[index] ?? null;
      next[index] = previous.held;
      return { ...previous, [area]: next, held: item };
    });
    setReceipt(`${action}: ${area} slot ${index + 1}${action === 'secondary' ? ' (inspect only)' : ' (swap with held item)'}.`);
  };
  const take = (action: InventorySlotAction) => {
    if (slots.held) { setReceipt('Place the held item in an empty slot before taking the result.'); return; }
    if (!slots.result) { setReceipt('This sample has no available result.'); return; }
    setSlots(previous => ({ ...previous, held: previous.result, result: null }));
    setReceipt(`${action}: sample result picked up. Place it in the inventory or hotbar.`);
  };

  return <section data-crafting-layer-example aria-label="Source Crafting example" style={{ display: 'grid', gap: 16, minWidth: 0, padding: 24 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
      <Combobox label="Crafting GUI scale" value={scale} onValueChange={setScale} options={[
        { value: '2', label: 'GUI 2 · 1280 × 720' }, { value: '4', label: 'GUI 4 · 2570 × 1402' }, { value: '5', label: 'GUI 5 · 2570 × 1402' },
      ]}/>
      <Combobox label="Crafting display size" value={display} onValueChange={setDisplay} options={[
        { value: 'browse', label: 'Library size · display scale 1' }, { value: 'native', label: '1:1 pixels · display scale GUI / 2' },
      ]}/>
      <Combobox label="Crafting layout" value={layout} onValueChange={value => setLayout(value === 'survival' ? 'survival' : 'recipe-book')}
        options={[{ value: 'recipe-book', label: 'Wide · recipe book' }, { value: 'survival', label: 'Compact · right pane' }]}/>
      <Combobox label="Crafting category" value={category} onValueChange={setCategory} options={categories.map(entry => ({ value: entry.id, label: entry.label }))}/>
      <Combobox label="Crafting demo collection" value={collection} onValueChange={value => {
        setCollection(value); setSelected('');
        if (value === 'many' || value === 'observed36') { setCategory('search'); setQuery(''); setCraftable(false); }
        if (value === 'observed36') { setExpanded(false); setSlots(observedSlots()); setSelectedInput(-1); setReceipt('36 original-material examples. Select an entry to inspect it.'); }
        else if (collection === 'observed36') { setSlots(initialSlots()); setSelectedInput(-1); }
      }} options={[{ value: 'sample', label: 'Small example collection' }, { value: 'observed36', label: '36 original-material examples' }, { value: 'many', label: 'Repeated samples · scroll' }, { value: 'empty', label: 'Empty collection' }]}/>
      <Combobox label="Selected crafting recipe" value={entries.some(entry => entry.id === selected) ? selected : ''} onValueChange={id => chooseRecipe(id)}
        options={[{ value: '', label: 'No visible selection' }, ...entries.map(entry => ({ value: entry.id, label: entry.label ?? entry.item?.name ?? entry.id }))]}/>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <Switch label="Use source Crafting images" checked={source} onChange={event => setSource(event.target.checked)}/>
      <Switch label="Use source item sprites" checked={images} onChange={event => setImages(event.target.checked)}/>
      <Switch label="Use source block models" checked={models} onChange={event => setModels(event.target.checked)}/>
      <Switch label="Use local Crafting label font" checked={original && !!labels} disabled={!labels} onChange={event => setOriginal(event.target.checked)}/>
      <Switch label="Craftable samples only" checked={craftable} onChange={event => setCraftable(event.target.checked)}/>
      <Switch label="Expand stone slab group" checked={expanded} onChange={event => setExpanded(event.target.checked)}/>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Button size="sm" onClick={() => { setCategory('search'); setLayout('recipe-book'); }}>Open recipe search</Button>
      <Button size="sm" onClick={() => { setQuery(''); setCraftable(false); }}>Clear search and filter</Button>
      <Button size="sm" onClick={() => { setSlots(collection === 'observed36' ? observedSlots() : initialSlots()); setSelected(''); setSelectedInput(-1); setReceipt('Demo slots reset.'); }}>Reset 46 slots</Button>
    </div>
    {shown ? <CraftingScreen title="合成" layout={layout} onLayoutChange={setLayout} imageRender={imageRender}
      recipeBook={{ title: categories.find(entry => entry.id === category)?.label ?? '全部配方', categories, entries,
        categoryId: category, onCategoryChange: setCategory, query, onQueryChange: setQuery,
        craftableOnly: craftable, onCraftableOnlyChange: setCraftable, selectedId: selected, onRecipeAction: chooseRecipe,
        searchLabel: '搜索', searchPlaceholder: '搜索', emptyLabel: 'No matching demo recipes', recipesLabel: 'Demo recipes', categoriesLabel: 'Recipe categories', filterLabel: 'Craftable samples only' }}
      crafting={{ inputs: slots.inputs, result: slots.result, selectedInputIndex: selectedInput, inventory: slots.inventory, hotbar: slots.hotbar, inventoryLabel: '物品栏',
        onInputAction: (index, action) => slotAction('inputs', index, action),
        onInventoryAction: (index, action) => slotAction(index < 27 ? 'inventory' : 'hotbar', index < 27 ? index : index - 27, action), onTakeResult: take }}
      onHelp={() => setReceipt('Select a category or search; primary click swaps items, secondary click inspects. Group recipes expand on primary click.')}
      onClose={() => { setShown(false); setReceipt('Crafting screen closed. Demo inventory is preserved.'); }}/>
      : <Button onClick={() => setShown(true)}>Reopen Crafting</Button>}
    <output aria-label="Source Crafting actions" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{receipt} Held: {slots.held ? `${slots.held.name} × ${slots.held.count ?? 1}` : 'nothing'}. Visible recipes: {entries.length}.</output>
    <p style={{ margin: 0, fontSize: 12 }}>These are finite host-owned collections. Repeated samples demonstrate scrolling. The 36 original-material examples keep their observed order and have no supplied crafting rules or counts; selecting one only inspects it. The small sample collection offers demonstration results.</p>
    <p style={{ margin: 0, fontSize: 12 }}>Source rendering keeps the real controls and falls back to DOM while loading or on error. Block models retain their BlockPreview fallback. Query, placeholder and counts use DOM text; focused search remains a real input.</p>
    <p style={{ margin: 0, fontSize: 12 }}>The 36-item collection uses ordinary authored models, whole original textures and real previews for the grindstone, stonecutter and banner. Their native appearance and camera rules are still being verified. This interactive collection has not been certified pixel-identical. 1:1 mode may require horizontal scrolling.</p>
    {!labels && <p style={{ margin: 0, fontSize: 12 }}>Optional original label pages are unavailable. Run scripts/use-local-crafting-fonts.py and restart the preview to enable the three label roles.</p>}
  </section>;
}
