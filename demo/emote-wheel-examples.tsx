import { useState } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { EmoteWheel, EmoteSlotPreview } from '../src/emote-wheel';
import type { EmoteIndex, EmoteSlot, EmoteWheelProps } from '../src/emote-wheel';

const slots: readonly [EmoteSlot, EmoteSlot, EmoteSlot, EmoteSlot] = [
  { id: 'wave', label: 'Wave', preview: { kind: 'text', text: '1' } },
  { id: 'clap', label: 'Clap', preview: { kind: 'text', text: '2' } },
  { id: 'dance', label: 'Dance', preview: { kind: 'text', text: '3' } },
  { id: 'empty', label: 'Empty slot', preview: { kind: 'empty' } },
];

export function EmoteWheelExamples() {
  const [mode, setMode] = useState<NonNullable<EmoteWheelProps['inputMode']>>('keyboard');
  const [scale, setScale] = useState(2), [frame, setFrame] = useState('square');
  const [active, setActive] = useState<EmoteIndex | null>(null);
  const [accept, setAccept] = useState(true), [disabled, setDisabled] = useState(false);
  const [receipt, setReceipt] = useState('Focus the wheel, then use 1–4, arrow keys and Enter.');
  const size = (frame === 'wide' ? [300, 200] : [240, 240]) as readonly [number, number];
  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16 }}>
      <Combobox label="Emote hint mode" value={mode} options={['pointer', 'keyboard', 'touch', 'gamepad'].map(value => ({ value, label: value }))}
        onValueChange={next => setMode(next as typeof mode)}/>
      <Combobox label="Emote scale" value={String(scale)} options={[1, 2, 3].map(value => ({ value: String(value), label: `${value}×` }))} onValueChange={next => setScale(Number(next))}/>
      <Combobox label="Emote frame" value={frame} options={[{ value: 'square', label: 'Square' }, { value: 'wide', label: 'Wide' }]} onValueChange={setFrame}/>
      <Switch label="Accept selection requests" checked={accept} onChange={event => setAccept(event.target.checked)}/>
      <Switch label="Disable emote wheel" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Button size="sm" onClick={() => { setActive(null); setReceipt('Selection cleared by the host.'); }}>Clear selection</Button>
    </div>
    <div role="region" aria-label="Emote wheel preview" tabIndex={0} style={{ maxWidth: '100%', minWidth: 0, overflowX: 'auto', background: '#385947' }}>
      <EmoteWheel slots={slots} label="Example emote wheel" size={size} scale={scale} inputMode={mode} disabled={disabled} activeIndex={active}
        onActiveIndexChange={index => { if (accept) setActive(index); setReceipt(`Selection ${index === null ? 'cleared' : index + 1}: host ${accept ? 'accepted' : 'declined'} the request.`); }}
        onActivate={(index, slot) => setReceipt(`Slot ${index + 1}: ${slot.label}. Playback is handled by your application.`)}
        onCancel={() => setReceipt('The host received an Escape request.')}/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12 }}>{receipt}</p>
    <p style={{ margin: 0, fontSize: 12 }}>These are valid slots without thumbnails, plus one empty slot. Images and controller glyphs come from your application. Gamepad mode shows no guessed controller icons.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
      <EmoteSlotPreview content={{ kind: 'empty' }} scale={scale} style={{ width: 42 * scale, height: 42 * scale }} aria-label="Reusable empty preview"/>
      <EmoteSlotPreview content={{ kind: 'text', text: '1' }} scale={scale} style={{ width: 42 * scale, height: 42 * scale, background: '#313233' }} aria-label="Reusable valid slot without thumbnail"/>
      <span style={{ fontSize: 12 }}>Reusable slot preview</span>
    </div>
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{`<EmoteWheel slots={fourSlots} label="Emotes"
  activeIndex={activeIndex}
  onActiveIndexChange={setActiveIndex}
  onActivate={(index, slot) => requestPlayback(slot.id)} />
// Exactly four entries: top, right, bottom, left.
// Empty slots remain activatable; the host decides playback.
// Frame geometry and original art are source-backed.
// Native input routing, font rasterization and whole-screen parity remain unverified.`}</pre>
  </div>;
}
