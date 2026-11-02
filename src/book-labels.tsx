import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from './components';
import type { ButtonProps } from './components';
import { GuiLayer } from './gui-layer-component';
import type { GuiLayerCommand } from './gui-layer-component';
import { layoutGuiText } from './gui-text-geometry';
import type { GuiTextFont, GuiTextRgba8 } from './gui-text-geometry';
import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageRect } from './gui-image-geometry';
import { bookAssets } from './book-assets';
import type { BookAsset } from './book-assets';
import { validateBookPencilRaster } from './book-pencil';
import type { BookPencilRasterProfile } from './book-pencil';
import type { BookSkinSources } from './book';
import { useClassicLayoutEffect } from './classic-screen-lifecycle';

export type BookLabelRole = 'page-number' | 'footer';
export interface BookLabelRasterStyle {
  font: GuiTextFont;
  fontScale: number;
  sampling: 'point' | 'bilinear';
  shader: 'bitmap' | 'bitmap-smooth';
  /** Explicit host measurement policy, not a recovered universal engine rule. */
  widthRounding: 'none' | 'ceil';
  /** Logical paint offset from the centered line's left/top. */
  paintOffset: readonly [number, number];
  color?: GuiTextRgba8;
}
export interface BookLabelRasterProfile extends BookPencilRasterProfile {
  pageNumber?: BookLabelRasterStyle;
  footer?: BookLabelRasterStyle;
}
export interface BookLabelGeometry { width: number; height: number; pageWidth: number; pageHeight: number }
interface Frame { profile: BookLabelRasterProfile; scale: number }
const COUNTER: GuiTextRgba8 = [188, 163, 135, 255], FOOTER: GuiTextRgba8 = [76, 76, 76, 255];
const WHITE: GuiTextRgba8 = [255, 255, 255, 255];
const buttonTextures = ['button_borderless_light', 'button_borderless_lighthover', 'button_borderless_lightpressed', 'button_borderless_lightpressednohover'] as const;
const buttonSources = [
  new URL('./assets/document-viewer/button_borderless_light.png', import.meta.url).href,
  new URL('./assets/document-viewer/button_borderless_lighthover.png', import.meta.url).href,
  new URL('./assets/document-viewer/button_borderless_lightpressed.png', import.meta.url).href,
  new URL('./assets/document-viewer/button_borderless_lightpressednohover.png', import.meta.url).href,
];

export function validateBookLabelRaster(profile: BookLabelRasterProfile, scale: number) {
  validateBookPencilRaster(profile, scale);
  for (const style of [profile.pageNumber, profile.footer]) if (style !== undefined) {
    if (!style || !['none', 'ceil'].includes(style.widthRounding) || !Array.isArray(style.paintOffset)
      || style.paintOffset.length !== 2 || Array.from(style.paintOffset).some(n => !Number.isFinite(n) || !Number.isFinite(Math.fround(n))))
      throw new RangeError('Book labels require an explicit width-rounding policy and finite paint offset.');
    layoutGuiText({ width: profile.frameSize[0], height: profile.frameSize[1], guiScale: scale, ...style, text: '', origin: [0, 0] });
  }
}

/** Copy only declared fields/used glyphs. Unused font extensions are not part of
 * a request identity, and mutable caller objects never become live GPU inputs. */
function textCommand(frame: Frame, style: BookLabelRasterStyle, text: string, center: number, top: number, color: GuiTextRgba8) {
  if (typeof text !== 'string' || text.length > 8192) throw new RangeError('Book source labels exceed the 4096-character budget.');
  const characters = [...text];
  if (characters.length > 4096) throw new RangeError('Book source labels exceed the 4096-character budget.');
  if (/[\r\n]/.test(text)) throw new RangeError('Book source labels require a single line.');
  const font: GuiTextFont = { pages: [...style.font.pages], pageSizes: [...style.font.pageSizes], cellHeight: style.font.cellHeight,
    lineHeight: style.font.lineHeight, glyphs: Object.fromEntries([...new Set(characters)].map(c => {
      const g = Object.prototype.hasOwnProperty.call(style.font.glyphs, c) ? style.font.glyphs[c] : undefined;
      return [c, g && { page: g.page, x: g.x, y: g.y, width: g.width, height: g.height, advance: g.advance, offsetX: g.offsetX, offsetY: g.offsetY }];
    })) as GuiTextFont['glyphs'] };
  const input = { font, fontScale: style.fontScale, sampling: style.sampling, shader: style.shader, color, text };
  const layout = layoutGuiText({ width: frame.profile.frameSize[0], height: frame.profile.frameSize[1], guiScale: frame.scale,
    ...input, origin: [0, 0] });
  const width = style.widthRounding === 'ceil' ? Math.ceil(layout.logicalWidth) : layout.logicalWidth;
  return { width, command: { kind: 'text' as const, ...input,
    origin: [center - width / 2 + style.paintOffset[0], top + style.paintOffset[1]] as const } };
}
function clip(frame: Frame, rect: GuiImageRect): GuiImageRect {
  const [width, height] = frame.profile.frameSize;
  const left = Math.max(0, Math.min(width, Math.floor(rect[0] * frame.scale)));
  const top = Math.max(0, Math.min(height, Math.floor(rect[1] * frame.scale)));
  const right = Math.max(left, Math.min(width, Math.ceil((rect[0] + rect[2]) * frame.scale)));
  const bottom = Math.max(top, Math.min(height, Math.ceil((rect[1] + rect[3]) * frame.scale)));
  return [left, top, right - left, bottom - top];
}
function windowFor(frame: Frame, rectangles: readonly GuiImageRect[]): GuiImageRect {
  const left = Math.min(frame.profile.frameSize[0] - 1, ...rectangles.map(r => r[0]));
  const top = Math.min(frame.profile.frameSize[1] - 1, ...rectangles.map(r => r[1]));
  const right = Math.max(left + 1, ...rectangles.map(r => r[0] + r[2]));
  const bottom = Math.max(top + 1, ...rectangles.map(r => r[1] + r[3]));
  return [left, top, right - left, bottom - top];
}
function image(asset: BookAsset, texture: string, rect: GuiImageRect, scissor: GuiImageRect): GuiLayerCommand {
  return { kind: 'image', texture, rect, physicalPrecision: 'float32', scissor,
    nineSlice: asset.metadata ? { insets: asset.metadata.nineslice_size, baseSize: asset.metadata.base_size } : undefined };
}
function skinCommands(frame: Frame, geometry: BookLabelGeometry, skin: BookSkinSources, scissor: GuiImageRect) {
  const [x, y] = frame.profile.origin, { width: w, height: h, pageWidth: pw, pageHeight: ph } = geometry;
  const leaf = x + (w - pw * 2) / 2;
  return [image(bookAssets.book_back, skin.background, [x, y, w, h], scissor),
    image(bookAssets.book_spine, skin.spine, [x + w / 2 - 4, y + 1, 8, h - 2], scissor),
    image(bookAssets.book_pageedge_left, skin.edgeLeft, [leaf + 7, y + 7, pw - 7, ph - 16], scissor),
    image(bookAssets.book_pageedge_right, skin.edgeRight, [leaf + pw, y + 7, pw - 7, ph - 16], scissor),
    image(bookAssets.book_pagecrease_left, skin.creaseLeft, [leaf + 40, y + 5, pw - 40, ph - 14], scissor),
    image(bookAssets.book_pagecrease_right, skin.creaseRight, [leaf + pw, y + 5, pw - 40, ph - 14], scissor)];
}
interface Prepared { commands: readonly GuiLayerCommand[]; outputRect: GuiImageRect }
function Painter({ frame, prepared, className, onError, paintOrigin = frame.profile.origin }: {
  frame: Frame; prepared: readonly Prepared[]; className: string; onError?: (error: Error) => void; paintOrigin?: readonly [number, number];
}) {
  const [ready, setReady] = useState(0), all = (1 << prepared.length) - 1;
  return <span aria-hidden="true" className={className} data-book-label-ready={ready === all || undefined}>
    {prepared.map((p, index) => <span key={index} className={`mc-book__label-paint mc-book__label-paint--${index}`}>
      <GuiLayer width={frame.profile.frameSize[0]} height={frame.profile.frameSize[1]} guiScale={frame.scale}
        commands={p.commands} outputRect={p.outputRect} rasterOrigin="top-left" renderKey={frame.profile.renderKey}
        onRenderStateChange={state => setReady(mask => state === 'ready' ? mask | 1 << index : mask & ~(1 << index))} onRenderError={onError}
        style={{ position: 'absolute', left: p.outputRect[0] - paintOrigin[0] * frame.scale,
          top: p.outputRect[1] - paintOrigin[1] * frame.scale, pointerEvents: 'none' }}/>
    </span>)}
  </span>;
}
function Failure({ error, onError }: { error: Error; onError?: (error: Error) => void }) {
  const current = useRef({ error, onError }), reported = useRef(false);
  useClassicLayoutEffect(() => { current.current = { error, onError }; });
  useEffect(() => { if (!reported.current) { reported.current = true; current.current.onError?.(current.current.error); } }, []);
  return null;
}
const failure = (reason: unknown) => reason instanceof Error ? reason : new Error(String(reason));

export function BookCounterLayer({ frame, geometry, skin, labels, onError }: {
  frame: Frame; geometry: BookLabelGeometry; skin: BookSkinSources; labels: readonly (string | undefined)[]; onError?: (error: Error) => void;
}) {
  let prepared: Prepared;
  try {
    const style = frame.profile.pageNumber!, backgrounds: GuiLayerCommand[] = [], ink: GuiLayerCommand[] = [], rectangles: GuiImageRect[] = [];
    labels.forEach((text, side) => {
      if (text === undefined) return;
      const x = frame.profile.origin[0] + (geometry.width - geometry.pageWidth * 2) / 2 + side * geometry.pageWidth + (side === 0 ? 5 : -5);
      const y = frame.profile.origin[1] + 13, scissor = clip(frame, [x, y, geometry.pageWidth, 10]);
      rectangles.push(scissor); backgrounds.push(...skinCommands(frame, geometry, skin, scissor));
      // This opt-in painter uses the same explicit source-control clip for ink
      // and its reconstructed backdrop. A sibling label is not an overflow box.
      ink.push({ ...textCommand(frame, style, text, x + geometry.pageWidth / 2, y, style.color ?? COUNTER).command, scissor });
    });
    if (!rectangles.length) return null;
    const commands = [...backgrounds, ...ink];
    prepared = { commands, outputRect: windowFor(frame, rectangles) };
    layoutGuiImages({ width: frame.profile.frameSize[0], height: frame.profile.frameSize[1], guiScale: frame.scale,
      outputRect: prepared.outputRect, images: commands.filter(c => c.kind === 'image') });
  } catch (error) { const e = failure(error); return <Failure key={e.message} error={e} onError={onError}/>; }
  const key = JSON.stringify([frame.profile.frameSize, frame.profile.renderKey, frame.scale, prepared]);
  return <Painter key={key} frame={frame} prepared={[prepared]} className="mc-book__counter-painter" onError={onError}/>;
}

export function measureBookFooter(frame: Frame, text: string): number | undefined {
  try { return Math.max(102, textCommand(frame, frame.profile.footer!, text, 0, 0, FOOTER).width + 10); }
  catch { return undefined; }
}
interface FooterProps extends Omit<ButtonProps, 'children'> {
  text: string;
  frame?: Frame;
  control?: GuiImageRect;
  footerOrigin: readonly [number, number];
  onPaintError?: (error: Error) => void;
}
export function BookFooterButton({ text, frame, control, footerOrigin, onPaintError, style, ...props }: FooterProps) {
  let prepared: Prepared[] | undefined, error: Error | undefined;
  if (frame && !control && !props.disabled) try {
    textCommand(frame, frame.profile.footer!, text, 0, 0, FOOTER);
    throw new RangeError('Book source footer layout is unavailable.');
  } catch (reason) { error = failure(reason); }
  if (frame && control && !props.disabled) try {
    const ink = frame.profile.footer!, [x, y, width, height] = control;
    const imageRect: GuiImageRect = [x + 1, y + 1, width - 2, height - 2], outputRect = clip(frame, imageRect);
    if (!outputRect[2] || !outputRect[3]) throw new RangeError('Book footer image is outside its declared frame.');
    prepared = buttonTextures.map((_name, index) => ({ outputRect, commands: [
      { kind: 'image', texture: buttonSources[index]!, rect: imageRect, physicalPrecision: 'float32', nineSlice: { insets: 1, baseSize: [4, 4] } },
      textCommand(frame, ink, text, x + width / 2, y + (height - 10) / 2 + (index >= 2 ? 1 : 0), index === 1 || index === 2 ? WHITE : ink.color ?? FOOTER).command,
    ] }));
  } catch (reason) { error = failure(reason); }
  const key = JSON.stringify([frame?.profile.frameSize, frame?.profile.renderKey, frame?.scale, footerOrigin, prepared]);
  const sourceStyle: CSSProperties | undefined = frame && control ? { width: control[2] * frame.scale } : undefined;
  return <><Button {...props} style={{ ...sourceStyle, ...style }}>{text}</Button>
    {prepared && frame && <Painter key={key} frame={frame} prepared={prepared} paintOrigin={footerOrigin}
      className="mc-book__footer-painter" onError={onPaintError}/>}
    {error && <Failure key={error.message} error={error} onError={onPaintError}/>}
  </>;
}
