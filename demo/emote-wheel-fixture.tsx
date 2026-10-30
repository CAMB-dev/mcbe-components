import { StrictMode, useState } from 'react';
import type { ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { EmoteWheel } from '../src/emote-wheel';
import '../src/styles.css';
import '../src/fonts.css';

type Props = ComponentProps<typeof EmoteWheel>;
export interface EmoteQASettings {
  slots: Props['slots'];
  controlled: boolean;
  acceptActive: boolean;
  activeIndex: NonNullable<Props['activeIndex']> | null;
  defaultActiveIndex?: Props['defaultActiveIndex'];
  disabled: boolean;
  scale: number;
  size: readonly [number, number];
  inputMode: NonNullable<Props['inputMode']>;
  hints?: Props['hints'];
  preventKeys: string[];
  preventPointer: boolean;
  preventPointerUp: boolean;
  show: boolean;
}
interface QAEvent { kind: string; value?: unknown; detail?: unknown }
interface EmoteQA {
  mounted: boolean;
  settings: EmoteQASettings;
  events: QAEvent[];
  snapshots: unknown[];
  ref: HTMLDivElement | null;
  buttonRefs: Partial<Record<0 | 1 | 2 | 3, HTMLButtonElement | null>>;
  configure: (patch: Partial<EmoteQASettings>) => void;
  unmount: () => void;
}
declare global { interface Window { emoteQA: EmoteQA; emoteQAInitial?: Partial<EmoteQASettings> } }
const slots: Props['slots'] = [
  { id: 'top', label: 'Top emote', preview: { kind: 'text', text: 'T' } },
  { id: 'right', label: 'Right emote', preview: { kind: 'text', text: 'R' } },
  { id: 'bottom', label: 'Bottom emote', preview: { kind: 'text', text: 'B' } },
  { id: 'left', label: 'Empty left emote', preview: { kind: 'empty' } },
];
const initial: EmoteQASettings = {
  slots, controlled: true, acceptActive: true, activeIndex: null,
  disabled: false, scale: 1, size: [320, 280], inputMode: 'pointer',
  preventKeys: [], preventPointer: false, preventPointerUp: false, show: true,
};
const initialSettings = { ...initial, ...window.emoteQAInitial };
const qa: EmoteQA = { mounted: false, settings: initialSettings, events: [], snapshots: [], ref: null, buttonRefs: {}, configure: () => {}, unmount: () => {} };
window.emoteQA = qa;
const eventInfo = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value;
  const v = value as { type?: unknown; key?: unknown; cause?: unknown; event?: unknown; defaultPrevented?: unknown };
  return v.type !== undefined ? { type: v.type, key: v.key, defaultPrevented: v.defaultPrevented }
    : { cause: v.cause, event: v.event === undefined ? undefined : eventInfo(v.event) };
};
const attach = (node: HTMLDivElement | null) => { qa.ref = node; };
const buttonRefs = Object.fromEntries(([0, 1, 2, 3] as const).map(index => [index, (node: HTMLButtonElement | null) => { qa.buttonRefs[index] = node; }]));
function App() {
  const [settings, setSettings] = useState(initialSettings);
  qa.settings = settings; qa.mounted = true;
  qa.configure = patch => setSettings(previous => ({ ...previous, ...patch }));
  return <main>
    <button id="emote-before">Before wheel</button>
    <section className="qa-emote-host" id="emote-host">{settings.show && <EmoteWheel id="qa-emote-wheel" ref={attach} buttonRefs={buttonRefs} label="Caller emote wheel" slots={settings.slots}
      {...(settings.controlled ? { activeIndex: settings.activeIndex } : settings.defaultActiveIndex === undefined ? {} : { defaultActiveIndex: settings.defaultActiveIndex })}
      size={settings.size} scale={settings.scale} disabled={settings.disabled} inputMode={settings.inputMode} hints={settings.hints}
      onActiveIndexChange={(index, detail) => {
        qa.events.push({ kind: 'active', value: index, detail: eventInfo(detail) });
        if (settings.acceptActive) setSettings(previous => ({ ...previous, activeIndex: index }));
      }}
      onActivate={(index, slot, event) => {
        qa.events.push({ kind: 'activate', value: index, detail: { slot: structuredClone(slot), event: eventInfo(event) } });
        qa.snapshots.push(slot);
      }}
      onCancel={(...args) => { qa.events.push({ kind: 'cancel', detail: args.map(eventInfo) }); }}
      onKeyDown={event => { qa.events.push({ kind: 'caller-key', value: event.key }); if (settings.preventKeys.includes(event.key)) event.preventDefault(); }}
      onPointerMove={event => { if (settings.preventPointer) event.preventDefault(); }}
      onPointerUp={event => { if (settings.preventPointerUp) event.preventDefault(); }}
      onClick={event => { if (settings.preventPointer) event.preventDefault(); }}/>}</section>
    <button id="emote-after">After wheel</button>
    <output id="emote-state">{JSON.stringify({ activeIndex: settings.activeIndex, controlled: settings.controlled })}</output>
  </main>;
}
const root = createRoot(document.getElementById('emote-root')!);
qa.unmount = () => root.unmount();
root.render(new URLSearchParams(location.search).has('strict') ? <StrictMode><App/></StrictMode> : <App/>);
