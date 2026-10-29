import { useState } from 'react';
import { Select } from '../src/components';
import { BannerPreview, BlockPreview, bannerPatternIds, loomPatternIds } from '../src/item-renderers';
import type { BannerDye, BlockKind, ItemMesh } from '../src/item-renderers';
import { blockTextureUrls } from '../src/item-renderer-assets';
import '../src/item-renderers.css';

const blocks = ['stone', 'stone-bricks', 'stone-slab', 'stone-stairs'] as const;
const plane: ItemMesh = { faces: [{ vertices: [[-1,1,0],[1,1,0],[1,-1,0],[-1,-1,0]], uv: [[0,0],[16,0],[16,16],[0,16]], normal: [0,0,1], brightness: 1 }] };

export function ItemRenderersFixture() {
  const [block, setBlock] = useState<BlockKind>('stone'), [color, setColor] = useState<BannerDye>('red');
  const [pattern, setPattern] = useState<(typeof bannerPatternIds)[number]>('stripe-center');
  const [show, setShow] = useState(true), [ready, setReady] = useState(0), [errors, setErrors] = useState(0);
  return <section id="item-renderers-fixture" style={{ background: '#28292a', color: '#fff', padding: 20, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, gap: 24 }}>
    <h2>Original-texture renderer calibration</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Select label="Block preset" value={block} onChange={event => setBlock(event.currentTarget.value as BlockKind)} options={blocks.map(value => ({ value, label: value }))}/>
      <Select label="Banner dye" value={color} onChange={event => setColor(event.currentTarget.value as BannerDye)} options={['red','blue','white','black'].map(value => ({ value, label: value }))}/>
      <Select label="Banner pattern" value={pattern} onChange={event => setPattern(event.currentTarget.value as typeof pattern)} options={bannerPatternIds.map(value => ({ value, label: value }))}/>
      <button type="button" onClick={() => setShow(value => !value)}>Toggle renderers</button>
    </div>
    {show && <div style={{ display: 'flex', gap: 24, alignItems: 'center' }} data-case="item-controlled">
      <BlockPreview block={block} onReady={() => setReady(value => value + 1)} onRenderError={() => setErrors(value => value + 1)}/>
      <BannerPreview width={40} height={80} patterns={[{ id: pattern, color }]}/>
    </div>}
    <output aria-label="Renderer callbacks">{JSON.stringify({ ready, errors })}</output>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>{blocks.map(value => <div key={value} data-case={`block-${value}`}><BlockPreview block={value} size={80} resolution={80} label={value}/></div>)}</div>
    <div data-case="item-original-uv"><BannerPreview width={20} height={40} baseColor="#ffffff"/></div>
    <div data-case="item-gradient"><BannerPreview width={20} height={40} baseColor="#000000" patterns={[{ id: 'gradient', color: '#ff0000' }]}/></div>
    <div data-case="item-layer-order"><BannerPreview width={20} height={40} baseColor="#000000" patterns={[{ id: 'stripe-center', color: '#ff0000' }, { id: 'stripe-middle', color: '#0000ff' }]}/></div>
    <div data-case="item-fabric"><BannerPreview width={20} height={40} baseColor="white" patterns={[{ id: 'stripe-center', color: 'red' }]} fabricShading/></div>
    <div data-case="item-custom-model"><BlockPreview model={plane} textures={{ all: blockTextureUrls['stone-bricks'] }} camera={{ yaw: 0, pitch: 0 }}/></div>
    <div data-case="item-custom-textures"><BlockPreview block="stone" size={80} textures={{ all: blockTextureUrls['stone-bricks'] }}/></div>
    <div data-case="item-banner-item"><BannerPreview view="item" width={80} height={80} patterns={[{ id: 'stripe-center', color: 'red' }]}/></div>
    <div data-case="item-banner-white"><BannerPreview view="item" width={80} height={80}/></div>
    <div data-case="item-banner-black"><BannerPreview view="item" width={80} height={80} baseColor="black"/></div>
    <div data-case="item-native-banner-border"><BannerPreview width={100} height={200} baseColor="white" patterns={[{ id: 'border', color: 'red' }]}/></div>
    <div data-case="item-native-banner-stripe-right"><BannerPreview width={100} height={200} baseColor="white" patterns={[{ id: 'stripe-right', color: 'red' }]}/></div>
    <div role="region" aria-label="Native Loom pattern calibration" tabIndex={0} style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
      <div data-case="item-native-loom32" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 90px)', gap: 0, width: 630 }}>
        {loomPatternIds.map(id => <div key={id} style={{ width: 90, height: 90, display: 'grid', placeItems: 'center' }}>
          <BannerPreview data-pattern={id} width={35} height={70} baseColor="gray" patterns={[{ id, color: 'white' }]}/>
        </div>)}
      </div>
    </div>
    <div data-case="item-all-patterns" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {bannerPatternIds.map(id => <BannerPreview key={id} data-pattern={id} width={14} height={28} baseColor="gray" patterns={[{ id, color: 'white' }]}/>)}
    </div>
  </section>;
}
