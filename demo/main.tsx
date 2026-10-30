import { StrictMode, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert, Badge, Button, Checkbox, Combobox, Dialog, IconButton, ItemSlot, Panel, PixelIcon,
  Progress, RadioGroup, Separator, Slider, Switch, Tabs, Text, TextArea, TextField, InventoryGrid, Grindstone, EnchantingTable, EnchantingBook, EnchantingRunes,
} from '../src';
import type { InventoryItem, PixelIconName } from '../src';
import '../src/fonts.css';
import '../src/styles.css';
import './styles.css';
import { runeAtlasUrl } from 'virtual:mcbeui-game-font';
import { ClassicFontExamples, useDemoFontProfile } from './classic-font-examples';
import { GrassBlock, VoxelIsland } from './art';
import { ItemSprite } from './materials';
import componentCatalog from '../docs/component-catalog.json';
import { ProcessingExamples } from './processing-examples';
import { AnvilExamples } from './anvil-examples';
import { ContainerExamples } from './container-examples';
import { NativeExamples } from './native-examples';
import { ExpansionExamples } from './expansion-examples';
import { GameListsExamples } from './game-lists-examples';
import { SystemScreensExamples } from './system-screens-examples';
import { GameControlsExamples } from './game-controls-examples';
import { TradingMountsExamples } from './trading-mounts-examples';
import { InventoryScreensExamples } from './inventory-screens-examples';
import { ItemGlintExamples } from './item-glint-examples';
import { BitmapTextExamples } from './bitmap-text-examples';
import { WorkstationTextExamples } from './workstation-text-examples';
import { GuiIconsExamples } from './gui-icons-examples';
import { GuiLayerExamples } from './gui-layer-examples';
import { GrindstoneLayerExamples } from './grindstone-layer-examples';
import { CraftingLayerExamples } from './crafting-layer-examples';
import { AnvilLayerExamples } from './anvil-layer-examples';
import { ItemRenderersExamples } from './item-renderers-examples';
import { BookExamples } from './book-examples';
import { SignExamples } from './sign-demo';
import { JigsawExamples } from './jigsaw-examples';
import { CommandBlockExamples } from './command-block-examples';
import { StructureEditorExamples } from './structure-editor-examples';
import { ServerFormsExamples } from './server-forms-examples';
import { NpcExamples } from './npc-examples';
import { EmoteWheelExamples } from './emote-wheel-examples';
import { ScrollArea } from '../src';

const componentCount = Object.values(componentCatalog.groups).flat().filter(component => component.status === 'implemented').length;

const navigation: { id: string; name: string; icon: PixelIconName; count?: string }[] = [
  { id: 'overview', name: 'Overview', icon: 'grid' },
  { id: 'buttons', name: 'Buttons', icon: 'chevron', count: '02' },
  { id: 'inputs', name: 'Inputs & combobox', icon: 'chevron', count: '04' },
  { id: 'selection', name: 'Selection', icon: 'chevron', count: '04' },
  { id: 'navigation', name: 'Tabs', icon: 'chevron', count: '01' },
  { id: 'feedback', name: 'Feedback', icon: 'chevron', count: '03' },
  { id: 'surfaces', name: 'Panels & dialogs', icon: 'chevron', count: '02' },
  { id: 'inventory', name: 'Inventory & slots', icon: 'chevron', count: '03' },
  { id: 'item-glint', name: 'Item glint', icon: 'chevron', count: '01' },
  { id: 'item-renderers', name: 'Block items', icon: 'chevron', count: '01' },
  { id: 'bitmap-text', name: 'Bitmap text', icon: 'chevron', count: '01' },
  { id: 'workstations', name: 'Workstation GUIs', icon: 'chevron', count: '04' },
  { id: 'workstation-text', name: 'Workstation text', icon: 'chevron', count: '01' },
  { id: 'gui-layer', name: 'Composed GUI', icon: 'chevron', count: '01' },
  { id: 'grindstone-layer', name: 'Source Grindstone', icon: 'chevron', count: '01' },
  { id: 'crafting-layer', name: 'Source Crafting', icon: 'chevron', count: '01' },
  { id: 'books', name: 'Books & writing', icon: 'chevron', count: '04' },
  { id: 'signs', name: 'Signs', icon: 'chevron', count: '02' },
  { id: 'jigsaw', name: 'Jigsaw editor', icon: 'chevron', count: '02' },
  { id: 'command-block', name: 'Command blocks', icon: 'chevron', count: '03' },
  { id: 'structure-editor', name: 'Structure editor', icon: 'chevron', count: '02' },
  { id: 'server-forms', name: 'Server forms', icon: 'chevron', count: '02' },
  { id: 'npc', name: 'NPC dialogue & editor', icon: 'chevron', count: '05' },
  { id: 'emote-wheel', name: 'Emote wheel', icon: 'chevron', count: '02' },
  { id: 'processing', name: 'Crafting & smelting', icon: 'chevron', count: '10' },
  { id: 'anvil', name: 'Anvil', icon: 'chevron', count: '01' },
  { id: 'anvil-layer', name: 'Source Anvil', icon: 'chevron', count: '01' },
  { id: 'containers', name: 'Storage containers', icon: 'chevron', count: '06' },
  { id: 'brewing', name: 'Brewing', icon: 'chevron', count: '02' },
  { id: 'special-workstations', name: 'Smithing & cartography', icon: 'chevron', count: '02' },
  { id: 'hud', name: 'Heads-up display', icon: 'chevron', count: '07' },
  { id: 'scrolling', name: 'Scrolling', icon: 'chevron', count: '02' },
  { id: 'advanced-workstations', name: 'More workstations', icon: 'chevron', count: '09' },
  { id: 'hud-overlays', name: 'HUD overlays', icon: 'chevron', count: '08' },
  { id: 'settings', name: 'Settings controls', icon: 'chevron', count: '05' },
  { id: 'feedback-primitives', name: 'Tooltips & toasts', icon: 'chevron', count: '03' },
  { id: 'game-lists', name: 'Worlds, servers & packs', icon: 'chevron', count: '05' },
  { id: 'settings-panel', name: 'Settings panel', icon: 'chevron', count: '01' },
  { id: 'loading-screen', name: 'Loading screen', icon: 'chevron', count: '01' },
  { id: 'achievement-toast', name: 'Achievement toast', icon: 'chevron', count: '01' },
  { id: 'game-controls', name: 'Players, touch & menus', icon: 'chevron', count: '04' },
  { id: 'trading-mounts', name: 'Trading & mounts', icon: 'chevron', count: '03' },
  { id: 'inventory-screens', name: 'Player & creative inventory', icon: 'chevron', count: '09' },
  { id: 'typography', name: 'Typography & icons', icon: 'chevron', count: '02' },
  { id: 'gui-icons', name: 'GUI icons', icon: 'chevron', count: '150' },
];
const snippets: Record<string, string> = {
  npc: `import { NpcDialogue, NpcEditor } from 'mcbeui';\n\n<NpcDialogue title="Villager guide" value={dialogue}\n  actor={actorPortrait} actions={actions} onAction={requestAction} />\n<NpcEditor value={draft} onValueChange={setDraft}\n  skins={skins} actor={actorPortrait} onClose={closeEditor} />`,
  'server-forms': `import { ServerActionForm, ServerCustomForm } from 'mcbeui';\n\n<ServerActionForm title="Choose an action" rows={rows}\n  onAction={requestAction} onCancel={closeForm} />\n<ServerCustomForm title="Preferences" fields={fields}\n  value={values} onValueChange={setValues}\n  onSubmit={requestSubmit} onCancel={closeForm} />`,
  'structure-editor': `import { StructureEditor, XYZVectorInput } from 'mcbeui';\n\n<StructureEditor value={draft} onValueChange={setDraft}\n  preview={preview} onAction={handleAction} />\n<XYZVectorInput label="Position" value={position}\n  onValueChange={setPosition} />`,
  'command-block': `import { CommandBlockEditor, CommandInput, CommandOutputPanel } from 'mcbeui';\n\n<CommandBlockEditor value={draft} onValueChange={setDraft}\n  expanded={expanded} onExpandedChange={setExpanded}\n  previousOutput={output} onPasteRequest={requestPaste}\n  onClose={closeEditor} />\n<CommandInput value={command} onValueChange={setCommand} />\n<CommandOutputPanel previousOutput={output} />`,
  jigsaw: `import { JigsawEditor, JigsawPriorityFields } from 'mcbeui';\n\n<JigsawEditor value={draft} onValueChange={setDraft}\n  onDone={saveDraft} onHelp={showHelp} />\n<JigsawPriorityFields defaultValue={{\n  selectionPriority: '0', placementPriority: '-1'\n}} />\n// Values remain editable strings; the host validates and saves them.`,
  signs: `import { SignTextSurface, SignEditor } from 'mcbeui';\n\n<SignTextSurface variant="regular" wood="oak"\n  value={text} onValueChange={setText} />\n<SignEditor open={open} onOpenChange={setOpen}\n  variant="hanging" wood="cherry"\n  value={text} onValueChange={setText} />\n// Outside and Escape request a close.\n// The host accepts text changes and chooses its exit policy.`,
  books: `import { BookReader, BookEditor } from 'mcbeui';\nimport 'mcbeui/styles.css';\n\n<BookReader pages={['First leaf', 'Second leaf']} />\n<BookEditor defaultPages={['A new adventure']}\n  defaultAuthor="Player"\n  onSign={snapshot => saveBook(snapshot)} />\n// spreadIndex addresses a pair of leaf pages.\n// The host accepts structural page edits and persists signed books.`,
  scrolling: `<ScrollArea label="Inventory notes" style={{height:180}}>\n  <YourScrollableContent/>\n</ScrollArea>\n// ScrollBar is also available as a controlled primitive.`,
  buttons: `import { Button, PixelIcon } from 'mcbeui';\n\n<Button variant="primary"\n  startIcon={<PixelIcon name="plus" />}\n  onClick={() => createWorld()}>\n  Create new world\n</Button>`,
  inputs: `<TextField label="World name" name="worldName"\n  placeholder="My world" required />\n<Combobox label="Difficulty" options={[\n  { value: 'normal', label: 'Normal' },\n  { value: 'hard', label: 'Hard' },\n]} />`,
  selection: `<Switch label="Multiplayer game"\n  checked={multiplayer} onChange={e =>\n    setMultiplayer(e.target.checked)} />\n<Slider label="Render distance" min={4}\n  max={32} defaultValue={12}\n  formatValue={n => n + ' chunks'} />`,
  navigation: `<Tabs label="World settings" defaultValue="game"\n  items={[\n    { value: 'game', label: 'Game',\n      content: <GameSettings /> },\n    { value: 'video', label: 'Video',\n      content: <VideoSettings /> },\n  ]} />`,
  feedback: `<Badge variant="success">Stable</Badge>\n<Progress label="Generating world"\n  value={64} showValue />\n<Alert variant="success" title="World saved">\n  Your adventure is ready.\n</Alert>`,
  surfaces: `<Dialog open={open} onOpenChange={setOpen}\n  title="Create new world"\n  footer={<Button variant="primary"\n    onClick={() => setOpen(false)}>Create</Button>}>\n  <TextField label="World name" />\n</Dialog>`,
  inventory: `<ItemSlot label="Diamond" count={64}\n  selected={selected === 'diamond'}\n  onClick={() => setSelected('diamond')}>\n  <img src="/your-diamond.png" alt="" />\n</ItemSlot>`,
  'bitmap-text': `<BitmapText font={yourFont}\n  sampling="point" shader="bitmap"\n  color="#ffffff">钻石剑</BitmapText>\n// font.pages contains caller-owned atlas URLs.\n// font.glyphs supplies exact rectangles and advances.`,
  'item-glint': `<ItemGlint imageSrc="/your-diamond-sword.png"\n  uniforms={yourExplicitUniforms}\n  glintSampler="bilinear-repeat"\n  blend={{ source: 'one', destination: 'one' }} />\n// This is an explicit Web composition profile.\n// Supply captured host parameters for native calibration.`,
  typography: `import 'mcbeui/styles.css';\nimport 'mcbeui/fonts.css'; // optional, self-hosted\n\n/* Bring your own licensed original font */\n:root {\n  --mc-font: 'Mojangles', 'Monocraft',\n    'Fusion Pixel', monospace;\n}`,
  'input-states': `<TextField label="World name" error="This name is taken." />\n<TextField label="World seed" defaultValue="8675309" disabled />\n<TextField label="World ID" defaultValue="MC-0420" readOnly />`,
  'inventory-states': `<ItemSlot item={{ name: 'Diamond sword', icon: <YourSword />,\n  durability: 0.42, lore: ['Sharpness IV'] }} selected />\n<InventoryGrid label="Inventory" items={items} size={27}\n  onSlotAction={(index, action) => handleSlot(index, action)} />`,
  workstations: `<Grindstone inputs={[first, second]} result={result}\n  inventory={items} onTakeResult={handleTake} />\n<EnchantingTable item={sword} lapis={lapis}\n  options={enchantments} onEnchant={handleEnchant} />`,
  'gui-icons': `<GuiIcon name="sound-glyph" scale={2} label="Audio" />\n<GuiIcon name="warning-glyph-small" scale={2} />\n\n// guiIconNames lists all 150 typed names.\n// Without a label, an icon is decorative.\n// Original colors and image proportions are retained.`,
  'gui-layer': `<GuiLayer width={640} height={480} guiScale={2}\n  commands={[\n    { kind: 'image', texture: cellUrl,\n      rect: [10, 12, 18, 18],\n      nineSlice: { baseSize: [5, 5], insets: 1 } },\n    { kind: 'text', text: 'Hello', font: yourPackedFont,\n      origin: [12, 14], fontScale: 1,\n      color: [76, 76, 76, 255],\n      sampling: 'point', shader: 'bitmap' },\n  ]} />\n// Use complete caller-owned 128/256px font pages,\n// cellHeight and glyph metrics. Origins are global game units.\n// Images and text share one RGBA8 drawing target.`,
  'grindstone-layer': `<Grindstone title="修复与祛魔" inventoryLabel="物品栏"\n  inputs={[first, second]} result={result} invalid={invalid}\n  inventory={inventory} hotbar={hotbar}\n  imageRender={{\n    frame: { width: 2570, height: 1402, guiScale: 5 },\n    displayScale: 2.5, itemImages: true, itemModels: true,\n    text: { metrics: { lineHeight: 10, paintOffset: [0, 1] },\n      labels: yourExplicitLabelProfile },\n  }} onTakeResult={handleTake} />\n// Supply caller-owned original font pages and item profiles.\n// All 39 slots retain their normal interactions.`,
  'crafting-layer': `<CraftingScreen title="合成" layout={layout}\n  onLayoutChange={setLayout}\n  recipeBook={{ title: '全部配方', entries,\n    categoryId, onCategoryChange: setCategoryId,\n    query, onQueryChange: setQuery,\n    craftableOnly, onCraftableOnlyChange: setCraftableOnly,\n    selectedId, onRecipeAction: handleRecipe }}\n  crafting={{ inputs, result, inventory, hotbar,\n    onInputAction: handleInput,\n    onInventoryAction: handleInventory,\n    onTakeResult: handleTake }}\n  imageRender={{\n    frame: { width: 1280, height: 720, guiScale: 2 },\n    displayScale: 1, itemImages: true, itemModels: true,\n    text: yourOptionalExplicitLabelRoles,\n  }} onClose={handleClose} />\n// The host filters and flattens its recipe collection.\n// Recipe craftableCount is independent of item.count.\n// All 46 right slots retain normal actions and DOM fallback.`,
  'item-renderers': `<BlockPreview block="enchanting-table" size={48} />\n// stone, stone-bricks, stone-slab and stone-stairs\n// are also available. Supply your own camera, lighting\n// or textures when your host uses a different profile.`,
  'workstation-text': `const renderGuiText: WorkstationTextRenderer =\n  (text, context) => (\n    <BitmapText\n      {...(context.kind === 'enchantment-cost'\n        ? costTextProfile : labelTextProfile)}\n      layout="advance" style={{ display: 'block' }}>\n      {text}\n    </BitmapText>\n  );\n<EnchantingTable title="附魔台" inventoryLabel="物品栏"\n  options={options} renderText={renderGuiText} />\n// Each host profile supplies its own font, scale,\n// renderer, sampling, shader, color and shadow.`,
  processing: `<CraftingScreen\n  recipeBook={{ title: 'Recipes', entries,\n    categoryId, onCategoryChange: setCategoryId,\n    query, onQueryChange: setQuery,\n    craftableOnly, onCraftableOnlyChange: setCraftableOnly,\n    onRecipeAction: handleRecipe }}\n  crafting={{ inputs: recipeInputs, result,\n    inventory: items, onTakeResult: handleTake }} />\n// entries are filtered and flattened by your application.\n// CraftingTable also remains available as a right pane.\n<Furnace input={rawBeef} fuel={coal} result={steak}\n  progress={0.5} fuelRemaining={0.75}\n  inventory={items} onTakeResult={handleTake} />`,
  anvil: `<Anvil name={name} onNameChange={setName}\n  inputs={[item, material]} result={result}\n  cost={{kind: 'levels', levels: 3, affordable: true}}\n  onTakeResult={handleTake} />`,
  'anvil-layer': `<Anvil name={name} onNameChange={setName}\n  inputs={[item, material]} result={result} cost={cost}\n  inventory={inventory} hotbar={hotbar}\n  imageRender={{\n    frame: { width: 2570, height: 1402, guiScale: 5 },\n    itemImages: true, itemModels: true,\n    text: yourExplicitAnvilTextProfile,\n  }} onTakeResult={handleTake} />\n// Separate styles for title, inventory, name and cost.\n// The real input handles focus, selection and composition.`,
  containers: `<Chest rows={6} items={storage} inventory={inventory}\n  selectedIndex={selected} onSelectionChange={setSelected}\n  onSlotAction={handleStorageAction} />\n<Hopper items={hopperItems} inventory={inventory} />\n// Dispenser, Dropper and ShulkerBox share the same storage API.`,
};

function Example({ id, title, detail, children, className = '' }: { id: string; title: string; detail: string; children: ReactNode; className?: string }) {
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const labelId = `${id}-title`;
  return <section className={`example ${className}`} id={id} aria-labelledby={labelId}>
    <div className="example-heading"><div><h2 id={labelId}>{title}</h2><p>{detail}</p></div>
      <div className="view-toggle" role="group" aria-label={`${title} example view`}>
        <button type="button" aria-label="Preview" aria-pressed={view === 'preview'} onClick={() => setView('preview')}><PixelIcon name="grid" size={14}/><span>Preview</span></button>
        <button type="button" aria-label="Code" aria-pressed={view === 'code'} onClick={() => setView('code')}><PixelIcon name="code" size={14}/><span>Code</span></button>
      </div>
    </div>
    <div className="example-frame">{view === 'preview' ? children : <pre className="code-example"><code>{snippets[id]}</code></pre>}</div>
  </section>;
}

function App() {
  const { profile: fontProfile, setProfile: setFontProfile } = useDemoFontProfile();
  const [active, setActive] = useState('overview');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(false);
  const [explicitDialogSize, setExplicitDialogSize] = useState(false);
  const [dialogWidth, setDialogWidth] = useState(480);
  const [dialogHeight, setDialogHeight] = useState(360);
  const [docs, setDocs] = useState(false);
  const [worldName, setWorldName] = useState('My blocky world');
  const [multiplayer, setMultiplayer] = useState(true);
  const [coordinates, setCoordinates] = useState(false);
  const [renderDistance, setRenderDistance] = useState(12);
  const [selectedItem, setSelectedItem] = useState(0);
  const [load, setLoad] = useState(64);
  const [grindResult, setGrindResult] = useState(true);
  const [grindOpen, setGrindOpen] = useState(true);
  const [enchantOpen, setEnchantOpen] = useState(true);
  const [enchantInputs, setEnchantInputs] = useState(true);
  const [enchantImages, setEnchantImages] = useState('css');
  const search = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notify(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 5000);
  }
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);
  useEffect(() => {
    let cancelled = false, interacted = false;
    // The browser resolves its initial fragment before React mounts the sections.
    // Restore it after mounting/font metrics, but never pull a user back after
    // they have scrolled, typed, or followed another native anchor.
    const hash = window.location.hash;
    const restore = () => {
      if (cancelled || interacted || window.location.hash !== hash) return;
      let id: string; try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      if (navigation.some(item => item.id === id)) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
    };
    const interact = () => { interacted = true; };
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'hashchange'] as const;
    events.forEach(event => window.addEventListener(event, interact, { passive: true }));
    const frame = requestAnimationFrame(restore); void document.fonts.ready.then(restore);
    return () => { cancelled = true; cancelAnimationFrame(frame); events.forEach(event => window.removeEventListener(event, interact)); };
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !target.isContentEditable && !document.querySelector('dialog[open]')) {
        event.preventDefault(); search.current?.focus();
      }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    const ids = new Set(navigation.map(item => item.id));
    // Actual document order differs from the sidebar grouping. Read every
    // section, including ones whose sidebar links are filtered by search.
    const sections = [...document.querySelectorAll<HTMLElement>('main section[id]')].filter(section => ids.has(section.id));
    let frame = 0, cancelled = false;
    let selected = sections[0]?.id;
    const update = () => {
      frame = 0; if (cancelled || !sections.length) return;
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      let current = sections[0]!.id, closest = -Infinity;
      for (const section of sections) {
        const rect = section.getBoundingClientRect(); if (!rect.height || !rect.width) continue;
        const margin = Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
        // The same padding+margin used by native fragment navigation defines
        // the reading line; tall sections stay active after their heading exits.
        // Native scrolling rounds its offset to a CSS pixel even when font
        // metrics leave a fractional target edge just past that reading line.
        const anchorDistance = Math.floor(rect.top - padding - margin);
        // Keep the current section through a one-pixel retreat from its
        // rounded fragment anchor. This does not select the next section early.
        const atReadingLine = anchorDistance <= 0 || (section.id === selected && anchorDistance === 1);
        if (atReadingLine && rect.top >= closest) { current = section.id; closest = rect.top; }
      }
      const scrolling = document.scrollingElement;
      if (scrolling && scrolling.scrollHeight > window.innerHeight && Math.ceil(window.scrollY + window.innerHeight) >= scrolling.scrollHeight) current = sections[sections.length - 1]!.id;
      selected = current;
      setActive(previous => previous === current ? previous : current);
    };
    const schedule = () => { if (!cancelled && !frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    sections.forEach(section => observer.observe(section));
    const main = document.querySelector('main'); if (main) observer.observe(main);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule); window.addEventListener('hashchange', schedule);
    document.fonts.addEventListener('loadingdone', schedule); document.fonts.addEventListener('loadingerror', schedule);
    void document.fonts.ready.then(schedule); schedule();
    return () => {
      cancelled = true; cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); window.removeEventListener('hashchange', schedule);
      document.fonts.removeEventListener('loadingdone', schedule); document.fonts.removeEventListener('loadingerror', schedule);
    };
  }, []);
  async function copyInstall() {
    try {
      await navigator.clipboard.writeText('npm install ./mcbeui-0.1.0.tgz');
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { notify('Copy unavailable. Use the command shown next to the button.'); }
  }
  const items = [
    { name: 'Diamond sword', sprite: 'sword' as const, count: undefined },
    { name: 'Diamonds', sprite: 'diamond' as const, count: 64 },
    { name: 'Grass blocks', sprite: undefined, count: 32 },
    { name: 'Apples', sprite: 'apple' as const, count: 8 },
    { name: 'Emeralds', sprite: 'gem' as const, count: 16 },
  ];
  const swordItem: InventoryItem = {name:'Enchanted diamond sword',icon:<ItemSprite name="sword"/>,durability:.42,lore:['Sharpness IV','Unbreaking III'],nameColor:'#55ffff',enchanted:true};
  const bagItems: (InventoryItem|null)[] = [swordItem,{name:'Lapis lazuli stack',icon:<ItemSprite name="lapis"/>,count:32},{name:'Emerald stack',icon:<ItemSprite name="gem"/>,count:16},null,{name:'Apple stack',icon:<ItemSprite name="apple"/>,count:8}];

  return <div className="docs-app">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar">
      <a className="brand" href="#overview" aria-label="mcbeui home"><GrassBlock size={32}/><span>mcbe<span className="brand-ui">ui</span></span></a>
      <span className="brand-divider"/><span className="brand-caption">A little more blocky.</span>
      <nav aria-label="Primary" className="top-nav"><a href="#buttons">Components</a><a href="./calibration.html">Pixel lab</a><button type="button" onClick={() => setDocs(true)}>Documentation <span aria-hidden="true">↗</span></button><Badge>v0.1.0</Badge></nav>
    </header>

    <aside className="sidebar" aria-label="Documentation sidebar">
      <div className="search"><PixelIcon name="search" size={16}/><input ref={search} type="search" aria-label="Find a component" placeholder="Find a component..." value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setQuery(''); search.current?.blur(); } }}/><kbd>/</kbd></div>
      <div className="nav-group-label">GETTING STARTED</div>
      <nav aria-label="Component navigation">
        {navigation.filter(item => item.name.toLowerCase().includes(query.toLowerCase())).map((item, index) => <div key={item.id}>
          {item.id === 'buttons' && <div className="nav-group-label components-label">COMPONENTS <span>{componentCount}</span></div>}
          <a className={`sidebar-link ${active === item.id ? 'is-active' : ''}`} href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined}>
            <PixelIcon name={index === 0 && item.id === 'overview' ? 'grid' : item.icon} size={14}/><span>{item.name}</span>{item.count && <small>{item.count}</small>}
          </a>
        </div>)}
        {navigation.filter(item => item.name.toLowerCase().includes(query.toLowerCase())).length === 0 && <p className="search-empty">No components found.</p>}
      </nav>
      <div className="sidebar-bottom"><div className="tiny-grass"><GrassBlock size={24}/><span>Built for your next world.</span></div><p>React + TypeScript<br/>Zero runtime dependencies*</p><span className="sidebar-footnote">* React and React DOM are peers.</span></div>
    </aside>

    <main id="main" className="main-content">
      <section className="hero" id="overview" aria-labelledby="hero-title">
        <div className="hero-copy"><div className="eyebrow"><span className="status-pixel"/> MINECRAFT BEDROCK INSPIRED</div>
          <h1 id="hero-title">Build something<br/> <span>blocky.</span></h1>
          <p className="hero-description">The familiar feel of Bedrock. Crafted for React.<br className="desktop-break"/> Pixel borders, tactile buttons, endless possibilities.</p>
          <div className="hero-actions"><a className="hero-cta" href="#buttons">Explore components <PixelIcon name="arrow" size={18}/></a><button className="hero-docs" type="button" onClick={() => setDocs(true)}>Get started <span aria-hidden="true">↗</span></button></div>
          <div className="hero-tags"><span><PixelIcon name="check" size={12}/>Fully typed</span><span><PixelIcon name="check" size={12}/>Keyboard ready</span><span><PixelIcon name="check" size={12}/>Open source</span></div>
        </div>
        <div className="hero-art"><VoxelIsland/><div className="art-caption"><span>01</span> A WORLD OF POSSIBILITIES</div></div>
      </section>

      <div className="install-strip"><span className="install-prompt" aria-hidden="true">$</span><code>npm install ./mcbeui-0.1.0.tgz</code><span className="local-tag">local package</span><button type="button" onClick={copyInstall} aria-label={copied ? 'Copy: install command copied' : 'Copy install command'}><PixelIcon name={copied ? 'check' : 'copy'} size={16}/>{copied ? 'Copied' : 'Copy'}</button></div>
      <div className="section-intro"><div><span className="eyebrow">THE BUILDING BLOCKS</span><h2>Familiar pixels. Real components.</h2></div><span className="section-counter">{componentCount} COMPONENTS <span>↓</span></span></div>

      <Example id="buttons" title="Buttons" detail="That satisfying click. Every single time.">
        <div className="button-showcase"><div className="button-samples">
          <div className="sample"><Button variant="primary" startIcon={<PixelIcon name="plus" size={16}/>} onClick={() => setDialog(true)}>Create new world</Button><span className="sample-label">PRIMARY</span></div>
          <div className="sample"><Button onClick={() => notify('Settings saved.')}>Settings</Button><span className="sample-label">SECONDARY</span></div>
          <div className="sample"><Button disabled>Unavailable</Button><span className="sample-label">DISABLED</span></div>
          <div className="sample"><IconButton aria-label="Open settings" onClick={() => setDocs(true)}><PixelIcon name="settings"/></IconButton><span className="sample-label">ICON</span></div>
        </div><div className="example-bottom"><span>Hard edges. Layered bevels. No rounded corners.</span><code>&lt;Button /&gt;</code></div></div>
      </Example>

      <div className="examples-two-col">
        <Example id="inputs" title="Inputs & combobox" detail="Give your next adventure a name.">
          <div className="demo-stack"><TextField label="World name" name="worldName" value={worldName} onChange={event => setWorldName(event.target.value)} placeholder="Enter a world name"/>
            <Combobox label="Difficulty" name="difficulty" defaultValue="normal" options={[{ value: 'peaceful', label: 'Peaceful' }, { value: 'easy', label: 'Easy' }, { value: 'normal', label: 'Normal' }, { value: 'hard', label: 'Hard' }]}/>
            <TextArea label="World description" rows={2} placeholder="Every great world starts with an idea..."/>
          </div>
        </Example>
        <Example id="selection" title="Selection" detail="Your world. Your rules.">
          <div className="demo-stack"><Switch label="Multiplayer game" description="Let friends join your adventure." checked={multiplayer} onChange={event => setMultiplayer(event.target.checked)}/>
            <Separator/><Checkbox label="Show coordinates" checked={coordinates} onChange={event => setCoordinates(event.target.checked)}/>
            <RadioGroup label="Default game mode" name="gamemode" orientation="horizontal" defaultValue="survival" options={[{ value: 'survival', label: 'Survival' }, { value: 'creative', label: 'Creative' }]}/>
            <Slider label="Render distance" min={4} max={32} value={renderDistance} onValueChange={setRenderDistance} formatValue={value => `${value} chunks`}/>
          </div>
        </Example>
      </div>

      <Example id="input-states" title="Input states" detail="Inset edges, text shadows, and every state.">
        <div className="input-state-grid">
          <TextField label="World name · error" defaultValue="My world" error="This world name is already taken."/>
          <TextField label="World seed · disabled" defaultValue="8675309" disabled/>
          <TextField label="World ID · read only" defaultValue="MC-0420" readOnly description="Select and copy this world ID."/>
        </div>
      </Example>

      <Example id="navigation" title="Tabs" detail="Everything in its place. Arrow keys included.">
        <div className="demo-padded"><Tabs label="World settings" items={[
          { value: 'game', label: <><PixelIcon name="settings" size={16}/> Game</>, content: <div className="tab-content"><div><h3>Make it your world.</h3><p>Set the rules, choose your mode, and start your adventure.</p></div><Badge variant="success">Survival</Badge></div> },
          { value: 'video', label: <><PixelIcon name="sun" size={16}/> Video</>, content: <Slider label="Brightness" defaultValue={75} formatValue={n => `${n}%`}/> },
          { value: 'audio', label: 'Audio', content: <Slider label="Master volume" defaultValue={100} formatValue={n => `${n}%`}/> },
          { value: 'locked', label: 'Experiments', disabled: true, content: 'Coming soon' },
        ]}/></div>
      </Example>

      <div className="examples-two-col">
        <Example id="feedback" title="Feedback" detail="Small signals. A big difference.">
          <div className="demo-stack"><div className="badge-row"><Badge>Default</Badge><Badge variant="success">Stable</Badge><Badge variant="warning">Experimental</Badge></div>
            <Progress label="Generating world" value={load} showValue/>
            <div className="progress-controls"><button type="button" onClick={() => setLoad(n => Math.max(0, n - 16))} aria-label="Decrease progress −16">−16</button><span>Try the progress bar</span><button type="button" onClick={() => setLoad(n => Math.min(100, n + 16))} aria-label="Increase progress +16">+16</button></div>
            <Alert variant="success" title="World saved">Your next adventure is ready.</Alert>
          </div>
        </Example>
        <Example id="surfaces" title="Panels & dialogs" detail="A home for every interaction.">
          <div className="demo-stack"><Panel title={<><PixelIcon name="book" size={16}/> World settings</>} footer={<Button size="sm" fullWidth onClick={() => setDialog(true)}>Open dialog <PixelIcon name="arrow" size={16}/></Button>}>
            <div className="world-card"><ItemSprite name="grass"/><div><span>{worldName || 'Untitled world'}</span><small>Survival · Normal difficulty</small></div></div>
          </Panel>
            <Checkbox label="Set dialog dimensions" checked={explicitDialogSize} onChange={event => setExplicitDialogSize(event.target.checked)}/>
            {explicitDialogSize && <>
              <Slider label="Dialog width" min={320} max={800} step={20} value={dialogWidth} onValueChange={setDialogWidth} formatValue={value => `${value}px`}/>
              <Slider label="Dialog height" min={240} max={600} step={20} value={dialogHeight} onValueChange={setDialogHeight} formatValue={value => `${value}px`}/>
            </>}
          </div>
        </Example>
      </div>

      <Example id="inventory" title="Item slots" detail="A few things for the journey.">
        <div className="inventory-preview"><div className="inventory-main"><div className="inventory-bar">{items.map((item, index) => <ItemSlot key={item.name} label={item.name} count={item.count} selected={selectedItem === index} onClick={() => setSelectedItem(index)}><ItemSprite name={item.sprite ?? 'grass'}/></ItemSlot>)}
          {[5,6,7,8].map(index => <ItemSlot key={index} label={`Empty slot ${index + 1}`} selected={selectedItem === index} onClick={() => setSelectedItem(index)}/>)}</div>
          <span className="inventory-selection" aria-live="polite">{items[selectedItem]?.name ?? 'Empty slot'}</span></div>
          <div className="inventory-note"><PixelIcon name="heart" size={20}/><span>A familiar place<br/>for your favorite things.</span></div></div>
      </Example>

      <Example id="inventory-states" title="ItemSlot, rebuilt" detail="Container cells, 16×16 item art, counts, durability, and item tooltips.">
        <div className="demo-stack"><div className="slot-state-examples">
          <div><ItemSlot label="Empty revised slot"/><span>EMPTY</span></div>
          <div><ItemSlot item={{name:'Single emerald',icon:<ItemSprite name="gem"/>,count:1}}/><span>SINGLE</span></div>
          <div><ItemSlot item={{name:'Full emerald stack',icon:<ItemSprite name="gem"/>,count:64}}/><span>STACK</span></div>
          <div><ItemSlot item={swordItem}/><span>DURABILITY</span></div>
          <div><ItemSlot item={{name:'Selected apple',icon:<ItemSprite name="apple"/>}} selected/><span>SELECTED</span></div>
          <div><ItemSlot item={{name:'Unavailable emerald',icon:<ItemSprite name="gem"/>}} disabled/><span>DISABLED</span></div>
        </div><InventoryGrid label="Interactive inventory" items={bagItems} size={18} onSlotAction={(index,action)=>notify(`${action === 'secondary' ? 'Secondary action' : 'Selected'}: slot ${index+1}`)}/>
        <p className="inventory-help">Arrow keys move between slots. Enter selects. Right-click or Shift+F10 triggers the secondary action. Escape dismisses an item tooltip.</p></div>
      </Example>

      <Example id="item-glint" title="Item glint" detail="A reusable material renderer with controlled phase, original texture and explicit composition."><ItemGlintExamples/></Example>
      <Example id="item-renderers" title="Block items" detail="Original block textures on reusable item meshes.">
        <div style={{ padding: 24, minWidth: 0 }}><ItemRenderersExamples/></div>
      </Example>
      <Example id="bitmap-text" title="Original bitmap text" detail="Caller-owned glyph pages, explicit metrics and sampling. The original Unicode sample preserves native glyph shapes; whole-UI edge sampling is still under calibration."><BitmapTextExamples/></Example>

      <Example id="workstations" title="Workstation GUIs" detail="Classic Bedrock container layouts, exposed as React components.">
        <div className="workstation-examples">
          <div><h3>Grindstone</h3>{grindOpen && <Grindstone inputs={[swordItem,null]} result={grindResult ? {...swordItem,enchanted:false,lore:['Repaired item']} : null} inventory={bagItems}
            onClose={()=>setGrindOpen(false)}
            onInputAction={(index,action)=>notify(`${action}: grindstone input ${index+1}`)}
            onTakeResult={()=>{setGrindResult(false);notify('Grindstone result taken.');}}
            onInventoryAction={(index,action)=>notify(`${action}: inventory slot ${index+1}`)}/>}
            <Button size="sm" onClick={()=>{setGrindResult(true);setGrindOpen(true);}}>Reset grindstone example</Button></div>
          <div><h3>Enchanting table</h3>
            <Combobox label="Enchanting image layout" value={enchantImages} onValueChange={setEnchantImages}
              options={[{value:'css',label:'CSS skin'},{value:'4',label:'Original images · GUI 4'},{value:'5',label:'Original images · GUI 5'}]}/>
            {enchantOpen ? <EnchantingTable item={enchantInputs ? {name:'Diamond sword',icon:<ItemSprite name="sword"/>} : null} lapis={enchantInputs ? {name:'Lapis lazuli',icon:<ItemSprite name="lapis"/>,count:32} : null} inventory={bagItems}
            imageRender={enchantImages === 'css' ? undefined : {frame:{width:2570,height:1402,guiScale:Number(enchantImages)}}}
            onClose={()=>setEnchantOpen(false)}
            book={<EnchantingBook open={enchantInputs ? 1 : 0}/>}
            options={enchantInputs ? [{id:'unbreaking',label:'Unbreaking I',level:3,runes:runeAtlasUrl ? <EnchantingRunes atlasUrl={runeAtlasUrl} text="elder light"/> : undefined},{id:'sharpness',label:'Sharpness III',level:15,runes:runeAtlasUrl ? <EnchantingRunes atlasUrl={runeAtlasUrl} text="bless creature"/> : undefined},{id:'fortune',label:'Fortune III',level:30,disabled:true,runes:runeAtlasUrl ? <EnchantingRunes atlasUrl={runeAtlasUrl} text="enchant scroll"/> : undefined}] : []}
            onEnchant={id=>notify(`Enchantment requested: ${id}`)} onInputAction={slot=>notify(`Selected enchanting ${slot} slot.`)}/> : <Button onClick={()=>setEnchantOpen(true)}>Open enchanting table</Button>}
            <Button size="sm" onClick={()=>setEnchantInputs(value=>!value)}>{enchantInputs ? 'Clear enchanting inputs' : 'Restore enchanting inputs'}</Button></div>
        </div><p className="workstation-note">Original game materials. Item movement and crafting rules are supplied by your app. The book uses a textured renderer reconstruction; its native camera and mesh are still being calibrated.</p>
      </Example>

      <Example id="workstation-text" title="Workstation text" detail="One text renderer for titles, inventory labels and enchantment costs.">
        <div style={{ padding: 24, minWidth: 0 }}><WorkstationTextExamples notify={notify}/></div>
      </Example>

      <Example id="gui-layer" title="Composed GUI" detail="Original images and glyphs drawn together, with live workstation controls."><GuiLayerExamples/></Example>
      <Example id="grindstone-layer" title="Source Grindstone" detail="Original images, item models and optional local glyphs with all 39 slots interactive."><GrindstoneLayerExamples/></Example>
      <Example id="crafting-layer" title="Source Crafting" detail="A complete recipe book and workbench, with source images, model fallbacks and 46 interactive slots."><CraftingLayerExamples/></Example>
      <Example id="books" title="Books & writing" detail="Two-page reading, editable pages and a signing cover with original textures."><BookExamples notify={notify}/></Example>
      <Example id="signs" title="Signs" detail="Regular and hanging signs with original textures and real text input."><SignExamples notify={notify}/></Example>
      <Example id="jigsaw" title="Jigsaw editor" detail="Bedrock identifier fields, priorities and joint type with reusable form controls."><JigsawExamples notify={notify}/></Example>
      <Example id="command-block" title="Command blocks" detail="Block modes, expandable command input and previous output using reusable controls."><CommandBlockExamples notify={notify}/></Example>
      <Example id="structure-editor" title="Structure editor" detail="Save, load, corner, data and 3D export forms with reusable XYZ fields and caller-supplied previews."><StructureEditorExamples notify={notify}/></Example>
      <Example id="server-forms" title="Server forms" detail="Schema-driven action and custom forms with caller-owned values, icons and response requests."><ServerFormsExamples notify={notify}/></Example>
      <Example id="npc" title="NPC dialogue & editor" detail="Dialogue, appearance and command or URL editing with reusable portrait and action controls."><NpcExamples notify={notify}/></Example>
      <Example id="emote-wheel" title="Emote wheel" detail="Four original wheel slices, whole state textures and reusable empty, text or host-image previews."><EmoteWheelExamples/></Example>

      <Example id="processing" title="Crafting & smelting" detail="Shared recipe slots, processing arrows, fuel indicators and player inventory.">
        <ProcessingExamples notify={notify}/>
      </Example>

      <Example id="anvil" title="Anvil" detail="Original rename field, repair slots and experience cost states.">
        <AnvilExamples notify={notify}/>
      </Example>
      <Example id="anvil-layer" title="Source Anvil" detail="Original images and optional local glyphs, with editable names and all 39 slots interactive."><AnvilLayerExamples/></Example>

      <Example id="containers" title="Storage containers" detail="Source-sized chests, shulker boxes, hoppers, dispensers and droppers.">
        <ContainerExamples notify={notify}/>
      </Example>

      <NativeExamples notify={notify}/>
      <ExpansionExamples notify={notify}/>
      <Example id="game-lists" title="Worlds, servers & packs" detail="Reusable Classic list rows and cards with original state textures."><GameListsExamples notify={notify}/></Example>
      <SystemScreensExamples/>
      <GameControlsExamples/>
      <TradingMountsExamples notify={notify}/>
      <Example id="inventory-screens" title="Player & creative inventory" detail="Complete Survival inventory, reusable screen frame, equipment and creative panes."><InventoryScreensExamples notify={notify}/></Example>
      <Example id="scrolling" title="Scrolling" detail="Native scrolling with original Bedrock rail and handle textures.">
        <div style={{padding:24}}><ScrollArea label="Scrollable inventory notes" style={{height:180,maxWidth:480}}>
          {Array.from({length:12},(_,index)=><p key={index} style={{margin:0,padding:12}}>Inventory note {index+1} · Wheel, touch and keyboard</p>)}
        </ScrollArea></div>
      </Example>
      <Example id="typography" title="Typography & icons" detail="The details that make it feel like home.">
        <ClassicFontExamples profile={fontProfile} onProfileChange={setFontProfile}/>
        <div className="type-showcase"><div><span className="sample-label">{fontProfile === 'classic' ? 'CLASSIC BITMAP · LOCAL SOURCE' : fontProfile === 'local' ? 'MOJANGLES · LOCAL TTF' : 'MCBE PIXEL · OPEN FONT'}</span><Text as="p" size="lg" className="font-specimen">Aa Bb Cc 0123</Text><span className="type-subtitle">{fontProfile === 'classic' ? 'Source bitmap cells and hard-edged shadows.' : fontProfile === 'local' ? 'Local TTF glyphs and hard-edged shadows.' : 'Open pixel glyphs and hard-edged shadows.'}</span>
          <div className="font-shadow-comparison"><div><span className="sample-label">SHADOW ON</span><Text>Hello, Minecraft!</Text></div><div><span className="sample-label">SHADOW OFF</span><Text shadow={false}>Hello, Minecraft!</Text></div></div>
        </div>
          <div className="chinese-specimen" lang="zh-CN"><span className="sample-label" lang="en">{fontProfile === 'classic' ? 'CLASSIC BITMAP · 简体中文' : 'FUSION PIXEL · 简体中文'}</span><p style={fontProfile === 'classic' ? { fontFamily: 'var(--mc-font)', fontSize: 20 } : undefined}>创造属于你的世界</p><span className="type-subtitle" lang="en">{fontProfile === 'classic' ? 'Original cells. Caller-owned font resources.' : 'Self-hosted open CJK fallback.'}</span></div>
        </div>
        <div className="icon-specimen">{(['heart', 'settings', 'book', 'grid', 'code', 'search', 'plus', 'check', 'sun', 'moon', 'download', 'arrow'] as const).map(name => <span key={name} title={name}><PixelIcon name={name} size={24}/></span>)}<span className="type-subtitle">16 vector pixel icons</span><a href="#gui-icons">Browse 150 original GUI icons →</a></div>
        <div className="font-note"><PixelIcon name="info" size={14}/><span>The font profile applies to the whole page, including inputs and popups. Original-derived fonts remain local; the package includes open alternatives.</span></div>
      </Example>

      <Example id="gui-icons" title="Original GUI icons" detail="150 original Bedrock images for navigation, settings, feedback, social, inventory and devices.">
        <GuiIconsExamples/>
      </Example>

      <footer className="page-footer"><div className="footer-brand"><GrassBlock size={24}/><span>mcbeui</span><span className="footer-dot">·</span><span>Made of little squares.</span></div><p>An independent fan project. Not affiliated with Mojang or Microsoft.</p><span className="footer-issue">Classic Bedrock inspired · v0.1.0</span></footer>
    </main>
    <div className={`toast ${notice ? 'toast--visible' : ''}`} role="status">{notice && <><PixelIcon name="check" size={16}/>{notice}</>}</div>
    <Dialog open={dialog} onOpenChange={setDialog} title="Create new world" width={explicitDialogSize ? dialogWidth : undefined} height={explicitDialogSize ? dialogHeight : undefined} description="Every great adventure starts with a name. What will you call yours?" footer={<><Button onClick={() => setDialog(false)}>Cancel</Button><Button variant="primary" type="submit" form="create-world-form">Create world</Button></>}>
      <form id="create-world-form" onSubmit={event => { event.preventDefault(); setDialog(false); notify(`World created: ${worldName.trim()}`); }}>
        <TextField label="New world name" name="worldName" value={worldName} required pattern=".*\S.*" onChange={event => setWorldName(event.target.value)}/>
      </form>
    </Dialog>
    <Dialog open={docs} onOpenChange={setDocs} title="Start building" description="Build the package, install the local tarball, and import the components you need." footer={<Button variant="primary" fullWidth onClick={() => setDocs(false)}>Got it. Let’s build.</Button>}>
      <pre className="docs-code"><code>{`# In this repository\nnpm run build\nnpm pack\n\n# In your React app\nnpm install /path/to/mcbeui-0.1.0.tgz`}</code></pre>
      <pre className="docs-code"><code>{`import { Button } from 'mcbeui';\nimport 'mcbeui/styles.css';\nimport 'mcbeui/fonts.css';\n\n<Button variant="primary">Play</Button>`}</code></pre>
      <p className="docs-note">React 18.3 / 19 · ESM · TypeScript declarations<br/>See README.md for every component and prop.</p>
    </Dialog>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
