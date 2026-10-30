import { useMemo, useState } from 'react';
import { Button } from '../src/components';
import { Combobox } from '../src/combobox';
import { GuiLayer } from '../src/gui-layer-component';
import type { GuiLayerCommand } from '../src/gui-layer-component';
import type { GuiNpcPortraitMaterial } from '../src/gui-entity-geometry';
import { createNpcEntity, npcSkinNames } from '../src/npc-entity';
import { workstationImageAssets } from '../src/workstation-image-assets';

const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
// Ordinary caller camera for this gallery. These are not captured transforms or
// an implementation of Minecraft's still-unresolved portrait fitting policy.
const material: GuiNpcPortraitMaterial = {
  kind: 'npc-portrait', tileLightColor: [1,1,1,-1], fogControl: [1,2,1],
  fogColor: [0,0,0], materialColor: [1,1,1,1], uvAnimation: [0,0,1,1], subPixelOffset: [0,0],
};

export function NpcEntityExamples() {
  const [selected, setSelected] = useState(0), [scale, setScale] = useState(2), [retry, setRetry] = useState(0);
  const [state, setState] = useState('loading'), [error, setError] = useState('');
  const page = Math.floor(selected / 5), width = 320 * scale, height = 112 * scale;
  const names = npcSkinNames.slice(page * 5, page * 5 + 5);
  const commands = useMemo<GuiLayerCommand[]>(() => {
    const projection = new Float32Array([2/320,0,0,0, 0,-2/112,0,0, 0,0,-1/1000,0, -1,1,0,1]);
    const focus: GuiLayerCommand = {
      kind: 'image', texture: workstationImageAssets.focus.url,
      rect: [(selected % 5) * 64 + 1,1,62,110],
      nineSlice: { baseSize: workstationImageAssets.focus.sourceSize, insets: 1 },
    };
    return [focus, ...names.map((skin, column) => {
      const model = identity(), size = 2.3;
      model[0] = size; model[5] = size; model[10] = -size;
      model[12] = column * 64 + 32; model[13] = 37; model[14] = -500;
      return createNpcEntity({ skin, model, view: identity(), projection,
        viewport: [0,0,width,height], scissor: [column * 64 * scale,0,64 * scale,height], material });
    })];
  }, [selected, scale, width, height, page]);
  return <section data-npc-entity-examples aria-label="Original NPC models" style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <h3 style={{ margin: 0 }}>Original NPC models</h3>
    <p style={{ margin: 0, fontSize: 12 }}>All 60 original skins use the original cuboid model and authored folded pose. This gallery supplies its own camera; Minecraft portrait fitting is still being calibrated.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16 }}>
      <Combobox label="NPC model appearance" value={String(selected)} onValueChange={value => setSelected(Number(value))}
        options={npcSkinNames.map((alias, index) => ({ value: String(index), label: `${index + 1} · ${alias}` }))}/>
      <Combobox label="NPC model display scale" value={String(scale)} onValueChange={value => setScale(Number(value))}
        options={[1,2,3].map(value => ({ value: String(value), label: `${value}x` }))}/>
      <Button disabled={page === 0} onClick={() => setSelected((page - 1) * 5)}>Previous five models</Button>
      <Button disabled={page === 11} onClick={() => setSelected((page + 1) * 5)}>Next five models</Button>
    </div>
    <div role="region" aria-label="NPC model gallery" tabIndex={0} style={{ overflowX: 'auto', minWidth: 0, maxWidth: '100%' }}>
      <GuiLayer width={width} height={height} guiScale={scale} commands={commands} renderKey={retry}
        background={{ kind: 'solid', color: [.28,.28,.28,1] }} label={`Original NPC models ${page * 5 + 1} to ${page * 5 + 5}`}
        onRenderStateChange={value => { setState(value); if (value === 'loading') setError(''); }} onRenderError={reason => setError(reason.message)}
        style={{ display: 'block', width, height, imageRendering: 'pixelated' }}/>
    </div>
    <p data-npc-model-state role="status" style={{ margin: 0, fontSize: 12 }}>{state === 'ready' ? names.join(' · ') : state === 'error' ? error : 'Loading original NPC models…'}</p>
    {state === 'error' && <Button onClick={() => setRetry(value => value + 1)}>Retry NPC models</Button>}
  </section>;
}
