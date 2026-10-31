import { createContext, forwardRef, useContext, useId, useRef, useState } from 'react';
import type {
  ButtonHTMLAttributes, HTMLAttributes, ImgHTMLAttributes, InputHTMLAttributes,
  ReactNode, Ref, SyntheticEvent,
} from 'react';
import { Button } from './components';
import { Image } from './image';
import { ScrollArea } from './scroll-area';
import { classicInputFontFamily, resolveClassicInputFont } from './classic-input-font';
import { classicModalTab, deferClassicEvent, deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicModal, useClassicNodeRef } from './classic-screen-lifecycle';
import { ugcReaderAssets } from './ugc-reader-assets';

/** Physical whole original image supplied by the host, including its actual dimensions. */
export interface UGCImageSource {
  readonly src: string;
  readonly sourceSize: readonly [number, number];
  readonly alt?: string;
  readonly nativeProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height' | 'children' | 'dangerouslySetInnerHTML'>;
}

/**
 * The original explicitly names textures/ui/White. The fixed public pack does
 * not resolve that exact path. A caller supplies the whole material; this
 * component does not lowercase, synthesize a texel or silently select an alias.
 * The original state border tint is applied independently to this material.
 */
export interface UGCImageFrameMaterial {
  readonly src: string;
  readonly sourceSize: readonly [number, number];
}

export interface UGCItem {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  /** Web visibility retains this keyed node but removes it from layout. */
  readonly hidden?: boolean;
  readonly image?: UGCImageSource;
  /** Host filesystem/ZIP/dynamic texture renderer. Takes precedence over image. */
  readonly imageContent?: ReactNode;
  /**
   * Optional logical resolution of source label height='default'. Omitted uses
   * the live normal-font label's natural Web line box, not a native height claim.
   * A host value exceeding available content is rejected rather than truncated.
   */
  readonly labelHeight?: number;
}

export interface UGCActionDetail {
  readonly action: 'item' | 'close';
  readonly target: 'button.ugc_item' | 'button.menu_exit';
  readonly reason: 'button' | 'escape';
  /** Final owner event; native leaf handlers still receive their native currentTarget first. */
  readonly event: SyntheticEvent<HTMLElement>;
  readonly button?: HTMLButtonElement;
  /** Copied accepted descriptor; opaque renderer nodes and handler functions retain identity. */
  readonly item?: Readonly<UGCItem>;
  /** Viewer collection index is informational, not a recovered engine/backend index. */
  readonly index?: number;
  readonly query?: string;
}
export type UGCActionHandler = (detail: UGCActionDetail) => void;

/**
 * Forwarded ref is the actual source dark-content button. The cell wrapper
 * remains a distinct element because its dimensions are larger than the hitbox.
 */
export interface UGCItemCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'disabled'> {
  item: UGCItem;
  /** Source grid-cell width, before scale; cell H=.5625*W+15. */
  width: number;
  imageFrameMaterial: UGCImageFrameMaterial;
  scale?: number;
  disabled?: boolean;
  readOnly?: boolean;
  containerRef?: Ref<HTMLDivElement>;
  onAction?: UGCActionHandler;
}

export interface UGCQueryChangeDetail {
  readonly event: SyntheticEvent<HTMLElement>;
  readonly input: HTMLInputElement;
}
export type UGCSearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>,
  'children' | 'dangerouslySetInnerHTML' | 'type' | 'size' | 'value' | 'defaultValue' | 'maxLength' | 'disabled' | 'readOnly' | 'placeholder'>;

/** Forwarded ref is the bounded frame. Modal lifecycle is an explicit Web opt-in. */
export interface UGCViewerProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'defaultValue' | 'inputMode'> {
  /** Available logical frame. Default [384,234] gives the source 380x230 capped panel. */
  size?: readonly [number, number];
  scale?: number;
  title: string;
  searchLabel: string;
  searchPlaceholder: string;
  items: readonly UGCItem[];
  imageFrameMaterial: UGCImageFrameMaterial;
  /**
   * Explicit host-resolved render capacity. This bounded Web mapping renders
   * the first N collection entries, without modifying or filtering the input.
   * It does not claim the engine's #maximum_grid_items algorithm was recovered.
   */
  maxGridItems: number;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string, detail: UGCQueryChangeDetail) => void;
  onAction?: UGCActionHandler;
  disabled?: boolean;
  readOnly?: boolean;
  /** Explicit Web modal lifecycle; default false preserves inline embedding. */
  modal?: boolean;
  closeVisible?: boolean;
  closeEnabled?: boolean;
  closeLabel?: string;
  scrollLabel?: string;
  /** Explicit source input branch, never inferred from browser or controller. */
  inputMode?: 'mouse' | 'touch';
  touchThumbVisible?: boolean;
  minThumbSize?: number;
  /** Bounded existing Classic Han font route; not an engine character filter. */
  fontMode?: 'auto' | 'latin' | 'unicode';
  searchRef?: Ref<HTMLInputElement>;
  searchProps?: UGCSearchInputProps;
  scrollViewportRef?: Ref<HTMLDivElement>;
  closeRef?: Ref<HTMLButtonElement>;
  /** Own-property lookup: __proto__/constructor are legal IDs. */
  itemRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
  itemContainerRefs?: Readonly<Record<string, Ref<HTMLDivElement>>>;
}

const url = (src: string) => `url(${JSON.stringify(src)})`;
const images = Object.fromEntries(Object.entries(ugcReaderAssets).map(([key, asset]) => [`--mc-ugc-${key}`, url(asset.url)]));
function scaleValue(scale: number) { if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('scale must be a positive integer'); return scale; }
function sizeValue(size: readonly [number, number], name: string) { if (!Array.isArray(size) || size.length !== 2 || [...size].some(value => !Number.isFinite(value) || value <= 0)) throw new RangeError(`${name} requires two positive finite dimensions`); return size; }
function physicalSize(size: readonly [number, number], name: string) { sizeValue(size, name); if (!size.every(Number.isSafeInteger)) throw new RangeError(`${name} requires physical integer pixels`); }
function text(value: unknown, name: string) { if (typeof value !== 'string') throw new TypeError(`${name} must be a string`); }
function identity(value: string) { text(value, 'id'); if (!value.trim()) throw new TypeError('id must be nonempty'); }
function flag(value: unknown, name: string) { if (typeof value !== 'boolean') throw new TypeError(`${name} must be boolean`); }
function material(value: UGCImageFrameMaterial) { if (!value || typeof value.src !== 'string' || !value.src.trim()) throw new TypeError('imageFrameMaterial must resolve the original whole material'); physicalSize(value.sourceSize, 'imageFrameMaterial sourceSize'); }
function validateItem(item: UGCItem) { identity(item.id); text(item.label, 'item label'); if (item.hidden !== undefined) flag(item.hidden, 'hidden'); if (item.disabled !== undefined) flag(item.disabled, 'disabled'); if (item.labelHeight !== undefined && (!Number.isFinite(item.labelHeight) || item.labelHeight < 0)) throw new RangeError('labelHeight must be nonnegative and finite'); if (item.image) { identity(item.image.src); physicalSize(item.image.sourceSize, 'image sourceSize'); } }
function snapshot(item: UGCItem): UGCItem { return { ...item, image: item.image && { ...item.image, sourceSize: [...item.image.sourceSize] as [number, number], nativeProps: item.image.nativeProps && { ...item.image.nativeProps } } }; }
function sheet(scale: number, style?: React.CSSProperties): React.CSSProperties { return { ...images, '--mc-ugc-unit': `${scale}px`, ...style } as React.CSSProperties; }
type Pending = Omit<UGCActionDetail, 'event'> & { readonly valid?: () => boolean };
const actions = new WeakMap<Event, Pending>();
const Owner = createContext<{ defer: boolean; blocked: boolean; readOnly: boolean }>({ defer: false, blocked: false, readOnly: false });
function dispatchAction(event: SyntheticEvent<HTMLElement>, handler?: UGCActionHandler, active: () => boolean = () => true) {
  const action = actions.get(event.nativeEvent); if (!action) return; actions.delete(event.nativeEvent);
  const owner = event.currentTarget, { valid, ...detail } = action;
  deferClassicRequest(event, owner, snapshotEvent => handler?.({ ...detail, event: snapshotEvent }), () => active() && (valid?.() ?? true));
}

/** Host-resolved, whole images stay real native nodes across URL replacement. */
function Thumbnail({ source }: { source: UGCImageSource }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const node = useRef<HTMLImageElement>(null);
  const request = useRef(source.src); request.current = source.src;
  const { onError, onLoad, style, ...native } = source.nativeProps ?? {};
  return <Image {...native} ref={node} src={source.src} alt={source.alt ?? ''} sourceSize={source.sourceSize} className={`mc-ugc-item-card__image ${native.className ?? ''}`} style={{ ...style, width: '100%', height: '100%', visibility: state === 'error' ? 'hidden' : undefined }} data-image-state={state} onLoad={event => { if (event.currentTarget === node.current && event.currentTarget.getAttribute('src') === request.current) { setState('ready'); onLoad?.(event); } }} onError={event => { if (event.currentTarget === node.current && event.currentTarget.getAttribute('src') === request.current) { setState('error'); onError?.(event); } }} />;
}

/** Source cell and its real dark button remain distinct, reusable DOM nodes. */
export const UGCItemCard = forwardRef<HTMLButtonElement, UGCItemCardProps>(function UGCItemCard({ item, width, imageFrameMaterial, scale = 2, disabled = false, readOnly = false, containerRef, onAction, onClick, className = '', style, hidden, ...native }, forwardedRef) {
  scaleValue(scale); validateItem(item); material(imageFrameMaterial); flag(disabled, 'disabled'); flag(readOnly, 'readOnly');
  if (!Number.isFinite(width) || width <= 10) throw new RangeError('card width must exceed its ten-unit source content insets');
  const height = .5625 * width + 15, contentHeight = height - 10;
  if (item.labelHeight !== undefined && item.labelHeight >= contentHeight) throw new RangeError('labelHeight must leave positive image space');
  const parent = useContext(Owner), blocked = disabled || !!item.disabled || !!item.hidden || !!hidden || parent.blocked;
  const live = useRef({ blocked, readOnly: readOnly || parent.readOnly, id: item.id }); live.current = { blocked, readOnly: readOnly || parent.readOnly, id: item.id };
  const [button, attach] = useClassicNodeRef(forwardedRef), [, attachContainer] = useClassicNodeRef(containerRef), label = useRef<HTMLSpanElement>(null), content = useRef<HTMLSpanElement>(null), [labelHeight, setLabelHeight] = useState(item.labelHeight ?? 0);
  useClassicLayoutEffect(() => {
    const target = label.current; if (!target || item.labelHeight !== undefined || item.hidden || hidden) return;
    const measure = () => setLabelHeight(target.getBoundingClientRect().height / scale);
    measure(); const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure); observer?.observe(target); return () => observer?.disconnect();
  }, [scale, item.labelHeight, item.label, item.hidden, hidden]);
  const frameHeight = Math.max(0, contentHeight - (item.labelHeight ?? labelHeight));
  return <div ref={attachContainer} className="mc-ugc-item-card" data-ugc-item-id={item.id} hidden={!!item.hidden || !!hidden} style={sheet(scale, { width: width * scale, height: height * scale })}>
    <Button {...native} ref={attach} type="button" disabled={blocked} aria-disabled={readOnly || parent.readOnly || undefined} aria-label={native['aria-label'] ?? item.label} className={`mc-ugc-item-card__button ${className}`} style={style} onClick={event => {
      onClick?.(event); const requestedButton = button.current, requestedId = item.id; if (!blocked && !readOnly && !parent.readOnly && !event.defaultPrevented && !event.nativeEvent.defaultPrevented) actions.set(event.nativeEvent, { action: 'item', target: 'button.ugc_item', reason: 'button', button: requestedButton ?? undefined, item: snapshot(item), valid: () => !!requestedButton?.isConnected && button.current === requestedButton && live.current.id === requestedId && !live.current.blocked && !live.current.readOnly }); if (!parent.defer) dispatchAction(event, onAction, () => !live.current.blocked && !live.current.readOnly);
    }}>
      <span className="mc-ugc-item-card__skin" aria-hidden="true" /><span className="mc-ugc-item-card__focus" aria-hidden="true" />
      <span className="mc-ugc-item-card__button-content"><span ref={content} className="mc-ugc-item-card__content">
        <span ref={label} className="mc-ugc-item-card__label" style={item.labelHeight === undefined ? undefined : { height: item.labelHeight * scale }}>{item.label}</span>
        <span className="mc-ugc-item-card__world-panel"><span className="mc-ugc-item-card__image-frame" style={{ width: frameHeight * 1.7778 * scale }}><Image src={imageFrameMaterial.src} alt="" sourceSize={imageFrameMaterial.sourceSize} className="mc-ugc-item-card__frame-material" style={{ width: '100%', height: '100%' }} aria-hidden="true" /><span className="mc-ugc-item-card__image-content">{item.imageContent ?? (item.image && <Thumbnail key={item.image.src} source={item.image} />)}</span></span></span>
      </span></span>
    </Button>
  </div>;
});

/** Finite original shell/search/grid composition; all item and exit operations are host requests. */
export const UGCViewer = forwardRef<HTMLElement, UGCViewerProps>(function UGCViewer({ size = [384, 234], scale = 2, title, searchLabel, searchPlaceholder, items, imageFrameMaterial, maxGridItems, query: given, defaultQuery = '', onQueryChange, onAction, disabled = false, readOnly = false, modal = false, closeVisible = true, closeEnabled = true, closeLabel = 'Close', scrollLabel, inputMode = 'mouse', touchThumbVisible = false, minThumbSize, fontMode = 'auto', searchRef, searchProps = {}, scrollViewportRef, closeRef, itemRefs, itemContainerRefs, onClick, onChange, onKeyDown, className = '', style, hidden = false, tabIndex, ...native }, forwardedRef) {
  scaleValue(scale); sizeValue(size, 'size'); material(imageFrameMaterial); text(title, 'title'); text(searchLabel, 'searchLabel'); text(searchPlaceholder, 'searchPlaceholder'); text(defaultQuery, 'defaultQuery'); identity(searchLabel); identity(closeLabel); if (scrollLabel !== undefined) identity(scrollLabel); if (given !== undefined) text(given, 'query');
  for (const [name, value] of Object.entries({ disabled, readOnly, modal, closeVisible, closeEnabled, touchThumbVisible, hidden })) flag(value, name);
  if (!Number.isSafeInteger(maxGridItems) || maxGridItems < 0) throw new RangeError('maxGridItems must be a nonnegative safe integer');
  if (!Array.isArray(items) || [...items].some(item => !item)) throw new TypeError('items must be a dense array');
  const ids = new Set<string>(); for (const item of items) { validateItem(item); if (ids.has(item.id)) throw new RangeError('item IDs must be unique'); ids.add(item.id); }
  if (!['mouse', 'touch'].includes(inputMode) || minThumbSize !== undefined && (!Number.isFinite(minThumbSize) || minThumbSize <= 0)) throw new TypeError('invalid scroll profile');
  const width = Math.min(size[0] - 4, 380), height = Math.min(size[1] - 4, 230); if (width <= 26 || height <= 55) throw new RangeError('available frame must leave positive source body/search/grid dimensions');
  const [local, setLocal] = useState(defaultQuery), query = given === undefined ? local : given, [compositionDraft, setCompositionDraft] = useState<string | null>(null), composing = useRef(false), [root, attach] = useClassicNodeRef(forwardedRef), [panel, panelAttach] = useClassicNodeRef<HTMLDivElement>(), [, searchAttach] = useClassicNodeRef(searchRef), [close, closeAttach] = useClassicNodeRef(closeRef), titleId = useId(), [grid, gridAttach] = useClassicNodeRef<HTMLDivElement>(), [gridWidth, setGridWidth] = useState((width - 16 - (inputMode === 'mouse' ? 8 : 0) - 2) * scale);
  const accepted = useRef(query); accepted.current = query;
  const [editDraft, setEditDraft] = useState<string | null>(null), editVersion = useRef(0), live = useRef({ active: !hidden && !disabled, readOnly, closeEnabled, closeVisible, hidden, modal, itemIds: new Set<string>() }); live.current = { active: !hidden && !disabled, readOnly, closeEnabled, closeVisible, hidden, modal, itemIds: new Set<string>() };
  useClassicLayoutEffect(() => { if (hidden || disabled) { composing.current = false; setCompositionDraft(null); setEditDraft(null); } }, [hidden, disabled]);
  const displayed = compositionDraft ?? editDraft ?? query, font = resolveClassicInputFont(fontMode, displayed), pending = useRef(new WeakMap<Event, { next: string; input: HTMLInputElement; version: number }>());
  const visibleItems = items.slice(0, maxGridItems), active = !hidden && !disabled;
  live.current.itemIds = new Set(visibleItems.filter(item => !item.hidden && !item.disabled).map(item => item.id));
  useClassicModal(root, panel, modal && !hidden, `${closeVisible}/${visibleItems.map(item => `${item.id}:${!!item.hidden}:${!!item.disabled}`).join('|')}`);
  useClassicLayoutEffect(() => { const target = grid.current; if (!target || hidden) return; const measure = () => { const next = target.getBoundingClientRect().width; if (next > 0) setGridWidth(next); }; measure(); const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure); observer?.observe(target); return () => observer?.disconnect(); }, [grid, hidden, scale, width, inputMode]);
  const deliver = (event: SyntheticEvent<HTMLElement>) => {
    const change = pending.current.get(event.nativeEvent);
    if (change && event.type === 'change') {
      pending.current.delete(event.nativeEvent);
      deferClassicRequest(event, event.currentTarget, snapshotEvent => {
        if (given === undefined) setLocal(change.next);
        onQueryChange?.(change.next, { event: snapshotEvent, input: change.input });
      }, () => live.current.active && !live.current.readOnly);
      // Presentation-only settlement; action dispatch uses the shared bridge above.
      const settle = () => { if (root.current && editVersion.current === change.version) setEditDraft(null); };
      scheduleClassicTask(event.currentTarget, settle);
    }
    const action = actions.get(event.nativeEvent);
    if (action?.action === 'item') actions.set(event.nativeEvent, { ...action, index: visibleItems.findIndex(item => item.id === action.item?.id), query });
    dispatchAction(event, onAction, () => live.current.active && (action?.action === 'close' ? live.current.closeEnabled : !live.current.readOnly && !!action?.item && live.current.itemIds.has(action.item.id)));
  };
  const { onChange: inputChange, onCompositionStart, onCompositionEnd, onInput, className: inputClass = '', style: inputStyle, ...inputProps } = searchProps;
  const requestClose = (event: SyntheticEvent<HTMLElement>, reason: 'button' | 'escape') => { const requestedButton = close.current; if (active && closeEnabled && (reason === 'escape' || closeVisible) && !event.defaultPrevented && !event.nativeEvent.defaultPrevented) actions.set(event.nativeEvent, { action: 'close', target: 'button.menu_exit', reason, button: reason === 'button' ? requestedButton ?? undefined : undefined, query, valid: () => reason === 'escape' || !!requestedButton?.isConnected && close.current === requestedButton && live.current.closeVisible && live.current.closeEnabled }); };
  return <Owner.Provider value={{ defer: true, blocked: !active, readOnly }}><section {...native} ref={attach} hidden={hidden} role={native.role ?? 'region'} aria-label={native['aria-label'] ?? title} className={`mc-ugc-viewer ${className}`} tabIndex={tabIndex ?? -1} style={sheet(scale, { width: size[0] * scale, height: size[1] * scale, ...style })} onClick={event => { onClick?.(event); deliver(event); }} onChange={event => { onChange?.(event); deliver(event); }} onKeyDown={event => {
    onKeyDown?.(event); if (event.defaultPrevented || event.nativeEvent.defaultPrevented || event.nativeEvent.isComposing || composing.current || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (modal && event.key === 'Tab') { deferClassicEvent(event, event.currentTarget, snapshotEvent => classicModalTab(snapshotEvent, root.current, panel.current), () => live.current.modal && !live.current.hidden); return; }
    if (!active) return;
    if (event.key === 'Escape' && !event.shiftKey) { requestClose(event, 'escape'); deliver(event); return; }
    const target = event.target as HTMLElement; if (!grid.current?.contains(target) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || event.shiftKey) return;
    const buttons = Array.from(grid.current.querySelectorAll<HTMLButtonElement>('button')).filter(button => !button.closest('[hidden]')), index = buttons.indexOf(target.closest('button') as HTMLButtonElement); if (index < 0 || !buttons.length) return;
    const delta = event.key === 'ArrowUp' ? -3 : event.key === 'ArrowDown' ? 3 : event.key === 'ArrowLeft' ? -1 : 1;
    let next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : index + delta;
    const step = event.key === 'Home' ? 1 : event.key === 'End' ? -1 : delta;
    while (next >= 0 && next < buttons.length && buttons[next]?.disabled) next += step;
    deferClassicEvent(event, event.currentTarget, snapshotEvent => { const button = buttons[next]; if (button && !button.disabled && !button.closest('[hidden]')) { button.focus({ preventScroll: true }); button.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } snapshotEvent.preventDefault(); }, () => live.current.active);
  }}>
    <div ref={panelAttach} className="mc-ugc-viewer__panel" role={modal ? 'dialog' : undefined} aria-modal={modal ? true : undefined} aria-labelledby={titleId} tabIndex={-1} style={{ width: width * scale, height: height * scale }}><span className="mc-ugc-viewer__underfill" aria-hidden="true" /><span className="mc-ugc-viewer__skin" aria-hidden="true" /><h2 className="mc-ugc-viewer__title" id={titleId}>{title}</h2><button ref={closeAttach} type="button" className="mc-ugc-viewer__close" hidden={!closeVisible} disabled={!active || !closeEnabled} aria-label={closeLabel} onClick={event => requestClose(event, 'button')}><span aria-hidden="true" /></button>
      <div className="mc-ugc-viewer__indent"><div className="mc-ugc-viewer__top-padding" /><div className="mc-ugc-viewer__search-holder"><div className="mc-ugc-viewer__search" data-disabled={disabled}><span className="mc-ugc-viewer__search-skin" aria-hidden="true" /><div className="mc-ugc-viewer__search-centering"><input {...inputProps} ref={searchAttach} aria-label={inputProps['aria-label'] ?? searchLabel} type="text" className={`mc-ugc-viewer__input ${inputClass}`} value={displayed} maxLength={14} disabled={disabled || hidden} readOnly={readOnly} autoComplete={inputProps.autoComplete ?? 'off'} spellCheck={inputProps.spellCheck ?? false} style={{ fontFamily: classicInputFontFamily(font), ...inputStyle }} onInput={onInput} onChange={event => { inputChange?.(event); const input = event.currentTarget; if (composing.current) setCompositionDraft(input.value); if (event.defaultPrevented || event.nativeEvent.defaultPrevented || !active || readOnly) return; setEditDraft(input.value); const version = ++editVersion.current; pending.current.set(event.nativeEvent, { next: input.value, input, version }); }} onCompositionStart={event => { onCompositionStart?.(event); composing.current = true; setCompositionDraft(event.currentTarget.value); }} onCompositionEnd={event => { onCompositionEnd?.(event); composing.current = false; setCompositionDraft(null); }} /><div className="mc-ugc-viewer__placeholder" hidden={displayed !== ''} aria-hidden="true"><span className="mc-ugc-viewer__search-icon" /><span>{searchPlaceholder}</span></div></div></div></div><div className="mc-ugc-viewer__search-gap" />
        <ScrollArea className={`mc-ugc-viewer__scroll mc-ugc-viewer__scroll--${inputMode}`} scale={scale} variant={inputMode === 'touch' ? 'touch' : 'document'} label={scrollLabel ?? title} viewportRef={scrollViewportRef} thumbVisible={inputMode === 'touch' ? touchThumbVisible : undefined} minThumbSize={minThumbSize}><div className="mc-ugc-viewer__scroll-content"><div ref={gridAttach} className="mc-ugc-viewer__grid" role="list">{visibleItems.map(item => <div key={item.id} role="listitem" className="mc-ugc-viewer__cell" hidden={!!item.hidden}><UGCItemCard item={item} width={gridWidth / scale * .3333} imageFrameMaterial={imageFrameMaterial} scale={scale} ref={itemRefs && Object.hasOwn(itemRefs, item.id) ? itemRefs[item.id] : undefined} containerRef={itemContainerRefs && Object.hasOwn(itemContainerRefs, item.id) ? itemContainerRefs[item.id] : undefined} /></div>)}</div></div></ScrollArea><div className="mc-ugc-viewer__bottom-padding" />
      </div>
    </div>
  </section></Owner.Provider>;
});
