import { useEffect, useRef, useState } from 'react';
import { GuiLayer } from './gui-layer-component';
import type { GuiLayerCommand } from './gui-layer-component';
import { layoutGuiText } from './gui-text-geometry';
import type { GuiTextFont, GuiTextRgba8 } from './gui-text-geometry';
import type { GuiImageRect } from './gui-image-geometry';
import { validateBookPencilRaster } from './book-pencil';
import type { BookPencilRasterProfile } from './book-pencil';
import { useClassicLayoutEffect } from './classic-screen-lifecycle';

/** Caller-owned normal bitmap pages. This finite painter does not implement
 * native wrapping, caret, selection or IME; the same textarea owns editing. */
export interface BookBodyRasterProfile extends BookPencilRasterProfile {
  mode: 'idle';
  font: GuiTextFont;
  fontScale: number;
  sampling: 'point' | 'bilinear';
  shader: 'bitmap' | 'bitmap-smooth';
  /** Logical paint offset from the common edit centering panel. */
  paintOffset: readonly [number, number];
  clipRounding: 'logical-stage-floor' | 'physical-floor';
  color?: GuiTextRgba8;
}

function boundedText(text: string): string[] {
  if (typeof text !== 'string' || text.length > 8192) throw new RangeError('Book body source text exceeds the 4096-character budget.');
  const characters = [...text];
  if (characters.length > 4096) throw new RangeError('Book body source text exceeds the 4096-character budget.');
  return characters;
}

/** Copy declared fields only, after checking text bounds. Unknown extensions,
 * including circular caller metadata, are never serialized or read. */
function snapshotFont(font: GuiTextFont, characters: readonly string[]): GuiTextFont {
  if (!font || !Array.isArray(font.pages) || !font.pages.length || font.pages.length > 256
    || !Array.isArray(font.pageSizes) || font.pageSizes.length !== font.pages.length
    || !font.glyphs || typeof font.glyphs !== 'object') throw new RangeError('Book body requires explicit bitmap pages and glyph metrics.');
  return { pages: [...font.pages], pageSizes: [...font.pageSizes], cellHeight: font.cellHeight, lineHeight: font.lineHeight,
    glyphs: Object.fromEntries([...new Set(characters.filter(c => c !== '\n' && c !== '\r'))].map(c => {
      const glyph = Object.prototype.hasOwnProperty.call(font.glyphs, c) ? font.glyphs[c] : undefined;
      if (!glyph) throw new Error(`Missing Book body bitmap glyph U+${c.codePointAt(0)!.toString(16).toUpperCase()}.`);
      return [c, { page: glyph.page, x: glyph.x, y: glyph.y, width: glyph.width, height: glyph.height,
        advance: glyph.advance, offsetX: glyph.offsetX, offsetY: glyph.offsetY }];
    })) };
}

export function validateBookBodyRaster(profile: BookBodyRasterProfile, scale: number): void {
  validateBookPencilRaster(profile, scale);
  if (profile.mode !== 'idle' || !['logical-stage-floor', 'physical-floor'].includes(profile.clipRounding)
    || !Array.isArray(profile.paintOffset) || profile.paintOffset.length !== 2
    || Array.from(profile.paintOffset).some(n => !Number.isFinite(n) || !Number.isFinite(Math.fround(n))))
    throw new RangeError('Book body requires idle mode, an explicit clip policy and finite paint offset.');
  const font = snapshotFont(profile.font, []);
  layoutGuiText({ width: profile.frameSize[0], height: profile.frameSize[1], guiScale: scale, text: '', font,
    fontScale: profile.fontScale, sampling: profile.sampling, shader: profile.shader,
    color: profile.color, origin: [0, 0] });
}

interface Prepared {
  frameSize: readonly [number, number];
  scale: number;
  renderKey?: string | number;
  pageOrigin: readonly [number, number];
  command: Extract<GuiLayerCommand, { kind: 'text' }>;
}

/** Normal Book/common layout only. The clip and projection have different
 * extents; ceil-stage is a source clip policy, never a projection input. */
export function layoutBookBody(profile: BookBodyRasterProfile, scale: number, text: string,
  pageOrigin: readonly [number, number], pageSize: readonly [number, number], side: 'left' | 'right'): Prepared {
  const characters = boundedText(text);
  validateBookBodyRaster(profile, scale);
  const font = snapshotFont(profile.font, characters), f = Math.fround;
  const add = (a: number, b: number) => f(f(a) + f(b));
  const innerX = add(add(add(pageOrigin[0], side === 'left' ? 5 : -5), 16), 3);
  const innerY = add(add(pageOrigin[1], 23), 2);
  const innerWidth = f(pageSize[0] - 38), innerHeight = f(pageSize[1] - 62);
  if (!(innerWidth > 0 && innerHeight > 0)) throw new RangeError('Book body source inner rectangle must have positive dimensions.');
  const width = profile.frameSize[0], height = profile.frameSize[1];
  const sx = profile.clipRounding === 'logical-stage-floor' ? f(width / Math.ceil(width / scale)) : f(scale);
  const sy = profile.clipRounding === 'logical-stage-floor' ? f(height / Math.ceil(height / scale)) : f(scale);
  const x0 = innerX, y0 = add(innerY, -3), x1 = add(innerX, innerWidth), y1 = add(add(innerY, innerHeight), 3);
  const edge = (value: number, factor: number, maximum: number) => Math.max(0, Math.min(maximum, Math.floor(f(f(value) * factor))));
  const left = edge(x0, sx, width), top = edge(y0, sy, height), right = edge(x1, sx, width), bottom = edge(y1, sy, height);
  const scissor: GuiImageRect = [left, top, Math.max(0, right - left), Math.max(0, bottom - top)];
  if (!scissor[2] || !scissor[3]) throw new RangeError('Book body source clip lies outside its frame.');
  const command: Prepared['command'] = { kind: 'text', text, font, fontScale: profile.fontScale,
    sampling: profile.sampling, shader: profile.shader, color: [...(profile.color ?? [0, 0, 0, 255])] as GuiTextRgba8,
    origin: [add(innerX, profile.paintOffset[0]), add(innerY, profile.paintOffset[1])], scissor };
  const layout = layoutGuiText({ width, height, guiScale: scale, ...command });
  if (layout.logicalWidth > innerWidth || layout.logicalHeight > innerHeight)
    throw new RangeError('Book body source text requires unsupported wrapping or exceeds its inner rectangle.');
  return { frameSize: [width, height], scale, renderKey: profile.renderKey, pageOrigin: [...pageOrigin], command };
}

interface Props {
  profile: BookBodyRasterProfile;
  scale: number;
  pageOrigin: readonly [number, number];
  pageSize: readonly [number, number];
  side: 'left' | 'right';
  text: string;
  pageIndex: number;
  onError?: (error: Error, pageIndex: number) => void;
}

function Failure({ error, pageIndex, onError }: Pick<Props, 'pageIndex' | 'onError'> & { error: Error }) {
  const current = useRef({ error, pageIndex, onError }), reported = useRef(false);
  useClassicLayoutEffect(() => { current.current = { error, pageIndex, onError }; });
  useEffect(() => {
    if (!reported.current) { reported.current = true; const value = current.current; value.onError?.(value.error, value.pageIndex); }
  }, []);
  return null;
}

/** Every idle entry gets a fresh owner. Old ready/error events cannot qualify a
 * new value, retry key, focus/IME session or a reopened page. */
function IdleCanvas({ prepared, onError, pageIndex }: { prepared: Prepared } & Pick<Props, 'onError' | 'pageIndex'>) {
  const [ready, setReady] = useState(false), reported = useRef(false);
  const alive = useRef(false);
  const current = useRef({ onError, pageIndex });
  useClassicLayoutEffect(() => { current.current = { onError, pageIndex }; });
  useClassicLayoutEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  return <span aria-hidden="true" className="mc-book__body-painter" data-book-body-idle="true" data-book-body-ready={ready || undefined}>
    <GuiLayer width={prepared.frameSize[0]} height={prepared.frameSize[1]} guiScale={prepared.scale}
      commands={[prepared.command]} rasterOrigin="top-left" renderKey={prepared.renderKey}
      onRenderStateChange={state => { if (alive.current) setReady(state === 'ready'); }}
      onRenderError={error => {
        if (!alive.current) return;
        setReady(false);
        if (!reported.current) { reported.current = true; current.current.onError?.(error, current.current.pageIndex); }
      }}
      style={{ position: 'absolute', left: -prepared.pageOrigin[0] * prepared.scale,
        top: -prepared.pageOrigin[1] * prepared.scale, pointerEvents: 'none' }}/>
  </span>;
}

function BodyOwner({ prepared, text, pageIndex, onError }: { prepared: Prepared; text: string } & Pick<Props, 'pageIndex' | 'onError'>) {
  const root = useRef<HTMLSpanElement | null>(null), [idle, setIdle] = useState(false);
  const current = useRef(text), refresh = useRef<(() => void) | undefined>(undefined);
  useClassicLayoutEffect(() => { current.current = text; refresh.current?.(); });
  useClassicLayoutEffect(() => {
    const owner = root.current, input = owner?.parentElement?.querySelector<HTMLTextAreaElement>('textarea.mc-book__text');
    if (!owner || !input) return;
    const doc = input.ownerDocument, media = doc.defaultView?.matchMedia?.('(forced-colors: active)');
    let alive = true, composing = false;
    const update = () => {
      const available = alive && owner.isConnected && input.isConnected && !!owner.parentElement?.contains(input)
        && !input.disabled && !input.readOnly && !input.hidden && !input.closest('[hidden], [inert]')
        && doc.activeElement !== input && input.selectionStart === input.selectionEnd && !composing
        && input.scrollTop === 0 && input.scrollLeft === 0 && input.value === current.current && !media?.matches;
      if (!available) owner.removeAttribute('data-book-body-idle');
      else owner.setAttribute('data-book-body-idle', 'true');
      setIdle(available);
    };
    const start = () => { composing = true; update(); };
    const end = () => { composing = false; update(); };
    const events = ['focus', 'blur', 'select', 'input', 'change', 'scroll'] as const;
    for (const event of events) input.addEventListener(event, update);
    input.addEventListener('compositionstart', start); input.addEventListener('compositionupdate', start); input.addEventListener('compositionend', end);
    doc.addEventListener('selectionchange', update); media?.addEventListener('change', update);
    const Observer = doc.defaultView?.MutationObserver;
    const observer = Observer ? new Observer(update) : undefined;
    observer?.observe(input, { attributes: true, attributeFilter: ['disabled', 'readonly', 'hidden'] });
    refresh.current = update; update();
    return () => {
      alive = false; refresh.current = undefined; owner.removeAttribute('data-book-body-idle');
      for (const event of events) input.removeEventListener(event, update);
      input.removeEventListener('compositionstart', start); input.removeEventListener('compositionupdate', start); input.removeEventListener('compositionend', end);
      doc.removeEventListener('selectionchange', update); media?.removeEventListener('change', update);
      observer?.disconnect();
    };
  }, []);
  return <span ref={root} aria-hidden="true" className="mc-book__body-owner">
    {idle && <IdleCanvas prepared={prepared} onError={onError} pageIndex={pageIndex}/>}
  </span>;
}

export function BookBodyLayer(props: Props) {
  let prepared: Prepared;
  try { prepared = layoutBookBody(props.profile, props.scale, props.text, props.pageOrigin, props.pageSize, props.side); }
  catch (reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const key = JSON.stringify([props.profile.renderKey, props.pageIndex, typeof props.text === 'string' ? props.text.slice(0, 8192) : null, error.message]);
    return <Failure key={key} error={error} pageIndex={props.pageIndex} onError={props.onError}/>;
  }
  const key = JSON.stringify(prepared);
  return <BodyOwner key={key} prepared={prepared} text={props.text} pageIndex={props.pageIndex} onError={props.onError}/>;
}
