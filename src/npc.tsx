import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref, SyntheticEvent, TextareaHTMLAttributes } from 'react';
import { Button, Switch } from './components';
import { Image } from './image';
import { GuiIcon } from './gui-icon';
import { ScrollArea } from './scroll-area';
import type { ScrollAreaProps } from './scroll-area';
import { npcImageAssets } from './npc-image-assets';
import { commandBlockImageAssets } from './command-block-image-assets';
import { bookAssets } from './book-assets';
import { guiIconAssets } from './gui-icon-assets';
import { workstationImageAssets } from './workstation-image-assets';
import { jigsawImageAssets } from './jigsaw-image-assets';

export interface NpcPortraitProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  actor?: ReactNode;
  variant?: 'skin' | 'dialogue';
  size?: readonly [number, number];
  scale?: number;
}
export interface NpcSkin { id: string; label: string; actor?: ReactNode; disabled?: boolean; selectedVisible?: boolean }
export interface NpcSkinChangeDetail { skin: Readonly<NpcSkin>; index: number; event: MouseEvent<HTMLButtonElement> }
export interface NpcSkinPageDetail { direction: 'previous' | 'next'; event: MouseEvent<HTMLButtonElement> }
export interface NpcSkinPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue' | 'onChange'> {
  skins: readonly NpcSkin[];
  value?: string | null; defaultValue?: string | null;
  onValueChange?: (id: string, detail: NpcSkinChangeDetail) => void;
  page?: number; defaultPage?: number;
  onPageChange?: (page: number, detail: NpcSkinPageDetail) => void;
  /** Host-resolved source grid dimensions. Source declares a bound grid, not a fixed count. */
  columns?: number; rows?: number;
  cycleVisible?: boolean;
  disabled?: boolean; readOnly?: boolean;
  previousLabel?: string; nextLabel?: string;
  onSkinHover?: (id: string | null, event: SyntheticEvent<HTMLButtonElement>) => void;
  buttonRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
  scale?: number;
}
export type NpcActionKind = 'url' | 'command';
export interface NpcActionValue {
  id: string; kind: NpcActionKind; text: string; buttonName: string;
  buttonMode: boolean; onEnter: boolean; onExit: boolean;
}
export type NpcActionField = 'text' | 'buttonName' | 'buttonMode' | 'onEnter' | 'onExit';
export interface NpcActionChangeDetail { field: NpcActionField; event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> }
export type NpcActionError = 'none' | 'EmptyUri' | 'InvalidUri';
export interface NpcActionState {
  visible?: boolean; textEnabled?: boolean; buttonNameVisible?: boolean; buttonNameEnabled?: boolean;
  actionModeVisible?: boolean; buttonNameLabelVisible?: boolean; errorStatus?: NpcActionError;
  deleteVisible?: boolean; deleteEnabled?: boolean; expandVisible?: boolean; expandEnabled?: boolean;
  toggleEnabled?: Partial<Record<'buttonMode' | 'onEnter' | 'onExit', boolean>>;
}
export type NpcNativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'disabled' | 'readOnly' | 'children' | 'dangerouslySetInnerHTML' | 'maxLength'>;
export type NpcNativeTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'disabled' | 'readOnly' | 'children' | 'dangerouslySetInnerHTML' | 'maxLength'>;
export interface NpcNavigationDetail { reason: 'button' | 'escape'; event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement> }
export interface NpcLabels {
  title: string; advancedTitle: string; name: string; dialogue: string; appearance: string; editDialogue: string; advanced: string;
  back: string; close: string; addUrl: string; addCommand: string; commandTitle: string; urlTitle: string;
  buttonName: string; buttonMode: string; onEnter: string; onExit: string; urlWarningEmpty: string; urlWarningInvalid: string;
  urlPlaceholder: string; commandPlaceholder: string; dialoguePlaceholder: string; skinPrevious: string; skinNext: string;
  deleteAction: string; expandAction: string; minimizeAction: string; commandHelpA: string; commandHelpB: string; urlHelpA: string; urlHelpB: string;
  immersiveReader: string;
}

const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const defaults: NpcLabels = { title: 'Non Player Character', advancedTitle: 'Advanced NPC Settings', name: 'Name', dialogue: 'Dialog', appearance: 'Appearance', editDialogue: 'Edit Dialog', advanced: 'Advanced Settings', back: 'Back', close: 'Close', addUrl: 'Add URL', addCommand: 'Add Command', commandTitle: 'Command', urlTitle: 'URL', buttonName: 'Button Name', buttonMode: 'Button Mode', onEnter: 'On Enter', onExit: 'On Exit', urlWarningEmpty: 'If no URL is added, this button will open a new browser window.', urlWarningInvalid: 'Only URLs beginning with "http" or "https" are supported.', urlPlaceholder: 'Type URL Here...', commandPlaceholder: 'Type Command Here...', dialoguePlaceholder: 'Type Dialog Here...', skinPrevious: 'Previous skin page', skinNext: 'Next skin page', deleteAction: 'Delete action', expandAction: 'Expand action', minimizeAction: 'Minimize action', commandHelpA: 'Click this button to add a command in the NPC dialog box.', commandHelpB: 'Multiple commands can be added at once.', urlHelpA: 'Click this button to add a URL hyperlink in the NPC dialog box.', urlHelpB: "Link opens in the player's default browser.", immersiveReader: 'Immersive Reader' };
const textLabels = (overrides?: Partial<NpcLabels>): NpcLabels => ({ ...defaults, ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined)) });
function scaleValue(scale: number) { if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('NPC scale must be a positive safe integer.'); }
function dimensions(size: readonly [number, number], scale: number) { if (size.length !== 2 || ![...size].every(value => Number.isFinite(value) && value > 0 && Number.isFinite(value * scale))) throw new RangeError('NPC dimensions must be a positive finite pair.'); }
function unique(items: readonly { id: string }[]) { const ids = new Set<string>(); for (const item of items) { if (!item.id || typeof item.id !== 'string' || ids.has(item.id)) throw new RangeError('NPC item ids must be nonempty and unique.'); ids.add(item.id); } }
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) { if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }
function useDraft<T>(value: T | undefined, initial: () => T) { const [inside, setInside] = useState(initial); return [value === undefined ? inside : value, (next: T) => { if (value === undefined) setInside(next); }] as const; }
function initialAction(id: string, value?: Partial<NpcActionValue>): NpcActionValue { return { id, kind: 'command', text: '', buttonName: '', buttonMode: false, onEnter: false, onExit: false, ...Object.fromEntries(Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined)) }; }
function validateAction(value: NpcActionValue) { if (!value.id || !['command', 'url'].includes(value.kind)) throw new RangeError('NPC actions require a stable id and command or url kind.'); }
function copyEditor(value: NpcEditorValue): NpcEditorValue { return { ...value, actions: value.actions.map(action => ({ ...action })) }; }
function imageURL(value: string) { return `url(${JSON.stringify(value)})`; }
function closeSkin(kind: 'close' | 'back' | 'minimize'): CSSProperties {
  const urls = kind === 'back' ? [npcImageAssets.back_button_default.url, npcImageAssets.back_button_hover.url, npcImageAssets.back_button_pressed.url] : kind === 'minimize' ? [commandBlockImageAssets.minimize.url, commandBlockImageAssets.minimizeHover.url, commandBlockImageAssets.minimizePress.url] : [bookAssets.close_button_default.url, bookAssets.close_button_hover.url, bookAssets.close_button_pressed.url];
  return { '--mc-npc-close': imageURL(urls[0]!), '--mc-npc-close-hover': imageURL(urls[1]!), '--mc-npc-close-pressed': imageURL(urls[2]!) } as CSSProperties;
}
function npcSkin(scale: number): CSSProperties {
  return { '--mc-npc-u': `${scale}px`, '--mc-npc-opaque': imageURL(workstationImageAssets.panel.url),
    '--mc-npc-control': imageURL(jigsawImageAssets.control.url), '--mc-npc-focus': imageURL(workstationImageAssets.focus.url),
    '--mc-npc-bubble': imageURL(npcImageAssets.dialog_bubble.url), '--mc-npc-point': imageURL(npcImageAssets.dialog_bubble_point.url),
    '--mc-npc-teacher-frame': imageURL(commandBlockImageAssets.dialog_background_hollow_3.url),
    '--mc-npc-trash': imageURL(npcImageAssets.trash_default.url), '--mc-npc-trash-hover': imageURL(bookAssets.trash_hover.url), '--mc-npc-trash-pressed': imageURL(bookAssets.trash_pressed.url),
    '--mc-npc-notification': imageURL(npcImageAssets.background_indent_no_top.url),
    '--mc-npc-toggle-on': imageURL(npcImageAssets.toggle_on.url), '--mc-npc-toggle-on-hover': imageURL(npcImageAssets.toggle_on_hover.url),
    '--mc-npc-chevron-left': imageURL(guiIconAssets['chevron-left'].url), '--mc-npc-chevron-right': imageURL(guiIconAssets['chevron-right'].url) } as CSSProperties;
}
function useNpcScope(ref: Ref<HTMLElement>) {
  const root = useRef<HTMLElement | null>(null), composition = useRef(new Set<EventTarget>()); const [, refresh] = useState(0);
  const attach = useCallback((node: HTMLElement | null) => { root.current = node; assignRef(ref, node); }, [ref]);
  const prune = () => { let changed = false; for (const target of composition.current) if (!(target as Node).isConnected || (root.current && !root.current.contains(target as Node))) { composition.current.delete(target); changed = true; } return changed; };
  const composing = () => { prune(); return composition.current.size > 0; };
  // An accepted schema deletion can detach an IME target without compositionend.
  // Release only that absent target after commit, before painting a held page.
  useSafeLayoutEffect(() => { if (prune()) refresh(n => n + 1); });
  return { root, attach, composing, start: (target: EventTarget) => { composition.current.add(target); refresh(n => n + 1); }, end: (target: EventTarget) => { composition.current.delete(target); refresh(n => n + 1); } };
}
function blurText(event: KeyboardEvent<HTMLElement>) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (target.ownerDocument?.activeElement === target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit'].includes((target as HTMLInputElement).type)))) { event.preventDefault(); target.blur(); const doc = target.ownerDocument; if (event.currentTarget.isConnected && (doc.activeElement === doc.body || doc.activeElement === doc.documentElement)) event.currentTarget.focus({ preventScroll: true }); return true; }
  return false;
}
function escapeAllowed(event: KeyboardEvent<HTMLElement>, disabled: boolean, composing: boolean) { return !event.defaultPrevented && !disabled && !composing && !event.nativeEvent.isComposing && event.keyCode !== 229 && event.key === 'Escape'; }

/** A named host actor slot. No actor, texture, world or portrait renderer is synthesized. */
export const NpcPortrait = forwardRef<HTMLDivElement, NpcPortraitProps>(function NpcPortrait({ actor, variant = 'skin', size = variant === 'skin' ? [40, 65] : [80, 97], scale = 2, className, style, ...props }, ref) {
  scaleValue(scale); dimensions(size, scale);
  return <div {...props} ref={ref} className={['mc-npc-portrait', className].filter(Boolean).join(' ')} data-variant={variant} style={{ '--mc-npc-u': `${scale}px`, width: size[0] * scale, height: size[1] * scale, ...style } as CSSProperties}>
    <div className="mc-npc-portrait__clip"><div className="mc-npc-portrait__model">{actor}</div></div>
  </div>;
});

/** Paged source grid with stable caller skin IDs; grid dimensions are a host resolution. */
export const NpcSkinPicker = forwardRef<HTMLDivElement, NpcSkinPickerProps>(function NpcSkinPicker({ skins, value, defaultValue, onValueChange, page: controlledPage, defaultPage = 0, onPageChange, columns = 4, rows = 1, cycleVisible, disabled = false, readOnly = false, previousLabel = defaults.skinPrevious, nextLabel = defaults.skinNext, onSkinHover, buttonRefs, scale = 2, className, style, ...props }, ref) {
  scaleValue(scale); unique(skins); if (![columns, rows].every(n => Number.isSafeInteger(n) && n > 0) || columns * rows > 256) throw new RangeError('NPC skin grid dimensions must be positive integers with at most 256 cells.');
  const [selected, setSelected] = useDraft(value, () => defaultValue === undefined ? skins[0]?.id ?? null : defaultValue), [requestedPage, setPage] = useDraft(controlledPage, () => defaultPage);
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 0) throw new RangeError('NPC skin page must be a nonnegative safe integer.');
  const capacity = columns * rows, count = Math.max(1, Math.ceil(skins.length / capacity)), page = Math.min(requestedPage, count - 1), entries = skins.slice(page * capacity, (page + 1) * capacity), cycles = cycleVisible ?? count > 1;
  const changePage = (next: number, detail: NpcSkinPageDetail) => { if (disabled || next < 0 || next >= count || detail.event.defaultPrevented) return; setPage(next); onPageChange?.(next, detail); };
  return <div {...props} ref={ref} className={['mc-npc-skin-picker', className].filter(Boolean).join(' ')} data-page={page} data-requested-page={requestedPage} data-selected-skin={selected ?? ''} style={{ ...npcSkin(scale), ...style }}>
    <Button className="mc-npc-skin-picker__previous" hidden={!cycles} disabled={disabled || page === 0} aria-label={previousLabel} onClick={event => changePage(page - 1, { direction: 'previous', event })}><span className="mc-npc-skin-picker__chevron" data-direction="left"/></Button>
    <div className="mc-npc-skin-picker__grid" style={{ gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`, gridTemplateRows: `repeat(${rows},minmax(0,1fr))` }}>{entries.map((skin, index) => <div className="mc-npc-skin-picker__cell" key={skin.id} data-skin-id={skin.id}>
      <NpcPortrait actor={skin.actor} size={[160 / columns, 65 / rows]} scale={scale}/>
      <button type="button" ref={buttonRefs?.[skin.id]} className="mc-npc-skin-picker__skin" aria-label={skin.label} aria-pressed={selected === skin.id} disabled={disabled || skin.disabled} aria-readonly={readOnly || undefined}
        onClick={event => { if (event.defaultPrevented || disabled || readOnly || skin.disabled) return; setSelected(skin.id); onValueChange?.(skin.id, { skin: { ...skin }, index: page * capacity + index, event }); }}
        onPointerEnter={event => { if (!disabled && !skin.disabled) onSkinHover?.(skin.id, event); }} onPointerLeave={event => onSkinHover?.(null, event)} onFocus={event => { if (!disabled && !skin.disabled) onSkinHover?.(skin.id, event); }} onBlur={event => onSkinHover?.(null, event)}/>
      <span className="mc-npc-skin-picker__selected" hidden={!(skin.selectedVisible ?? selected === skin.id)} aria-hidden="true"/>
    </div>)}</div>
    <Button className="mc-npc-skin-picker__next" hidden={!cycles} disabled={disabled || page >= count - 1} aria-label={nextLabel} onClick={event => changePage(page + 1, { direction: 'next', event })}><span className="mc-npc-skin-picker__chevron" data-direction="right"/></Button>
  </div>;
});

/** One live-bound action textarea, retained across compact/maximized Web views.
 * Native compact/global-max buffer copy timing is not recovered by this policy. */
export const NpcActionEditor = forwardRef<HTMLElement, NpcActionEditorProps>(function NpcActionEditor({ value, defaultValue, onValueChange, state = {}, commandsEnabled = true, maximized: controlledMaximized, defaultMaximized = false, onMaximizedChange, onDelete, disabled = false, readOnly = false, labels: overrides, textareaProps = {}, textareaRef, buttonNameProps = {}, buttonNameRef, toggleRefs, scale = 2, className, style, onKeyDown, onCompositionStartCapture, onCompositionEndCapture, ...props }, ref) {
  scaleValue(scale); const uid = useId(), labels = textLabels(overrides), scope = useNpcScope(ref);
  const [draft, setDraft] = useDraft(value, () => initialAction(`npc-action-${uid}`, defaultValue)); validateAction(draft);
  const [requestedMaximized, setMaximized] = useDraft(controlledMaximized, () => defaultMaximized), held = useRef(requestedMaximized);
  if (!scope.composing()) held.current = requestedMaximized;
  const maximized = scope.composing() ? held.current : requestedMaximized;
  const textNode = useRef<HTMLTextAreaElement | null>(null), attachText = useCallback((node: HTMLTextAreaElement | null) => { textNode.current = node; assignRef(textareaRef, node); }, [textareaRef]);
  const [focusRequest, setFocusRequest] = useState<{ next: boolean; button: HTMLButtonElement; owned: boolean } | null>(null);
  useSafeLayoutEffect(() => { if (!focusRequest || maximized !== focusRequest.next) return; const doc = focusRequest.button.ownerDocument; if (focusRequest.owned && !disabled && (doc.activeElement === focusRequest.button || doc.activeElement === doc.body || doc.activeElement === doc.documentElement)) textNode.current?.focus(); setFocusRequest(null); }, [focusRequest, maximized, disabled]);
  const lockedTemplate = disabled || (draft.kind === 'command' && !commandsEnabled);
  const update = (field: NpcActionField, next: string | boolean, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { if (event.defaultPrevented || readOnly || lockedTemplate) return; if (field === 'text' && state.textEnabled === false || field === 'buttonName' && state.buttonNameEnabled === false || typeof next === 'boolean' && state.toggleEnabled?.[field as 'buttonMode'] === false) return; const result = { ...draft, [field]: next }; setDraft(result); onValueChange?.({ ...result }, { field, event }); };
  const requestMaximized = (next: boolean, detail: NpcNavigationDetail) => { if (disabled || scope.composing() || detail.event.defaultPrevented || next && (lockedTemplate || state.expandEnabled === false)) return; if (detail.event.currentTarget.tagName === 'BUTTON') { const button = detail.event.currentTarget as HTMLButtonElement; setFocusRequest({ next, button, owned: button.ownerDocument.activeElement === button }); } setMaximized(next); onMaximizedChange?.(next, detail); };
  const textId = textareaProps.id ?? `${uid}-text`, nameId = buttonNameProps.id ?? `${uid}-button-name`;
  return <section {...props} ref={scope.attach} tabIndex={props.tabIndex ?? -1} className={['mc-npc-action-editor', className].filter(Boolean).join(' ')} data-npc-action-id={draft.id} data-kind={draft.kind} data-maximized={maximized} hidden={props.hidden || state.visible === false} style={{ ...npcSkin(scale), ...style }}
    onCompositionStartCapture={event => { scope.start(event.target); onCompositionStartCapture?.(event); }} onCompositionEndCapture={event => { scope.end(event.target); onCompositionEndCapture?.(event); }}
    onKeyDown={event => { onKeyDown?.(event); if (!escapeAllowed(event, disabled, scope.composing()) || blurText(event)) return; if (maximized) { requestMaximized(false, { reason: 'escape', event }); event.preventDefault(); } }}>
    <button type="button" className="mc-npc-action-editor__delete" aria-label={labels.deleteAction} hidden={state.deleteVisible === false} disabled={disabled || readOnly || state.deleteEnabled === false} onClick={event => { if (!event.defaultPrevented && !disabled && !readOnly && !scope.composing() && state.deleteEnabled !== false) onDelete?.({ ...draft }, event); }}/>
    <div className="mc-npc-action-editor__stack">
      <label className="mc-npc-action-editor__title" htmlFor={textId}>{draft.kind === 'url' ? labels.urlTitle : labels.commandTitle}</label>
      <div className="mc-npc-action-editor__text-row"><div className="mc-npc-action-editor__editbox"><div className="mc-npc-action-editor__centering"><div className="mc-npc-action-editor__clip">
        <textarea {...textareaProps} ref={attachText} id={textId} className={['mc-npc-action-editor__textarea', textareaProps.className].filter(Boolean).join(' ')} value={draft.text} maxLength={1024} disabled={lockedTemplate || state.textEnabled === false} readOnly={readOnly} spellCheck={textareaProps.spellCheck ?? false} placeholder={textareaProps.placeholder ?? (draft.kind === 'url' ? labels.urlPlaceholder : labels.commandPlaceholder)}
          onChange={event => { textareaProps.onChange?.(event); update('text', event.currentTarget.value, event); }}/>
      </div></div></div><Button className="mc-npc-action-editor__expand" aria-label={labels.expandAction} hidden={state.expandVisible === false} disabled={lockedTemplate || state.expandEnabled === false} onClick={event => requestMaximized(true, { reason: 'button', event })}><GuiIcon name="plus" scale={scale} style={{ width: 15 * scale, height: 15 * scale }}/></Button></div>
      <div className="mc-npc-action-editor__notification" role="status" hidden={!state.errorStatus || state.errorStatus === 'none'}><GuiIcon name="warning-glyph" scale={scale}/><span>{state.errorStatus === 'EmptyUri' ? labels.urlWarningEmpty : labels.urlWarningInvalid}</span></div>
      <div className="mc-npc-action-editor__template-pad"/>
      <div className="mc-npc-action-editor__mode" hidden={draft.kind === 'url' || state.actionModeVisible === false}>{(['buttonMode', 'onEnter', 'onExit'] as const).map(field => <Switch key={field} ref={toggleRefs?.[field]} label={labels[field]} checked={draft[field]} disabled={lockedTemplate || state.toggleEnabled?.[field] === false} readOnly={readOnly} aria-readonly={readOnly || undefined} data-npc-action-field={field}
        onClick={event => { if (readOnly) event.preventDefault(); }} onChange={event => update(field, event.currentTarget.checked, event)}/>)}</div>
      <div className="mc-npc-action-editor__template-pad"/>
      <label className="mc-npc-action-editor__button-label" htmlFor={nameId} hidden={draft.kind !== 'url' || state.buttonNameLabelVisible === false}>{labels.buttonName}</label>
      <div className="mc-npc-action-editor__single" hidden={state.buttonNameVisible === false}><input {...buttonNameProps} ref={buttonNameRef} id={nameId} type="text" aria-label={buttonNameProps['aria-label'] ?? labels.buttonName} value={draft.buttonName} maxLength={128} disabled={lockedTemplate || state.buttonNameEnabled === false} readOnly={readOnly} spellCheck={buttonNameProps.spellCheck ?? false}
        onChange={event => { buttonNameProps.onChange?.(event); update('buttonName', event.currentTarget.value, event); }}/></div>
    </div>
    <button type="button" className="mc-npc-close mc-npc-action-editor__minimize" aria-label={labels.minimizeAction} hidden={!maximized} style={closeSkin('minimize')} disabled={disabled} onClick={event => requestMaximized(false, { reason: 'button', event })}/>
  </section>;
});

/** Read-only student text and worldbuilder editing share the same true textarea.
 * The circular source %cm sizing is resolved by an explicit, overridable Web layout. */
export const NpcDialogue = forwardRef<HTMLElement, NpcDialogueProps>(function NpcDialogue({ title = 'NPC', value, defaultValue = '', onValueChange, worldBuilder = false, disabled = false, readOnly = false, actor, actions = [], onAction, onClose, closeVisible = true, closeEnabled = true, educationEdition = false, readerVisible = false, onReaderRequest, labels: overrides, width = 320, scale = 2, layout, textareaProps = {}, textareaRef, scrollViewportProps, scrollViewportRef, actionRefs, className, style, onKeyDown, onCompositionStartCapture, onCompositionEndCapture, ...props }, ref) {
  scaleValue(scale); if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(width * scale)) throw new RangeError('NPC dialogue width must be positive and finite.'); unique(actions);
  const resolved = { contentTop: 24, contentInset: 8, titleTop: 9, bottomPadding: 8, ...Object.fromEntries(Object.entries(layout ?? {}).filter(([, entry]) => entry !== undefined)) };
  if (!Object.values(resolved).every(entry => Number.isFinite(entry) && entry >= 0) || resolved.contentInset * 2 >= width) throw new RangeError('NPC dialogue layout must have finite nonnegative insets and a positive content width.');
  const [dialogue, setDialogue] = useDraft(value, () => defaultValue), labels = textLabels(overrides), scope = useNpcScope(ref), uid = useId();
  const textNode = useRef<HTMLTextAreaElement | null>(null), viewport = useRef<HTMLDivElement | null>(null);
  const attachText = useCallback((node: HTMLTextAreaElement | null) => { textNode.current = node; assignRef(textareaRef, node); }, [textareaRef]);
  const attachViewport = useCallback((node: HTMLDivElement | null) => { viewport.current = node; assignRef(scrollViewportRef, node); }, [scrollViewportRef]);
  useSafeLayoutEffect(() => {
    const node = textNode.current; if (!node || textareaProps.style?.height !== undefined) return;
    const doc = node.ownerDocument, view = doc.defaultView; let cancelled = false, lastWidth = -1;
    const measure = () => { if (cancelled || node.clientWidth <= 0) return; node.style.height = '0px'; node.style.height = `${Math.max(scale * 10, node.scrollHeight)}px`; if (worldBuilder && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight; };
    const observer = typeof view?.ResizeObserver === 'undefined' ? undefined : new view.ResizeObserver(() => { if (node.clientWidth !== lastWidth) { lastWidth = node.clientWidth; measure(); } });
    observer?.observe(node); doc.fonts?.addEventListener('loadingdone', measure); void doc.fonts?.ready.then(() => { if (!cancelled) measure(); }); measure();
    return () => { cancelled = true; observer?.disconnect(); doc.fonts?.removeEventListener('loadingdone', measure); };
  }, [dialogue, worldBuilder, scale, textareaProps.style?.height]);
  const textId = textareaProps.id ?? `${uid}-dialogue`;
  return <section {...props} ref={scope.attach} tabIndex={props.tabIndex ?? -1} className={['mc-npc-dialogue', className].filter(Boolean).join(' ')} data-worldbuilder={worldBuilder} data-npc-source-layout="web-resolved-form-fitting"
    aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? `${uid}-title`}
    style={{ ...npcSkin(scale), width: width * scale, '--mc-npc-dialogue-top': `${resolved.contentTop * scale}px`, '--mc-npc-dialogue-inset': `${resolved.contentInset * scale}px`, '--mc-npc-dialogue-title-top': `${resolved.titleTop * scale}px`, '--mc-npc-dialogue-bottom': `${resolved.bottomPadding * scale}px`, ...style } as CSSProperties}
    onCompositionStartCapture={event => { scope.start(event.target); onCompositionStartCapture?.(event); }} onCompositionEndCapture={event => { scope.end(event.target); onCompositionEndCapture?.(event); }}
    onKeyDown={event => { onKeyDown?.(event); if (!escapeAllowed(event, disabled, scope.composing()) || blurText(event) || !closeEnabled) return; onClose?.(dialogue, { reason: 'escape', event }); event.preventDefault(); }}>
    <div className="mc-npc-dialogue__skin" aria-hidden="true"/><h2 id={`${uid}-title`} className="mc-npc-dialogue__title">{title}</h2>
    <div className="mc-npc-dialogue__content"><div className="mc-npc-dialogue__stack">
      <div className="mc-npc-dialogue__message">
        <NpcPortrait className="mc-npc-dialogue__portrait" actor={actor} variant="dialogue" size={[Math.max(1, width - resolved.contentInset * 2 - 224), 97]} scale={scale}/>
        <button type="button" className="mc-npc-dialogue__reader" hidden={!educationEdition || worldBuilder || !readerVisible} disabled={disabled} aria-label={labels.immersiveReader}
          onClick={event => { if (!event.defaultPrevented && !disabled && !scope.composing()) onReaderRequest?.(dialogue, event); }}><Image src={npcImageAssets.immersive_reader.url} sourceSize={npcImageAssets.immersive_reader.sourceSize} size={[18, 18]} scale={scale} alt=""/></button>
        <span className="mc-npc-dialogue__point" aria-hidden="true"/>
        <div className="mc-npc-dialogue__bubble"><ScrollArea className="mc-npc-dialogue__scroll" scale={scale} label={labels.dialogue} viewportRef={attachViewport} viewportProps={scrollViewportProps} contentProps={{ className: 'mc-npc-dialogue__text-content' }}>
          <textarea {...textareaProps} ref={attachText} id={textId} aria-label={textareaProps['aria-label'] ?? labels.dialogue} className={['mc-npc-dialogue__text', textareaProps.className].filter(Boolean).join(' ')} value={dialogue} maxLength={1000} readOnly={!worldBuilder || readOnly} disabled={disabled} spellCheck={textareaProps.spellCheck ?? false} placeholder={worldBuilder ? textareaProps.placeholder ?? labels.dialoguePlaceholder : ''}
            onChange={event => { textareaProps.onChange?.(event); if (!event.defaultPrevented && worldBuilder && !disabled && !readOnly) { setDialogue(event.currentTarget.value); onValueChange?.(event.currentTarget.value, event); } }}/>
        </ScrollArea></div>
      </div>
      <div className="mc-npc-dialogue__buttons">{actions.map((action, index) => <div key={action.id} className="mc-npc-dialogue__button-cell" data-npc-dialogue-action-id={action.id} hidden={action.visible === false}><Button ref={actionRefs?.[action.id]} data-kind={action.kind ?? 'command'} disabled={disabled || action.disabled} onClick={event => { if (!event.defaultPrevented && !disabled && !action.disabled && !scope.composing()) onAction?.(action.id, { action: { ...action }, index, event }); }}>{action.label}</Button></div>)}</div>
    </div><div className="mc-npc-close-holder"><button type="button" className="mc-npc-close" style={closeSkin('close')} hidden={!closeVisible} disabled={disabled || !closeEnabled} aria-label={labels.close}
      onClick={event => { if (!event.defaultPrevented && !disabled && closeEnabled && !scope.composing()) onClose?.(dialogue, { reason: 'button', event }); }}/></div></div>
  </section>;
});

/** Teacher basic/advanced composition, with host-owned actor and action data.
 * Local Add/Delete are UI draft edits; no URL, command or education service runs. */
export const NpcEditor = forwardRef<HTMLElement, NpcEditorProps>(function NpcEditor({ value, defaultValue, onValueChange, page: controlledPage, defaultPage = 'basic', onPageChange, maximizedActionId: controlledMaximized, defaultMaximizedActionId = null, onMaximizedActionChange, onClose, title, labels: overrides, skins = [], actor, skinPage, defaultSkinPage, onSkinPageChange, skinColumns, skinRows, cycleVisible, educationEdition = false, commandsEnabled = true, addButtonsEnabled = true, helpVisible = true, disabled = false, readOnly = false, closeVisible = true, closeEnabled = true, actionStates = {}, pageVisibility = {}, size = [325, 200], dialogueWidth = 320, dialogueLayout, scale = 2, nameProps = {}, nameRef, dialogueProps, dialogueRef, actionTextareaProps, actionTextareaRefs, actionButtonNameRefs, skinButtonRefs, advancedViewportProps, advancedViewportRef, dialogueViewportProps, dialogueViewportRef, className, style, onKeyDown, onCompositionStartCapture, onCompositionEndCapture, ...props }, ref) {
  scaleValue(scale); dimensions(size, scale); const labels = textLabels(overrides), uid = useId(), scope = useNpcScope(ref), serial = useRef(0);
  const [draft, setDraft] = useDraft(value, () => copyEditor({ name: '', dialogue: '', skinId: null, actions: [], ...Object.fromEntries(Object.entries(defaultValue ?? {}).filter(([, entry]) => entry !== undefined)) })); unique(draft.actions); for (const action of draft.actions) validateAction(action);
  const [requestedPage, setPage] = useDraft(controlledPage, () => defaultPage), [requestedMaximized, setMaximized] = useDraft(controlledMaximized, () => defaultMaximizedActionId);
  if (!['basic', 'advanced', 'dialogue'].includes(requestedPage)) throw new RangeError('Unknown NPC editor page.');
  const held = useRef({ page: requestedPage, maximized: requestedMaximized }); if (!scope.composing()) held.current = { page: requestedPage, maximized: requestedMaximized };
  const page = scope.composing() ? held.current.page : requestedPage, proposedMaximized = scope.composing() ? held.current.maximized : requestedMaximized, maximized = draft.actions.some(action => action.id === proposedMaximized) ? proposedMaximized : null;
  const latest = useRef(draft); latest.current = draft;
  const update = (next: NpcEditorValue, detail: NpcEditorChangeDetail) => { if (disabled || readOnly || detail.event?.defaultPrevented) return; const accepted = copyEditor(next); setDraft(accepted); onValueChange?.(copyEditor(accepted), detail); };
  const focusEscapeScope = (detail: NpcNavigationDetail) => { const node = scope.root.current; if (detail.reason === 'escape' && node?.contains(node.ownerDocument.activeElement)) node.focus({ preventScroll: true }); };
  const requestPage = (next: NpcEditorPage, detail: NpcNavigationDetail) => { if (disabled || scope.composing() || detail.event.defaultPrevented) return; setPage(next); focusEscapeScope(detail); onPageChange?.(next, detail); };
  const requestMaximized = (id: string | null, detail: NpcNavigationDetail) => { if (disabled || scope.composing() || detail.event.defaultPrevented) return; setMaximized(id); focusEscapeScope(detail); onMaximizedActionChange?.(id, detail); };
  const add = (kind: NpcActionKind, event: MouseEvent<HTMLButtonElement>) => { if (disabled || readOnly || scope.composing() || !commandsEnabled || !addButtonsEnabled || event.defaultPrevented || kind === 'url' && !educationEdition) return; let id: string; do { id = `npc-${uid}-${++serial.current}`; } while (latest.current.actions.some(action => action.id === id)); update({ ...copyEditor(latest.current), actions: [...latest.current.actions, initialAction(id, { kind })] }, { field: 'actions', reason: 'add', actionId: id, event }); };
  const close = (detail: NpcNavigationDetail) => { if (disabled || !closeEnabled || scope.composing() || detail.event.defaultPrevented) return; if (maximized !== null) requestMaximized(null, detail); else if (page !== 'basic') requestPage('basic', detail); else onClose?.(copyEditor(latest.current), detail); };
  const basicVisible = pageVisibility.basic ?? page === 'basic', advancedVisible = pageVisibility.advanced ?? page === 'advanced', dialogueVisible = pageVisibility.dialogue ?? page === 'dialogue';
  return <section {...props} ref={scope.attach} tabIndex={props.tabIndex ?? -1} className={['mc-npc-editor', className].filter(Boolean).join(' ')} data-page={page} data-requested-page={requestedPage} data-maximized-action-id={maximized ?? ''} data-maximized={maximized !== null} data-education-edition={educationEdition}
    aria-label={props['aria-label'] ?? labels.title} style={{ ...npcSkin(scale), width: (dialogueVisible && !basicVisible && !advancedVisible ? dialogueWidth : size[0]) * scale, ...style }}
    onCompositionStartCapture={event => { scope.start(event.target); onCompositionStartCapture?.(event); }} onCompositionEndCapture={event => { scope.end(event.target); onCompositionEndCapture?.(event); }}
    onKeyDown={event => { onKeyDown?.(event); if (!escapeAllowed(event, disabled, scope.composing()) || blurText(event)) return; close({ reason: 'escape', event }); if (closeEnabled) event.preventDefault(); }}>
    <div className="mc-npc-editor__teacher" hidden={!basicVisible && !advancedVisible && maximized === null} style={{ width: size[0] * scale, height: size[1] * scale }}>
      <div className="mc-npc-editor__skin" aria-hidden="true"><span/></div><h2 className="mc-npc-editor__title">{title ?? (page === 'advanced' ? labels.advancedTitle : labels.title)}</h2>
      <div className="mc-npc-editor__indent">
        <div className="mc-npc-editor__basic" hidden={!basicVisible || maximized !== null}>
          <label htmlFor={nameProps.id ?? `${uid}-name`}>{labels.name}</label><div className="mc-npc-editor__name"><input {...nameProps} ref={nameRef} id={nameProps.id ?? `${uid}-name`} type="text" aria-label={nameProps['aria-label'] ?? labels.name} value={draft.name} maxLength={128} disabled={disabled} readOnly={readOnly} spellCheck={nameProps.spellCheck ?? false}
            onChange={event => { nameProps.onChange?.(event); if (!event.defaultPrevented) update({ ...copyEditor(latest.current), name: event.currentTarget.value }, { field: 'name', reason: 'edit', event }); }}/></div>
          <span className="mc-npc-editor__dialogue-label">{labels.dialogue}</span><div className="mc-npc-editor__dialogue-button"><Button disabled={disabled} onClick={event => requestPage('dialogue', { reason: 'button', event })}>{labels.editDialogue}</Button></div>
          <span className="mc-npc-editor__appearance-label">{labels.appearance}</span>
          <NpcSkinPicker skins={skins} value={draft.skinId} page={skinPage} defaultPage={defaultSkinPage} onPageChange={onSkinPageChange} columns={skinColumns} rows={skinRows} cycleVisible={cycleVisible} disabled={disabled} readOnly={readOnly} buttonRefs={skinButtonRefs} scale={scale}
            previousLabel={labels.skinPrevious} nextLabel={labels.skinNext} onValueChange={(id, detail) => update({ ...copyEditor(latest.current), skinId: id }, { field: 'skinId', reason: 'edit', event: detail.event })}/>
          <div className="mc-npc-editor__advanced-button"><Button disabled={disabled} onClick={event => requestPage('advanced', { reason: 'button', event })}>{labels.advanced}</Button></div>
        </div>
        <ScrollArea className="mc-npc-editor__advanced" hidden={!advancedVisible && maximized === null} scale={scale} label={labels.advanced} viewportRef={advancedViewportRef}
          viewportProps={{ ...advancedViewportProps, tabIndex: maximized !== null ? -1 : advancedViewportProps?.tabIndex, style: { ...advancedViewportProps?.style, ...(maximized !== null ? { overflow: 'visible' } : {}) } }} contentProps={{ className: 'mc-npc-editor__advanced-content' }}>
          <div className="mc-npc-editor__advanced-stack"><div className="mc-npc-editor__help" hidden={!helpVisible || maximized !== null}>
            <div hidden={!educationEdition}><p>{labels.urlHelpA}</p><p>{labels.urlHelpB}</p></div><div><p>{labels.commandHelpA}</p><p>{labels.commandHelpB}</p></div>
          </div><div className="mc-npc-editor__middle-pad" hidden={maximized !== null}/><div className="mc-npc-editor__actions">{draft.actions.map(action => <div key={action.id} className="mc-npc-editor__action" hidden={actionStates[action.id]?.visible === false || maximized !== null && maximized !== action.id}>
            <NpcActionEditor value={action} state={actionStates[action.id]} commandsEnabled={commandsEnabled} maximized={maximized === action.id} disabled={disabled} readOnly={readOnly} labels={labels} scale={scale}
              textareaProps={actionTextareaProps?.[action.id]} textareaRef={actionTextareaRefs?.[action.id]} buttonNameRef={actionButtonNameRefs?.[action.id]}
              onValueChange={(next, detail) => { if (!latest.current.actions.some(item => item.id === action.id && item.kind === action.kind)) return; update({ ...copyEditor(latest.current), actions: latest.current.actions.map(item => item.id === action.id ? { ...next, id: item.id, kind: item.kind } : { ...item }) }, { field: 'actions', reason: 'edit', actionId: action.id, actionField: detail.field, event: detail.event }); }}
              onMaximizedChange={(next, detail) => requestMaximized(next ? action.id : null, detail)}
              onDelete={(_snapshot, event) => { if (scope.composing() || actionStates[action.id]?.deleteEnabled === false) return; update({ ...copyEditor(latest.current), actions: latest.current.actions.filter(item => item.id !== action.id).map(item => ({ ...item })) }, { field: 'actions', reason: 'delete', actionId: action.id, event }); }}/>
          </div>)}</div><div className="mc-npc-editor__add" hidden={maximized !== null}>
            <Button hidden={!educationEdition} disabled={disabled || readOnly || !commandsEnabled || !addButtonsEnabled} onClick={event => add('url', event)}>{labels.addUrl}</Button>
            <Button disabled={disabled || readOnly || !commandsEnabled || !addButtonsEnabled} onClick={event => add('command', event)}>{labels.addCommand}</Button>
          </div></div>
        </ScrollArea>
        <div className="mc-npc-close-holder"><button type="button" className="mc-npc-close" hidden={!closeVisible} disabled={disabled || !closeEnabled} style={closeSkin(maximized !== null ? 'minimize' : page === 'advanced' ? 'back' : 'close')} aria-label={maximized !== null ? labels.minimizeAction : page === 'advanced' ? labels.back : labels.close} onClick={event => close({ reason: 'button', event })}/></div>
      </div>
    </div>
    <NpcDialogue className="mc-npc-editor__dialogue" hidden={!dialogueVisible || maximized !== null} title={draft.name || 'NPC'} value={draft.dialogue} worldBuilder disabled={disabled} readOnly={readOnly} actor={actor} labels={labels} width={dialogueWidth} layout={dialogueLayout} scale={scale} closeVisible={closeVisible} closeEnabled={closeEnabled} educationEdition={educationEdition}
      textareaProps={dialogueProps} textareaRef={dialogueRef} scrollViewportProps={dialogueViewportProps} scrollViewportRef={dialogueViewportRef} onValueChange={(next, event) => update({ ...copyEditor(latest.current), dialogue: next }, { field: 'dialogue', reason: 'edit', event })}
      onClose={(_snapshot, detail) => requestPage('basic', detail)}/>
  </section>;
});
export interface NpcActionEditorProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'defaultValue' | 'onChange' | 'onDelete'> {
  value?: NpcActionValue; defaultValue?: Partial<NpcActionValue>;
  onValueChange?: (value: NpcActionValue, detail: NpcActionChangeDetail) => void;
  state?: NpcActionState; commandsEnabled?: boolean;
  maximized?: boolean; defaultMaximized?: boolean;
  onMaximizedChange?: (maximized: boolean, detail: NpcNavigationDetail) => void;
  onDelete?: (accepted: NpcActionValue, event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean; readOnly?: boolean;
  labels?: Partial<NpcLabels>;
  textareaProps?: NpcNativeTextareaProps; textareaRef?: Ref<HTMLTextAreaElement>;
  buttonNameProps?: NpcNativeInputProps; buttonNameRef?: Ref<HTMLInputElement>;
  toggleRefs?: Partial<Record<'buttonMode' | 'onEnter' | 'onExit', Ref<HTMLInputElement>>>;
  scale?: number;
}
export interface NpcDialogueAction { id: string; label: string; kind?: NpcActionKind; visible?: boolean; disabled?: boolean }
export interface NpcDialogueActionDetail { action: Readonly<NpcDialogueAction>; index: number; event: MouseEvent<HTMLButtonElement> }
/** Explicit normal Web resolution of source circular content-size expressions;
 * these defaults are not a recovered native form-fitting calculation. */
export interface NpcDialogueLayout { contentTop: number; contentInset: number; titleTop: number; bottomPadding: number }
export interface NpcDialogueProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'defaultValue' | 'onChange' | 'onClose' | 'title'> {
  title?: ReactNode; value?: string; defaultValue?: string;
  onValueChange?: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
  worldBuilder?: boolean; disabled?: boolean; readOnly?: boolean;
  actor?: ReactNode; actions?: readonly NpcDialogueAction[];
  onAction?: (id: string, detail: NpcDialogueActionDetail) => void;
  onClose?: (accepted: string, detail: NpcNavigationDetail) => void;
  closeVisible?: boolean; closeEnabled?: boolean;
  educationEdition?: boolean; readerVisible?: boolean;
  onReaderRequest?: (accepted: string, event: MouseEvent<HTMLButtonElement>) => void;
  labels?: Partial<NpcLabels>;
  width?: number; scale?: number; layout?: Partial<NpcDialogueLayout>;
  textareaProps?: NpcNativeTextareaProps; textareaRef?: Ref<HTMLTextAreaElement>;
  scrollViewportProps?: ScrollAreaProps['viewportProps']; scrollViewportRef?: Ref<HTMLDivElement>;
  actionRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
}
export type NpcEditorPage = 'basic' | 'advanced' | 'dialogue';
export interface NpcEditorValue { name: string; dialogue: string; skinId: string | null; actions: readonly NpcActionValue[] }
export interface NpcEditorChangeDetail {
  field: keyof NpcEditorValue; reason: 'edit' | 'add' | 'delete'; actionId?: string; actionField?: NpcActionField;
  event?: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | MouseEvent<HTMLButtonElement>;
}
export interface NpcEditorProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'defaultValue' | 'onChange' | 'onClose' | 'title'> {
  value?: NpcEditorValue; defaultValue?: Partial<NpcEditorValue>;
  onValueChange?: (value: NpcEditorValue, detail: NpcEditorChangeDetail) => void;
  page?: NpcEditorPage; defaultPage?: NpcEditorPage;
  onPageChange?: (page: NpcEditorPage, detail: NpcNavigationDetail) => void;
  maximizedActionId?: string | null; defaultMaximizedActionId?: string | null;
  onMaximizedActionChange?: (id: string | null, detail: NpcNavigationDetail) => void;
  onClose?: (accepted: NpcEditorValue, detail: NpcNavigationDetail) => void;
  title?: ReactNode; labels?: Partial<NpcLabels>;
  skins?: readonly NpcSkin[]; actor?: ReactNode;
  skinPage?: number; defaultSkinPage?: number; onSkinPageChange?: (page: number, detail: NpcSkinPageDetail) => void;
  skinColumns?: number; skinRows?: number; cycleVisible?: boolean;
  educationEdition?: boolean; commandsEnabled?: boolean; addButtonsEnabled?: boolean; helpVisible?: boolean;
  disabled?: boolean; readOnly?: boolean; closeVisible?: boolean; closeEnabled?: boolean;
  actionStates?: Readonly<Record<string, NpcActionState>>;
  pageVisibility?: Partial<Record<NpcEditorPage, boolean>>;
  size?: readonly [number, number]; dialogueWidth?: number; scale?: number;
  dialogueLayout?: Partial<NpcDialogueLayout>;
  nameProps?: NpcNativeInputProps; nameRef?: Ref<HTMLInputElement>;
  dialogueProps?: NpcNativeTextareaProps; dialogueRef?: Ref<HTMLTextAreaElement>;
  actionTextareaProps?: Readonly<Record<string, NpcNativeTextareaProps>>;
  actionTextareaRefs?: Readonly<Record<string, Ref<HTMLTextAreaElement>>>;
  actionButtonNameRefs?: Readonly<Record<string, Ref<HTMLInputElement>>>;
  skinButtonRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
  advancedViewportProps?: ScrollAreaProps['viewportProps']; advancedViewportRef?: Ref<HTMLDivElement>;
  dialogueViewportProps?: ScrollAreaProps['viewportProps']; dialogueViewportRef?: Ref<HTMLDivElement>;
}
