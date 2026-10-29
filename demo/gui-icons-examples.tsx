import { useState } from 'react';
import { Button, Combobox, GuiIcon, SearchField, guiIconNames } from '../src';
import type { GuiIconName } from '../src';
import { guiIconCatalog } from './gui-icon-catalog';

const categories = [...new Set(Object.values(guiIconCatalog).map(icon => icon.category))].sort();
const categoryLabels: Record<string, string> = { navigation: 'Navigation', settings: 'Settings', feedback: 'Feedback', social: 'Social', 'inventory-crafting': 'Inventory & crafting', device: 'Devices' };

export function GuiIconsExamples() {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<GuiIconName>('error-glyph'), [scale, setScale] = useState(2);
  const matches = guiIconNames.filter(name => (category === 'all' || guiIconCatalog[name].category === category)
    && `${name} ${guiIconCatalog[name].category}`.includes(query.trim().toLowerCase()));
  const source = guiIconCatalog[selected];
  return <section data-gui-icons-example aria-label="Original GUI icon collection" style={{ padding: 24, minWidth: 0 }}>
    <Button aria-expanded={open} aria-controls={open ? 'original-gui-icons-browser' : undefined} onClick={() => setOpen(value => !value)}>
      {open ? 'Hide GUI icons' : `Browse ${guiIconNames.length} GUI icons`}
    </Button>
    <p style={{ fontSize: 12 }}>Original game PNGs, complete colors and transparent margins. Integer scales preserve each image's proportions.</p>
    {open && <div id="original-gui-icons-browser" style={{ display: 'grid', gap: 20, minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 16 }}>
        <SearchField label="Find a GUI icon" placeholder="Name or category" value={query} onChange={event => setQuery(event.target.value)}/>
        <Combobox label="Icon category" value={category} onValueChange={setCategory}
          options={[{ value: 'all', label: 'All categories' }, ...categories.map(value => ({ value, label: categoryLabels[value] ?? value }))]}/>
        <Combobox label="Icon preview scale" value={String(scale)} onValueChange={value => setScale(Number(value))}
          options={[1, 2, 3].map(value => ({ value: String(value), label: `${value}×` }))}/>
      </div>
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 100, maxWidth: '100%', overflow: 'auto', background: '#28292a', padding: 16 }}>
          <GuiIcon name={selected} scale={scale} label={selected}/>
        </div>
        <output aria-label="Selected GUI icon" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{selected} · {source.dimensions[0]}×{source.dimensions[1]} original pixels</output>
        <code style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{`<GuiIcon name="${selected}" scale={${scale}} />`}</code>
      </div>
      <output role="status" aria-label="GUI icon search results" style={{ fontSize: 12 }}>{matches.length} of {guiIconNames.length} icons</output>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(124px, 100%), 1fr))', gap: 8, minWidth: 0 }}>
        {matches.map(name => <Button key={name} aria-pressed={selected === name} onClick={() => setSelected(name)}
          style={{ minWidth: 0, padding: 8 }}>
          <span style={{ display: 'grid', justifyItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ display: 'grid', placeItems: 'center', minHeight: 52 }}><GuiIcon name={name}/></span>
            <span style={{ fontSize: 12, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{name}</span>
          </span>
        </Button>)}
      </div>
      {!matches.length && <p>No icons match this search.</p>}
    </div>}
  </section>;
}
