import { StrictMode, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Anvil } from '../src/anvil';
import type { AnvilImageRenderProfile } from '../src/anvil';
import { useDemoFontProfile } from './classic-font-examples';
import type { DemoFontProfile } from './classic-font-examples';
import { hasClassicFonts, hasGameFont } from 'virtual:mcbeui-game-font';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/classic-fonts.css';
import './styles.css';

export interface AnvilNameConfiguration {
  name: string; otherName: string; disabled: boolean; readOnly: boolean;
  source: 'off' | 'images' | 'name'; fontUrl: string; badOffset: boolean;
  customLine: boolean; inputHeight: number; inputLine: number; inputSize: number;
  showFirst: boolean; showSecond: boolean; controlMode: 'normal' | 'reject-blur' | 'uppercase-blur';
}
interface NameQA {
  mounted: boolean; hasClassicFonts: boolean; hasGameFont: boolean;
  configure: (value: Partial<AnvilNameConfiguration>) => void;
  setProfile: (value: DemoFontProfile) => void; unmount: () => void;
  events: string[];
}
declare global { interface Window { anvilNameQA: NameQA } }
const qa: NameQA = { mounted: false, hasClassicFonts, hasGameFont, configure: () => {}, setProfile: () => {}, unmount: () => {}, events: [] };
window.anvilNameQA = qa;
function App() {
  const [settings, setSettings] = useState<AnvilNameConfiguration>({ name: 'QA', otherName: 'Second tool', disabled: false, readOnly: false, source: 'off', fontUrl: '/qa-anvil-name-page.png', badOffset: false, customLine: false, inputHeight: 20, inputLine: 20, inputSize: 18, showFirst: true, showSecond: true, controlMode: 'normal' });
  const firstRoot = useRef<HTMLElement | null>(null);
  const { profile, setProfile } = useDemoFontProfile();
  const [events, setEvents] = useState<string[]>([]);
  qa.configure = value => setSettings(previous => ({ ...previous, ...value })); qa.setProfile = setProfile; qa.mounted = true;
  const emit = (value: string) => { qa.events.push(value); setEvents(previous => [...previous, value]); };
  const source: AnvilImageRenderProfile | undefined = settings.source === 'off' ? undefined : {
    frame: { width: 640, height: 480, guiScale: 2 }, displayScale: 1,
    ...(settings.source === 'name' ? { text: { name: {
      font: { pages: [settings.fontUrl], pageSizes: [128], cellHeight: 12, lineHeight: 12, glyphs: { Q: { page: 0, x: 0, y: 0, width: 8, height: 12, advance: 6, offsetY: -3 }, A: { page: 0, x: 8, y: 0, width: 8, height: 12, advance: 6, offsetY: -3 } } },
      fontScale: 1, sampling: 'point', shader: 'bitmap', paintOffset: [settings.badOffset ? NaN : 0, 1], clipQuantization: 'logical-stage-floor',
    } } } : {}),
  };
  const customStyle = { '--qa-input-height': `${settings.inputHeight}px`, '--qa-input-line': `${settings.inputLine}px`, '--qa-input-size': `${settings.inputSize}px` } as CSSProperties;
  return <main data-settings={JSON.stringify(settings)} data-profile={profile}>
    <button id="name-focus-sink">Outside name input</button><div id="anvil-name-host">
      {settings.showFirst && <Anvil ref={firstRoot} data-instance="first" className={settings.customLine ? 'qa-custom-line' : undefined} style={customStyle}
        name={settings.name} renameLabel="First name" renameDisabled={settings.disabled} renameReadOnly={settings.readOnly} imageRender={source}
        onNameChange={name => {
          if (settings.controlMode === 'reject-blur') { qa.events.push(`reject:${name}`); firstRoot.current!.querySelector('input')!.blur(); return; }
          emit(`first:${name}`); setSettings(previous => ({ ...previous, name: settings.controlMode === 'uppercase-blur' ? name.toUpperCase() : name }));
          if (settings.controlMode === 'uppercase-blur') firstRoot.current!.querySelector('input')!.blur();
        }}/>}
      {settings.showSecond && <Anvil data-instance="second" name={settings.otherName} renameLabel="Second name" onNameChange={otherName => { emit(`second:${otherName}`); setSettings(previous => ({ ...previous, otherName })); }}/>}
    </div><output aria-label="Name events">{events.join('|')}</output>
  </main>;
}
const root = createRoot(document.getElementById('anvil-name-root')!); qa.unmount = () => { qa.mounted = false; root.unmount(); };
root.render(new URLSearchParams(location.search).has('strict') ? <StrictMode><App/></StrictMode> : <App/>);
