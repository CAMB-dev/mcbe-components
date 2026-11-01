import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox } from '../src/components';
import { Combobox } from '../src/combobox';
import { CreditsScreen } from '../src/credits-screen';
import type { CreditsPresentationProfile } from '../src/credits-screen-types';
import type { CreditsContent, CreditsCssFace, CreditsLayoutLimits, CreditsTextStyle, CreditsWholeImage } from '../src/credits-types';
import '../src/fonts.css';
import '../src/credits-roll.css';
import '../src/credits-skip-button.css';
import '../src/credits-screen.css';
import './credits-demo.css';

const dirtURL = new URL('./assets/credits/bg32.png', import.meta.url).href;
const titleURL = new URL('../src/assets/start-menu/title.png', import.meta.url).href;
const fontPins = {
  pixel: '63afb50e1a41962f939ffad9df43f0f9047ccfe9f7daedb0b64612a074161c2f',
  cjk: 'ef9a950e89f948d74a7b09f3980e21826aa68b15f80273565f2b8a5c57c5d19d'
};
const fontFamilies = {
  pixel: '"MCBE Pixel", "MCBE CJK"',
  cjk: '"MCBE CJK", "MCBE Pixel"'
} as const;
type DemoFont = keyof typeof fontFamilies;

// Original demo writing, not the installed staff list, End Poem or quote.
const content: CreditsContent = {
  sections: [
    { section: 'For the worlds we build together', disciplines: [
      { discipline: 'Design & craft', titles: [
        { title: 'A little imagination', names: ['Lantern Workshop', 'Moss & Stone', '像素工坊'] },
        { title: 'A careful eye', names: ['The Window Makers', '方块研究小队'] }
      ] },
      { discipline: 'Play & discovery', titles: [
        { title: 'Every curious explorer', names: ['The Long Way Home', '远行者社群', 'Friends around the campfire'] }
      ] }
    ] },
    { section: 'A place for one more idea', disciplines: [
      { discipline: '', titles: [
        { title: 'Built with care', names: ['Those who share a map', 'Those who leave a light', 'Those who start again'] },
        { title: 'And you', names: ['The next builder'] }
      ] }
    ] }
  ],
  endPoem: '§3PLAYERNAME, a small idea can become a place.\n\n§fSet one block beside another. Leave room for a friend.\n\n§3方块之间，灵感相连。\n把一盏灯，留给下一位旅人。',
  quote: '§fBuild something kind.\n§7Leave a light for the next explorer.'
};
const playerName = 'Builder / 建造者';
// Narrow emitted-character allowlist, checked against the two OFL cmap tables
// during preparation. Do not silently substitute '?' or an OS face for new text.
const extraGlyphs = new Set(Array.from('§像素工坊方块研究小队远行者社群之间，灵感相连。把一盏灯留给下位旅人建造'));
function assertDemoGlyphs(text: string) {
  for (const character of text) {
    const code = character.codePointAt(0)!;
    if (code >= 32 && code <= 126 || extraGlyphs.has(character)) continue;
    throw new RangeError(`Credits demo font coverage was not preflighted for U+${code.toString(16).toUpperCase()}`);
  }
}

interface DemoMetrics { body: CreditsCssFace; heading: CreditsCssFace; font: DemoFont }
const limits: CreditsLayoutLimits = {
  maxSections: 20, maxDisciplines: 40, maxTitles: 100, maxNames: 200,
  maxInputUnits: 20000, maxExpandedUnits: 24000, maxTokens: 20000, maxParagraphs: 1000,
  maxLines: 2000, maxRuns: 4000, maxStages: 10, maxFontGlyphs: 1000,
  maxMeasureCalls: 20000, maxMeasuredUnits: 1000000, maxContentHeight: 100000
};

/** One reusable, intentionally Web-resolved scene profile. It owns all factory,
 * typography and timing choices so the ordinary example only supplies content
 * and playback controls. Native font choice/metrics/logo/shader remain unqualified.
 */
function makeDemoProfile(width: number, height: number, metrics: DemoMetrics): CreditsPresentationProfile {
  const body: CreditsTextStyle = { font: metrics.body, lineHeight: 20, letterSpacing: 0, color: '#ffffff', shadow: { x: 1, y: 1, color: '#000000' } };
  const section: CreditsTextStyle = { ...body, font: metrics.heading, lineHeight: 24, color: '#ffff70' };
  // Measured Settings-entry relative constraints, under an explicit Web viewport
  // registration: source renderer65%, centered17.5%; names40 units after titles.
  // This does not recover the native client rectangle or font raster.
  const contentWidth = width * .65, contentX = width * .175;
  const logoWidth = Math.min(250, width * .78);
  const title: CreditsWholeImage = { src: titleURL, naturalSize: [1937, 333], displaySize: [logoWidth, logoWidth * 333 / 1937], alt: 'Minecraft', provenance: 'whole-original-v1.26.60.5-title-png' };
  const background: CreditsWholeImage = { src: dirtURL, naturalSize: [32, 32], displaySize: [32, 32], alt: '', provenance: 'whole-original-v1.26.60.5-bg32-png' };
  return {
    id: `ofl-demo-${metrics.font}-${width}x${height}`, evidenceId: 'authored-demo-web-profile-native-unqualified',
    layout: {
      viewport: { size: [width, height], contentWidth, contentX },
      styles: { section, discipline: { ...body, color: '#bfc3c7' }, title: { ...body, color: '#c0c0c0' }, name: body, poem: { ...body, color: '#76cbd3' }, quote: { ...body, color: '#d6d0ae' } },
      blocks: {
        section: { before: 18, after: 18, insetStart: 0, insetEnd: 0 },
        discipline: { before: 10, after: 10, insetStart: 0, insetEnd: 0 },
        title: { before: 0, after: 20, insetStart: 0, insetEnd: 0 },
        name: { before: 0, after: 0, insetStart: 40, insetEnd: 0 },
        poem: { before: 10, after: 12, insetStart: 0, insetEnd: 0 },
        quote: { before: 14, after: 14, insetStart: 0, insetEnd: 0 }
      },
      emptyDiscipline: 'omit-and-collapse', emptyTitle: 'omit-and-collapse', paragraphs: 'blank-separated', paragraphGap: 12,
      paragraphBlankLines: 'collapse', wrap: 'word', longWord: 'break-word', horizontalWhitespace: 'preserve', wrapWhitespace: 'discard-at-break',
      textAlign: { section: 'center', discipline: 'left', title: 'left', name: 'left', poem: 'center', quote: 'center' }, gatedStageSpacing: 'omit',
      markup: { roles: ['poem', 'quote'], colors: { '2': '#50b878', '3': '#76cbd3', '7': '#bfc3c7', a: '#a1dc83', b: '#9de5ed', f: '#ffffff' },
        obfuscated: { alphabet: 'AB', periodMs: 100, seed: 1, preserveAdvance: true }, colorResetsObfuscated: true, resetCode: null,
        playerNameToken: { token: 'PLAYERNAME', replacement: 'literal-all' }, unknownCode: 'literal' },
      limits, provenance: 'host-resolved-web-profile', evidenceId: 'ofl-canvas-computed-font-metrics-original-demo-writing'
    },
    plan: { stages: [
      { id: 'title', kind: 'brand', brand: 'primary', image: title, align: 'center', before: 0, after: 22 },
      { id: 'makers', kind: 'staff', before: 0, after: 25 },
      { id: 'a-small-idea', kind: 'end-poem', before: 0, after: 18 },
      { id: 'one-more-light', kind: 'quote', before: 0, after: 0 }
    ], initialLead: 22, completionGap: height },
    surface: { background: { image: background, tileSize: [64, 64], logicalSize: [width, height * 20], from: [0, 0], to: [0, -height * 5], durationMs: 503000 }, edgeMask: { kind: 'none' }, coverPlacement: 'above-content' },
    logicalUnitsPerSecond: 22, fasterMultiplier: 3, skipLabelStyle: { ...body, lineHeight: 10, shadow: null },
    rasterPositioning: 'css-subpixel', imageSampling: 'point', completion: 'web-scroll-end-then-fade',
    input: { escape: 'reveal-then-exit', enter: 'reveal-skip', repeat: 'ignore', focus: 'host' }
  };
}

export function CreditsDemo() {
  const host = useRef<HTMLDivElement>(null), probe = useRef<HTMLSpanElement>(null);
  const [hostWidth, setHostWidth] = useState(0), [font, setFont] = useState<DemoFont>('pixel');
  const [metrics, setMetrics] = useState<DemoMetrics | null>(null), [fontError, setFontError] = useState('');
  const [playing, setPlaying] = useState(true), [faster, setFaster] = useState(false), [poem, setPoem] = useState(true);
  const [run, setRun] = useState(1), [open, setOpen] = useState(true), [status, setStatus] = useState('Enjoy the journey.');
  const scale = hostWidth >= 720 ? 2 : 1;
  const width = Math.max(180, Math.min(480, Math.floor(hostWidth / scale))), height = scale === 2 ? 280 : 340;
  useEffect(() => {
    const node = host.current, view = node?.ownerDocument.defaultView;
    if (!node || !view) return;
    const measure = () => setHostWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure();
    const observer = new view.ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = probe.current, owner = node?.ownerDocument, view = owner?.defaultView;
    if (!node || !owner || !view) return;
    let live = true;
    void (async () => {
      try {
        await Promise.all(['MCBE Pixel', 'MCBE CJK'].flatMap(family => [10, 12].map(size => owner.fonts.load(`${size * scale}px "${family}"`))));
        await owner.fonts.ready;
        if (!live) return;
        const face = (logicalSize: number): CreditsCssFace => {
          node.style.fontFamily = fontFamilies[font]; node.style.fontSize = `${logicalSize * scale}px`;
          const computed = view.getComputedStyle(node);
          const canvas = owner.createElement('canvas'), context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas text metrics are unavailable.');
          context.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
          if (computed.fontKerning === 'auto' || computed.fontKerning === 'normal' || computed.fontKerning === 'none') context.fontKerning = computed.fontKerning;
          const family = computed.fontFamily, fontSize = Number.parseFloat(computed.fontSize) / scale;
          if (!Number.isFinite(fontSize) || fontSize <= 0 || !owner.fonts.check(context.font)) throw new Error('The selected bundled fonts did not become ready.');
          return { kind: 'css-face', family, fontSize,
            metricsId: JSON.stringify(['credits-ofl-canvas', fontPins, scale, context.font, computed.fontWeight, computed.fontStyle, context.fontKerning]),
            measureText: text => { assertDemoGlyphs(text); return context.measureText(text).width / scale; } };
        };
        const body = face(10), heading = face(12);
        if (live) { setMetrics({ body, heading, font }); setFontError(''); }
      } catch (error) { if (live) setFontError(error instanceof Error ? error.message : String(error)); }
    })();
    return () => { live = false; };
  }, [font, scale]);
  const profile = useMemo(() => metrics ? makeDemoProfile(width, height, metrics) : null, [width, height, metrics]);
  const restart = () => { setRun(value => value + 1); setPlaying(true); setOpen(true); setStatus('A new journey begins.'); };
  return <div className="credits-demo" data-demo-credits="ordinary-preview">
    <div className="credits-demo__controls">
      <div className="credits-demo__buttons">
        <Button disabled={!open || !profile} onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Resume'}</Button>
        <Button onClick={restart}>Restart</Button>
      </div>
      <Combobox label="Credits font" value={font} options={[{ value: 'pixel', label: 'MCBE Pixel' }, { value: 'cjk', label: 'MCBE CJK' }]}
        onValueChange={value => { if (value === 'pixel' || value === 'cjk') setFont(value); }}/>
      <Checkbox label="Faster" checked={faster} onChange={event => setFaster(event.currentTarget.checked)}/>
      <Checkbox label="Closing poem" checked={poem} onChange={event => setPoem(event.currentTarget.checked)}/>
    </div>
    <div ref={host} className="credits-demo__host">
      <span ref={probe} className="credits-demo__font-probe" aria-hidden="true">Builder 建造者</span>
      {fontError ? <p role="alert" className="credits-demo__empty">{fontError}</p> : profile && hostWidth > 0 ? <>
        <CreditsScreen runKey={`credits-demo-${run}`} content={content} profile={profile} scale={scale}
          bindings={{ showEduIcon: false, showEndPoem: poem, playerName, scrollFaster: faster }} skipLabel="Skip"
          playback={{ playing, initialOffset: 0, hiddenPolicy: 'pause' }} open={open} tabIndex={0} aria-label="Credits preview"
          onPointerDown={event => { if (!(event.target instanceof Element) || !event.target.closest('button')) event.currentTarget.focus({ preventScroll: true }); }}
          onAction={detail => { setStatus(detail.target === 'button.show_skip' ? 'Skip is available.' : 'Leaving the credits.'); }}
          onCloseRequested={() => { setOpen(false); setPlaying(false); setStatus('The preview has closed.'); }}
          onLifecycle={detail => { if (detail.kind === 'credits_end') { setOpen(false); setPlaying(false); setStatus('Thanks for watching.'); } }}
          onRenderError={error => setFontError(error.message)} />
        {!open && <div className="credits-demo__empty" style={{ width: width * scale, height: height * scale }}><p>There is always room for one more idea.</p><Button onClick={restart}>Play again</Button></div>}
      </> : <div className="credits-demo__empty" role="status">Preparing the preview…</div>}
    </div>
    <div className="credits-demo__caption"><p role="status" aria-live="polite">{status}</p><span>Click the scene, then Enter or Esc to reveal Skip.</span></div>
    <details className="credits-demo__notes"><summary>About this example</summary><p>This preview uses original sample artwork with authored demonstration credits and writing. MCBE Pixel and MCBE CJK are bundled OFL fonts; their loaded browser metrics drive this Web profile. The staff region and title/name spacing follow measured entry relationships under an explicit viewport registration. Other spacing, font metrics, scroll speed, image sampling, cover placement and input policy are Web choices; native font, shader and whole-screen pixel parity remain unqualified. Education art is unavailable and is not substituted.</p></details>
  </div>;
}
