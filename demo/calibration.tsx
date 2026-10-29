import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Button, Checkbox, Combobox, Dialog, EnchantingRunes, EnchantingTable, Grindstone, InventoryGrid, ItemSlot, Panel, Progress, RadioGroup, Select, Slider, Switch, Tabs, Text, TextField } from '../src';
import '../src/fonts.css';
import '../src/styles.css';
import { hasGameFont, runeAtlasUrl } from 'virtual:mcbeui-game-font';
import './calibration.css';
import type { ReactNode } from 'react';
import { EnchantmentOptionFixture } from './enchantment-option-fixture';
import { ProcessingFixture } from './processing-fixture';
import { InventoryPartsFixture } from './inventory-parts-fixture';
import { EnchantingRendererFixture } from './enchanting-renderer-fixture';
import { AnvilFixture } from './anvil-fixture';
import { ImageFixture } from './image-fixture';
import { ScrollFixture } from './scroll-fixture';
import { NativeFixtures } from './native-fixtures';
import { HudInteractionFixture } from './hud-interaction-fixture';
import { AdvancedNativeFixtures } from './advanced-native-fixtures';
import { HudOverlaysFixtures } from './hud-overlays-fixtures';
import { FeedbackFixture } from './feedback-fixture';
import { SettingsControlsFixture } from './settings-controls-fixture';
import { GameListsFixture } from './game-lists-fixture';
import { SystemScreensFixture } from './system-screens-fixture';
import { GameControlsFixture } from './game-controls-fixture';
import { TradingMountsFixture } from './trading-mounts-fixture';
import { InventoryScreensFixture } from './inventory-screens-fixture';
import { ItemRenderersFixture } from './item-renderers-fixture';
import { ItemGlintFixture } from './item-glint-fixture';
import { ItemTooltipFixture } from './item-tooltip-fixture';
import { BitmapTextFixture } from './bitmap-text-fixture';
import { NativeBitmapTextFixture } from './native-bitmap-text-fixture';
import { EnchantingEmptyFixture } from './enchanting-empty-fixture';

function Sample({ id, children }: { id: string; children: ReactNode }) {
  return <section className="calibration-case"><h2>{id}</h2><div className="calibration-stage" data-case={id}>{children}</div></section>;
}
function Calibration() {
  const [submitted, setSubmitted] = useState('');
  const [attempted, setAttempted] = useState('');
  const [dialog, setDialog] = useState(false);
  const [surfaceDialog, setSurfaceDialog] = useState(false);
  const difficulties = [{ value: 'peaceful', label: 'Peaceful' }, { value: 'easy', label: 'Easy', disabled: true }, { value: 'normal', label: 'Normal' }, { value: 'hard', label: 'Hard' }];
  return <main className="calibration-page">
    <a href="./">← Component library</a>
    <h1>Classic pixel calibration</h1>
    <p>Bedrock Classic control surfaces · GUI scale 2 · DPR 1 · English. Hover and focus each control to inspect its state.</p>
    <p>{hasGameFont ? 'Local Mojangles loaded.' : 'Monocraft fallback. Add your local Mojangles for font calibration.'}</p>
    <div className="calibration-grid">
      <Sample id="button-default"><Button aria-label="Default button"/></Sample>
      <Sample id="button-primary"><Button variant="primary" aria-label="Primary button"/></Sample>
      <Sample id="button-danger"><Button variant="danger" aria-label="Danger button"/></Sample>
      <Sample id="button-disabled"><Button disabled aria-label="Disabled button"/></Sample>
      <Sample id="input"><TextField label="World name" autoComplete="off"/></Sample>
      <Sample id="input-disabled"><TextField label="Disabled input" disabled defaultValue=""/></Sample>
      <Sample id="input-error"><TextField label="Invalid input" error="Choose another name." defaultValue=""/></Sample>
      <Sample id="input-readonly"><TextField label="Read only input" readOnly defaultValue=""/></Sample>
      <Sample id="input-font"><TextField label="Input text shadow" readOnly defaultValue="Minecraft"/></Sample>
      <Sample id="checkbox-off"><Checkbox label="Unchecked"/></Sample>
      <Sample id="checkbox-on"><Checkbox label="Checked" defaultChecked/></Sample>
      <Sample id="checkbox-disabled"><Checkbox label="Disabled checkbox" disabled/></Sample>
      <Sample id="checkbox-on-disabled"><Checkbox label="Disabled checked checkbox" defaultChecked disabled/></Sample>
      <Sample id="radio"><RadioGroup label="Game mode" defaultValue="survival" options={[{ value: 'survival', label: 'Survival' }, { value: 'creative', label: 'Creative' }]}/></Sample>
      <Sample id="switch-off"><Switch label="Multiplayer off"/></Sample>
      <Sample id="switch-on"><Switch label="Multiplayer on" defaultChecked/></Sample>
      <Sample id="switch-disabled"><Switch label="Disabled switch" disabled/></Sample>
      <Sample id="switch-on-disabled"><Switch label="Disabled enabled switch" defaultChecked disabled/></Sample>
      <Sample id="slot"><ItemSlot label="Empty item slot"/></Sample>
      <Sample id="slot-selected"><ItemSlot label="Selected item slot" selected/></Sample>
      <Sample id="slider"><Slider label="Render distance" defaultValue={50}/></Sample>
      <Sample id="tabs"><Tabs label="Calibration tabs" defaultValue="first" items={[
        { value: 'first', label: <span className="calibration-sr">Selected</span>, content: 'First panel' },
        { value: 'second', label: <span className="calibration-sr">Unselected</span>, content: 'Second panel' },
        { value: 'disabled', label: <span className="calibration-sr">Disabled</span>, disabled: true, content: '' },
      ]}/></Sample>
      <Sample id="combobox"><form onSubmit={event => { event.preventDefault(); setSubmitted(String(new FormData(event.currentTarget).get('difficulty'))); }}>
        <Combobox label="Difficulty" name="difficulty" defaultValue="normal" options={difficulties}/>
        <div className="calibration-actions"><Button type="reset">Reset</Button><Button type="submit">Save</Button></div>
        <output aria-label="Submitted difficulty">{submitted}</output>
      </form></Sample>
      <Sample id="combobox-required"><form onSubmit={event => { event.preventDefault(); setSubmitted('valid'); }}>
        <Combobox label="Game mode" name="mode" placeholder="Choose a mode" required options={[{ value: 'survival', label: 'Survival' }, { value: 'creative', label: 'Creative' }]}/>
        <Button type="submit">Validate</Button>
      </form></Sample>
      <Sample id="combobox-controlled"><Combobox label="Controlled difficulty" value="normal" onValueChange={setAttempted} options={difficulties}/><output aria-label="Attempted difficulty">{attempted}</output></Sample>
      <Sample id="combobox-disabled"><Combobox label="Disabled difficulty" disabled defaultValue="normal" options={difficulties}/></Sample>
      <Sample id="combobox-skin"><Combobox label="Combobox surface" options={[{ value: 'skin', label: '\u00a0' }]}/></Sample>
      <Sample id="combobox-dialog"><Button onClick={() => setDialog(true)}>Open settings dialog</Button></Sample>
      <Sample id="font"><Text className="calibration-font">Minecraft</Text></Sample>
      <Sample id="font-plain"><Text shadow={false} className="calibration-font">Minecraft</Text></Sample>
      <Sample id="font-cjk"><Text lang="zh-CN" style={{ fontFamily: "'MCBE CJK', monospace", fontSize: 24, lineHeight: '32px', color: '#ffffff', background: '#28292a', padding: 4 }}>创造属于你的世界</Text></Sample>
      <Sample id="panel"><Panel aria-label="Plain panel"/></Sample>
      <Sample id="panel-inset"><Panel variant="inset" aria-label="Inset panel"/></Sample>
      <Sample id="progress-empty"><Progress label="Empty progress" value={0}/></Sample>
      <Sample id="progress-half"><Progress label="Half progress" value={50}/></Sample>
      <Sample id="progress-full"><Progress label="Full progress" value={100}/></Sample>
      <Sample id="progress-fraction"><Progress label="Fractional progress" value={33.3}/></Sample>
      <Sample id="dialog-surface"><Button onClick={()=>setSurfaceDialog(true)}>Open surface dialog</Button></Sample>
      <Sample id="panel-form"><Panel title="Panel settings" className="calibration-form-panel">
        <TextField label="Panel world name" defaultValue="My world" error="Choose another name."/>
        <Select label="Panel game mode" options={[{value:'survival',label:'Survival'}]}/>
        <Slider label="Panel brightness" defaultValue={50}/>
        <Switch label="Panel multiplayer" defaultChecked/>
      </Panel></Sample>
      <Sample id="slot-single"><ItemSlot item={{name:'Single item',icon:'D',count:1}}/></Sample>
      <Sample id="slot-stack"><ItemSlot item={{name:'Stack of items',icon:'D',count:64,lore:['A useful stack.']}}/></Sample>
      <Sample id="slot-zero"><ItemSlot item={{name:'Zero items',icon:'D',count:0}}/></Sample>
      <Sample id="slot-durability"><ItemSlot item={{name:'Damaged tool',icon:'T',durability:.75}}/></Sample>
      <Sample id="inventory-grid"><InventoryGrid label="Keyboard inventory" columns={3} size={9} items={[{name:'First item'}, {name:'Disabled item',disabled:true}, {name:'Third item'}]}/></Sample>
      <Sample id="grindstone"><Grindstone/></Sample>
      <Sample id="enchanting"><EnchantingTable className="calibration-enchanting" options={[{id:'first',label:'First',level:3},{id:'second',label:'Second',level:15},{id:'locked',label:'Locked',level:30,disabled:true}]}/></Sample>
      <Sample id="enchanting-runes">{runeAtlasUrl && <EnchantingRunes atlasUrl={runeAtlasUrl} text="AIZ" style={{background:'#28292a'}}/>}</Sample>
    </div>
    <EnchantmentOptionFixture/>
    <ProcessingFixture/>
    <InventoryPartsFixture/>
    <EnchantingRendererFixture/>
    <AnvilFixture/>
    <ImageFixture/>
    <ScrollFixture/>
    <NativeFixtures/>
    <HudInteractionFixture/>
    <AdvancedNativeFixtures/>
    <HudOverlaysFixtures/>
    <FeedbackFixture/>
    <SettingsControlsFixture/>
    <GameListsFixture/>
    <SystemScreensFixture/>
    <GameControlsFixture/>
    <TradingMountsFixture/>
    <InventoryScreensFixture/>
    <ItemRenderersFixture/>
    <ItemGlintFixture/>
    <ItemTooltipFixture/>
    <BitmapTextFixture/>
    <NativeBitmapTextFixture/>
    <EnchantingEmptyFixture/>
    <p>These samples isolate component surfaces. The test runner renders original reference PNGs independently, applies their nine-slice rules, and compares every output pixel. Text is validated separately.</p>
    <Dialog open={dialog} onOpenChange={setDialog} title="Settings dialog" className="calibration-close-dialog"><Combobox label="Dialog difficulty" defaultValue="normal" options={difficulties}/><ItemSlot label="Dialog item" item={{name:'Dialog item',icon:'D',lore:['Inside the dialog']}}/></Dialog>
    <Dialog open={surfaceDialog} onOpenChange={setSurfaceDialog} title="Surface dialog" className="calibration-surface-dialog"/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Calibration/>);
