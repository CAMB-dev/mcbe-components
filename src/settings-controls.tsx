import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent, ReactNode, Ref, RefObject } from 'react';
import { Button, TextField } from './components';
import type { ButtonProps, TextFieldProps } from './components';

function classes(...values: (string | false | undefined)[]) { return values.filter(Boolean).join(' '); }
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value); else if (ref) ref.current = value;
}
function useFormReset(target: RefObject<HTMLInputElement | HTMLButtonElement | null>, reset: () => void) {
  const callback = useRef(reset); callback.current = reset;
  useEffect(() => {
    const doc = target.current?.ownerDocument; if (!doc) return;
    const pending = new Set<ReturnType<typeof setTimeout>>();
    const listener = (event: Event) => {
      if (event.target !== target.current?.form) return;
      // A microtask checkpoint can run between native capture and React's
      // bubbling onReset. Wait for the complete dispatch before honoring reset.
      const timer = setTimeout(() => {
        pending.delete(timer); if (!event.defaultPrevented) callback.current();
      }, 0);
      pending.add(timer);
    };
    doc.addEventListener('reset', listener, true);
    return () => {
      doc.removeEventListener('reset', listener, true);
      for (const timer of pending) clearTimeout(timer);
    };
  }, [target]);
}

export interface ToggleButtonProps extends ButtonProps {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}
/** Classic light_text_toggle states, with a native toggle-button keyboard path. */
export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(function ToggleButton({
  pressed, defaultPressed = false, onPressedChange, className, onClick, ...props
}, ref) {
  const [internal, setInternal] = useState(defaultPressed);
  const selected = pressed ?? internal;
  return <Button {...props} ref={ref} aria-pressed={selected}
    className={classes('mc-toggle-button', selected && 'mc-toggle-button--selected', className)}
    onClick={event => {
      onClick?.(event); if (event.defaultPrevented) return;
      if (pressed === undefined) setInternal(!selected); onPressedChange?.(!selected);
    }}/>;
});

export interface SearchFieldProps extends Omit<TextFieldProps, 'type' | 'value' | 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  /** Receives typing and clear-button changes; native onChange is retained for typing. */
  onValueChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  clearable?: boolean;
  clearLabel?: string;
  onClear?: () => void;
}
/** Search input using the source edit-box skin and original magnifying-glass PNG. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField({
  value, defaultValue = '', onValueChange, onSearch, clearable = true, clearLabel = 'Clear search', onClear,
  className, onChange, onKeyDown, disabled, readOnly, ...props
}, forwardedRef) {
  const input = useRef<HTMLInputElement | null>(null), initial = useRef(defaultValue);
  const [internal, setInternal] = useState(defaultValue), current = value ?? internal;
  useFormReset(input, () => { if (value === undefined) setInternal(initial.current); });
  const update = (next: string) => { if (value === undefined) setInternal(next); onValueChange?.(next); };
  return <div className={classes('mc-search-field', className)} data-clearable={clearable || undefined}>
    <TextField {...props} ref={node => { input.current = node; assignRef(forwardedRef, node); }} type="search"
      value={current} disabled={disabled} readOnly={readOnly}
      onChange={event => { update(event.currentTarget.value); onChange?.(event); }}
      onKeyDown={event => {
        onKeyDown?.(event); if (event.defaultPrevented || event.nativeEvent.isComposing) return;
        if (event.key === 'Enter') onSearch?.(current);
      }}/>
    <span className="mc-search-field__icon" aria-hidden="true"/>
    {clearable && current !== '' && !readOnly && <button type="button" disabled={disabled}
      aria-label={clearLabel} className="mc-search-field__clear" onClick={() => {
        update(''); onClear?.(); input.current?.focus();
      }}><span aria-hidden="true"/></button>}
  </div>;
});

export interface NavigationItem { value: string; label: ReactNode; icon?: ReactNode; disabled?: boolean }
export interface NavigationListProps extends Omit<HTMLAttributes<HTMLElement>, 'defaultValue' | 'onChange'> {
  label: string;
  items: readonly NavigationItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}
/** Settings section-toggle list; focus can move without committing selection. */
export const NavigationList = forwardRef<HTMLElement, NavigationListProps>(function NavigationList({
  label, items, value, defaultValue, onValueChange, disabled, className, onKeyDown, ...props
}, ref) {
  const [internal, setInternal] = useState(defaultValue ?? items.find(item => !item.disabled)?.value ?? '');
  const selected = value ?? internal, [focused, setFocused] = useState(selected);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.map((item, index) => !disabled && !item.disabled ? index : -1).filter(index => index >= 0);
  const focusIndex = items.findIndex(item => item.value === focused);
  const selectedIndex = items.findIndex(item => item.value === selected);
  const tabIndex = enabled.includes(focusIndex) ? focusIndex : enabled.includes(selectedIndex) ? selectedIndex : enabled[0];
  return <nav {...props} ref={ref} aria-label={label} className={classes('mc-navigation-list', className)} onKeyDown={event => {
    onKeyDown?.(event); if (event.defaultPrevented || !enabled.length || !enabled.some(index => buttons.current[index] === event.target)) return;
    const current = enabled.findIndex(index => buttons.current[index] === event.target);
    const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) :
      event.key === 'ArrowDown' ? enabled[(current + 1) % enabled.length] :
      event.key === 'ArrowUp' ? enabled[(current - 1 + enabled.length) % enabled.length] : undefined;
    if (next === undefined) return; event.preventDefault(); buttons.current[next]?.focus();
  }}>
    <div role="toolbar" aria-label={label} aria-orientation="vertical">{items.map((item, index) => <ToggleButton
      key={item.value} ref={node => { buttons.current[index] = node; }} pressed={selected === item.value}
      disabled={disabled || item.disabled} tabIndex={index === tabIndex ? 0 : -1}
      className="mc-navigation-list__item" onFocus={() => setFocused(item.value)}
      onPressedChange={() => { if (value === undefined) setInternal(item.value); onValueChange?.(item.value); }}>
      {item.icon && <span className="mc-navigation-list__icon" aria-hidden="true">{item.icon}</span>}
      <span className="mc-navigation-list__label">{item.label}</span>
    </ToggleButton>)}</div>
  </nav>;
});

export interface SettingControlProps { id: string; 'aria-labelledby': string; 'aria-describedby'?: string; disabled?: boolean }
export interface SettingRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  controlId?: string;
  layout?: 'stacked' | 'inline';
  children: (props: SettingControlProps) => ReactNode;
}
/** Source option_generic label/description/control composition, without cloning controls. */
export const SettingRow = forwardRef<HTMLDivElement, SettingRowProps>(function SettingRow({
  label, description, disabled, controlId, layout = 'stacked', children, className, ...props
}, ref) {
  const generated = useId(), id = controlId ?? generated, labelId = `${id}-label`, descriptionId = `${id}-description`;
  return <div {...props} ref={ref} className={classes('mc-setting-row', `mc-setting-row--${layout}`, className)}
    data-disabled={disabled || undefined}>
    <label className="mc-setting-row__label" id={labelId} htmlFor={id}>{label}</label>
    {description && <div className="mc-setting-row__description" id={descriptionId}>{description}</div>}
    <div className="mc-setting-row__control">{children({id, 'aria-labelledby': labelId,
      'aria-describedby': description ? descriptionId : undefined, disabled})}</div>
  </div>;
});

export interface KeybindingFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  label: ReactNode;
  value?: string;
  defaultValue?: string;
  resetValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  description?: ReactNode;
  error?: ReactNode;
  formatValue?: (value: string) => string;
  captureLabel?: string;
  unboundLabel?: string;
  resetLabel?: string;
}
function displayBinding(value: string) {
  return value.split('+').map(part => part.startsWith('Key') ? part.slice(3) : part.startsWith('Digit') ? part.slice(5) :
    ({Control: 'Ctrl', Meta: 'Meta', Space: 'Space'} as Record<string,string>)[part] ?? part).join(' + ');
}
/** Physical-key capture; game action mapping and conflict policy remain with the host. */
export const KeybindingField = forwardRef<HTMLDivElement, KeybindingFieldProps>(function KeybindingField({
  label, value, defaultValue = '', resetValue, onValueChange, disabled, name, description, error, formatValue = displayBinding,
  captureLabel = 'Press a key', unboundLabel = 'Unbound', resetLabel = 'Reset binding', className, onKeyDown, ...props
}, ref) {
  const id = useId(), initial = useRef(defaultValue), button = useRef<HTMLButtonElement | null>(null);
  const [internal, setInternal] = useState(defaultValue), [capturing, setCapturing] = useState(false), current = value ?? internal;
  const message = error || description, messageId = message ? `${id}-message` : undefined;
  useFormReset(button, () => { setCapturing(false); if (value === undefined) setInternal(initial.current); });
  useEffect(() => { if (disabled) setCapturing(false); }, [disabled]);
  const update = (next: string) => { if (value === undefined) setInternal(next); onValueChange?.(next); };
  const capture = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!capturing || event.defaultPrevented) return;
    if (event.key === 'Tab') { setCapturing(false); return; }
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Escape') { setCapturing(false); return; }
    if (event.repeat || event.nativeEvent.isComposing || ['Control','Alt','Shift','Meta','Dead','Process','Unidentified'].includes(event.key)) return;
    if (event.key === 'Delete' || event.key === 'Backspace') { update(''); setCapturing(false); return; }
    if (!event.code) return;
    update([event.ctrlKey && 'Control',event.altKey && 'Alt',event.shiftKey && 'Shift',event.metaKey && 'Meta',event.code].filter(Boolean).join('+'));
    setCapturing(false);
  };
  return <div {...props} ref={ref} className={classes('mc-keybinding', className)} onKeyDown={onKeyDown}>
    <div className="mc-keybinding__row">
      <label id={`${id}-label`} htmlFor={id} className="mc-keybinding__label">{label}</label>
      <Button id={id} ref={button} disabled={disabled} aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={messageId} aria-invalid={!!error || undefined} aria-pressed={capturing}
        className={classes('mc-keybinding__button', capturing && 'mc-keybinding__button--capturing')}
        onClick={() => setCapturing(active => !active)} onBlur={() => setCapturing(false)} onKeyDown={capture}>
        <span id={`${id}-value`}>{capturing ? captureLabel : current ? formatValue(current) : unboundLabel}</span>
      </Button>
      <Button className="mc-keybinding__reset" aria-label={resetLabel} aria-describedby={`${id}-label`}
        disabled={disabled || current === (resetValue ?? initial.current)} onClick={() => { setCapturing(false); update(resetValue ?? initial.current); }}>
        <span aria-hidden="true"/>
      </Button>
    </div>
    {name && <input type="hidden" name={name} value={current} disabled={disabled}/>}
    {message && <div id={messageId} className={classes('mc-keybinding__message', !!error && 'mc-keybinding__message--error')}>{message}</div>}
    <span className="mc-settings-sr" role="status">{capturing ? captureLabel : ''}</span>
  </div>;
});
