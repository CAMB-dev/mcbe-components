import { useState } from 'react';
import type { CSSProperties } from 'react';
import { hasHBUITenFont } from 'virtual:mcbeui-game-font';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { EmoteWheel, EmoteSlotPreview } from '../src/emote-wheel';
import { EmoteWheelScreen } from '../src/emote-wheel-screen';
import type { EmoteIndex, EmoteSlot, EmoteWheelProps } from '../src/emote-wheel';

const slots: readonly [EmoteSlot, EmoteSlot, EmoteSlot, EmoteSlot] = [
  { id: 'wave', label: 'Wave', preview: { kind: 'text', text: '1' } },
  { id: 'clap', label: 'Clap', preview: { kind: 'text', text: '2' } },
  { id: 'dance', label: 'Dance', preview: { kind: 'text', text: '3' } },
  { id: 'empty', label: 'Empty slot', preview: { kind: 'empty' } },
];

export function EmoteWheelExamples() {
  const [mode, setMode] = useState<NonNullable<EmoteWheelProps['inputMode']>>('keyboard');
  const [composition, setComposition] = useState('screen'), [screenOpen, setScreenOpen] = useState(true);
  const [language, setLanguage] = useState('en'), [contentPreset, setContentPreset] = useState('mixed');
  const [scale, setScale] = useState(2), [frame, setFrame] = useState('square');
  const [active, setActive] = useState<EmoteIndex | null>(null);
  const [accept, setAccept] = useState(true), [disabled, setDisabled] = useState(false);
  const [receipt, setReceipt] = useState('Focus the wheel, then use 1–4, arrow keys and Enter.');
  const size = (composition === 'screen' ? frame === 'wide' ? [512, 280] : [400, 300] : frame === 'wide' ? [300, 200] : [240, 240]) as readonly [number, number];
  const visibleSlots = contentPreset === 'empty' ? slots.map((slot, index) => ({ ...slot, label: `Empty slot ${index + 1}`, preview: { kind: 'empty' as const } })) as unknown as typeof slots : slots;
  const wheelProps: EmoteWheelProps = { slots: visibleSlots, label: 'Example emote wheel', size, scale, inputMode: mode, disabled, activeIndex: active,
    onActiveIndexChange: index => { if (accept) setActive(index); setReceipt(`Selection ${index === null ? 'cleared' : index + 1}: host ${accept ? 'accepted' : 'declined'} the request.`); },
    onActivate: (index, slot) => setReceipt(`Slot ${index + 1}: ${slot.label}. Playback is handled by your application.`) };
  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16 }}>
      <Combobox label="Emote composition" value={composition} options={[{ value: 'screen', label: 'Full screen' }, { value: 'wheel', label: 'Wheel only' }]} onValueChange={next => { setComposition(next); setScreenOpen(true); }}/>
      <Combobox label="Emote language" value={language} options={[{ value: 'en', label: 'English' }, { value: 'zh', label: '简体中文' }]} onValueChange={setLanguage}/>
      <Combobox label="Emote slots" value={contentPreset} options={[{ value: 'mixed', label: 'Mixed previews' }, { value: 'empty', label: 'Empty slots · reference' }]} onValueChange={setContentPreset}/>
      <Combobox label="Emote hint mode" value={mode} options={['pointer', 'keyboard', 'touch', 'gamepad'].map(value => ({ value, label: value }))}
        onValueChange={next => setMode(next as typeof mode)}/>
      <Combobox label="Emote scale" value={String(scale)} options={[1, 2, 3, 5].map(value => ({ value: String(value), label: `${value}×` }))} onValueChange={next => setScale(Number(next))}/>
      <Combobox label="Emote frame" value={frame} options={[{ value: 'square', label: 'Default' }, { value: 'wide', label: 'Wide' }]} onValueChange={setFrame}/>
      <Switch label="Accept selection requests" checked={accept} onChange={event => setAccept(event.target.checked)}/>
      <Switch label="Disable emote wheel" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Button size="sm" onClick={() => { setActive(null); setReceipt('Selection cleared by the host.'); }}>Clear selection</Button>
      {composition === 'screen' && <Button size="sm" disabled={screenOpen} onClick={() => setScreenOpen(true)}>Open emote screen</Button>}
    </div>
    <div role="region" aria-label="Emote wheel preview" tabIndex={0} style={{ maxWidth: '100%', minWidth: 0, overflowX: 'auto', background: '#385947' }}>
      {composition === 'screen' ? screenOpen ? <EmoteWheelScreen {...wheelProps}
        style={hasHBUITenFont ? { '--mc-font-ten': "'Minecraft Ten v2', var(--mc-font)" } as CSSProperties : undefined}
        labels={language === 'zh' ? { keyboardInstruction: '使用热键或鼠标激活表情', touchInstruction: '点击表情以激活', changeEmotes: '更改表情' } : undefined}
        gamepadInstruction={language === 'zh' ? '当前控制器说明由应用程序提供。' : 'Your application supplies the current controller instructions.'}
        onCloseRequest={detail => { if (accept) setScreenOpen(false); setReceipt(`Close (${detail.reason}): host ${accept ? 'accepted' : 'declined'} the request.`); }}
        onChangeEmotes={() => setReceipt('The host received a Change Emotes request. Dressing-room navigation is handled by your application.')}/>
        : <p style={{ padding: 16 }}>The screen was closed by the host. Use Open emote screen to show it again.</p>
        : <EmoteWheel {...wheelProps} onCancel={() => setReceipt('The host received an Escape request.')}/>}
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12 }}>{receipt}</p>
    <p style={{ margin: 0, fontSize: 12 }}>The full screen includes the source instruction background and Change Emotes row. These are valid slots without thumbnails, plus one empty slot. Images, gamepad text and controller glyphs come from your application.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
      <EmoteSlotPreview content={{ kind: 'empty' }} scale={scale} style={{ width: 42 * scale, height: 42 * scale }} aria-label="Reusable empty preview"/>
      <EmoteSlotPreview content={{ kind: 'text', text: '1' }} scale={scale} style={{ width: 42 * scale, height: 42 * scale, background: '#313233' }} aria-label="Reusable valid slot without thumbnail"/>
      <span style={{ fontSize: 12 }}>Reusable slot preview</span>
    </div>
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{`<EmoteWheelScreen slots={fourSlots} label="Emotes"
  size={[400, 300]} scale={2}
  activeIndex={activeIndex}
  onActiveIndexChange={setActiveIndex}
  onActivate={(index, slot) => requestPlayback(slot.id)}
  onCloseRequest={({ reason }) => closeScreen(reason)}
  onChangeEmotes={() => openDressingRoom()} />
// Exactly four entries: top, right, bottom, left.
// Empty slots remain activatable; the host decides playback.
// Frame geometry and original art are source-backed.
// Native input routing, font rasterization and whole-screen parity remain unverified.`}</pre>
  </div>;
}
