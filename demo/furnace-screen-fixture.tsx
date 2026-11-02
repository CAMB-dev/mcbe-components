import {StrictMode, useCallback, useEffect, useState} from 'react';
import type {CSSProperties, KeyboardEvent, MouseEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {FurnaceScreen, BlastFurnaceScreen, SmokerScreen, FurnaceScreenFrame} from '../src/furnace-screen';
import type {FurnaceScreenLayout} from '../src/furnace-screen';
import {FurnaceRecipeBook, FurnaceRecipeBookEntry, FurnaceRecipeCategoryTabs, FurnaceRecipeFilterToggle} from '../src/furnace-recipe-book';
import type {FurnaceRecipeBookProps, FurnaceRecipeBookItem} from '../src/furnace-recipe-book';
import {Furnace} from '../src/processing';
import type {RecipeBookItem} from '../src/recipe-book';
import {hasGameFont} from 'virtual:mcbeui-game-font';
import '../src/fonts.css';
import '../src/styles.css';
import '../src/furnace-screen.css';
import '../src/furnace-recipe-book.css';

export interface FurnaceFixtureConfiguration {
  variant: 'furnace' | 'blast' | 'smoker' | 'frame'; layout: FurnaceScreenLayout;
  acceptLayout: boolean; acceptBook: boolean; disabled: boolean; bookDisabled: boolean; readOnlyFilter: boolean;
  showClose: boolean; mounted: boolean; preventKey: boolean; preventClick: boolean;
  categoryId: FurnaceRecipeBookProps['categoryId']; query: string; filteringEnabled: boolean; inventoryTab: boolean;
  categoryBindings: FurnaceRecipeBookProps['categoryBindings']; entryCount: number; filterBackground: 'white' | 'black';
}
interface API {
  configure: (value: Partial<FurnaceFixtureConfiguration>) => void; clear: () => void; ready: boolean;
  frame: HTMLElement | null; book: HTMLDivElement | null; tabs: HTMLDivElement | null; filter: HTMLButtonElement | null; entry: HTMLButtonElement | null;
  events: {kind: string; value?: string | boolean}[]; refs: string[];
}
declare global {interface Window {furnaceFixture: API}}
const api: API = {configure: () => {}, clear: () => {api.events.length = 0;}, ready: false, frame: null, book: null, tabs: null, filter: null, entry: null, events: [], refs: []};
window.furnaceFixture = api;
const image = new URL('./assets/minecraft/iron_ingot.png', import.meta.url).href;
const coal = new URL('./assets/minecraft/coal.png', import.meta.url).href;
const defaults: FurnaceFixtureConfiguration = {
  variant: 'furnace', layout: 'recipe-book', acceptLayout: true, acceptBook: true, disabled: false, bookDisabled: false, readOnlyFilter: false,
  showClose: true, mounted: true, preventKey: false, preventClick: false, categoryId: 'food', query: '', filteringEnabled: false, inventoryTab: false,
  categoryBindings: {food: {visible: true}, items: {leftmostVisible: false, normalVisible: true}, blocks: {leftmostVisible: false, normalVisible: true}}, entryCount: 21, filterBackground: 'white',
};
const labels = {food: 'Food', items: 'Items', blocks: 'Blocks', search: 'Search'};
// Deliberately wider host data verifies that furnace source cells cannot
// accidentally recover crafting counts, group modifiers or durability bars.
const widerEntry: RecipeBookItem = {id: 'wide-host', label: 'Wide host entry', item: {name: 'Iron', image, count: 64, durability: .5}, craftableCount: 64, modifier: 'expand'};
const sourceEntry: FurnaceRecipeBookItem = widerEntry;

function Fixture() {
  const [config, setConfig] = useState(defaults);
  api.configure = next => setConfig(old => ({...old, ...next}));
  const frameRef = useCallback((node: HTMLElement | null) => {api.frame = node; api.refs.push(node ? 'frame:attach' : 'frame:detach');}, []);
  const bookRef = useCallback((node: HTMLDivElement | null) => {api.book = node;}, []);
  const tabsRef = useCallback((node: HTMLDivElement | null) => {api.tabs = node;}, []);
  const filterRef = useCallback((node: HTMLButtonElement | null) => {api.filter = node;}, []);
  const entryRef = useCallback((node: HTMLButtonElement | null) => {api.entry = node;}, []);
  useEffect(() => {
    let active = true;
    Promise.all([document.fonts.load('20px "MCBE Pixel"', 'Furnace'), ...(hasGameFont ? [document.fonts.load('20px "Mojangles Pixel"'), document.fonts.load('20px "Mojangles"')] : [])])
      .then(() => document.fonts.ready).then(() => {if (active) api.ready = true;});
    return () => {active = false;};
  }, []);
  const entries = Array.from({length: config.entryCount}, (_, index) => ({id: `recipe-${index}`, label: `Recipe ${index}`, item: {name: `Iron ${index}`, image}}));
  const book: FurnaceRecipeBookProps = {
    title: 'Furnace recipes', entries, categoryId: config.categoryId, query: config.query, filteringEnabled: config.filteringEnabled, inventoryTab: config.inventoryTab,
    categoryBindings: config.categoryBindings, categoryLabels: labels, disabled: config.bookDisabled,
    searchLabel: 'Search furnace recipes', filterLabel: 'Furnace filter', recipesLabel: 'Furnace recipes', categoriesLabel: 'Furnace categories',
    onCategoryChange: value => {api.events.push({kind: 'category', value}); if (config.acceptBook) setConfig(old => ({...old, categoryId: value}));},
    onQueryChange: value => {api.events.push({kind: 'query', value}); if (config.acceptBook) setConfig(old => ({...old, query: value}));},
    onFilteringEnabledChange: value => {api.events.push({kind: 'filter', value}); if (config.acceptBook) setConfig(old => ({...old, filteringEnabled: value}));},
    onRecipeAction: (id, action) => api.events.push({kind: 'recipe', value: `${id}:${action}`}),
  };
  const common = {
    id: 'furnace-primary', ref: frameRef, title: 'Host furnace', recipeBook: book, layout: config.layout, disabled: config.disabled, showClose: config.showClose,
    recipeBookLayoutLabel: 'Expanded recipes', compactLayoutLabel: 'Compact furnace', helpLabel: 'Furnace help', closeLabel: 'Close furnace',
    onLayoutChange: (value: FurnaceScreenLayout) => {api.events.push({kind: 'layout', value}); if (config.acceptLayout) setConfig(old => ({...old, layout: value}));},
    onHelp: () => api.events.push({kind: 'help'}), onClose: () => api.events.push({kind: 'close'}),
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => {if (config.preventKey) event.preventDefault();},
    onClickCapture: (event: MouseEvent<HTMLElement>) => {if (config.preventClick) event.preventDefault();},
  };
  const processing = {fuel: {name: 'Coal', image: coal, count: 16}, result: {name: 'Iron', image}, progress: .5, fuelRemaining: .75};
  const Screen = config.variant === 'blast' ? BlastFurnaceScreen : config.variant === 'smoker' ? SmokerScreen : FurnaceScreen;
  return <main style={{'--mc-font': hasGameFont ? '"Mojangles Pixel","Mojangles",monospace' : '"MCBE Pixel",monospace', '--mc-font-size': '20px'} as CSSProperties}>
    <button id="furnace-before">Before furnace</button>
    {config.mounted && <>
      <div className="furnace-fixture-stage">
        {config.variant === 'frame' ? <FurnaceScreenFrame {...common} recipeBook={<FurnaceRecipeBook {...book}/>}><Furnace title="Host frame" {...processing}/></FurnaceScreenFrame> : <Screen {...common} processing={processing}/>}
      </div>
      <div className="furnace-fixture-stage"><FurnaceRecipeBook {...book} id="furnace-standalone-book" ref={bookRef}/></div>
      <FurnaceRecipeCategoryTabs id="furnace-standalone-tabs" ref={tabsRef} bindings={config.categoryBindings} labels={labels} value={config.categoryId} onValueChange={book.onCategoryChange} label="Standalone furnace categories"/>
      <div id="furnace-filter-material-backdrop" style={{background: config.filterBackground, width: 90, height: 66, padding: 16, boxSizing: 'border-box'}}>
        <FurnaceRecipeFilterToggle id="furnace-standalone-filter" ref={filterRef} filteringEnabled={config.filteringEnabled} onFilteringEnabledChange={book.onFilteringEnabledChange} readOnly={config.readOnlyFilter} disabled={config.bookDisabled} label="Standalone furnace filter"/>
      </div>
      <FurnaceRecipeBookEntry id="furnace-standalone-entry" ref={entryRef} entry={sourceEntry} showTooltip={false} onRecipeAction={book.onRecipeAction}/>
    </>}
    <button id="furnace-after">After furnace</button>
  </main>;
}
createRoot(document.getElementById('furnace-fixture-root')!).render(location.search.includes('strict') ? <StrictMode><Fixture/></StrictMode> : <Fixture/>);
