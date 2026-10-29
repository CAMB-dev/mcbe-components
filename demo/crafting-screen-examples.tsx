import { useState } from 'react';
import { Button, CraftingScreen, Select } from '../src';
import type { CraftingLayout, InventoryItem, RecipeBookAction, RecipeBookItem } from '../src';
import { GameItemIcon } from './materials';
import type { GameItemName } from './materials';

const backgrounds = {
  light: new URL('./assets/minecraft/recipe-light-button.png', import.meta.url).href,
  pressed: new URL('./assets/minecraft/recipe-dark-button-pressed.png', import.meta.url).href,
  dark: new URL('./assets/minecraft/recipe-dark-button.png', import.meta.url).href,
  red: new URL('./assets/minecraft/recipe-red-button.png', import.meta.url).href,
};
function item(name: string, material: GameItemName, count = 1): InventoryItem {
  return { name, count, icon: <GameItemIcon name={material}/> };
}
const diamond = item('Diamond', 'diamond'), stick = item('Stick', 'stick');
const diamondSword = item('Diamond sword', 'sword');
const inventory = [item('Diamond', 'diamond', 14), item('Stick', 'stick', 64), item('Paper', 'paper', 16)];
const categoryOptions = [
  { value: 'construction', label: 'Construction' }, { value: 'equipment', label: 'Equipment' },
  { value: 'items', label: 'Items' }, { value: 'nature', label: 'Nature' }, { value: 'search', label: 'Search all samples' },
];
interface SampleRecipe extends RecipeBookItem { category: string; available: boolean }
const swordRecipes: readonly SampleRecipe[] = [
  { id: 'diamond-sword', category: 'equipment', available: true, item: diamondSword, craftableCount: 6 },
  { id: 'iron-sword', category: 'equipment', available: false, item: item('Iron sword', 'ironSword'), craftableCount: 0 },
];
const otherRecipes: readonly SampleRecipe[] = [
  { id: 'paper', category: 'items', available: true, item: item('Paper', 'paper'), craftableCount: 12 },
  { id: 'empty-map', category: 'items', available: false, item: item('Empty map', 'emptyMap'), craftableCount: 0 },
  { id: 'glass-bottle', category: 'items', available: true, item: item('Glass bottle', 'glassBottle'), craftableCount: 4 },
  { id: 'nether-wart', category: 'nature', available: false, item: item('Nether wart display sample', 'netherWart'), craftableCount: 0 },
];

/** An intentionally small host-owned collection, not a Minecraft recipe database. */
export function CraftingScreenExamples({ notify }: { notify: (message: string) => void }) {
  const [open, setOpen] = useState(true), [help, setHelp] = useState(false);
  const [layout, setLayout] = useState<CraftingLayout>('recipe-book');
  const [categoryId, setCategoryId] = useState('equipment'), [query, setQuery] = useState('');
  const [craftableOnly, setCraftableOnly] = useState(false), [expanded, setExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState('diamond-sword');
  const [receipt, setReceipt] = useState('Diamond sword sample loaded. No crafting has occurred.');
  const report = (message: string) => { setReceipt(message); notify(message); };
  const matches = (recipe: SampleRecipe) => (categoryId === 'search' || recipe.category === categoryId)
    && (!craftableOnly || recipe.available)
    && (categoryId !== 'search' || (recipe.item?.name ?? recipe.id).toLowerCase().includes(query.trim().toLowerCase()));
  const visibleSwords = swordRecipes.filter(matches);
  const entries: RecipeBookItem[] = [];
  if (visibleSwords.length) {
    entries.push({ id: 'sword-group', label: `Sword examples: ${expanded ? 'collapse' : 'expand'} group`, item: diamondSword,
      craftableCount: 6, backgroundImage: expanded ? backgrounds.pressed : backgrounds.light,
      modifier: expanded ? 'collapse' : 'expand' });
    if (expanded) entries.push(...visibleSwords.map(recipe => ({ ...recipe, backgroundImage: recipe.available ? backgrounds.dark : backgrounds.red })));
  }
  entries.push(...otherRecipes.filter(matches).map(recipe => ({ ...recipe, backgroundImage: recipe.available ? undefined : backgrounds.red })));
  const selected = [...swordRecipes, ...otherRecipes].find(recipe => recipe.id === selectedId);
  const swordPreset = selectedId === 'diamond-sword';
  const selectRecipe = (id: string, action: RecipeBookAction) => {
    if (id === 'sword-group') {
      if (action === 'primary') { setExpanded(!expanded); report(`Demo host ${expanded ? 'collapsed' : 'expanded'} the sword group.`); }
      else report(`${action}: sword group intent received by the demo host.`);
      return;
    }
    const recipe = [...swordRecipes, ...otherRecipes].find(value => value.id === id);
    if (!recipe) return;
    if (action === 'primary') setSelectedId(id);
    report(`${action}: ${recipe.item?.name ?? id}${!recipe.available ? ' is unavailable but remains selectable' : action === 'primary' ? ' selected as sample data' : ' intent received by the demo host'}. No crafting performed.`);
  };
  const reset = () => {
    setOpen(true); setHelp(false); setLayout('recipe-book'); setCategoryId('equipment'); setQuery('');
    setCraftableOnly(false); setExpanded(true); setSelectedId('diamond-sword');
    report('Crafting screen sample restored.');
  };

  return <section aria-label="Complete crafting screen example" style={{ minWidth: 0, padding: '0 16px 16px' }} data-crafting-screen-example>
    <h3>Complete crafting screen</h3>
    <p className="workstation-note" style={{ padding: 0 }}>A small demo-host collection, not the Minecraft recipe database. Categories, search, craftable-only filtering and group expansion change this controlled collection. Red entries remain selectable.</p>
    <div className="processing-controls" style={{ padding: '8px 0', gap: 12 }}>
      <Select label="Demo category" options={categoryOptions} value={categoryId} onChange={event => setCategoryId(event.target.value)}/>
      <Button size="sm" onClick={reset}>Restore crafting screen</Button>
    </div>
    {open ? <CraftingScreen layout={layout} onLayoutChange={setLayout}
      recipeBook={{ title: categoryId === 'search' ? 'Search' : categoryOptions.find(option => option.value === categoryId)?.label ?? 'Recipes',
        entries, categoryId, onCategoryChange: setCategoryId, query,
        onQueryChange: value => { setQuery(value); if (value.trim()) setExpanded(true); },
        craftableOnly, onCraftableOnlyChange: setCraftableOnly, selectedId, onRecipeAction: selectRecipe,
        emptyLabel: 'No demo samples in this category or filter' }}
      crafting={{ inputs: swordPreset ? [null, diamond, null, null, diamond, null, null, stick, null] : [],
        result: swordPreset ? diamondSword : null, inventory,
        onInputAction: (index, action) => report(`${action}: sample ingredient slot ${index + 1}.`),
        onInventoryAction: (index, action) => report(`${action}: sample inventory slot ${index + 1}.`),
        onTakeResult: action => report(`${action}: result intent acknowledged; the demo does not consume ingredients or create items.`) }}
      onHelp={() => { setHelp(value => !value); report('Crafting screen help toggled.'); }}
      onClose={() => { setOpen(false); report('Crafting screen closed. Use Restore crafting screen to reopen it.'); }}/>
      : <p>The crafting screen is closed.</p>}
    {help && <p className="workstation-note" style={{ padding: 0 }}>Choose Search to filter all sample names. Toggle the sword group to show or hide its members. Only the diamond-sword sample fills the illustrative ingredient/result preview; other selections clear that preview. The host reports every action without running a crafting algorithm.</p>}
    <p className="workstation-note" style={{ padding: 0 }}>Selected sample: {selected?.item?.name ?? 'none'} · recipe craftableCount: {selected?.craftableCount ?? 0} · represented item.count: {selected?.item?.count ?? 0}. These are separate host-supplied values.</p>
    <output role="status" data-crafting-demo-status style={{ display: 'block', fontSize: 12, overflowWrap: 'anywhere' }}>{receipt}</output>
  </section>;
}
