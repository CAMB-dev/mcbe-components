import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, CompositionEvent, CSSProperties, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref, TextareaHTMLAttributes } from 'react';
import { Button, Switch, TextField } from './components';
import { Combobox } from './combobox';
import { GuiIcon } from './gui-icon';
import { ScrollArea } from './scroll-area';
import type { ScrollAreaProps } from './scroll-area';
import { bookAssets } from './book-assets';
import { jigsawImageAssets } from './jigsaw-image-assets';
import { commandBlockImageAssets as assets } from './command-block-image-assets';

export type CommandBlockType = 'impulse' | 'chain' | 'repeat';
export type CommandBlockCondition = 'conditional' | 'unconditional';
export type CommandBlockRedstone = 'always_on' | 'needs_redstone';
export interface CommandBlockValue {
  /** Source hover note, not a registry identifier. */
  hoverNote: string;
  command: string;
  blockType: CommandBlockType;
  condition: CommandBlockCondition;
  redstone: CommandBlockRedstone;
  /** Raw draft; no engine range or NumberChars parser is inferred. */
  tickDelay: string;
  executeFirstTick: boolean;
  trackOutput: boolean;
}
export type CommandBlockField = keyof CommandBlockValue;
export interface CommandBlockChangeDetail {
  field: CommandBlockField;
  /** Combobox changes have no native input ChangeEvent. */
  event?: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
}
export interface CommandExpansionDetail {
  reason: 'maximize' | 'minimize' | 'escape';
  event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent<HTMLElement>;
}
type CommandTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange' | 'disabled' | 'readOnly'>;
export interface CommandInputProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'children'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean, detail: CommandExpansionDetail) => void;
  disabled?: boolean;
  readOnly?: boolean;
  pasteEnabled?: boolean;
  /** External source binding, not derived from string length. */
  charLimitWarning?: boolean;
  label?: string;
  warningText?: string;
  pasteLabel?: string;
  maximizeLabel?: string;
  minimizeLabel?: string;
  expandedPlaceholder?: string;
  showExpandedControls?: boolean;
  onPasteRequest?: (acceptedCommand: string, event: MouseEvent<HTMLButtonElement>) => void;
  textareaProps?: CommandTextareaProps;
  textareaRef?: Ref<HTMLTextAreaElement>;
  scale?: number;
}
export interface CommandPreviousInfo {
  blockType?: string;
  condition?: string;
  redstone?: string;
  blockTypeColor?: CSSProperties['color'];
}
export interface CommandOutputPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  previousOutput?: string;
  previousInfo?: CommandPreviousInfo;
  trackOutput?: boolean;
  defaultTrackOutput?: boolean;
  onTrackOutputChange?: (track: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  trackOutputEnabled?: boolean;
  label?: string;
  modeLabels?: Partial<Record<'blockType' | 'condition' | 'redstone', string>>;
  outputRef?: Ref<HTMLPreElement>;
  outputProps?: Omit<HTMLAttributes<HTMLPreElement>, 'children' | 'dangerouslySetInnerHTML'>;
  trackOutputRef?: Ref<HTMLInputElement>;
  scale?: number;
}
export interface CommandBlockLabels {
  title: string; hoverNote: string; blockType: string; condition: string; redstone: string;
  impulse: string; chain: string; repeat: string; conditional: string; unconditional: string;
  alwaysOn: string; needsRedstone: string; executeFirstTick: string; tickDelay: string;
  command: string; previousOutput: string; cancel: string; close: string;
  paste: string; maximize: string; minimize: string; warning: string; leftPane: string; rightPane: string;
}
export interface CommandBlockCloseDetail { reason: 'cancel' | 'close' | 'escape'; event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement> }
export interface CommandBlockEditorProps extends Omit<HTMLAttributes<HTMLElement>, 'defaultValue' | 'onChange' | 'onClose' | 'children'> {
  value?: CommandBlockValue;
  defaultValue?: Partial<CommandBlockValue>;
  onValueChange?: (value: CommandBlockValue, detail: CommandBlockChangeDetail) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean, detail: CommandExpansionDetail) => void;
  onClose?: (value: CommandBlockValue, detail: CommandBlockCloseDetail) => void;
  onPasteRequest?: (value: CommandBlockValue, event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  enabled?: Partial<Record<CommandBlockField, boolean>>;
  firstTickEnabled?: boolean;
  cancelEnabled?: boolean;
  trackOutputEnabled?: boolean;
  pasteEnabled?: boolean;
  charLimitWarning?: boolean;
  dividerVisible?: boolean;
  closeVisible?: boolean;
  minimizeVisible?: boolean;
  headerPasteVisible?: boolean;
  /** Desktop source panel: min(viewport−4,[370,viewportHeight−50]), centered.
   * A host-resolved panelSize bypasses that finite desktop policy. */
  viewportSize?: readonly [number, number];
  panelSize?: readonly [number, number];
  scale?: number;
  labels?: Partial<CommandBlockLabels>;
  /** Caller-supplied selected icon; source has no fixed enum-to-PNG mapping. */
  blockTypeIcon?: ReactNode;
  previousOutput?: string;
  previousInfo?: CommandPreviousInfo;
  selectorHelp?: readonly string[];
  inputProps?: Partial<Record<'hoverNote' | 'tickDelay', Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue'>>>;
  inputRefs?: Partial<Record<'hoverNote' | 'tickDelay', Ref<HTMLInputElement>>>;
  textareaProps?: CommandTextareaProps;
  textareaRef?: Ref<HTMLTextAreaElement>;
  dropdownRefs?: Partial<Record<'blockType' | 'condition' | 'redstone', Ref<HTMLButtonElement>>>;
  firstTickRef?: Ref<HTMLInputElement>;
  trackOutputRef?: Ref<HTMLInputElement>;
  outputRef?: Ref<HTMLPreElement>;
  leftViewportRef?: Ref<HTMLDivElement>;
  rightViewportRef?: Ref<HTMLDivElement>;
  leftViewportProps?: ScrollAreaProps['viewportProps'];
  rightViewportProps?: ScrollAreaProps['viewportProps'];
}

const initial: CommandBlockValue = { hoverNote: '', command: '', blockType: 'impulse', condition: 'unconditional', redstone: 'needs_redstone', tickDelay: '0', executeFirstTick: false, trackOutput: true };
const text: CommandBlockLabels = { title: 'Command Block', hoverNote: 'Hover Note', blockType: 'Block Type:', condition: 'Condition:', redstone: 'Redstone:', impulse: 'Impulse', chain: 'Chain', repeat: 'Repeat', conditional: 'Conditional', unconditional: 'Unconditional', alwaysOn: 'Always Active', needsRedstone: 'Needs Redstone', executeFirstTick: 'Execute on First Tick', tickDelay: 'Delay in Ticks:', command: 'Command Input', previousOutput: 'Previous Output', cancel: 'Cancel', close: 'Close', paste: 'Paste', maximize: 'Expand command input', minimize: 'Minimize command input', warning: 'Command Input exceeds 500 characters. It is not possible to open the keyboard input on this device type.', leftPane: 'Command block properties', rightPane: 'Command and output' };
const helpers = ['@s = self', '@p = nearest player', '@r = random player', '@a = all players', '@e = all entities', '@n = nearest entity'];
const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) { if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }
function useDraft<T>(value: T | undefined, fallback: () => T) { const [inside, set] = useState(fallback); return [value === undefined ? inside : value, (next: T) => { if (value === undefined) set(next); }] as const; }
function scaleValue(scale: number) { if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Command block scale must be a positive safe integer.'); }
function pair(value: readonly [number, number]) { if (value.length !== 2 || ![...value].every(n => Number.isFinite(n) && n > 0)) throw new RangeError('Command block dimensions must be a positive finite pair.'); return value; }
function imageURL(value: string) { return `url(${JSON.stringify(value)})`; }
function closeStyle(minimize: boolean): CSSProperties {
  return { '--mc-command-close': imageURL(minimize ? assets.minimize.url : bookAssets.close_button_default.url),
    '--mc-command-close-hover': imageURL(minimize ? assets.minimizeHover.url : bookAssets.close_button_hover.url),
    '--mc-command-close-pressed': imageURL(minimize ? assets.minimizePress.url : bookAssets.close_button_pressed.url) } as CSSProperties;
}

/** One true textarea for compact and expanded views. Paste is a host request;
 * Enter is prevented outside composition, but pasted/imported drafts are not rewritten. */
export const CommandInput = forwardRef<HTMLDivElement, CommandInputProps>(function CommandInput({
  value, defaultValue = '', onValueChange, expanded: controlledExpanded, defaultExpanded = false, onExpandedChange,
  disabled = false, readOnly = false, pasteEnabled = true, charLimitWarning = false, label = text.command,
  warningText = text.warning, pasteLabel = text.paste, maximizeLabel = text.maximize, minimizeLabel = text.minimize,
  expandedPlaceholder = 'Enter your command input here', showExpandedControls = true, onPasteRequest,
  textareaProps = {}, textareaRef, scale = 2, className, style, ...props
}, ref) {
  scaleValue(scale); const id = useId(); const [command, setCommand] = useDraft(value, () => defaultValue);
  const [requested, setExpanded] = useDraft(controlledExpanded, () => defaultExpanded);
  const [composing, setComposing] = useState(false); const holding = useRef(requested);
  if (!composing) holding.current = requested;
  const expanded = composing ? holding.current : requested;
  const node = useRef<HTMLTextAreaElement | null>(null);
  const attach = useCallback((element: HTMLTextAreaElement | null) => { node.current = element; assignRef(textareaRef, element); }, [textareaRef]);
  const [focusRequest, setFocusRequest] = useState<{ next: boolean; button: HTMLButtonElement } | null>(null);
  const wasFocused = !!focusRequest && focusRequest.button.ownerDocument.activeElement === focusRequest.button;
  useSafeLayoutEffect(() => {
    if (!focusRequest || expanded !== focusRequest.next) return;
    if (wasFocused && !disabled) node.current?.focus();
    setFocusRequest(null);
  }, [focusRequest, expanded, disabled, wasFocused]);
  const changeExpanded = (next: boolean, detail: CommandExpansionDetail) => {
    if (disabled || composing) return;
    if ('type' in detail.event.currentTarget && detail.event.currentTarget.type === 'button') {
      const button = detail.event.currentTarget as HTMLButtonElement;
      if (button.ownerDocument.activeElement === button) setFocusRequest({ next, button });
    }
    setExpanded(next); onExpandedChange?.(next, detail);
  };
  const locked = disabled || (!expanded && charLimitWarning);
  return <div {...props} ref={ref} className={['mc-command-input', className].filter(Boolean).join(' ')}
    data-expanded={expanded} style={{ '--mc-command-u': `${scale}px`, ...style } as CSSProperties}>
    <label className="mc-command-input__label" htmlFor={textareaProps.id ?? id}>{label}</label>
    <div className="mc-command-input__row">
      <div className="mc-command-input__edit"><div className="mc-command-input__center"><div className="mc-command-input__clip">
        <textarea {...textareaProps} ref={attach} id={textareaProps.id ?? id} value={command}
          aria-label={textareaProps['aria-label'] ?? label} disabled={locked} readOnly={readOnly}
          maxLength={textareaProps.maxLength ?? 32500} spellCheck={textareaProps.spellCheck ?? false}
          placeholder={textareaProps.placeholder ?? (expanded ? expandedPlaceholder : '')}
          className={['mc-input', 'mc-command-input__text', textareaProps.className].filter(Boolean).join(' ')}
          onChange={event => { if (!locked && !readOnly) { setCommand(event.currentTarget.value); onValueChange?.(event.currentTarget.value, event); } }}
          onCompositionStart={event => { holding.current = expanded; setComposing(true); textareaProps.onCompositionStart?.(event); }}
          onCompositionEnd={event => { setComposing(false); textareaProps.onCompositionEnd?.(event); }}
          onKeyDown={event => {
            textareaProps.onKeyDown?.(event);
            if (event.defaultPrevented || composing || event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === 'Enter') event.preventDefault();
            if (event.key === 'Escape' && expanded) { event.preventDefault(); changeExpanded(false, { reason: 'escape', event }); }
          }}/>
      </div></div></div>
      <Button className="mc-command-input__paste" aria-label={pasteLabel} data-command-action="paste" disabled={locked || readOnly || !pasteEnabled || composing}
        onClick={event => { if (!locked && !readOnly && pasteEnabled && !composing) onPasteRequest?.(command, event); }}><GuiIcon name="paste" scale={scale}/></Button>
      <Button className="mc-command-input__maximize" aria-label={maximizeLabel} data-command-action="maximize" disabled={locked || composing}
        onClick={event => changeExpanded(true, { reason: 'maximize', event })}><GuiIcon name="plus" scale={scale}/></Button>
    </div>
    {charLimitWarning && !expanded && <div className="mc-command-input__warning" role="status">{warningText}</div>}
    {showExpandedControls && <div className="mc-command-input__expanded-controls" hidden={!expanded}>
      <Button aria-label={pasteLabel} data-command-action="expanded-paste" disabled={disabled || readOnly || !pasteEnabled || composing}
        onClick={event => { if (!disabled && !readOnly && pasteEnabled && !composing) onPasteRequest?.(command, event); }}><GuiIcon name="paste" scale={scale}/></Button>
      <button type="button" className="mc-command-block__close" data-command-action="minimize" aria-label={minimizeLabel}
        style={closeStyle(true)} disabled={disabled || composing} onClick={event => changeExpanded(false, { reason: 'minimize', event })}/>
    </div>}
  </div>;
});

/** Independent, non-editable output snapshot. Track output never clears it. */
export const CommandOutputPanel = forwardRef<HTMLDivElement, CommandOutputPanelProps>(function CommandOutputPanel({
  previousOutput = '', previousInfo = {}, trackOutput, defaultTrackOutput = true, onTrackOutputChange,
  disabled = false, readOnly = false, trackOutputEnabled = true, label = text.previousOutput, modeLabels,
  outputRef, outputProps = {}, trackOutputRef, scale = 2, className, style, ...props
}, ref) {
  scaleValue(scale); const [track, setTrack] = useDraft(trackOutput, () => defaultTrackOutput);
  return <div {...props} ref={ref} className={['mc-command-output', className].filter(Boolean).join(' ')} style={{ '--mc-command-u': `${scale}px`, ...style } as CSSProperties}>
    <div className="mc-command-output__header"><div className="mc-command-output__track-control"><Switch ref={trackOutputRef} label="" aria-label={label} checked={track} disabled={disabled || !trackOutputEnabled}
      readOnly={readOnly} aria-readonly={readOnly || undefined} data-command-field="trackOutput"
      onClick={event => { if (readOnly) event.preventDefault(); }}
      onChange={event => { if (!disabled && !readOnly && trackOutputEnabled) { setTrack(event.currentTarget.checked); onTrackOutputChange?.(event.currentTarget.checked, event); } }}/></div><span>{label}</span></div>
    <pre {...outputProps} ref={outputRef} aria-label={outputProps['aria-label'] ?? label}
      className={['mc-command-output__text', outputProps.className].filter(Boolean).join(' ')}>{previousOutput}</pre>
    <div className="mc-command-output__previous">
      {(['blockType', 'condition', 'redstone'] as const).map(field => <div key={field} data-command-previous={field}>
        <span>{modeLabels?.[field] ?? text[field]}</span><span style={field === 'blockType' ? { color: previousInfo.blockTypeColor } : undefined}>{previousInfo[field] ?? ''}</span>
      </div>)}
    </div>
  </div>;
});

export const CommandBlockEditor = forwardRef<HTMLElement, CommandBlockEditorProps>(function CommandBlockEditor({
  value, defaultValue, onValueChange, expanded: controlledExpanded, defaultExpanded = false, onExpandedChange,
  onClose, onPasteRequest, disabled = false, readOnly = false, enabled = {}, firstTickEnabled = true,
  cancelEnabled = true, trackOutputEnabled = true, pasteEnabled = true, charLimitWarning = false, dividerVisible = true,
  closeVisible, minimizeVisible, headerPasteVisible, viewportSize = [400, 300], panelSize, scale = 2,
  labels: overrides, blockTypeIcon, previousOutput = '', previousInfo, selectorHelp = helpers,
  inputProps = {}, inputRefs, textareaProps = {}, textareaRef, dropdownRefs, firstTickRef, trackOutputRef, outputRef,
  leftViewportRef, rightViewportRef, leftViewportProps, rightViewportProps, className, style, onKeyDown, ...props
}, ref) {
  scaleValue(scale); pair(viewportSize);
  const resolved = panelSize ? pair(panelSize) : pair([Math.min(viewportSize[0] - 4, 370), Math.min(viewportSize[1] - 4, viewportSize[1] - 50)]);
  if (![...viewportSize, ...resolved].every(n => Number.isFinite(n * scale))) throw new RangeError('Scaled command block dimensions must be finite.');
  const labels = { ...text, ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([, entry]) => entry !== undefined)) };
  const [draft, setDraft] = useDraft(value, () => ({ ...initial, ...Object.fromEntries(Object.entries(defaultValue ?? {}).filter(([, entry]) => entry !== undefined)) }));
  if (!['impulse', 'chain', 'repeat'].includes(draft.blockType) || !['conditional', 'unconditional'].includes(draft.condition) || !['always_on', 'needs_redstone'].includes(draft.redstone)) throw new RangeError('Unknown command block mode.');
  const [requested, setExpanded] = useDraft(controlledExpanded, () => defaultExpanded);
  const composing = useRef(new Set<EventTarget>()); const [, refreshComposition] = useState(0); const held = useRef(requested);
  if (!composing.current.size) held.current = requested;
  const expanded = composing.current.size ? held.current : requested;
  const node = useRef<HTMLTextAreaElement | null>(null); const viewport = useRef<HTMLDivElement | null>(null); const scroll = useRef(0);
  const [headerFocus, setHeaderFocus] = useState<{ next: boolean; button: HTMLButtonElement } | null>(null);
  const headerWasFocused = !!headerFocus && headerFocus.button.ownerDocument.activeElement === headerFocus.button;
  const attachInput = useCallback((element: HTMLTextAreaElement | null) => { node.current = element; assignRef(textareaRef, element); }, [textareaRef]);
  const attachViewport = useCallback((element: HTMLDivElement | null) => { viewport.current = element; assignRef(rightViewportRef, element); }, [rightViewportRef]);
  useSafeLayoutEffect(() => { if (!expanded && viewport.current) viewport.current.scrollTop = scroll.current; }, [expanded]);
  useSafeLayoutEffect(() => { if (!headerFocus || expanded !== headerFocus.next) return; if (headerWasFocused && !disabled) node.current?.focus(); setHeaderFocus(null); }, [headerFocus, expanded, headerWasFocused, disabled]);
  const id = useId(), snapshot = () => ({ ...draft });
  const blocked = () => disabled || composing.current.size > 0;
  const update = (field: CommandBlockField, next: CommandBlockValue[CommandBlockField], event?: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (disabled || readOnly || enabled[field] === false) return;
    const result = { ...draft, [field]: next }; setDraft(result); onValueChange?.(result, { field, event });
  };
  const changeExpanded = (next: boolean, detail: CommandExpansionDetail) => {
    if (blocked()) return;
    if (next && viewport.current) scroll.current = viewport.current.scrollTop;
    if (detail.event.currentTarget.getAttribute('data-command-action') === 'header-minimize') {
      const button = detail.event.currentTarget as HTMLButtonElement;
      if (button.ownerDocument.activeElement === button) setHeaderFocus({ next, button });
    }
    setExpanded(next); onExpandedChange?.(next, detail);
  };
  const tracking = <T extends HTMLInputElement | HTMLTextAreaElement>(attributes: { onCompositionStart?: (event: CompositionEvent<T>) => void; onCompositionEnd?: (event: CompositionEvent<T>) => void }) => ({
    onCompositionStart: (event: CompositionEvent<T>) => { if (!composing.current.size) held.current = expanded; composing.current.add(event.currentTarget); refreshComposition(n => n + 1); attributes.onCompositionStart?.(event); },
    onCompositionEnd: (event: CompositionEvent<T>) => { composing.current.delete(event.currentTarget); refreshComposition(n => n + 1); attributes.onCompositionEnd?.(event); },
  });
  const headerMinimize = minimizeVisible ?? expanded, headerPaste = headerPasteVisible ?? expanded, headerClose = closeVisible ?? !expanded;
  return <section {...props} ref={ref} className={['mc-command-block', className].filter(Boolean).join(' ')} data-expanded={expanded}
    aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? `${id}-title`}
    style={{ '--mc-command-u': `${scale}px`, width: viewportSize[0] * scale, height: viewportSize[1] * scale, ...style } as CSSProperties}
    onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented || blocked() || event.nativeEvent.isComposing || event.keyCode === 229 || event.key !== 'Escape') return;
      event.preventDefault(); if (expanded) changeExpanded(false, { reason: 'escape', event }); else onClose?.(snapshot(), { reason: 'escape', event });
    }}>
    <div className="mc-command-block__panel" style={{ width: resolved[0] * scale, height: resolved[1] * scale,
      left: (viewportSize[0] - resolved[0]) * scale / 2, top: (viewportSize[1] - resolved[1]) * scale / 2,
      '--mc-command-frame': imageURL(assets.dialog_background_hollow_3.url), '--mc-command-divider': imageURL(assets.dialog_divider.url),
      '--mc-command-control': imageURL(jigsawImageAssets.control.url), '--mc-command-arrow': imageURL(assets.arrowRight.url),
      '--mc-command-dropdown-width': `${Math.max(0, resolved[0] * .4 - 25) * scale}px` } as CSSProperties}>
      <div className="mc-command-block__background" aria-hidden="true"><span/></div>
      <div className="mc-command-block__divider" hidden={!dividerVisible || expanded} aria-hidden="true"/>
      <h2 className="mc-command-block__title" id={`${id}-title`}>{labels.title}</h2>
      <div className="mc-command-block__header-controls">
        <Button className="mc-command-block__header-paste" hidden={!headerPaste} aria-label={labels.paste} data-command-action="header-paste"
          disabled={disabled || readOnly || !pasteEnabled || composing.current.size > 0}
          onClick={event => { if (!blocked() && !readOnly && pasteEnabled) onPasteRequest?.(snapshot(), event); }}><GuiIcon name="paste" scale={scale}/></Button>
        <div className="mc-command-block__close-holder">
          <button type="button" className="mc-command-block__close" hidden={!headerClose} aria-label={labels.close} data-command-action="close"
            style={closeStyle(false)} disabled={disabled} onClick={event => { if (!blocked()) onClose?.(snapshot(), { reason: 'close', event }); }}/>
          <button type="button" className="mc-command-block__close" hidden={!headerMinimize} aria-label={labels.minimize} data-command-action="header-minimize"
            style={closeStyle(true)} disabled={disabled} onClick={event => changeExpanded(false, { reason: 'minimize', event })}/>
        </div>
      </div>
      <div className="mc-command-block__left" hidden={expanded}>
        <ScrollArea className="mc-command-block__scroll" scale={scale} label={labels.leftPane} viewportRef={leftViewportRef} viewportProps={leftViewportProps} contentProps={{ className: 'mc-command-block__settings' }}>
          <TextField {...inputProps.hoverNote} {...tracking(inputProps.hoverNote ?? {})} id={inputProps.hoverNote?.id ?? `${id}-name`} ref={inputRefs?.hoverNote}
            label={labels.hoverNote} aria-label={inputProps.hoverNote?.['aria-label'] ?? labels.hoverNote} placeholder={inputProps.hoverNote?.placeholder ?? labels.hoverNote}
            value={draft.hoverNote} maxLength={inputProps.hoverNote?.maxLength ?? 15} type="text" spellCheck={inputProps.hoverNote?.spellCheck ?? false}
            disabled={disabled || enabled.hoverNote === false || inputProps.hoverNote?.disabled} readOnly={readOnly || inputProps.hoverNote?.readOnly}
            className="mc-command-block__note" data-command-field="hoverNote" onChange={event => { inputProps.hoverNote?.onChange?.(event); if (!event.defaultPrevented && !inputProps.hoverNote?.readOnly && !inputProps.hoverNote?.disabled) update('hoverNote', event.currentTarget.value, event); }}/>
          <div className="mc-command-block__type-select">
            <Combobox hidden={expanded} label={labels.blockType} options={[{ value: 'impulse', label: labels.impulse }, { value: 'chain', label: labels.chain }, { value: 'repeat', label: labels.repeat }]}
              ref={dropdownRefs?.blockType} value={draft.blockType} disabled={disabled || readOnly || enabled.blockType === false} onValueChange={next => update('blockType', next as CommandBlockType)} data-command-field="blockType"/>
            <span className="mc-command-block__type-icon" aria-hidden="true">{blockTypeIcon}</span>
          </div>
          <Combobox hidden={expanded} label={labels.condition} options={[{ value: 'conditional', label: labels.conditional }, { value: 'unconditional', label: labels.unconditional }]}
            ref={dropdownRefs?.condition} value={draft.condition} disabled={disabled || readOnly || enabled.condition === false} onValueChange={next => update('condition', next as CommandBlockCondition)} data-command-field="condition"/>
          <Combobox hidden={expanded} label={labels.redstone} options={[{ value: 'always_on', label: labels.alwaysOn }, { value: 'needs_redstone', label: labels.needsRedstone }]}
            ref={dropdownRefs?.redstone} value={draft.redstone} disabled={disabled || readOnly || enabled.redstone === false} onValueChange={next => update('redstone', next as CommandBlockRedstone)} data-command-field="redstone"/>
          <Switch className="mc-command-block__first-tick" ref={firstTickRef} label={labels.executeFirstTick} checked={draft.executeFirstTick}
            disabled={disabled || !firstTickEnabled || enabled.executeFirstTick === false} readOnly={readOnly} aria-readonly={readOnly || undefined} data-command-field="executeFirstTick"
            onClick={event => { if (readOnly) event.preventDefault(); }} onChange={event => { if (firstTickEnabled) update('executeFirstTick', event.currentTarget.checked, event); }}/>
          <TextField {...inputProps.tickDelay} {...tracking(inputProps.tickDelay ?? {})} id={inputProps.tickDelay?.id ?? `${id}-ticks`} ref={inputRefs?.tickDelay}
            label={labels.tickDelay} value={draft.tickDelay} maxLength={inputProps.tickDelay?.maxLength ?? 5} type="text" inputMode={inputProps.tickDelay?.inputMode ?? 'numeric'}
            disabled={disabled || enabled.tickDelay === false || inputProps.tickDelay?.disabled} readOnly={readOnly || inputProps.tickDelay?.readOnly}
            className="mc-command-block__ticks" data-command-field="tickDelay" onChange={event => { inputProps.tickDelay?.onChange?.(event); if (!event.defaultPrevented && !inputProps.tickDelay?.disabled && !inputProps.tickDelay?.readOnly) update('tickDelay', event.currentTarget.value, event); }}/>
          <Button className="mc-command-block__cancel" data-command-action="cancel" disabled={disabled || !cancelEnabled}
            onClick={event => { if (!blocked() && cancelEnabled) onClose?.(snapshot(), { reason: 'cancel', event }); }}>{labels.cancel}</Button>
        </ScrollArea>
      </div>
      <div className="mc-command-block__right">
        <ScrollArea className="mc-command-block__scroll mc-command-block__right-scroll" scale={scale} label={labels.rightPane} viewportRef={attachViewport}
          viewportProps={{ ...rightViewportProps, tabIndex: expanded ? -1 : rightViewportProps?.tabIndex,
            style: { ...rightViewportProps?.style, ...(expanded ? { overflowX: 'visible', overflowY: 'visible' } : {}) } }}
          onScrollPositionChange={position => { if (!expanded) scroll.current = position.scrollTop; }}>
          <CommandInput value={draft.command} onValueChange={(next, event) => update('command', next, event)} expanded={expanded} onExpandedChange={changeExpanded}
            disabled={disabled || enabled.command === false} readOnly={readOnly} pasteEnabled={pasteEnabled} charLimitWarning={charLimitWarning}
            label={labels.command} warningText={labels.warning} pasteLabel={labels.paste} maximizeLabel={labels.maximize} minimizeLabel={labels.minimize}
            showExpandedControls={false} textareaProps={{ ...textareaProps, ...tracking(textareaProps) }} textareaRef={attachInput} scale={scale}
            onPasteRequest={(_command, event) => { if (!blocked() && !readOnly && pasteEnabled) onPasteRequest?.(snapshot(), event); }}/>
          <div className="mc-command-block__right-extras" hidden={expanded}>
            <div className="mc-command-block__helpers">{selectorHelp.map((help, index) => <div key={index}>{help}</div>)}</div>
            <CommandOutputPanel previousOutput={previousOutput} previousInfo={previousInfo} trackOutput={draft.trackOutput}
              onTrackOutputChange={(next, event) => update('trackOutput', next, event)} disabled={disabled} readOnly={readOnly}
              trackOutputEnabled={trackOutputEnabled && enabled.trackOutput !== false} label={labels.previousOutput}
              modeLabels={{ blockType: labels.blockType, condition: labels.condition, redstone: labels.redstone }}
              trackOutputRef={trackOutputRef} outputRef={outputRef} scale={scale}/>
          </div>
        </ScrollArea>
      </div>
    </div>
  </section>;
});
