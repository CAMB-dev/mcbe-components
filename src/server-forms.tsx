import { cloneElement, forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChangeEvent, CompositionEvent, CSSProperties, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactElement, ReactNode, Ref, SyntheticEvent } from 'react';
import { Button, Checkbox, Slider, Switch, TextField } from './components';
import { Combobox } from './combobox';
import { ScrollArea } from './scroll-area';
import type { ScrollAreaProps } from './scroll-area';
import { bookAssets } from './book-assets';
import { commandBlockImageAssets } from './command-block-image-assets';
import { jigsawImageAssets } from './jigsaw-image-assets';
import { serverFormImageAssets } from './server-form-image-assets';
import { guiIconAssets } from './gui-icon-assets';

export interface ServerFormCancelDetail { reason: 'close' | 'escape'; event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement> }
export interface ServerFormOption { value: string; label: string; disabled?: boolean }
export type ServerActionIcon = { state: 'none' } | { state: 'loading'; visible?: boolean } | { state: 'ready'; url: string };
interface ServerRowBase { id: string; visible?: boolean }
export type ServerActionRow =
  | (ServerRowBase & { type: 'button'; text: string; icon?: ServerActionIcon; disabled?: boolean })
  | (ServerRowBase & { type: 'label' | 'header'; text: string })
  | (ServerRowBase & { type: 'divider' });
export interface ServerActionDetail { row: Readonly<Extract<ServerActionRow, { type: 'button' }>>; index: number; event: MouseEvent<HTMLButtonElement> }
interface ServerFormCommonProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title' | 'onCancel' | 'defaultValue' | 'onChange' | 'onSubmit'> {
  title: ReactNode;
  size?: readonly [number, number];
  scale?: number;
  disabled?: boolean;
  readOnly?: boolean;
  closeVisible?: boolean;
  closeEnabled?: boolean;
  closeLabel?: string;
  scrollLabel?: string;
  scrollViewportRef?: Ref<HTMLDivElement>;
  scrollViewportProps?: ScrollAreaProps['viewportProps'];
}
export interface ServerActionFormProps extends ServerFormCommonProps {
  body?: string;
  rows: readonly ServerActionRow[];
  onAction?: (id: string, detail: ServerActionDetail) => void;
  onCancel?: (detail: ServerFormCancelDetail) => void;
  onIconError?: (id: string, event: SyntheticEvent<HTMLImageElement>) => void;
}
interface ServerFieldBase extends ServerRowBase { tooltip?: ReactNode; disabled?: boolean }
export type ServerCustomField =
  | (ServerFieldBase & { type: 'label' | 'header'; text: string })
  | (ServerFieldBase & { type: 'divider' })
  | (ServerFieldBase & { type: 'input'; label: string; placeholder?: string; defaultValue?: string })
  | (ServerFieldBase & { type: 'toggle'; label: string; defaultValue?: boolean })
  | (ServerFieldBase & { type: 'slider'; label: string; min: number; max: number; step: number; defaultValue?: number; formatValue?: (value: number) => string })
  | (ServerFieldBase & { type: 'step_slider'; label: string; options: readonly ServerFormOption[]; defaultValue?: string })
  | (ServerFieldBase & { type: 'dropdown'; label: string; options: readonly ServerFormOption[]; defaultValue?: string; placeholder?: string })
  | (ServerFieldBase & { type: 'multiselect'; label: string; options: readonly ServerFormOption[]; defaultValue?: readonly string[]; placeholder?: string; summary?: string; expanded?: boolean; defaultExpanded?: boolean; headerDisabled?: boolean });
export type ServerCustomEditableField = Exclude<ServerCustomField, { type: 'label' | 'header' | 'divider' }>;
export type ServerCustomValue = string | boolean | number | readonly string[];
export type ServerCustomFormValues = Readonly<Record<string, ServerCustomValue>>;
export interface ServerCustomChangeDetail { id: string; type: ServerCustomEditableField['type']; event?: ChangeEvent<HTMLInputElement> }
export type ServerFormInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'type' | 'disabled' | 'readOnly' | 'children'>;
export interface ServerCustomFormProps extends ServerFormCommonProps {
  fields: readonly ServerCustomField[];
  value?: ServerCustomFormValues;
  defaultValue?: ServerCustomFormValues;
  onValueChange?: (value: ServerCustomFormValues, detail: ServerCustomChangeDetail) => void;
  onSubmit?: (accepted: ServerCustomFormValues, event: MouseEvent<HTMLButtonElement>) => void;
  onCancel?: (accepted: ServerCustomFormValues, detail: ServerFormCancelDetail) => void;
  submitText?: string;
  submitVisible?: boolean;
  submitEnabled?: boolean;
  onExpandedChange?: (id: string, expanded: boolean, event: MouseEvent<HTMLButtonElement>) => void;
  inputProps?: Readonly<Record<string, ServerFormInputProps>>;
  inputRefs?: Readonly<Record<string, Ref<HTMLInputElement>>>;
  dropdownRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
  multiselectRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
  optionRefs?: Readonly<Record<string, Readonly<Record<string, Ref<HTMLInputElement>>>>>;
}

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const infoLayers = new WeakMap<Document, HTMLDivElement[]>();
const editable = (field: ServerCustomField): field is ServerCustomEditableField => !['label', 'header', 'divider'].includes(field.type);
const copyValue = (value: ServerCustomValue): ServerCustomValue => Array.isArray(value) ? [...value] : value;
function copyRecord(value: ServerCustomFormValues): ServerCustomFormValues { return Object.fromEntries(Object.entries(value).map(([id, item]) => [id, copyValue(item)])); }
function scaleValue(scale: number) { if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Server form scale must be a positive safe integer.'); }
function unique(items: readonly { id: string }[]) { const ids = new Set<string>(); for (const item of items) { if (typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new RangeError('Server form row and field ids must be nonempty and unique.'); ids.add(item.id); } }
function validateFields(fields: readonly ServerCustomField[]) {
  unique(fields);
  for (const field of fields) {
    if (!['label', 'header', 'divider', 'input', 'toggle', 'slider', 'step_slider', 'dropdown', 'multiselect'].includes(field.type)) throw new RangeError('Unknown server custom field type.');
    if (field.type === 'slider' && (!Number.isFinite(field.min) || !Number.isFinite(field.max) || !Number.isFinite(field.step) || field.max < field.min || field.step <= 0)) throw new RangeError('Server slider ranges must be finite and ordered, with a positive step.');
    if (field.type === 'dropdown' || field.type === 'step_slider' || field.type === 'multiselect') {
      const values = new Set<string>(); for (const option of field.options) { if (typeof option.value !== 'string' || typeof option.label !== 'string' || values.has(option.value)) throw new RangeError('Server form option values must be unique strings with string labels.'); values.add(option.value); }
    }
  }
}
function validateValue(field: ServerCustomEditableField, value: ServerCustomValue) {
  const valid = field.type === 'toggle' ? typeof value === 'boolean' : field.type === 'slider' ? typeof value === 'number' && Number.isFinite(value) : field.type === 'multiselect' ? Array.isArray(value) && value.every(item => typeof item === 'string') : typeof value === 'string';
  if (!valid) throw new RangeError(`Invalid value for server field ${field.id} (${field.type}).`);
  return copyValue(value);
}
function defaultFor(field: ServerCustomEditableField): ServerCustomValue {
  if (field.defaultValue !== undefined) return validateValue(field, field.defaultValue);
  if (field.type === 'toggle') return false;
  if (field.type === 'slider') return field.min;
  if (field.type === 'multiselect') return [];
  if (field.type === 'dropdown' || field.type === 'step_slider') return field.options.find(option => !option.disabled)?.value ?? '';
  return '';
}
function useScope(forwardedRef: Ref<HTMLElement>) {
  const root = useRef<HTMLElement | null>(null), composing = useRef(new Set<EventTarget>());
  const attach = useCallback((node: HTMLElement | null) => { root.current = node; if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }, [forwardedRef]);
  const isComposing = () => { for (const target of composing.current) if (!(target as Node).isConnected || (root.current && !root.current.contains(target as Node))) composing.current.delete(target); return composing.current.size > 0; };
  return { attach, isComposing, start: (event: CompositionEvent<HTMLElement>) => composing.current.add(event.target), end: (event: CompositionEvent<HTMLElement>) => composing.current.delete(event.target) };
}
/** Source art and dimensions, with an explicit Web hover/focus/click trigger and
 * viewport-aware above/below policy. It never moves the real field or its ref. */
function SourceInfoTooltip({ content, label, disabled, scale, children }: { content: ReactNode; label: string; disabled: boolean; scale: number; children: ReactElement }) {
  const wrapper = useRef<HTMLDivElement | null>(null), popup = useRef<HTMLDivElement | null>(null), textNode = useRef<HTMLSpanElement | null>(null);
  const hovered = useRef(false), focused = useRef(false), pinned = useRef(false), pointerFocus = useRef(false), timer = useRef<number | undefined>(undefined), timerView = useRef<Window | null>(null);
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ left: 0, top: 0, side: 'above', ready: false });
  const tooltipId = useId(), available = !disabled && !!content;
  const clearTimer = () => { const view = timerView.current ?? wrapper.current?.ownerDocument.defaultView; if (timer.current !== undefined) view?.clearTimeout(timer.current); timer.current = undefined; };
  const close = () => { clearTimer(); pinned.current = false; setOpen(false); };
  const leave = () => { clearTimer(); if (!focused.current && !pinned.current) { timerView.current = wrapper.current?.ownerDocument.defaultView ?? null; timer.current = timerView.current?.setTimeout(() => { if (!hovered.current && !focused.current && !pinned.current) setOpen(false); }, 100); } };
  useEffect(() => { if (!available) close(); }, [available]);
  useEffect(() => () => { clearTimer(); }, []);
  useSafeLayoutEffect(() => {
    const anchor = wrapper.current, element = popup.current;
    if (!open || !available || !anchor || !element) return;
    const doc = anchor.ownerDocument, view = doc.defaultView; if (!view) return;
    const layers = infoLayers.get(doc) ?? []; layers.push(element); infoLayers.set(doc, layers);
    const locate = () => {
      const rect = anchor.getBoundingClientRect(), padding = 8;
      element.style.width = `${Math.max(1, Math.min(rect.width - 4 * scale, view.innerWidth - padding * 2))}px`;
      element.style.fontFamily = view.getComputedStyle(anchor).fontFamily;
      const textHeight = textNode.current?.getBoundingClientRect().height ?? 10 * scale;
      element.style.setProperty('--mc-server-tooltip-icon-size', `${Math.min(12 * scale, Math.max(8 * scale, textHeight))}px`);
      const box = element.getBoundingClientRect(), above = rect.top - 10 * scale - box.height, below = rect.bottom + 20 * scale;
      const side = above >= padding || (below + box.height > view.innerHeight - padding && rect.top > view.innerHeight - rect.bottom) ? 'above' : 'below';
      const left = Math.max(padding, Math.min(rect.left + (rect.width - box.width) / 2, view.innerWidth - box.width - padding));
      const top = Math.max(padding, Math.min(side === 'above' ? above : below, view.innerHeight - box.height - padding));
      setPosition(previous => previous.ready && previous.left === left && previous.top === top && previous.side === side ? previous : { left, top, side, ready: true });
    };
    const outside = (event: globalThis.PointerEvent) => { if (!anchor.contains(event.target as Node) && !element.contains(event.target as Node)) close(); };
    const focusOutside = (event: FocusEvent) => { if (!anchor.contains(event.target as Node) && !element.contains(event.target as Node)) close(); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing && event.keyCode !== 229 && layers.at(-1) === element) { event.preventDefault(); event.stopPropagation(); close(); } };
    const resize = typeof view.ResizeObserver === 'undefined' ? undefined : new view.ResizeObserver(locate);
    resize?.observe(anchor); resize?.observe(element); if (textNode.current) resize?.observe(textNode.current);
    doc.addEventListener('pointerdown', outside, true); doc.addEventListener('focusin', focusOutside); doc.addEventListener('keydown', escape, true);
    view.addEventListener('resize', locate); view.addEventListener('scroll', locate, true); locate();
    return () => { resize?.disconnect(); doc.removeEventListener('pointerdown', outside, true); doc.removeEventListener('focusin', focusOutside); doc.removeEventListener('keydown', escape, true); view.removeEventListener('resize', locate); view.removeEventListener('scroll', locate, true); const index = layers.indexOf(element); if (index >= 0) layers.splice(index, 1); };
  }, [open, available, scale, content]);
  const child = children as ReactElement<{ 'aria-describedby'?: string }>;
  const described = [child.props['aria-describedby'], open && available ? tooltipId : undefined].filter(Boolean).join(' ') || undefined;
  return <div ref={wrapper} className="mc-server-form__tooltip" data-has-tooltip={available}
    onPointerEnter={event => { if (!available || event.pointerType === 'touch') return; hovered.current = true; clearTimer(); if (!open) setPosition(previous => ({ ...previous, ready: false })); setOpen(true); }}
    onPointerLeave={() => { hovered.current = false; leave(); }}
    onFocus={event => { if (!available || event.defaultPrevented) return; focused.current = true; clearTimer(); if (!pointerFocus.current) { if (!open) setPosition(previous => ({ ...previous, ready: false })); setOpen(true); } }}
    onBlur={event => { if (event.currentTarget.contains(event.relatedTarget as Node | null) || popup.current?.contains(event.relatedTarget as Node | null)) return; focused.current = false; pointerFocus.current = false; if (!hovered.current) close(); }}>
    {cloneElement(child, { 'aria-describedby': described })}
    <button className="mc-server-form__info" type="button" hidden={!available} aria-label={`${label} information`} aria-expanded={open && available} aria-describedby={open && available ? tooltipId : undefined}
      onPointerDown={() => { pointerFocus.current = true; }} onPointerUp={() => { pointerFocus.current = false; }} onPointerCancel={() => { pointerFocus.current = false; }}
      onClick={event => { if (event.defaultPrevented || !available) return; pointerFocus.current = false; clearTimer(); const next = !pinned.current; pinned.current = next; if (next && !open) setPosition(previous => ({ ...previous, ready: false })); setOpen(next); }}>
      <img src={guiIconAssets.infobulb.url} alt="" draggable={false}/>
    </button>
    {open && available && wrapper.current && createPortal(<div ref={popup} id={tooltipId} role="tooltip" className="mc-server-form__source-tooltip" data-side={position.side}
      style={{ '--mc-server-u': `${scale}px`, left: position.left, top: position.top, visibility: position.ready ? 'visible' : 'hidden' } as CSSProperties}
      onPointerEnter={() => { hovered.current = true; clearTimer(); }} onPointerLeave={() => { hovered.current = false; leave(); }}>
      <span className="mc-server-form__tooltip-image"><img src={guiIconAssets.infobulb.url} alt="" draggable={false}/></span><span ref={textNode} className="mc-server-form__tooltip-text">{content}</span>
      <img className="mc-server-form__tooltip-chevron" src={position.side === 'above' ? serverFormImageAssets.tooltip_default_chevron.url : serverFormImageAssets.tooltip_inverted_chevron.url} alt="" draggable={false}/>
    </div>, wrapper.current.closest('dialog') ?? wrapper.current.ownerDocument.body)}
  </div>;
}
interface FrameProps extends ServerFormCommonProps { kind: 'action' | 'custom'; cancel: (detail: ServerFormCancelDetail) => void; scope: ReturnType<typeof useScope>; children: ReactNode }
function ServerFormFrame({ kind, title, size = [225, 200], scale = 2, disabled = false, readOnly = false, closeVisible = true, closeEnabled = true, closeLabel = 'Close', scrollLabel = 'Server form content', scrollViewportRef, scrollViewportProps, className, style, onKeyDown, onCompositionStartCapture, onCompositionEndCapture, scope, cancel, children, ...props }: FrameProps) {
  scaleValue(scale); if (size.length !== 2 || ![...size].every(n => Number.isFinite(n) && n > 0 && Number.isFinite(n * scale))) throw new RangeError('Server form dimensions must be a positive finite pair.');
  const titleId = useId();
  return <section {...props} ref={scope.attach} className={['mc-server-form', `mc-server-${kind}-form`, className].filter(Boolean).join(' ')} data-server-form={kind} data-disabled={disabled} data-readonly={readOnly}
    aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? titleId}
    style={{ '--mc-server-u': `${scale}px`, width: size[0] * scale, height: size[1] * scale,
      '--mc-server-frame': `url(${JSON.stringify(commandBlockImageAssets.dialog_background_hollow_3.url)})`, '--mc-server-control': `url(${JSON.stringify(jigsawImageAssets.control.url)})`,
      '--mc-server-close': `url(${JSON.stringify(bookAssets.close_button_default.url)})`, '--mc-server-close-hover': `url(${JSON.stringify(bookAssets.close_button_hover.url)})`, '--mc-server-close-pressed': `url(${JSON.stringify(bookAssets.close_button_pressed.url)})`,
      '--mc-server-divider': `url(${JSON.stringify(serverFormImageAssets.list_item_divider_line_light.url)})`, '--mc-server-popup-width': `${Math.max(0, size[0] - 31) * scale}px`, ...style } as CSSProperties}
    onCompositionStartCapture={event => { scope.start(event); onCompositionStartCapture?.(event); }} onCompositionEndCapture={event => { scope.end(event); onCompositionEndCapture?.(event); }}
    onKeyDown={event => { onKeyDown?.(event); if (event.defaultPrevented || disabled || scope.isComposing() || event.nativeEvent.isComposing || event.keyCode === 229 || event.key !== 'Escape' || !closeEnabled) return; event.preventDefault(); cancel({ reason: 'escape', event }); }}>
    <div className="mc-server-form__skin" aria-hidden="true"><span/></div>
    <h2 className="mc-server-form__title" id={titleId}>{title}</h2>
    <button type="button" className="mc-server-form__close" hidden={!closeVisible} disabled={disabled || !closeEnabled} aria-label={closeLabel} data-server-action="close"
      onClick={event => { if (!event.defaultPrevented && !disabled && closeEnabled && !scope.isComposing()) cancel({ reason: 'close', event }); }}/>
    <div className="mc-server-form__indent"><ScrollArea className="mc-server-form__scroll" scale={scale} label={scrollLabel} viewportRef={scrollViewportRef} viewportProps={scrollViewportProps} contentProps={{ className: 'mc-server-form__content' }}>{children}</ScrollArea></div>
  </section>;
}
function StaticRow({ type, text, spaced = false }: { type: 'label' | 'header' | 'divider'; text?: string; spaced?: boolean }) {
  return type === 'divider' ? <div className="mc-server-form__divider" role="separator"><span/></div> : <div className={`mc-server-form__${type}${spaced ? ' mc-server-form__spaced' : ''}`}>{type === 'header' ? <h3>{text}</h3> : <p>{text}</p>}</div>;
}

/** Source LongForm rows. Callbacks request an action without sending a server response. */
export const ServerActionForm = forwardRef<HTMLElement, ServerActionFormProps>(function ServerActionForm({ rows, body = '', onAction, onCancel, onIconError, disabled = false, readOnly = false, ...props }, ref) {
  unique(rows); for (const row of rows) { if (!['button', 'label', 'header', 'divider'].includes(row.type)) throw new RangeError('Unknown server action row type.'); if (row.type === 'button' && row.icon && !['none', 'loading', 'ready'].includes(row.icon.state)) throw new RangeError('Unknown server action icon state.'); }
  const scope = useScope(ref);
  return <ServerFormFrame {...props} kind="action" scope={scope} disabled={disabled} readOnly={readOnly} cancel={detail => onCancel?.(detail)}>
    <div className="mc-server-action-form__body">{body}</div>
    <div className="mc-server-action-form__rows">{rows.map((row, index) => <div key={row.id} data-server-row-id={row.id} data-server-row-type={row.type} hidden={row.visible === false} className={row.type === 'button' ? 'mc-server-action-form__button-row' : undefined}>
      {row.type === 'button' ? <>
        {row.icon && row.icon.state !== 'none' && <div className="mc-server-action-form__icon" aria-hidden="true">{row.icon.state === 'ready' ? <img src={row.icon.url} alt="" draggable={false} onError={event => onIconError?.(row.id, event)}/> : <span className="mc-server-action-form__loading" hidden={row.icon.visible === false}/>}</div>}
        <Button disabled={disabled || readOnly || row.disabled} data-server-action-id={row.id} onClick={event => { if (event.defaultPrevented || disabled || readOnly || row.disabled || row.visible === false || scope.isComposing()) return; onAction?.(row.id, { row: { ...row, ...(row.icon ? { icon: { ...row.icon } } : {}) }, index, event }); }}>{row.text}</Button>
      </> : <StaticRow type={row.type} text={row.type === 'divider' ? undefined : row.text} spaced/>}
    </div>)}</div>
  </ServerFormFrame>;
});

interface LocalValue { type: ServerCustomEditableField['type']; value: ServerCustomValue }
/** Typed custom fields with one accepted value owner, keyed by stable caller IDs. */
export const ServerCustomForm = forwardRef<HTMLElement, ServerCustomFormProps>(function ServerCustomForm({ fields, value, defaultValue, onValueChange, onSubmit, onCancel, submitText = 'Submit', submitVisible = true, submitEnabled = true, onExpandedChange, inputProps = {}, inputRefs, dropdownRefs, multiselectRefs, optionRefs, disabled = false, readOnly = false, ...props }, ref) {
  validateFields(fields); const scope = useScope(ref), uid = useId();
  const [local, setLocal] = useState<Record<string, LocalValue>>(() => Object.fromEntries(fields.filter(editable).map(field => [field.id, { type: field.type, value: defaultValue && own(defaultValue, field.id) ? validateValue(field, defaultValue[field.id]!) : defaultFor(field) }])));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const accepted: ServerCustomFormValues = Object.fromEntries(fields.filter(editable).map(field => [field.id, value && own(value, field.id) ? validateValue(field, value[field.id]!) : value === undefined && own(local, field.id) && local[field.id]!.type === field.type ? validateValue(field, local[field.id]!.value) : defaultFor(field)]));
  const latest = useRef({ fields, accepted, value, disabled, readOnly, onValueChange }); latest.current = { fields, accepted, value, disabled, readOnly, onValueChange };
  const change = (id: string, type: ServerCustomEditableField['type'], next: ServerCustomValue, event?: ChangeEvent<HTMLInputElement>, optionValue?: string) => {
    const current = latest.current, field = current.fields.find(item => item.id === id);
    if (!field || !editable(field) || field.type !== type || current.disabled || current.readOnly || field.disabled) return;
    if ((field.type === 'dropdown' || field.type === 'step_slider') && !field.options.some(option => option.value === next && !option.disabled)) return;
    if (field.type === 'multiselect' && !field.options.some(option => option.value === optionValue && !option.disabled)) return;
    const validated = validateValue(field, next), result = { ...copyRecord(current.accepted), [id]: copyValue(validated) };
    if (current.value === undefined) setLocal(previous => ({ ...previous, [id]: { type, value: copyValue(validated) } }));
    current.onValueChange?.(result, { id, type, event });
  };
  const describe = (field: ServerCustomEditableField, child: ReactElement) => <SourceInfoTooltip content={field.tooltip} label={field.label} disabled={field.visible === false} scale={props.scale ?? 2}>{child}</SourceInfoTooltip>;
  const renderField = (field: ServerCustomField) => {
    if (!editable(field)) return <StaticRow type={field.type} text={field.type === 'divider' ? undefined : field.text}/>;
    const current = accepted[field.id]!, controlId = inputProps[field.id]?.id ?? `${uid}-${encodeURIComponent(field.id)}`, locked = disabled || !!field.disabled;
    if (field.type === 'input') {
      const attributes = inputProps[field.id] ?? {};
      return describe(field, <TextField {...attributes} ref={inputRefs?.[field.id]} id={controlId} type="text" label={field.label} value={current as string} placeholder={attributes.placeholder ?? field.placeholder} maxLength={attributes.maxLength ?? 100} spellCheck={attributes.spellCheck ?? false} disabled={locked} readOnly={readOnly}
        className={['mc-server-form__input', attributes.className].filter(Boolean).join(' ')} onChange={event => { attributes.onChange?.(event); if (!event.defaultPrevented) change(field.id, 'input', event.currentTarget.value, event); }}/>);
    }
    if (field.type === 'toggle') return describe(field, <Switch ref={inputRefs?.[field.id]} id={controlId} label={field.label} checked={current as boolean} disabled={locked} readOnly={readOnly} aria-readonly={readOnly || undefined} className="mc-server-form__toggle" onClick={event => { if (readOnly) event.preventDefault(); }} onChange={event => change(field.id, 'toggle', event.currentTarget.checked, event)}/>);
    if (field.type === 'slider') return describe(field, <Slider ref={inputRefs?.[field.id]} id={controlId} label={field.label} value={current as number} min={field.min} max={field.max} step={field.step} formatValue={field.formatValue} disabled={locked} aria-readonly={readOnly || undefined} onValueChange={next => change(field.id, 'slider', next)}/>);
    if (field.type === 'step_slider') { const index = Math.max(0, field.options.findIndex(option => option.value === current)); return describe(field, <Slider ref={inputRefs?.[field.id]} id={controlId} label={field.label} value={index} min={0} max={Math.max(0, field.options.length - 1)} step={1} formatValue={() => field.options.find(option => option.value === current)?.label ?? String(current)} disabled={locked || !field.options.length} aria-readonly={readOnly || undefined} onValueChange={next => { const option = field.options[next]; if (option && !option.disabled) change(field.id, 'step_slider', option.value); }}/>); }
    if (field.type === 'dropdown') return describe(field, <Combobox ref={dropdownRefs?.[field.id]} id={controlId} label={field.label} hidden={field.visible === false} value={current as string} options={field.options} placeholder={field.placeholder} disabled={locked} aria-readonly={readOnly || undefined} onValueChange={next => change(field.id, 'dropdown', next)}/>);
    const expanded = field.expanded ?? (own(open, field.id) ? open[field.id]! : field.defaultExpanded ?? false), selected = current as readonly string[];
    return <div className="mc-server-form__multiselect">
      <label id={`${controlId}-label`}>{field.label}</label>
      {describe(field, <button ref={multiselectRefs?.[field.id]} type="button" id={controlId} className="mc-combobox-trigger" aria-label={field.label} aria-expanded={expanded} aria-controls={`${controlId}-options`} disabled={disabled || (field.headerDisabled ?? field.disabled)}
        onClick={event => { if (event.defaultPrevented || disabled || (field.headerDisabled ?? field.disabled) || scope.isComposing()) return; if (field.expanded === undefined) setOpen(previous => ({ ...previous, [field.id]: !expanded })); onExpandedChange?.(field.id, !expanded, event); }}>
        <span className="mc-combobox-value">{field.summary ?? (field.options.filter(option => selected.includes(option.value)).map(option => option.label).join(', ') || field.placeholder || '\u00a0')}</span><span className="mc-combobox-chevron" aria-hidden="true"/>
      </button>)}
      <div id={`${controlId}-options`} className="mc-server-form__multiselect-options" hidden={!expanded} role="group" aria-labelledby={`${controlId}-label`}>{field.options.map(option => <div className="mc-server-form__multiselect-option" key={option.value} data-server-option={option.value}>
        <Checkbox ref={optionRefs?.[field.id]?.[option.value]} label={option.label} checked={selected.includes(option.value)} disabled={locked || option.disabled} readOnly={readOnly} aria-readonly={readOnly || undefined}
          onClick={event => { if (readOnly) event.preventDefault(); }} onChange={event => { const actual = latest.current.accepted[field.id]; if (!option.disabled && Array.isArray(actual)) change(field.id, 'multiselect', event.currentTarget.checked ? [...actual.filter(item => item !== option.value), option.value] : actual.filter(item => item !== option.value), event, option.value); }}/>
      </div>)}</div>
    </div>;
  };
  return <ServerFormFrame {...props} kind="custom" scope={scope} disabled={disabled} readOnly={readOnly} cancel={detail => onCancel?.(copyRecord(latest.current.accepted), detail)}>
    <div className="mc-server-custom-form__fields">{fields.map(field => <div key={field.id} data-server-field-id={field.id} data-server-field-type={field.type} hidden={field.visible === false}>{renderField(field)}</div>)}</div>
    <Button className="mc-server-custom-form__submit" data-server-action="submit" hidden={!submitVisible} disabled={disabled || readOnly || !submitEnabled}
      onClick={event => { if (!event.defaultPrevented && !disabled && !readOnly && submitEnabled && !scope.isComposing()) onSubmit?.(copyRecord(latest.current.accepted), event); }}>{submitText}</Button>
  </ServerFormFrame>;
});
