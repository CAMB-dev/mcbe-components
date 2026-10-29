import { useState } from 'react';
import { Button, Select, SurvivalInventoryScreen, Switch } from '../src';
import type { ArmorSlotKind, InventoryItem, InventoryScreenLayout, InventorySlotAction, PlayerInventoryScreenProps, RecipeBookAction, RecipeBookItem } from '../src';
import { GameItemIcon } from './materials';
import type { GameItemName } from './materials';

type Armor = NonNullable<PlayerInventoryScreenProps['armor']>;
const armorSet: Armor = [
  { name: 'Diamond helmet', image: new URL('./assets/minecraft/survival-diamond-helmet.png', import.meta.url).href },
  { name: 'Diamond chestplate', image: new URL('./assets/minecraft/survival-diamond-chestplate.png', import.meta.url).href },
  { name: 'Diamond leggings', image: new URL('./assets/minecraft/survival-diamond-leggings.png', import.meta.url).href },
  { name: 'Diamond boots', image: new URL('./assets/minecraft/survival-diamond-boots.png', import.meta.url).href },
];
const emptyArmor: Armor = [null, null, null, null];
function material(name: string, key: GameItemName, count = 1): InventoryItem {
  return { name, count, icon: <GameItemIcon name={key}/> };
}
const ingot = material('Iron ingot', 'ironIngot'), nuggets = material('Iron nuggets', 'ironNugget', 9);
const map = material('Filled map', 'filledMap');
const inventoryItems = [material('Iron ingots', 'ironIngot', 4), material('Paper', 'paper', 12), material('Diamond', 'diamond', 8)];
const categoryOptions = [
  { value: 'construction', label: 'Construction' }, { value: 'equipment', label: 'Equipment' },
  { value: 'items', label: 'Items' }, { value: 'nature', label: 'Nature' }, { value: 'search', label: 'Search all samples' },
];
const background = (name: string) => new URL(`./assets/minecraft/recipe-${name}.png`, import.meta.url).href;
interface Sample extends RecipeBookItem { category: string; available: boolean; needsTable?: boolean }
const grouped: readonly Sample[] = [
  { id: 'iron-nuggets', category: 'items', available: true, item: nuggets, craftableCount: 4 },
  { id: 'iron-ingot', category: 'items', available: false, needsTable: true, item: ingot, craftableCount: 0 },
];
const other: readonly Sample[] = [
  { id: 'diamond-sword', category: 'equipment', available: false, needsTable: true, item: material('Diamond sword', 'sword'), craftableCount: 0 },
  { id: 'paper', category: 'items', available: false, item: material('Paper display sample', 'paper'), craftableCount: 0 },
];

/** Host-owned demo state; no game recipe database, player model or automatic crafting. */
export function SurvivalInventoryExamples({ notify }: { notify?: (message: string) => void }) {
  const [open, setOpen] = useState(true), [help, setHelp] = useState(false);
  const [layout, setLayout] = useState<InventoryScreenLayout>('recipe-book');
  const [categoryId, setCategoryId] = useState('items'), [query, setQuery] = useState('');
  const [craftableOnly, setCraftableOnly] = useState(false), [expanded, setExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState('iron-nuggets'), [needsTable, setNeedsTable] = useState(false);
  const [armor, setArmor] = useState<Armor>(armorSet), [offhand, setOffhand] = useState<InventoryItem | null>(map);
  const [crafting, setCrafting] = useState<readonly (InventoryItem | null)[]>([ingot, null, null, null]);
  const [showResult, setShowResult] = useState(true);
  const [receipt, setReceipt] = useState('Iron-nugget preview loaded. No crafting has occurred.');
  const report = (message: string) => { setReceipt(message); notify?.(message); };
  const matches = (entry: Sample) => (categoryId === 'search' || entry.category === categoryId)
    && (!craftableOnly || entry.available)
    && (categoryId !== 'search' || (entry.item?.name ?? entry.id).toLowerCase().includes(query.trim().toLowerCase()));
  const visibleGroup = grouped.filter(matches), entries: RecipeBookItem[] = [];
  if (visibleGroup.length) {
    entries.push({ id: 'iron-group', label: `Iron examples: ${expanded ? 'collapse' : 'expand'} group`, item: ingot,
      craftableCount: 4, modifier: expanded ? 'collapse' : 'expand', backgroundImage: background(expanded ? 'dark-button-pressed' : 'light-button') });
    if (expanded) entries.push(...visibleGroup.map(entry => ({ ...entry, backgroundImage: background(entry.available ? 'dark-button' : 'red-button') })));
  }
  entries.push(...other.filter(matches).map(entry => ({ ...entry, backgroundImage: background('red-button') })));
  const selectRecipe = (id: string, action: RecipeBookAction) => {
    if (id === 'iron-group') {
      if (action === 'primary') { setExpanded(!expanded); report(`Demo host ${expanded ? 'collapsed' : 'expanded'} the iron group.`); }
      else report(`${action}: iron-group intent received.`);
      return;
    }
    const entry = [...grouped, ...other].find(value => value.id === id); if (!entry) return;
    if (action === 'primary') {
      setSelectedId(id); setNeedsTable(entry.needsTable ?? false);
      setCrafting(id === 'iron-nuggets' ? [ingot, null, null, null] : []); setShowResult(id === 'iron-nuggets');
    }
    report(`${action}: ${entry.item?.name ?? id}${entry.available ? ' sample intent received' : ' is unavailable but selectable'}. No recipe is executed.`);
  };
  const armorAction = (kind: ArmorSlotKind, action: InventorySlotAction) => {
    if (action === 'primary') {
      if (kind === 'offhand') setOffhand(previous => previous ? null : map);
      else {
        const index = { helmet: 0, chestplate: 1, leggings: 2, boots: 3 }[kind];
        setArmor(previous => {
          const next: [InventoryItem | null, InventoryItem | null, InventoryItem | null, InventoryItem | null] = [...previous];
          next[index] = previous[index] ? null : armorSet[index]!; return next;
        });
      }
    }
    report(`${action}: ${kind} ${action === 'primary' ? 'toggled in demo host state' : 'intent received'}.`);
  };
  const restore = () => {
    setOpen(true); setHelp(false); setLayout('recipe-book'); setCategoryId('items'); setQuery(''); setCraftableOnly(false);
    setExpanded(true); setSelectedId('iron-nuggets'); setNeedsTable(false); setArmor(armorSet); setOffhand(map);
    setCrafting([ingot, null, null, null]); setShowResult(true); report('Survival inventory sample restored.');
  };

  return <section data-survival-inventory-example aria-label="Complete survival inventory example" style={{ minWidth: 0 }}>
    <h3>Complete survival inventory</h3>
    <p>Host-controlled sample collection, not the Minecraft recipe database. Choose categories, search, filter or expand the iron group. Click armor or the offhand map to toggle that demo slot.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16, margin: '12px 0', minWidth: 0 }}>
      <Select label="Survival demo category" options={categoryOptions} value={categoryId} onChange={event => setCategoryId(event.target.value)}/>
      <Switch label="Requires crafting table" checked={needsTable} onChange={event => { setNeedsTable(event.target.checked); report(`Demo host set needsCraftingTable=${event.target.checked}.`); }}/>
      <Button size="sm" onClick={() => { setArmor(armor.some(Boolean) ? emptyArmor : armorSet); report('Armor set toggled in demo host state.'); }}>Toggle armor set</Button>
      <Button size="sm" onClick={restore}>Restore survival inventory</Button>
    </div>
    {open ? <SurvivalInventoryScreen layout={layout} onLayoutChange={setLayout}
      recipeBook={{ title: categoryOptions.find(option => option.value === categoryId)?.label ?? 'Recipes', entries,
        categoryId, onCategoryChange: setCategoryId, query, onQueryChange: value => { setQuery(value); if (value.trim()) setExpanded(true); },
        craftableOnly, onCraftableOnlyChange: setCraftableOnly, selectedId, onRecipeAction: selectRecipe,
        emptyLabel: 'No survival demo samples match this category or filter' }}
      inventory={{ armor, offhand, inventory: inventoryItems, hotbar: [material('Diamond sword', 'sword'), map], crafting,
        result: !needsTable && showResult ? nuggets : null, needsCraftingTable: needsTable,
        onArmorAction: armorAction,
        onCraftingAction: (index, action) => {
          if (action === 'primary') { setCrafting(previous => Array.from({ length: 4 }, (_, cell) => cell === index ? previous[cell] ? null : ingot : previous[cell] ?? null)); setShowResult(false); }
          report(`${action}: 2 by 2 slot ${index + 1}; ${action === 'primary' ? 'preview result cleared until the sample is selected again' : 'intent received without changing the preview'}.`);
        },
        onInventoryAction: (index, action) => report(`${action}: survival inventory slot ${index + 1}.`),
        onTakeResult: action => { setShowResult(false); report(`${action}: preview result dismissed; no recipe execution or game inventory mutation.`); } }}
      onHelp={() => { setHelp(value => !value); report('Survival inventory help toggled.'); }}
      onClose={() => { setOpen(false); report('Survival inventory closed. Use Restore survival inventory to reopen.'); }}/>
      : <p>The survival inventory is closed.</p>}
    {help && <p>Layout controls switch the complete recipe-book and compact survival views. Ingredient and result actions update or acknowledge demo state only; selecting the iron-nugget sample restores its explicit 2 by 2 preview.</p>}
    <p style={{ fontSize: 12 }}>Player preview has no supplied renderer and remains empty. The crafting-table-required branch also remains an empty semantic region because no verified renderer was supplied. Armor images are unchanged official item textures; they do not render a player model.</p>
    <p style={{ fontSize: 12 }}>Selected: {selectedId} · recipe craftableCount: {[...grouped, ...other].find(entry => entry.id === selectedId)?.craftableCount ?? 0} · represented nugget item.count: 9. Recipe counts are separate host data.</p>
    <output role="status" data-survival-demo-status style={{ display: 'block', fontSize: 12, overflowWrap: 'anywhere' }}>{receipt}</output>
  </section>;
}
