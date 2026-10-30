import { StrictMode, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { EmoteWheelScreen } from '../src/emote-wheel-screen';
import '../src/styles.css';
import '../src/fonts.css';

type Props = ComponentProps<typeof EmoteWheelScreen>;
export interface EmoteScreenQASettings {
  slots: Props['slots'];
  size: readonly [number, number];
  scale: number;
  controlled: boolean;
  acceptActive: boolean;
  activeIndex: Props['activeIndex'];
  defaultActiveIndex?: Props['defaultActiveIndex'];
  centerLabel?: string;
  inputMode: NonNullable<Props['inputMode']>;
  hints?: Props['hints'];
  labels: Props['labels'];
  gamepadInstruction?: string;
  gamepadExitLabel?: string;
  gamepadStartGlyph?: string;
  gamepadStartDescription?: string;
  changeEmotesVisible: boolean;
  changeEmotesDisabled: boolean;
  disabled: boolean;
  acceptClose: boolean;
  preventCaptureKeys: string[];
  preventKeys: string[];
  preventClick: boolean;
  preventClickCapture: boolean;
  fontTen: string;
  show: boolean;
}
interface QAEvent { kind: string; value?: unknown; detail?: unknown }
interface EmoteScreenQA {
  mounted: boolean;
  settings: EmoteScreenQASettings;
  events: QAEvent[];
  ref: HTMLDivElement | null;
  wheelRef: HTMLDivElement | null;
  changeRef: HTMLButtonElement | null;
  configure: (patch: Partial<EmoteScreenQASettings>) => void;
  unmount: () => void;
}
declare global { interface Window { emoteScreenQA: EmoteScreenQA; emoteScreenQAInitial?: Partial<EmoteScreenQASettings> } }
const initial: EmoteScreenQASettings = {
  slots: [
    { id: 'top', label: 'Top action', preview: { kind: 'text', text: 'T' } },
    { id: 'right', label: 'Right action', preview: { kind: 'text', text: 'R' } },
    { id: 'bottom', label: 'Bottom action', preview: { kind: 'text', text: 'B' } },
    { id: 'left', label: 'Empty action', preview: { kind: 'empty' } },
  ],
  size: [320, 280], scale: 1, controlled: true, acceptActive: true, activeIndex: null, inputMode: 'keyboard',
  labels: { keyboardInstruction: 'Choose emote', touchInstruction: 'Tap emote', changeEmotes: 'Change emotes host' },
  changeEmotesVisible: true, changeEmotesDisabled: false, disabled: false, acceptClose: false,
  preventCaptureKeys: [], preventKeys: [], preventClick: false, preventClickCapture: false, fontTen: 'CallerTen, monospace', show: true,
};
const initialSettings = { ...initial, ...window.emoteScreenQAInitial };
const qa: EmoteScreenQA = { mounted: false, settings: initialSettings, events: [], ref: null, wheelRef: null, changeRef: null, configure: () => {}, unmount: () => {} };
window.emoteScreenQA = qa;
const info = (event: { type: string; currentTarget: EventTarget | null; defaultPrevented: boolean; target: EventTarget | null }) => ({ type: event.type, currentTarget: event.currentTarget instanceof Element ? event.currentTarget.id : null, targetTag: event.target instanceof Element ? event.target.tagName : null, defaultPrevented: event.defaultPrevented });
const rootRef = (node: HTMLDivElement | null) => { qa.ref = node; };
const wheelRef = (node: HTMLDivElement | null) => { qa.wheelRef = node; };
const changeRef = (node: HTMLButtonElement | null) => { qa.changeRef = node; };
function App() {
  const [settings, setSettings] = useState(initialSettings);
  qa.settings = settings; qa.mounted = true; qa.configure = patch => setSettings(previous => ({ ...previous, ...patch }));
  return <main>
    <button id="screen-before">Before screen</button>
    <section className="screen-qa-host">{settings.show && <EmoteWheelScreen id="qa-emote-screen" ref={rootRef} wheelRef={wheelRef} changeButtonRef={changeRef}
      label="Caller transparent emote screen" slots={settings.slots} size={settings.size} scale={settings.scale}
      {...(settings.controlled ? { activeIndex: settings.activeIndex } : { defaultActiveIndex: settings.defaultActiveIndex })}
      centerLabel={settings.centerLabel}
      inputMode={settings.inputMode} hints={settings.hints} labels={settings.labels} disabled={settings.disabled}
      gamepadInstruction={settings.gamepadInstruction} gamepadExitLabel={settings.gamepadExitLabel} gamepadStartGlyph={settings.gamepadStartGlyph} gamepadStartDescription={settings.gamepadStartDescription}
      changeEmotesVisible={settings.changeEmotesVisible} changeEmotesDisabled={settings.changeEmotesDisabled}
      style={{ '--mc-font-ten': settings.fontTen } as CSSProperties}
      onActiveIndexChange={(index, detail) => { qa.events.push({ kind: 'active', value: index, detail: { cause: detail.cause, event: info(detail.event) } }); if (settings.acceptActive) setSettings(previous => ({ ...previous, activeIndex: index })); }}
      onActivate={(index, slot, event) => { qa.events.push({ kind: 'activate', value: index, detail: { slot: structuredClone(slot), event: info(event) } }); }}
      onCloseRequest={detail => { qa.events.push({ kind: 'close', value: detail.reason, detail: info(detail.event) }); if (settings.acceptClose) setSettings(previous => ({ ...previous, show: false })); }}
      onChangeEmotes={event => { qa.events.push({ kind: 'change', detail: info(event) }); }}
      onClick={event => { qa.events.push({ kind: 'caller-click', detail: info(event) }); if (settings.preventClick) event.preventDefault(); }}
      onClickCapture={event => { if (settings.preventClickCapture) event.preventDefault(); }}
      onKeyDownCapture={event => { qa.events.push({ kind: 'caller-capture', value: event.key, detail: info(event) }); if (settings.preventCaptureKeys.includes(event.key)) event.preventDefault(); }}
      onKeyDown={event => { qa.events.push({ kind: 'caller-key', value: event.key, detail: info(event) }); if (settings.preventKeys.includes(event.key)) event.preventDefault(); }}/>}</section>
    <button id="screen-after">After screen</button>
    <output>{JSON.stringify({ activeIndex: settings.activeIndex, mode: settings.inputMode, show: settings.show })}</output>
  </main>;
}
const root = createRoot(document.getElementById('emote-screen-root')!);
qa.unmount = () => root.unmount();
root.render(new URLSearchParams(location.search).has('strict') ? <StrictMode><App/></StrictMode> : <App/>);
