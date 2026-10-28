import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Checkbox, PixelIcon, Select, Slider, Switch } from '../src';
import { Beacon, Crafter, Loom, Stonecutter } from '../src/advanced-workstations';
import type { BeaconEffectId, BeaconEffectState, BeaconPrimaryEffect, RecipeSelectionOption } from '../src/advanced-workstations';
import { ActionBar, BossBar, ChatMessage, ChatPanel, HeldItemTooltip, Scoreboard, StatusEffect, TitleOverlay } from '../src/hud-overlays';
import { KeybindingField, NavigationList, SearchField, SettingRow, ToggleButton } from '../src/settings-controls';
import { Spinner, Toast, Tooltip } from '../src/feedback';
import type { InventoryItem } from '../src/inventory';
import { GameItemIcon } from './materials';
import type { GameItemName } from './materials';
import './expansion-examples.css';

type Notify = (message: string) => void;
function material(key: GameItemName, name: string, count = 1): InventoryItem {
  return { name, count, icon: <GameItemIcon name={key}/> };
}
const inventory = [material('diamond', 'Diamond', 32), material('gem', 'Emerald', 16), material('goldIngot', 'Gold ingot', 16),
  material('ironIngot', 'Iron ingot', 16), material('netheriteIngot', 'Netherite ingot'), material('redDye', 'Red dye', 16),
  material('flowerBannerPattern', 'Flower banner pattern'), material('stick', 'Stick', 32), material('sword', 'Diamond sword')];
const stone: InventoryItem = { name: 'Stone', count: 64, lore: ['Native block item renderer required.'] };
const whiteBanner: InventoryItem = { name: 'White banner', lore: ['Native banner item renderer required.'] };
const stoneRecipes: readonly RecipeSelectionOption[] = [
  { id: 'stone-bricks', label: 'Stone bricks', item: { name: 'Stone bricks' } },
  { id: 'stone-slab', label: 'Stone slab', item: { name: 'Stone slab' } },
  { id: 'stone-stairs', label: 'Stone stairs', item: { name: 'Stone stairs' } },
];
const loomPatterns: readonly RecipeSelectionOption[] = [
  { id: 'flower', label: 'Flower charge' }, { id: 'stripe', label: 'Center stripe' }, { id: 'cross', label: 'Cross' },
];

function Section({ id, title, detail, code, children }: { id: string; title: string; detail: string; code: string; children: ReactNode }) {
  const [view, setView] = useState<'preview' | 'code'>('preview');
  return <section className="example" id={id} aria-labelledby={`${id}-title`}>
    <div className="example-heading"><div><h2 id={`${id}-title`}>{title}</h2><p>{detail}</p></div>
      <div className="view-toggle" role="group" aria-label={`${title} example view`}>
        <button type="button" aria-label="Preview" aria-pressed={view === 'preview'} onClick={() => setView('preview')}><PixelIcon name="grid" size={14}/><span>Preview</span></button>
        <button type="button" aria-label="Code" aria-pressed={view === 'code'} onClick={() => setView('code')}><PixelIcon name="code" size={14}/><span>Code</span></button>
      </div>
    </div>
    <div className="example-frame">{view === 'preview' ? children : <pre className="code-example"><code>{code}</code></pre>}</div>
  </section>;
}

function AdvancedWorkstationExamples({ notify }: { notify: Notify }) {
  const [recipe, setRecipe] = useState('stone-bricks'), [pattern, setPattern] = useState('flower');
  const [stoneTaken, setStoneTaken] = useState(false), [bannerTaken, setBannerTaken] = useState(false);
  const [primaryEffect, setPrimaryEffect] = useState<BeaconPrimaryEffect>('speed'), [secondaryEffect, setSecondaryEffect] = useState<'regeneration' | 'extra'>('regeneration'), [beaconOpen, setBeaconOpen] = useState(true);
  const [powered, setPowered] = useState(false), [crafterOpen, setCrafterOpen] = useState(true), [disabledSlots, setDisabledSlots] = useState<readonly number[]>([0, 2, 3, 5, 6, 8]);
  const crafterItems: readonly (InventoryItem | null)[] = [null, material('diamond', 'Diamond'), null, null, material('diamond', 'Diamond'), null, null, material('stick', 'Stick'), null];
  const effects: Partial<Record<BeaconEffectId, BeaconEffectState>> = {};
  for (const id of ['speed', 'haste', 'resistance', 'jump-boost', 'strength', 'regeneration', 'extra'] as const) {
    effects[id] = { visible: true, enabled: true, selected: id === primaryEffect || id === secondaryEffect };
  }
  const reset = () => { setRecipe('stone-bricks'); setPattern('flower'); setStoneTaken(false); setBannerTaken(false); setPrimaryEffect('speed'); setSecondaryEffect('regeneration'); setBeaconOpen(true); setPowered(false); setCrafterOpen(true); setDisabledSlots([0, 2, 3, 5, 6, 8]); };
  return <Section id="advanced-workstations" title="More native workstations" detail="Stonecutting, loom patterns, beacon powers and the crafter grid."
    code={`<Stonecutter input={stone} recipes={recipes}\n  selectedRecipeId={recipe} onRecipeSelect={setRecipe}\n  result={result} onTakeResult={takeResult} />\n\n<Loom inputs={[banner, dye, patternItem]}\n  patterns={patterns} selectedPatternId={pattern}\n  onPatternSelect={setPattern} bannerPreview={nativePreview} />\n\n<Beacon payment={emerald} effects={effects}\n  onEffectSelect={selectEffect} canConfirm onConfirm={applyEffect} />\n\n<Crafter items={items} disabledSlots={disabledSlots}\n  powered={powered} output={output}\n  onSlotAction={handleSlot} onSlotEnabledChange={setSlotEnabled} />`}>
    <div className="expansion-controls">
      <Select label="Stonecutter recipe" value={recipe} options={stoneRecipes.map(option => ({ value: option.id, label: option.label }))}
        onChange={event => { setRecipe(event.currentTarget.value); setStoneTaken(false); }}/>
      <Select label="Loom pattern" value={pattern} options={loomPatterns.map(option => ({ value: option.id, label: option.label }))}
        onChange={event => { setPattern(event.currentTarget.value); setBannerTaken(false); }}/>
      <Checkbox label="Crafter powered" checked={powered} onChange={event => setPowered(event.target.checked)}/>
      <Button size="sm" onClick={reset}>Reset workstations</Button></div>
    <div className="workstation-examples expansion-advanced-grid">
      <div className="expansion-dual-card"><h3>Stonecutter</h3><Stonecutter input={stone} recipes={stoneRecipes} selectedRecipeId={recipe}
        onRecipeSelect={id => { setRecipe(id); setStoneTaken(false); notify(`Stonecutter recipe: ${stoneRecipes.find(option => option.id === id)?.label ?? id}`); }}
        result={stoneTaken ? null : { name: stoneRecipes.find(option => option.id === recipe)?.label ?? 'Stone bricks', count: recipe === 'stone-slab' ? 2 : 1 }}
        inventory={inventory} onInputAction={action => notify(`${action}: stonecutter input`)}
        onTakeResult={action => { setStoneTaken(true); notify(`${action}: stonecutter result taken.`); }}/></div>
      <div className="expansion-dual-card"><h3>Loom</h3><Loom inputs={[whiteBanner, material('redDye', 'Red dye', 16), material('flowerBannerPattern', 'Flower banner pattern')]}
        patterns={loomPatterns} selectedPatternId={pattern} showInputOverlays={[false, false, false]}
        onPatternSelect={id => { setPattern(id); setBannerTaken(false); notify(`Loom pattern: ${id}`); }}
        result={bannerTaken ? null : { name: 'Red patterned banner', lore: ['Native banner item renderer required.'] }}
        inventory={inventory} onInputAction={(index, action) => notify(`${action}: loom input ${index + 1}`)}
        onTakeResult={action => { setBannerTaken(true); notify(`${action}: loom result taken.`); }}/></div>
      <div className="expansion-beacon-card"><h3>Beacon</h3>{beaconOpen ? <Beacon payment={material('gem', 'Emerald')} inventory={inventory}
        acceptedItems={[material('netheriteIngot', 'Netherite ingot'), material('gem', 'Emerald'), material('diamond', 'Diamond'), material('goldIngot', 'Gold ingot'), material('ironIngot', 'Iron ingot')]}
        effects={effects} extraEffect={primaryEffect} onEffectSelect={id => {
          if (id === 'regeneration' || id === 'extra') setSecondaryEffect(id); else setPrimaryEffect(id);
          notify(`Beacon power: ${id}`);
        }} canConfirm
        onPaymentAction={action => notify(`${action}: beacon payment`)} onConfirm={() => notify(`Applied beacon powers: ${primaryEffect}, ${secondaryEffect}`)}
        onCancel={() => { setBeaconOpen(false); notify('Beacon selection cancelled.'); }} onClose={() => setBeaconOpen(false)}/>
        : <Button onClick={() => setBeaconOpen(true)}>Open beacon</Button>}</div>
      <div><h3>Crafter</h3>{crafterOpen ? <Crafter items={crafterItems} inventory={inventory} disabledSlots={disabledSlots} powered={powered}
        output={material('sword', 'Diamond sword')} onClose={() => setCrafterOpen(false)}
        onSlotAction={(index, action) => {
          if (!crafterItems[index]) setDisabledSlots(previous => previous.includes(index) ? previous : [...previous, index]);
          notify(`${action}: crafter slot ${index + 1}`);
        }} onSlotEnabledChange={(index, enabled) => setDisabledSlots(previous => enabled ? previous.filter(value => value !== index) : [...new Set([...previous, index])])}/>
        : <Button onClick={() => setCrafterOpen(true)}>Open crafter</Button>}</div>
    </div>
    <p className="workstation-note">Gold, iron, dye and pattern items use original PNGs. Stone blocks and banners use native renderers without flat item PNGs, so those slots retain names and counts while their artwork stays empty. Your app can supply their renderer output.</p>
  </Section>;
}

function HudOverlayExamples({ notify }: { notify: Notify }) {
  const [bossHealth, setBossHealth] = useState(65), [showTitle, setShowTitle] = useState(true), [showAction, setShowAction] = useState(true);
  const [messages, setMessages] = useState<readonly { id: string; text: ReactNode }[]>([
    { id: 'welcome', text: '<Alex> Ready to build?' }, { id: 'reply', text: '<Steve> Meet at the beacon.' },
  ]);
  const [chat, setChat] = useState(''), [score, setScore] = useState(12), [effect, setEffect] = useState<'speed' | 'fire-resistance' | 'regeneration'>('speed');
  return <Section id="hud-overlays" title="HUD overlays" detail="Boss health, chat, scores, effects and the text shown over the game view."
    code={`<BossBar name="Wither" value={0.65} />\n<ChatPanel input messages={messages} value={message}\n  onValueChange={setMessage} onSend={sendMessage} />\n<ChatMessage>{'<Alex> Ready to build?'}</ChatMessage>\n<Scoreboard title="Builders" entries={scores} />\n<StatusEffect name="Speed" effect="speed" duration="2:30" />\n<ActionBar>Checkpoint reached</ActionBar>\n<TitleOverlay title="Adventure awaits" subtitle="Find the stronghold" />\n<HeldItemTooltip>Diamond sword</HeldItemTooltip>`}>
    <div className="expansion-controls">
      <Slider label="Boss health" min={0} max={100} step={1} value={bossHealth} onValueChange={setBossHealth} formatValue={value => `${value}%`}/>
      <Slider label="Alex score" min={0} max={30} step={1} value={score} onValueChange={setScore}/>
      <Select label="Status effect" value={effect} options={[{ value: 'speed', label: 'Speed' }, { value: 'fire-resistance', label: 'Fire resistance' }, { value: 'regeneration', label: 'Regeneration' }]}
        onChange={event => setEffect(event.currentTarget.value === 'fire-resistance' ? 'fire-resistance' : event.currentTarget.value === 'regeneration' ? 'regeneration' : 'speed')}/>
      <Checkbox label="Show title" checked={showTitle} onChange={event => setShowTitle(event.target.checked)}/>
      <Checkbox label="Show action bar" checked={showAction} onChange={event => setShowAction(event.target.checked)}/>
    </div>
    <div className="expansion-demo-grid">
      <div className="expansion-surface expansion-surface--wide" tabIndex={0} role="region" aria-label="Boss health preview"><h3>Boss health</h3><BossBar name="Wither" value={bossHealth / 100}/></div>
      <div className="expansion-surface expansion-surface--wide" tabIndex={0} role="region" aria-label="Titles and messages preview"><h3>Titles & messages</h3>
        <div className="expansion-title-stage">{showTitle && <TitleOverlay title="Adventure awaits" subtitle="Find the stronghold"/>}</div>
        <div className="expansion-overlay-row">{showAction && <ActionBar>Checkpoint reached</ActionBar>}</div>
        <div className="expansion-overlay-row"><HeldItemTooltip>Diamond sword</HeldItemTooltip></div>
      </div>
      <div className="expansion-surface expansion-surface--wide"><h3>Chat</h3>
        <ChatMessage>Server: Welcome to the world.</ChatMessage>
        <ChatPanel input messages={messages} value={chat} onValueChange={setChat}
          onSend={message => { setMessages(previous => [...previous, { id: `message-${Date.now()}`, text: `<You> ${message}` }]); setChat(''); notify('Chat message added to this local example.'); }}/>
      </div>
      <div className="expansion-surface"><h3>Scoreboard</h3><Scoreboard title="Builders" entries={[{ id: 'alex', name: 'Alex', score }, { id: 'steve', name: 'Steve', score: 8 }]}/></div>
      <div className="expansion-surface"><h3>Active effect</h3><StatusEffect name={effect === 'fire-resistance' ? 'Fire resistance' : effect === 'regeneration' ? 'Regeneration' : 'Speed'} effect={effect} duration="2:30"/></div>
    </div>
  </Section>;
}

function SettingsExamples({ notify }: { notify: Notify }) {
  const [category, setCategory] = useState('all'), [query, setQuery] = useState('');
  const [music, setMusic] = useState(true), [fullscreen, setFullscreen] = useState(false), [leftHand, setLeftHand] = useState(false);
  const [distance, setDistance] = useState(12), [keybinding, setKeybinding] = useState('KeyE');
  const rows = [
    { id: 'music', category: 'general', label: 'Music', description: 'Play background music.', content: <SettingRow label="Music" description="Play background music.">{binding => <Switch {...binding} label="" checked={music} onChange={event => setMusic(event.target.checked)}/>}</SettingRow> },
    { id: 'fullscreen', category: 'video', label: 'Fullscreen', description: 'Toggle the example setting.', content: <SettingRow label="Fullscreen" description="Toggle the example setting.">{binding => <ToggleButton {...binding} pressed={fullscreen} onPressedChange={setFullscreen}>Fullscreen</ToggleButton>}</SettingRow> },
    { id: 'distance', category: 'video', label: 'Render distance', description: 'Choose the visible chunk radius.', content: <SettingRow label="Render distance" description="Choose the visible chunk radius.">{binding => <Slider {...binding} label="" min={4} max={32} step={1} value={distance} onValueChange={setDistance} formatValue={value => `${value} chunks`}/>}</SettingRow> },
    { id: 'left-hand', category: 'controls', label: 'Left handed', description: 'Place the main hand on the left.', content: <SettingRow label="Left handed" description="Place the main hand on the left.">{binding => <Switch {...binding} label="" checked={leftHand} onChange={event => setLeftHand(event.target.checked)}/>}</SettingRow> },
    { id: 'inventory-key', category: 'controls', label: 'Open inventory', description: 'Select the field, then press a key combination.', content: <KeybindingField label="Open inventory" description="Select the field, then press a key combination." value={keybinding} resetValue="KeyE" onValueChange={setKeybinding}/> },
  ];
  const visible = rows.filter(row => (category === 'all' || row.category === category) && `${row.label} ${row.description}`.toLowerCase().includes(query.toLowerCase()));
  return <Section id="settings" title="Settings controls" detail="Search, vertical navigation, setting rows, toggle buttons and key capture."
    code={`<SearchField label="Search settings" value={query}\n  onValueChange={setQuery} onSearch={searchSettings} />\n<NavigationList label="Categories" items={categories}\n  value={category} onValueChange={setCategory} />\n<SettingRow label="Music" description="Play background music.">\n  {binding => <Switch {...binding} label=""\n    checked={music} onChange={changeMusic} />}\n</SettingRow>\n<ToggleButton pressed={fullscreen} onPressedChange={setFullscreen}>\n  Fullscreen\n</ToggleButton>\n<KeybindingField label="Open inventory"\n  value={keybinding} onValueChange={setKeybinding} />`}>
    <div className="expansion-settings">
      <NavigationList label="Setting categories" value={category} onValueChange={setCategory} items={[
        { value: 'all', label: 'All settings' }, { value: 'general', label: 'General' }, { value: 'video', label: 'Video' },
        { value: 'controls', label: 'Controls' }, { value: 'account', label: 'Account', disabled: true },
      ]}/>
      <div className="expansion-settings-content"><SearchField label="Search settings" value={query} onValueChange={setQuery}
        onSearch={value => notify(`Settings search: ${value || 'all settings'}`)}/>
        <div className="expansion-setting-rows">{visible.map(row => <div key={row.id}>{row.content}</div>)}</div>
        {!visible.length && <p>No settings match this search.</p>}
      </div>
    </div>
  </Section>;
}

function FeedbackExamples({ notify }: { notify: Notify }) {
  const [paused, setPaused] = useState(false), [frame, setFrame] = useState('animated');
  const [toastOpen, setToastOpen] = useState(true), [variant, setVariant] = useState<'default' | 'error'>('default');
  return <Section id="feedback-primitives" title="Loading & feedback" detail="Original loading frames, accessible hover text and dismissible notifications."
    code={`<Spinner label="Loading world" />\n<Spinner label="Loading world" frame={3} paused />\n\n<Tooltip content="Save these settings" side="top">\n  <Button onClick={save}>Save settings</Button>\n</Tooltip>\n\n<Toast open={open} onOpenChange={setOpen}\n  title="Settings saved" description="Your changes are ready."\n  action={<Button onClick={undo}>Undo</Button>} />`}>
    <div className="expansion-demo-grid">
      <div className="expansion-surface"><h3>Loading frames</h3>
        <div className="expansion-feedback-spinner"><Spinner label="Loading world" paused={paused} frame={frame === 'animated' ? undefined : Number(frame)}/></div>
        <div className="expansion-feedback-controls"><ToggleButton pressed={paused} onPressedChange={setPaused}>Pause animation</ToggleButton>
          <Select label="Loading frame" value={frame} onChange={event => setFrame(event.currentTarget.value)} options={[
            { value: 'animated', label: 'Animated sequence' }, ...Array.from({ length: 10 }, (_, index) => ({ value: String(index), label: `Frame ${index + 1}` })),
          ]}/></div>
      </div>
      <div className="expansion-surface"><h3>Tooltips</h3><div className="expansion-tooltip-triggers">
        <Tooltip content="Save these settings" side="top"><Button onClick={() => { setToastOpen(true); notify('Settings saved.'); }}>Save settings</Button></Tooltip>
        <Tooltip content="Start another adventure" side="bottom"><Button onClick={() => notify('New adventure requested.')}>New adventure</Button></Tooltip>
      </div><p className="expansion-help">Hover or focus a button. Escape dismisses its tooltip.</p></div>
      <div className="expansion-surface expansion-surface--wide"><h3>Notifications</h3>
        <div className="expansion-feedback-controls"><Button onClick={() => setToastOpen(true)}>Show notification</Button>
          <Select label="Notification style" value={variant} options={[{ value: 'default', label: 'Saved' }, { value: 'error', label: 'Error' }]}
            onChange={event => { setVariant(event.currentTarget.value === 'error' ? 'error' : 'default'); setToastOpen(true); }}/></div>
        <Toast open={toastOpen} onOpenChange={setToastOpen} title={variant === 'error' ? 'Unable to save' : 'Settings saved'}
          description={variant === 'error' ? 'Try saving again.' : 'Your changes are ready.'} variant={variant}
          icon={<GameItemIcon name={variant === 'error' ? 'coal' : 'diamond'}/>}
          action={<Button size="sm" onClick={() => { setToastOpen(false); notify(variant === 'error' ? 'Save retry requested.' : 'Settings changes undone.'); }}>{variant === 'error' ? 'Retry' : 'Undo'}</Button>}/>
      </div>
    </div>
  </Section>;
}

export function ExpansionExamples({ notify }: { notify: Notify }) {
  return <><AdvancedWorkstationExamples notify={notify}/><HudOverlayExamples notify={notify}/><SettingsExamples notify={notify}/><FeedbackExamples notify={notify}/></>;
}
