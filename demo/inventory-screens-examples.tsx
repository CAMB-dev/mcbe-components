import { useState } from 'react';
import { ArmorSlot, CreativeInventory, InventoryToolbar, PlayerInventoryScreen, RecipeCategoryTabs, RecipeSearch } from '../src/inventory-screens';
import type { InventoryItem } from '../src/inventory';

const image = (name: string) => new URL(`./assets/minecraft/${name}.png`, import.meta.url).href;
const diamond: InventoryItem = { name: 'Diamond', image: image('diamond'), count: 2 };
const emerald: InventoryItem = { name: 'Emerald', image: image('emerald'), count: 6 };
const sword: InventoryItem = { name: 'Diamond sword', image: image('diamond_sword'), durability: .7 };
const paper: InventoryItem = { name: 'Paper', image: image('paper'), count: 12 };
const items = [diamond, emerald, sword, paper];

export function InventoryScreensExamples({ notify }: { notify?: (message: string) => void }) {
  const [query, setQuery] = useState(''), [craftableOnly, setCraftableOnly] = useState(false), [category, setCategory] = useState('construction');
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24, minWidth: 0 }}>
    <p>Classic JSON UI panes and real original textures. Item moves, recipe eligibility and player rendering belong to the caller.</p>
    <div><h3>ArmorSlot</h3><div style={{ display: 'flex', gap: 8 }}>{(['helmet', 'chestplate', 'leggings', 'boots', 'offhand'] as const).map(kind => <ArmorSlot key={kind} kind={kind} onClick={() => notify?.(`${kind} slot intent`)}/>)}</div></div>
    <div><h3>RecipeSearch</h3><RecipeSearch value={query} onValueChange={setQuery} craftableOnly={craftableOnly} onCraftableOnlyChange={setCraftableOnly}/>
      <p>Query: {query || 'All recipes'} · {craftableOnly ? 'Craftable filter enabled' : 'Craftable filter disabled'}</p></div>
    <div><h3>RecipeCategoryTabs</h3><div style={{ maxWidth: '100%', overflowX: 'auto' }}><RecipeCategoryTabs value={category} onValueChange={setCategory}/></div><p>Category intent: {category}</p></div>
    <div><h3>InventoryToolbar</h3><InventoryToolbar onValueChange={layout => notify?.(`Layout intent: ${layout}`)} onHelp={() => notify?.('How to play intent')} onClose={() => notify?.('Close inventory intent')}/></div>
    <div><h3 style={{ overflowWrap: 'anywhere' }}>PlayerInventoryScreen</h3><PlayerInventoryScreen inventory={[diamond, emerald]} hotbar={[sword, paper]} crafting={[paper, null, null, null]}
      onArmorAction={(kind, action) => notify?.(`${kind}: ${action}`)} onCraftingAction={(index, action) => notify?.(`Crafting slot ${index + 1}: ${action}`)}
      onInventoryAction={(index, action) => notify?.(`Inventory slot ${index + 1}: ${action}`)} onClose={() => notify?.('Close inventory intent')}/></div>
    <div><h3>CreativeInventory</h3><CreativeInventory items={items} hotbar={[diamond, sword]} onItemAction={(index, action) => notify?.(`${items[index]?.name}: ${action}`)}
      onLayoutChange={layout => notify?.(`Layout intent: ${layout}`)} onHelp={() => notify?.('How to play intent')}
      onHotbarAction={(index, action) => notify?.(`Hotbar ${index + 1}: ${action}`)} onClose={() => notify?.('Close creative inventory intent')}/></div>
  </div>;
}
