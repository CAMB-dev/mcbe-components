import { StrictMode, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { CraftingScreen, createGuiCuboidModel } from '../src';
import type { CraftingLayout, CraftingScreenImageRenderProfile, InventoryItem, RecipeBookItem } from '../src';
import '../src/fonts.css';
import '../src/styles.css';
import '../src/recipe-book.css';
import '../src/crafting-screen.css';

export interface CraftingImageState {
  layout: CraftingLayout; category: string; query: string; filter: boolean; selected: string; count: number;
  source: boolean; profile?: CraftingScreenImageRenderProfile; accept: boolean; disabled: boolean; showClose: boolean;
  custom: boolean; hostStyle: CSSProperties; unknownBackground: boolean; model: boolean; modelUrl: string; instance: string;
}
export type CraftingImageOptions = Partial<CraftingImageState> & { strict?: boolean };
export interface CraftingImageEvent { event: string; value: unknown; instance?: string }
interface CraftingImageInstance { patch: (value: Partial<CraftingImageState>) => void; root: HTMLElement | null; state: CraftingImageState }
export interface CraftingImageFixture {
  events: CraftingImageEvent[]; patch: (value: Partial<CraftingImageState>) => void; state: CraftingImageState | null;
  root: HTMLElement | null; instances: Record<string, CraftingImageInstance>;
  save: (selector: string, key: string) => string; same: (selector: string, key: string) => boolean;
  unmount: () => void; mount: (options?: CraftingImageOptions) => void;
  mountPair: (first: CraftingImageOptions, second: CraftingImageOptions) => void;
}
declare global {
  interface Window {
    craftingImageQA: CraftingImageFixture;
    craftingImageModuleReady: boolean;
  }
}

// Existing demo-only original item/background assets, under their upstream notices.
const diamond = new URL('./assets/minecraft/diamond.png', import.meta.url).href;
const red = new URL('./assets/minecraft/recipe-red-button.png', import.meta.url).href;
const never = '/crafting-qa-never-fetch.png';
const root = createRoot(document.getElementById('crafting-image-root')!);
const events: CraftingImageEvent[] = [], savedNodes = new Map<string, Element>();

function App({ initial }: { initial: CraftingImageOptions }) {
  const [state, setState] = useState<CraftingImageState>({ layout: 'recipe-book', category: 'construction', query: '', filter: false,
    selected: 'recipe-0', count: 70, source: false, accept: true, disabled: false, showClose: true, custom: true,
    hostStyle: {}, unknownBackground: false, model: false, modelUrl: '/crafting-qa-model.png', instance: 'single', ...initial });
  const frame = useRef<HTMLElement>(null);
  const record = (event: string, value: unknown) => events.push({ event, value, ...(state.instance === 'single' ? {} : { instance: state.instance }) });
  const change = <K extends keyof CraftingImageState>(field: K, value: CraftingImageState[K]) => {
    record(field, value); if (state.accept) setState(previous => ({ ...previous, [field]: value }));
  };
  useLayoutEffect(() => {
    const patch = (value: Partial<CraftingImageState>) => setState(previous => ({ ...previous, ...value }));
    window.craftingImageQA.patch = patch; window.craftingImageQA.state = state; window.craftingImageQA.root = frame.current;
    window.craftingImageQA.instances[state.instance] = { patch, root: frame.current, state };
  });
  const model = { model: createGuiCuboidModel([0, 0, 0], [16, 8, 16]),
    projection: { yaw: 40, pitch: 25, scale: .4, offset: [8, 8] as const, originQuantization: 'physical-floor' as const },
    textureSizes: { all: [16, 16] as const }, textures: { all: state.modelUrl } };
  const entries: readonly RecipeBookItem[] = Object.freeze(Array.from({ length: state.count }, (_, index): RecipeBookItem => {
    const item: InventoryItem = index === 7 && state.model
      ? { name: 'Explicit recipe model', guiModel: model, icon: <span data-recipe-model-fallback>Recipe model fallback</span>, count: 64, durability: .4 }
      : { name: `Represented ${index}`, image: index === 4 && state.custom ? never : diamond, count: index === 5 ? 0 : 64, durability: .4,
        ...(index === 4 && state.model ? { guiModel: { ...model, textures: { all: '/crafting-qa-preview-rejected-model.png' } } } : {}) };
    return Object.freeze({ id: `recipe-${index}`, label: `Recipe ${index}`, item: Object.freeze(item),
      craftableCount: index === 0 || index === 2 ? 0 : index === 3 || index === 4 && state.custom ? 7 : 1,
      backgroundImage: index === 2 || index === 6 && state.unknownBackground ? red : undefined,
      ...(index === 2 ? { backgroundSize: [3, 3] as const } : {}),
      modifier: index === 0 ? 'collapse' : index === 3 || index === 4 && state.custom ? 'expand' : 'none', disabled: index === 1 || index === 8,
      ...(index === 4 && state.custom ? { preview: <span data-custom-recipe onClick={() => record('custom-recipe', 4)}>Host recipe</span> } : {}) });
  }));
  const inputs = Array.from({ length: 9 }, (_, index): InventoryItem | null => index === 0 && state.custom
    ? { name: 'Custom input', count: 64, icon: <span data-custom-input>Host input</span> }
    : index === 1 ? { name: 'Source image', image: diamond, count: 2 }
      : index === 4 && state.model ? { name: 'Explicit model', guiModel: model, icon: <span data-right-model-fallback>Model fallback</span>, count: 64 }
        : index === 8 ? { name: 'Zero inventory count', image: never, count: 0 } : null);
  return <div data-test-host data-instance={state.instance} style={{ position: 'fixed', left: 48, top: 64, ...state.hostStyle }}>
    <CraftingScreen imageRender={state.source ? state.profile : undefined} ref={frame} title="Crafting QA"
      layout={state.layout} onLayoutChange={value => change('layout', value)} showClose={state.showClose}
      onHelp={() => record('help', true)} onClose={() => record('close', true)}
      recipeBook={{ title: state.category === 'search' ? 'Search recipes' : 'Construction', entries, categoryId: state.category,
        searchPlaceholder: 'Search recipes', query: state.query, craftableOnly: state.filter, selectedId: state.selected, disabled: state.disabled,
        onCategoryChange: value => change('category', value), onQueryChange: value => change('query', value),
        onCraftableOnlyChange: value => change('filter', value), onRecipeAction: (id, action) => {
          record('recipe', { id, action }); if (state.accept) setState(previous => ({ ...previous, selected: id }));
        } }}
      crafting={{ inputs, result: { name: 'Result', image: diamond, count: 3 },
        inventory: Array.from({ length: 27 }, (_, index) => index === 2 ? { name: 'Inventory source', image: diamond, count: 4 } : null),
        hotbar: Array.from({ length: 9 }, (_, index) => index === 0 ? { name: 'Hotbar source', image: diamond, count: 5 } : null), selectedInputIndex: 2,
        onInputAction: (index, action) => record('input', { index, action }), onInventoryAction: (index, action) => record('inventory', { index, action }),
        onTakeResult: action => record('result', action) }}/>
  </div>;
}

window.craftingImageQA = { events, patch: () => { throw new Error('Fixture not mounted'); }, state: null, root: null, instances: {},
  save(selector, key) { const node = document.querySelector(selector); if (!node) throw new Error(`Missing actual control ${selector}`); savedNodes.set(key, node); return node.tagName; },
  same: (selector, key) => savedNodes.get(key) === document.querySelector(selector), unmount: () => root.render(null),
  mountPair(first, second) { events.length = 0; savedNodes.clear(); root.render(<><App key="first" initial={{ ...first, instance: 'first' }}/><App key="second" initial={{ ...second, instance: 'second' }}/></>); },
  mount(options = {}) { events.length = 0; savedNodes.clear(); const child = <App initial={options}/>; root.render(options.strict ? <StrictMode>{child}</StrictMode> : child); },
};
window.craftingImageModuleReady = true;
