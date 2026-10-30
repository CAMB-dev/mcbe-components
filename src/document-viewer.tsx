import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode, Ref, SyntheticEvent } from 'react';
import { ScrollArea } from './scroll-area';
import type { ScrollPosition } from './scroll-area';

export interface DocumentTopic {
  readonly id: string;
  readonly title: ReactNode;
  /** Optional independently resolved top-bar binding, separate from navigation. */
  readonly sectionTitle?: ReactNode;
  readonly content: ReactNode;
  /** Accessible name when the title's own content is not sufficient. */
  readonly label?: string;
  readonly disabled?: boolean;
  readonly showArrow?: boolean;
}
export interface DocumentGroup { readonly id: string; readonly label?: ReactNode; readonly topics: readonly DocumentTopic[] }
export interface DocumentHint { readonly label: string; readonly glyph: ReactNode; readonly description?: ReactNode }
export interface DocumentValueChangeDetail { reason: 'activate' | 'previous' | 'next'; event: SyntheticEvent }
export interface DocumentScrollPosition extends ScrollPosition { topicId?: string }
export interface DocumentViewerProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'defaultValue' | 'onChange' | 'title'> {
  groups: readonly DocumentGroup[];
  label: string;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string, detail: DocumentValueChangeDetail) => void;
  onBack?: (event: SyntheticEvent) => void;
  backLabel?: string;
  headerHints?: ReactNode;
  previousHint?: DocumentHint;
  nextHint?: DocumentHint;
  navigationViewportRef?: Ref<HTMLDivElement>;
  contentViewportRef?: Ref<HTMLDivElement>;
  topicRefs?: Readonly<Record<string, Ref<HTMLButtonElement> | undefined>>;
  onScrollPositionChange?: (pane: 'navigation' | 'content', position: DocumentScrollPosition) => void;
  /** Reset on accepted topic identity changes, or restore each topic's offset.
   * Neither policy resets for a rejected selection request. */
  scrollPolicy?: 'reset' | 'preserve';
  emptyContent?: ReactNode;
  disabled?: boolean;
  size?: readonly [number, number];
  scale?: number;
}
export interface DocumentHeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, 'dangerouslySetInnerHTML'> { scale?: number }
export interface DocumentParagraphProps extends Omit<HTMLAttributes<HTMLParagraphElement>, 'dangerouslySetInnerHTML'> { scale?: number; linePadding?: number }

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const asset = (name: string) => `url(${JSON.stringify(new URL(`./assets/document-viewer/${name}.png`, import.meta.url).href)})`;
const chrome = {
  '--mc-document-background': asset('permissions_player_fade_overlay'),
  '--mc-document-top-bar': asset('StoreTopBar'), '--mc-document-divider': asset('HowToPlayDivider'), '--mc-document-banner': asset('banners_no_border'),
  '--mc-document-chevron': asset('chevron_left'), '--mc-document-arrow': asset('arrowRight'), '--mc-document-nav-default': asset('button_borderless_light'),
  '--mc-document-nav-checked': asset('button_borderless_lightpressednohover'), '--mc-document-nav-hover': asset('button_borderless_lighthover'),
  '--mc-document-nav-checked-hover': asset('button_borderless_lightpressed'), '--mc-document-nav-disabled': asset('disabledButtonNoBorder'), '--mc-document-focus': asset('focus_border_white'),
};
function checkScale(scale: number) { if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Document scale must be a positive safe integer.'); }
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) { if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }
function checkId(value: unknown, name: string): asserts value is string { if (typeof value !== 'string' || !value) throw new RangeError(`${name} requires a nonempty string id.`); }
function checkSelection(value: unknown) { if (value !== undefined && value !== null) checkId(value, 'Document selection'); }

/** Shared source article header; this is semantic, selectable DOM text. */
export const DocumentHeading = forwardRef<HTMLHeadingElement, DocumentHeadingProps>(function DocumentHeading({ scale, className, style, children, ...props }, ref) {
  if (scale !== undefined) checkScale(scale);
  return <h2 {...props} ref={ref} className={['mc-document-heading', className].filter(Boolean).join(' ')}
    style={{ '--mc-document-banner': chrome['--mc-document-banner'], ...(scale === undefined ? {} : { '--mc-document-unit': `${scale}px` }), ...style } as CSSProperties}>
    <span className="mc-document-heading__banner" aria-hidden="true"/><span className="mc-document-heading__label">{children}</span>
  </h2>;
});
/** Input/locale preprocessing remains host-owned; linePadding expresses a
 * normal source role rather than parsing controller glyph markup. */
export const DocumentParagraph = forwardRef<HTMLParagraphElement, DocumentParagraphProps>(function DocumentParagraph({ scale, linePadding = 4, className, style, ...props }, ref) {
  if (scale !== undefined) checkScale(scale);
  if (!Number.isFinite(linePadding) || linePadding < 0) throw new RangeError('Document paragraph line padding must be finite and nonnegative.');
  return <p {...props} ref={ref} className={['mc-document-paragraph', className].filter(Boolean).join(' ')}
    style={{ '--mc-document-line-padding': linePadding, ...(scale === undefined ? {} : { '--mc-document-unit': `${scale}px` }), ...style } as CSSProperties}/>;
});

/** A bounded, grouped document composition. Topic IDs, content, localization
 * and back/store/account/controller transports are supplied by the host. */
export const DocumentViewer = forwardRef<HTMLElement, DocumentViewerProps>(function DocumentViewer({
  groups, label, value, defaultValue, onValueChange, onBack, backLabel = 'Back', headerHints, previousHint, nextHint,
  navigationViewportRef, contentViewportRef, topicRefs, onScrollPositionChange, scrollPolicy = 'reset', emptyContent,
  disabled = false, size = [400, 300], scale = 2, className, style, onKeyDown, onClick, ...props
}, ref) {
  checkScale(scale); checkSelection(value); checkSelection(defaultValue);
  if (typeof label !== 'string' || !label.trim() || typeof backLabel !== 'string' || !backLabel.trim()) throw new RangeError('Document viewer and Back require accessible labels.');
  if (!Array.isArray(size) || size.length !== 2 || !size.every(v => Number.isFinite(v) && v > 0 && Number.isFinite(v * scale))) throw new RangeError('Document size requires two positive finite dimensions.');
  if (!['reset', 'preserve'].includes(scrollPolicy) || !Array.isArray(groups as unknown)) throw new RangeError('Document groups and scroll policy are invalid.');
  const groupIds = new Set<string>(), topicIds = new Set<string>(), topics: DocumentTopic[] = [];
  for (const group of groups) {
    if (!group) throw new RangeError('Document group is missing.'); checkId(group.id, 'Document group');
    if (groupIds.has(group.id) || !Array.isArray(group.topics as unknown)) throw new RangeError('Document groups require unique ids and topic arrays.'); groupIds.add(group.id);
    for (const topic of group.topics) {
      if (!topic) throw new RangeError('Document topic is missing.'); checkId(topic.id, 'Document topic');
      if (topicIds.has(topic.id) || topic.label !== undefined && (typeof topic.label !== 'string' || !topic.label.trim())) throw new RangeError('Document topics require globally unique ids and valid accessible labels.');
      topicIds.add(topic.id); topics.push(topic);
    }
  }
  for (const hint of [previousHint, nextHint]) if (hint && (typeof hint.label !== 'string' || !hint.label.trim())) throw new RangeError('Document bumper hints require accessible labels.');
  const enabled = topics.filter(topic => !topic.disabled), first = enabled[0]?.id ?? null;
  const [inside, setInside] = useState<string | null>(() => defaultValue === undefined ? first : defaultValue);
  const acceptedId = value === undefined ? inside : value, accepted = topics.find(topic => topic.id === acceptedId) ?? null;
  const [focused, setFocused] = useState<string | null>(accepted && !accepted.disabled ? accepted.id : first);
  const roving = enabled.some(topic => topic.id === focused) ? focused : accepted && !accepted.disabled ? accepted.id : first;
  const uid = useId(), tabId = (id: string) => `${uid}-topic-${encodeURIComponent(id)}`, panelId = (id: string) => `${uid}-article-${encodeURIComponent(id)}`;
  const nodes = useRef(new Map<string, HTMLButtonElement>()), contentViewport = useRef<HTMLDivElement | null>(null), navigationViewport = useRef<HTMLDivElement | null>(null);
  const backNode = useRef<HTMLButtonElement | null>(null), previousNode = useRef<HTMLButtonElement | null>(null), nextNode = useRef<HTMLButtonElement | null>(null);
  const previousAccepted = useRef(accepted?.id ?? null), positions = useRef(new Map<string, ScrollPosition>());
  const latest = useRef({ accepted: accepted?.id, onScrollPositionChange }); latest.current = { accepted: accepted?.id, onScrollPositionChange };
  const attachContent = useCallback((node: HTMLDivElement | null) => { contentViewport.current = node; assignRef(contentViewportRef, node); }, [contentViewportRef]);
  const attachNavigation = useCallback((node: HTMLDivElement | null) => { navigationViewport.current = node; assignRef(navigationViewportRef, node); }, [navigationViewportRef]);
  const signature = JSON.stringify(topics.map(topic => topic.id));
  const refs = useMemo(() => new Map(topics.map(topic => [topic.id, (node: HTMLButtonElement | null) => {
    if (node) nodes.current.set(topic.id, node); else nodes.current.delete(topic.id); assignRef(topicRefs?.[topic.id], node);
  }])), [signature, topicRefs]);
  const contentScroll = useCallback((position: ScrollPosition) => {
    const current = latest.current; if (current.accepted !== undefined) positions.current.set(current.accepted, { ...position });
    current.onScrollPositionChange?.('content', { ...position, topicId: current.accepted });
  }, []);
  const navigationScroll = useCallback((position: ScrollPosition) => { latest.current.onScrollPositionChange?.('navigation', { ...position, topicId: latest.current.accepted }); }, []);
  useClientLayoutEffect(() => {
    const next = accepted?.id ?? null;
    if (next === previousAccepted.current) return;
    previousAccepted.current = next;
    const node = contentViewport.current; if (!node) return;
    const position = scrollPolicy === 'preserve' && next !== null ? positions.current.get(next) : undefined;
    node.scrollTop = position?.scrollTop ?? 0; node.scrollLeft = position?.scrollLeft ?? 0;
  }, [accepted?.id, scrollPolicy]);
  const request = (id: string, reason: DocumentValueChangeDetail['reason'], event: SyntheticEvent) => {
    if (disabled || event.defaultPrevented || topics.find(topic => topic.id === id)?.disabled || !topicIds.has(id) || id === acceptedId) return;
    const node = contentViewport.current; if (node && accepted) positions.current.set(accepted.id, { scrollTop: node.scrollTop, scrollLeft: node.scrollLeft });
    if (value === undefined) setInside(id); onValueChange?.(id, { reason, event });
  };
  const adjacent = (direction: -1 | 1) => {
    const index = enabled.findIndex(topic => topic.id === accepted?.id);
    return index < 0 ? direction > 0 ? enabled[0] : enabled.at(-1) : enabled[index + direction];
  };
  const hintButton = (hint: DocumentHint | undefined, direction: -1 | 1) => hint && <button ref={direction < 0 ? previousNode : nextNode} type="button" className="mc-document-viewer__bumper" aria-label={hint.label}
    disabled={disabled || !adjacent(direction)}>
    <span className="mc-document-viewer__bumper-glyph" aria-hidden="true">{hint.glyph}</span>
    {hint.description !== undefined && <span className="mc-document-viewer__bumper-description">{hint.description}</span>}
  </button>;
  return <section {...props} ref={ref} aria-label={props['aria-label'] ?? label} aria-disabled={disabled || undefined} tabIndex={props.tabIndex ?? -1}
    className={['mc-document-viewer', className].filter(Boolean).join(' ')} data-value={acceptedId ?? ''}
    style={{ ...chrome, '--mc-document-unit': `${scale}px`, width: size[0] * scale, height: size[1] * scale, ...style } as CSSProperties}
    onClick={event => {
      onClick?.(event); if (event.defaultPrevented || disabled) return;
      const target = event.target as Node;
      if (backNode.current?.contains(target)) { onBack?.(event); return; }
      const direction = previousNode.current?.contains(target) ? -1 : nextNode.current?.contains(target) ? 1 : undefined;
      if (direction !== undefined) { const topic = adjacent(direction); if (topic) request(topic.id, direction < 0 ? 'previous' : 'next', event); return; }
      const topic = topics.find(candidate => nodes.current.get(candidate.id)?.contains(target));
      if (topic) request(topic.id, 'activate', event);
    }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled || event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') {
        const target = event.target as HTMLElement;
        if (target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
        onBack?.(event); event.preventDefault(); return;
      }
      const current = enabled.findIndex(topic => nodes.current.get(topic.id) === event.target);
      if (current < 0) return;
      let next: DocumentTopic | undefined;
      if (event.key === 'Home') next = enabled[0]; else if (event.key === 'End') next = enabled.at(-1);
      else if (event.key === 'ArrowUp') next = enabled[Math.max(0, current - 1)]; else if (event.key === 'ArrowDown') next = enabled[Math.min(enabled.length - 1, current + 1)];
      if (next) {
        const button = nodes.current.get(next.id); setFocused(next.id); button?.focus({ preventScroll: true });
        const viewport = navigationViewport.current;
        if (viewport && button) {
          const pane = viewport.getBoundingClientRect(), row = button.getBoundingClientRect(), ratio = pane.height > 0 ? viewport.clientHeight / pane.height : 1;
          if (row.top < pane.top) viewport.scrollTop += (row.top - pane.top) * ratio;
          else if (row.bottom > pane.bottom) viewport.scrollTop += (row.bottom - pane.bottom) * ratio;
        }
        event.preventDefault();
      }
    }}>
    <header className="mc-document-viewer__header">
      <button ref={backNode} type="button" className="mc-document-viewer__back" aria-label={backLabel} disabled={disabled}><span aria-hidden="true"/></button>
      <h1 className="mc-document-viewer__title">{accepted?.sectionTitle ?? accepted?.title}</h1>
      <div className="mc-document-viewer__hints">{hintButton(previousHint, -1)}{headerHints}{hintButton(nextHint, 1)}</div>
    </header>
    <ScrollArea variant="document" scale={scale} className="mc-document-viewer__navigation" label={`${label}: topics`} viewportRef={attachNavigation}
      scrollbarVisibility="always" contentProps={{ className: 'mc-document-viewer__navigation-content' }} onScrollPositionChange={navigationScroll}>
      <div className="mc-document-viewer__topic-list" role="tablist" aria-label={`${label}: topics`} aria-orientation="vertical">
        {groups.map(group => <div className="mc-document-viewer__group" key={group.id} role="group" aria-labelledby={group.label === undefined ? undefined : `${uid}-group-${encodeURIComponent(group.id)}`}>
          {group.label !== undefined && <h2 className="mc-document-viewer__group-heading" id={`${uid}-group-${encodeURIComponent(group.id)}`}><span className="mc-document-viewer__group-label">{group.label}</span></h2>}
          {group.topics.map(topic => <button key={topic.id} ref={refs.get(topic.id)} type="button" role="tab" className="mc-document-viewer__topic" data-topic-id={topic.id}
            id={tabId(topic.id)} aria-controls={panelId(topic.id)} aria-selected={accepted?.id === topic.id} aria-label={topic.label} disabled={disabled || topic.disabled}
            tabIndex={!disabled && roving === topic.id ? 0 : -1} onFocus={() => setFocused(topic.id)}>
            <span className="mc-document-viewer__topic-skin" aria-hidden="true"/><span className="mc-document-viewer__topic-border" aria-hidden="true"/>
            <span className="mc-document-viewer__topic-content"><span className="mc-document-viewer__topic-label">{topic.title}</span>
              {topic.showArrow && <span className="mc-document-viewer__topic-arrow" aria-hidden="true"/>}</span>
          </button>)}
        </div>)}
      </div>
    </ScrollArea>
    <div className="mc-document-viewer__divider" aria-hidden="true"/>
    <div className="mc-document-viewer__content-wrapper">
      <ScrollArea variant="document" scale={scale} className="mc-document-viewer__content" label={`${label}: document`} viewportRef={attachContent}
        scrollbarVisibility="always" contentProps={{ className: 'mc-document-viewer__article-stack' }} onScrollPositionChange={contentScroll}>
        <div className="mc-document-viewer__leading" aria-hidden="true"/>
        {topics.map(topic => <article key={topic.id} className="mc-document-viewer__article" id={panelId(topic.id)} role="tabpanel" aria-labelledby={tabId(topic.id)} hidden={accepted?.id !== topic.id}>{topic.content}</article>)}
        {!accepted && <div className="mc-document-viewer__empty">{emptyContent}</div>}
        <div className="mc-document-viewer__trailing" aria-hidden="true"/>
      </ScrollArea>
    </div>
  </section>;
});
