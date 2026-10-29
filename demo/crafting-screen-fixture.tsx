import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CraftingScreen } from '../src/crafting-screen';
import type { CraftingLayout } from '../src/crafting-screen';
import { RecipeBook, RecipeBookEntry } from '../src/recipe-book';
import type { RecipeBookItem } from '../src/recipe-book';
import { InventoryToolbar } from '../src/inventory-screens';
import { hasGameFont } from 'virtual:mcbeui-game-font';
import '../src/fonts.css';
import '../src/styles.css';
import '../src/recipe-book-textures.css';
import '../src/recipe-book.css';
import '../src/crafting-screen.css';

const diamond = new URL('./assets/minecraft/diamond.png', import.meta.url).href;
// Byte-original Mojang UI images from the matched local/full-release study.
// The host binds these as backgroundImage; no fixture artwork is synthesized.
const backgrounds = {"recipe_book_item_bg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAxSURBVBhXY1y2dOl/BiTw9NkzBhYQ48nTp2ABENiwdgMDE5SNArAKsoDMAGlBAAYGAMQJDyeicQ3jAAAAAElFTkSuQmCC","recipe_book_light_button":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAlSURBVHjaYly2dOl/BgYGhidPnzIwwRgb1m5gYIIxGBgYGAADADspDxkxRWnTAAAAAElFTkSuQmCC","recipe_book_dark_button_pressed":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAIklEQVQI12O0Mrf6z8DAwKCirsLABGPo6OgwMMEYDAwMDABiEAQF2YrNjQAAAABJRU5ErkJggg==","recipe_book_dark_button":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAkSURBVHjaYuzq6vrPwMDAcOXKFQYmGOPOzTsMTDAGAwMDA2AAL3UPOYbzaiUAAAAASUVORK5CYII=","recipe_book_touch_cell_selected":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgSURBVAhbY3j/8f9/GD518f9/BhgDhHPKt2MRgDFgGACZpzXq3IC09QAAAABJRU5ErkJggg==","recipe_book_red_button":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAArSURBVHjaYnxQVPSfgYGB4dv16wwsDAwMDN+uXmXouniJgQnGYGBgYAAMADVODwlLefx4AAAAAElFTkSuQmCC"} as const;
const sourceBackgrounds = Object.keys(backgrounds) as (keyof typeof backgrounds)[];
const entries: readonly RecipeBookItem[] = Object.freeze(Array.from({ length: 70 }, (_, index) => Object.freeze({
  id: `recipe-${index}`, label: `Recipe ${index}`,
  item: Object.freeze({ name: `Recipe ${index}`, image: diamond, count: 64, durability: .4, lore: Object.freeze(['Original diamond texture', 'Host-owned recipe record']) }),
  craftableCount: index === 0 || index === 2 ? 0 : index === 3 ? 7 : 1,
  backgroundImage: backgrounds[index === 2 ? 'recipe_book_red_button' : sourceBackgrounds[index % sourceBackgrounds.length]!],
  backgroundSlice: 1, modifier: index === 0 ? 'collapse' as const : index === 3 ? 'expand' as const : 'none' as const,
  disabled: index === 1 || index === 8,
})));

function Case({ name, children }: { name: string; children: ReactNode }) {
  return <section data-case={name} style={{ minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 8 }}>
    <h2 style={{ margin: 0, fontSize: 20 }}>{name}</h2>{children}
  </section>;
}

export function CraftingScreenFixture() {
  const [events, setEvents] = useState<string[]>([]), [category, setCategory] = useState('construction');
  const [query, setQuery] = useState(''), [filter, setFilter] = useState(false), [collection, setCollection] = useState(entries);
  const [controlledLayout, setControlledLayout] = useState<CraftingLayout>('recipe-book'), [showClose, setShowClose] = useState(true);
  const record = (event: string) => setEvents(previous => [...previous, event]);
  const book = {
    title: 'Recipes', entries: collection, categoryId: category, query, craftableOnly: filter, selectedId: 'recipe-0',
    onCategoryChange: (value: string) => { setCategory(value); record(`category:${value}`); },
    onQueryChange: (value: string) => { setQuery(value); record(`query:${value}`); },
    onCraftableOnlyChange: (value: boolean) => { setFilter(value); record(`filter:${value}`); },
    onRecipeAction: (id: string, action: string) => record(`recipe:${id}:${action}`),
  };
  return <main data-font={hasGameFont ? 'local-mojangles' : 'public-fallback'} style={{ padding: 16, boxSizing: 'border-box', maxWidth: 940, minWidth: 0,
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 28, color: '#fff', '--mc-font-size': '20px', '--mc-font-size-lg': '40px', '--mc-font-size-xl': '60px' } as CSSProperties}>
    <h1 style={{ margin: 0 }}>Crafting source specimens</h1>
    <p style={{ margin: 0 }}>Classic GUI2 source geometry. Recipe lookup and collection updates belong to the host.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button onClick={() => setEvents([])}>Clear crafting events</button>
      <button onClick={() => setCollection(entries.slice(0, 2))}>Host replaces recipe collection</button>
      <button onClick={() => setControlledLayout('survival')}>Host applies compact layout</button>
      <button onClick={() => setControlledLayout('recipe-book')}>Host applies wide layout</button>
      <button onClick={() => setShowClose(false)}>Hide close action</button>
      <button onClick={() => setShowClose(true)}>Show close action</button>
    </div>
    <output aria-label="Crafting fixture events">{events.join('|')}</output>
    <output aria-label="Host recipe collection">{collection.map(entry => entry.id).join(',')}</output>
    <output aria-label="Frozen host record">{`${Object.isFrozen(entries)}:${entries[0]!.item!.count}:${entries[0]!.craftableCount}:${entries[0]!.modifier}`}</output>
    <Case name="crafting-wide"><CraftingScreen title="Wide crafting bench" recipeBook={book}
      onLayoutChange={value => record(`wide-layout:${value}`)} onHelp={() => record('wide-help')} onClose={() => record('wide-close')}/></Case>
    <Case name="crafting-compact"><CraftingScreen title="Compact crafting bench" defaultLayout="survival"
      recipeBook={{ ...book, entries: entries.slice(0, 14) }} onLayoutChange={value => record(`compact-layout:${value}`)} onClose={() => record('compact-close')}/></Case>
    <Case name="crafting-controlled"><CraftingScreen title="Controlled crafting bench" recipeBook={{ ...book, entries: entries.slice(0, 14) }}
      layout={controlledLayout} onLayoutChange={value => record(`controlled-layout:${value}`)} showClose={showClose} onClose={() => record('controlled-close')}/></Case>
    <Case name="recipe-no-scroll"><div style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '52px 6px 6px' }}>
      <RecipeBook title="Equipment recipes" entries={entries.slice(0, 14)} categoryId="equipment" query="" craftableOnly={false}
        onQueryChange={value => record(`readonly-query:${value}`)} onCategoryChange={value => record(`readonly-category:${value}`)}
        onCraftableOnlyChange={value => record(`readonly-filter:${value}`)} onRecipeAction={(id, action) => record(`readonly-recipe:${id}:${action}`)}/>
    </div></Case>
    <Case name="recipe-boundary-disabled"><div style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '52px 6px 6px' }}>
      <RecipeBook title="Boundary recipes" entries={entries.slice(0, 14).map((entry, index) => ({ ...entry, disabled: entry.disabled || [0, 6, 7, 13].includes(index) }))}
        categoryId="construction" query="" craftableOnly={false} onRecipeAction={(id, action) => record(`boundary:${id}:${action}`)}/>
    </div></Case>
    <Case name="recipe-creative-search"><div style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '52px 6px 6px' }}>
      <RecipeBook title="Creative recipes" entries={entries.slice(0, 14)} categoryId="search" query="" craftableOnly={false} creative style={{ width: 652 }}/>
    </div></Case>
    <Case name="two-mode-toolbar"><div style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: 8 }}>
      <InventoryToolbar layouts={['recipe-book', 'survival']} defaultValue="recipe-book" showClose={showClose}
        onValueChange={value => record(`toolbar-layout:${value}`)} onHelp={() => record('toolbar-help')} onClose={() => record('toolbar-close')}/>
    </div></Case>
    <Case name="recipe-original-entry-skins"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <div data-entry-sample="default" style={{ position: 'relative', width: 52, height: 52, background: '#28292a' }}>
        <RecipeBookEntry entry={{ id: 'default', label: 'Default recipe' }} showTooltip={false} style={{ position: 'absolute', left: 8, top: 8 }}/>
      </div>
      {sourceBackgrounds.map(name => <div key={name} data-entry-sample={name} style={{ position: 'relative', width: 52, height: 52, background: '#28292a' }}>
        <RecipeBookEntry entry={{ id: name, label: name, backgroundImage: backgrounds[name], backgroundSlice: 1 }} showTooltip={false} style={{ position: 'absolute', left: 8, top: 8 }}/>
      </div>)}
      {(['collapse', 'expand'] as const).map(modifier => <div key={modifier} data-entry-sample={`zero-${modifier}`} style={{ position: 'relative', width: 52, height: 52, background: '#28292a' }}>
        <RecipeBookEntry entry={{ id: `zero-${modifier}`, label: `Zero craftable ${modifier}`, item: { name: 'Diamond', image: diamond, count: 64, durability: .5 },
          craftableCount: 0, modifier, backgroundImage: backgrounds.recipe_book_red_button, backgroundSlice: 1 }}
          showTooltip={false} onRecipeAction={(id, action) => record(`unit:${id}:${action}`)} style={{ position: 'absolute', left: 8, top: 8 }}/>
      </div>)}
      <div data-entry-sample="item-disabled" style={{ position: 'relative', width: 52, height: 52, background: '#28292a' }}>
        <RecipeBookEntry entry={{ id: 'item-disabled', label: 'Disabled ingredient recipe', item: { name: 'Diamond', image: diamond, disabled: true } }}
          showTooltip={false} onRecipeAction={(id, action) => record(`unit:${id}:${action}`)} style={{ position: 'absolute', left: 8, top: 8 }}/>
      </div>
      <div data-entry-sample="selected" style={{ position: 'relative', width: 52, height: 52, background: '#28292a' }}>
        <RecipeBookEntry selected entry={{ id: 'selected', label: 'Selected recipe', item: { name: 'Diamond', image: diamond }, craftableCount: 0 }}
          showTooltip={false} style={{ position: 'absolute', left: 8, top: 8 }}/>
      </div>
    </div></Case>
  </main>;
}

const root = document.getElementById('crafting-fixture-root');
if (root) createRoot(root).render(<CraftingScreenFixture/>);
