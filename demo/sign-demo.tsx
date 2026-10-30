import { useRef, useState } from 'react';
import { Button, Combobox, Switch } from '../src';
import { SignEditor, SignTextSurface } from '../src/sign';
import type { SignCloseDetail, SignEditorProps, SignVariant, SignWood } from '../src/sign';
import '../src/sign.css';
import './demo.css';

const woods: readonly { value: SignWood; label: string }[] = [
  { value: 'oak', label: 'Oak' }, { value: 'spruce', label: 'Spruce' }, { value: 'birch', label: 'Birch' },
  { value: 'jungle', label: 'Jungle' }, { value: 'acacia', label: 'Acacia' }, { value: 'dark-oak', label: 'Dark oak' },
  { value: 'mangrove', label: 'Mangrove' }, { value: 'cherry', label: 'Cherry' }, { value: 'bamboo', label: 'Bamboo' },
  { value: 'crimson', label: 'Crimson' }, { value: 'warped', label: 'Warped' }, { value: 'pale-oak', label: 'Pale oak' },
  { value: 'poplar', label: 'Poplar' },
];
const samples = {
  mixed: 'Welcome!\n欢迎来到村庄', english: 'The garden\nPlease close the gate', chinese: '村庄花园\n请随手关门', empty: '',
};
type ExitBehavior = NonNullable<SignEditorProps['exitBehavior']>;

export function SignExamples({ notify }: { notify: (message: string) => void }) {
  const [variant, setVariant] = useState<SignVariant>('regular'), [wood, setWood] = useState<SignWood>('oak');
  const [value, setValue] = useState(samples.mixed), [saved, setSaved] = useState(samples.mixed);
  const [sample, setSample] = useState('mixed'), [scale, setScale] = useState(2);
  const [readOnly, setReadOnly] = useState(false), [disabled, setDisabled] = useState(false), [open, setOpen] = useState(false);
  const [closeOnOutside, setCloseOnOutside] = useState(true), [exitBehavior, setExitBehavior] = useState<ExitBehavior>('request');
  const [receipt, setReceipt] = useState('Edit the sign below, or open the modal editor.');
  const [lastClose, setLastClose] = useState<{ reason: SignCloseDetail['reason']; behavior: ExitBehavior; value: string } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const report = (message: string) => { setReceipt(message); notify(message); };
  const acceptText = (next: string) => { setValue(next); setSample('custom'); };
  function reset() {
    setVariant('regular'); setWood('oak'); setValue(samples.mixed); setSaved(samples.mixed); setSample('mixed'); setScale(2);
    setReadOnly(false); setDisabled(false); setOpen(false); setCloseOnOutside(true); setExitBehavior('request'); setLastClose(null);
    report('Sign examples restored.');
  }
  return <section className="sign-demo" data-sign-demo aria-label="Sign surface and editor examples">
    <p className="sign-demo__note">Source-backed textures and layout. Native comparison is pending. Choose regular or hanging signs and one of thirteen complete wood textures; the wood associations remain explicit display candidates.</p>
    <div className="sign-demo__controls">
      <Combobox label="Sign type" value={variant} onValueChange={next => setVariant(next === 'hanging' ? 'hanging' : 'regular')}
        options={[{ value: 'regular', label: 'Regular sign' }, { value: 'hanging', label: 'Hanging sign' }]}/>
      <Combobox label="Sign wood" value={wood} options={woods} onValueChange={next => { const option = woods.find(item => item.value === next); if (option) setWood(option.value); }}/>
      <Combobox label="Text sample" value={sample} disabled={readOnly || disabled}
        options={[{ value: 'mixed', label: 'English and Chinese' }, { value: 'english', label: 'English' }, { value: 'chinese', label: '中文' }, { value: 'empty', label: 'Empty sign' }, { value: 'custom', label: 'Your text', disabled: true }]}
        onValueChange={next => { if (next in samples) { setValue(samples[next as keyof typeof samples]); setSample(next); } }}/>
      <Combobox label="Sign display scale" value={String(scale)} onValueChange={next => setScale(Number(next))}
        options={[1, 2, 3].map(next => ({ value: String(next), label: `${next}×` }))}/>
    </div>
    <div className="sign-demo__actions">
      <Switch label="Read-only sign" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable sign" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Button size="sm" disabled={disabled} onClick={() => textarea.current?.focus()}>Focus sign text</Button>
      <Button size="sm" onClick={reset}>Reset sign examples</Button>
    </div>
    <div className="sign-demo__preview" role="region" aria-label="Sign surface preview" tabIndex={0}>
      <div className="sign-demo__surface-space" style={{ padding: variant === 'hanging' ? `${64 * scale}px ${96 * scale}px` : 16 }}>
      <SignTextSurface variant={variant} wood={wood} value={value} onValueChange={acceptText} scale={scale}
        label="Sign text" readOnly={readOnly} disabled={disabled} textareaRef={textarea}
        textareaProps={{ spellCheck: false }} data-sign-demo-surface/>
      </div>
    </div>
    <div className="sign-demo__controls">
      <Combobox label="Modal exit policy" value={exitBehavior} onValueChange={next => setExitBehavior(next === 'commit' || next === 'cancel' ? next : 'request')}
        options={[{ value: 'request', label: 'Close request · keep draft' }, { value: 'commit', label: 'Commit · remember text' }, { value: 'cancel', label: 'Cancel · restore remembered text' }]}/>
      <Switch label="Close when clicking outside" checked={closeOnOutside} onChange={event => setCloseOnOutside(event.target.checked)}/>
    </div>
    <div className="sign-demo__actions"><Button variant="primary" onClick={() => { setOpen(true); setReceipt('Modal editor opened. Escape or click outside to close it.'); }}>Open sign editor</Button></div>
    <p className="sign-demo__note">Enter adds a new line. Escape closes the modal; outside clicks close it when enabled. Commit remembers this demo text, and Cancel restores that remembered value.</p>
    <SignEditor variant={variant} wood={wood} value={value} onValueChange={acceptText} scale={scale} open={open}
      label="Edit sign text" aria-label="Example sign editor" readOnly={readOnly} disabled={disabled} autoFocus
      closeOnOutside={closeOnOutside} exitBehavior={exitBehavior} textareaProps={{ spellCheck: false }}
      onCloseRequest={(accepted, detail) => setLastClose({ reason: detail.reason, behavior: exitBehavior, value: accepted })}
      onCommit={accepted => { setSaved(accepted); }}
      onCancel={() => { setValue(saved); setSample('custom'); }}
      onOpenChange={(next, detail) => { setOpen(next); report(`Sign editor ${next ? 'opened' : 'closed'}: ${detail.reason}.`); }}/>
    <output className="sign-demo__note" role="status" aria-label="Sign action receipt" data-sign-demo-receipt>{receipt}</output>
    {lastClose && <p className="sign-demo__note" data-sign-demo-close>Last close: {lastClose.reason} · {lastClose.behavior}.</p>}
    <details className="sign-demo__saved"><summary>Remembered text</summary><pre>{saved || '(empty)'}</pre></details>
    <pre className="sign-demo__code"><code>{'<SignTextSurface variant="regular" wood="oak"\n  value={text} onValueChange={setText} />\n<SignEditor open={open} onOpenChange={setOpen}\n  variant="hanging" wood="cherry"\n  value={text} onValueChange={setText}\n  onCloseRequest={(value, { reason }) => report(reason)} />'}</code></pre>
  </section>;
}
