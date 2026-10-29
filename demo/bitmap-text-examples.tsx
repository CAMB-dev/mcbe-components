import { BitmapText } from '../src/bitmap-text';
import { ItemSlot } from '../src/inventory';
import { nativeBitmapFont } from 'virtual:mcbeui-game-font';

const sword = new URL('./assets/minecraft/diamond_sword.png', import.meta.url).href;

export function BitmapTextExamples() {
  if (!nativeBitmapFont) return <p>Prepare the optional original Unicode sample with <code>python scripts/use-local-unicode-sample.py &lt;game-content-path&gt;</code>, then restart Vite. BitmapText accepts your own atlas pages and glyph metrics.</p>;
  const font = nativeBitmapFont;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
    <div><p>Original glyphs</p><BitmapText font={font} sampling="point" shader="bitmap">钻石剑</BitmapText></div>
    <div><p>Explicit text color</p><BitmapText font={font} sampling="point" shader="bitmap" color="#447fff">+7 攻击伤害</BitmapText></div>
    <div><p>Inside ItemTooltip</p><ItemSlot label="Original Unicode sword" item={{ name: '钻石剑', image: sword, lore: ['+7 攻击伤害'],
      tooltipTextRenderer: (text, context) => <BitmapText font={font} sampling="point" shader="bitmap" color={context.kind === 'name' ? '#ffffff' : '#447fff'} style={{ display: 'block' }}>{text}</BitmapText> }}/></div>
  </div>;
}
