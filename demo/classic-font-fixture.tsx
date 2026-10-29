import { useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Anvil, Combobox, Dialog, ItemTooltip, Select, Text, TextArea, TextField } from '../src';
import type { DemoFontProfile } from './classic-font-examples';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/classic-fonts.css';
import './styles.css';

const raw = new URLSearchParams(location.search).has('raw');
const theme = raw ? null : await import('./classic-font-examples');
const bridge = raw ? null : await import('virtual:mcbeui-game-font');
interface FixtureConfiguration { scoped: boolean; cost: 'green' | 'red'; overrides: boolean; roleFallback: boolean; tooltipOverride: boolean }
interface PaintInput { text: string; family: string; color?: string; width?: number; height?: number; x?: number; baseline?: number }
interface ClassicQA {
  hasClassicFonts: boolean; hasGameFont: boolean; mounted: boolean; input: HTMLInputElement | null;
  baseline: Record<string, string>;
  configure: (settings: Partial<FixtureConfiguration>) => void;
  setProfile: (profile: DemoFontProfile) => void;
  unmount: () => void;
  paint: (input: PaintInput) => { width: number; height: number; pixels: string; advance: number; ascent: number; descent: number };
}
declare global { interface Window { classicFontQA: ClassicQA } }
function rootProperties() {
  const root = getComputedStyle(document.documentElement);
  return Object.fromEntries(['--mc-font', '--mc-font-unicode', '--mc-item-tooltip-font', '--mc-font-size', '--mc-font-size-sm', '--mc-font-size-lg', '--mc-font-size-xl', '--mc-title-size', '--mc-line-height'].map(name => [name, root.getPropertyValue(name)]));
}
const qa: ClassicQA = {
  hasClassicFonts: bridge?.hasClassicFonts ?? false, hasGameFont: bridge?.hasGameFont ?? false, input: null, mounted: false,
  baseline: rootProperties(), configure: () => {}, setProfile: () => {}, unmount: () => {},
  paint({ text, family, color = '#ffffff', width = 240, height = 48, x = 8, baseline = 24 }) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const context = canvas.getContext('2d')!;
    context.font = `400 20px ${family}`; context.textBaseline = 'alphabetic'; context.textAlign = 'left'; context.fillStyle = color;
    context.fillText(text, x, baseline); const metrics = context.measureText(text), pixels = context.getImageData(0, 0, width, height).data;
    let value = ''; for (let i = 0; i < pixels.length; i += 32768) value += String.fromCharCode(...pixels.subarray(i, i + 32768));
    return { width, height, pixels: btoa(value), advance: metrics.width, ascent: metrics.actualBoundingBoxAscent, descent: metrics.actualBoundingBoxDescent };
  },
};
window.classicFontQA = qa;
const options = [{ value: 'a', label: 'Af 附魔' }, { value: 'b', label: 'f 物品栏' }];
function Specimens({ profile, setProfile }: { profile: DemoFontProfile | 'raw'; setProfile?: (profile: DemoFontProfile) => void }) {
  const [settings, setSettings] = useState<FixtureConfiguration>({ scoped: false, cost: 'green', overrides: false, roleFallback: false, tooltipOverride: false });
  const [value, setValue] = useState('Af 附魔'), [selected, setSelected] = useState('a'), [box, setBox] = useState('a'), [dialog, setDialog] = useState(false), [events, setEvents] = useState<string[]>([]);
  qa.mounted = true; qa.configure = config => setSettings(previous => ({ ...previous, ...config })); if (setProfile) qa.setProfile = setProfile;
  const event = (text: string) => setEvents(previous => [...previous, text]);
  const override: CSSProperties = settings.overrides ? { '--mc-font-unicode': '"MCBE Classic ASCII", monospace', '--mc-anvil-cost-success-color': '#112233', '--mc-anvil-cost-failure-color': '#334455', '--mc-anvil-cost-shadow-offset': '4px', '--mc-anvil-cost-shadow-color': '#010203', '--mc-anvil-cost-failure-shadow-color': '#030405' } as CSSProperties
    : settings.roleFallback ? { '--mc-font-unicode': 'initial' } as CSSProperties : {};
  return <main data-font-profile={profile} data-settings={JSON.stringify(settings)}>
    {theme && setProfile && <theme.ClassicFontExamples profile={profile as DemoFontProfile} onProfileChange={setProfile}/>}
    <div className="qa-controls"><button onClick={() => setDialog(true)}>Open font dialog</button><button onClick={() => { setValue('Af 附魔'); setSelected('a'); setBox('a'); event('reset'); }}>Reset controls</button><button onClick={() => qa.unmount()}>Unmount font theme</button></div>
    <Text id="qa-outside-text" shadow={false}>Af 附魔台</Text>
    <div className={['qa-font-grid qa-font-scope', settings.scoped && 'mc-classic-fonts'].filter(Boolean).join(' ')} data-font-scope>
      <div className="qa-font-row"><Text id="qa-text-sm" size="sm" shadow={false}>Af 附魔</Text><Text id="qa-text-md" shadow={false}>Af 附魔</Text><Text id="qa-text-lg" size="lg" shadow={false}>Af 附魔</Text><Text id="qa-text-xl" size="xl" shadow={false}>Af 附魔</Text></div>
      <TextField label="Controlled font input" name="fontInput" value={value} ref={node => { qa.input = node; }} onChange={e => { setValue(e.currentTarget.value); event(`input:${e.currentTarget.value}`); }} onCompositionStart={() => event('composition:start')} onCompositionEnd={() => event('composition:end')}/>
      <TextArea label="Controlled font textarea" value={value} onChange={e => { setValue(e.currentTarget.value); event(`textarea:${e.currentTarget.value}`); }}/>
      <Select label="Font Select" name="fontSelect" value={selected} options={options} onChange={e => { setSelected(e.currentTarget.value); event(`select:${e.currentTarget.value}`); }}/>
      <Combobox label="Font Combobox" value={box} options={options} onValueChange={next => { setBox(next); event(`combobox:${next}`); }}/>
    </div>
    <section id="qa-anvil-normal"><Anvil title="Af 附魔台" inventoryLabel="Af 物品栏" name={value} onNameChange={next => { setValue(next); event(`anvil:${next}`); }} cost={{ kind: 'levels', levels: 1, affordable: settings.cost === 'green', label: 'Af 1 附魔' }} style={settings.roleFallback ? { '--mc-font-unicode': 'initial' } as CSSProperties : undefined}/></section>
    <section id="qa-anvil-override"><Anvil title="Af 附魔台" name={value} cost={{ kind: 'levels', levels: 1, affordable: settings.cost === 'green', label: 'Af1' }} style={override}/></section>
    <ItemTooltip id="qa-item-tooltip" item={{ name: '钻石剑', lore: ['+7 攻击伤害'] }} style={{ position: 'relative', ...(settings.tooltipOverride ? { '--mc-item-tooltip-font': '"MCBE Classic ASCII", monospace' } : {}) } as CSSProperties}/>
    <Dialog open={dialog} onOpenChange={setDialog} title="Af 附魔台"><Text id="qa-dialog-text" shadow={false}>Af 附魔</Text><TextField label="Dialog font input" defaultValue="Af 附魔"/></Dialog>
    <output aria-label="Font fixture events">{events.join('|')}</output>
  </main>;
}
function Themed() { const control = theme!.useDemoFontProfile(); return <Specimens profile={control.profile} setProfile={control.setProfile}/>; }
function App() { const [mounted, setMounted] = useState(true); qa.unmount = () => { qa.mounted = false; setMounted(false); }; return mounted ? raw ? <Specimens profile="raw"/> : <Themed/> : <main data-theme-unmounted/>; }
createRoot(document.getElementById('classic-font-root')!).render(<App/>);
