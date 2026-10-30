import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { CommandBlockEditor, CommandInput, CommandOutputPanel } from '../src/command-block';
import type { CommandBlockValue, CommandPreviousInfo } from '../src/command-block';
import '../src/command-block.css';

const initialValue: CommandBlockValue = {
  hoverNote: 'Welcome', command: 'say Hello from the demo', tickDelay: '0',
  blockType: 'impulse', condition: 'unconditional', redstone: 'needs_redstone',
  executeFirstTick: false, trackOutput: true,
};
const sampleOutput = 'Example output supplied by the host.\nNothing has been executed in this demo.';
const sampleInfo: CommandPreviousInfo = { blockType: 'Chain', condition: 'Conditional', redstone: 'Always Active' };
const stack: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 };
const controls: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16, minWidth: 0 };
const preview: CSSProperties = { minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '8px 0' };
const note: CSSProperties = { margin: 0, fontSize: 12, overflowWrap: 'anywhere' };
const code: CSSProperties = { margin: 0, maxWidth: '100%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 };
const editorCode = `const [draft, setDraft] = useState<CommandBlockValue>({
  hoverNote: 'Welcome', command: 'say Hello', tickDelay: '0',
  blockType: 'impulse', condition: 'unconditional',
  redstone: 'needs_redstone', executeFirstTick: false, trackOutput: true,
});
const [open, setOpen] = useState(true);
const [expanded, setExpanded] = useState(false);
const [receipt, setReceipt] = useState('');

return <><output>{receipt}</output>{open ? <CommandBlockEditor value={draft}
  onValueChange={next => setDraft(next)}
  expanded={expanded} onExpandedChange={next => setExpanded(next)}
  viewportSize={[400, 300]} scale={2}
  previousOutput="A separate output snapshot"
  previousInfo={{ blockType: 'Chain' }}
  onPasteRequest={() => setReceipt('Paste requested')}
  onClose={(accepted, detail) => {
    setDraft(accepted);
    setReceipt(detail.reason);
    setOpen(false);
  }} /> : <Button onClick={() => setOpen(true)}>Open editor</Button>}</>;`;

export function CommandBlockExamples({ notify }: { notify: (message: string) => void }) {
  const id = `command-block-demo-${useId()}`;
  const [value, setValue] = useState<CommandBlockValue>(() => ({ ...initialValue }));
  const [open, setOpen] = useState(true), [expanded, setExpanded] = useState(false);
  const [lastClosed, setLastClosed] = useState<CommandBlockValue | null>(null);
  const [width, setWidth] = useState(400), [height, setHeight] = useState(300), [scale, setScale] = useState(2);
  const [readOnly, setReadOnly] = useState(false), [disabled, setDisabled] = useState(false);
  const [warning, setWarning] = useState(false), [firstTickEnabled, setFirstTickEnabled] = useState(true);
  const [dropdownsEnabled, setDropdownsEnabled] = useState(true), [pasteEnabled, setPasteEnabled] = useState(true);
  const [cancelEnabled, setCancelEnabled] = useState(true), [trackOutputEnabled, setTrackOutputEnabled] = useState(true);
  const [dividerVisible, setDividerVisible] = useState(true);
  const [showClose, setShowClose] = useState(true), [showMinimize, setShowMinimize] = useState(true);
  const [showHeaderPaste, setShowHeaderPaste] = useState(true);
  const [previousOutput, setPreviousOutput] = useState(sampleOutput);
  const [previousInfo, setPreviousInfo] = useState<CommandPreviousInfo>(() => ({ ...sampleInfo }));
  const [standaloneCommand, setStandaloneCommand] = useState('say A separate draft');
  const [standaloneExpanded, setStandaloneExpanded] = useState(false), [standaloneTrack, setStandaloneTrack] = useState(true);
  const [receipt, setReceipt] = useState('Edit a draft and try its controls. All changes stay in this demo.');
  const report = (message: string) => { setReceipt(message); notify(message); };
  function reset() {
    setValue({ ...initialValue }); setOpen(true); setExpanded(false); setLastClosed(null);
    setWidth(400); setHeight(300); setScale(2); setReadOnly(false); setDisabled(false);
    setWarning(false); setFirstTickEnabled(true); setDropdownsEnabled(true); setPasteEnabled(true);
    setCancelEnabled(true); setTrackOutputEnabled(true); setDividerVisible(true); setShowClose(true); setShowMinimize(true); setShowHeaderPaste(true);
    setPreviousOutput(sampleOutput); setPreviousInfo({ ...sampleInfo });
    setStandaloneCommand('say A separate draft'); setStandaloneExpanded(false); setStandaloneTrack(true);
    report('Command block examples restored.');
  }
  return <section data-command-block-examples aria-label="Command block examples" style={{ ...stack, gap: 24, padding: 16 }}>
    <p style={note}>Edit a command block draft, expand its input, and explore the settings. This example keeps text locally and never runs commands.</p>
    <div style={controls}>
      <Combobox label="Command viewport width" value={String(width)} options={[400, 480, 640].map(size => ({ value: String(size), label: String(size) }))}
        onValueChange={next => setWidth(Number(next))}/>
      <Combobox label="Command viewport height" value={String(height)} options={[300, 360, 440].map(size => ({ value: String(size), label: String(size) }))}
        onValueChange={next => setHeight(Number(next))}/>
      <Combobox label="Command display scale" value={String(scale)} options={[1, 2, 3].map(size => ({ value: String(size), label: `${size}x` }))}
        onValueChange={next => setScale(Number(next))}/>
    </div>
    <div style={controls}>
      <Switch label="Read-only command examples" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable command examples" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Button size="sm" disabled={open} onClick={() => { setOpen(true); setExpanded(false); report('Command block editor reopened with your draft.'); }}>Open command block editor</Button>
      <Button size="sm" disabled={disabled || readOnly} onClick={() => { setValue(current => ({ ...current, command: 'say Hello from the sample' })); report('Sample command text loaded into the draft.'); }}>Load command sample</Button>
      <Button size="sm" onClick={reset}>Reset command block examples</Button>
    </div>
    <details data-command-demo-options>
      <summary>Preview options</summary>
      <div style={{ ...controls, paddingTop: 16 }}>
        <Switch label="Show command warning" checked={warning} onChange={event => setWarning(event.target.checked)}/>
        <Switch label="Enable first tick option" checked={firstTickEnabled} onChange={event => setFirstTickEnabled(event.target.checked)}/>
        <Switch label="Enable command dropdowns" checked={dropdownsEnabled} onChange={event => setDropdownsEnabled(event.target.checked)}/>
        <Switch label="Enable paste requests" checked={pasteEnabled} onChange={event => setPasteEnabled(event.target.checked)}/>
        <Switch label="Enable Cancel" checked={cancelEnabled} onChange={event => setCancelEnabled(event.target.checked)}/>
        <Switch label="Enable output tracking" checked={trackOutputEnabled} onChange={event => setTrackOutputEnabled(event.target.checked)}/>
        <Switch label="Show column divider" checked={dividerVisible} onChange={event => setDividerVisible(event.target.checked)}/>
        <Switch label="Show close button" checked={showClose} onChange={event => setShowClose(event.target.checked)}/>
        <Switch label="Show expanded minimize button" checked={showMinimize} onChange={event => setShowMinimize(event.target.checked)}/>
        <Switch label="Show expanded paste button" checked={showHeaderPaste} onChange={event => setShowHeaderPaste(event.target.checked)}/>
        <Button size="sm" disabled={!expanded || disabled} onClick={() => { setExpanded(false); report('Expanded command input restored by the host.'); }}>Restore compact input</Button>
      </div>
    </details>
    <div data-command-editor-preview role="region" aria-label="Command block editor preview" tabIndex={0} style={preview}>
      {open ? <CommandBlockEditor value={value} viewportSize={[width, height]} scale={scale} readOnly={readOnly} disabled={disabled}
        aria-label="Example command block editor" expanded={expanded}
        firstTickEnabled={firstTickEnabled} pasteEnabled={pasteEnabled} cancelEnabled={cancelEnabled} trackOutputEnabled={trackOutputEnabled}
        charLimitWarning={warning} dividerVisible={dividerVisible}
        closeVisible={!expanded && showClose} minimizeVisible={expanded && showMinimize} headerPasteVisible={expanded && showHeaderPaste}
        enabled={{ blockType: dropdownsEnabled, condition: dropdownsEnabled, redstone: dropdownsEnabled }}
        previousOutput={previousOutput} previousInfo={previousInfo}
        onValueChange={(next, detail) => { setValue({ ...next }); setReceipt(`Updated ${detail.field}.`); }}
        onExpandedChange={(next, detail) => { setExpanded(next); report(`${next ? 'Expanded' : 'Minimized'} command input (${detail.reason}).`); }}
        onPasteRequest={() => report('Paste requested. Use Load command sample to insert the supplied example text.')}
        onClose={(accepted, detail) => { setLastClosed({ ...accepted }); setOpen(false); setExpanded(false); report(`Editor closed (${detail.reason}). Your draft is kept.`); }}/>
        : <p style={note}>The editor is closed. Open it again to continue with your draft.</p>}
    </div>
    <output data-command-demo-receipt role="status" aria-label="Command action receipt" style={{ ...note, display: 'block' }}>{receipt}</output>
    <details data-command-accepted-draft>
      <summary>Current accepted draft</summary>
      <pre style={code}>{JSON.stringify(value, null, 2)}</pre>
    </details>
    {lastClosed && <details data-command-last-closed><summary>Draft when the editor last closed</summary><pre style={code}>{JSON.stringify(lastClosed, null, 2)}</pre></details>}
    <pre style={code}><code>{editorCode}</code></pre>
    <section data-command-output-example aria-labelledby={`${id}-output-title`} style={stack}>
      <h3 id={`${id}-output-title`} style={{ margin: 0 }}>Reusable output panel</h3>
      <p style={note}>This output and its previous settings are supplied separately from the current draft. Switching tracking does not erase them.</p>
      <div style={controls}>
        <Button size="sm" disabled={disabled || readOnly} onClick={() => { setPreviousOutput(sampleOutput); setPreviousInfo({ ...sampleInfo }); report('Example output and previous settings loaded.'); }}>Load output sample</Button>
        <Button size="sm" disabled={disabled || readOnly} onClick={() => { setPreviousOutput(''); setPreviousInfo({}); report('Supplied output and previous settings cleared.'); }}>Clear output sample</Button>
      </div>
      <div role="region" aria-label="Independent command output preview" tabIndex={0} style={preview}>
        <div style={{ width: 370 * scale }}>
          <CommandOutputPanel previousOutput={previousOutput} previousInfo={previousInfo} trackOutput={standaloneTrack}
            onTrackOutputChange={next => { setStandaloneTrack(next); setReceipt(`Independent output tracking ${next ? 'enabled' : 'disabled'}.`); }}
            disabled={disabled} readOnly={readOnly} scale={scale}/>
        </div>
      </div>
      <pre style={code}><code>{'<CommandOutputPanel previousOutput={output} previousInfo={previousInfo}\n  trackOutput={tracking} onTrackOutputChange={setTracking} />'}</code></pre>
    </section>
    <section data-command-input-example aria-labelledby={`${id}-input-title`} style={stack}>
      <h3 id={`${id}-input-title`} style={{ margin: 0 }}>Reusable command input</h3>
      <p style={note}>A separate draft with the same compact and expanded input. Paste asks the host for text; it does not read the clipboard.</p>
      <div role="region" aria-label="Independent command input preview" tabIndex={0} style={preview}>
        <div style={{ position: 'relative', width: 370 * scale, height: (standaloneExpanded ? 180 : 60) * scale }}>
          <CommandInput value={standaloneCommand} onValueChange={next => { setStandaloneCommand(next); setReceipt('Updated the independent command draft.'); }}
            expanded={standaloneExpanded} onExpandedChange={(next, detail) => { setStandaloneExpanded(next); report(`Independent input ${detail.reason}.`); }}
            readOnly={readOnly} disabled={disabled} pasteEnabled={pasteEnabled} scale={scale}
            label="Independent command input" onPasteRequest={() => report('Independent input requested paste text.')}/>
        </div>
      </div>
      <output data-command-independent-value aria-label="Independent command draft" style={note}>{standaloneCommand || '(empty)'}</output>
      <pre style={code}><code>{'<CommandInput value={command} onValueChange={setCommand}\n  expanded={expanded} onExpandedChange={setExpanded}\n  onPasteRequest={showPasteRequest} />'}</code></pre>
    </section>
  </section>;
}
