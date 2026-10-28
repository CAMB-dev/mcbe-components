import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

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

/** Select-only APG combobox. Native select supplies FormData and validation. */
export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox({
  label, options, value, defaultValue, onValueChange, placeholder, description, error,
  required, name, form, disabled, id: givenId, className, onClick, onKeyDown, onBlur,
  'aria-describedby': describedBy, ...props
}, forwardedRef) {
  const autoId = useId(); const id = givenId ?? autoId;
  const initial = defaultValue ?? (placeholder ? '' : options.find(option => !option.disabled)?.value ?? '');
  const [internal, setInternal] = useState(initial);
  const current = value ?? internal;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [validation, setValidation] = useState('');
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const search = useRef({ text: '', time: 0 });
  useImperativeHandle(forwardedRef, () => trigger.current!, []);
  const selected = options.find(option => option.value === current);
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
  const message = error || validation || description;
  const invalid = !!(error || validation);
  const activeId = open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  function show(index?: number) {
    if (disabled || !enabled.length) return;
    const selectedIndex = options.findIndex(option => option.value === current && !option.disabled);
    setActiveIndex(index ?? (selectedIndex >= 0 ? selectedIndex : enabled[0]!));
    setOpen(true);
  }
  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    if (value === undefined) setInternal(option.value);
    setValidation('');
    if (option.value !== current) onValueChange?.(option.value);
    setOpen(false); trigger.current?.focus();
  }
  function move(delta: number) {
    const index = enabled.indexOf(activeIndex);
    const next = enabled[Math.max(0, Math.min(enabled.length - 1, index + delta))];
    if (next !== undefined) setActiveIndex(next);
  }

  useEffect(() => {
    if (!open || disabled) { if (disabled) setOpen(false); return; }
    const list = popup.current; const button = trigger.current;
    if (!list || !button) return;
    function position() {
      if (!list || !button) return;
      const rect = button.getBoundingClientRect();
      const view = button.ownerDocument.defaultView!;
      if (rect.bottom <= 0 || rect.top >= view.innerHeight || rect.right <= 0 || rect.left >= view.innerWidth) { setOpen(false); return; }
      const width = Math.min(rect.width, view.innerWidth - 16);
      const below = view.innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const flip = below < Math.min(options.length * 40 + 8, 280) && above > below;
      list.style.width = `${width}px`;
      list.style.maxHeight = `${Math.max(0, Math.min(280, flip ? above : below))}px`;
      list.style.left = `${Math.max(8, Math.min(rect.left, view.innerWidth - width - 8))}px`;
      list.style.top = `${flip ? Math.max(8, rect.top - 4 - list.offsetHeight) : rect.bottom + 4}px`;
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
    const observer = new ResizeObserver(position); observer.observe(button);
    return () => {
      list.hidePopover?.(); observer.disconnect();
      doc.removeEventListener('pointerdown', closeOutside, true);
      doc.removeEventListener('scroll', position, true);
      doc.defaultView?.removeEventListener('resize', position);
    };
  }, [open, disabled, options.length]);
  useEffect(() => {
    if (open && activeId) trigger.current?.ownerDocument.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeId]);
  useEffect(() => {
    const element = native.current; const owner = element?.form;
    if (!owner) return;
    const reset = (event: Event) => { queueMicrotask(() => { if (!event.defaultPrevented) { if (value === undefined) setInternal(initial); setValidation(''); setOpen(false); } }); };
    owner.addEventListener('reset', reset);
    return () => owner.removeEventListener('reset', reset);
  }, [initial, value, form]);

  return <div className={['mc-field', 'mc-combobox', className].filter(Boolean).join(' ')} ref={wrapper}>
    <label className="mc-field__label" id={`${id}-label`} htmlFor={id}>{label}</label>
    <select ref={native} className="mc-combobox-native" tabIndex={-1} aria-hidden="true" name={name} form={form}
      required={required} disabled={disabled} value={current}
      onChange={event => { if (value === undefined) setInternal(event.target.value); onValueChange?.(event.target.value); setValidation(''); }}
      onInvalid={event => { event.preventDefault(); setValidation(event.currentTarget.validationMessage); trigger.current?.focus(); }}>
      {(placeholder || !selected) && <option value="">{placeholder ?? ''}</option>}
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    <button {...props} ref={trigger} id={id} type="button" role="combobox" className="mc-combobox-trigger"
      disabled={disabled} aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-listbox`}
      aria-labelledby={`${id}-label`} aria-activedescendant={activeId} aria-required={required || undefined}
      aria-invalid={invalid || props['aria-invalid']} aria-describedby={[describedBy, message ? `${id}-message` : undefined].filter(Boolean).join(' ') || undefined}
      onClick={event => { onClick?.(event); if (!event.defaultPrevented) { if (open) setOpen(false); else show(); } }}
      onBlur={event => { onBlur?.(event); if (!wrapper.current?.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={event => {
        onKeyDown?.(event); if (event.defaultPrevented) return;
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
      <span className={selected ? 'mc-combobox-value' : 'mc-combobox-placeholder'}>{selected?.label ?? placeholder ?? '\u00a0'}</span>
      <span className="mc-combobox-chevron" aria-hidden="true"/>
    </button>
    <div ref={popup} id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`} popover="manual"
      hidden={!open} className="mc-combobox-popup">
      {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option"
        aria-selected={current === option.value} aria-disabled={option.disabled || undefined} data-active={activeIndex === index || undefined}
        className="mc-combobox-option" onPointerMove={() => { if (!option.disabled) setActiveIndex(index); }}
        onPointerDown={event => event.preventDefault()} onClick={() => commit(index)}>
        <span className="mc-combobox-option-mark" aria-hidden="true"/><span>{option.label}</span>
      </div>)}
    </div>
    {message && <span id={`${id}-message`} className={['mc-field__description', invalid && 'mc-field__error'].filter(Boolean).join(' ')}>{message}</span>}
  </div>;
});
