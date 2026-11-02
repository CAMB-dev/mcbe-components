import { StrictMode, createRef, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ExternalServerField, ExternalServerForm } from '../src';
import type { ExternalServerAction, ExternalServerBindings, ExternalServerFieldKind, ExternalServerValues } from '../src';
import '../src/styles.css';

const original: ExternalServerValues = { name: 'Draft', address: 'host.example', port: '00123' };
export interface ExternalServerConfiguration {
  mode: 'add' | 'edit'; controlled: boolean; accept: boolean; disabled: boolean; readOnly: boolean; open: boolean; hidden: boolean; fieldHidden: boolean;
  bindings: ExternalServerBindings; scale: number; size: readonly [number, number]; submitAction: 'save' | 'play';
  preventChange: boolean; preventSubmit: boolean; preventReset: boolean; preventKey: boolean; preventClick: boolean;
  preventFieldKey: boolean; long: boolean; custom: boolean; value: ExternalServerValues; defaultValue: ExternalServerValues;
}
interface ExternalServerFixture {
  configure(next: Partial<ExternalServerConfiguration>): void;
  clear(): void;
  reset(): void;
  submit(): void;
  configuration: ExternalServerConfiguration;
  form: HTMLFormElement | null;
  inputs: Record<ExternalServerFieldKind, HTMLInputElement | null>;
  standalone: HTMLInputElement | null;
  changes: { value: ExternalServerValues; reason: string; field?: string; owner: string | null }[];
  actions: { action: ExternalServerAction; value: ExternalServerValues; reason: string; owner: string | null }[];
  closes: { reason: string; owner: string | null }[];
  native: { kind: string; field?: string; value?: string; key?: string }[];
}
type MaterialKind = 'panel' | 'field' | 'button' | 'close';
type MaterialState = 'normal' | 'hover' | 'pressed' | 'locked' | 'disabled';
interface MaterialConfiguration { kind: MaterialKind; state: MaterialState; scale: 1 | 2 }
declare global { interface Window {
  externalServerFixture: ExternalServerFixture;
  externalServerMaterial: { setMaterial(next: MaterialConfiguration): { selector: string; rect: number[] } };
} }
const changes: ExternalServerFixture['changes'] = [], actions: ExternalServerFixture['actions'] = [], closes: ExternalServerFixture['closes'] = [], native: ExternalServerFixture['native'] = [];
function App() {
  const [configuration, setConfiguration] = useState<ExternalServerConfiguration>({ mode: 'add', controlled: true, accept: true, disabled: false, readOnly: false, open: true, hidden: false, fieldHidden: false,
    bindings: { playEnabled: true, playDisabledVisible: false, saveEnabled: true, saveDisabledVisible: false },
    scale: 2, size: [316, 179], submitAction: 'save', preventChange: false, preventSubmit: false, preventReset: false, preventKey: false, preventClick: false, preventFieldKey: false,
    long: false, custom: false, value: { ...original }, defaultValue: { ...original } });
  const refs = useMemo(() => ({ form: createRef<HTMLFormElement>(), standalone: createRef<HTMLInputElement>(),
    name: createRef<HTMLInputElement>(), address: createRef<HTMLInputElement>(), port: createRef<HTMLInputElement>() }), []);
  window.externalServerFixture = {
    configure(next) { flushSync(() => setConfiguration(previous => ({ ...previous, ...next }))); },
    clear() { changes.length = actions.length = closes.length = native.length = 0; },
    reset() { refs.form.current?.reset(); }, submit() { refs.form.current?.requestSubmit(); }, configuration,
    get form() { return refs.form.current; }, get standalone() { return refs.standalone.current; },
    get inputs() { return { name: refs.name.current, address: refs.address.current, port: refs.port.current }; }, changes, actions, closes, native,
  };
  const fields = Object.fromEntries((['name', 'address', 'port'] as const).map(kind => [kind, {
    id: `qa-server-${kind}`, 'data-caller-field': kind, placeholder: `Enter ${kind}`,
    ...(configuration.custom ? { className: 'caller-input', title: `Caller ${kind}`, autoComplete: 'off' as const,
      maxLength: kind === 'name' ? 23 : kind === 'address' ? 300 : 12, inputMode: kind === 'port' ? 'decimal' as const : 'text' as const,
      style: { letterSpacing: '1px' } } : {}),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      native.push({ kind: 'field-change', field: kind, value: event.currentTarget.value });
      if (configuration.preventChange) event.preventDefault();
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      native.push({ kind: 'field-key', field: kind, key: event.key });
      if (configuration.preventFieldKey) event.preventDefault();
    },
    onCompositionStart: () => native.push({ kind: 'field-composition-start', field: kind }),
    onCompositionEnd: () => native.push({ kind: 'field-composition-end', field: kind }),
  }]));
  const value = configuration.long ? { name: 'N'.repeat(2000), address: 'x'.repeat(4000), port: '0'.repeat(1000) } : configuration.value;
  return <main><button id="outside">Outside form</button><section id="primary">
    {configuration.open && <ExternalServerForm ref={refs.form} id="external-server-primary" data-caller-form="true" title={configuration.mode === 'add' ? 'Add external server' : 'Edit external server'}
      mode={configuration.mode} labels={{ name: 'Server name', address: 'Server address', port: 'Server port', play: 'Play', save: 'Save', remove: 'Remove', close: 'Close form' }}
      bindings={configuration.bindings} value={configuration.controlled ? value : undefined} defaultValue={configuration.defaultValue}
      disabled={configuration.disabled} readOnly={configuration.readOnly} hidden={configuration.hidden} scale={configuration.scale} size={configuration.size} submitAction={configuration.submitAction}
      fieldRefs={{ name: refs.name, address: refs.address, port: refs.port }} fieldProps={fields}
      onValueChange={(next, detail) => {
        changes.push({ value: { ...next }, reason: detail.reason, field: detail.reason === 'input' ? detail.field : undefined, owner: detail.event.currentTarget?.tagName ?? null });
        if (configuration.accept) setConfiguration(previous => ({ ...previous, value: { ...next } }));
      }}
      onAction={(action, next, detail) => actions.push({ action, value: { ...next }, reason: detail.reason, owner: detail.event.currentTarget?.tagName ?? null })}
      onClose={detail => closes.push({ reason: detail.reason, owner: detail.event.currentTarget?.tagName ?? null })}
      onSubmit={event => { native.push({ kind: 'submit' }); if (configuration.preventSubmit) event.preventDefault(); }}
      onReset={event => { native.push({ kind: 'reset' }); if (configuration.preventReset) event.preventDefault(); }}
      onKeyDown={event => { native.push({ kind: 'form-key', key: event.key }); if (configuration.preventKey) event.preventDefault(); }}
      onClickCapture={event => {
        if ((event.target as Element).closest('.mc-external-server-close')) {
          native.push({ kind: 'close-click-capture' }); if (configuration.preventClick) event.preventDefault();
        }
      }}
      onCompositionStart={() => native.push({ kind: 'form-composition-start' })} onCompositionEnd={() => native.push({ kind: 'form-composition-end' })}/>} </section>
    <section className="qa-standalone" aria-label="Standalone source field"><ExternalServerField ref={refs.standalone} kind="port" label="Standalone port"
      id="standalone-server-port" scale={configuration.scale} defaultValue="00019" data-caller-native="true"
      disabled={configuration.disabled} readOnly={configuration.readOnly} hidden={configuration.fieldHidden} onChange={event => native.push({ kind: 'standalone-change', value: event.currentTarget.value })}/></section>
    <output aria-label="Accepted form value">{JSON.stringify(configuration.value)}</output>
  </main>;
}
function MaterialApp() {
  const [configuration, setConfiguration] = useState<MaterialConfiguration>({ kind: 'panel', state: 'normal', scale: 1 });
  window.externalServerMaterial = { setMaterial(next) {
    flushSync(() => setConfiguration(next));
    const selector = next.kind === 'field' ? '#qa-material-field .mc-external-server-field' : next.kind === 'button' ? '#qa-material-form button[data-external-server-action="save"]'
      : next.kind === 'close' ? '#qa-material-form .mc-external-server-close' : '#qa-material-form';
    const rect = document.querySelector(selector)!.getBoundingClientRect();
    return { selector, rect: [rect.x, rect.y, rect.width, rect.height] };
  } };
  const { kind, state, scale } = configuration;
  return <div className="qa-material-root" data-material-kind={kind} data-material-state={state}>
    <style>{`
      html:has(.qa-material-root),body:has(.qa-material-root){background:#203040!important}
      .qa-material-root{position:absolute;left:24px;top:24px}
      .qa-material-root .mc-external-server-form__title,.qa-material-root .mc-external-server-action__label,.qa-material-root .mc-external-server-field__label{visibility:hidden!important}
      .qa-material-root input{color:transparent!important;-webkit-text-fill-color:transparent!important;caret-color:transparent!important;outline:none!important}
      .qa-material-root[data-material-kind="panel"] .mc-external-server-form__content,.qa-material-root[data-material-kind="panel"] .mc-external-server-action-slot,.qa-material-root[data-material-kind="panel"] .mc-external-server-close{display:none!important}
      .qa-material-root:is([data-material-kind="button"],[data-material-kind="close"]) .mc-external-server-form__wash,.qa-material-root:is([data-material-kind="button"],[data-material-kind="close"]) .mc-external-server-form__frame,.qa-material-root:is([data-material-kind="button"],[data-material-kind="close"]) .mc-external-server-form__content{display:none!important}
      .qa-material-root[data-material-kind="button"] .mc-external-server-action-slot--left,.qa-material-root[data-material-kind="button"] .mc-external-server-close{display:none!important}
      .qa-material-root[data-material-kind="close"] .mc-external-server-action-slot{display:none!important}
      .qa-material-root .mc-external-server-action__state,.qa-material-root .mc-external-server-close__state{display:none!important}
      .qa-material-root[data-material-state="normal"] .mc-external-server-action__state--normal,.qa-material-root[data-material-state="hover"] .mc-external-server-action__state--hover,.qa-material-root[data-material-state="pressed"] .mc-external-server-action__state--pressed,.qa-material-root[data-material-state="locked"] .mc-external-server-action__state--locked{display:block!important}
      .qa-material-root[data-material-state="normal"] .mc-external-server-close__state--normal,.qa-material-root[data-material-state="hover"] .mc-external-server-close__state--hover,.qa-material-root[data-material-state="pressed"] .mc-external-server-close__state--pressed{display:block!important}
      .qa-material-root .mc-external-server-field__skin--normal{display:block!important}
      .qa-material-root .mc-external-server-field__skin--hover{display:none!important}
      .qa-material-root[data-material-state="hover"] .mc-external-server-field__skin--normal{display:none!important}
      .qa-material-root[data-material-state="hover"] .mc-external-server-field__skin--hover{display:block!important}
    `}</style>
    {kind === 'field' ? <div id="qa-material-field"><ExternalServerField kind="name" label="" scale={scale} defaultValue="" disabled={state === 'disabled'}/></div>
      : <ExternalServerForm id="qa-material-form" title="" mode="add" scale={scale}
        labels={{ name: '', address: '', port: '', play: '', save: '', remove: '', close: '' }}
        bindings={{ playEnabled: true, playDisabledVisible: false, saveEnabled: state !== 'locked', saveDisabledVisible: state === 'locked' }}/>}
  </div>;
}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('materials') ? <MaterialApp/> : <StrictMode><App/></StrictMode>);
