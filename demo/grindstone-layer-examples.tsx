import { useState } from 'react';
import { Button, Combobox, Grindstone, Switch } from '../src';
import type { InventoryItem } from '../src';
import { nativeGuiGrindstoneFont } from 'virtual:mcbeui-game-font';
import { gameItemTextures } from './materials';
import { sampleGuiBlockItems } from './gui-model-items';

export const grindstoneWoodImage = new URL('./assets/grindstone/wooden_sword.png', import.meta.url).href;
const wood = (damage: number): InventoryItem => ({ name: '木剑', image: grindstoneWoodImage, durability: (59 - damage) / 59 });
const diamond: InventoryItem = { name: '钻石剑', image: gameItemTextures.sword.src };
const hotbar = [...sampleGuiBlockItems, null, null, ...[15, 30, 45, 58].map(wood)];

export function GrindstoneLayerExamples() {
  const [scale, setScale] = useState('5'), [recipe, setRecipe] = useState('invalid');
  const [original, setOriginal] = useState(true), [images, setImages] = useState(true), [models, setModels] = useState(true);
  const [shown, setShown] = useState(true), [receipt, setReceipt] = useState('Select a slot to try its action.');
  const font = nativeGuiGrindstoneFont, text = original && scale === '5' && !!font;
  return <section data-grindstone-layer-example aria-label="Source Grindstone example"
    style={{ display: 'grid', gap: 16, minWidth: 0, padding: 24 }}>
    <Combobox label="Grindstone GUI scale" value={scale} onValueChange={setScale}
      options={[{ value: '4', label: 'GUI 4' }, { value: '5', label: 'GUI 5' }]}/>
    <Combobox label="Grindstone recipe state" value={recipe} onValueChange={setRecipe}
      options={[{ value: 'invalid', label: 'Incompatible inputs' }, { value: 'valid', label: 'Available result' }, { value: 'empty', label: 'Empty inputs' }]}/>
    <Switch label="Use original local Grindstone text" checked={text} disabled={!font || scale !== '5'} onChange={event => setOriginal(event.target.checked)}/>
    <Switch label="Use source Grindstone item sprites" checked={images} onChange={event => setImages(event.target.checked)}/>
    <Switch label="Use source Grindstone block models" checked={models} onChange={event => setModels(event.target.checked)}/>
    {shown ? <Grindstone title="修复与祛魔" inventoryLabel="物品栏"
      imageRender={{ frame: { width: 2570, height: 1402, guiScale: Number(scale) }, itemImages: images, itemModels: models,
        text: text && font ? { metrics: { lineHeight: 10, paintOffset: [0, 1] },
          labels: { font, fontScale: .5, sampling: 'bilinear', shader: 'bitmap-smooth' } } : undefined }}
      inputs={recipe === 'empty' ? [null, null] : [diamond, recipe === 'invalid' ? wood(1) : null]}
      result={recipe === 'valid' ? diamond : null} invalid={recipe === 'invalid'} hotbar={hotbar}
      onInputAction={(index, action) => setReceipt(`${action}: input ${index + 1}`)}
      onInventoryAction={(index, action) => setReceipt(`${action}: inventory slot ${index + 1}`)}
      onTakeResult={() => { setRecipe('empty'); setReceipt('Result taken.'); }}
      onClose={() => setShown(false)}/>
      : <Button onClick={() => setShown(true)}>Reopen Grindstone</Button>}
    <output aria-label="Source Grindstone actions" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{receipt}</output>
    <p style={{ margin: 0, fontSize: 12 }}>Switch between empty, available and incompatible inputs. Slots stay interactive while the original images and text are drawn together.</p>
    {!font && <p style={{ margin: 0, fontSize: 12 }}>Original text is optional. Prepare your local glyph pages with scripts/use-local-grindstone-fonts.py and restart the preview.</p>}
  </section>;
}
