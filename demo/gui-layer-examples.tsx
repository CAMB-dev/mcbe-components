import { useState } from 'react';
import { Button, Combobox, EnchantingBook, EnchantingRunes, EnchantingTable, Switch } from '../src';
import { nativeGuiWorkstationFonts, runeAtlasUrl } from 'virtual:mcbeui-game-font';
import { gameItemTextures } from './materials';

const runeTexts = ['elder light', 'bless creature', 'enchant scroll'];

/** An actual workstation using one image/text target; fonts remain optional local resources. */
export function GuiLayerExamples() {
  const [scale, setScale] = useState('5'), [original, setOriginal] = useState(true);
  const [itemImages, setItemImages] = useState(true);
  const [shown, setShown] = useState(true), [inputs, setInputs] = useState(true);
  const [receipt, setReceipt] = useState('This example reports actions to its host.');
  const fonts = nativeGuiWorkstationFonts, enabled = original && !!fonts;
  return <section data-gui-layer-example aria-label="Combined original GUI example"
    style={{ display: 'grid', gap: 16, minWidth: 0, padding: 24 }}>
    <Combobox label="Combined GUI scale" value={scale} onValueChange={setScale}
      options={[{ value: '4', label: 'GUI 4 · point text' }, { value: '5', label: 'GUI 5 · smooth labels' }]}/>
    <Switch label="Use original local GUI text" checked={enabled} disabled={!fonts} onChange={event => setOriginal(event.target.checked)}/>
    <Switch label="Use source item sprites" checked={itemImages} onChange={event => setItemImages(event.target.checked)}/>
    {shown ? <EnchantingTable title="附魔台" inventoryLabel="物品栏"
      imageRender={{ frame: { width: 2570, height: 1402, guiScale: Number(scale) }, itemImages,
        text: enabled && fonts ? {
          metrics: { lineHeight: 10, paintOffset: [0, 1] },
          labels: { font: fonts.labels, fontScale: .5, sampling: scale === '5' ? 'bilinear' : 'point', shader: scale === '5' ? 'bitmap-smooth' : 'bitmap' },
          costs: { font: fonts.costs, fontScale: 1, sampling: 'point', shader: 'bitmap' },
          runes: { font: fonts.runes, fontScale: 1, sampling: 'point', shader: 'bitmap' },
        } : undefined }}
      item={inputs ? { name: 'Diamond sword', image: gameItemTextures.sword.src } : null}
      lapis={inputs ? { name: 'Lapis lazuli', image: gameItemTextures.lapis.src, count: 32 } : null}
      inventory={[{ name: 'Diamond', image: gameItemTextures.diamond.src, count: 8 }]}
      book={<EnchantingBook open={inputs ? 1 : 0}/>}
      options={inputs ? runeTexts.map((text, index) => ({ id: `composed-${index}`, label: `Sample option ${index + 1}`, level: [1, 2, 2][index]!,
        runeText: text, runes: runeAtlasUrl ? <EnchantingRunes text={text} atlasUrl={runeAtlasUrl}/> : text })) : []}
      onEnchant={id => setReceipt(`Enchantment requested: ${id}`)}
      onInputAction={(slot, action) => setReceipt(`${action}: ${slot} slot`)}
      onInventoryAction={(index, action) => setReceipt(`${action}: inventory slot ${index + 1}`)}
      onClose={() => setShown(false)}/>
      : <Button onClick={() => setShown(true)}>Reopen composed GUI</Button>}
    <Button onClick={() => setInputs(value => !value)}>{inputs ? 'Clear composed GUI inputs' : 'Restore composed GUI inputs'}</Button>
    <output aria-label="Combined GUI actions" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{receipt}</output>
    <p style={{ margin: 0, fontSize: 12 }}>Toggle the original text and item sprites to compare their appearance. Buttons, inventory actions and the book stay interactive.</p>
    <p style={{ margin: 0, fontSize: 12 }}>{fonts ? 'Original glyph pages are prepared locally and stay outside the library. These are explicit GUI 4 and GUI 5 profiles; the text switch applies only to this example.'
      : 'Original glyphs are optional. Prepare them with scripts/use-local-workstation-fonts.py and restart the preview to enable this switch.'}</p>
  </section>;
}
