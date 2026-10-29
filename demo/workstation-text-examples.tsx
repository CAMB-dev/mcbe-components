import { useState } from 'react';
import { BitmapText, EnchantingTable, Switch } from '../src';
import type { WorkstationTextRenderer } from '../src';
import { nativeWorkstationFonts } from 'virtual:mcbeui-game-font';
import { GameItemIcon } from './materials';

/** Local, explicit adapter only. The ordinary GUI text remains the default. */
export function WorkstationTextExamples({ notify }: { notify?: (message: string) => void }) {
  const [original, setOriginal] = useState(false);
  const [states, setStates] = useState<Record<string, { state: 'ready' | 'error'; message?: string }>>({});
  const [receipt, setReceipt] = useState('Text appearance only; recipe eligibility stays with the host.');
  const enabled = original && !!nativeWorkstationFonts;
  const ready = Object.values(states).filter(value => value.state === 'ready').length;
  const errors = Object.values(states).filter(value => value.state === 'error').length;
  const mark = (key: string, state: 'ready' | 'error', message?: string) => setStates(previous =>
    previous[key]?.state === state && previous[key]?.message === message ? previous : { ...previous, [key]: { state, message } });
  const renderText: WorkstationTextRenderer = (text, context) => {
    if (!nativeWorkstationFonts) return text;
    const cost = context.kind === 'enchantment-cost';
    if (cost && context.disabled) return text;
    const font = cost ? nativeWorkstationFonts.costs : nativeWorkstationFonts.labels;
    // The prepared profile intentionally covers only these observed strings.
    if ([...text].some(character => !font.glyphs[character])) return text;
    const key = cost ? `cost:${context.id}` : context.kind;
    return <BitmapText font={font} renderer="webgl-shared" layout="advance"
      profile={cost ? 'atlas-rect' : 'bedrock-unicode'} scale={cost ? 2 : 1}
      sampling={cost ? 'point' : 'bilinear'} shader={cost ? 'bitmap' : 'bitmap-smooth'}
      color={cost ? '#7fff1f' : '#4c4c4c'} shadow={cost ? { color: '#204008', offsetX: 1, offsetY: 1 } : undefined}
      style={{ display: 'block', textShadow: 'none' }} data-workstation-bitmap-kind={context.kind}
      onReady={() => mark(key, 'ready')} onRenderError={error => mark(key, 'error', error.message)}>{text}</BitmapText>;
  };
  return <section data-workstation-text-example aria-label="Optional local workstation glyphs"
    style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, minWidth: 0 }}>
    <h3 style={{ margin: 0 }}>Workstation text</h3>
    <Switch label="Use original local glyphs" checked={enabled} disabled={!nativeWorkstationFonts}
      onChange={event => { setStates({}); setOriginal(event.target.checked); }}/>
    <output role="status" aria-label="Workstation font status" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
      {enabled ? `${ready} / 5 text views ready · ${errors} errors` : `Standard text · ${nativeWorkstationFonts ? 'local glyphs available' : 'local glyphs not prepared'} · no bitmap text views mounted`}
    </output>
    {!nativeWorkstationFonts && <p style={{ margin: 0, fontSize: 12, overflowWrap: 'anywhere' }}>Optional preparation: <code>python scripts/use-local-workstation-fonts.py &lt;game-content-path&gt;</code>, then restart the preview.</p>}
    <EnchantingTable title="附魔台" inventoryLabel="物品栏" renderText={enabled ? renderText : undefined}
      item={{ name: 'Diamond sword', icon: <GameItemIcon name="sword"/> }}
      lapis={{ name: 'Lapis lazuli', icon: <GameItemIcon name="lapis"/>, count: 32 }}
      inventory={[{ name: 'Diamond', icon: <GameItemIcon name="diamond"/>, count: 8 }]}
      options={[{ id: 'first', label: 'First sample option', level: 1 }, { id: 'second', label: 'Second sample option', level: 2 }, { id: 'third', label: 'Third sample option', level: 2 }]}
      onEnchant={id => { const message = `Demo enchantment intent: ${id}`; setReceipt(message); notify?.(message); }}
      onInputAction={(slot, action) => setReceipt(`${action}: ${slot} slot intent`)}/>
    <output style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{receipt}</output>
    {!!errors && <ul style={{ margin: 0, fontSize: 12 }}>{Object.entries(states).filter(([, value]) => value.state === 'error').map(([key, value]) => <li key={key} style={{ overflowWrap: 'anywhere' }}>{key}: {value.message}</li>)}</ul>}
    <p style={{ margin: 0, fontSize: 12 }}>The toggle changes only this table's title, inventory label and three costs. Original pages come from your local game and stay outside the library. No book or rune renderer is supplied by this text-only example.</p>
    <p style={{ margin: 0, fontSize: 12 }}>This is a fixed GUI2 text profile. Adjacent Chinese spacing is measured; trailing advance, label centering and single-line boxes are explicit host choices. Cost spacing is source-anchor derived, with only digits 1 and 2 supported. Multiline metrics, disabled cost colors and complete GUI pixel equivalence are unverified.</p>
  </section>;
}
