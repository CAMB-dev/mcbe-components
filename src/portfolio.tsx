import { forwardRef, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode, Ref, SyntheticEvent, TextareaHTMLAttributes } from 'react';
import { Image } from './image';
import { deferPortfolioEvent } from './portfolio-event';
import { ImmersiveReaderButton } from './immersive-reader';
import { classicModalTab, deferClassicEvent, useClassicModal, useClassicNodeRef } from './classic-screen-lifecycle';
import { portfolioAssets } from './portfolio-assets';
import { PortfolioSkin } from './portfolio-skin';
import { PortfolioCaptionField, PortfolioPageTurnButton, PortfolioPhoto } from './portfolio-parts';
import type { PortfolioCaptionChangeDetail, PortfolioImageSource, PortfolioStateImages } from './portfolio-parts';
import { PortfolioPicker } from './portfolio-picker';
import type { PortfolioPickerProps } from './portfolio-picker';

export type PortfolioSide = 'left' | 'right';
export interface PortfolioLeaf {
  readonly id: string;
  readonly image?: PortfolioImageSource;
  readonly imageContent?: ReactNode;
  readonly caption: string;
  readonly captionEnabled: boolean;
  readonly captionColor: string;
  /** Collection #photo_visibility, independent of left/right action visibility. */
  readonly visible: boolean;
}
export interface PortfolioBindings {
  readonly viewing: boolean;
  readonly picking: boolean;
  readonly previousVisible: boolean;
  readonly nextVisible: boolean;
  readonly leftPhotoVisible: boolean;
  readonly rightPhotoVisible: boolean;
  readonly exportVisible: boolean;
  readonly noPhotosAlertVisible: boolean;
}
/** Nominal is one explicit Web resolution of the source's default320×207
 * book inside320×231 content. It is not the native %cm/%sm evaluator. */
export type PortfolioLayoutResolution = {
  readonly kind: 'nominal'; readonly readerButtonSize: readonly [number, number];
} | {
  readonly kind: 'resolved';
  readonly contentSize: readonly [number, number]; readonly bookSize: readonly [number, number];
  readonly pageSize: readonly [number, number]; readonly bookOffset: readonly [number, number];
  readonly footerSize: readonly [number, number]; readonly pickerSize: readonly [number, number];
  readonly readerButtonSize: readonly [number, number];
};
export type PortfolioAction = 'previous' | 'next' | 'delete-left' | 'delete-right' | 'convert-left' | 'convert-right'
  | 'add' | 'export' | 'close' | 'escape' | 'reader' | 'pick';
export type PortfolioActionTarget = 'button.portfolio_page_prev' | 'button.portfolio_page_next'
  | 'button.portfolio_delete_photo_left' | 'button.portfolio_delete_photo_right'
  | 'button.portfolio_convert_left' | 'button.portfolio_convert_right' | 'button.portfolio_add_photo'
  | 'button.portfolio_export' | 'button.close_button' | 'button.menu_exit' | 'button.immersive_reader' | 'button.picked';
export interface PortfolioActionDetail {
  readonly action: PortfolioAction;
  readonly target: PortfolioActionTarget;
  readonly event: SyntheticEvent<HTMLElement>;
  readonly control: HTMLElement;
  readonly bindings: Readonly<PortfolioBindings>;
  readonly side?: PortfolioSide;
  readonly leaf?: Readonly<PortfolioLeaf> | null;
  /** Web collection context from the standalone picker, not an engine provider. */
  readonly pickerDetail?: Parameters<NonNullable<PortfolioPickerProps['onAction']>>[0];
}
export interface PortfolioLeafCaptionDetail extends PortfolioCaptionChangeDetail {
  readonly side: PortfolioSide;
  readonly leaf: Readonly<PortfolioLeaf>;
  readonly bindings: Readonly<PortfolioBindings>;
  readonly binding: '#text_box_item_name';
}
export interface PortfolioLabels {
  readonly title: string; readonly previous: string; readonly next: string; readonly close: string;
  readonly deleteLeft: string; readonly deleteRight: string; readonly convertLeft: string; readonly convertRight: string;
  readonly add: string; readonly export: string; readonly reader: string;
  readonly captionLeft: string; readonly captionRight: string; readonly captionPlaceholder: string; readonly noPhotos: string;
}
type NativeButton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'type'>;
type NativeCaption = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'dangerouslySetInnerHTML' | 'value' | 'defaultValue' | 'maxLength' | 'placeholder'>;
export interface PortfolioProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML'> {
  size: readonly [number, number];
  layout: PortfolioLayoutResolution;
  scale?: number;
  bindings: PortfolioBindings;
  leaves: readonly [PortfolioLeaf | null, PortfolioLeaf | null];
  /** Explicit binding text; neither numbers nor alerts are inferred from leaves. */
  pageLabels: readonly [string, string];
  labels: PortfolioLabels;
  frameMaterial: PortfolioImageSource;
  pageMaterials: Readonly<{ previous: PortfolioStateImages; next: PortfolioStateImages }>;
  convertMaterials: PortfolioStateImages;
  /** Picker has its own required structured collection and independent alert. */
  picker: Omit<PortfolioPickerProps, 'onAction' | 'scale' | 'size' | 'hidden' | 'disabled' | 'readOnly'>;
  disabled?: boolean;
  readOnly?: boolean;
  modal?: boolean;
  captionRefs?: Readonly<Partial<Record<PortfolioSide, Ref<HTMLTextAreaElement>>>>;
  captionProps?: Readonly<Partial<Record<PortfolioSide, NativeCaption>>>;
  buttonProps?: Readonly<Partial<Record<Exclude<PortfolioAction, 'pick' | 'escape'>, NativeButton>>>;
  onAction?: (detail: PortfolioActionDetail) => void;
  onCaptionChange?: (side: PortfolioSide, value: string, detail: PortfolioLeafCaptionDetail) => void;
}

const targets: Readonly<Record<Exclude<PortfolioAction, 'pick'>, PortfolioActionTarget>> = {
  previous: 'button.portfolio_page_prev', next: 'button.portfolio_page_next',
  'delete-left': 'button.portfolio_delete_photo_left', 'delete-right': 'button.portfolio_delete_photo_right',
  'convert-left': 'button.portfolio_convert_left', 'convert-right': 'button.portfolio_convert_right',
  add: 'button.portfolio_add_photo', export: 'button.portfolio_export', close: 'button.close_button',
  escape: 'button.menu_exit', reader: 'button.immersive_reader',
};
const mutations = new Set<PortfolioAction>(['delete-left', 'delete-right', 'convert-left', 'convert-right', 'add', 'pick', 'reader']);
function pair(value: readonly number[], name: string, offset = false) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(n => Number.isFinite(n) && (offset || n > 0)))
    throw new RangeError(`${name} must contain two ${offset ? '' : 'positive '}finite numbers.`);
}
function text(value: unknown, name: string, nonempty = false): asserts value is string {
  if (typeof value !== 'string' || nonempty && !value.trim()) throw new TypeError(`${name} must be a${nonempty ? ' nonempty' : ''} string.`);
}
function bindingsCopy(value: PortfolioBindings) {
  if (!value) throw new TypeError('Portfolio requires independent source bindings.');
  const keys = ['viewing', 'picking', 'previousVisible', 'nextVisible', 'leftPhotoVisible', 'rightPhotoVisible', 'exportVisible', 'noPhotosAlertVisible'] as const;
  const result = {} as Record<typeof keys[number], boolean>;
  for (const key of keys) { if (typeof value[key] !== 'boolean') throw new TypeError(`Portfolio binding ${key} must be boolean.`); result[key] = value[key]; }
  return Object.freeze(result);
}
function copyLeaf(leaf: PortfolioLeaf | null): Readonly<PortfolioLeaf> | null {
  if (!leaf) return null;
  return Object.freeze({ ...leaf, image: leaf.image && Object.freeze({ ...leaf.image,
    sourceSize: Object.freeze([...leaf.image.sourceSize]) as readonly [number, number], nativeProps: leaf.image.nativeProps && { ...leaf.image.nativeProps } }) });
}
function sourceImage(value: PortfolioImageSource, name: string) {
  if (!value) throw new TypeError(`${name} requires a complete host material.`);
  text(value.src, `${name}.src`, true); pair(value.sourceSize, `${name}.sourceSize`);
  if (!value.sourceSize.every(Number.isSafeInteger)) throw new RangeError(`${name} physical dimensions must be integers.`);
}
function stateImages(value: PortfolioStateImages, name: string) {
  for (const state of ['normal', 'hover', 'pressed'] as const) sourceImage(value?.[state], `${name}.${state}`);
}
function own<T,>(record: Readonly<Partial<Record<string, T>>> | undefined, key: string): T | undefined {
  return record && Object.hasOwn(record, key) ? record[key] : undefined;
}
function blockedControl(control: HTMLElement) { return !control.isConnected || !!control.closest('[hidden],[inert]') || control.matches(':disabled'); }

/** Source Portfolio composition. All mutations, navigation and services are
 * requests. Caller state owns the two independent viewing/picking branches. */
export const Portfolio = forwardRef<HTMLElement, PortfolioProps>(function Portfolio({
  size, layout, scale = 2, bindings, leaves, pageLabels, labels, frameMaterial, pageMaterials, convertMaterials, picker,
  disabled = false, readOnly = false, modal = false, hidden = false, captionRefs, captionProps, buttonProps,
  onAction, onCaptionChange, onClick, onKeyDown, onCompositionStart, onCompositionEnd, className = '', style, ...native
}, forwardedRef) {
  pair(size, 'Portfolio size');
  if (!Number.isSafeInteger(scale) || scale < 1 || !size.every(n => Number.isFinite(n * scale))) throw new RangeError('Portfolio scale and physical frame must be finite.');
  for (const [key, value] of Object.entries({ disabled, readOnly, modal, hidden })) if (typeof value !== 'boolean') throw new TypeError(`${key} must be boolean.`);
  const state = bindingsCopy(bindings);
  if (!Array.isArray(leaves) || leaves.length !== 2 || !Array.isArray(pageLabels) || pageLabels.length !== 2) throw new TypeError('Portfolio requires two explicit leaves and labels.');
  for (const [index, leaf] of leaves.entries()) if (leaf !== null) {
    if (!leaf) throw new TypeError('A missing Portfolio leaf must be null.');
    text(leaf.id, `leaves[${index}].id`, true); text(leaf.caption, 'caption'); text(leaf.captionColor, 'captionColor', true);
    if (typeof leaf.visible !== 'boolean' || typeof leaf.captionEnabled !== 'boolean') throw new TypeError('Leaf visibility and caption enabled flags must be boolean.');
    if (leaf.image) sourceImage(leaf.image, 'leaf image');
  }
  if (leaves[0] && leaves[1] && leaves[0].id === leaves[1].id) throw new TypeError('Portfolio leaf IDs must be unique.');
  pageLabels.forEach(value => text(value, 'page label'));
  for (const name of ['title', 'previous', 'next', 'close', 'deleteLeft', 'deleteRight', 'convertLeft', 'convertRight', 'add', 'export', 'reader', 'captionLeft', 'captionRight', 'captionPlaceholder', 'noPhotos'] as const) text(labels?.[name], `labels.${name}`, !['noPhotos', 'captionPlaceholder'].includes(name));
  sourceImage(frameMaterial, 'frameMaterial'); stateImages(pageMaterials?.previous, 'pageMaterials.previous'); stateImages(pageMaterials?.next, 'pageMaterials.next'); stateImages(convertMaterials, 'convertMaterials');
  if (!layout || layout.kind !== 'nominal' && layout.kind !== 'resolved') throw new TypeError('Portfolio requires an explicit layout resolution.');
  const geometry = layout.kind === 'nominal'
    ? { contentSize: [320, 231] as const, bookSize: [320, 207] as const, pageSize: [160, 207] as const, bookOffset: [0, -10] as const, footerSize: [320, 207] as const, pickerSize: [225, 231] as const, readerButtonSize: layout.readerButtonSize }
    : layout;
  for (const name of ['contentSize', 'bookSize', 'pageSize', 'footerSize', 'pickerSize', 'readerButtonSize'] as const) pair(geometry[name], name);
  pair(geometry.bookOffset, 'bookOffset', true);
  const [bookWidth, bookHeight] = geometry.bookSize, [pageWidth, pageHeight] = geometry.pageSize;
  if (bookWidth < 42 || bookHeight < 42 || pageWidth > bookWidth / 2 || pageHeight > bookHeight || pageWidth * .75 * .85 <= 6 || pageHeight < 22)
    throw new RangeError('Resolved Portfolio layout must contain two pages, frame borders and caption clipper.');
  if (![...Object.values(geometry).filter(Array.isArray).flat()].every(n => typeof n === 'number' && Number.isFinite(n * scale))) throw new RangeError('Portfolio layout physical dimensions must be finite.');
  const [root, attach] = useClassicNodeRef(forwardedRef), [content, contentAttach] = useClassicNodeRef<HTMLDivElement>();
  const composing = useRef(false), accepted = useRef({ state, disabled, readOnly, hidden, modal, ids: leaves.map(leaf => leaf?.id ?? null) });
  accepted.current = { state, disabled, readOnly, hidden, modal, ids: leaves.map(leaf => leaf?.id ?? null) };
  const modalActive = modal && !hidden && (state.viewing || state.picking);
  useClassicModal(root, content, modalActive);
  const snapshots = [copyLeaf(leaves[0]), copyLeaf(leaves[1])] as const;
  const visible = (action: PortfolioAction) => {
    const live = accepted.current, b = live.state;
    if (live.hidden || live.disabled || live.readOnly && mutations.has(action)) return false;
    if (action === 'pick') return b.picking;
    if (action === 'escape') return b.viewing || b.picking;
    if (!b.viewing) return false;
    if (action === 'previous') return b.previousVisible;
    if (action === 'next') return b.nextVisible;
    if (action === 'export' || action === 'reader') return b.exportVisible;
    if (action.endsWith('-left')) return b.leftPhotoVisible;
    if (action.endsWith('-right')) return b.rightPhotoVisible;
    return true;
  };
  const request = (action: Exclude<PortfolioAction, 'pick'>, event: SyntheticEvent<HTMLElement>, side?: PortfolioSide) => {
    if (event.defaultPrevented || event.nativeEvent.defaultPrevented || !visible(action)) return;
    const control = event.currentTarget, index = side === 'right' ? 1 : 0, leaf = side ? snapshots[index] : undefined;
    deferPortfolioEvent(event, control, snapshot => onAction?.({ action, target: targets[action], event: snapshot, control, bindings: state, side, leaf }),
      () => !!root.current?.contains(control) && visible(action) && !blockedControl(control) && (!side || accepted.current.ids[index] === (leaf?.id ?? null)));
  };
  const imageButton = (action: 'delete-left' | 'delete-right' | 'convert-left' | 'convert-right' | 'close', label: string, shown: boolean, side?: PortfolioSide) => {
    const props = own(buttonProps, action) ?? {}, convert = action.startsWith('convert'), isClose = action === 'close';
    const images: PortfolioStateImages = convert ? convertMaterials : Object.fromEntries((['normal', 'hover', 'pressed'] as const).map((state, index) => {
      const name = isClose ? (['close_button_default', 'close_button_hover', 'close_button_pressed'] as const)[index]! : (['book_trash_default', 'trash_hover', 'trash_pressed'] as const)[index]!;
      const asset = portfolioAssets[name]; return [state, { src: asset.url, sourceSize: [asset.width, asset.height] }];
    })) as unknown as PortfolioStateImages;
    return <button {...props} type="button" className={`mc-portfolio__image-button mc-portfolio__${action} ${props.className ?? ''}`} data-portfolio-action={action}
      hidden={!shown || props.hidden} disabled={disabled || (readOnly && mutations.has(action)) || props.disabled} tabIndex={isClose ? props.tabIndex ?? -1 : props.tabIndex}
      aria-label={props['aria-label'] ?? label} onClick={event => { props.onClick?.(event); request(action, event, side); }}>
      {(['normal', 'hover', 'pressed'] as const).map(state => <span key={state} className={`mc-portfolio__image-state mc-portfolio__image-state--${state}`} aria-hidden="true"><Image {...images[state].nativeProps} src={images[state].src} sourceSize={images[state].sourceSize} alt="" /></span>)}
    </button>;
  };
  const textButton = (action: 'add' | 'export', label: string, shown: boolean) => {
    const props = own(buttonProps, action) ?? {};
    return <button {...props} type="button" className={`mc-portfolio__text-button mc-portfolio__${action} ${props.className ?? ''}`} data-portfolio-action={action}
      hidden={!shown || props.hidden} disabled={disabled || (readOnly && mutations.has(action)) || props.disabled}
      onClick={event => { props.onClick?.(event); request(action, event); }}><span className="mc-portfolio__text-skin" aria-hidden="true" /><span className="mc-portfolio__text-border" aria-hidden="true" /><span className="mc-portfolio__text-content"><span className="mc-portfolio__text-label">{label}</span></span></button>;
  };
  const unit = (n: number) => n * scale;
  const rootStyle = { '--mc-portfolio-unit': `${scale}px`, width: unit(size[0]), height: unit(size[1]),
    '--mc-portfolio-light': `url(${JSON.stringify(portfolioAssets.button_borderless_light.url)})`,
    '--mc-portfolio-light-hover': `url(${JSON.stringify(portfolioAssets.button_borderless_lighthover.url)})`,
    '--mc-portfolio-light-pressed': `url(${JSON.stringify(portfolioAssets.button_borderless_lightpressed.url)})`,
    '--mc-portfolio-focus': `url(${JSON.stringify(portfolioAssets.focus_border_white.url)})`,
    '--mc-portfolio-disabled': `url(${JSON.stringify(portfolioAssets.disabledButtonNoBorder.url)})`, ...style } as CSSProperties;
  return <section {...native} ref={attach} hidden={hidden} className={`mc-portfolio ${className}`} aria-label={native['aria-label'] ?? labels.title} tabIndex={native.tabIndex ?? -1}
    style={rootStyle} data-viewing={state.viewing} data-picking={state.picking} data-layout-resolution={layout.kind}
    onClick={onClick} onCompositionStart={event => { onCompositionStart?.(event); composing.current = true; }} onCompositionEnd={event => { onCompositionEnd?.(event); composing.current = false; }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Tab' && modal) { deferClassicEvent(event, event.currentTarget, snapshot => classicModalTab(snapshot, root.current, content.current), () => accepted.current.modal && !accepted.current.hidden); return; }
      // Explicit single Web route; source close-button/global menu_cancel priority is unknown.
      if (event.key === 'Escape' && !event.shiftKey) request('escape', event);
    }}>
    <div ref={contentAttach} className="mc-portfolio__content" style={{ width: unit(geometry.contentSize[0]), height: unit(geometry.contentSize[1]) }} role={modalActive ? 'dialog' : undefined} aria-modal={modalActive || undefined} aria-label={labels.title} tabIndex={-1}>
      <div className="mc-portfolio__viewing" hidden={!state.viewing}>
        <div className="mc-portfolio__book" style={{ width: unit(bookWidth), height: unit(bookHeight), marginLeft: unit(geometry.bookOffset[0]), marginTop: unit(geometry.bookOffset[1]) }}>
          <PortfolioSkin asset={portfolioAssets.book_frame} width={bookWidth} height={bookHeight} scale={scale} className="mc-portfolio__book-frame" />
          <div className="mc-portfolio__binding" style={{ width: unit(bookWidth * .015), height: unit(bookHeight - 7) }}><PortfolioSkin asset={portfolioAssets.book_binding} width={bookWidth * .015} height={bookHeight - 7} scale={scale} /></div>
          <div className="mc-portfolio__spine mc-portfolio__spine--top"><PortfolioSkin asset={portfolioAssets.book_spine} width={7} height={6} scale={scale} /></div>
          <div className="mc-portfolio__spine mc-portfolio__spine--bottom"><PortfolioSkin asset={portfolioAssets.book_spine} width={7} height={7} scale={scale} /></div>
          {imageButton('close', labels.close, state.viewing)}
          <div className="mc-portfolio__pages">{(['left', 'right'] as const).map((side, index) => {
            const leaf = leaves[index]!, original = snapshots[index]!, photoSize = pageWidth * .75, props = own(captionProps, side) ?? {};
            return <div key={side} className={`mc-portfolio__page mc-portfolio__page--${side}`} style={{ width: unit(pageWidth), height: unit(pageHeight) }}>
              {leaf && <PortfolioPhoto key={leaf.id} hidden={!leaf.visible} className="mc-portfolio__photo" frameMaterial={frameMaterial} image={leaf.image} imageContent={leaf.imageContent} size={[photoSize, photoSize]} scale={scale}
                caption={<PortfolioCaptionField {...props} ref={own(captionRefs, side)} size={[photoSize * .85, 22]} scale={scale}
                  label={side === 'left' ? labels.captionLeft : labels.captionRight} placeholder={labels.captionPlaceholder} value={leaf.caption} textColor={leaf.captionColor}
                  disabled={disabled || !leaf.captionEnabled || props.disabled} readOnly={readOnly || props.readOnly}
                  onValueChange={(value, detail) => { const live = accepted.current; if (root.current?.contains(detail.input) && !live.hidden && !live.disabled && !live.readOnly && live.state.viewing && live.ids[index] === leaf.id && leaf.visible && leaf.captionEnabled)
                    onCaptionChange?.(side, value, { ...detail, side, leaf: original!, bindings: state, binding: '#text_box_item_name' }); }} />} />}
            </div>;
          })}</div>
          {(['left', 'right'] as const).map((side, index) => <span key={side} className={`mc-portfolio__number mc-portfolio__number--${side}`}>{pageLabels[index]}</span>)}
          {imageButton('delete-left', labels.deleteLeft, state.leftPhotoVisible, 'left')}{imageButton('delete-right', labels.deleteRight, state.rightPhotoVisible, 'right')}
          {imageButton('convert-left', labels.convertLeft, state.leftPhotoVisible, 'left')}{imageButton('convert-right', labels.convertRight, state.rightPhotoVisible, 'right')}
          {(['previous', 'next'] as const).map(direction => {
            const props = own(buttonProps, direction) ?? {};
            return <PortfolioPageTurnButton {...props} key={direction} direction={direction} label={labels[direction]} materials={pageMaterials[direction]} scale={scale}
              className={`mc-portfolio__turn mc-portfolio__turn--${direction} ${props.className ?? ''}`} data-portfolio-action={direction}
              hidden={!(direction === 'previous' ? state.previousVisible : state.nextVisible) || props.hidden} disabled={disabled || props.disabled} readOnly={readOnly}
              onTurn={detail => { if (root.current?.contains(detail.control) && visible(direction) && !blockedControl(detail.control)) onAction?.({ ...detail, action: direction, bindings: state }); }} />;
          })}
          <span className="mc-portfolio__empty" hidden={!state.noPhotosAlertVisible}>{labels.noPhotos}</span>
        </div>
        <div className="mc-portfolio__footer" style={{ width: unit(geometry.footerSize[0]), height: unit(geometry.footerSize[1]) }}>
          {textButton('add', labels.add, state.viewing)}{textButton('export', labels.export, state.exportVisible)}
          <ImmersiveReaderButton {...own(buttonProps, 'reader')} label={labels.reader} size={geometry.readerButtonSize} scale={scale}
            className={`mc-portfolio__reader ${own(buttonProps, 'reader')?.className ?? ''}`} data-portfolio-action="reader" hidden={!state.exportVisible || own(buttonProps, 'reader')?.hidden}
            disabled={disabled || own(buttonProps, 'reader')?.disabled} readOnly={readOnly}
            onActivate={detail => request('reader', detail.event)} />
        </div>
      </div>
      <PortfolioPicker {...picker} className={`mc-portfolio__picker ${picker.className ?? ''}`} size={geometry.pickerSize} scale={scale} hidden={!state.picking} disabled={disabled} readOnly={readOnly}
        onAction={detail => { if (root.current?.contains(detail.control) && !accepted.current.hidden && !accepted.current.disabled && accepted.current.state.picking && (detail.action !== 'pick' || !accepted.current.readOnly))
          onAction?.({ action: detail.action === 'pick' ? 'pick' : 'close', target: detail.target, event: detail.event, control: detail.control, bindings: state, pickerDetail: detail }); }} />
    </div>
  </section>;
});
