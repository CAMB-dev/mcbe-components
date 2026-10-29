import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ForwardedRef, ReactNode, SelectHTMLAttributes, SyntheticEvent } from 'react';
import { GuiIcon } from './gui-icon';

export interface ComboboxOption { value: string; label: string; disabled?: boolean }
export interface ComboboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'onChange' | 'type'> {
  label: ReactNode;
  options: readonly ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
}

interface ComboboxBaseProps extends ComboboxProps {
  /** Internal Select adapter; the public Combobox continues to forward its button. */
  nativeAdapter?: { props: SelectHTMLAttributes<HTMLSelectElement>; ref: ForwardedRef<HTMLSelectElement> };
}
const valuesOf = (value: SelectHTMLAttributes<HTMLSelectElement>['value']): string[] => value === undefined ? [] : Array.isArray(value) ? value.map(String) : [String(value)];

/** Internal shared visible control. There is exactly one successful native form control. */
export const ComboboxBase = forwardRef<HTMLButtonElement, ComboboxBaseProps>(function ComboboxBase({
  label, options, value, defaultValue, onValueChange, placeholder, description, error,
  required, name, form, disabled, id: givenId, className, onClick, onKeyDown, onBlur,
  onFocus, nativeAdapter, 'aria-describedby': describedBy, ...props
}, forwardedRef) {
  const autoId = useId(); const id = givenId ?? autoId;
  const triggerId = nativeAdapter ? `${id}-trigger` : id;
  const multiple = !!nativeAdapter?.props.multiple;
  const controlled = nativeAdapter ? nativeAdapter.props.value !== undefined : value !== undefined;
  const initial = nativeAdapter
    ? nativeAdapter.props.defaultValue !== undefined ? valuesOf(nativeAdapter.props.defaultValue) : multiple ? [] : [options.find(option => !option.disabled)?.value ?? '']
    : [defaultValue ?? (placeholder ? '' : options.find(option => !option.disabled)?.value ?? '')];
  const [internal, setInternal] = useState(initial);
  const requested = controlled ? valuesOf(nativeAdapter ? nativeAdapter.props.value : value) : internal;
  const currentValues = !multiple && nativeAdapter && !options.some(option => option.value === requested[0])
    ? [options.find(option => !option.disabled)?.value ?? ''] : multiple ? requested : requested.slice(0, 1);
  const current = currentValues[0] ?? '';
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [validation, setValidation] = useState('');
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const focusTransfer = useRef(false);
  const nativeProps = { ...nativeAdapter?.props };
  delete nativeProps.value; delete nativeProps.defaultValue;
  const hidden = !!(props.hidden || nativeProps.hidden);
  const resetSelection = useRef({ controlled, initial, values: currentValues });
  resetSelection.current = { controlled, initial, values: currentValues };
  const search = useRef({ text: '', time: 0 });
  useImperativeHandle(forwardedRef, () => trigger.current!, []);
  useImperativeHandle(nativeAdapter?.ref, () => native.current!, []);
  const selected = options.filter(option => currentValues.includes(option.value));
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
  const message = error || validation || description;
  const invalid = !!(error || validation);
  const activeId = open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  function show(index?: number) {
    if (hidden || disabled || native.current?.matches(':disabled') || !enabled.length) return;
    const selectedIndex = options.findIndex(option => currentValues.includes(option.value) && !option.disabled);
    setActiveIndex(index ?? (selectedIndex >= 0 ? selectedIndex : enabled[0]!));
    setOpen(true);
  }
  function commit(index: number) {
    const option = options[index];
    if (hidden || disabled || native.current?.matches(':disabled') || !option || option.disabled) return;
    const next = multiple ? currentValues.includes(option.value) ? currentValues.filter(value => value !== option.value) : [...currentValues, option.value] : [option.value];
    setValidation('');
    if (multiple || option.value !== current) {
      const element = native.current;
      if (element) {
        for (const child of element.options) child.selected = next.includes(child.value);
        const EventClass = element.ownerDocument.defaultView!.Event;
        element.dispatchEvent(new EventClass('input', { bubbles: true }));
        element.dispatchEvent(new EventClass('change', { bubbles: true }));
      }
    }
    if (!multiple) setOpen(false); trigger.current?.focus();
  }
  function nativeEvent<E extends SyntheticEvent<HTMLSelectElement>>(event: SyntheticEvent, handler: ((event: E) => void) | undefined) {
    if (!handler || !native.current) return;
    // Visible interaction stays on the APG trigger; legacy Select handlers keep
    // their native element target. onChange itself is a real native change event.
    const element = native.current;
    handler(new Proxy(event, { get(target, key) {
      if (key === 'target' || key === 'currentTarget') return element;
      const result: unknown = Reflect.get(target, key, target);
      return typeof result === 'function' ? result.bind(target) : result;
    } }) as E);
  }
  function synchronize(element: HTMLSelectElement, values: readonly string[]) {
    if (multiple) for (const option of element.options) option.selected = values.includes(option.value);
    else {
      const requested = values[0] ?? '';
      const fallback = Array.from(element.options).find(option => !option.disabled)?.value ?? '';
      element.value = Array.from(element.options).some(option => option.value === requested) ? requested : fallback;
    }
  }
  const nativeAccessibility = Object.fromEntries(Object.entries(nativeProps).filter(([key]) => key.startsWith('aria-')));
  const nativeTriggerHandlers = Object.fromEntries(Object.entries(nativeProps).filter(([key, handler]) => /^on[A-Z]/.test(key) && typeof handler === 'function'
    && !/^on(Change|Input|Invalid)(Capture)?$/.test(key)
    && !['onClick', 'onFocus', 'onBlur', 'onKeyDown', 'onKeyUp'].includes(key)).map(([key, handler]) => [key, (event: SyntheticEvent) => {
      if (focusTransfer.current && /^on(Focus|Blur)/.test(key)) return;
      nativeEvent(event, handler as (event: SyntheticEvent<HTMLSelectElement>) => void);
    }]));
  function move(delta: number) {
    const index = enabled.indexOf(activeIndex);
    const next = enabled[Math.max(0, Math.min(enabled.length - 1, index + delta))];
    if (next !== undefined) setActiveIndex(next);
  }

  useEffect(() => {
    if (!open || disabled || hidden) { if (disabled || hidden) setOpen(false); return; }
    const list = popup.current; const button = trigger.current;
    if (!list || !button) return;
    function position() {
      if (!list || !button) return;
      const rect = button.getBoundingClientRect();
      const view = button.ownerDocument.defaultView!;
      // Mobile browsers can expand innerWidth/innerHeight to fit overflowing
      // page content. Keep the popup within the intended layout viewport, and
      // also respect the smaller visible area after pinch zoom / a soft keyboard.
      const documentElement = button.ownerDocument.documentElement;
      const visual = view.visualViewport;
      const left = Math.max(0, visual?.offsetLeft ?? 0), top = Math.max(0, visual?.offsetTop ?? 0);
      // Anchor visibility uses the actual visual viewport. An overflowing page can
      // expose an anchor outside the smaller intended layout-viewport bounds.
      const visualRight = left + (visual?.width ?? documentElement.clientWidth);
      const visualBottom = top + (visual?.height ?? documentElement.clientHeight);
      // Popup dimensions retain the intended layout cap at the panned origin.
      const right = left + Math.min(documentElement.clientWidth, visual?.width ?? documentElement.clientWidth);
      const bottom = top + Math.min(documentElement.clientHeight, visual?.height ?? documentElement.clientHeight);
      if (right - left <= 16 || bottom - top <= 16 || rect.bottom <= top || rect.top >= visualBottom || rect.right <= left || rect.left >= visualRight) { setOpen(false); return; }
      const width = Math.min(rect.width, right - left - 16);
      const below = Math.max(0, bottom - rect.bottom - 8);
      const above = Math.max(0, rect.top - top - 8);
      const flip = below < Math.min(options.length * 40 + 8, 280) && above > below;
      list.style.width = `${width}px`;
      list.style.maxHeight = `${Math.max(0, Math.min(280, flip ? above : below))}px`;
      list.style.left = `${Math.max(left + 8, Math.min(rect.left, right - width - 8))}px`;
      const preferredTop = flip ? rect.top - 4 - list.offsetHeight : rect.bottom + 4;
      list.style.top = `${Math.max(top + 8, Math.min(preferredTop, bottom - list.offsetHeight - 8))}px`;
      list.dataset.side = flip ? 'top' : 'bottom';
    }
    list.showPopover?.(); position();
    const doc = button.ownerDocument;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false);
    };
    doc.addEventListener('pointerdown', closeOutside, true);
    doc.addEventListener('scroll', position, true);
    doc.defaultView?.addEventListener('resize', position);
    doc.defaultView?.visualViewport?.addEventListener('resize', position);
    doc.defaultView?.visualViewport?.addEventListener('scroll', position);
    const observer = new ResizeObserver(position); observer.observe(button);
    return () => {
      list.hidePopover?.(); observer.disconnect();
      doc.removeEventListener('pointerdown', closeOutside, true);
      doc.removeEventListener('scroll', position, true);
      doc.defaultView?.removeEventListener('resize', position);
      doc.defaultView?.visualViewport?.removeEventListener('resize', position);
      doc.defaultView?.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open, disabled, hidden, options.length]);
  useEffect(() => {
    if (open && activeId) trigger.current?.ownerDocument.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeId]);
  useEffect(() => {
    const element = native.current; const owner = element?.form;
    if (!owner) return;
    const pending = new Set<ReturnType<typeof setTimeout>>();
    const reset = (event: Event) => { const timer = setTimeout(() => {
      pending.delete(timer); if (event.defaultPrevented) return;
      const state = resetSelection.current, next = state.controlled ? state.values : state.initial;
      // Native reset mutates the actual select even when React state is unchanged.
      // Restore it explicitly, including pristine and externally controlled forms.
      if (native.current) synchronize(native.current, next);
      if (!state.controlled) setInternal([...next]);
      setValidation(''); setOpen(false);
    }, 0); pending.add(timer); };
    owner.addEventListener('reset', reset);
    return () => { owner.removeEventListener('reset', reset); for (const timer of pending) clearTimeout(timer); };
  }, [JSON.stringify(initial), controlled, form]);
  useEffect(() => {
    if (open && !enabled.includes(activeIndex)) {
      if (!enabled.length) setOpen(false);
      else setActiveIndex(enabled[0]!);
    }
  }, [open, activeIndex, enabled.join(',')]);

  return <div className={['mc-field', 'mc-combobox', className].filter(Boolean).join(' ')} ref={wrapper} hidden={hidden}>
    <label className="mc-field__label" id={`${id}-label`} htmlFor={triggerId}>{label}</label>
    <select {...nativeProps} ref={element => {
      native.current = element;
      if (element) {
        // Keep real option defaults so native pristine reset is correct before
        // the deferred, cancelable reset synchronization runs.
        for (const option of element.options) option.defaultSelected = (controlled ? currentValues : initial).includes(option.value);
        synchronize(element, currentValues);
      }
    }} id={nativeAdapter ? id : undefined} className={['mc-combobox-native', nativeAdapter && 'mc-select'].filter(Boolean).join(' ')} tabIndex={-1} aria-hidden="true" autoFocus={false} name={name} form={form}
      required={required} disabled={disabled} multiple={multiple} value={multiple ? currentValues : current}
      aria-invalid={invalid || nativeAdapter?.props['aria-invalid']}
      aria-describedby={[describedBy, message ? `${id}-message` : undefined].filter(Boolean).join(' ') || undefined}
      onChange={event => {
        const next = multiple ? Array.from(event.currentTarget.selectedOptions, option => option.value) : [event.currentTarget.value];
        if (!controlled) setInternal(next);
        setValidation(''); nativeAdapter?.props.onChange?.(event); onValueChange?.(next[0] ?? '');
      }}
      onFocus={event => {
        nativeAdapter?.props.onFocus?.(event);
        focusTransfer.current = true; trigger.current?.focus(); focusTransfer.current = false;
      }}
      onBlur={event => { if (!focusTransfer.current) nativeAdapter?.props.onBlur?.(event); }}
      onFocusCapture={event => { if (!focusTransfer.current) nativeProps.onFocusCapture?.(event); }}
      onBlurCapture={event => { if (!focusTransfer.current) nativeProps.onBlurCapture?.(event); }}
      onInvalid={event => {
        nativeAdapter?.props.onInvalid?.(event);
        const prevented = event.defaultPrevented; event.preventDefault();
        if (!prevented) { setValidation(event.currentTarget.validationMessage); trigger.current?.focus(); }
      }}>
      {!nativeAdapter && (placeholder || !selected.length) && <option value="">{placeholder ?? ''}</option>}
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    <button {...nativeAccessibility} {...nativeTriggerHandlers} {...props} ref={trigger} id={triggerId} type="button" role="combobox" className="mc-combobox-trigger"
      disabled={disabled} aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-listbox`}
      aria-labelledby={props['aria-labelledby'] ?? (props['aria-label'] ? undefined : `${id}-label`)} aria-activedescendant={activeId} aria-required={required || undefined}
      aria-invalid={invalid || props['aria-invalid']} aria-describedby={[describedBy, message ? `${id}-message` : undefined].filter(Boolean).join(' ') || undefined}
      onClick={event => { onClick?.(event); nativeEvent(event, nativeAdapter?.props.onClick); if (!event.defaultPrevented) { if (open) setOpen(false); else show(); } }}
      onFocus={event => { onFocus?.(event); if (!focusTransfer.current) nativeEvent(event, nativeAdapter?.props.onFocus); }}
      onBlur={event => { onBlur?.(event); nativeEvent(event, nativeAdapter?.props.onBlur); if (!wrapper.current?.contains(event.relatedTarget)) setOpen(false); }}
      onKeyUp={event => { props.onKeyUp?.(event); nativeEvent(event, nativeAdapter?.props.onKeyUp); }}
      onKeyDown={event => {
        onKeyDown?.(event); nativeEvent(event, nativeAdapter?.props.onKeyDown); if (event.defaultPrevented || event.nativeEvent.isComposing) return;
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (event.key === 'Tab') { setOpen(false); return; }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (open) commit(activeIndex); else show(); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) show(); else move(event.key === 'ArrowDown' ? 1 : -1); return; }
        if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); const next = event.key === 'Home' ? enabled[0] : enabled.at(-1); if (next !== undefined) { if (!open) show(next); else setActiveIndex(next); } return; }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          const now = Date.now(); const text = (now - search.current.time > 700 ? '' : search.current.text) + event.key.toLocaleLowerCase();
          search.current = { text, time: now };
          const repeated = [...text].every(char => char === text[0]); const prefix = repeated ? text[0]! : text;
          const start = repeated ? activeIndex + 1 : Math.max(activeIndex, 0);
          const next = options.map((_, index) => (index + start + options.length) % options.length)
            .find(index => !options[index]!.disabled && options[index]!.label.toLocaleLowerCase().startsWith(prefix));
          if (next !== undefined) { if (!open) show(next); else setActiveIndex(next); }
        }
      }}>
      <span className={selected.length ? 'mc-combobox-value' : 'mc-combobox-placeholder'}>{selected.length ? selected.map(option => option.label).join(', ') : placeholder ?? '\u00a0'}</span>
      <span className="mc-combobox-chevron" aria-hidden="true"/>
    </button>
    <div ref={popup} id={`${id}-listbox`} role="listbox" aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby'] ?? (props['aria-label'] ? undefined : `${id}-label`)} aria-multiselectable={multiple || undefined} popover="manual"
      hidden={!open} className="mc-combobox-popup">
      {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option"
        aria-selected={currentValues.includes(option.value)} aria-disabled={option.disabled || undefined} data-active={activeIndex === index || undefined}
        className="mc-combobox-option" onPointerMove={() => { if (!option.disabled) setActiveIndex(index); }}
        onPointerDown={event => event.preventDefault()} onClick={() => commit(index)}>
        <span className="mc-combobox-option-mark" aria-hidden="true"/><span>{option.label}</span>
      </div>)}
    </div>
    {message && <span id={`${id}-message`} className={['mc-field__description', invalid && 'mc-field__error'].filter(Boolean).join(' ')}>
      {invalid ? <><GuiIcon name="error-glyph" className="mc-field__error-icon" aria-hidden="true"/><span className="mc-field__error-text">{message}</span></> : message}
    </span>}
  </div>;
});

/** Select-only APG combobox. Native select supplies FormData and validation. */
export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(props, ref) {
  return <ComboboxBase {...props} ref={ref}/>;
});
