import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Dialog, Panel } from '../src/components';
import { KeybindingField, NavigationList, SearchField, SettingRow, ToggleButton } from '../src/settings-controls';

function Sample({ id, children, width = 420 }: { id: string; children: ReactNode; width?: number }) {
  return <section className="calibration-case" style={{ gridColumn: '1 / -1', minWidth: 0 }}><h2>{id}</h2>
    <div className="settings-calibration-stage" data-case={id} style={{ overflow: 'auto', background: '#28292a', padding: 24, minHeight: 120 }}><div style={{ width, maxWidth: '100%' }}>{children}</div></div>
  </section>;
}
const items = [
  { value: 'general', label: 'General' }, { value: 'locked', label: 'Unavailable', disabled: true },
  { value: 'audio', label: 'Audio' }, { value: 'video', label: 'Video' },
] as const;
export function SettingsControlsFixture() {
  const [toggle, setToggle] = useState(''), [navigation, setNavigation] = useState(''), [controlledNavigation, setControlledNavigation] = useState('');
  const [search, setSearch] = useState(''), [clearCount, setClearCount] = useState(0), [submittedSearch, setSubmittedSearch] = useState('');
  const [controlledSearch, setControlledSearch] = useState(''), [binding, setBinding] = useState(''), [controlledBinding, setControlledBinding] = useState('');
  const [submittedBinding, setSubmittedBinding] = useState(''), [dialog, setDialog] = useState(false);
  return <div id="settings-controls-fixture" style={{ display: 'grid', gap: 24, minWidth: 0 }}>
    <Sample id="settings-toggle"><ToggleButton onPressedChange={value => setToggle(String(value))}>Fixture toggle</ToggleButton><output aria-label="Toggle intent">{toggle}</output></Sample>
    <Sample id="settings-toggle-controlled"><ToggleButton pressed={false} onPressedChange={value => setToggle(String(value))}>Controlled toggle</ToggleButton></Sample>
    <Sample id="settings-toggle-disabled"><ToggleButton disabled defaultPressed>Disabled selected toggle</ToggleButton></Sample>
    <Sample id="settings-search"><form onSubmit={event => { event.preventDefault(); setSubmittedSearch(String(new FormData(event.currentTarget).get('query'))); }}>
      <SearchField label="Fixture search" name="query" defaultValue="initial" onSearch={setSearch} onClear={() => setClearCount(count => count + 1)}/>
      <Button type="reset">Reset search form</Button><Button type="submit">Submit search form</Button>
    </form><output aria-label="Search callback">{search}</output><output aria-label="Search clear count">{clearCount}</output><output aria-label="Search form result">{submittedSearch}</output></Sample>
    <Sample id="settings-search-controlled"><form onReset={event => event.preventDefault()}><SearchField label="Controlled search" value="Fixed query" onValueChange={setControlledSearch}/><Button type="reset">Prevent controlled search reset</Button></form><output aria-label="Search edit intent">{controlledSearch}</output></Sample>
    <Sample id="settings-search-readonly"><SearchField label="Readonly search" readOnly defaultValue="Locked"/></Sample>
    <Sample id="settings-search-disabled"><SearchField label="Disabled search" disabled defaultValue="Disabled"/></Sample>
    <Sample id="settings-search-reset-cancelled"><form onReset={event => event.preventDefault()}><SearchField label="Cancelled reset search" defaultValue="Original"/><Button type="reset">Cancel search reset</Button></form></Sample>
    <Sample id="settings-navigation"><NavigationList label="Fixture navigation" items={items} defaultValue="general" onValueChange={setNavigation}/><output aria-label="Navigation intent">{navigation}</output></Sample>
    <Sample id="settings-navigation-controlled"><NavigationList label="Controlled navigation" items={items} value="general" onValueChange={setControlledNavigation}/><output aria-label="Controlled navigation intent">{controlledNavigation}</output></Sample>
    <Sample id="settings-navigation-disabled"><NavigationList label="Disabled navigation" items={items} disabled/></Sample>
    <Sample id="settings-row"><SettingRow label="World title" description="Shown in the world list" controlId="settings-world-title">{props => <input {...props} className="mc-input" defaultValue="My world"/>}</SettingRow></Sample>
    <Sample id="settings-row-disabled"><SettingRow label="Locked title" description="Host controls this setting" disabled controlId="settings-locked-title">{props => <input {...props} className="mc-input" defaultValue="Locked world"/>}</SettingRow></Sample>
    <Sample id="settings-row-inline"><SettingRow label="Inline world title" description="Inline description" layout="inline" controlId="settings-inline-title">{props => <input {...props} className="mc-input" defaultValue="Inline"/>}</SettingRow></Sample>
    <Sample id="settings-panel-row"><Panel title="Settings panel theme"><SettingRow label="Panel world title" description="Panel description" controlId="settings-panel-title">{props => <input {...props} className="mc-input" defaultValue="Panel world"/>}</SettingRow></Panel></Sample>
    <Sample id="settings-panel-inset-row"><Panel title="Inset settings theme" variant="inset"><SettingRow label="Inset world title" description="Inset panel description" controlId="settings-inset-title">{props => <input {...props} className="mc-input" defaultValue="Inset world"/>}</SettingRow></Panel></Sample>
    <Sample id="settings-keybinding"><form onSubmit={event => { event.preventDefault(); setSubmittedBinding(String(new FormData(event.currentTarget).get('jump'))); }}>
      <KeybindingField label="Jump binding" name="jump" defaultValue="KeyW" resetValue="KeyW" onValueChange={setBinding} description="Choose the physical jump key"/>
      <Button type="reset">Reset bindings form</Button><Button type="submit">Submit bindings form</Button>
    </form><output aria-label="Binding intent">{binding}</output><output aria-label="Binding form result">{submittedBinding}</output></Sample>
    <Sample id="settings-keybinding-controlled"><KeybindingField label="Controlled binding" value="KeyA" resetValue="KeyW" onValueChange={setControlledBinding}/><output aria-label="Controlled binding intent">{controlledBinding}</output></Sample>
    <Sample id="settings-keybinding-disabled"><form onSubmit={event => { event.preventDefault(); setSubmittedBinding(JSON.stringify([...new FormData(event.currentTarget).entries()])); }}><KeybindingField label="Disabled binding" name="disabled-key" disabled defaultValue="KeyQ"/><Button type="submit">Submit disabled binding form</Button></form></Sample>
    <Sample id="settings-keybinding-cancelled-reset"><form onReset={event => event.preventDefault()}><KeybindingField label="Cancelled reset binding" defaultValue="KeyQ"/><Button type="reset">Cancel binding form reset</Button></form></Sample>
    <Sample id="settings-dialog"><Button onClick={() => setDialog(true)}>Open binding dialog</Button></Sample>
    <Dialog open={dialog} onOpenChange={setDialog} title="Binding fixture dialog"><KeybindingField label="Dialog binding" defaultValue="KeyE"/><Button>After dialog binding</Button></Dialog>
    <Sample id="settings-pixel-toggle-off"><ToggleButton aria-label="Off surface" style={{ width: 180, height: 48 }}/></Sample>
    <Sample id="settings-pixel-toggle-on"><ToggleButton aria-label="On surface" defaultPressed style={{ width: 180, height: 48 }}/></Sample>
    <Sample id="settings-pixel-toggle-locked"><ToggleButton aria-label="Locked surface" disabled defaultPressed style={{ width: 180, height: 48 }}/></Sample>
    <Sample id="settings-pixel-search"><SearchField label="Search surface" defaultValue="Clear me"/></Sample>
    <Sample id="settings-pixel-keybinding"><KeybindingField label="Minecraft" defaultValue="KeyW" resetValue="KeyQ"/></Sample>
  </div>;
}
