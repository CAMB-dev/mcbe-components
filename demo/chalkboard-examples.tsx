import { useState } from 'react';
import { ChalkboardEditor, ChalkboardLock, ChalkboardTextField } from '../src/chalkboard';
import type { ChalkboardChangeDetail, ChalkboardValue } from '../src/chalkboard';
import { Combobox } from '../src/combobox';
import { Button, Switch } from '../src/components';

const initial: ChalkboardValue = { text: 'Welcome to the workshop.\n请先阅读任务，再开始建造。', locked: false };
export function ChalkboardExamples() {
  const [value, setValue] = useState(initial), [layout, setLayout] = useState('280'), [scale, setScale] = useState(1);
  const [accept, setAccept] = useState(true), [textEnabled, setTextEnabled] = useState(true), [lockVisible, setLockVisible] = useState(true);
  const [disabled, setDisabled] = useState(false), [readOnly, setReadOnly] = useState(false), [status, setStatus] = useState('Edit the board or change its lock.');
  const panelSize = (layout === '360' ? [360, 220] : [280, 180]) as readonly [number, number];
  const textBoxSize = (layout === '360' ? [344, 160] : [264, 120]) as readonly [number, number];
  function request(next: ChalkboardValue, field: ChalkboardChangeDetail['field']) {
    if (accept) setValue(next);
    setStatus(`${field === 'text' ? 'Text' : 'Lock'} request ${accept ? 'accepted' : 'declined'} by the host.`);
  }
  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16 }}>
      <Combobox label="Chalkboard host layout" value={layout} options={[{ value: '280', label: '280 × 180' }, { value: '360', label: '360 × 220' }]} onValueChange={setLayout}/>
      <Combobox label="Chalkboard scale" value={String(scale)} options={[1, 2, 3].map(n => ({ value: String(n), label: `${n}×` }))} onValueChange={n => setScale(Number(n))}/>
      <Switch label="Accept board requests" checked={accept} onChange={e => setAccept(e.target.checked)}/>
      <Switch label="Enable text editing" checked={textEnabled} onChange={e => setTextEnabled(e.target.checked)}/>
      <Switch label="Show lock control" checked={lockVisible} onChange={e => setLockVisible(e.target.checked)}/>
      <Switch label="Read-only board" checked={readOnly} onChange={e => setReadOnly(e.target.checked)}/>
      <Switch label="Disable board controls" checked={disabled} onChange={e => setDisabled(e.target.checked)}/>
      <Button onClick={() => { setValue(initial); setStatus('Host reset the example.'); }}>Reset board</Button>
    </div>
    <div role="region" aria-label="Chalkboard preview" tabIndex={0} style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: 4 }}>
      <ChalkboardEditor panelSize={panelSize} textBoxSize={textBoxSize} maxLength={256} title="Chalkboard" textLabel="Board text"
        textEnabled={textEnabled} lockVisible={lockVisible} lockLabel={value.locked ? 'Locked' : 'Unlocked'} closeVisible
        value={value} scale={scale} disabled={disabled} readOnly={readOnly} onValueChange={(next, detail) => request(next, detail.field)}
        onCloseRequest={(_accepted, detail) => setStatus(`Host received ${detail.reason === 'escape' ? 'Escape' : 'Close'} request.`)}/>
    </div>
    <details>
      <summary>Reuse the text field and lock</summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24, padding: '16px 4px 4px' }}>
        <ChalkboardTextField label="Standalone board text" size={[240, 64]} maxLength={256} scale={1} textEnabled={textEnabled}
          value={value.text} readOnly={readOnly} disabled={disabled} onValueChange={text => request({ ...value, text }, 'text')}/>
        <ChalkboardLock label={value.locked ? 'Locked' : 'Unlocked'} checked={value.locked} scale={1} disabled={disabled} readOnly={readOnly}
          onCheckedChange={locked => request({ ...value, locked }, 'locked')}/>
      </div>
    </details>
    <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12 }}>{status}</p>
    <p style={{ margin: 0, fontSize: 12 }}>Dimensions, text, labels and edit permissions are supplied by the application. Locking the board does not determine who may edit it.</p>
    <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{'<ChalkboardEditor panelSize={[280, 180]} textBoxSize={[264, 120]}\n  maxLength={256} title="Chalkboard" textEnabled={canEdit}\n  lockVisible={canLock} lockLabel={lockLabel} closeVisible\n  value={board} onValueChange={setBoard}/>'}</pre>
  </div>;
}
