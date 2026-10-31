import { forwardRef, useRef, useState } from 'react';
import type {
  ButtonHTMLAttributes, ChangeEvent, CSSProperties, HTMLAttributes, ImgHTMLAttributes,
  MouseEvent, ReactNode, Ref, TextareaHTMLAttributes,
} from 'react';
import { Image } from './image';
import { classicInputFontFamily, resolveClassicInputFont } from './classic-input-font';
import type { ClassicInputFontMode } from './classic-input-font';
import { useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import { deferPortfolioEvent, schedulePortfolioTask } from './portfolio-event';
import { portfolioAssets } from './portfolio-assets';

/** A complete host-resolved image; physical dimensions describe the entire file. */
export interface PortfolioImageSource {
  readonly src: string;
  readonly sourceSize: readonly [number, number];
  readonly alt?: string;
  readonly nativeProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height' | 'children' | 'dangerouslySetInnerHTML'>;
}

/** The fixed source pack lacks Portfolio page and conversion state images. */
export interface PortfolioStateImages {
  readonly normal: PortfolioImageSource;
  readonly hover: PortfolioImageSource;
  readonly pressed: PortfolioImageSource;
}

export interface PortfolioCaptionChangeDetail {
  readonly event: ChangeEvent<HTMLTextAreaElement>;
  readonly input: HTMLTextAreaElement;
}

/** The forwarded ref is the actual textarea, independently of its source frame. */
export interface PortfolioCaptionFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>,
  'children' | 'dangerouslySetInnerHTML' | 'value' | 'defaultValue' | 'placeholder' | 'maxLength' | 'rows' | 'cols' | 'disabled' | 'readOnly'> {
  label: string;
  placeholder: string;
  value: string;
  /** Resolved host #edit_box_text_color; this is not Portfolio body brown. */
  textColor: string;
  /** Logical frame. [102,22] is the declared Web85% of a120-unit photo. */
  size?: readonly [number, number];
  scale?: number;
  disabled?: boolean;
  readOnly?: boolean;
  fontMode?: ClassicInputFontMode;
  containerRef?: Ref<HTMLDivElement>;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  onValueChange?: (value: string, detail: PortfolioCaptionChangeDetail) => void;
}

export interface PortfolioPhotoProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  /** Logical dimensions; [120,120] is a declared own-X Web resolution. */
  size?: readonly [number, number];
  scale?: number;
  image?: PortfolioImageSource;
  /** Opaque host screenshot renderer; takes precedence over image. */
  imageContent?: ReactNode;
  /** Required resolution of the source $screenshot_frame_texture. */
  frameMaterial: PortfolioImageSource;
  caption?: ReactNode;
}

export interface PortfolioPickDetail {
  readonly itemId: string;
  readonly target: 'button.picked';
  readonly event: MouseEvent<HTMLButtonElement>;
  readonly control: HTMLButtonElement;
  /** Copied accepted image descriptor, including a distinct sourceSize pair. */
  readonly image?: Readonly<PortfolioImageSource>;
}

export interface PortfolioPickerItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'dangerouslySetInnerHTML' | 'type' | 'disabled'> {
  /** Collection identity is independent of the native DOM id. */
  itemId: string;
  label: string;
  image?: PortfolioImageSource;
  imageContent?: ReactNode;
  frameMaterial: PortfolioImageSource;
  scale?: number;
  disabled?: boolean;
  readOnly?: boolean;
  containerRef?: Ref<HTMLDivElement>;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  onPick?: (detail: PortfolioPickDetail) => void;
}

export type PortfolioPageDirection = 'previous' | 'next';
export interface PortfolioPageTurnDetail {
  readonly direction: PortfolioPageDirection;
  readonly target: 'button.portfolio_page_prev' | 'button.portfolio_page_next';
  readonly event: MouseEvent<HTMLButtonElement>;
  readonly control: HTMLButtonElement;
}
export interface PortfolioPageTurnButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'dangerouslySetInnerHTML' | 'type' | 'disabled'> {
  direction: PortfolioPageDirection;
  label: string;
  materials: PortfolioStateImages;
  scale?: number;
  disabled?: boolean;
  /** A reading/navigation request remains available in read-only mode. */
  readOnly?: boolean;
  onTurn?: (detail: PortfolioPageTurnDetail) => void;
}

function text(value: unknown, name: string, nonempty = false): asserts value is string {
  if (typeof value !== 'string' || nonempty && !value.trim()) throw new TypeError(`${name} must be ${nonempty ? 'a nonempty string' : 'a string'}.`);
}
function flag(value: unknown, name: string) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be boolean.`);
}
function scaleValue(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('scale must be a positive integer.');
  return value;
}
function sizeValue(value: readonly [number, number], name: string) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(n => Number.isFinite(n) && n > 0)) throw new RangeError(`${name} requires two positive finite dimensions.`);
}
function material(value: PortfolioImageSource | undefined, name: string): asserts value is PortfolioImageSource {
  if (!value) throw new TypeError(`${name} requires a whole host image.`);
  text(value.src, `${name}.src`, true); sizeValue(value.sourceSize, `${name}.sourceSize`);
  if (!value.sourceSize.every(Number.isSafeInteger)) throw new RangeError(`${name}.sourceSize requires physical integer pixels.`);
  if (value.alt !== undefined) text(value.alt, `${name}.alt`);
}
function sizeAt(size: readonly [number, number], scale: number, style?: CSSProperties): CSSProperties {
  if (!size.every(n => Number.isFinite(n * scale))) throw new RangeError('Physical size must be finite.');
  return { '--mc-portfolio-unit': `${scale}px`, width: size[0] * scale, height: size[1] * scale, ...style } as CSSProperties;
}
function available(node: HTMLElement | null, hidden: boolean, disabled: boolean) {
  return !!node?.isConnected && !hidden && !disabled && !node.closest('[hidden],[inert]');
}
function imageCopy(image: PortfolioImageSource | undefined): PortfolioImageSource | undefined {
  return image && { ...image, sourceSize: [...image.sourceSize] as [number, number], nativeProps: image.nativeProps && { ...image.nativeProps } };
}

/** Real images, including host load/error handlers, retain their native node. */
function WholeImage({ source, className = '', decorative = false }: { source: PortfolioImageSource; className?: string; decorative?: boolean }) {
  const [failed, setFailed] = useState(false), node = useRef<HTMLImageElement>(null), request = useRef(source.src);
  const { onLoad, onError, className: nativeClass = '', style, ...native } = source.nativeProps ?? {};
  useClassicLayoutEffect(() => { request.current = source.src; setFailed(false); }, [source.src]);
  return <Image {...native} ref={node} src={source.src} sourceSize={source.sourceSize} alt={decorative ? '' : source.alt ?? ''}
    aria-hidden={decorative ? true : native['aria-hidden']} className={`mc-portfolio-whole-image ${className} ${nativeClass}`}
    data-image-state={failed ? 'error' : 'available'} draggable={false}
    style={{ ...style, width: '100%', height: '100%', visibility: failed ? 'hidden' : undefined }}
    onLoad={event => { if (event.currentTarget === node.current && event.currentTarget.getAttribute('src') === request.current) { setFailed(false); onLoad?.(event); } }}
    onError={event => { if (event.currentTarget === node.current && event.currentTarget.getAttribute('src') === request.current) { setFailed(true); onError?.(event); } }} />;
}

/** Controlled native editing, not a recovered Bedrock Unicode/filter/IME engine. */
export const PortfolioCaptionField = forwardRef<HTMLTextAreaElement, PortfolioCaptionFieldProps>(function PortfolioCaptionField({
  label, placeholder, value, textColor, size = [102, 22], scale = 2, disabled = false, readOnly = false,
  fontMode = 'auto', containerRef, containerClassName = '', containerStyle, onValueChange, onChange,
  onCompositionStart, onCompositionEnd, hidden = false, className = '', style, ...native
}, forwardedRef) {
  const s = scaleValue(scale); sizeValue(size, 'caption size');
  if (size[0] <= 6 || size[1] <= 4) throw new RangeError('Caption size must leave a positive source clipper.');
  text(label, 'label', true); text(placeholder, 'placeholder'); text(value, 'value'); text(textColor, 'textColor', true);
  for (const [name, v] of Object.entries({ disabled, readOnly, hidden })) flag(v, name);
  const [input, attach] = useClassicNodeRef(forwardedRef), [, attachContainer] = useClassicNodeRef(containerRef);
  const [editDraft, setEditDraft] = useState<string | null>(null), [compositionDraft, setCompositionDraft] = useState<string | null>(null);
  const composing = useRef(false), version = useRef(0), live = useRef({ hidden, disabled, readOnly });
  live.current = { hidden, disabled, readOnly };
  useClassicLayoutEffect(() => { if (hidden || disabled || readOnly) { composing.current = false; setCompositionDraft(null); setEditDraft(null); } }, [hidden, disabled, readOnly]);
  const displayed = compositionDraft ?? editDraft ?? value, role = resolveClassicInputFont(fontMode, displayed);
  const frameStyle = sizeAt(size, s, { '--mc-portfolio-caption-color': textColor, '--mc-portfolio-caption-locked': `url(${JSON.stringify(portfolioAssets.edit_box_indent.url)})`, ...containerStyle } as CSSProperties);
  return <div ref={attachContainer} hidden={hidden} className={`mc-portfolio-caption ${containerClassName}`} data-disabled={disabled} data-readonly={readOnly} style={frameStyle}>
    <span className="mc-portfolio-caption__locked" hidden={!disabled} aria-hidden="true" />
    <div className="mc-portfolio-caption__clipper">
      <textarea {...native} ref={attach} hidden={hidden} aria-label={native['aria-label'] ?? label} className={`mc-portfolio-caption__input ${className}`}
        value={displayed} placeholder={placeholder} maxLength={1000} disabled={disabled} readOnly={readOnly}
        autoComplete={native.autoComplete ?? 'off'} spellCheck={native.spellCheck ?? false}
        style={{ fontFamily: classicInputFontFamily(role), ...style }}
        onChange={event => {
          onChange?.(event); const target = event.currentTarget, next = target.value;
          if (composing.current) setCompositionDraft(next);
          if (event.defaultPrevented || event.nativeEvent.defaultPrevented || disabled || readOnly || hidden) return;
          const edit = ++version.current; setEditDraft(next);
          deferPortfolioEvent(event, target, snapshot => onValueChange?.(next, { event: snapshot, input: target }), () => input.current === target && available(target, live.current.hidden, live.current.disabled) && !live.current.readOnly);
          const settle = () => { if (input.current === target && target.isConnected && edit === version.current) setEditDraft(null); };
          schedulePortfolioTask(target, settle);
        }}
        onCompositionStart={event => { onCompositionStart?.(event); if (!disabled && !readOnly && !hidden) { composing.current = true; setCompositionDraft(event.currentTarget.value); } }}
        onCompositionEnd={event => { onCompositionEnd?.(event); composing.current = false; setCompositionDraft(null); }} />
    </div>
  </div>;
});

/** Original screenshot/frame/corners; all host images are whole, never cropped. */
export const PortfolioPhoto = forwardRef<HTMLDivElement, PortfolioPhotoProps>(function PortfolioPhoto({
  size = [120, 120], scale = 2, image, imageContent, frameMaterial, caption, className = '', style, ...native
}, forwardedRef) {
  const s = scaleValue(scale); sizeValue(size, 'photo size'); material(frameMaterial, 'frameMaterial'); if (image) material(image, 'image');
  const [, attach] = useClassicNodeRef(forwardedRef);
  return <div {...native} ref={attach} className={`mc-portfolio-photo ${className}`} style={sizeAt(size, s, style)}>
    <div className="mc-portfolio-photo__image">{imageContent ?? (image && <WholeImage source={image} />)}</div>
    <div className="mc-portfolio-photo__frame" aria-hidden="true"><WholeImage source={frameMaterial} decorative /></div>
    {caption !== undefined && <div className="mc-portfolio-photo__caption">{caption}</div>}
    {(['bl', 'br', 'tl', 'tr'] as const).map(corner => {
      const asset = portfolioAssets[`photo_corner_${corner}`];
      return <div key={corner} className={`mc-portfolio-photo__corner mc-portfolio-photo__corner--${corner}`} aria-hidden="true"><Image src={asset.url} sourceSize={[asset.width, asset.height]} scale={s} alt="" draggable={false} /></div>;
    })}
  </div>;
});

/** Source100-square cell with independently positioned92-square preview/hitbox. */
export const PortfolioPickerItem = forwardRef<HTMLButtonElement, PortfolioPickerItemProps>(function PortfolioPickerItem({
  itemId, label, image, imageContent, frameMaterial, scale = 2, disabled = false, readOnly = false,
  containerRef, containerClassName = '', containerStyle, onPick, onClick, hidden = false, className = '', style, ...native
}, forwardedRef) {
  const s = scaleValue(scale); text(itemId, 'itemId', true); text(label, 'label', true); material(frameMaterial, 'frameMaterial'); if (image) material(image, 'image');
  for (const [name, v] of Object.entries({ disabled, readOnly, hidden })) flag(v, name);
  const [button, attach] = useClassicNodeRef(forwardedRef), [, attachContainer] = useClassicNodeRef(containerRef), live = useRef({ itemId, disabled, readOnly, hidden });
  live.current = { itemId, disabled, readOnly, hidden };
  return <div ref={attachContainer} hidden={hidden} data-portfolio-item-id={itemId} className={`mc-portfolio-picker-item ${containerClassName}`} style={sizeAt([100, 100], s, containerStyle)}>
    <PortfolioPhoto className="mc-portfolio-picker-item__photo" size={[92, 92]} scale={s} image={image} imageContent={imageContent} frameMaterial={frameMaterial} />
    <button {...native} ref={attach} type="button" hidden={hidden} disabled={disabled} aria-disabled={readOnly || undefined}
      aria-label={native['aria-label'] ?? label} className={`mc-portfolio-picker-item__button ${className}`} style={style}
      onClick={event => {
        onClick?.(event); if (disabled || readOnly || hidden || event.defaultPrevented || event.nativeEvent.defaultPrevented) return;
        const control = event.currentTarget, requestedId = itemId, acceptedImage = imageCopy(image);
        deferPortfolioEvent(event, control, snapshot => onPick?.({ itemId: requestedId, target: 'button.picked', event: snapshot, control, image: acceptedImage }), () => button.current === control && live.current.itemId === requestedId && !live.current.readOnly && available(control, live.current.hidden, live.current.disabled));
      }} />
  </div>;
});

/** Navigation requests; required host materials never fall back to Book arrows. */
export const PortfolioPageTurnButton = forwardRef<HTMLButtonElement, PortfolioPageTurnButtonProps>(function PortfolioPageTurnButton({
  direction, label, materials, scale = 2, disabled = false, readOnly = false, onTurn, onClick, hidden = false, className = '', style, ...native
}, forwardedRef) {
  const s = scaleValue(scale); if (direction !== 'previous' && direction !== 'next') throw new TypeError('Unknown Portfolio page direction.'); text(label, 'label', true);
  for (const state of ['normal', 'hover', 'pressed'] as const) material(materials?.[state], `materials.${state}`);
  for (const [name, v] of Object.entries({ disabled, readOnly, hidden })) flag(v, name);
  const [button, attach] = useClassicNodeRef(forwardedRef), live = useRef({ direction, disabled, hidden }); live.current = { direction, disabled, hidden };
  return <button {...native} ref={attach} type="button" hidden={hidden} disabled={disabled} aria-label={native['aria-label'] ?? label}
    className={`mc-portfolio-page-turn ${className}`} data-direction={direction} data-readonly={readOnly} style={sizeAt([24, 24], s, style)}
    onClick={event => {
      onClick?.(event); if (disabled || hidden || event.defaultPrevented || event.nativeEvent.defaultPrevented) return;
      const control = event.currentTarget, requestedDirection = direction;
      deferPortfolioEvent(event, control, snapshot => onTurn?.({ direction: requestedDirection, target: requestedDirection === 'previous' ? 'button.portfolio_page_prev' : 'button.portfolio_page_next', event: snapshot, control }), () => button.current === control && live.current.direction === requestedDirection && available(control, live.current.hidden, live.current.disabled));
    }}>
    {(['normal', 'hover', 'pressed'] as const).map(state => <span key={state} className={`mc-portfolio-page-turn__state mc-portfolio-page-turn__state--${state}`} aria-hidden="true"><WholeImage source={materials[state]} decorative /></span>)}
  </button>;
});
