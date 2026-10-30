import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { JigsawEditor, JigsawPriorityFields } from '../src/jigsaw';
import type { JigsawPriorities, JigsawValue } from '../src/jigsaw';
import '../src/jigsaw.css';

const initialValue: JigsawValue = {
  targetPool: 'demo:paths', name: 'demo:entrance', target: 'demo:path', finalBlock: 'minecraft:air',
  selectionPriority: '0', placementPriority: '0', joint: 'rollable',
};
const initialPriorities: JigsawPriorities = { selectionPriority: '2', placementPriority: '1' };
const fieldNames: Record<keyof JigsawValue, string> = {
  targetPool: 'target pool', name: 'name', target: 'target', finalBlock: 'final block',
  selectionPriority: 'selection priority', placementPriority: 'placement priority', joint: 'joint type',
};
const stack: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 };
const controls: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16, minWidth: 0 };
const preview: CSSProperties = { minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '8px 0' };
const note: CSSProperties = { margin: 0, fontSize: 12, overflowWrap: 'anywhere' };
const code: CSSProperties = { margin: 0, maxWidth: '100%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 };

export function JigsawExamples({ notify }: { notify: (message: string) => void }) {
  const id = `jigsaw-demo-${useId()}`;
  const [value, setValue] = useState<JigsawValue>(() => ({ ...initialValue }));
  const [priorities, setPriorities] = useState<JigsawPriorities>(() => ({ ...initialPriorities }));
  const [saved, setSaved] = useState<JigsawValue | null>(null);
  const [width, setWidth] = useState(320), [height, setHeight] = useState(260), [scale, setScale] = useState(2);
  const [readOnly, setReadOnly] = useState(false), [disabled, setDisabled] = useState(false);
  const [open, setOpen] = useState(true), [helpOpen, setHelpOpen] = useState(false);
  const [receipt, setReceipt] = useState('Edit the connection settings, then choose Done to keep a copy in this demo.');
  const report = (message: string) => { setReceipt(message); notify(message); };
  function reset() {
    setValue({ ...initialValue }); setPriorities({ ...initialPriorities }); setSaved(null);
    setWidth(320); setHeight(260); setScale(2); setReadOnly(false); setDisabled(false); setOpen(true); setHelpOpen(false);
    report('Jigsaw examples restored.');
  }
  return <section data-jigsaw-examples aria-label="Jigsaw editor examples" style={{ ...stack, gap: 24, padding: 16 }}>
    <p style={note}>Edit a connection, switch its joint type, and try the two priority fields. Changes stay in this demo.</p>
    <div style={controls}>
      <Combobox label="Editor width" value={String(width)} options={[320, 400, 480].map(size => ({ value: String(size), label: String(size) }))}
        onValueChange={next => setWidth(Number(next))}/>
      <Combobox label="Editor height" value={String(height)} options={[260, 320, 400].map(size => ({ value: String(size), label: String(size) }))}
        onValueChange={next => setHeight(Number(next))}/>
      <Combobox label="Editor scale" value={String(scale)} options={[1, 2, 3].map(size => ({ value: String(size), label: `${size}x` }))}
        onValueChange={next => setScale(Number(next))}/>
    </div>
    <div style={controls}>
      <Switch label="Read-only jigsaw form" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable jigsaw form" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Button size="sm" disabled={open} onClick={() => { setOpen(true); report('Jigsaw editor reopened with your draft.'); }}>Open jigsaw editor</Button>
      <Button size="sm" onClick={reset}>Reset jigsaw examples</Button>
    </div>
    <div data-jigsaw-editor-preview role="region" aria-label="Jigsaw editor preview" tabIndex={0} style={preview}>
      {open ? <JigsawEditor value={value} size={[width, height]} scale={scale} readOnly={readOnly} disabled={disabled}
        aria-label="Example jigsaw editor"
        onValueChange={(next, detail) => { setValue({ ...next }); setReceipt(`Updated ${fieldNames[detail.field]}.`); }}
        onDone={snapshot => { setSaved({ ...snapshot }); setOpen(false); report(`Kept ${snapshot.name || 'the unnamed connection'} in this demo.`); }}
        onHelp={() => { setHelpOpen(previous => !previous); report(helpOpen ? 'Jigsaw help closed.' : 'Jigsaw help opened.'); }}
        onCancel={(_snapshot, detail) => { setOpen(false); report(detail.reason === 'escape' ? 'Editor closed with Escape. Your draft is kept.' : 'Back selected. Your draft is kept.'); }}/>
        : <p style={note}>The editor is closed. Open it again to continue with the same draft.</p>}
    </div>
    {helpOpen && <aside id={`${id}-help`} data-jigsaw-demo-help style={stack} aria-label="Jigsaw example help">
      <p style={note}>Edit the connection identifiers and priorities, then choose a joint type. Done keeps a local copy; Back closes the editor without clearing your draft.</p>
      <div><Button size="sm" onClick={() => { setHelpOpen(false); report('Jigsaw help closed.'); }}>Close jigsaw help</Button></div>
    </aside>}
    <output data-jigsaw-demo-receipt role="status" aria-label="Jigsaw action receipt" style={{ ...note, display: 'block' }}>{receipt}</output>
    {saved && <details data-jigsaw-saved-draft>
      <summary>Last copy kept in this demo</summary>
      <pre style={code}>{JSON.stringify(saved, null, 2)}</pre>
    </details>}
    <pre style={code}><code>{'<JigsawEditor value={draft} onValueChange={setDraft}\n  size={[320, 260]} scale={2}\n  onDone={keepDraft} onHelp={showHelp}\n  onCancel={closeEditor} />'}</code></pre>
    <section data-jigsaw-priority-example aria-labelledby={`${id}-priorities-title`} style={stack}>
      <h3 id={`${id}-priorities-title`} style={{ margin: 0 }}>Reusable priority fields</h3>
      <p style={note}>Use the priority pair on its own in another form. This pair has its own values.</p>
      <div role="region" aria-label="Independent jigsaw priorities preview" tabIndex={0} style={preview}>
        <div style={{ width: 320 * scale }}>
          <JigsawPriorityFields value={priorities} scale={scale} fieldHeight={32} readOnly={readOnly} disabled={disabled}
            onValueChange={next => setPriorities({ ...next })}/>
        </div>
      </div>
      <output data-jigsaw-priority-values aria-label="Independent priority values" style={note}>Selection: {priorities.selectionPriority || '(empty)'}; placement: {priorities.placementPriority || '(empty)'}</output>
      <pre style={code}><code>{'<JigsawPriorityFields value={priorities}\n  onValueChange={setPriorities} scale={2} />'}</code></pre>
    </section>
  </section>;
}
