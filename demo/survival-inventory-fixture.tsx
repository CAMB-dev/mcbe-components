import { createRoot } from 'react-dom/client';
import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { SurvivalInventoryScreen } from '../src/survival-inventory-screen';
import { InventoryScreenFrame } from '../src/inventory-screen-frame';
import type { InventoryScreenLayout } from '../src/inventory-screen-frame';
import { PlayerInventoryScreen } from '../src/inventory-screens';
import { CraftingScreen } from '../src/crafting-screen';
import type { RecipeBookItem } from '../src/recipe-book';
import { hasGameFont } from 'virtual:mcbeui-game-font';
import '../src/fonts.css';
import '../src/styles.css';
import '../src/inventory-screen-frame.css';
import '../src/recipe-book.css';
import '../src/crafting-screen.css';

const diamond = new URL('./assets/minecraft/diamond.png', import.meta.url).href;
const emerald = new URL('./assets/minecraft/emerald.png', import.meta.url).href;
const avatar = new URL('./assets/minecraft/game-controls-avatar.png', import.meta.url).href;
// Byte-original crafting_table_top from the same Mojang full resource release.
// This is explicitly host-supplied texture art, not an invented item renderer.
const craftingTop = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAADNSURBVDjLY5AU4fnPx80GxiC2ozLf/2JLBawYJCclygtWC6JB6hlAnD0zksAYpGBepNH/dZk2WDFIDqQGph6kF24ASAKXRnQMMwRsAMzZIIlQC5X/3toSYBqGQXxkDBKDGQL2ArKzQZLIbJiNII0wNkwc5h0GUOCgS8I0ETIYpBfDAHRvYGPjNYAUNvUNQA9tZDZRXkAOOFjIg/jYYgFuAK5oRNaEHiMo0QhK08gJCVtiQsewhATSS3lSBplCbmYCuwCUnpGzKKHsjJ79AVED6og5O0TUAAAAAElFTkSuQmCC';
const items = Object.freeze([
  Object.freeze({ name: 'Diamond', image: diamond, count: 2, lore: Object.freeze(['Original diamond texture']) }),
  Object.freeze({ name: 'Emerald', image: emerald, count: 6 }),
]);
const recipes: readonly RecipeBookItem[] = Object.freeze(Array.from({ length: 14 }, (_, index) => Object.freeze({
  id: `survival-recipe-${index}`, label: `Survival recipe ${index}`, item: items[index % 2], craftableCount: 1,
})));
function Case({ name, children }: { name: string; children: ReactNode }) {
  return <section data-case={name} style={{ minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 8 }}>
    <h2 style={{ margin: 0, fontSize: 20 }}>{name}</h2>{children}
  </section>;
}
function Leaf({ children }: { children: ReactNode }) {
  return <div style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>{children}</div>;
}
export function SurvivalInventoryFixture() {
  const [events, setEvents] = useState<string[]>([]), [category, setCategory] = useState('construction');
  const [query, setQuery] = useState(''), [filter, setFilter] = useState(false), [layout, setLayout] = useState<InventoryScreenLayout>('recipe-book');
  const [showClose, setShowClose] = useState(true), [cancelUp, setCancelUp] = useState(false), [hostDraft, setHostDraft] = useState('Retained host state');
  const [hostClicks, setHostClicks] = useState(0);
  const wideRef = useRef<HTMLElement>(null), frameRef = useRef<HTMLElement>(null);
  const record = (value: string) => setEvents(previous => [...previous, value]);
  const book = {
    title: 'Recipes', entries: recipes, categoryId: category, query, craftableOnly: filter,
    onCategoryChange: (value: string) => { setCategory(value); record(`category:${value}`); },
    onQueryChange: (value: string) => { setQuery(value); record(`query:${value}`); },
    onCraftableOnlyChange: (value: boolean) => { setFilter(value); record(`filter:${value}`); },
    onRecipeAction: (id: string, action: string) => record(`recipe:${id}:${action}`),
  };
  const inventory = {
    crafting: [items[0]!, null, items[1]!, null], result: items[0], inventory: items, hotbar: items,
    playerPreview: <img data-host-player-preview src={avatar} alt="" width={64} height={64}/>, playerPreviewLabel: 'Host player portrait',
    onArmorAction: (kind: string, action: string) => record(`armor:${kind}:${action}`),
    onCraftingAction: (index: number, action: string) => record(`input:${index}:${action}`),
    onTakeResult: (action: string) => record(`result:${action}`),
    onInventoryAction: (index: number, action: string) => record(`inventory:${index}:${action}`),
  };
  return <main data-font={hasGameFont ? 'local-mojangles' : 'public-fallback'} style={{ padding: 16, maxWidth: 940, minWidth: 0, boxSizing: 'border-box',
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 28, color: '#fff', '--mc-font-size': '20px', '--mc-font-size-lg': '40px' } as CSSProperties}>
    <h1 style={{ margin: 0 }}>Survival inventory source specimens</h1>
    <p style={{ margin: 0 }}>Classic fixed326 profile. All recipes, inventory, flags and preview art are supplied by the host.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button onClick={() => setEvents([])}>Clear survival events</button>
      <button onClick={() => setLayout('survival')}>Host applies survival layout</button>
      <button onClick={() => setLayout('recipe-book')}>Host applies recipe layout</button>
      <button onClick={() => setShowClose(false)}>Hide survival close</button>
      <button onClick={() => setShowClose(true)}>Show survival close</button>
      <button onClick={() => setCancelUp(true)}>Prevent result Up focus</button>
      <button onClick={() => record(`refs:${wideRef.current?.tagName}:${frameRef.current?.tagName}`)}>Read survival frame refs</button>
    </div>
    <output aria-label="Survival fixture events">{events.join('|')}</output>
    <output aria-label="Survival immutable data">{`${Object.isFrozen(recipes)}:${items[0]!.count}:${recipes.length}`}</output>
    <Case name="survival-wide"><SurvivalInventoryScreen ref={wideRef} title="Survival wide" recipeBook={book} inventory={inventory}
      showClose={showClose} closeLabel="Close survival wide" helpLabel="Survival help" onLayoutChange={value => record(`wide-layout:${value}`)}
      onHelp={() => record('wide-help')} onClose={() => record('wide-close')}
      onKeyDownCapture={event => { if (cancelUp && event.key === 'ArrowUp' && event.target instanceof HTMLButtonElement && event.target.classList.contains('mc-player-screen__result')) event.preventDefault(); }}/></Case>
    <Case name="survival-compact"><SurvivalInventoryScreen title="Survival compact" defaultLayout="survival" recipeBook={book} inventory={{ onTakeResult: action => record(`empty-result:${action}`) }}
      closeLabel="Close survival compact" onClose={() => record('compact-close')}/></Case>
    <Case name="survival-required-host"><SurvivalInventoryScreen title="Required crafting table" recipeBook={{ ...book, entries: [] }}
      inventory={{ ...inventory, needsCraftingTable: true, craftingTablePreview: <img data-host-crafting-preview src={craftingTop} alt="" width={32} height={32}/> }}
      closeLabel="Close required table inventory"/></Case>
    <Case name="survival-controlled"><SurvivalInventoryScreen title="Controlled survival" recipeBook={book} layout={layout} showClose={showClose}
      onLayoutChange={value => record(`controlled-layout:${value}`)} closeLabel="Close controlled survival" onClose={() => record('controlled-close')}/></Case>
    <Case name="leaf-required-missing"><Leaf><PlayerInventoryScreen title="Required table without renderer" {...inventory} needsCraftingTable/></Leaf></Case>
    <Case name="leaf-default"><Leaf><PlayerInventoryScreen title="Inventory"/></Leaf></Case>
    <Case name="leaf-explicit-false"><Leaf><PlayerInventoryScreen title="Inventory" needsCraftingTable={false} craftingTablePreview={<img data-unused-crafting-preview src={craftingTop} alt=""/>}/></Leaf></Case>
    <Case name="custom-frame"><InventoryScreenFrame ref={frameRef} title="Custom host frame" showClose={showClose} closeLabel="Close custom frame"
      onLayoutChange={value => record(`custom-layout:${value}`)} onClose={() => record('custom-close')}
      book={<section data-host-book aria-label="Host book node" style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 12 }}>
        <h3>Host book node</h3><button onClick={() => record('host-book-action')}>Host book action</button>
      </section>}>
      <section data-host-right aria-label="Host right node" style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 12 }}>
        <h3>Host right node</h3><label>Host retained draft<input value={hostDraft} onChange={event => setHostDraft(event.currentTarget.value)}/></label>
        <button onClick={() => { setHostClicks(value => value + 1); record('host-right-action'); }}>Host right action</button>
        <output aria-label="Host right action count">{hostClicks}</output>
      </section>
    </InventoryScreenFrame></Case>
    <Case name="legacy-crafting-hooks"><CraftingScreen title="Legacy crafting hooks" recipeBook={{ ...book, entries: [] }}/></Case>
  </main>;
}
const root = document.getElementById('survival-fixture-root');
if (root) createRoot(root).render(<SurvivalInventoryFixture/>);
