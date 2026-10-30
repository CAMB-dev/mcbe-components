import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { ServerActionForm, ServerCustomForm } from '../src/server-forms';
import type { ServerActionIcon, ServerActionRow, ServerCustomEditableField, ServerCustomField, ServerCustomFormValues, ServerCustomValue } from '../src/server-forms';
import '../src/server-forms.css';

const callerIcon = new URL('../src/assets/gui-icons/achievements-pause-menu-icon.png', import.meta.url).href;
type SchemaPreset = 'all' | 'short';
type IconState = ServerActionIcon['state'];
const initialValues: ServerCustomFormValues = { player: 'Alex', notices: true, distance: 4, pace: 'balanced', place: 'river', supplies: ['torch'] };
const copyValues = (value: ServerCustomFormValues): ServerCustomFormValues => Object.fromEntries(Object.entries(value).map(([id, item]) => [id, Array.isArray(item) ? [...item] : item]));
function fieldsFor(preset: SchemaPreset, extra: boolean, expanded: boolean): ServerCustomField[] {
  const fields: ServerCustomField[] = [
    { id: 'trip-heading', type: 'header', text: 'Plan a visit' },
    { id: 'trip-description', type: 'label', text: 'Choose your preferences for this local example.' },
    { id: 'player', type: 'input', label: 'Display name', placeholder: 'Player name', defaultValue: 'Alex', tooltip: 'This name stays in the local demo.' },
    { id: 'notices', type: 'toggle', label: 'Receive notices', defaultValue: true },
    { id: 'distance', type: 'slider', label: 'Route length', min: 1, max: 10, step: 1, defaultValue: 4 },
    { id: 'pace', type: 'step_slider', label: 'Travel pace', defaultValue: 'balanced', options: [
      { value: 'quiet', label: 'Quiet' }, { value: 'balanced', label: 'Balanced' }, { value: 'busy', label: 'Busy' },
    ] },
    { id: 'trip-divider', type: 'divider' },
    { id: 'place', type: 'dropdown', label: 'Destination', defaultValue: 'river', options: [
      { value: 'river', label: 'River' }, { value: 'garden', label: 'Garden' }, { value: 'village', label: 'Village' },
    ] },
    { id: 'supplies', type: 'multiselect', label: 'Travel supplies', defaultValue: ['torch'], expanded, options: [
      { value: 'torch', label: 'Torches' }, { value: 'map', label: 'Map' }, { value: 'food', label: 'Food' },
    ] },
  ];
  const visible = preset === 'all' ? fields : fields.filter(field => ['trip-heading', 'trip-description', 'player', 'place'].includes(field.id));
  if (extra) visible.push({ id: 'note', type: 'input', label: 'Extra note', placeholder: 'An optional note', defaultValue: '' });
  return visible;
}
function editableField(field: ServerCustomField): field is ServerCustomEditableField {
  return field.type !== 'label' && field.type !== 'header' && field.type !== 'divider';
}
function valuesForSchema(fields: readonly ServerCustomField[], current: ServerCustomFormValues): ServerCustomFormValues {
  const next: Record<string, ServerCustomValue> = {};
  for (const field of fields) {
    if (!editableField(field)) continue;
    if (current[field.id] !== undefined) next[field.id] = current[field.id]!;
    else if (field.defaultValue !== undefined) next[field.id] = field.defaultValue;
  }
  return copyValues(next);
}
function rowsFor(short: boolean, extra: boolean, iconState: IconState): ServerActionRow[] {
  const icon: ServerActionIcon = iconState === 'ready' ? { state: 'ready', url: callerIcon } : { state: iconState };
  const rows: ServerActionRow[] = [
    { id: 'guide-heading', type: 'header', text: 'Village guide' },
    { id: 'guide-description', type: 'label', text: 'Pick an action to send a request to this demo.' },
    { id: 'paths', type: 'button', text: 'Browse paths', icon },
    { id: 'supplies', type: 'button', text: 'View supplies', icon: { state: 'loading' } },
    { id: 'guide-divider', type: 'divider' },
    { id: 'camp', type: 'button', text: 'Return to camp', icon: { state: 'none' } },
  ];
  const visible = short ? rows.filter(row => ['guide-heading', 'paths', 'camp'].includes(row.id)) : rows;
  if (extra) visible.push({ id: 'garden', type: 'button', text: 'Visit the garden' });
  return visible;
}
const stack: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 };
const controls: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16, minWidth: 0 };
const preview: CSSProperties = { minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '8px 0' };
const note: CSSProperties = { margin: 0, fontSize: 12, overflowWrap: 'anywhere' };
const code: CSSProperties = { margin: 0, maxWidth: '100%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 };

export function ServerFormsExamples({ notify }: { notify: (message: string) => void }) {
  const id = `server-forms-demo-${useId()}`;
  const [width, setWidth] = useState(225), [height, setHeight] = useState(200), [scale, setScale] = useState(2);
  const [readOnly, setReadOnly] = useState(false), [disabled, setDisabled] = useState(false);
  const [acceptFields, setAcceptFields] = useState(true), [acceptRequests, setAcceptRequests] = useState(true);
  const [actionOpen, setActionOpen] = useState(true), [customOpen, setCustomOpen] = useState(true);
  const [shortMenu, setShortMenu] = useState(false), [extraAction, setExtraAction] = useState(false);
  const [iconState, setIconState] = useState<IconState>('ready');
  const [schemaPreset, setSchemaPreset] = useState<SchemaPreset>('all'), [extraField, setExtraField] = useState(false);
  const [suppliesExpanded, setSuppliesExpanded] = useState(false);
  const [values, setValues] = useState<ServerCustomFormValues>(() => copyValues(initialValues));
  const [fieldRequest, setFieldRequest] = useState<{ id: string; values: ServerCustomFormValues } | null>(null);
  const [actionRequest, setActionRequest] = useState<{ id: string; index: number; text: string } | null>(null);
  const [acceptedAction, setAcceptedAction] = useState<string | null>(null);
  const [submission, setSubmission] = useState<ServerCustomFormValues | null>(null);
  const [receipt, setReceipt] = useState('Edit a form or choose an action. Requests stay in this demo.');
  const report = (message: string) => { setReceipt(message); notify(message); };
  const fields = fieldsFor(schemaPreset, extraField, suppliesExpanded);
  const rows = rowsFor(shortMenu, extraAction, iconState);
  function changeSchema(nextPreset: SchemaPreset, nextExtra: boolean) {
    setSchemaPreset(nextPreset); setExtraField(nextExtra);
    setValues(current => valuesForSchema(fieldsFor(nextPreset, nextExtra, suppliesExpanded), current));
    setFieldRequest(null); report('The demo host updated the form schema and kept values for its remaining fields.');
  }
  function reset() {
    setWidth(225); setHeight(200); setScale(2); setReadOnly(false); setDisabled(false);
    setAcceptFields(true); setAcceptRequests(true); setActionOpen(true); setCustomOpen(true);
    setShortMenu(false); setExtraAction(false); setIconState('ready'); setSchemaPreset('all'); setExtraField(false);
    setSuppliesExpanded(false); setValues(copyValues(initialValues)); setFieldRequest(null); setActionRequest(null);
    setAcceptedAction(null); setSubmission(null); report('Server form examples restored.');
  }
  return <section data-server-forms-examples aria-label="Server form examples" style={{ ...stack, gap: 24, padding: 16 }}>
    <p style={note}>Build action menus and custom forms from a schema. This demo accepts or declines requests locally; it does not contact a server.</p>
    <div style={controls}>
      <Combobox label="Server form width" value={String(width)} options={[225, 300, 360].map(size => ({ value: String(size), label: String(size) }))} onValueChange={next => setWidth(Number(next))}/>
      <Combobox label="Server form height" value={String(height)} options={[200, 260, 320].map(size => ({ value: String(size), label: String(size) }))} onValueChange={next => setHeight(Number(next))}/>
      <Combobox label="Server form scale" value={String(scale)} options={[1, 2, 3].map(size => ({ value: String(size), label: `${size}x` }))} onValueChange={next => setScale(Number(next))}/>
    </div>
    <div style={controls}>
      <Switch label="Read-only server forms" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable server forms" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Switch label="Accept field requests" checked={acceptFields} onChange={event => setAcceptFields(event.target.checked)}/>
      <Switch label="Accept action and close requests" checked={acceptRequests} onChange={event => setAcceptRequests(event.target.checked)}/>
      <Button size="sm" onClick={reset}>Reset server form examples</Button>
    </div>
    <section data-server-action-example aria-labelledby={`${id}-action-title`} style={stack}>
      <h3 id={`${id}-action-title`} style={{ margin: 0 }}>Action form</h3>
      <div style={controls}>
        <Combobox label="Action menu schema" value={shortMenu ? 'short' : 'all'} options={[{ value: 'all', label: 'All four row types' }, { value: 'short', label: 'Short menu' }]}
          onValueChange={next => { setShortMenu(next === 'short'); report('The demo host changed the action row schema.'); }}/>
        <Combobox label="First action icon" value={iconState} options={[{ value: 'ready', label: 'Caller image' }, { value: 'loading', label: 'Loading' }, { value: 'none', label: 'No icon' }]}
          onValueChange={next => setIconState(next === 'ready' || next === 'loading' ? next : 'none')}/>
        <Switch label="Add another action row" checked={extraAction} onChange={event => setExtraAction(event.target.checked)}/>
        <Button size="sm" disabled={actionOpen} onClick={() => { setActionOpen(true); report('Action form reopened.'); }}>Open action form</Button>
      </div>
      <p style={note}>The first button uses a caller-supplied original icon. The next shows loading; the last has no icon. Change the first icon or the row schema above.</p>
      <div role="region" aria-label="Action form preview" tabIndex={0} style={preview}>
        {actionOpen ? <ServerActionForm title="Village guide" body="Choose a destination for this local example." rows={rows} size={[width, height]} scale={scale}
          disabled={disabled} readOnly={readOnly} aria-label="Example action form"
          onAction={(requestedId, detail) => {
            setActionRequest({ id: requestedId, index: detail.index, text: detail.row.text });
            if (acceptRequests) setAcceptedAction(requestedId);
            report(acceptRequests ? `Demo host accepted action: ${detail.row.text}.` : `Demo host declined action: ${detail.row.text}.`);
          }}
          onCancel={detail => { if (acceptRequests) setActionOpen(false); report(`Action form close request ${acceptRequests ? 'accepted' : 'declined'} (${detail.reason}).`); }}/>
          : <p style={note}>The action form is closed. Reopen it to keep exploring the same schema.</p>}
      </div>
      <output data-server-accepted-action aria-label="Accepted action" style={note}>Accepted action: {acceptedAction ?? '(none)'}</output>
      {actionRequest && <details data-server-action-request><summary>Last action request</summary><pre style={code}>{JSON.stringify(actionRequest, null, 2)}</pre></details>}
      <pre style={code}><code>{'const rows: ServerActionRow[] = [\n  { id: \'welcome\', type: \'header\', text: \'Welcome\' },\n  { id: \'visit\', type: \'button\', text: \'Visit\' },\n];\n<ServerActionForm title="Guide" rows={rows}\n  onAction={id => setReceipt(id)} />'}</code></pre>
    </section>
    <section data-server-custom-example aria-labelledby={`${id}-custom-title`} style={stack}>
      <h3 id={`${id}-custom-title`} style={{ margin: 0 }}>Custom form</h3>
      <div style={controls}>
        <Combobox label="Custom form schema" value={schemaPreset} options={[{ value: 'all', label: 'All nine field types' }, { value: 'short', label: 'Short form' }]}
          onValueChange={next => changeSchema(next === 'short' ? 'short' : 'all', extraField)}/>
        <Switch label="Add an extra note field" checked={extraField} onChange={event => changeSchema(schemaPreset, event.target.checked)}/>
        <Button size="sm" disabled={customOpen} onClick={() => { setCustomOpen(true); report('Custom form reopened with accepted values.'); }}>Open custom form</Button>
      </div>
      <p style={note}>Try all nine field types, then switch to a shorter schema. Expand Travel supplies to change its checkboxes; opening the section leaves its selections intact.</p>
      <div role="region" aria-label="Custom form preview" tabIndex={0} style={preview}>
        {customOpen ? <ServerCustomForm title="Plan a visit" fields={fields} value={values} size={[width, height]} scale={scale}
          disabled={disabled} readOnly={readOnly} aria-label="Example custom form" submitText="Keep preferences"
          onValueChange={(next, detail) => {
            setFieldRequest({ id: detail.id, values: copyValues(next) });
            if (acceptFields) setValues(copyValues(next));
            setReceipt(`Demo host ${acceptFields ? 'accepted' : 'declined'} field request: ${detail.id}.`);
          }}
          onExpandedChange={(fieldId, expanded) => { if (fieldId === 'supplies') setSuppliesExpanded(expanded); setReceipt(`Supplies options ${expanded ? 'opened' : 'closed'}; accepted values are unchanged.`); }}
          onSubmit={accepted => {
            if (acceptRequests) setSubmission(copyValues(accepted));
            report(acceptRequests ? 'Custom form values kept by this demo host.' : 'Demo host declined the submit request.');
          }}
          onCancel={(_accepted, detail) => { if (acceptRequests) setCustomOpen(false); report(`Custom form close request ${acceptRequests ? 'accepted' : 'declined'} (${detail.reason}).`); }}/>
          : <p style={note}>The custom form is closed. Reopen it to continue with accepted values.</p>}
      </div>
      <details data-server-custom-values><summary>Current accepted custom values</summary><pre style={code}>{JSON.stringify(values, null, 2)}</pre></details>
      {fieldRequest && <details data-server-field-request><summary>Last field request</summary><pre style={code}>{JSON.stringify(fieldRequest, null, 2)}</pre></details>}
      {submission && <details data-server-submission><summary>Last values kept by the demo host</summary><pre style={code}>{JSON.stringify(submission, null, 2)}</pre></details>}
      <pre style={code}><code>{'const [values, setValues] = useState<ServerCustomFormValues>({});\nconst [submitted, setSubmitted] = useState<ServerCustomFormValues | null>(null);\n\n<ServerCustomForm title="Preferences" fields={schema} value={values}\n  onValueChange={setValues} onSubmit={setSubmitted} />\n<output>{JSON.stringify(submitted)}</output>'}</code></pre>
    </section>
    <output data-server-forms-receipt role="status" aria-label="Server form request receipt" style={{ ...note, display: 'block' }}>{receipt}</output>
  </section>;
}
