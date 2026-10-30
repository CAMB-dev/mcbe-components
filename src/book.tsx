import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type {
  ButtonHTMLAttributes, ChangeEvent, CSSProperties, HTMLAttributes, InputHTMLAttributes,
  Ref, MouseEvent, TextareaHTMLAttributes,
} from 'react';
import { Button } from './components';
import { bookAssets } from './book-assets';
import type { BookAsset } from './book-assets';
import { classicInputFontFamily, resolveClassicInputFont } from './classic-input-font';
import type { ClassicInputFontMode } from './classic-input-font';

export type BookMode = 'pages' | 'signing';
export type BookFontMode = ClassicInputFontMode;
export type BookPageAction = 'edit' | 'insert-text-page' | 'delete-page' | 'move-page-left' | 'move-page-right';
export interface BookDocumentSnapshot {
  pages: readonly string[];
  title: string;
  author: string;
  /** Zero-based spread index; its leaf pages are 2*s and 2*s+1. */
  spreadIndex: number;
  mode: BookMode;
}
export interface BookLayoutProfile {
  /** Logical units, default [320,207]. These are resolved host values, not an engine clamp emulator. */
  spreadSize?: readonly [number, number];
  /** Logical units, default [160,207]. */
  pageSize?: readonly [number, number];
  /** CSS pixels per logical unit, default 2. */
  unitScale?: number;
  /** Explicit host-resolved cap in logical units. Omitted means nominal overflow. */
  resolvedMaxSize?: readonly [number, number];
}
export interface BookSkinSources {
  background: string;
  spine: string;
  creaseLeft: string;
  creaseRight: string;
  edgeLeft: string;
  edgeRight: string;
  hoverText: string;
  cover: string;
  previous: readonly [string, string, string];
  next: readonly [string, string, string];
  pageActions: Readonly<Partial<Record<BookPageAction, readonly [string, string, string]>>>;
  close: readonly [string, string, string];
}
export interface BookLabels {
  reader: string; editor: string; previous: string; next: string; close: string;
  sign: string; finalize: string; cancel: string; title: string; titlePlaceholder: string;
  author: string; warning: string; empty: string;
  page: (oneBasedPage: number, totalLeaves: number) => string;
  actions: Readonly<Record<BookPageAction, string>>;
}
export interface BookPagesChangeDetail {
  reason: 'text-input' | 'create-first-page';
  pageIndex: number;
  event: ChangeEvent<HTMLTextAreaElement>;
}
export interface BookNavigationDetail {
  reason: 'previous' | 'next' | 'programmatic';
  previousSpreadIndex: number;
}
/** Independent source visibility bindings for documents whose navigation is
 * managed by the host (for example, an editor that can append empty spreads).
 * Supplying this object delegates both arrows to onTurnRequest; no pages are
 * fabricated and the default finite-array navigation is not run. */
export interface BookNavigationControl {
  previousAvailable: boolean;
  nextAvailable: boolean;
  onTurnRequest: (direction: 'previous' | 'next', accepted: BookDocumentSnapshot, event: MouseEvent<HTMLButtonElement>) => void;
}
export interface BookBaseProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'onChange'> {
  pages?: readonly string[];
  defaultPages?: readonly string[];
  onPagesChange?: (pages: readonly string[], detail: BookPagesChangeDetail) => void;
  spreadIndex?: number;
  defaultSpreadIndex?: number;
  onSpreadIndexChange?: (index: number, detail: BookNavigationDetail) => void;
  navigation?: BookNavigationControl;
  title?: string;
  defaultTitle?: string;
  onTitleChange?: (title: string) => void;
  author?: string;
  defaultAuthor?: string;
  onAuthorChange?: (author: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  layout?: BookLayoutProfile;
  skin?: Partial<BookSkinSources>;
  labels?: Partial<BookLabels>;
  /** Caller limits in UTF-16 code units, not recovered engine wrapping rules. */
  maxPageLength?: number;
  maxTitleLength?: number;
  onFinish?: (snapshot: BookDocumentSnapshot, detail: { reason: 'close' | 'done' | 'escape' }) => void;
  pageNumberLabel?: (oneBasedPage: number, totalLeaves: number) => string;
}
export interface BookReaderProps extends BookBaseProps {}
type BookTextareaAttributes = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange' | 'readOnly'>;
type BookInputAttributes = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'readOnly'>;
export interface BookEditorProps extends BookBaseProps {
  mode?: BookMode;
  defaultMode?: BookMode;
  onModeChange?: (mode: BookMode, detail: { reason: 'sign-open' | 'sign-cancel' }) => void;
  authorEditable?: boolean;
  onSign?: (snapshot: BookDocumentSnapshot) => void;
  /** Structural actions are host requests, enabled only with controlled pages and a handler.
   * With that capability, explicit edit:true selects the pencil instead of the
   * action row. The host can switch these independent source predicates; this
   * Web policy does not recover the game's controller state transitions. */
  pageActions?: (pageIndex: number) => Readonly<Partial<Record<BookPageAction, boolean>>>;
  onPageAction?: (action: BookPageAction, pageIndex: number) => void;
  finalizeEnabled?: boolean;
  /** Each actual page textarea selects one family for its whole value. Auto is
   * only the observed Han-trigger candidate; native advances/wrapping remain
   * unverified. An explicit textareaProps.style.fontFamily takes precedence. */
  fontMode?: BookFontMode | ((pageIndex: number) => BookFontMode);
  textareaProps?: BookTextareaAttributes | ((pageIndex: number) => BookTextareaAttributes);
  textareaRef?: (pageIndex: number) => Ref<HTMLTextAreaElement> | undefined;
  titleInputProps?: BookInputAttributes;
  authorInputProps?: BookInputAttributes;
  titleInputRef?: Ref<HTMLInputElement>;
  authorInputRef?: Ref<HTMLInputElement>;
}
export interface BookPageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  side: 'left' | 'right';
  pageIndex?: number;
  text?: string;
  defaultText?: string;
  readOnly?: boolean;
  blank?: boolean;
  pageNumber?: string;
  onTextChange?: (text: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
  textareaProps?: BookTextareaAttributes;
  /** Only the editable textarea is affected; read-only page text is unchanged. */
  fontMode?: BookFontMode;
}
export interface BookPageTurnButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  direction: 'previous' | 'next';
  /** Unavailable arrows are hidden and inert, while retaining their position. */
  available?: boolean;
  textures?: readonly [string, string, string];
}

const defaultLabels: BookLabels = {
  reader: 'Book', editor: 'Book editor', previous: 'Previous pages', next: 'Next pages', close: 'Close book',
  sign: 'Sign', finalize: 'Sign and close', cancel: 'Cancel', title: 'Enter book title',
  titlePlaceholder: 'Title here', author: 'By',
  warning: 'Once you sign the book, you will no longer be able to edit it.', empty: 'Empty book',
  page: (page, total) => `Page ${page} of ${total}`,
  actions: { edit: 'Edit page', 'insert-text-page': 'Insert text page', 'delete-page': 'Delete page',
    'move-page-left': 'Move page left', 'move-page-right': 'Move page right' },
};
const skins: BookSkinSources = {
  background: bookAssets.book_back.url, spine: bookAssets.book_spine.url,
  creaseLeft: bookAssets.book_pagecrease_left.url, creaseRight: bookAssets.book_pagecrease_right.url,
  edgeLeft: bookAssets.book_pageedge_left.url, edgeRight: bookAssets.book_pageedge_right.url,
  hoverText: bookAssets.book_texteditbox_hover.url, cover: bookAssets.book_cover.url,
  previous: [bookAssets.book_pageleft_default.url, bookAssets.book_pageleft_hover.url, bookAssets.book_pageleft_pressed.url],
  next: [bookAssets.book_pageright_default.url, bookAssets.book_pageright_hover.url, bookAssets.book_pageright_pressed.url],
  close: [bookAssets.close_button_default.url, bookAssets.close_button_hover.url, bookAssets.close_button_pressed.url],
  pageActions: {
    edit: [bookAssets.book_edit_default.url, bookAssets.book_edit_hover.url, bookAssets.book_edit_pressed.url],
    'insert-text-page': [bookAssets.book_addtextpage_default.url, bookAssets.book_addtextpage_hover.url, bookAssets.book_addtextpage_pressed.url],
    'delete-page': [bookAssets.book_trash_default.url, bookAssets.trash_hover.url, bookAssets.trash_pressed.url],
    'move-page-left': [bookAssets.book_shiftleft_default.url, bookAssets.book_shiftleft_hover.url, bookAssets.book_shiftleft_pressed.url],
    'move-page-right': [bookAssets.book_shiftright_default.url, bookAssets.book_shiftright_hover.url, bookAssets.book_shiftright_pressed.url],
  },
};
const SkinContext = createContext<BookSkinSources | null>(null);
const GeometryContext = createContext({ width: 320, height: 207, pageWidth: 160, pageHeight: 207 });
const useBookLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
function url(value: string) { return `url(${JSON.stringify(value)})`; }
function skinStyle(skin: BookSkinSources): CSSProperties {
  return {
    '--mc-book-back': url(skin.background), '--mc-book-spine': url(skin.spine),
    '--mc-book-cover': url(skin.cover), '--mc-book-crease-left': url(skin.creaseLeft),
    '--mc-book-crease-right': url(skin.creaseRight), '--mc-book-edge-left': url(skin.edgeLeft),
    '--mc-book-edge-right': url(skin.edgeRight), '--mc-book-hover': url(skin.hoverText),
  } as CSSProperties;
}
function buttonStyle(textures: readonly [string, string, string]): CSSProperties {
  return { '--mc-book-button-normal': url(textures[0]), '--mc-book-button-hover': url(textures[1]),
    '--mc-book-button-pressed': url(textures[2]) } as CSSProperties;
}
function useValue<T>(value: T | undefined, initial: T) {
  const [internal, setInternal] = useState(initial);
  return [value === undefined ? internal : value, (next: T) => { if (value === undefined) setInternal(next); }] as const;
}
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}
function dimensions(value: readonly [number, number] | undefined, fallback: readonly [number, number]) {
  const result = value ?? fallback;
  if (result.length !== 2 || ![...result].every(n => Number.isFinite(n) && n > 0))
    throw new RangeError('Book layout dimensions must be positive finite pairs.');
  return result;
}
function resolveLayout(layout: BookLayoutProfile = {}) {
  const spread = dimensions(layout.spreadSize, [320, 207]);
  const page = dimensions(layout.pageSize, [160, 207]);
  const cap = dimensions(layout.resolvedMaxSize, spread);
  const unit = layout.unitScale ?? 2;
  if (!Number.isFinite(unit) || unit <= 0) throw new RangeError('Book unitScale must be positive and finite.');
  const width = Math.min(spread[0], cap[0]); const height = Math.min(spread[1], cap[1]);
  const pageWidth = Math.min(page[0], width / 2); const pageHeight = Math.min(page[1], height);
  const coverWidth = Math.min(page[0], cap[0]); const coverHeight = pageHeight;
  if (![width * unit, height * unit, pageWidth * unit, pageHeight * unit, coverWidth * unit].every(Number.isFinite))
    throw new RangeError('Book display dimensions must be finite.');
  const patches = skinPatchCount(bookAssets.book_back, width, height) +
    skinPatchCount(bookAssets.book_cover, coverWidth, coverHeight) +
    skinPatchCount(bookAssets.book_pageedge_left, Math.max(0, pageWidth - 7), Math.max(0, pageHeight - 16)) +
    skinPatchCount(bookAssets.book_pageedge_right, Math.max(0, pageWidth - 7), Math.max(0, pageHeight - 16)) +
    2 * skinPatchCount(bookAssets.book_pagecrease_left, Math.max(0, pageWidth - 40), Math.max(0, pageHeight - 14));
  if (patches > 4096) throw new RangeError('Book skin exceeds the 4096 patch budget.');
  const style = { '--mc-book-u': `${unit}px`, '--mc-book-width': `${width * unit}px`,
    '--mc-book-height': `${height * unit}px`, '--mc-book-page-width': `${Math.min(page[0], width / 2) * unit}px`,
    '--mc-book-page-height': `${Math.min(page[1], height) * unit}px`,
    '--mc-book-cover-width': `${coverWidth * unit}px`, '--mc-book-cover-height': `${coverHeight * unit}px` } as CSSProperties;
  return { width, height, pageWidth, pageHeight, coverWidth, coverHeight, style };
}

function skinAxes(asset: BookAsset, width: number, height: number) {
  const metadata = asset.metadata!;
  const cuts = typeof metadata.nineslice_size === 'number' ? Array(4).fill(metadata.nineslice_size) as number[] : metadata.nineslice_size;
  const [left, top, right, bottom] = cuts as readonly [number, number, number, number];
  const axis = (size: number, imageSize: number, base: number, before: number, after: number) => {
    const factor = Math.min(1, size / Math.max(1, before + after));
    const a = before * factor; const b = after * factor;
    return [
      { start: 0, length: a, source: 0, pixels: before * imageSize / base, logical: before },
      { start: a, length: Math.max(0, size - a - b), source: before * imageSize / base,
        pixels: (base - before - after) * imageSize / base, logical: base - before - after },
      { start: size - b, length: b, source: (base - after) * imageSize / base, pixels: after * imageSize / base, logical: after },
    ];
  };
  return { metadata, xs: axis(Math.max(0, width), asset.width, metadata.base_size[0], left, right),
    ys: axis(Math.max(0, height), asset.height, metadata.base_size[1], top, bottom) };
}
function skinPatchCount(asset: BookAsset, width: number, height: number) {
  const { xs, ys } = skinAxes(asset, width, height);
  let count = 0;
  for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
    const x = xs[column]!; const y = ys[row]!;
    if (!x.length || !y.length) continue;
    count++;
  }
  return count;
}

/** Bounded private mapping of the original metadata, not a JSON UI renderer.
 * CSS border-image drops zero-size source centers. The source art has opaque
 * seam texels there, so retain a clamped boundary texel and stretch that axis.
 * The captured Classic Book image draws use one stretched quad per slice,
 * including edge/crease centers, despite companion metadata.tiled=true.
 * Keep that raw metadata as provenance; do not infer a repeat period from it.
 * This is a bounded Book-style mapping. Every patch references the whole PNG. */
function BookSkin({ asset, source, width, height, className }: {
  asset: BookAsset; source: string; width: number; height: number; className: string;
}) {
  const { xs, ys } = skinAxes(asset, width, height);
  if (skinPatchCount(asset, width, height) > 4096) throw new RangeError('Book skin exceeds the 4096 patch budget.');
  const patches = [];
  const unit = (value: number) => `calc(var(--mc-book-u, 2px) * ${value})`;
  for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
    const x = xs[column]!; const y = ys[row]!;
    if (!x.length || !y.length) continue;
    const sx = x.pixels > 0 ? x.source : Math.max(0, Math.min(asset.width - 1, Math.floor(x.source)));
    const sy = y.pixels > 0 ? y.source : Math.max(0, Math.min(asset.height - 1, Math.floor(y.source)));
    const sw = x.pixels || 1; const sh = y.pixels || 1;
    const tileWidth = x.length;
    const tileHeight = y.length;
    const columns = Math.ceil(x.length / tileWidth); const rows = Math.ceil(y.length / tileHeight);
    for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < columns; tx++) {
      patches.push(<span className="mc-book__skin-clip" key={`${row}-${column}-${ty}-${tx}`} style={{
        left: unit(x.start + tx * tileWidth), top: unit(y.start + ty * tileHeight),
        width: unit(Math.min(tileWidth, x.length - tx * tileWidth)), height: unit(Math.min(tileHeight, y.length - ty * tileHeight)),
      }}><span className="mc-book__skin-patch" style={{ width: unit(tileWidth), height: unit(tileHeight),
        backgroundImage: url(source), backgroundSize: `${asset.width / sw * 100}% ${asset.height / sh * 100}%`,
        backgroundPosition: `${asset.width === sw ? 0 : sx / (asset.width - sw) * 100}% ${asset.height === sh ? 0 : sy / (asset.height - sh) * 100}%`,
      }}/></span>);
    }
  }
  return <div className={className} aria-hidden="true">{patches}</div>;
}

export const BookPageTurnButton = forwardRef<HTMLButtonElement, BookPageTurnButtonProps>(function BookPageTurnButton({
  direction, available = true, textures, style, className, disabled, type = 'button', ...props
}, ref) {
  const skin = useContext(SkinContext) ?? skins;
  return <button {...props} ref={ref} type={type} disabled={disabled || !available}
    aria-label={props['aria-label'] ?? defaultLabels[direction]} aria-hidden={!available || undefined}
    tabIndex={!available ? -1 : props.tabIndex} data-direction={direction} data-available={available}
    className={['mc-book__image-button', 'mc-book__turn', className].filter(Boolean).join(' ')}
    style={{ ...buttonStyle(textures ?? skin[direction]), ...style }}/>
});

export const BookPage = forwardRef<HTMLDivElement, BookPageProps>(function BookPage({
  side, pageIndex, text, defaultText = '', readOnly = true, blank = false, pageNumber,
  onTextChange, textareaRef, textareaProps = {}, fontMode = 'auto', className, style, ...props
}, ref) {
  const context = useContext(SkinContext); const geometry = useContext(GeometryContext);
  const skin = context ?? skins; const [value, setValue] = useValue(text, defaultText);
  const acceptedText = useRef(value); acceptedText.current = value;
  const selectedFont = resolveClassicInputFont(fontMode, value);
  const { style: inputStyle, onCompositionStart, onCompositionUpdate, onCompositionEnd } = textareaProps;
  return <div {...props} ref={ref} data-side={side} data-page-index={pageIndex} data-blank={blank}
    data-in-book={!!context} className={['mc-book__page', className].filter(Boolean).join(' ')}
    style={{ ...(!context ? skinStyle(skins) : {}), ...style }}>
    {!context && <BookSkin asset={bookAssets.book_back} source={skin.background}
      width={geometry.pageWidth} height={geometry.pageHeight} className="mc-book__back"/>}
    <BookSkin asset={side === 'left' ? bookAssets.book_pageedge_left : bookAssets.book_pageedge_right}
      source={side === 'left' ? skin.edgeLeft : skin.edgeRight}
      width={Math.max(0, geometry.pageWidth - 7)} height={Math.max(0, geometry.pageHeight - 16)} className="mc-book__page-edge"/>
    <BookSkin asset={side === 'left' ? bookAssets.book_pagecrease_left : bookAssets.book_pagecrease_right}
      source={side === 'left' ? skin.creaseLeft : skin.creaseRight}
      width={Math.max(0, geometry.pageWidth - 40)} height={Math.max(0, geometry.pageHeight - 14)} className="mc-book__page-crease"/>
    {!blank && <div className="mc-book__page-content">
      {pageNumber !== undefined && <div className="mc-book__page-number">{pageNumber}</div>}
      {readOnly ? <div className="mc-book__page-text">{value}</div> :
        <div className="mc-book__text-box" data-disabled={!!textareaProps.disabled}>
          <div className="mc-book__text-center"><div className="mc-book__text-clip">
        <textarea {...textareaProps} ref={textareaRef} value={value}
          spellCheck={textareaProps.spellCheck ?? false}
          data-book-font-mode={selectedFont} data-book-font-policy={fontMode === 'auto' ? 'whole-value-han-candidate' : 'caller'}
          style={{ '--mc-book-input-font': classicInputFontFamily(selectedFont), ...inputStyle } as CSSProperties}
          className={['mc-book__text', textareaProps.className].filter(Boolean).join(' ')}
          aria-label={textareaProps['aria-label'] ?? `Page ${(pageIndex ?? 0) + 1}`}
          onChange={event => { setValue(event.currentTarget.value); onTextChange?.(event.currentTarget.value, event); }}
          onCompositionStart={event => {
            const role = resolveClassicInputFont(fontMode, event.currentTarget.value);
            event.currentTarget.style.setProperty('--mc-book-input-font', classicInputFontFamily(role));
            event.currentTarget.dataset.bookComposingFontMode = role;
            onCompositionStart?.(event);
          }}
          onCompositionUpdate={event => {
            const role = resolveClassicInputFont(fontMode, event.currentTarget.value);
            event.currentTarget.style.setProperty('--mc-book-input-font', classicInputFontFamily(role));
            event.currentTarget.dataset.bookComposingFontMode = role;
            onCompositionUpdate?.(event);
          }}
          onCompositionEnd={event => {
            event.currentTarget.style.setProperty('--mc-book-input-font', classicInputFontFamily(resolveClassicInputFont(fontMode, acceptedText.current)));
            delete event.currentTarget.dataset.bookComposingFontMode;
            onCompositionEnd?.(event);
          }}/>
          </div></div>
        </div>
      }
    </div>}
  </div>;
});

function BookSurface({ editor, rootRef, ...props }: BookEditorProps & { editor: boolean; rootRef: Ref<HTMLElement> }) {
  const { pages: controlledPages, defaultPages = [], onPagesChange,
    spreadIndex: controlledSpread, defaultSpreadIndex = 0, onSpreadIndexChange, navigation,
    title: controlledTitle, defaultTitle = '', onTitleChange,
    author: controlledAuthor, defaultAuthor = '', onAuthorChange,
    mode: controlledMode, defaultMode = 'pages', onModeChange, readOnly = !editor, disabled = false,
    layout, skin: overrides, labels: labelOverrides, maxPageLength, maxTitleLength, onFinish, pageNumberLabel,
    authorEditable = false, onSign, pageActions, onPageAction, finalizeEnabled = true, fontMode = 'auto',
    textareaProps, textareaRef, titleInputProps = {}, authorInputProps = {}, titleInputRef, authorInputRef,
    className, style, onKeyDown, ...rest } = props;
  const [pages, setPages] = useValue(controlledPages, defaultPages);
  const [requestedSpread, setSpread] = useValue(controlledSpread, defaultSpreadIndex);
  const [title, setTitle] = useValue(controlledTitle, defaultTitle);
  const [author, setAuthor] = useValue(controlledAuthor, defaultAuthor);
  const [requestedMode, setMode] = useValue(controlledMode, defaultMode);
  const composition = useRef(new Set<EventTarget>()); const [composing, setComposing] = useState(false);
  const heldSpread = useRef(0); const heldMode = useRef<BookMode>('pages');
  const inputs = useRef(new Map<number, HTMLTextAreaElement>());
  const mergedTextareaRefs = useRef<({ index: number; external: Ref<HTMLTextAreaElement> | undefined; callback: (node: HTMLTextAreaElement | null) => void } | undefined)[]>([]);
  const root = useRef<HTMLElement | null>(null);
  const attachRoot = useCallback((node: HTMLElement | null) => { root.current = node; assignRef(rootRef, node); }, [rootRef]);
  const [focusRequest, setFocusRequest] = useState<{ index: number; button: HTMLButtonElement } | null>(null);
  const [modeFocusRequest, setModeFocusRequest] = useState<{ mode: BookMode; button: HTMLButtonElement } | null>(null);
  const uid = useId(); const labels: BookLabels = { ...defaultLabels,
    ...Object.fromEntries(Object.entries(labelOverrides ?? {}).filter(([, value]) => value !== undefined)) };
  const skin: BookSkinSources = { ...skins,
    ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined)),
    pageActions: { ...skins.pageActions,
      ...Object.fromEntries(Object.entries(overrides?.pageActions ?? {}).filter(([, value]) => value !== undefined)) } };
  const geometry = resolveLayout(layout);
  const lastSpread = Math.max(0, Math.ceil(pages.length / 2) - 1);
  const clamp = (value: number) => Math.max(0, Math.min(lastSpread, Number.isFinite(value) ? Math.floor(value) : 0));
  const spread = composing ? heldSpread.current : clamp(requestedSpread);
  const mode: BookMode = !editor ? 'pages' : composing ? heldMode.current : requestedMode;
  // Read focus before the commit can hide/disable the current arrow. Retain one
  // pending request for an asynchronously accepted controlled navigation, but
  // never move focus if the user has already moved away from that button.
  const focusWasOnButton = !!focusRequest && focusRequest.button.ownerDocument.activeElement === focusRequest.button;
  useBookLayoutEffect(() => {
    if (!focusRequest) return;
    if (spread !== focusRequest.index && mode === 'pages' && !disabled) return;
    const button = focusRequest.button;
    if (!disabled && mode === 'pages' && spread === focusRequest.index && (button.disabled || button.getAttribute('data-available') === 'false') &&
      focusWasOnButton) {
      const target = root.current?.querySelector<HTMLElement>('.mc-book__turn[data-available="true"]:not(:disabled)') ??
        root.current?.querySelector<HTMLElement>('textarea:not(:disabled)');
      (target ?? root.current)?.focus();
    }
    setFocusRequest(null);
  }, [focusRequest, spread, mode, disabled, focusWasOnButton]);
  const focusWasOnModeButton = !!modeFocusRequest && modeFocusRequest.button.ownerDocument.activeElement === modeFocusRequest.button;
  useBookLayoutEffect(() => {
    if (!modeFocusRequest || mode !== modeFocusRequest.mode) return;
    if (!disabled && focusWasOnModeButton) {
      const selector = mode === 'signing' ? '.mc-book__title-input input:not(:disabled)' : '[data-book-action="sign-open"]:not(:disabled)';
      (root.current?.querySelector<HTMLElement>(selector) ?? root.current)?.focus();
    }
    setModeFocusRequest(null);
  }, [modeFocusRequest, mode, disabled, focusWasOnModeButton]);
  const writable = editor && !readOnly && !disabled;
  const snapshot = (): BookDocumentSnapshot => ({ pages: [...pages], title, author, spreadIndex: clamp(requestedSpread), mode: editor ? requestedMode : 'pages' });
  const blocked = () => disabled || composition.current.size > 0;
  const startComposition = (target: EventTarget) => {
    if (!composition.current.size) { heldSpread.current = spread; heldMode.current = mode; }
    composition.current.add(target); setComposing(true);
  };
  const endComposition = (target: EventTarget) => {
    composition.current.delete(target); setComposing(composition.current.size > 0);
  };
  const navigate = (index: number, reason: 'previous' | 'next', button: HTMLButtonElement) => {
    if (blocked()) return;
    const next = clamp(index); if (next === spread) return;
    if (button.ownerDocument.activeElement === button) setFocusRequest({ index: next, button });
    setSpread(next); onSpreadIndexChange?.(next, { reason, previousSpreadIndex: spread });
  };
  const turn = (direction: 'previous' | 'next', event: MouseEvent<HTMLButtonElement>) => {
    if (event.defaultPrevented || blocked()) return;
    if (navigation) {
      if (!(direction === 'previous' ? navigation.previousAvailable : navigation.nextAvailable)) return;
      navigation.onTurnRequest(direction, snapshot(), event);
    } else navigate(spread + (direction === 'previous' ? -1 : 1), direction, event.currentTarget);
  };
  const changeMode = (next: BookMode, reason: 'sign-open' | 'sign-cancel', button: HTMLButtonElement) => {
    if (blocked()) return;
    if (button.ownerDocument.activeElement === button) setModeFocusRequest({ mode: next, button });
    setMode(next); onModeChange?.(next, { reason });
  };
  const finish = (reason: 'close' | 'escape') => { if (!blocked()) onFinish?.(snapshot(), { reason }); };
  const numberLabel = pageNumberLabel ?? labels.page;
  const action = (name: BookPageAction, index: number) => {
    if (blocked() || !writable) return;
    if (name === 'edit') inputs.current.get(index)?.focus();
    onPageAction?.(name, index);
  };
  const renderPage = (side: 'left' | 'right', index: number) => {
    const virtual = editor && !readOnly && pages.length === 0 && index === 0 && side === 'left';
    const activeComposition = composition.current.size > 0 && inputs.current.has(index) &&
      composition.current.has(inputs.current.get(index)!);
    const blank = index >= pages.length && !virtual && !activeComposition;
    const pageReadOnly = (!editor || readOnly) && !activeComposition;
    const inputProps = typeof textareaProps === 'function' ? textareaProps(index) : textareaProps ?? {};
    const externalRef = textareaRef?.(index);
    const slot = side === 'left' ? 0 : 1;
    let mergedRef = mergedTextareaRefs.current[slot];
    if (!mergedRef || mergedRef.index !== index || mergedRef.external !== externalRef) {
      mergedRef = { index, external: externalRef, callback: node => {
        if (node) inputs.current.set(index, node); else inputs.current.delete(index);
        assignRef(externalRef, node);
      } };
      mergedTextareaRefs.current[slot] = mergedRef;
    }
    const structural = writable && controlledPages !== undefined && !!onPageAction && !blank;
    const defaults: Record<BookPageAction, boolean> = { edit: !blank, 'insert-text-page': true,
      'delete-page': index < pages.length, 'move-page-left': index > 0, 'move-page-right': index + 1 < pages.length };
    const predicates = pageActions?.(index);
    const allowed = { ...defaults, ...predicates };
    const pencil = !structural ? allowed.edit : predicates?.edit === true;
    return <div className="mc-book__leaf" key={index} data-side={side}>
      <BookPage side={side} pageIndex={index} text={pages[index] ?? ''} readOnly={pageReadOnly}
        fontMode={!pageReadOnly && !blank ? typeof fontMode === 'function' ? fontMode(index) : fontMode : undefined}
        blank={blank} pageNumber={index < pages.length ? numberLabel(index + 1, pages.length) : undefined}
        textareaRef={mergedRef.callback}
        textareaProps={{ ...inputProps, disabled: disabled || inputProps.disabled, maxLength: maxPageLength ?? inputProps.maxLength,
          'aria-label': inputProps['aria-label'] ?? numberLabel(index + 1, Math.max(1, pages.length)),
          onCompositionStart: event => { startComposition(event.currentTarget); inputProps.onCompositionStart?.(event); },
          onCompositionEnd: event => { endComposition(event.currentTarget); inputProps.onCompositionEnd?.(event); } }}
        onTextChange={(text, event) => {
          if (!writable || (index >= pages.length && !virtual)) return;
          const next = [...pages]; next[index] = text; setPages(next);
          onPagesChange?.(next, { reason: virtual ? 'create-first-page' : 'text-input', pageIndex: index, event });
        }}/>
      {structural && !pencil && <div className="mc-book__page-actions" aria-label={`Page ${index + 1} actions`}>
        {(['move-page-left', 'insert-text-page', 'delete-page', 'move-page-right'] as const).filter(name => allowed[name]).map(name =>
          <button key={name} type="button" className={`mc-book__image-button mc-book__page-action mc-book__page-action--${name}`}
            data-book-action={name} data-page-index={index} aria-label={labels.actions[name]}
            disabled={composing} style={buttonStyle(skin.pageActions[name]!)} onClick={() => action(name, index)}/>)}
      </div>}
      {writable && !blank && pencil && <button type="button" data-book-action="edit" data-page-index={index}
        className="mc-book__image-button mc-book__edit" aria-label={labels.actions.edit} disabled={composing}
        style={buttonStyle(skin.pageActions.edit!)} onClick={() => action('edit', index)}/>}
    </div>;
  };
  const coverInput = (kind: 'title' | 'author') => {
    const attributes = kind === 'title' ? titleInputProps : authorInputProps;
    const value = kind === 'title' ? title : author;
    return <input {...attributes} id={attributes.id ?? `${uid}-${kind}`} ref={kind === 'title' ? titleInputRef : authorInputRef}
      spellCheck={attributes.spellCheck ?? false}
      className={['mc-book__cover-input', attributes.className].filter(Boolean).join(' ')}
      value={value} readOnly={!writable || (kind === 'author' && !authorEditable)} disabled={disabled || attributes.disabled}
      maxLength={kind === 'title' ? maxTitleLength ?? attributes.maxLength : attributes.maxLength}
      placeholder={attributes.placeholder ?? (kind === 'title' ? labels.titlePlaceholder : undefined)}
      onChange={event => {
        if (!writable || (kind === 'author' && !authorEditable)) return;
        const next = event.currentTarget.value;
        if (kind === 'title') { setTitle(next); onTitleChange?.(next); }
        else { setAuthor(next); onAuthorChange?.(next); }
      }}
      onCompositionStart={event => { startComposition(event.currentTarget); attributes.onCompositionStart?.(event); }}
      onCompositionEnd={event => { endComposition(event.currentTarget); attributes.onCompositionEnd?.(event); }}/>
  };
  return <SkinContext.Provider value={skin}><GeometryContext.Provider value={geometry}>
    <section {...rest} ref={attachRoot} tabIndex={rest.tabIndex ?? -1} className={['mc-book', editor ? 'mc-book--editor' : 'mc-book--reader', className].filter(Boolean).join(' ')}
      aria-label={rest['aria-label'] ?? (editor ? labels.editor : labels.reader)} data-mode={mode} data-spread-index={spread}
      data-disabled={disabled} style={{ ...skinStyle(skin), ...geometry.style, ...style }}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (event.defaultPrevented || blocked() || event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Escape') { event.preventDefault(); finish('escape'); }
      }}>
      <div className="mc-book__surface" hidden={mode !== 'pages'}>
        <BookSkin asset={bookAssets.book_back} source={skin.background} width={geometry.width} height={geometry.height} className="mc-book__back"/>
        <div className="mc-book__spine" aria-hidden="true"/>
        <div className="mc-book__spread">{renderPage('left', spread * 2)}{renderPage('right', spread * 2 + 1)}</div>
        <BookPageTurnButton direction="previous" aria-label={labels.previous} available={navigation ? navigation.previousAvailable : spread > 0}
          disabled={disabled || composing} onClick={event => turn('previous', event)}/>
        <BookPageTurnButton direction="next" aria-label={labels.next} available={navigation ? navigation.nextAvailable : spread < lastSpread}
          disabled={disabled || composing} onClick={event => turn('next', event)}/>
      </div>
      <div className="mc-book__cover" hidden={mode !== 'signing'}>
        <BookSkin asset={bookAssets.book_cover} source={skin.cover} width={geometry.coverWidth} height={geometry.coverHeight} className="mc-book__cover-back"/>
        <label className="mc-book__title-label" htmlFor={titleInputProps.id ?? `${uid}-title`}>{labels.title}</label>
        <div className="mc-book__title-input">{coverInput('title')}</div>
        <div className="mc-book__author"><label htmlFor={authorInputProps.id ?? `${uid}-author`}>{labels.author}</label>{coverInput('author')}</div>
        <p className="mc-book__warning">{labels.warning}</p>
      </div>
      <button type="button" className="mc-book__image-button mc-book__close" data-book-action="close"
        aria-label={labels.close} disabled={disabled || composing} style={buttonStyle(skin.close)} onClick={() => finish('close')}/>
      {editor && <div className="mc-book__footer">
        {mode === 'pages' ? !readOnly && <Button data-book-action="sign-open" disabled={disabled || composing} onClick={event => changeMode('signing', 'sign-open', event.currentTarget)}>{labels.sign}</Button> : <>
          <Button data-book-action="finalize" disabled={!writable || !finalizeEnabled || composing} onClick={() => {
            if (!blocked() && writable && finalizeEnabled) onSign?.(snapshot());
          }}>{labels.finalize}</Button>
          <Button data-book-action="sign-cancel" disabled={disabled || composing} onClick={event => changeMode('pages', 'sign-cancel', event.currentTarget)}>{labels.cancel}</Button>
        </>}
      </div>}
      <span className="mc-book__status" role="status" aria-live="polite" aria-atomic="true">
        {mode === 'signing' ? labels.title : pages.length ? `${numberLabel(spread * 2 + 1, pages.length)}${spread * 2 + 1 < pages.length ? ` – ${numberLabel(spread * 2 + 2, pages.length)}` : ''}` : labels.empty}
      </span>
    </section>
  </GeometryContext.Provider></SkinContext.Provider>;
}

export const BookReader = forwardRef<HTMLElement, BookReaderProps>(function BookReader(props, ref) {
  return <BookSurface {...props} editor={false} rootRef={ref}/>;
});
export const BookEditor = forwardRef<HTMLElement, BookEditorProps>(function BookEditor(props, ref) {
  return <BookSurface {...props} editor rootRef={ref}/>;
});
