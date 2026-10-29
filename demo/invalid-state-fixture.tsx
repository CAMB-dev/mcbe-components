import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TextField, TextArea, Select } from '../src/components';
import { Combobox } from '../src/combobox';
import { Anvil } from '../src/anvil';
import { Grindstone } from '../src/workstations';
import { SmithingTable } from '../src/special-workstations';
import '../src/styles.css';

const options = [{ value: 'empty', label: '\u00a0' }, { value: 'chosen', label: 'Chosen' }];
export function InvalidStateFixture() {
  const [actions, setActions] = useState(0);
  const take = () => setActions(value => value + 1);
  return <main><h1>Invalid state calibration</h1>
    {(['input', 'textarea', 'select', 'combobox'] as const).flatMap(kind => ['normal', 'error', 'disabled'].map(state => {
      const disabled = state === 'disabled', error = state === 'normal' ? undefined : 'Invalid value';
      return <section key={`${kind}-${state}`} data-invalid-case={`${kind}${state === 'disabled' ? '-disabled' : state === 'normal' ? '-normal' : ''}`}>
        <form className="invalid-surface" onSubmit={event => event.preventDefault()}>
          {kind === 'input' && <TextField label="Input name" name="field" error={error} disabled={disabled} autoComplete="off"/>}
          {kind === 'textarea' && <TextArea label="Text area name" name="field" error={error} disabled={disabled}/>}
          {kind === 'select' && <Select label="Select name" name="field" error={error} options={options} disabled={disabled} onChange={take}/>}
          {kind === 'combobox' && <Combobox label="Combobox name" name="field" error={error} options={options} disabled={disabled} onValueChange={take}/>}
        </form>
      </section>;
    }))}
    <section data-invalid-case="required"><form onSubmit={event => event.preventDefault()}>
      <Combobox label="Required choice" placeholder="Choose" required options={options.slice(1)}/>
      <button type="submit">Validate choice</button>
    </form></section>
    <section data-invalid-case="anvil"><div className="crossout-specimen"><Anvil name="" invalid result={{ name: 'Unavailable result' }} onTakeResult={take}/></div></section>
    <section data-invalid-case="smithing"><div className="crossout-specimen"><SmithingTable invalid overlayFrame={0} result={{ name: 'Unavailable result' }} onTakeResult={take}/></div></section>
    <section data-invalid-case="grindstone"><div className="crossout-specimen"><Grindstone invalid result={{ name: 'Unavailable result' }} onTakeResult={take}/></div></section>
    <output aria-label="Result and selection actions">{actions}</output>
  </main>;
}
createRoot(document.getElementById('invalid-state-root')!).render(<InvalidStateFixture/>);
