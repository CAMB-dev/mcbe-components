import { useState } from 'react';
import { Select } from '../src/components';
import { BlockPreview } from '../src/item-renderers';
import type { BlockKind } from '../src/item-renderers';

const presets: readonly { value: BlockKind; label: string }[] = [
  { value: 'stone', label: 'Stone' }, { value: 'stone-bricks', label: 'Stone bricks' },
  { value: 'stone-slab', label: 'Stone slab' }, { value: 'stone-stairs', label: 'Stone stairs' },
  { value: 'enchanting-table', label: 'Enchanting table' },
];

export function ItemRenderersExamples() {
  const [selected, setSelected] = useState<BlockKind>('enchanting-table');
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 20, minWidth: 0 }}>
    <Select label="Block item preset" value={selected} options={presets} onChange={event => setSelected(event.currentTarget.value as BlockKind)}/>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <BlockPreview block={selected} size={80} resolution={80} label={`${presets.find(preset => preset.value === selected)?.label} preview`}/>
      <code>{`<BlockPreview block="${selected}" />`}</code>
    </div>
    <div role="list" aria-label="Block item presets" style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {presets.map(preset => <div role="listitem" key={preset.value} style={{ display: 'grid', justifyItems: 'center', gap: 8, width: 120 }}>
        <BlockPreview block={preset.value} size={48} resolution={48} label={preset.label}/><span>{preset.label}</span>
      </div>)}
    </div>
    <p className="workstation-note">Original block textures. The enchanting table uses a source-supported 12-pixel-high cuboid and unchanged face colors. Item camera and rasterization remain configurable reconstructions.</p>
  </div>;
}
