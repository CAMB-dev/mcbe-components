import { useId, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { StructureEditor, XYZVectorInput } from '../src/structure-editor';
import '../src/structure-editor.css';

type StructureDraft = NonNullable<ComponentProps<typeof StructureEditor>['value']>;
type XYZDraft = NonNullable<ComponentProps<typeof XYZVectorInput>['value']>;
function initialValue(): StructureDraft {
  return {
    mode: 'save', name: 'demo:small_house',
    saveSize: { x: '8', y: '6', z: '8' }, saveOffset: { x: '0', y: '-1', z: '0' },
    loadOffset: { x: '0', y: '0', z: '0' },
    exportSize: { x: '8', y: '6', z: '8' }, exportOffset: { x: '0', y: '-1', z: '0' },
    integrity: '100.00', seed: '42', data: 'demo_marker', animationTime: '1.5',
    includeEntities: true, removeBlocks: false, waterlogging: false, showBoundingBox: true,
    mirrorX: false, mirrorZ: false, rotation: 0, redstoneSaveMode: 'memory', animationMode: 'none',
  };
}
const stack: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 };
const controls: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16, minWidth: 0 };
const preview: CSSProperties = { minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '8px 0' };
const note: CSSProperties = { margin: 0, fontSize: 12, overflowWrap: 'anywhere' };
const code: CSSProperties = { margin: 0, maxWidth: '100%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 };
const editorCode = `const [draft, setDraft] = useState<StructureEditorValue>(initialDraft);
const [receipt, setReceipt] = useState('');

return <><output>{receipt}</output>
  <StructureEditor value={draft} onValueChange={next => setDraft(next)}
    size={[480, 270]} scale={2}
    capabilities={{ dataSupport: true, export3dSupport: true,
      filePickingSupported: true }}
    preview={<p>Your application supplies the preview.</p>}
    onAction={(action, accepted) => {
      setDraft(accepted);
      setReceipt(action + ' requested');
    }}
    onCancel={(_accepted, detail) => setReceipt(detail.reason)} />
</>;`;

export function StructureEditorExamples({ notify }: { notify: (message: string) => void }) {
  const id = `structure-editor-demo-${useId()}`;
  const [value, setValue] = useState<StructureDraft>(initialValue);
  const [point, setPoint] = useState<XYZDraft>(() => ({ x: '1', y: '-2', z: '3' }));
  const [width, setWidth] = useState(480), [height, setHeight] = useState(270), [scale, setScale] = useState(2);
  const [open, setOpen] = useState(true), [readOnly, setReadOnly] = useState(false), [disabled, setDisabled] = useState(false);
  const [dataSupport, setDataSupport] = useState(true), [export3dSupport, setExport3dSupport] = useState(true);
  const [filePickingSupported, setFilePickingSupported] = useState(true), [showPreview, setShowPreview] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lastAction, setLastAction] = useState<{ action: string; value: StructureDraft } | null>(null);
  const [receipt, setReceipt] = useState('Choose a mode and edit its settings. Changes stay in this demo.');
  const report = (message: string) => { setReceipt(message); notify(message); };
  function reset() {
    setValue(initialValue()); setPoint({ x: '1', y: '-2', z: '3' });
    setWidth(480); setHeight(270); setScale(2); setOpen(true); setReadOnly(false); setDisabled(false);
    setDataSupport(true); setExport3dSupport(true); setFilePickingSupported(true); setShowPreview(true);
    setHelpOpen(false); setLastAction(null); report('Structure editor examples restored.');
  }
  const previewContent = showPreview ? <div data-structure-host-preview style={{ ...stack, height: '100%', placeContent: 'center', padding: 16, textAlign: 'center' }}>
    <strong>Application preview</strong>
    <p style={note}>{value.name || 'Unnamed structure'}</p>
    <p style={note}>Mode: {value.mode}</p>
    <p style={note}>Your application can place its own preview here.</p>
  </div> : null;
  return <section data-structure-editor-examples aria-label="Structure editor examples" style={{ ...stack, gap: 24, padding: 16 }}>
    <p style={note}>Switch between structure modes and edit their settings. Action buttons record requests in this demo; they do not change a world or open files.</p>
    <div style={controls}>
      <Combobox label="Structure viewport width" value={String(width)} options={[480, 560, 640].map(size => ({ value: String(size), label: String(size) }))}
        onValueChange={next => setWidth(Number(next))}/>
      <Combobox label="Structure viewport height" value={String(height)} options={[270, 340, 420].map(size => ({ value: String(size), label: String(size) }))}
        onValueChange={next => setHeight(Number(next))}/>
      <Combobox label="Structure display scale" value={String(scale)} options={[1, 2, 3].map(size => ({ value: String(size), label: `${size}x` }))}
        onValueChange={next => setScale(Number(next))}/>
    </div>
    <div style={controls}>
      <Switch label="Read-only structure examples" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable structure examples" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Button size="sm" disabled={open} onClick={() => { setOpen(true); report('Structure editor reopened with your draft.'); }}>Open structure editor</Button>
      <Button size="sm" onClick={reset}>Reset structure examples</Button>
    </div>
    <details data-structure-demo-options>
      <summary>Preview options</summary>
      <div style={{ ...controls, paddingTop: 16 }}>
        <Switch label="Offer Data mode" checked={dataSupport} onChange={event => {
          const next = event.target.checked; setDataSupport(next);
          if (!next) setValue(current => current.mode === 'data' ? { ...current, mode: 'save' } : current);
        }}/>
        <Switch label="Offer 3D Export mode" checked={export3dSupport} onChange={event => {
          const next = event.target.checked; setExport3dSupport(next);
          if (!next) setValue(current => current.mode === 'export' ? { ...current, mode: 'save' } : current);
        }}/>
        <Switch label="Offer file action requests" checked={filePickingSupported} onChange={event => setFilePickingSupported(event.target.checked)}/>
        <Switch label="Show application preview" checked={showPreview} onChange={event => setShowPreview(event.target.checked)}/>
      </div>
    </details>
    <div data-structure-editor-preview role="region" aria-label="Structure editor preview" tabIndex={0} style={preview}>
      {open ? <StructureEditor value={value} size={[width, height]} scale={scale} readOnly={readOnly} disabled={disabled}
        aria-label="Example structure editor" capabilities={{ dataSupport, export3dSupport, filePickingSupported }} preview={previewContent}
        onValueChange={(next, detail) => { setValue(next); setReceipt(`Updated ${detail.field}${detail.axis ? ` ${detail.axis.toUpperCase()}` : ''}.`); }}
        onAction={(action, accepted) => {
          setLastAction({ action, value: accepted });
          if (action === 'help') setHelpOpen(true);
          report(`${action === 'export3d' ? '3D export' : action.charAt(0).toUpperCase() + action.slice(1)} requested. Draft kept in this demo.`);
        }}
        onCancel={(accepted, detail) => { setLastAction({ action: detail.reason, value: accepted }); setOpen(false); report(`Editor closed (${detail.reason}). Your draft is kept.`); }}/>
        : <p style={note}>The editor is closed. Open it again to continue with the same draft.</p>}
    </div>
    {helpOpen && <aside data-structure-demo-help aria-label="Structure example help" style={stack}>
      <p style={note}>Choose a mode to see its fields. Size and offset values remain editable text. The application supplies the preview and decides how to handle each action request.</p>
      <div><Button size="sm" onClick={() => { setHelpOpen(false); report('Structure help closed.'); }}>Close structure help</Button></div>
    </aside>}
    <output data-structure-demo-receipt role="status" aria-label="Structure action receipt" style={{ ...note, display: 'block' }}>{receipt}</output>
    <details data-structure-accepted-draft><summary>Current accepted draft</summary><pre style={code}>{JSON.stringify(value, null, 2)}</pre></details>
    {lastAction && <details data-structure-action-snapshot><summary>Last action request</summary><pre style={code}>{JSON.stringify(lastAction, null, 2)}</pre></details>}
    <pre style={code}><code>{editorCode}</code></pre>
    <section data-structure-xyz-example aria-labelledby={`${id}-xyz-title`} style={stack}>
      <h3 id={`${id}-xyz-title`} style={{ margin: 0 }}>Reusable XYZ fields</h3>
      <p style={note}>Use the three fields in another form. This position has its own draft.</p>
      <div role="region" aria-label="Independent XYZ preview" tabIndex={0} style={preview}>
        <div style={{ width: 180 * scale }}>
          <XYZVectorInput label="Position" value={point} onValueChange={(next, detail) => { setPoint(next); setReceipt(`Updated independent ${detail.axis.toUpperCase()} position.`); }}
            maxLength={5} scale={scale} readOnly={readOnly} disabled={disabled}/>
        </div>
      </div>
      <output data-structure-independent-xyz aria-label="Independent XYZ draft" style={note}>X: {point.x || '(empty)'}; Y: {point.y || '(empty)'}; Z: {point.z || '(empty)'}</output>
      <pre style={code}><code>{'const [position, setPosition] = useState({ x: \'0\', y: \'0\', z: \'0\' });\n\n<XYZVectorInput label="Position" value={position}\n  onValueChange={setPosition} maxLength={5} scale={2} />'}</code></pre>
    </section>
  </section>;
}
