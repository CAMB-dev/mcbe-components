import { BitmapText } from '../src/bitmap-text';
import { nativeBitmapFont } from 'virtual:mcbeui-game-font';

/** Complete text fields, including spaces and trailing blank linebox pixels. */
export function NativeBitmapTextFixture() {
  if (!nativeBitmapFont) return <section data-native-bitmap-unavailable><h2>Original Unicode bitmap text</h2><p>The optional local Unicode sample is unavailable.</p></section>;
  const font = nativeBitmapFont;
  return <section aria-label="Original Unicode bitmap text calibration" style={{ minWidth: 0 }}>
    <h2>Original Unicode bitmap text</h2>
    <p>Original caller-owned pages. These fixed profiles verify glyphs and metrics; native whole-UI edge sampling remains unresolved.</p>
    {[2, 2.5].map(scale => <div key={scale} role="region" aria-label={`Unicode scale ${scale} scroll area`} tabIndex={0} style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <div data-native-bitmap-scale={scale} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', background: '#1b0c1b' }}>
        <BitmapText font={font} scale={scale} sampling={scale === 2 ? 'point' : 'bilinear'} shader={scale === 2 ? 'bitmap' : 'bitmap-smooth'} color="#ffffff" style={{ display: 'block' }}>钻石剑</BitmapText>
        <BitmapText font={font} scale={scale} sampling={scale === 2 ? 'point' : 'bilinear'} shader={scale === 2 ? 'bitmap' : 'bitmap-smooth'} color="#447fff" style={{ display: 'block' }}>+7 攻击伤害</BitmapText>
      </div>
    </div>)}
  </section>;
}
