import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Select } from '../src/components';
import { Combobox } from '../src/combobox';
import '../src/styles.css';

const options = [
  { value: 'first', label: 'Locked first', disabled: true }, { value: 'peaceful', label: 'Peaceful' },
  { value: 'easy', label: 'Easy', disabled: true }, { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' }, { value: 'last', label: 'Locked last', disabled: true },
] as const;
export function SelectConsistencyFixture() {
  const native = useRef<HTMLSelectElement>(null), combo = useRef<HTMLButtonElement>(null);
  const [events, setEvents] = useState<unknown[]>([]), [singleData, setSingleData] = useState(''), [multipleData, setMultipleData] = useState('');
  const [externalData, setExternalData] = useState(''), [comboData, setComboData] = useState(''), [requiredData, setRequiredData] = useState('');
  const [controlled, setControlled] = useState('normal'), [attempted, setAttempted] = useState(''), [controlledData, setControlledData] = useState('');
  const [cancelReset, setCancelReset] = useState(false), [captured, setCaptured] = useState<string[]>([]);
  const record = (value: unknown) => setEvents(previous => [...previous, value]);
  return <main>
    <h1>Select and Combobox parity</h1>
    <section data-select-case="single">
      <form id="single-select-form" onSubmit={event => { event.preventDefault();setSingleData(JSON.stringify([...new FormData(event.currentTarget)])); }} onReset={event => { if (cancelReset) event.preventDefault(); }}>
        <Select id="consumer-select" label="Difficulty" name="difficulty" options={options} defaultValue="normal" ref={native}
          className="consumer-select" data-consumer="native-attributes" title="Legacy select title"
          onPointerDownCapture={() => setCaptured(value => [...value, 'pointerdown:capture'])} onPointerDown={() => setCaptured(value => [...value, 'pointerdown'])}
          onMouseDownCapture={() => setCaptured(value => [...value, 'mousedown:capture'])} onMouseDown={() => setCaptured(value => [...value, 'mousedown'])}
          onClickCapture={() => setCaptured(value => [...value, 'click:capture'])} onClick={() => setCaptured(value => [...value, 'click'])}
          onInput={() => record({ type: 'input' })} onChange={event => record({ type: 'change', value: event.currentTarget.value,
            currentTargetIsRef: event.currentTarget === native.current, targetIsRef: event.target === native.current,
            nativeTargetIsRef: event.nativeEvent.target === native.current, tag: event.currentTarget.tagName })}/>
        <button type="submit">Save single</button><button type="reset">Reset single</button>
      </form>
      <label><input type="checkbox" checked={cancelReset} onChange={event => setCancelReset(event.currentTarget.checked)}/>Cancel reset</label>
      <button type="button" onClick={() => native.current?.focus()}>Focus native ref</button>
      <output aria-label="Single FormData">{singleData}</output>
      <output aria-label="Native change events">{JSON.stringify(events)}</output><output aria-label="Native capture events">{captured.join('|')}</output>
    </section>
    <section data-select-case="combo"><form onSubmit={event => { event.preventDefault();setComboData(JSON.stringify([...new FormData(event.currentTarget)])); }}>
      <Combobox id="consumer-combo" label="Difficulty" name="difficulty" options={options} defaultValue="normal" ref={combo}/>
      <button type="submit">Save combo</button>
    </form><button type="button" onClick={() => combo.current?.focus()}>Focus combo ref</button><output aria-label="Combo FormData">{comboData}</output></section>
    <section data-select-case="select-disabled"><Select label="Disabled difficulty" name="disabled-difficulty" options={options} value="normal" disabled/></section>
    <section data-select-case="combo-disabled"><Combobox label="Disabled difficulty" options={options} value="normal" disabled/></section>
    <section data-select-case="controlled"><form onSubmit={event => { event.preventDefault();setControlledData(JSON.stringify([...new FormData(event.currentTarget)])); }}>
      <Select id="controlled-select" label="Controlled difficulty" name="controlled" options={options} value={controlled} onChange={event => setAttempted(event.currentTarget.value)}/>
      <button type="reset">Reset controlled</button><button type="submit">Save controlled</button>
    </form><button type="button" onClick={() => setControlled('hard')}>Approve controlled hard</button>
      <output aria-label="Attempted controlled value">{attempted}</output><output aria-label="Controlled FormData">{controlledData}</output></section>
    <section data-select-case="multiple"><form onSubmit={event => { event.preventDefault();setMultipleData(JSON.stringify([...new FormData(event.currentTarget)])); }}>
      <Select id="multiple-select" label="Multiple difficulties" name="choices" options={options} defaultValue={['normal']} multiple/>
      <button type="submit">Save multiple</button><button type="reset">Reset multiple</button>
    </form><output aria-label="Multiple FormData">{multipleData}</output></section>
    <section data-select-case="external"><form id="external-select-form" onSubmit={event => { event.preventDefault();setExternalData(JSON.stringify([...new FormData(event.currentTarget)])); }}>
      <button type="submit">Save external</button><button type="reset">Reset external</button>
    </form><Select label="External difficulty" form="external-select-form" name="external" options={options} defaultValue="normal"/>
      <output aria-label="External FormData">{externalData}</output></section>
    <section data-select-case="required"><form onSubmit={event => { event.preventDefault();setRequiredData(JSON.stringify([...new FormData(event.currentTarget)])); }}>
      <Select label="Required difficulty" name="required" required defaultValue="" options={[{ value: '', label: 'Choose difficulty' }, ...options]}/>
      <button type="submit">Validate required</button>
    </form><output aria-label="Required FormData">{requiredData}</output></section>
    <section data-select-case="hidden"><Select label="Hidden difficulty" hidden options={options} defaultValue="normal"/></section>
  </main>;
}
const root = document.getElementById('select-consistency-root');
if (root) createRoot(root).render(<SelectConsistencyFixture/>);
