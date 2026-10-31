import { useState } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { ScreenshotFlash } from '../src/screenshot-flash';
import type { ScreenshotFlashControl, ScreenshotFlashEasing } from '../src/screenshot-flash';

const candidate = new URL('./screenshot-assets/white-candidate.png', import.meta.url).href;

export function ScreenshotExamples() {
  const [serial, setSerial] = useState(0), [active, setActive] = useState(false);
  const [mode, setMode] = useState('timeline'), [sample, setSample] = useState('0.5');
  const [duration, setDuration] = useState('500'), [easing, setEasing] = useState<ScreenshotFlashEasing>('web-in-expo');
  const [motion, setMotion] = useState<'system' | 'animate' | 'skip'>('system');
  const [keepBackground, setKeepBackground] = useState(false), [underlying, setUnderlying] = useState(0);
  const [status, setStatus] = useState('Choose a supplied-texture preview. Duration is an application input.');
  const control: ScreenshotFlashControl | undefined = mode === 'alpha' ? { kind: 'alpha', value: Number(sample) } : mode === 'progress' ? { kind: 'progress', value: Number(sample) } : undefined;
  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
      <Combobox label="Flash clock" value={mode} onValueChange={setMode} options={[{ value: 'timeline', label: 'Application duration' }, { value: 'alpha', label: 'Controlled alpha' }, { value: 'progress', label: 'Controlled progress' }]}/>
      <Combobox label="Flash duration input" value={duration} onValueChange={setDuration} options={[{ value: '200', label: '200 ms' }, { value: '500', label: '500 ms' }, { value: '1000', label: '1000 ms' }]}/>
      <Combobox label="Flash controlled value" value={sample} onValueChange={setSample} options={[{ value: '0', label: '0' }, { value: '0.5', label: '0.5' }, { value: '1', label: '1' }]}/>
      <Combobox label="Flash easing mapping" value={typeof easing === 'string' ? easing : 'web-in-expo'} onValueChange={v => setEasing(v === 'linear' ? 'linear' : 'web-in-expo')} options={[{ value: 'web-in-expo', label: 'Web exponential mapping' }, { value: 'linear', label: 'Linear host mapping' }]}/>
      <Combobox label="Flash motion policy" value={motion} onValueChange={v => { if (v === 'system' || v === 'animate' || v === 'skip') setMotion(v); }} options={[{ value: 'system', label: 'Follow reduced motion' }, { value: 'animate', label: 'Animate preview' }, { value: 'skip', label: 'Skip animation' }]}/>
      <Switch label="Keep source background after completion" checked={keepBackground} onChange={e => setKeepBackground(e.target.checked)}/>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Button onClick={() => { setSerial(n => n + 1); setActive(true); setStatus('Supplied archive specimen activated.'); }}>Preview supplied texture</Button>
      <Button onClick={() => { setActive(false); setStatus('The application hid the overlay.'); }}>Hide flash overlay</Button>
    </div>
    <div style={{ position: 'relative', width: '100%', maxWidth: 640, height: 200, overflow: 'clip', background: '#24352b', display: 'grid', placeItems: 'center' }}>
      <Button onClick={() => setUnderlying(n => n + 1)}>Underlying action: {underlying}</Button>
      <ScreenshotFlash size="parent" durationMs={Number(duration)} flashImage={{ src: candidate, sourceSize: [15, 15] }} trigger={active ? serial : null}
        easing={easing} motion={motion} control={control} onFinished={detail => {
          setStatus(`Activation ${detail.trigger} finished (${detail.mode}).${keepBackground ? ' Source background remains visible.' : ' The application hid the overlay.'}`);
          if (!keepBackground) setActive(false);
        }}/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0 }}>{status}</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>This preview explicitly supplies the complete 15×15 archive casefold specimen, including its black border. Its mapping to the runtime White texture is unverified. Applications supply the resolved flash artwork and duration; the original feed background remains until the application hides the overlay.</p>
  </div>;
}
