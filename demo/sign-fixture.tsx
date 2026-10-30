import { StrictMode, useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Dialog } from '../src';
import { SignEditor, SignTextSurface } from '../src/sign';
import type { SignCloseDetail, SignEditorProps, SignTextSurfaceProps, SignSourceGeometry, SignTextureInput, SignVariant, SignWood } from '../src/sign';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/sign.css';

export interface SignFixtureSettings {
  value: string; variant: SignVariant; wood: SignWood; scale: number;
  fontMode: NonNullable<SignTextSurfaceProps['fontMode']>;
  backgroundFit: NonNullable<SignTextSurfaceProps['backgroundFit']>;
  controlled: boolean; controlledOpen: boolean; acceptance: 'accept' | 'reject' | 'uppercase';
  open: boolean; disabled: boolean; readOnly: boolean; maxLength: number;
  closeOnOutside: boolean; exitBehavior: NonNullable<SignEditorProps['exitBehavior']>;
  rejectClose: boolean; rejectOpenChange: boolean; rejectCommit: boolean; rejectCancel: boolean; asyncClose: boolean;
  preventEscape: boolean; stopCompositionPropagation: boolean;
  showSurface: boolean; showEditor: boolean; editorAutoFocus: boolean;
  genericOpen: boolean; geometry?: Partial<SignSourceGeometry>;
  texture?: SignTextureInput; textColor?: CSSProperties['color']; textShadow?: CSSProperties['textShadow'];
}
interface SignFixtureEvent { kind: string; value?: unknown; detail?: unknown }
interface SignFixtureQA {
  mounted: boolean; settings: SignFixtureSettings; events: SignFixtureEvent[];
  pendingClose: { value: string; detail: SignCloseDetail } | null;
  configure: (patch: Partial<SignFixtureSettings>) => void;
  resolveClose: (accept: boolean) => void; remount: () => void; unmount: () => void;
  refs: { surface: HTMLDivElement | null; editor: HTMLDivElement | null; textarea: HTMLTextAreaElement | null;
    editorTextarea: HTMLTextAreaElement | null; dialog: HTMLDialogElement | null };
}
declare global { interface Window { signQA: SignFixtureQA } }
const initial: SignFixtureSettings = {
  value: 'Welcome\n欢迎来到村庄', variant: 'regular', wood: 'oak', scale: 2, fontMode: 'auto', backgroundFit: 'contain',
  controlled: true, controlledOpen: true, acceptance: 'accept', open: false, disabled: false, readOnly: false, maxLength: 32500,
  closeOnOutside: true, exitBehavior: 'request', rejectClose: false, rejectOpenChange: false, rejectCommit: false,
  rejectCancel: false, asyncClose: false, preventEscape: false, stopCompositionPropagation: false,
  showSurface: true, showEditor: true, editorAutoFocus: true, genericOpen: false,
};
const qa: SignFixtureQA = {
  mounted: false, settings: initial, events: [], pendingClose: null, configure: () => {}, resolveClose: () => {}, remount: () => {}, unmount: () => {},
  refs: { surface: null, editor: null, textarea: null, editorTextarea: null, dialog: null },
};
window.signQA = qa;
function App() {
  const [settings, setSettings] = useState(initial), [mountKey, setMountKey] = useState(0);
  qa.mounted = true; qa.settings = settings;
  qa.configure = patch => setSettings(previous => ({ ...previous, ...patch }));
  qa.remount = () => setMountKey(previous => previous + 1);
  qa.resolveClose = accept => {
    const pending = qa.pendingClose;
    qa.events.push({ kind: 'async-close-resolved', value: accept, detail: pending });
    qa.pendingClose = null;
    // An explicit delayed host decision, not a Promise-returning component API.
    if (accept && pending) setSettings(previous => ({ ...previous, open: false }));
  };
  function changed(owner: 'surface' | 'editor', value: string) {
    qa.events.push({ kind: 'value', value, detail: { owner } });
    if (settings.acceptance !== 'reject') setSettings(previous => ({ ...previous,
      value: settings.acceptance === 'uppercase' ? value.toUpperCase() : value }));
  }
  function textareaProps(owner: 'surface' | 'editor'): NonNullable<SignTextSurfaceProps['textareaProps']> {
    return {
      id: owner === 'surface' ? 'sign-surface-text' : 'sign-editor-text',
      'aria-label': owner === 'surface' ? 'QA surface text' : 'QA editor text', spellCheck: false,
      onCompositionStart: event => { qa.events.push({ kind: 'composition-start', detail: { owner } }); if (settings.stopCompositionPropagation) event.stopPropagation(); },
      onCompositionEnd: event => { qa.events.push({ kind: 'composition-end', detail: { owner } }); if (settings.stopCompositionPropagation) event.stopPropagation(); },
      onKeyDown: event => { if (settings.preventEscape && event.key === 'Escape') event.preventDefault(); },
    };
  }
  const shared = {
    variant: settings.variant, wood: settings.wood, scale: settings.scale, fontMode: settings.fontMode, backgroundFit: settings.backgroundFit,
    disabled: settings.disabled, readOnly: settings.readOnly, maxLength: settings.maxLength,
    texture: settings.texture, geometry: settings.geometry, textColor: settings.textColor, textShadow: settings.textShadow,
    ...(settings.controlled ? { value: settings.value } : { defaultValue: settings.value }),
  };
  return <main id="sign-qa-main" data-settings={JSON.stringify(settings)}>
    <div id="sign-qa-background">
      <button type="button" id="focus-sink" onClick={() => qa.events.push({ kind: 'background-click' })}>Outside sign editor</button>
      <button type="button" id="open-editor" onClick={() => setSettings(previous => ({ ...previous, open: true }))}>Open editor</button>
      <button type="button" id="reset-fixture" onClick={() => { setSettings({ ...initial }); setMountKey(previous => previous + 1); qa.pendingClose = null; }}>Reset fixture</button>
      <div id="background-scroll-host" style={{ height: 120, overflow: 'auto' }}>
        <button type="button" id="scroll-background-button" onClick={() => qa.events.push({ kind: 'scroll-background-click' })}>Scrollable background button</button>
        <div style={{ height: 500 }} aria-hidden="true"/>
      </div>
    </div>
    <section aria-label="Surface fixture" style={{ padding: 16, minWidth: 0, overflowX: 'auto' }}>
      <div style={{ width: 'max-content', padding: settings.variant === 'hanging' ? `${64 * settings.scale}px ${96 * settings.scale}px` : 16 }}>
      {settings.showSurface && <SignTextSurface key={`surface-${settings.controlled}-${mountKey}`} {...shared}
        id="sign-surface-host" data-instance="surface" label="QA surface text"
        ref={node => { qa.refs.surface = node; }} textareaRef={node => { qa.refs.textarea = node; }}
        textareaProps={textareaProps('surface')} onValueChange={value => changed('surface', value)}/>}
      </div>
    </section>
    {settings.showEditor && <SignEditor key={`editor-${settings.controlled}-${settings.controlledOpen}-${mountKey}`} {...shared}
      {...(settings.controlledOpen ? { open: settings.open } : { defaultOpen: settings.open })}
      id="sign-modal-host" data-instance="editor" aria-label="QA sign editor" label="QA sign editor"
      autoFocus={settings.editorAutoFocus} closeOnOutside={settings.closeOnOutside} exitBehavior={settings.exitBehavior}
      ref={node => { qa.refs.editor = node; }} textareaRef={node => { qa.refs.editorTextarea = node; }}
      dialogRef={node => { qa.refs.dialog = node; }} textareaProps={textareaProps('editor')}
      onValueChange={value => changed('editor', value)}
      onCloseRequest={(value, detail) => {
        qa.events.push({ kind: 'close-request', value, detail });
        if (settings.rejectClose) return false;
        if (settings.asyncClose) { qa.pendingClose = { value, detail: { ...detail } }; return false; }
      }}
      onCommit={(value, detail) => { qa.events.push({ kind: 'commit', value, detail }); if (settings.rejectCommit) return false; }}
      onCancel={(value, detail) => { qa.events.push({ kind: 'cancel', value, detail }); if (settings.rejectCancel) return false; }}
      onOpenChange={(open, detail) => { qa.events.push({ kind: 'open-change', value: open, detail }); if (!settings.rejectOpenChange) setSettings(previous => ({ ...previous, open })); }}/>}
    <Dialog open={settings.genericOpen} title="Generic lock owner" onOpenChange={genericOpen => setSettings(previous => ({ ...previous, genericOpen }))}>
      <p>Independent modal owner for shared scroll-lock verification.</p>
    </Dialog>
    <div style={{ height: 1200 }} aria-hidden="true"/>
  </main>;
}
const root = createRoot(document.getElementById('sign-root')!);
qa.unmount = () => { qa.mounted = false; root.unmount(); };
root.render(new URLSearchParams(location.search).has('strict') ? <StrictMode><App/></StrictMode> : <App/>);
