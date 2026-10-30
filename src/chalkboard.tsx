import { forwardRef, useCallback, useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, Ref, SyntheticEvent, TextareaHTMLAttributes } from 'react';
import { classicInputFontFamily, resolveClassicInputFont } from './classic-input-font';
import type { ClassicInputFontMode } from './classic-input-font';
import { workstationImageAssets } from './workstation-image-assets';
import { npcImageAssets } from './npc-image-assets';
import { bookAssets } from './book-assets';

/** Whole-value Han routing is a bounded Classic presentation candidate, not the recovered engine selector. */
export type ChalkboardFontMode = ClassicInputFontMode;
export type ChalkboardTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'dangerouslySetInnerHTML' | 'value' | 'defaultValue' | 'onChange' | 'disabled' | 'readOnly' | 'maxLength'>;
export type ChalkboardLockInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'size' | 'checked' | 'defaultChecked' | 'onChange' | 'disabled' | 'readOnly'>;
export interface ChalkboardTextFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'defaultValue' | 'onChange'> {
  /** Explicit source $text_box_size in logical units. The Web contract requires width>6 and height>4. */
  size: readonly [number, number]; maxLength: number; label: string; textEnabled: boolean;
  value?: string; defaultValue?: string; onValueChange?: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean; readOnly?: boolean; fontMode?: ChalkboardFontMode;
  textareaProps?: ChalkboardTextareaProps; containerRef?: Ref<HTMLDivElement>; scale?: number;
}
export interface ChalkboardLockProps extends ChalkboardLockInputProps {
  label: string; checked?: boolean; defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; readOnly?: boolean; scale?: number;
  rootProps?: Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'>;
}
export interface ChalkboardValue { readonly text: string; readonly locked: boolean }
export type ChalkboardChangeDetail = { field: 'text'; event: ChangeEvent<HTMLTextAreaElement> } | { field: 'locked'; event: ChangeEvent<HTMLInputElement> };
export interface ChalkboardCloseDetail { reason: 'close' | 'escape'; event: SyntheticEvent }
export interface ChalkboardEditorProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'defaultValue' | 'onChange'> {
  /** Required host-resolved source dimensions, not a hardcoded slate/poster/board preset. */
  panelSize: readonly [number, number]; textBoxSize: readonly [number, number]; maxLength: number; title: string;
  textEnabled: boolean; lockVisible: boolean; lockLabel: string; closeVisible: boolean;
  value?: ChalkboardValue; defaultValue?: ChalkboardValue;
  onValueChange?: (value: ChalkboardValue, detail: ChalkboardChangeDetail) => void;
  onCloseRequest?: (value: ChalkboardValue, detail: ChalkboardCloseDetail) => void;
  textLabel?: string; closeLabel?: string; disabled?: boolean; readOnly?: boolean; scale?: number; fontMode?: ChalkboardFontMode;
  textareaProps?: ChalkboardTextareaProps; lockInputProps?: ChalkboardLockInputProps;
  /** Host-supplied complete helper node. No platform glyph, description or input mapping is invented. */
  confirmHint?: ReactNode;
  textareaRef?: Ref<HTMLTextAreaElement>; lockRef?: Ref<HTMLInputElement>; closeRef?: Ref<HTMLButtonElement>; textFieldRef?: Ref<HTMLDivElement>;
}

const url = (value: string) => `url(${JSON.stringify(value)})`;
const images = {
  '--mc-chalkboard-panel': url(workstationImageAssets.panel.url),
  '--mc-chalkboard-edit': url(workstationImageAssets.editBox.url),
  '--mc-chalkboard-edit-hover': url(workstationImageAssets.editBoxHover.url),
  '--mc-chalkboard-off': url(new URL('./assets/player-permissions/toggle_off.png', import.meta.url).href),
  '--mc-chalkboard-off-hover': url(new URL('./assets/player-permissions/toggle_off_hover.png', import.meta.url).href),
  '--mc-chalkboard-on': url(npcImageAssets.toggle_on.url),
  '--mc-chalkboard-on-hover': url(npcImageAssets.toggle_on_hover.url),
  '--mc-chalkboard-close': url(bookAssets.close_button_default.url),
  '--mc-chalkboard-close-hover': url(bookAssets.close_button_hover.url),
  '--mc-chalkboard-close-pressed': url(bookAssets.close_button_pressed.url),
} as CSSProperties;
function checkScale(scale: number) { if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Chalkboard scale must be a positive safe integer.'); }
function checkSize(size: readonly [number, number], min: readonly [number, number], name: string) {
  if (!Array.isArray(size) || size.length !== 2 || !size.every(Number.isFinite) || size[0] <= min[0] || size[1] <= min[1]) throw new RangeError(`${name} width must exceed ${min[0]} and height must exceed ${min[1]}.`);
}
function checkLength(maxLength: number) { if (!Number.isSafeInteger(maxLength) || maxLength < 0) throw new RangeError('Chalkboard maxLength must be a nonnegative safe integer.'); }
function checkString(value: unknown, name: string) { if (typeof value !== 'string') throw new TypeError(`${name} must be a string.`); }
function checkBoolean(value: unknown, name: string) { if (typeof value !== 'boolean') throw new TypeError(`${name} must be boolean.`); }
function checkValue(value: ChalkboardValue) { if (!value || typeof value !== 'object') throw new TypeError('Chalkboard value must contain text and locked.'); checkString(value.text, 'text'); checkBoolean(value.locked, 'locked'); }
function copy(value: ChalkboardValue): ChalkboardValue { return { text: value.text, locked: value.locked }; }
function sheet(scale: number): CSSProperties { checkScale(scale); return { ...images, '--mc-chalkboard-unit': `${scale}px` } as CSSProperties; }
function useValue<T>(value: T | undefined, initial: T) { const [local, set] = useState(initial); return [value === undefined ? local : value, (next: T) => { if (value === undefined) set(next); }] as const; }
function useMergedRef<T>(own: { current: T | null }, ref: Ref<T> | undefined) {
  return useCallback((node: T | null) => {
    own.current = node;
    if (typeof ref === 'function') { const cleanup = ref(node); if (node && typeof cleanup === 'function') return () => { if (own.current === node) own.current = null; cleanup(); }; }
    else if (ref) ref.current = node;
  }, [own, ref]);
}

/** One stable native textarea; clip expansion and font routing only affect presentation. */
export const ChalkboardTextField = forwardRef<HTMLTextAreaElement, ChalkboardTextFieldProps>(function ChalkboardTextField({ size, maxLength, label, textEnabled, value: given, defaultValue = '', onValueChange, disabled = false, readOnly = false, fontMode = 'auto', textareaProps = {}, containerRef, scale = 2, className = '', style, ...props }, forwardedRef) {
  checkSize(size, [6, 4], 'Chalkboard text size'); checkLength(maxLength); checkString(label, 'label'); checkBoolean(textEnabled, 'textEnabled');
  const [value, setValue] = useValue(given, defaultValue); checkString(value, 'value');
  const accepted = useRef(value); accepted.current = value;
  const selectedFont = resolveClassicInputFont(fontMode, value), input = useRef<HTMLTextAreaElement>(null), merged = useMergedRef(input, forwardedRef);
  const { onCompositionStart, onCompositionUpdate, onCompositionEnd, style: inputStyle, className: inputClass = '', ...native } = textareaProps;
  const enabled = textEnabled && !disabled;
  return <div {...props} ref={containerRef} className={`mc-chalkboard-text-field ${className}`} data-enabled={enabled} data-readonly={readOnly} style={{ ...sheet(scale), width: size[0] * scale, height: size[1] * scale, ...style }}>
    <span className="mc-chalkboard-text-field__skin" aria-hidden="true" />
    <div className="mc-chalkboard-text-field__centering"><div className="mc-chalkboard-text-field__clipper">
      <textarea {...native} ref={merged} className={`mc-chalkboard-text-field__input ${inputClass}`} aria-label={native['aria-label'] ?? label} spellCheck={native.spellCheck ?? false} value={value} disabled={!enabled} readOnly={readOnly} maxLength={maxLength} data-font-role={selectedFont} style={{ '--mc-chalkboard-input-font': classicInputFontFamily(selectedFont), ...inputStyle } as CSSProperties}
        onChange={event => { if (!enabled || readOnly || event.defaultPrevented || event.nativeEvent.defaultPrevented) return; setValue(event.currentTarget.value); onValueChange?.(event.currentTarget.value, event); }}
        onCompositionStart={event => { const role = resolveClassicInputFont(fontMode, event.currentTarget.value); event.currentTarget.style.setProperty('--mc-chalkboard-input-font', classicInputFontFamily(role)); onCompositionStart?.(event); }}
        onCompositionUpdate={event => { const role = resolveClassicInputFont(fontMode, event.currentTarget.value); event.currentTarget.style.setProperty('--mc-chalkboard-input-font', classicInputFontFamily(role)); onCompositionUpdate?.(event); }}
        onCompositionEnd={event => { event.currentTarget.style.setProperty('--mc-chalkboard-input-font', classicInputFontFamily(resolveClassicInputFont(fontMode, accepted.current))); onCompositionEnd?.(event); }} />
    </div></div>
  </div>;
});

/** Source 16-unit row; its actual 30×16 toggle, including hitbox, is offset upward by eight units. */
export const ChalkboardLock = forwardRef<HTMLInputElement, ChalkboardLockProps>(function ChalkboardLock({ label, checked: given, defaultChecked = false, onCheckedChange, disabled = false, readOnly = false, scale = 2, rootProps = {}, onClick, id: suppliedId, ...props }, ref) {
  const uid = useId(), id = suppliedId ?? `${uid}-lock`; checkString(label, 'label');
  const [checked, setChecked] = useValue(given, defaultChecked); checkBoolean(checked, 'checked');
  const { className = '', style, ...root } = rootProps;
  return <div {...root} className={`mc-chalkboard-lock ${className}`} style={{ ...sheet(scale), ...style }}>
    <span className="mc-chalkboard-lock__toggle" data-checked={checked} data-disabled={disabled}>
      <input {...props} ref={ref} id={id} type="checkbox" checked={checked} disabled={disabled} readOnly={readOnly} aria-readonly={readOnly || undefined} onClick={event => { onClick?.(event); if (readOnly) event.preventDefault(); }} onChange={event => { if (disabled || readOnly || event.defaultPrevented || event.nativeEvent.defaultPrevented) return; setChecked(event.currentTarget.checked); onCheckedChange?.(event.currentTarget.checked, event); }} />
      <span className="mc-chalkboard-lock__image" aria-hidden="true" />
    </span>
    <span className="mc-chalkboard-lock__label-wrap"><label htmlFor={id}>{label}</label></span>
  </div>;
});

export const ChalkboardEditor = forwardRef<HTMLElement, ChalkboardEditorProps>(function ChalkboardEditor({ panelSize, textBoxSize, maxLength, title, textEnabled, lockVisible, lockLabel, closeVisible, value: given, defaultValue = { text: '', locked: false }, onValueChange, onCloseRequest, textLabel = title, closeLabel = 'Close', disabled = false, readOnly = false, scale = 2, fontMode = 'auto', textareaProps, lockInputProps, confirmHint, textareaRef, lockRef, closeRef, textFieldRef, className = '', style, onKeyDown, onClick, onCompositionStartCapture, onCompositionEndCapture, ...props }, forwardedRef) {
  checkSize(panelSize, [16, 31], 'Chalkboard panel size'); checkSize(textBoxSize, [6, 4], 'Chalkboard text size'); checkLength(maxLength); checkString(title, 'title'); checkString(textLabel, 'textLabel'); checkString(closeLabel, 'closeLabel'); checkString(lockLabel, 'lockLabel'); checkBoolean(textEnabled, 'textEnabled'); checkBoolean(lockVisible, 'lockVisible'); checkBoolean(closeVisible, 'closeVisible');
  const [value, setValue] = useValue(given, defaultValue); checkValue(value);
  const root = useRef<HTMLElement>(null), merged = useMergedRef(root, forwardedRef), input = useRef<HTMLTextAreaElement>(null), mergedInput = useMergedRef(input, textareaRef), composing = useRef(new Set<EventTarget>()), uid = useId();
  const emit = (next: ChalkboardValue, detail: ChalkboardChangeDetail) => { if (disabled || readOnly || detail.event.defaultPrevented) return; setValue(copy(next)); onValueChange?.(copy(next), detail); };
  const cleanComposition = () => { for (const target of composing.current) if (!(target instanceof Node) || !target.isConnected || (target === input.current && input.current.disabled)) composing.current.delete(target); };
  const close = (reason: ChalkboardCloseDetail['reason'], event: SyntheticEvent) => { cleanComposition(); if (disabled || event.defaultPrevented || composing.current.size) return; onCloseRequest?.(copy(value), { reason, event }); };
  return <section {...props} ref={merged} role={props.role ?? 'region'} aria-label={props['aria-label'] ?? title} tabIndex={props.tabIndex ?? -1} className={`mc-chalkboard-editor ${className}`} style={{ ...sheet(scale), width: panelSize[0] * scale, height: panelSize[1] * scale, ...style }}
    onClick={event => { onClick?.(event); if (closeVisible && (event.target as Element).closest('.mc-chalkboard-editor__close')) close('close', event); }}
    onCompositionStartCapture={event => { composing.current.add(event.target); onCompositionStartCapture?.(event); }} onCompositionEndCapture={event => { composing.current.delete(event.target); onCompositionEndCapture?.(event); }}
    onKeyDown={event => { onKeyDown?.(event); cleanComposition(); if (event.defaultPrevented || disabled || event.nativeEvent.isComposing || event.keyCode === 229 || composing.current.size || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.key !== 'Escape') return; if (event.currentTarget.ownerDocument.activeElement === input.current) { input.current?.blur(); root.current?.focus({ preventScroll: true }); event.preventDefault(); event.stopPropagation(); } else { close('escape', event); event.preventDefault(); event.stopPropagation(); } }}>
    <span className="mc-chalkboard-editor__skin" aria-hidden="true" />
    <h2 className="mc-chalkboard-editor__title" id={`${uid}-title`}>{title}</h2>
    <div className="mc-chalkboard-editor__indent">
      <div className="mc-chalkboard-editor__helpers"><div className="mc-chalkboard-editor__confirm-hint">{confirmHint}</div></div>
      <ChalkboardTextField ref={mergedInput} containerRef={textFieldRef} size={textBoxSize} maxLength={maxLength} label={textLabel} textEnabled={textEnabled} value={value.text} disabled={disabled} readOnly={readOnly} fontMode={fontMode} textareaProps={textareaProps} scale={scale} className="mc-chalkboard-editor__text" onValueChange={(text, event) => emit({ text, locked: value.locked }, { field: 'text', event })} />
      <div className="mc-chalkboard-editor__lock" hidden={!lockVisible}><ChalkboardLock {...lockInputProps} ref={lockRef} label={lockLabel} checked={value.locked} disabled={disabled || !lockVisible} readOnly={readOnly} scale={scale} onCheckedChange={(locked, event) => emit({ text: value.text, locked }, { field: 'locked', event })} /></div>
    </div>
    <button ref={closeRef} type="button" className="mc-chalkboard-editor__close" aria-label={closeLabel} hidden={!closeVisible} disabled={disabled || !closeVisible}><span aria-hidden="true" /></button>
  </section>;
});
