import { useState } from 'react';
import { Anvil, Button, Combobox, Switch } from '../src';
import type { AnvilCost, AnvilTextRenderProfile, InventoryItem } from '../src';
import { nativeGuiAnvilLabels, nativeGuiAnvilUnicode, nativeGuiAnvilAscii, nativeGuiAnvilCosts } from 'virtual:mcbeui-game-font';
import { gameItemTextures } from './materials';
import { sampleGuiBlockItems } from './gui-model-items';
import { grindstoneWoodImage } from './grindstone-layer-examples';

const diamond: InventoryItem = { name: '钻石剑', image: gameItemTextures.sword.src };
const wood = (damage: number): InventoryItem => ({ name: '木剑', image: grindstoneWoodImage, durability: (59 - damage) / 59 });
const hotbar = [...sampleGuiBlockItems, wood(1), null, ...[15, 30, 45, 58].map(wood)];

export function AnvilLayerExamples() {
  const [scale, setScale] = useState('5'), [state, setState] = useState('ready'), [name, setName] = useState('QA');
  const [original, setOriginal] = useState(true), [images, setImages] = useState(true), [models, setModels] = useState(true);
  const [shown, setShown] = useState(true), [receipt, setReceipt] = useState('Edit the name or select a slot.');
  const labels = nativeGuiAnvilLabels, costs = nativeGuiAnvilCosts;
  const nameFont = /^[\x20-\x7e]*$/.test(name) ? nativeGuiAnvilAscii : nativeGuiAnvilUnicode;
  const availableFonts = !!labels && !!costs && !!nameFont, paintText = original && scale === '5' && availableFonts;
  const empty = state === 'empty', invalid = state === 'invalid';
  const cost: AnvilCost | undefined = empty || invalid ? undefined : state === 'expensive'
    ? { kind: 'too-expensive', label: '过于昂贵！' }
    : { kind: 'levels', levels: 1, affordable: state !== 'unaffordable', label: '魔咒花费：1' };
  const metrics = { lineHeight: 10, paintOffset: [0, 1] as const };
  const text: AnvilTextRenderProfile | undefined = paintText && labels && costs && nameFont ? {
    title: { font: labels, fontScale: .5, sampling: 'bilinear', shader: 'bitmap-smooth', metrics },
    inventory: { font: labels, fontScale: .5, sampling: 'bilinear', shader: 'bitmap-smooth', metrics },
    name: { font: nameFont, fontScale: nameFont === nativeGuiAnvilAscii ? 1 : .5,
      sampling: nameFont === nativeGuiAnvilAscii ? 'point' : 'bilinear',
      shader: nameFont === nativeGuiAnvilAscii ? 'bitmap' : 'bitmap-smooth',
      paintOffset: [0, 1], clipQuantization: 'logical-stage-floor' },
    cost: { font: costs, fontScale: .5, sampling: 'bilinear', shader: 'bitmap-smooth', metrics,
      color: [127, 255, 31, 255], failureColor: [255, 89, 89, 255], shadow: { offset: [.4, .4], tint: [.25, .25, .25, 1] } },
  } : undefined;
  return <section data-anvil-layer-example aria-label="Source Anvil example" style={{ display: 'grid', gap: 16, minWidth: 0, padding: 24 }}>
    <Combobox label="Anvil GUI scale" value={scale} onValueChange={setScale}
      options={[{ value: '4', label: 'GUI 4' }, { value: '5', label: 'GUI 5' }]}/>
    <Combobox label="Anvil recipe state" value={state} onValueChange={setState} options={[
      { value: 'ready', label: 'Available result' }, { value: 'empty', label: 'Empty inputs' },
      { value: 'invalid', label: 'Incompatible inputs' }, { value: 'unaffordable', label: 'Insufficient levels' },
      { value: 'expensive', label: 'Too expensive' },
    ]}/>
    <Switch label="Use original local Anvil text" checked={paintText} disabled={!availableFonts || scale !== '5'} onChange={event => setOriginal(event.target.checked)}/>
    <Switch label="Use source Anvil item sprites" checked={images} onChange={event => setImages(event.target.checked)}/>
    <Switch label="Use source Anvil block models" checked={models} onChange={event => setModels(event.target.checked)}/>
    <Button size="sm" onClick={() => setName('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123')}>Try a long name</Button>
    {shown ? <Anvil title="物品修复和命名" inventoryLabel="物品栏" name={empty ? '' : name} onNameChange={setName}
      renameDisabled={empty} inputs={empty ? [null, null] : [diamond, invalid ? wood(1) : null]}
      result={empty || invalid ? null : { ...diamond, name }} invalid={invalid} cost={cost}
      hotbar={empty ? hotbar.map((item, index) => index === 4 ? diamond : item) : hotbar}
      imageRender={{ frame: { width: 2570, height: 1402, guiScale: Number(scale) }, text, itemImages: images, itemModels: models }}
      onInputAction={(index, action) => setReceipt(`${action}: input ${index + 1}`)}
      onInventoryAction={(index, action) => setReceipt(`${action}: inventory slot ${index + 1}`)}
      onTakeResult={() => { setState('empty'); setReceipt('Result taken.'); }} onClose={() => setShown(false)}/>
      : <Button onClick={() => setShown(true)}>Reopen Anvil</Button>}
    <output aria-label="Source Anvil actions" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{receipt}</output>
    <p style={{ margin: 0, fontSize: 12 }}>Edit a name and compare available, invalid and expensive recipes. Keyboard editing and text selection remain available.</p>
    {!availableFonts && <p style={{ margin: 0, fontSize: 12 }}>Original text is optional. Prepare local glyph pages with scripts/use-local-anvil-fonts.py and restart the preview.</p>}
  </section>;
}
