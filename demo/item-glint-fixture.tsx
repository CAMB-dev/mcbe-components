import { useState } from 'react';
import { ItemGlint } from '../src/item-glint';
import type { ItemGlintBlend, ItemGlintUniforms } from '../src/item-glint';

const sword = new URL('./assets/minecraft/diamond_sword.png', import.meta.url).href;
const profile: ItemGlintUniforms = { uvOffset: [.125, -.2], uvScale: [1.5, .75], uvRotation: [.35, -.6], glintColor: [.3, .1, .5] };
const blend: ItemGlintBlend = { source: 'one', destination: 'one' };

export function ItemGlintFixture() {
  const [offset, setOffset] = useState(.125), [mounted, setMounted] = useState(true), [fail, setFail] = useState(false);
  const [ready, setReady] = useState(0), [errors, setErrors] = useState(0), [refReady, setRefReady] = useState(false);
  return <section id="item-glint-fixture" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', minWidth: 0, gap: 16, padding: 20, background: '#28292a', color: '#fff' }}>
    <h2>Explicit source-texture glint calibration</h2>
    <p>Fixed Web test uniforms and additive composition; native host phase and draw state are unverified.</p>
    <div data-case="glint-point"><ItemGlint imageSrc={sword} uniforms={profile} glintSampler="point-repeat" blend={blend} width={32} height={32} label="Point sample test" /></div>
    <div data-case="glint-bilinear"><ItemGlint imageSrc={sword} uniforms={profile} glintSampler="bilinear-repeat" blend={blend} width={32} height={32} label="Bilinear sample test" /></div>
    <div data-case="glint-zero"><ItemGlint imageSrc={sword} uniforms={{ ...profile, glintColor: [0, 0, 0] }} glintSampler="point-repeat" blend={blend} width={32} height={32} /></div>
    <div data-case="glint-tint"><ItemGlint imageSrc={sword} uniforms={{ ...profile, tintColor: [.7, .9, .4, .5], hudOpacity: .6 }} glintSampler="bilinear-repeat" blend={{ source: 'source-alpha', destination: 'one-minus-source-alpha' }} width={32} height={32} /></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <button onClick={() => setOffset(value => value === .125 ? .375 : .125)}>Change glint offset</button>
      <button onClick={() => setMounted(value => !value)}>Toggle glint renderer</button>
      <button onClick={() => setFail(value => !value)}>Toggle glint resource failure</button>
    </div>
    <div data-case="glint-controlled">{mounted && <ItemGlint imageSrc={fail ? '/__missing_glint_item__.png' : sword} uniforms={{ ...profile, uvOffset: [offset, -.2] }} glintSampler="bilinear-repeat" blend={blend}
      ref={node => { if (node) setRefReady(node instanceof HTMLCanvasElement); }} onReady={() => setReady(value => value + 1)} onRenderError={() => setErrors(value => value + 1)} />}</div>
    <output aria-label="Glint callbacks" style={{ overflowWrap: 'anywhere' }}>{JSON.stringify({ ready, errors, refReady, offset })}</output>
  </section>;
}
