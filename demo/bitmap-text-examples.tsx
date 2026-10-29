import { useState } from 'react';
import { BitmapText, ItemSlot, Select } from '../src';
import type { BitmapTextProps, BitmapTextRenderer } from '../src';
import { nativeBitmapFont } from 'virtual:mcbeui-game-font';

const sword = new URL('./assets/minecraft/diamond_sword.png', import.meta.url).href;

export function BitmapTextExamples() {
  const [renderer, setRenderer] = useState<BitmapTextRenderer>('webgl');
  const [scale, setScale] = useState<2 | 2.5>(2.5);
  const [sampling, setSampling] = useState<BitmapTextProps['sampling']>('bilinear');
  const [shader, setShader] = useState<BitmapTextProps['shader']>('bitmap-smooth');
  const [status, setStatus] = useState<{ key: string; state: 'ready' | 'error'; message?: string }>();
  if (!nativeBitmapFont) return <p>Prepare the optional original Unicode sample with <code>python scripts/use-local-unicode-sample.py &lt;game-content-path&gt;</code>, then restart Vite. BitmapText accepts your own atlas pages and glyph metrics.</p>;
  const font = nativeBitmapFont;
  const profile = renderer === 'webgl' ? 'bedrock-unicode' : 'atlas-rect';
  const key = `${renderer}/${scale}/${sampling}/${shader}`;
  const currentStatus = status?.key === key ? status : undefined;
  return <section data-bitmap-text-example style={{ minWidth: 0, width: '100%' }}>
    <div data-bitmap-gpu-demo style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, minWidth: 0, marginBottom: 24 }}>
      <h3 style={{ margin: 0 }}>Controlled bitmap backend</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16 }}>
        <Select label="Bitmap renderer" value={renderer} options={[{ value: 'webgl', label: 'WebGL · Bedrock Unicode' }, { value: 'cpu', label: 'CPU · Atlas rectangles' }]}
          onChange={event => setRenderer(event.target.value === 'cpu' ? 'cpu' : 'webgl')}/>
        <Select label="Bitmap scale" value={String(scale)} options={[{ value: '2', label: '2×' }, { value: '2.5', label: '2.5×' }]}
          onChange={event => setScale(event.target.value === '2' ? 2 : 2.5)}/>
        <Select label="Bitmap sampling" value={sampling} options={[{ value: 'point', label: 'Point' }, { value: 'bilinear', label: 'Bilinear' }]}
          onChange={event => setSampling(event.target.value === 'point' ? 'point' : 'bilinear')}/>
        <Select label="Bitmap shader" value={shader} options={[{ value: 'bitmap', label: 'Bitmap' }, { value: 'bitmap-smooth', label: 'Bitmap smooth' }]}
          onChange={event => setShader(event.target.value === 'bitmap' ? 'bitmap' : 'bitmap-smooth')}/>
      </div>
      <div role="region" aria-label="Bitmap framebuffer preview" tabIndex={0}
        style={{ maxWidth: '100%', minWidth: 0, overflowX: 'auto', padding: 12, boxSizing: 'border-box', background: '#1b0c1b' }}>
        <BitmapText font={font} renderer={renderer} profile={profile} scale={scale} sampling={sampling} shader={shader}
          background={renderer === 'webgl' ? '#1b0c1b' : undefined}
          onReady={() => setStatus({ key, state: 'ready' })}
          onRenderError={error => setStatus({ key, state: 'error', message: error.message })}>{'钻石剑\n+7 攻击伤害'}</BitmapText>
      </div>
      <output role="status" aria-label="Bitmap backend status" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
        {renderer} / {profile} / {scale}×: {currentStatus?.state ?? 'loading'}{currentStatus?.message ? ` — ${currentStatus.message}` : ''}
      </output>
      <p style={{ margin: 0, fontSize: 12 }}>WebGL uses the original local Unicode pages and the explicit Bedrock Unicode GPU profile, with a #1b0c1b framebuffer background. CPU uses the atlas-rectangle renderer over the same CSS background. The controls keep the framebuffer at its requested size; narrow containers scroll locally.</p>
      <p style={{ margin: 0, fontSize: 12 }}>This demonstrates the actual GPU backend. DOM placement, ItemTooltip composition and complete GUI equivalence still need separate verification. The local game font pages remain caller-owned and are excluded from the library.</p>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', minWidth: 0 }}>
    <div><p>Original glyphs</p><BitmapText font={font} sampling="point" shader="bitmap">钻石剑</BitmapText></div>
    <div><p>Explicit text color</p><BitmapText font={font} sampling="point" shader="bitmap" color="#447fff">+7 攻击伤害</BitmapText></div>
    <div><p>Inside ItemTooltip</p><ItemSlot label="Original Unicode sword" item={{ name: '钻石剑', image: sword, lore: ['+7 攻击伤害'],
      tooltipTextRenderer: (text, context) => <BitmapText font={font} sampling="point" shader="bitmap" color={context.kind === 'name' ? '#ffffff' : '#447fff'} style={{ display: 'block' }}>{text}</BitmapText> }}/></div>
    </div>
  </section>;
}
