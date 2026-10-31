import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { UGCItemCard, UGCViewer } from '../src/ugc-viewer';
import type { UGCActionDetail, UGCItem } from '../src/ugc-viewer';

const thumbnail = new URL('./assets/game-lists/default_world.png', import.meta.url).href;
const frameMaterial = {
  src: new URL('./screenshot-assets/white-candidate.png', import.meta.url).href,
  sourceSize: [15, 15] as const,
};
const items: readonly UGCItem[] = Array.from({ length: 12 }, (_, index) => ({
  id: `world-${index + 1}`,
  label: `World ${String(index + 1).padStart(2, '0')}`,
  image: { src: thumbnail, sourceSize: [128, 128], alt: 'Original sample world thumbnail' },
}));

/** All collection/filter/capacity decisions are explicit demo-host inputs. */
export function UGCExamples() {
  const host = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null);
  const [availableWidth, setAvailableWidth] = useState(320), [previewScale, setPreviewScale] = useState('2');
  const [query, setQuery] = useState(''), [accept, setAccept] = useState(true), [filter, setFilter] = useState(false);
  const [capacity, setCapacity] = useState('12'), [inputMode, setInputMode] = useState<'mouse' | 'touch'>('mouse');
  const [touchThumb, setTouchThumb] = useState(false), [disabled, setDisabled] = useState(false), [readOnly, setReadOnly] = useState(false);
  const [visible, setVisible] = useState(true), [status, setStatus] = useState('Choose a world or edit the controlled query. No filesystem is read.');
  useLayoutEffect(() => {
    const node = host.current; if (!node) return;
    const measure = () => setAvailableWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure(); const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(node); return () => observer?.disconnect();
  }, []);
  // Keep the source's three columns. Only this demo host chooses a smaller scale/frame.
  const scale = previewScale === '2' && availableWidth >= 768 ? 2 : 1;
  const size = [Math.max(160, Math.min(384, Math.floor(availableWidth / scale))), 234] as const;
  const supplied = filter ? items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())) : items;
  const receive = (detail: UGCActionDetail) => {
    setStatus(`${detail.target}${detail.item ? ` · ${detail.item.label}` : ''} · ${accept ? 'host accepted' : 'host declined'}; query=${JSON.stringify(detail.query ?? query)}.`);
    if (accept && detail.action === 'close') setVisible(false);
  };
  const reset = () => {
    setQuery(''); setAccept(true); setFilter(false); setCapacity('12'); setInputMode('mouse');
    setTouchThumb(false); setDisabled(false); setReadOnly(false); setVisible(true);
    setStatus('The host restored all twelve records; no content was loaded or deleted.');
  };
  return <div data-demo-ugc="examples" style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
      <Combobox label="UGC preview scale preference" value={previewScale} onValueChange={setPreviewScale} options={[{ value: '1', label: '1×' }, { value: '2', label: '2× when the host fits' }]}/>
      <Combobox label="UGC scrolling input" value={inputMode} onValueChange={value => { if (value === 'mouse' || value === 'touch') setInputMode(value); }} options={[{ value: 'mouse', label: 'Mouse' }, { value: 'touch', label: 'Touch' }]}/>
      <Combobox label="Host maximum grid items" value={capacity} onValueChange={setCapacity} options={['0', '3', '6', '12'].map(value => ({ value, label: `First ${value} supplied records` }))}/>
      <Switch label="Accept UGC query and action requests" checked={accept} onChange={event => setAccept(event.target.checked)}/>
      <Switch label="Apply host substring filter" checked={filter} onChange={event => setFilter(event.target.checked)}/>
      <Switch label="Show touch thumb" checked={touchThumb} onChange={event => setTouchThumb(event.target.checked)}/>
      <Switch label="Read-only UGC" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable UGC" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Button onClick={() => setVisible(true)}>Reopen UGC viewer</Button>
      <Button disabled={!visible || disabled} onClick={() => search.current?.focus()}>Focus real search input</Button>
      <Button onClick={reset}>Reset UGC host state</Button>
    </div>
    <p style={{ margin: 0 }} data-ugc-preview-scale={scale}>Actual preview scale: {scale}×. Accepted query: {JSON.stringify(query)}. Supplied records: {supplied.length}; maximum first N: {capacity}.</p>
    <div ref={host} style={{ width: '100%', minWidth: 0, maxWidth: 840, overflowX: 'auto' }}>
      <UGCViewer title="World samples" searchLabel="UGC search query" searchPlaceholder="Search worlds" items={supplied}
        size={size} scale={scale} imageFrameMaterial={frameMaterial} maxGridItems={Number(capacity)} query={query}
        onQueryChange={next => { setStatus(`Query request ${JSON.stringify(next)} · ${accept ? 'host accepted' : 'host declined'}.`); if (accept) setQuery(next); }}
        onAction={receive} searchRef={search} inputMode={inputMode} touchThumbVisible={touchThumb} minThumbSize={12}
        readOnly={readOnly} disabled={disabled} hidden={!visible} modal={false} closeLabel="Close UGC preview" scrollLabel="UGC world sample grid"/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, overflowWrap: 'anywhere' }}>{status}</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>Twelve application records reuse one complete original sample thumbnail. Filtering is this host's optional substring rule; first-N capacity is explicit, not the native provider algorithm. The source grid keeps three columns. This host chooses 1× below 768px; the library does not auto-fit or open a modal.</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>The frame material is an explicitly supplied complete 15×15 archive candidate, including its black border. Its mapping to native White is unknown; no white texture is generated or chosen by default.</p>
    <div style={{ display: 'grid', justifyItems: 'start', gap: 8 }}>
      <h3 style={{ margin: 0 }}>Reusable UGC item card</h3>
      <UGCItemCard item={{ id: 'standalone-world', label: 'Single world', image: { src: thumbnail, sourceSize: [128, 128], alt: 'Original sample world thumbnail' } }} width={120} scale={scale}
        imageFrameMaterial={frameMaterial} disabled={disabled} readOnly={readOnly} onAction={receive}/>
    </div>
  </div>;
}
