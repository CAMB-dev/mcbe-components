import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { NpcDialogue, NpcEditor } from '../src/npc';
import type { NpcActionError, NpcActionValue, NpcDialogueAction, NpcEditorPage, NpcEditorValue, NpcSkin } from '../src/npc';
import '../src/npc.css';
import { NpcEntityExamples } from './npc-entity-examples';

function initialActions(): NpcActionValue[] {
  return [
    { id: 'welcome-command', kind: 'command', text: 'say Welcome to the village', buttonName: 'Welcome', buttonMode: true, onEnter: false, onExit: false },
    { id: 'guide-url', kind: 'url', text: 'https://example.invalid/guide', buttonName: 'Read guide', buttonMode: false, onEnter: false, onExit: false },
  ];
}
function initialValue(): NpcEditorValue {
  return { name: 'Village guide', dialogue: 'Welcome to the village. Follow the path to the river, or visit the garden before sunset.', skinId: 'host-1', actions: initialActions() };
}
const copyValue = (value: NpcEditorValue): NpcEditorValue => ({ ...value, actions: value.actions.map(action => ({ ...action })) });
type ActionSchema = 'both' | 'command' | 'empty';
const stack: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 };
const controls: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16, minWidth: 0 };
const preview: CSSProperties = { minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '8px 0' };
const note: CSSProperties = { margin: 0, fontSize: 12, overflowWrap: 'anywhere' };
const code: CSSProperties = { margin: 0, maxWidth: '100%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 };

export function NpcExamples({ notify }: { notify: (message: string) => void }) {
  const id = `npc-demo-${useId()}`;
  const [value, setValue] = useState<NpcEditorValue>(initialValue);
  const [page, setPage] = useState<NpcEditorPage>('basic'), [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [skinPage, setSkinPage] = useState(0), [studentPreset, setStudentPreset] = useState('two');
  const [dialogueOpen, setDialogueOpen] = useState(true), [editorOpen, setEditorOpen] = useState(true);
  const [worldBuilder, setWorldBuilder] = useState(false), [education, setEducation] = useState(false), [readerVisible, setReaderVisible] = useState(true);
  const [readOnly, setReadOnly] = useState(false), [disabled, setDisabled] = useState(false);
  const [acceptDrafts, setAcceptDrafts] = useState(true), [acceptRequests, setAcceptRequests] = useState(true);
  const [commandsEnabled, setCommandsEnabled] = useState(true), [addEnabled, setAddEnabled] = useState(true);
  const [schema, setSchema] = useState<ActionSchema>('both'), [urlWarning, setUrlWarning] = useState<NpcActionError>('none');
  const [width, setWidth] = useState(325), [height, setHeight] = useState(200), [scale, setScale] = useState(2);
  const [draftRequest, setDraftRequest] = useState<{ field: string; reason: string; value: NpcEditorValue } | null>(null);
  const [request, setRequest] = useState<{ kind: string; id?: string; reason?: string; value?: NpcEditorValue | string } | null>(null);
  const [receipt, setReceipt] = useState('Read the dialogue or edit the NPC draft. Requests stay in this demo.');
  const report = (message: string) => { setReceipt(message); notify(message); };
  const skins: NpcSkin[] = Array.from({ length: 6 }, (_, index) => ({
    id: `host-${index + 1}`, label: `Appearance ${index + 1}`,
    actor: <span style={{ display: 'grid', placeContent: 'center', height: '100%', fontSize: 8 * scale, lineHeight: 1 }}>Host {index + 1}</span>,
  }));
  const selectedSkin = skins.find(skin => skin.id === value.skinId);
  const actor = <div data-npc-host-actor aria-label="Application actor placeholder" style={{ display: 'grid', placeContent: 'center', height: '100%', gap: 4, padding: 4, color: '#fff', textAlign: 'center', overflowWrap: 'anywhere', fontSize: 8 * scale, lineHeight: 1 }}>
    <span>Host actor</span><strong>{selectedSkin?.label ?? 'No appearance'}</strong>
  </div>;
  const studentActions: NpcDialogueAction[] = studentPreset === 'none' ? [] : [
    { id: 'student-path', label: 'Explore paths', kind: 'command' },
    { id: 'student-guide', label: 'Read guide', kind: 'url' },
    ...(studentPreset === 'three' ? [{ id: 'student-garden', label: 'Visit garden', kind: 'command' as const }] : []),
  ];
  function acceptValue(next: NpcEditorValue) {
    setValue(copyValue(next));
    if (maximizedId && !next.actions.some(action => action.id === maximizedId)) setMaximizedId(null);
  }
  function changeSchema(next: ActionSchema) {
    const actions = initialActions();
    setSchema(next); setMaximizedId(null); setPage('advanced');
    setValue(current => ({ ...current, actions: next === 'empty' ? [] : next === 'command' ? actions.filter(action => action.kind === 'command') : actions }));
    setDraftRequest(null); report('The demo host replaced the action list. Student buttons are configured separately.');
  }
  function reset() {
    setValue(initialValue()); setPage('basic'); setMaximizedId(null); setSkinPage(0); setStudentPreset('two');
    setDialogueOpen(true); setEditorOpen(true); setWorldBuilder(false); setEducation(false); setReaderVisible(true); setReadOnly(false); setDisabled(false);
    setAcceptDrafts(true); setAcceptRequests(true); setCommandsEnabled(true); setAddEnabled(true);
    setSchema('both'); setUrlWarning('none'); setWidth(325); setHeight(200); setScale(2);
    setDraftRequest(null); setRequest(null); report('NPC examples restored.');
  }
  return <section data-npc-examples aria-label="NPC examples" style={{ ...stack, gap: 24, padding: 16 }}>
    <p style={note}>Read dialogue, edit an NPC draft, or configure its action list. Buttons record local requests; this demo never opens a URL or runs a command.</p>
    <div style={controls}>
      <Combobox label="NPC display width" value={String(width)} options={[325, 400, 480].map(size => ({ value: String(size), label: String(size) }))} onValueChange={next => setWidth(Number(next))}/>
      <Combobox label="NPC editor height" value={String(height)} options={[200, 260, 320].map(size => ({ value: String(size), label: String(size) }))} onValueChange={next => setHeight(Number(next))}/>
      <Combobox label="NPC display scale" value={String(scale)} options={[1, 2, 3].map(size => ({ value: String(size), label: `${size}x` }))} onValueChange={next => setScale(Number(next))}/>
    </div>
    <div style={controls}>
      <Switch label="Read-only NPC examples" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable NPC examples" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Switch label="Accept NPC draft requests" checked={acceptDrafts} onChange={event => setAcceptDrafts(event.target.checked)}/>
      <Switch label="Accept NPC action and navigation requests" checked={acceptRequests} onChange={event => setAcceptRequests(event.target.checked)}/>
      <Button size="sm" onClick={reset}>Reset NPC examples</Button>
    </div>
    <section data-npc-dialogue-example aria-labelledby={`${id}-dialogue-title`} style={stack}>
      <h3 id={`${id}-dialogue-title`} style={{ margin: 0 }}>Dialogue and student buttons</h3>
      <div style={controls}>
        <Switch label="Worldbuilder dialogue editing" checked={worldBuilder} onChange={event => setWorldBuilder(event.target.checked)}/>
        <Switch label="Education reader button" checked={education} onChange={event => setEducation(event.target.checked)}/>
        <Switch label="Show reader button" checked={readerVisible} onChange={event => setReaderVisible(event.target.checked)}/>
        <Combobox label="Student button schema" value={studentPreset} options={[{ value: 'two', label: 'Two buttons' }, { value: 'three', label: 'Three buttons' }, { value: 'none', label: 'No buttons' }]} onValueChange={setStudentPreset}/>
        <Button size="sm" disabled={dialogueOpen} onClick={() => { setDialogueOpen(true); report('Dialogue reopened with the accepted text.'); }}>Open NPC dialogue</Button>
      </div>
      <p style={note}>The application supplies the actor preview and appearance slots shown below.</p>
      <div role="region" aria-label="NPC dialogue preview" tabIndex={0} style={preview}>
        {dialogueOpen ? <NpcDialogue title={value.name} value={value.dialogue} actor={actor} actions={studentActions} worldBuilder={worldBuilder}
          width={width} scale={scale} disabled={disabled} readOnly={readOnly} educationEdition={education} readerVisible={readerVisible} aria-label="Example NPC dialogue"
          onReaderRequest={accepted => { setRequest({ kind: acceptRequests ? 'reader-accepted' : 'reader-declined', value: accepted }); report(`Reader request ${acceptRequests ? 'accepted' : 'declined'} by the demo host.`); }}
          onValueChange={next => {
            const candidate = { ...copyValue(value), dialogue: next };
            setDraftRequest({ field: 'dialogue', reason: 'edit', value: candidate });
            if (acceptDrafts) acceptValue(candidate);
            setReceipt(`Demo host ${acceptDrafts ? 'accepted' : 'declined'} the dialogue draft.`);
          }}
          onAction={(actionId, detail) => {
            setRequest({ kind: acceptRequests ? 'student-action-accepted' : 'student-action-declined', id: actionId });
            report(`Demo host ${acceptRequests ? 'accepted' : 'declined'} student action: ${detail.action.label}.`);
          }}
          onClose={(accepted, detail) => {
            setRequest({ kind: 'dialogue-close', reason: detail.reason, value: accepted });
            if (acceptRequests) setDialogueOpen(false);
            report(`Dialogue close request ${acceptRequests ? 'accepted' : 'declined'} (${detail.reason}).`);
          }}/>
          : <p style={note}>The dialogue is closed. Reopen it to see the same accepted text.</p>}
      </div>
    </section>
    <section data-npc-editor-example aria-labelledby={`${id}-editor-title`} style={stack}>
      <h3 id={`${id}-editor-title`} style={{ margin: 0 }}>Teacher editor</h3>
      <div style={controls}>
        <Combobox label="NPC editor section" value={page} options={[{ value: 'basic', label: 'Basic' }, { value: 'dialogue', label: 'Dialogue' }, { value: 'advanced', label: 'Advanced' }]}
          onValueChange={next => { setPage(next === 'dialogue' || next === 'advanced' ? next : 'basic'); setMaximizedId(null); report('The demo host selected an editor section.'); }}/>
        <Combobox label="NPC action schema" value={schema} options={[{ value: 'both', label: 'Command and URL' }, { value: 'command', label: 'Command only' }, { value: 'empty', label: 'No actions' }]} onValueChange={next => changeSchema(next === 'command' || next === 'empty' ? next : 'both')}/>
        <Switch label="Enable NPC command fields" checked={commandsEnabled} onChange={event => setCommandsEnabled(event.target.checked)}/>
        <Switch label="Allow adding NPC actions" checked={addEnabled} onChange={event => setAddEnabled(event.target.checked)}/>
        <Combobox label="NPC URL warning example" value={urlWarning} options={[{ value: 'none', label: 'No warning' }, { value: 'EmptyUri', label: 'Empty URL warning' }, { value: 'InvalidUri', label: 'Invalid URL warning' }]}
          onValueChange={next => setUrlWarning(next === 'EmptyUri' || next === 'InvalidUri' ? next : 'none')}/>
        <Button size="sm" disabled={editorOpen} onClick={() => { setEditorOpen(true); report('NPC editor reopened with the accepted draft.'); }}>Open NPC editor</Button>
      </div>
      <p style={note}>Edit the name and appearance in Basic, change the dialogue, or add URL and command rows in Advanced. The three command toggles are independent; student buttons remain a separate collection.</p>
      <div role="region" aria-label="NPC editor preview" tabIndex={0} style={preview}>
        {editorOpen ? <NpcEditor value={value} page={page} size={[width, height]} scale={scale} dialogueWidth={width}
          skins={skins} actor={actor} skinPage={skinPage} cycleVisible
          disabled={disabled} readOnly={readOnly} educationEdition={education} commandsEnabled={commandsEnabled} addButtonsEnabled={addEnabled}
          maximizedActionId={maximizedId} actionStates={{ 'guide-url': { errorStatus: urlWarning } }} aria-label="Example NPC editor"
          onValueChange={(next, detail) => {
            setDraftRequest({ field: detail.field, reason: detail.reason, value: copyValue(next) });
            if (acceptDrafts) acceptValue(next);
            setReceipt(`Demo host ${acceptDrafts ? 'accepted' : 'declined'} draft request: ${detail.field} (${detail.reason}).`);
          }}
          onPageChange={(next, detail) => {
            setRequest({ kind: 'editor-page', id: next, reason: detail.reason });
            if (acceptRequests) { setPage(next); setMaximizedId(null); }
            report(`Editor navigation ${acceptRequests ? 'accepted' : 'declined'}: ${next}.`);
          }}
          onSkinPageChange={(next, detail) => {
            if (acceptRequests) setSkinPage(next);
            setRequest({ kind: 'skin-page', id: String(next), reason: detail.direction });
            report(`Appearance page request ${acceptRequests ? 'accepted' : 'declined'}: ${next + 1}.`);
          }}
          onMaximizedActionChange={(next, detail) => {
            if (acceptRequests) setMaximizedId(next);
            setRequest({ kind: 'action-size', id: next ?? undefined, reason: detail.reason });
            report(`Action ${next ? 'expand' : 'minimize'} request ${acceptRequests ? 'accepted' : 'declined'}.`);
          }}
          onClose={(accepted, detail) => {
            setRequest({ kind: 'editor-close', value: copyValue(accepted), reason: detail.reason });
            if (acceptRequests) setEditorOpen(false);
            report(`NPC editor close request ${acceptRequests ? 'accepted' : 'declined'} (${detail.reason}).`);
          }}/>
          : <p style={note}>The editor is closed. Reopen it to continue with its accepted draft.</p>}
      </div>
    </section>
    <output data-npc-demo-receipt role="status" aria-label="NPC action receipt" style={{ ...note, display: 'block' }}>{receipt}</output>
    <details data-npc-accepted-draft><summary>Current accepted NPC draft</summary><pre style={code}>{JSON.stringify(value, null, 2)}</pre></details>
    {draftRequest && <details data-npc-draft-request><summary>Last draft request</summary><pre style={code}>{JSON.stringify(draftRequest, null, 2)}</pre></details>}
    {request && <details data-npc-request><summary>Last action or navigation request</summary><pre style={code}>{JSON.stringify(request, null, 2)}</pre></details>}
    <NpcEntityExamples/>
    <pre style={code}><code>{'const [draft, setDraft] = useState<NpcEditorValue>(initialDraft);\nconst [page, setPage] = useState<NpcEditorPage>(\'basic\');\n\n<NpcEditor value={draft} onValueChange={setDraft}\n  page={page} onPageChange={setPage} skins={skins}\n  actor={<p>Application actor preview</p>}\n  onClose={keepLocalDraft} />\n<NpcDialogue value={draft.dialogue} actions={studentButtons}\n  onAction={recordLocalRequest} />'}</code></pre>
  </section>;
}
