import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { ImmersiveReader, ImmersiveReaderButton } from '../src/immersive-reader';
import type { ImmersiveReaderActionDetail, ImmersiveReaderBindings } from '../src/immersive-reader';
import { immersiveReaderAssets } from '../src/ugc-reader-assets';

const initialBindings: ImmersiveReaderBindings = { running: false, loading: true, error: false, canRetry: true };

/** A deliberately ordinary host renderer: no iframe, SDK, network or speech service. */
function HostReaderView({ disabled }: { disabled: boolean }) {
  const [count, setCount] = useState(0), [note, setNote] = useState('This text belongs to the host.');
  return <div data-reader-host-view style={{ height: '100%', width: '100%', overflow: 'auto', padding: 12, boxSizing: 'border-box', background: '#202b32', color: '#fff', fontSize: 14, lineHeight: '20px', display: 'grid', alignContent: 'start', gap: 10 }}>
    <strong>Host renderer slot</strong>
    <p style={{ margin: 0 }}>Counter and note stay mounted across states.</p>
    <Button disabled={disabled} onClick={() => setCount(value => value + 1)}>Host counter: {count}</Button>
    <label style={{ display: 'grid', gap: 4 }}>Persistent host note
      <input aria-label="Persistent reader host note" value={note} disabled={disabled} onChange={event => setNote(event.target.value)} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', font: 'inherit' }}/>
    </label>
  </div>;
}

export function ImmersiveReaderExamples() {
  const host = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(320), [previewScale, setPreviewScale] = useState('2');
  const [bindings, setBindings] = useState<ImmersiveReaderBindings>(initialBindings);
  const [visible, setVisible] = useState(true), [disabled, setDisabled] = useState(false), [readOnly, setReadOnly] = useState(false);
  const [accept, setAccept] = useState(true), [status, setStatus] = useState('Four independent source bindings. Choose a host scenario or change each flag.');
  useLayoutEffect(() => {
    const node = host.current; if (!node) return;
    const measure = () => setAvailableWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure(); const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(node); return () => observer?.disconnect();
  }, []);
  // A260-unit popup needs room. The demo explicitly chooses scale1 on narrow hosts.
  const scale = previewScale === '2' && availableWidth >= 536 ? 2 : 1;
  const size = [Math.max(268, Math.min(384, Math.floor(availableWidth / scale))), 200] as const;
  const flag = (key: keyof ImmersiveReaderBindings, next: boolean) => setBindings(value => ({ ...value, [key]: next }));
  const scenario = (next: ImmersiveReaderBindings) => { setVisible(true); setBindings(next); setStatus('The demo host changed its bindings; no reader service was contacted.'); };
  const receive = (detail: ImmersiveReaderActionDetail) => {
    setStatus(`${detail.action} → ${detail.target} · ${accept ? 'host accepted' : 'host declined'}.`);
    if (!accept) return;
    if (detail.action === 'activate' || detail.action === 'retry') {
      setVisible(true); setBindings(value => ({ ...value, running: false, loading: true, error: false }));
    } else setVisible(false);
  };
  return <div data-demo-immersive-reader="examples" style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
      <Combobox label="Reader preview scale preference" value={previewScale} onValueChange={setPreviewScale} options={[{ value: '1', label: '1×' }, { value: '2', label: '2× when the host fits' }]}/>
      <Switch label="Reader running binding" checked={bindings.running} onChange={event => flag('running', event.target.checked)}/>
      <Switch label="Reader loading binding" checked={bindings.loading} onChange={event => flag('loading', event.target.checked)}/>
      <Switch label="Reader error binding" checked={bindings.error} onChange={event => flag('error', event.target.checked)}/>
      <Switch label="Reader can-retry binding" checked={bindings.canRetry} onChange={event => flag('canRetry', event.target.checked)}/>
      <Switch label="Accept reader action requests" checked={accept} onChange={event => setAccept(event.target.checked)}/>
      <Switch label="Read-only reader" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable reader" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <ImmersiveReaderButton label="Activate host reader preview" scale={scale} disabled={disabled} readOnly={readOnly} onActivate={receive}/>
      <Button onClick={() => scenario({ ...bindings, running: false, loading: true, error: false })}>Host: loading</Button>
      <Button onClick={() => scenario({ ...bindings, running: false, loading: false, error: true })}>Host: error</Button>
      <Button onClick={() => scenario({ ...bindings, running: true, loading: false, error: false })}>Host: running view</Button>
      <Button onClick={() => setVisible(true)}>Reopen reader</Button>
      <Button onClick={() => { setDisabled(false); setReadOnly(false); setAccept(true); scenario(initialBindings); }}>Reset flags; keep host content</Button>
    </div>
    <p style={{ margin: 0 }} data-reader-preview-scale={scale}>Actual preview scale: {scale}×. Popup uses explicit child-sum layout with host titleWidth=180; short-title popup 260×147.</p>
    <div ref={host} style={{ width: '100%', minWidth: 0, maxWidth: 840, overflowX: 'auto' }}>
      <ImmersiveReader size={size} scale={scale} popupLayout={{ kind: 'child-sum', titleWidth: 180 }} bindings={bindings}
        visible={visible} disabled={disabled} readOnly={readOnly} modal={false} onAction={receive}
        errorText={'The application supplies this error.\nNo service request was made.'}
        loadingVisual={<div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}><img src={immersiveReaderAssets.reader.url} width={19 * scale} height={19 * scale} alt="" draggable={false} style={{ imageRendering: 'pixelated' }}/></div>}
        webView={<HostReaderView disabled={disabled || readOnly}/>}/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, overflowWrap: 'anywhere' }}>{status}</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>Loading, error and running are independent inputs: loading and error may both be true. Scenario buttons and accepted action responses are this demo host's choices, not native automatic transitions. The reusable reader button only requests activation. No outside-click dismissal or modal focus lock is added.</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>The loading box shows the complete existing reader icon as an explicit static host visual. The source's 36-frame book sheet is missing from the fixed public pack; this is not its animation. Title measurement, viewport and scale are host inputs; below 536px this preview chooses 1× to keep the 260-unit popup visible. The native WebView/property bag, speech service and native font rendering remain unimplemented.</p>
  </div>;
}
