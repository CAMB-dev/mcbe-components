import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

// Whole original identities, not a cropped/repainted pixel oracle.
const originals = [
  ['furnace_toggle_off', 302, '29c31fa7d0725d8ae67c91377e69974fea8689450aa134c3aada47fda3debce3', 27, 15],
  ['furnace_toggle_on', 353, '4daa4f1c6004e8d0b72855706731f20aad9f7b63dec869caf35016a3910c08a6', 27, 15],
  ['furnace_toggle_off_hover', 324, '842ff4833dcd78621766b9b671f7f9527e0b4d5829f858589eacd78ba94f3dd7', 27, 15],
  ['furnace_toggle_on_hover', 361, '2e68079d4a14a4bff4fd20a86c73ba1b3dd2f0bb5af26a416d6da82a480e140a', 27, 15],
  ['category_icon_food', 394, '9b6c63924add3d68934470f095b04ad1027b7870f5abe13e059dadd576776572', 13, 14],
  ['category_icon_items', 303, 'f0cadcd8eea2abd57bf50b8243e78cbe53ba6f0773657331f480dfd42040b183', 16, 12],
  ['category_icon_blocks', 239, 'd149c316fcbd2e1e8075cb17ebda39a20b4b84f16ef6a3fa8cfcfee832e870ba', 16, 17],
];

const typed = `import {createRef} from 'react';
import type {ElementRef} from 'react';
import {FurnaceScreenFrame,FurnaceScreen,BlastFurnaceScreen,SmokerScreen,FurnaceRecipeBook,FurnaceRecipeBookEntry,FurnaceRecipeCategoryTabs,FurnaceRecipeFilterToggle} from 'mcbeui';
import type {FurnaceScreenFrameProps,FurnaceScreenProps,BlastFurnaceScreenProps,SmokerScreenProps,FurnaceScreenLayout,FurnaceRecipeBookProps,FurnaceRecipeBookEntryProps,FurnaceRecipeBookItem,FurnaceRecipeCategoryTabsProps,FurnaceRecipeCategoryBindings,FurnaceRecipeCategoryId,FurnaceRecipeFilterToggleProps} from 'mcbeui';
type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;
type Assert<T extends true>=T;
type FrameRef=Assert<Equal<ElementRef<typeof FurnaceScreenFrame>,HTMLElement>>;
type FurnaceRef=Assert<Equal<ElementRef<typeof FurnaceScreen>,HTMLElement>>;
type BlastRef=Assert<Equal<ElementRef<typeof BlastFurnaceScreen>,HTMLElement>>;
type SmokerRef=Assert<Equal<ElementRef<typeof SmokerScreen>,HTMLElement>>;
type BookRef=Assert<Equal<ElementRef<typeof FurnaceRecipeBook>,HTMLDivElement>>;
type EntryRef=Assert<Equal<ElementRef<typeof FurnaceRecipeBookEntry>,HTMLButtonElement>>;
type TabsRef=Assert<Equal<ElementRef<typeof FurnaceRecipeCategoryTabs>,HTMLDivElement>>;
type FilterRef=Assert<Equal<ElementRef<typeof FurnaceRecipeFilterToggle>,HTMLButtonElement>>;
const bindings:FurnaceRecipeCategoryBindings={food:{visible:true,offset:[0,0]},items:{leftmostVisible:false,normalVisible:true,offset:[1,-1]},blocks:{leftmostVisible:false,normalVisible:true}};
const labels={food:'Food',items:'Items',blocks:'Blocks',search:'Search'};
const entry:FurnaceRecipeBookItem={id:'host-recipe',label:'Host recipe',item:{name:'Host item',icon:<span>Host art</span>},backgroundSlice:1};
const book:FurnaceRecipeBookProps={title:'Host recipes',entries:[entry],categoryId:'search',query:'accepted',filteringEnabled:true,inventoryTab:false,categoryBindings:bindings,categoryLabels:labels,onCategoryChange:id=>{const category:FurnaceRecipeCategoryId=id;void category;},onQueryChange:query=>query.toUpperCase(),onFilteringEnabledChange:enabled=>{const flag:boolean=enabled;void flag;},onRecipeAction:(id,action)=>{void[id,action];},searchLabel:'Host recipe search',filterLabel:'Host smeltable filter'};
const tabs:FurnaceRecipeCategoryTabsProps={bindings,labels,value:'items',onValueChange:category=>{const id:FurnaceRecipeCategoryId=category;void id;},panelId:'host-recipes',onKeyDown:event=>{const node:HTMLDivElement=event.currentTarget;void node;}};
const filter:FurnaceRecipeFilterToggleProps={filteringEnabled:true,defaultFilteringEnabled:false,onFilteringEnabledChange:enabled=>{const value:boolean=enabled;void value;},readOnly:false,onClick:event=>{const node:HTMLButtonElement=event.currentTarget;void node;},label:'Host filter'};
const item:FurnaceRecipeBookEntryProps={entry,onRecipeAction:(id,action)=>{void[id,action];},onClick:event=>{const node:HTMLButtonElement=event.currentTarget;void node;}};
const frame:FurnaceScreenFrameProps={title:'Host frame',recipeBook:<FurnaceRecipeBook {...book}/>,children:<div>Host right pane</div>,layout:'compact',defaultLayout:'recipe-book',onLayoutChange:next=>{const layout:FurnaceScreenLayout=next;void layout;},showClose:true,onClose:()=>{},onHelp:()=>{},onKeyDownCapture:event=>{const node:HTMLElement=event.currentTarget;void node;}};
const screen:FurnaceScreenProps={recipeBook:book,layout:'recipe-book',processing:{progress:.5,fuelRemaining:.25,onInputAction:(slot,action)=>{void[slot,action];},onTakeResult:action=>{void action;},inventory:[{name:'Host ingredient'}]}};
const blast:BlastFurnaceScreenProps={...screen,title:'Host blast'};const smoker:SmokerScreenProps={...screen,title:'Host smoker'};
export const positive=<><FurnaceScreenFrame {...frame} ref={createRef<HTMLElement>()}/><FurnaceScreen {...screen} ref={createRef<HTMLElement>()}/><BlastFurnaceScreen {...blast} ref={createRef<HTMLElement>()}/><SmokerScreen {...smoker} ref={createRef<HTMLElement>()}/><FurnaceRecipeBook {...book} ref={createRef<HTMLDivElement>()}/><FurnaceRecipeBookEntry {...item} ref={createRef<HTMLButtonElement>()}/><FurnaceRecipeCategoryTabs {...tabs} ref={createRef<HTMLDivElement>()}/><FurnaceRecipeFilterToggle {...filter} ref={createRef<HTMLButtonElement>()}/></>;
// @ts-expect-error A furnace layout is a finite source binding.
const layout:FurnaceScreenLayout='survival';
// @ts-expect-error Screen requires actual furnace recipe-book props.
const missingBook:FurnaceScreenProps={title:'Host'};
// @ts-expect-error Image-render profiles belong to other explicitly qualified compositions.
const image:FurnaceScreenProps={...screen,imageRender:{}};
// @ts-expect-error This GUI2 screen has no inferred arbitrary scale API.
const scale:FurnaceScreenProps={...screen,scale:1};
// @ts-expect-error Disabled chrome is not a promised global readOnly lock.
const readOnly:FurnaceScreenProps={...screen,readOnly:true};
// @ts-expect-error Screen owns the matching processing title.
const processingTitle:FurnaceScreenProps={...screen,processing:{title:'Other'}};
// @ts-expect-error Root ref addresses an actual HTML section.
const badRoot=<FurnaceScreen {...screen} ref={createRef<SVGSVGElement>()}/>;
// @ts-expect-error Book ref addresses a div.
const badBook=<FurnaceRecipeBook {...book} ref={createRef<HTMLSpanElement>()}/>;
// @ts-expect-error Entry ref addresses its real native button.
const badEntry=<FurnaceRecipeBookEntry {...item} ref={createRef<HTMLDivElement>()}/>;
// @ts-expect-error Source categories exclude crafting tools/equipment.
const category:FurnaceRecipeCategoryId='equipment';
// @ts-expect-error Both visibility branches are independently required.
const incomplete:FurnaceRecipeCategoryBindings={food:{visible:true},items:{normalVisible:true},blocks:{leftmostVisible:false,normalVisible:true}};
// @ts-expect-error Search is fixed rightmost, without another host-offset binding.
const searchBinding:FurnaceRecipeCategoryBindings={...bindings,search:{visible:true,offset:[0,0]}};
// @ts-expect-error A furnace book has explicit inventoryTab state.
const noInventory:FurnaceRecipeBookProps={title:'Host',entries:[],categoryId:'search',query:'',filteringEnabled:false,categoryBindings:bindings,categoryLabels:labels};
// @ts-expect-error Filtering is not the crafting-count API.
const oldFilter:FurnaceRecipeFilterToggleProps={craftableOnly:true};
// @ts-expect-error Furnace recipe entries omit group modifiers.
const group:FurnaceRecipeBookItem={id:'x',modifier:'expand'};
// @ts-expect-error Furnace recipe entries omit craftable counts.
const count:FurnaceRecipeBookItem={id:'x',craftableCount:64};
// @ts-expect-error Represented items omit inventory counts.
const inventoryCount:FurnaceRecipeBookItem={id:'x',item:{name:'Host',count:64}};
// @ts-expect-error Represented items omit inventory durability.
const durability:FurnaceRecipeBookItem={id:'x',item:{name:'Host',durability:.5}};
// @ts-expect-error Registry and paint seams are private.
import {furnaceScreenAssets,useRecipeBookView} from 'mcbeui';
void[layout,missingBook,image,scale,readOnly,processingTitle,badRoot,badBook,badEntry,category,incomplete,searchBinding,noInventory,oldFilter,group,count,inventoryCount,durability];
`;

async function installedWorker() {
  const assert = (await import('node:assert/strict')).default, fs = await import('node:fs/promises'), path = (await import('node:path')).default;
  const { createRequire } = await import('node:module'), { pathToFileURL } = await import('node:url'), { createHash } = await import('node:crypto');
  const config = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  const req = createRequire(path.join(config.consumer, 'package.json')), rootReq = createRequire(path.join(config.root, 'package.json')), hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const React = req('react'), render = req('react-dom/server').renderToStaticMarkup;
  assert.equal(Number(React.version.split('.')[0]), config.major); assert.equal(req('react-dom/package.json').version, React.version); assert.equal(Number(req('@types/react/package.json').version.split('.')[0]), config.major);
  const installed = path.join(config.consumer, 'node_modules/mcbeui'), manifest = JSON.parse(await fs.readFile(path.join(installed, 'package.json'), 'utf8'));
  const index = await fs.readFile(path.join(installed, 'dist/index.js')), declaration = await fs.readFile(path.join(installed, 'dist/index.d.ts'));
  assert.deepEqual(index, await fs.readFile(path.join(config.root, 'dist/index.js'))); assert.deepEqual(declaration, await fs.readFile(path.join(config.root, 'dist/index.d.ts')));
  const names = ['FurnaceScreenFrame', 'FurnaceScreen', 'BlastFurnaceScreen', 'SmokerScreen', 'FurnaceRecipeBook', 'FurnaceRecipeBookEntry', 'FurnaceRecipeCategoryTabs', 'FurnaceRecipeFilterToggle'];
  const checks = [], attempts = [], warnings = [], saved = new Map(), previousError = console.error, previousWarn = console.warn;
  let callbacks = 0, refs = 0, ui;
  const callback = () => { callbacks++; throw Error('SSR host callback'); }, ref = () => { refs++; throw Error('SSR host ref'); };
  const attr = (tag, name) => new RegExp('(?:^|\\s)' + name + '="([^"]*)"(?=\\s|/?>)', 'i').exec(tag)?.[1];
  const tags = (html, name) => [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi'))].map(match => match[0]);
  const classTag = (html, tag, name) => tags(html, tag).find(node => attr(node, 'class')?.split(/\s+/).includes(name));
  const check = (name, run) => { try { run(); checks.push(name); } catch (error) { error.message = '[' + name + '] ' + error.message; throw error; } };
  console.error = (...args) => warnings.push(args.map(String).join(' ')); console.warn = console.error;
  for (const name of ['fetch', 'Image', 'FontFace', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'setTimeout', 'setInterval']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, value() { attempts.push(name); throw Error('SSR service ' + name); } });
  }
  try {
    ui = await import(pathToFileURL(path.join(installed, 'dist/index.js')).href);
    for (const name of names) assert.equal(ui[name].$$typeof, Symbol.for('react.forward_ref'));
    for (const name of ['furnaceScreenAssets', 'useRecipeBookView', 'sourceEntry', 'FurnaceScreenCore', 'FurnaceRecipeBookCore']) assert(!Object.hasOwn(ui, name), 'Private export ' + name);
    const bindings = { food: { visible: true }, items: { leftmostVisible: false, normalVisible: true }, blocks: { leftmostVisible: false, normalVisible: true } };
    const labels = { food: 'Host food', items: 'Host items', blocks: 'Host blocks', search: 'Host search category' };
    const entry = { id: 'host-recipe', label: 'Host recipe', item: { name: 'Host ingredient', icon: React.createElement('span', null, 'Host art') } };
    const bookProps = { title: 'Host recipes', entries: [entry], categoryId: 'search', query: 'accepted query', categoryBindings: bindings, categoryLabels: labels, filteringEnabled: true, inventoryTab: false,
      onQueryChange: callback, onCategoryChange: callback, onFilteringEnabledChange: callback, onRecipeAction: callback, searchLabel: 'Host search', filterLabel: 'Host filter' };
    const book = patch => render(React.createElement(ui.FurnaceRecipeBook, { key: 'actual-book', ref, ...bookProps, ...patch }));
    const tabs = patch => render(React.createElement(ui.FurnaceRecipeCategoryTabs, { key: 'actual-tabs', ref, bindings, labels, value: 'items', onValueChange: callback, ...patch }));
    const filter = patch => render(React.createElement(ui.FurnaceRecipeFilterToggle, { key: 'actual-filter', ref, label: 'Host filter', onFilteringEnabledChange: callback, ...patch }));
    for (const layout of ['recipe-book', 'compact']) check('frame-native-ref-composition-and-explicit-layout-' + layout, () => {
      const html = render(React.createElement(ui.FurnaceScreenFrame, { key: 'actual-frame', ref, title: 'Host frame', layout, recipeBook: React.createElement('button', { type: 'button', 'data-host-book': 'true' }, 'Host book'), onLayoutChange: callback, onHelp: callback, onClose: callback }, React.createElement('input', { 'aria-label': 'Host right input', defaultValue: 'Retained' })));
      const frame = classTag(html, 'section', 'mc-furnace-screen-frame'); assert(frame); assert.equal(attr(frame, 'aria-label'), 'Host frame'); assert.equal(attr(frame, 'data-furnace-layout'), layout);
      assert(attr(frame, 'style').includes('width:' + (layout === 'recipe-book' ? 652 : 352) + 'px')); assert(attr(frame, 'style').includes('height:332px'));
      const pane = classTag(html, 'div', 'mc-furnace-screen-frame__book'); assert.equal(attr(pane, 'hidden') !== undefined, layout === 'compact');
      assert(html.includes('data-host-book="true"')); assert(html.includes('value="Retained"')); assert(attr(frame, 'style').includes('--mc-furnace-toolbar-width:198px'));
      assert(!/<canvas|<iframe|<script/.test(html));
    });
    for (const [name, title, processingClass] of [['FurnaceScreen', 'Furnace', 'mc-furnace'], ['BlastFurnaceScreen', 'Blast Furnace', 'mc-blast-furnace'], ['SmokerScreen', 'Smoker', 'mc-smoker']]) check('matching-source-processing-composition-' + name, () => {
      const html = render(React.createElement(ui[name], { key: 'actual-' + name, ref, recipeBook: bookProps, processing: { progress: .5, fuelRemaining: .25, onInputAction: callback, onTakeResult: callback }, onClose: callback, onHelp: callback, onLayoutChange: callback }));
      const frame = classTag(html, 'section', 'mc-furnace-screen-frame'); assert.equal(attr(frame, 'aria-label'), title);
      assert(classTag(html, 'div', 'mc-furnace-recipe-book')); assert(classTag(html, 'section', processingClass));
      assert(classTag(html, 'button', 'mc-furnace__input')); assert(classTag(html, 'button', 'mc-furnace__fuel')); assert(classTag(html, 'button', 'mc-furnace__result'));
      assert(tags(html, 'div').some(node => attr(node, 'role') === 'progressbar' && attr(node, 'aria-valuenow') === '50'));
      assert(tags(html, 'div').some(node => attr(node, 'role') === 'meter' && attr(node, 'aria-valuenow') === '25'));
    });
    check('chrome-disabled-does-not-invent-a-processing-or-recipe-book-lock', () => {
      const html = render(React.createElement(ui.FurnaceScreen, { ref, disabled: true, recipeBook: bookProps }));
      assert.equal(attr(classTag(html, 'button', 'mc-furnace__input'), 'disabled'), undefined);
      const search = tags(html, 'input').find(node => attr(node, 'type') === 'search'); assert(search); assert.equal(attr(search, 'disabled'), undefined);
      const toolbar = classTag(html, 'div', 'mc-furnace-screen-frame__toolbar'); assert(toolbar);
      const chrome = tags(html, 'button').filter(node => attr(node, 'data-toolbar-control')); assert(chrome.length > 0); assert(chrome.every(node => attr(node, 'disabled') !== undefined));
    });
    check('frame-default-web-initial-choice-and-close-free-toolbar', () => {
      const html = render(React.createElement(ui.FurnaceScreenFrame, { ref, title: 'Host', defaultLayout: 'compact', showClose: false, recipeBook: 'Book' }, 'Right'));
      const frame = classTag(html, 'section', 'mc-furnace-screen-frame'); assert.equal(attr(frame, 'data-furnace-layout'), 'compact'); assert(attr(frame, 'style').includes('--mc-furnace-toolbar-width:168px'));
    });
    for (const inventoryTab of [false, true]) for (const categoryId of ['food', 'search']) check('independent-book-search-and-inventory-binding-' + inventoryTab + '-' + categoryId, () => {
      const html = book({ inventoryTab, categoryId }), node = classTag(html, 'div', 'mc-furnace-recipe-book');
      assert.equal(attr(node, 'data-inventory-tab') === 'true', inventoryTab); assert.equal(attr(node, 'data-search') === 'true', categoryId === 'search');
      assert.equal(attr(node, 'data-source-nodrop-zone'), inventoryTab ? '146x166-layer2' : undefined);
      if (categoryId === 'search') assert(tags(html, 'input').some(node => attr(node, 'value') === 'accepted query'));
      assert(classTag(html, 'div', 'mc-recipe-book__grid')); assert(!/source-viewport-painter|mc-gui-layer/.test(html));
    });
    check('all-five-category-visibility-bits-retain-fixed-holders-and-unconditional-search', () => {
      for (let mask = 0; mask < 32; mask++) {
        const b = { food: { visible: !!(mask & 1) }, items: { leftmostVisible: !!(mask & 2), normalVisible: !!(mask & 4) }, blocks: { leftmostVisible: !!(mask & 8), normalVisible: !!(mask & 16) } };
        const html = tabs({ bindings: b }), controls = tags(html, 'button').filter(node => attr(node, 'role') === 'tab');
        assert.equal(tags(html, 'div').filter(node => attr(node, 'class')?.split(/\s+/).includes('mc-furnace-recipe-categories__holder')).length, 4);
        assert.equal(controls.length, 1 + [1, 2, 4, 8, 16].filter(bit => mask & bit).length);
        const search = controls.find(node => attr(node, 'data-category') === 'search'); assert(search); assert.equal(attr(search, 'data-variant'), 'rightmost'); assert.equal(attr(search, 'style'), 'left:0;top:0');
        assert.equal(controls.filter(node => attr(node, 'tabindex') === '0').length, 1);
      }
    });
    check('independent-variant-offsets-selection-and-caller-aria-survive', () => {
      const html = tabs({ bindings: { ...bindings, items: { leftmostVisible: true, normalVisible: true, offset: [2, -1] } }, 'aria-label': 'Caller categories', panelId: 'host-panel' });
      const root = classTag(html, 'div', 'mc-furnace-recipe-categories'); assert.equal(attr(root, 'aria-label'), 'Caller categories'); assert.equal(attr(root, 'aria-multiselectable'), 'true');
      const items = tags(html, 'button').filter(node => attr(node, 'data-category') === 'items'); assert.equal(items.length, 2);
      for (const node of items) { assert.equal(attr(node, 'style'), 'left:4px;top:-2px'); assert.equal(attr(node, 'aria-selected'), 'true'); assert.equal(attr(node, 'aria-controls'), 'host-panel'); }
    });
    for (const filteringEnabled of [false, true]) check('literal-filter-state-' + filteringEnabled, () => {
      const html = filter({ filteringEnabled }), node = tags(html, 'button')[0]; assert.equal(attr(node, 'type'), 'button'); assert.equal(attr(node, 'aria-label'), 'Host filter'); assert.equal(attr(node, 'aria-pressed'), String(filteringEnabled));
      for (const key of ['off', 'on', 'off-hover', 'on-hover']) assert(attr(node, 'style').includes('--mc-inv-screen-filter-' + key));
    });
    check('readonly-filter-and-wide-crafting-record-cannot-restore-omitted-count-durability-group-controls', () => {
      assert.equal(attr(tags(filter({ readOnly: true }), 'button')[0], 'disabled'), '');
      const wide = { ...entry, craftableCount: 64, modifier: 'expand', item: { ...entry.item, count: 64, durability: .5 } };
      for (const html of [render(React.createElement(ui.FurnaceRecipeBookEntry, { ref, entry: wide, onRecipeAction: callback })), book({ entries: [wide] })]) {
        assert(!/mc-slot__count|mc-slot__durability|mc-durability|mc-recipe-book-entry__modifier|data-modifier=/.test(html)); assert(html.includes('Host art')); assert(classTag(html, 'button', 'mc-furnace-recipe-book-entry'));
      }
    });
    const invalidFrames = [{ layout: 'survival' }, { defaultLayout: 'creative' }, { title: 42 }, { showClose: 1 }, { disabled: 1 }, { onHelp: false }];
    invalidFrames.forEach((patch, i) => check('invalid-frame-' + i, () => assert.throws(() => render(React.createElement(ui.FurnaceScreenFrame, { title: 'Host', recipeBook: 'Book', ...patch }, 'Right')), TypeError)));
    const invalidBooks = [{ categoryId: 'equipment' }, { filteringEnabled: 1 }, { inventoryTab: 1 }, { categoryBindings: undefined }, { categoryLabels: { ...labels, food: '' } }, { categoryBindings: { ...bindings, food: { visible: true, offset: new Array(2) } } }];
    invalidBooks.forEach((patch, i) => check('invalid-book-' + i, () => assert.throws(() => book(patch), TypeError)));
    check('invalid-filter-state', () => assert.throws(() => filter({ filteringEnabled: 1 }), TypeError));
    assert.equal(callbacks, 0); assert.equal(refs, 0); assert.deepEqual(attempts, []); assert.deepEqual(warnings, []);
  } finally {
    console.error = previousError; console.warn = previousWarn;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }

  const ledgerBytes = await fs.readFile(path.join(installed, 'docs/furnace-screen-assets.json'));
  assert.deepEqual(ledgerBytes, await fs.readFile(path.join(config.root, 'docs/furnace-screen-assets.json')));
  const ledger = JSON.parse(ledgerBytes); assert.equal(ledger.sourceArchive.sha256, 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'); assert.equal(ledger.assets.length, 7);
  const ts = rootReq('typescript'), tree = ts.createSourceFile('index.js', index.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), banks = [];
  const key = node => ts.isIdentifier(node) || ts.isStringLiteralLike(node) ? node.text : null;
  const fields = node => new Map(node.properties.filter(ts.isPropertyAssignment).map(p => [key(p.name), p.initializer]));
  const string = node => node && ts.isStringLiteralLike(node) ? node.text : null;
  const url = node => string(node) ?? (node && ts.isPropertyAccessExpression(node) && node.name.text === 'href' && ts.isNewExpression(node.expression) ? string(node.expression.arguments?.[0]) : null);
  function visit(node) { if (ts.isObjectLiteralExpression(node)) { const f = fields(node); if (config.originals.every(([name]) => f.has(name))) banks.push(f); } ts.forEachChild(node, visit); } visit(tree);
  assert(banks.length > 0, 'Compiled private seven-image source bank');
  const bank = banks.find(f => config.originals.every(([name]) => ts.isObjectLiteralExpression(f.get(name)))); assert(bank);
  const materials = [];
  for (const [name, length, digest, width, height] of config.originals) {
    const relative = 'dist/assets/furnace-screen/' + name + '.png', png = await fs.readFile(path.join(installed, relative));
    assert.equal(png.length, length); assert.equal(hash(png), digest); assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [width, height]);
    const record = ledger.assets.find(asset => asset.key === name); assert(record); assert.equal(record.sha256, digest); assert.equal(record.bytes, length); assert.deepEqual(record.dimensions, [width, height]); assert.equal(record.metadata.exists, false);
    const f = fields(bank.get(name)), inline = url(f.get('url')); assert(inline?.startsWith('data:image/png'), 'Relocatable complete source ' + name);
    const comma = inline.indexOf(','), header = inline.slice(0, comma), payload = inline.slice(comma + 1), body = header.endsWith(';base64') ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload));
    assert.equal(hash(body), digest); assert.equal(Number(f.get('width')?.text), width); assert.equal(Number(f.get('height')?.text), height); assert(!f.has('metadata'), 'No invented nine-slice metadata');
    try { await fs.access(path.join(installed, 'dist/assets/furnace-screen/' + name + '.json')); assert.fail('Unexpected invented companion JSON'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    materials.push({ name, bytes: length, sha256: digest, size: [width, height], inlineWholeOriginal: true, metadata: false });
  }
  const license = await fs.readFile(path.join(installed, 'dist/assets/document-viewer/LICENSE.md')); assert.equal(hash(license), 'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d');
  const notices = await fs.readFile(path.join(installed, 'THIRD_PARTY_NOTICES.md'), 'utf8'); assert(notices.includes('Furnace') && notices.includes('docs/furnace-screen-assets.json') && notices.includes('dist/assets/document-viewer/LICENSE.md'));
  const catalogBytes = await fs.readFile(path.join(installed, 'docs/component-catalog.json')); assert.deepEqual(catalogBytes, await fs.readFile(path.join(config.root, 'docs/component-catalog.json')));
  const records = []; function scan(node) { if (!node || typeof node !== 'object') return; if (typeof node.name === 'string') records.push(node); for (const child of Object.values(node)) scan(child); } scan(JSON.parse(catalogBytes));
  for (const name of names) assert(records.some(record => record.name === name && record.status === 'implemented'), 'Public component manifest ' + name);
  const styles = {};
  async function css(file) { if (styles[file]) return; assert(!path.isAbsolute(file) && !file.startsWith('..')); const bytes = await fs.readFile(path.join(installed, 'dist', file)); assert.deepEqual(bytes, await fs.readFile(path.join(config.root, 'src', file))); styles[file] = hash(bytes); for (const match of bytes.toString().matchAll(/@import\s+['"]([^'"]+[.]css)['"]/g)) await css(path.normalize(path.join(path.dirname(file), match[1]))); }
  for (const name of ['furnace-screen.css', 'furnace-recipe-book.css']) { assert.equal(manifest.exports['./' + name], './dist/' + name); await css(name); }
  const unified = await fs.readFile(path.join(installed, 'dist/styles.css'), 'utf8'); assert(/@import\s+['"][^'"]*furnace-screen[.]css['"]/.test(unified));
  const screenCSS = await fs.readFile(path.join(installed, 'dist/furnace-screen.css'), 'utf8');
  assert(/width:652px;height:332px/.test(screenCSS)); assert(/width:292px;height:332px/.test(screenCSS)); assert(/left:300px;top:0;width:352px;height:332px/.test(screenCSS));
  assert(/top:-40px;width:var\(--mc-furnace-toolbar-width\);height:40px/.test(screenCSS));
  const result = { react: React.version, peerTypes: req('@types/react/package.json').version, runtimeValues: Object.keys(ui).length, componentNames: names, checks, callbacks, refs, warnings, serviceAttempts: attempts,
    materials, assetLedgerSHA256: hash(ledgerBytes), licenseSHA256: hash(license), styles, indexSHA256: hash(index), declarationSHA256: hash(declaration),
    scope: 'Actual installed namespace/SSR/strict declarations, fixed source CSS and seven complete originals. No browser mounted interaction, native pixels, resource-pack selection or service certification.' };
  await fs.writeFile(path.join(config.directory, 'SSR.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
}

/** Verifies a consumer already installed by the root package pipeline. */
export async function verifyFurnaceScreenPackage({ consumer, root, major, evidenceName = 'furnace-screen-contracts' }) {
  assert(major === 18 || major === 19); assert(/^[a-z0-9-]{1,80}$/.test(evidenceName)); consumer = path.resolve(consumer); root = path.resolve(root);
  const directory = path.join(consumer, evidenceName); await fs.mkdir(directory, { recursive: true }); await fs.writeFile(path.join(directory, 'consumer.tsx'), typed);
  await fs.writeFile(path.join(directory, 'worker.mjs'), '(' + installedWorker.toString() + ')().catch(error=>{console.error(error);process.exitCode=1;});');
  await fs.writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true }, include: ['consumer.tsx'] }, null, 2));
  const config = path.join(directory, 'config.json'); await fs.writeFile(config, JSON.stringify({ root, consumer, major, directory, originals }, null, 2));
  async function run(args, file) { try { const output = execFileSync(process.execPath, args, { cwd: consumer, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true }); await fs.writeFile(path.join(directory, file), output); } catch (error) { await fs.writeFile(path.join(directory, file), String(error.stdout ?? '') + '\n' + String(error.stderr ?? error.stack)); throw error; } }
  await run([path.join(directory, 'worker.mjs'), config], 'SSR.txt'); await run([path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(directory, 'tsconfig.json')], 'TYPECHECK.txt');
  const result = { ...JSON.parse(await fs.readFile(path.join(directory, 'SSR.json'), 'utf8')), strictTypes: true, negativeTypeContracts: (typed.match(/@ts-expect-error/g) ?? []).length,
    typedFixtureSHA256: createHash('sha256').update(typed).digest('hex'), status: 'PASS_INSTALLED_FURNACE_SCREEN_ESM_SSR_TYPES_ORIGINALS_CSS' };
  await fs.writeFile(path.join(directory, 'RESULT.json'), JSON.stringify(result, null, 2)); console.log(`React ${major}: installed Furnace ${result.checks.length} SSR / ${result.negativeTypeContracts} strict-negative types /7 whole originals/CSS PASS`); return result;
}

const browserApp = `import React,{createRef,useState}from'react';import{createRoot}from'react-dom/client';import*as ui from'mcbeui';import'mcbeui/styles.css';import'mcbeui/fonts.css';
const refs={screen:createRef(),book:createRef(),entry:createRef(),tabs:createRef(),filter:createRef()},events=[];
const labels={food:'Installed Food',items:'Installed Items',blocks:'Installed Blocks',search:'Installed Search tab'},bindings={food:{visible:true},items:{leftmostVisible:false,normalVisible:true},blocks:{leftmostVisible:false,normalVisible:true}};
const entries=[{id:'recipe-a',label:'Host recipe A',item:{name:'Host A',icon:<span>HOST A</span>}},{id:'recipe-b',label:'Host recipe B',item:{name:'Host B',icon:<span>HOST B</span>}}];
function App(){const[layout,setLayout]=useState('recipe-book'),[categoryId,setCategory]=useState('search'),[query,setQuery]=useState(''),[filteringEnabled,setFiltering]=useState(false),[inventoryTab,setInventory]=useState(false),[variant,setVariant]=useState('FurnaceScreen'),[disabled,setDisabled]=useState(false),[accept,setAccept]=useState(true);
const record=(kind,value)=>events.push({kind,value}),book={title:'Installed recipes',entries,categoryId,query,filteringEnabled,inventoryTab,categoryBindings:bindings,categoryLabels:labels,searchLabel:'Installed recipe search',filterLabel:'Installed filter',onCategoryChange:value=>{record('category',value);if(accept)setCategory(value);},onQueryChange:value=>{record('query',value);if(accept)setQuery(value);},onFilteringEnabledChange:value=>{record('filter',value);if(accept)setFiltering(value);},onRecipeAction:(id,action)=>record('recipe',{id,action})};const Screen=ui[variant];
window.furnaceInstalled={react:React.version,runtimeValues:Object.keys(ui).length,refs,events,layout,categoryId,query,filteringEnabled,inventoryTab,variant,disabled,accept,setLayout,setCategory,setQuery,setFiltering,setInventory,setVariant,setDisabled,setAccept,bindings,labels,entries,clear(){events.length=0;}};
return <><button id="outside">Outside furnace</button><Screen key="installed-screen" ref={refs.screen} recipeBook={book} layout={layout} disabled={disabled} onLayoutChange={value=>{record('layout',value);if(accept)setLayout(value);}} onHelp={()=>record('help',null)} onClose={()=>record('close',null)} processing={{input:{name:'Host input'},fuel:{name:'Host fuel'},result:{name:'Host result'},progress:.5,fuelRemaining:.25,onInputAction:(slot,action)=>record('input',{slot,action}),onTakeResult:action=>record('result',action)}}/>
<section className="standalone" aria-label="Installed standalone furnace parts"><ui.FurnaceRecipeBook ref={refs.book} {...book}/><ui.FurnaceRecipeCategoryTabs ref={refs.tabs} bindings={bindings} labels={labels} value={categoryId} label="Installed standalone categories" onValueChange={value=>{record('standalone-category',value);if(accept)setCategory(value);}}/><ui.FurnaceRecipeFilterToggle ref={refs.filter} label="Installed standalone filter" filteringEnabled={filteringEnabled} onFilteringEnabledChange={value=>{record('standalone-filter',value);if(accept)setFiltering(value);}}/><ui.FurnaceRecipeBookEntry ref={refs.entry} entry={entries[0]} onRecipeAction={(id,action)=>record('standalone-recipe',{id,action})}/></section></>}
createRoot(document.getElementById('root')).render(<App/>);`;

/** Writes a fresh default-Vite installed consumer fixture; does not run it. */
export async function prepareFurnaceInstalledFixture({ directory }) {
  directory = path.resolve(directory); await fs.mkdir(directory, { recursive: true });
  const html = '<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Installed furnace consumer</title><style>body{margin:12px;background:#203040;color:white;--mc-font:"MCBE Pixel","MCBE CJK",monospace;font-family:var(--mc-font)}button,input{font:inherit}.standalone{position:relative;margin-top:64px;display:flex;flex-direction:column;gap:60px;align-items:flex-start}</style><div id="root"></div><script type="module" src="/main.tsx"></script></html>';
  const files = { 'main.tsx': browserApp, 'index.html': html }, hashes = {};
  for (const [name, text] of Object.entries(files)) { await fs.writeFile(path.join(directory, name), text, { flag: 'wx' }); hashes[name] = createHash('sha256').update(text).digest('hex'); }
  return { directory, files: hashes, windowName: 'furnaceInstalled', scope: 'Fixture preparation only. Root owns installed package, default Vite, browser interaction and HTTP identity qualification.' };
}
