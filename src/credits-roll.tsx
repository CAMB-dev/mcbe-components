import { forwardRef, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react';
import { BitmapText } from './bitmap-text';
import type { BitmapTextRenderer } from './bitmap-text';
import { Image } from './image';
import { useClassicNodeRef } from './classic-screen-lifecycle';
import { layoutCredits } from './credits-layout';
import type { CreditsDirectFontSource, CreditsLayout, CreditsLayoutLine, CreditsLayoutRequest, CreditsLayoutRun } from './credits-types';

export interface CreditsRollProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content' | 'children' | 'dangerouslySetInnerHTML' | 'onError'>, CreditsLayoutRequest {
  /** Content position and presentation time are independent, controlled values. */
  readonly offset: number;
  readonly elapsedMs: number;
  readonly scale: number;
  readonly rasterPositioning: 'css-subpixel' | 'physical-floor';
  /** An explicit Web image sampler; neither choice certifies a native quad. */
  readonly imageSampling: 'point' | 'linear';
  readonly bitmapRenderer?: BitmapTextRenderer;
  readonly viewportRef?: Ref<HTMLDivElement>;
  readonly onLayout?: (layout: CreditsLayout) => void;
  readonly onRenderError?: (error: Error, location: { readonly lineIndex: number; readonly runIndex: number }) => void;
}

interface RunBounds { top: number; bottom: number; wholeCanvasFits: boolean }
const MAX_CANVAS_SIDE = 8192, MAX_CANVAS_PIXELS = 4194304, MAX_DRAW_ELEMENTS = 16384;

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
}

function fits(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width <= MAX_CANVAS_SIDE
    && height <= MAX_CANVAS_SIDE && width * height <= MAX_CANVAS_PIXELS;
}

/** Bitmap ink bounds include real bearings/shadow, so a negative-bearing row
 * is not culled solely because its advance box lies outside the viewport. CSS
 * face ink metrics are host-owned; those inexpensive text runs remain mounted. */
function bitmapBounds(run: CreditsLayoutRun, scale: number): RunBounds | null {
  if (run.font.kind !== 'bitmap') return null;
  const font = run.font, shadow = run.shadow;
  let left = run.x, right = run.x + run.width, top = run.y, bottom = run.y + font.font.lineHeight * font.scale;
  for (const character of run.characters) {
    const glyph = font.font.glyphs[character.resolvedText];
    if (!glyph) throw new RangeError('A resolved Credits character is missing from its bitmap font.');
    const x = character.x + (glyph.offsetX ?? 0) * font.scale;
    const y = run.y + (glyph.offsetY ?? 0) * font.scale;
    const width = glyph.width * font.scale, height = glyph.height * font.scale;
    left = Math.min(left, x, x + (shadow?.x ?? 0)); right = Math.max(right, x + width, x + width + (shadow?.x ?? 0));
    top = Math.min(top, y, y + (shadow?.y ?? 0)); bottom = Math.max(bottom, y + height, y + height + (shadow?.y ?? 0));
    const cellWidth = (Math.max(glyph.advance * font.scale, (glyph.offsetX ?? 0) * font.scale + width, 0)
      - Math.min((glyph.offsetX ?? 0) * font.scale, 0) + Math.abs(shadow?.x ?? 0)) * scale;
    const cellHeight = (Math.max(font.font.lineHeight * font.scale, (glyph.offsetY ?? 0) * font.scale + height, 0)
      - Math.min((glyph.offsetY ?? 0) * font.scale, 0) + Math.abs(shadow?.y ?? 0)) * scale;
    if (!fits(Math.ceil(cellWidth), Math.ceil(cellHeight))) throw new RangeError('A Credits glyph exceeds the supported bitmap canvas budget.');
  }
  return { top, bottom, wholeCanvasFits: fits(Math.ceil((right - left) * scale), Math.ceil((bottom - top) * scale)) };
}

/** Deterministic finite Web obfuscation, not a recovered native §k generator.
 * A preserve-advance pool never substitutes a differently sized glyph. */
function buildObfuscationPools(layout: CreditsLayout) {
  const { obfuscated, limits } = layout.presentation;
  const alphabet = [...new Set([...obfuscated.alphabet])];
  let calls = 0, units = 0;
  const measurements = new Map<CreditsDirectFontSource, Map<string, number | undefined>>();
  const buckets = new Map<CreditsDirectFontSource, { all: string[]; widths: Map<number, string[]> }>();
  const advance = (font: CreditsDirectFontSource, character: string): number | undefined => {
    let cache = measurements.get(font);
    if (!cache) { cache = new Map(); measurements.set(font, cache); }
    if (cache.has(character)) return cache.get(character);
    let value: number | undefined;
    if (font.kind === 'bitmap') value = font.font.glyphs[character]?.advance;
    else {
      if (++calls > limits.maxMeasureCalls || (units += character.length) > limits.maxMeasuredUnits)
        throw new RangeError('Credits obfuscation exceeds the remaining text-measurement budget.');
      value = Reflect.apply(font.measureText, undefined, [character]);
      if (!Number.isFinite(value) || value < 0) throw new RangeError('Credits obfuscation requires finite non-negative measured widths.');
    }
    if (font.kind === 'bitmap' && value !== undefined) value *= font.scale;
    cache.set(character, value); return value;
  };
  return layout.lines.map(line => line.runs.map(run => {
    if (!run.obfuscated) return [];
    let pool = buckets.get(run.font);
    if (!pool) {
      pool = { all: [], widths: new Map() };
      for (const character of alphabet) {
        const width = advance(run.font, character);
        if (width === undefined) continue;
        pool.all.push(character);
        const group = pool.widths.get(width) ?? []; group.push(character); pool.widths.set(width, group);
      }
      buckets.set(run.font, pool);
    }
    return run.characters.map(character => obfuscated.preserveAdvance
      ? pool!.widths.get(advance(run.font, character.resolvedText)!) ?? [] : pool!.all);
  }));
}

function scramble(seed: number, epoch: number, text: string): number {
  let hash = (seed ^ epoch) >>> 0;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0;
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d); hash ^= hash >>> 15;
  return hash >>> 0;
}

/** Concrete controlled content renderer. It consumes the ordered data model,
 * formatting, fonts, wrapping and stages itself; no whole-renderer slot. No
 * original prose/font or native timing/layout preset is bundled here. */
export const CreditsRoll = forwardRef<HTMLDivElement, CreditsRollProps>(function CreditsRoll({
  content, profile, plan, bindings, offset, elapsedMs, scale, rasterPositioning, imageSampling,
  bitmapRenderer = 'cpu', viewportRef, onLayout, onRenderError, role = 'region', className = '', style, ...native
}, forwardedRef) {
  finite(offset, 'Credits offset'); finite(elapsedMs, 'Credits presentation time');
  if (elapsedMs < 0) throw new RangeError('Credits presentation time must be non-negative.');
  if (!Number.isSafeInteger(scale) || scale <= 0) throw new RangeError('Credits GUI scale must be a positive safe integer.');
  if (rasterPositioning !== 'css-subpixel' && rasterPositioning !== 'physical-floor') throw new RangeError('An explicit Credits raster positioning policy is required.');
  if (imageSampling !== 'point' && imageSampling !== 'linear') throw new RangeError('An explicit Credits image sampling policy is required.');
  if (!['cpu', 'webgl', 'webgl-shared'].includes(bitmapRenderer)) throw new RangeError('Unsupported Credits bitmap renderer.');
  const [root, attach] = useClassicNodeRef(forwardedRef, viewportRef);
  const callbacks = useRef({ onLayout, onRenderError }); callbacks.current = { onLayout, onRenderError };
  const layout = useMemo(() => layoutCredits({ content, profile, plan, bindings }),
    [content, profile, plan, bindings.showEndPoem, bindings.showEduIcon, bindings.playerName]);
  const [width, height] = layout.viewport.size, physicalWidth = width * scale, physicalHeight = height * scale;
  if (!fits(physicalWidth, physicalHeight)) throw new RangeError('Credits viewport exceeds the finite rendering budget.');
  finite(offset * scale, 'Scaled Credits offset');
  const currentLayout = useRef(layout); currentLayout.current = layout;
  const geometry = useMemo(() => layout.lines.map(line => line.runs.map(run => bitmapBounds(run, scale))), [layout, scale]);
  const pools = useMemo(() => buildObfuscationPools(layout), [layout]);
  const epoch = Math.floor(elapsedMs / layout.presentation.obfuscated.periodMs);
  if (!Number.isSafeInteger(epoch)) throw new RangeError('Credits obfuscation epoch exceeds the finite presentation-time budget.');
  const position = (value: number) => rasterPositioning === 'physical-floor' ? Math.floor(value * scale) : value * scale;
  useEffect(() => {
    if (root.current?.isConnected && currentLayout.current === layout) callbacks.current.onLayout?.(layout);
  }, [layout, root]);

  let draws = 0;
  const countDraw = () => { if (++draws > MAX_DRAW_ELEMENTS) throw new RangeError('Credits current view exceeds the finite draw-element budget.'); };
  const drawRun = (run: CreditsLayoutRun, lineIndex: number, runIndex: number): ReactNode => {
    const bounds = geometry[lineIndex]![runIndex];
    // Obfuscated alternatives can have different ink bounds despite matching
    // advances. Keep those runs mounted instead of culling by the old glyph.
    if (!run.obfuscated && bounds && (bounds.bottom < offset || bounds.top > offset + height)) return null;
    const font = run.font;
    const error = (failure: Error) => {
      if (root.current?.isConnected && currentLayout.current === layout) callbacks.current.onRenderError?.(failure, { lineIndex, runIndex });
    };
    const textStyle: CSSProperties = { position: 'absolute', left: position(run.x), top: position(run.y - offset),
      color: run.color, whiteSpace: 'pre', lineHeight: 1, margin: 0, padding: 0, border: 0 };
    const bitmap = (text: string, x: number, key?: number) => {
      if (font.kind !== 'bitmap') return null;
      countDraw();
      return <BitmapText key={key} font={font.font} scale={font.scale * scale} sampling={font.sampling} shader={font.shader}
        profile={font.renderProfile} renderer={bitmapRenderer} layout="advance" color={run.color}
        shadow={run.shadow ? { color: run.shadow.color, offsetX: run.shadow.x / font.scale, offsetY: run.shadow.y / font.scale } : undefined}
        onRenderError={error} style={{ ...textStyle, left: position(x) }}>{text}</BitmapText>;
    };
    if (!run.obfuscated && font.kind === 'bitmap' && run.letterSpacing === 0 && bounds?.wholeCanvasFits)
      return bitmap(run.resolvedText, run.x);
    if (!run.obfuscated && font.kind === 'css-face') { countDraw(); return <span className="mc-credits-roll__css-run" style={{ ...textStyle,
      fontFamily: font.family, fontSize: font.fontSize * scale, letterSpacing: run.letterSpacing * scale,
      textShadow: run.shadow ? `${run.shadow.x * scale}px ${run.shadow.y * scale}px 0 ${run.shadow.color}` : 'none' }}>{run.resolvedText}</span>; }
    return run.characters.map((character, index) => {
      const pool = pools[lineIndex]![runIndex]![index] ?? [];
      const key = `${JSON.stringify(character.source)}:${lineIndex}:${runIndex}:${index}`;
      const text = run.obfuscated && pool.length ? pool[scramble(layout.presentation.obfuscated.seed, epoch, key) % pool.length]! : character.resolvedText;
      if (font.kind === 'bitmap') return bitmap(text, character.x, index);
      countDraw();
      return <span key={index} className="mc-credits-roll__css-run" style={{ ...textStyle, left: position(character.x),
        fontFamily: font.family, fontSize: font.fontSize * scale,
        textShadow: run.shadow ? `${run.shadow.x * scale}px ${run.shadow.y * scale}px 0 ${run.shadow.color}` : 'none' }}>{text}</span>;
    });
  };
  const drawLine = (line: CreditsLayoutLine, index: number) => <div key={index} className="mc-credits-roll__line"
    data-line-index={index} data-text-role={line.role} data-decoration={line.decorationId}>
    {line.runs.map((run, runIndex) => <div key={runIndex} className="mc-credits-roll__run">{drawRun(run, index, runIndex)}</div>)}
  </div>;
  const semanticText = (start: number, end: number) => layout.lines.slice(start, end).filter(line => !line.decorationId).map(line => line.text).join('\n');
  return <div {...native} ref={attach} role={role}
    aria-label={native['aria-label'] ?? (role === 'region' && !native['aria-labelledby'] ? 'Credits' : undefined)}
    className={`mc-credits-roll ${className}`}
    data-fidelity="explicit-data-driven-web-profile" data-profile-provenance={layout.trace.profileProvenance} data-profile-evidence={layout.trace.evidenceId}
    data-source-renderer="credits_renderer" data-native-certified="false" data-offset={offset} data-layout-height={layout.contentHeight}
    style={{ ...style, position: 'relative', boxSizing: 'border-box', width: physicalWidth, height: physicalHeight,
      margin: 0, padding: 0, border: 0, overflow: 'hidden', flex: 'none' }}>
    <div className="mc-credits-roll__visual" aria-hidden="true">
      {layout.stages.map(stage => <div key={stage.id} className="mc-credits-roll__stage" data-stage-id={stage.id} data-stage-kind={stage.kind}>
        {layout.images.slice(...stage.imageRange).map((image, index) => image.y + image.height >= offset && image.y <= offset + height
          ? <Image key={index} src={image.image.src} sourceSize={image.image.naturalSize} size={[image.width, image.height]} scale={scale} alt=""
            data-image-provenance={image.image.provenance} style={{ position: 'absolute', left: position(image.x), top: position(image.y - offset),
              imageRendering: imageSampling === 'point' ? 'pixelated' : 'auto' }} /> : null)}
        {layout.lines.slice(...stage.lineRange).map((line, index) => drawLine(line, stage.lineRange[0] + index))}
      </div>)}
    </div>
    <div className="mc-credits-roll__transcript">
      {layout.stages.map(stage => <div key={stage.id}>
      {layout.images.slice(...stage.imageRange).map((image, index) => image.image.alt ? <p key={`image-${index}`}>{image.image.alt}</p> : null)}
      {layout.nodes.slice(...stage.nodeRange).map((node, index) => {
        const text = semanticText(...node.headingLineRange);
        if (!text) return null;
        if (node.role === 'section') return <h2 key={index}>{text}</h2>;
        if (node.role === 'discipline') return <h3 key={index}>{text}</h3>;
        return <p key={index} data-text-role={node.role}>{text}</p>;
      })}
      </div>)}
    </div>
  </div>;
});
