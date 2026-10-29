import {
  forwardRef, useEffect, useId, useRef, useState,
} from 'react';
import type {
  ButtonHTMLAttributes, CSSProperties, FieldsetHTMLAttributes, HTMLAttributes,
  InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from './feedback';
import { ComboboxBase } from './combobox';
import { GuiIcon } from './gui-icon';

function cx(...names: (string | false | undefined)[]) { return names.filter(Boolean).join(' '); }
function useValue<T>(value: T | undefined, defaultValue: T, onChange?: (value: T) => void) {
  const [internal, setInternal] = useState(defaultValue);
  return [value === undefined ? internal : value, (next: T) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }] as const;
}

const scrollLocks = new WeakMap<Document, { count: number; overflow: string }>();
function lockScroll(doc: Document) {
  let state = scrollLocks.get(doc);
  if (!state) {
    state = { count: 0, overflow: doc.documentElement.style.overflow };
    scrollLocks.set(doc, state);
    doc.documentElement.style.overflow = 'hidden';
  }
  state.count++;
  return () => {
    const current = scrollLocks.get(doc);
    if (current && --current.count === 0) {
      doc.documentElement.style.overflow = current.overflow;
      scrollLocks.delete(doc);
    }
  };
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'default', size = 'md', fullWidth, loading, startIcon, endIcon,
  className, children, disabled, type = 'button', ...props
}, ref) {
  return <button {...props} ref={ref} type={type} disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cx('mc-button', `mc-button--${variant}`, `mc-button--${size}`, fullWidth && 'mc-full', className)}>
    {loading ? <Spinner decorative/> : startIcon}
    <span className="mc-button__label">{children}</span>{endIcon}
  </button>;
});

export interface IconButtonProps extends Omit<ButtonProps, 'startIcon' | 'endIcon'> { 'aria-label': string }
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ className, ...props }, ref) {
  return <Button {...props} ref={ref} className={cx('mc-icon-button', className)}/>;
});

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'inset';
}
export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel({ title, footer, variant = 'default', className, children, ...props }, ref) {
  const id = useId();
  return <section {...props} ref={ref} aria-labelledby={title ? id : props['aria-labelledby']}
    className={cx('mc-panel', `mc-panel--${variant}`, className)}>
    {title && <div className="mc-panel__header" id={id}>{title}</div>}
    <div className="mc-panel__body">{children}</div>
    {footer && <div className="mc-panel__footer">{footer}</div>}
  </section>;
});

interface FieldProps { label: ReactNode; description?: ReactNode; error?: ReactNode; }
export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {}
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({
  label, description, error, id: givenId, className, 'aria-describedby': describedBy, ...props
}, ref) {
  const autoId = useId(); const id = givenId ?? autoId;
  const message = error || description;
  return <div className={cx('mc-field', className)}>
    <label className="mc-field__label" htmlFor={id}>{label}</label>
    <input {...props} ref={ref} id={id} className="mc-input" aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={cx(describedBy, !!message && `${id}-message`) || undefined}/>
    {message && <span id={`${id}-message`} className={cx('mc-field__description', !!error && 'mc-field__error')}>
      {error ? <><GuiIcon name="error-glyph" className="mc-field__error-icon" aria-hidden="true"/><span className="mc-field__error-text">{message}</span></> : message}
    </span>}
  </div>;
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldProps {}
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({
  label, description, error, id: givenId, className, 'aria-describedby': describedBy, ...props
}, ref) {
  const autoId = useId(); const id = givenId ?? autoId; const message = error || description;
  return <div className={cx('mc-field', className)}>
    <label className="mc-field__label" htmlFor={id}>{label}</label>
    <textarea {...props} ref={ref} id={id} className="mc-input mc-textarea" aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={cx(describedBy, !!message && `${id}-message`) || undefined}/>
    {message && <span id={`${id}-message`} className={cx('mc-field__description', !!error && 'mc-field__error')}>
      {error ? <><GuiIcon name="error-glyph" className="mc-field__error-icon" aria-hidden="true"/><span className="mc-field__error-text">{message}</span></> : message}
    </span>}
  </div>;
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
}
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({
  label, description, indeterminate = false, className, id: givenId, ...props
}, forwardedRef) {
  const autoId = useId(); const id = givenId ?? autoId; const node = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (node.current) node.current.indeterminate = indeterminate; }, [indeterminate]);
  return <label className={cx('mc-choice', props.disabled && 'mc-is-disabled', className)} htmlFor={id}>
    <input {...props} id={id} type="checkbox" className="mc-choice__input"
      aria-describedby={cx(props['aria-describedby'], !!description && `${id}-description`) || undefined}
      ref={element => {
        node.current = element;
        if (element) element.indeterminate = indeterminate;
        if (typeof forwardedRef === 'function') forwardedRef(element);
        else if (forwardedRef) forwardedRef.current = element;
      }}/>
    <span className="mc-checkbox" aria-hidden="true"/>
    <span className="mc-choice__text"><span>{label}</span>{description && <span className="mc-field__description" id={`${id}-description`}>{description}</span>}</span>
  </label>;
});

export interface SwitchProps extends Omit<CheckboxProps, 'indeterminate'> {}
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch({ label, description, className, id: givenId, ...props }, ref) {
  const autoId = useId(); const id = givenId ?? autoId;
  return <label className={cx('mc-choice', 'mc-switch-row', props.disabled && 'mc-is-disabled', className)} htmlFor={id}>
    <span className="mc-choice__text"><span>{label}</span>{description && <span className="mc-field__description" id={`${id}-description`}>{description}</span>}</span>
    <input {...props} ref={ref} id={id} type="checkbox" role="switch" className="mc-choice__input"
      aria-describedby={cx(props['aria-describedby'], !!description && `${id}-description`) || undefined}/>
    <span className="mc-switch" aria-hidden="true"><span/></span>
  </label>;
});

export interface RadioOption { value: string; label: ReactNode; disabled?: boolean }
export interface RadioGroupProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange' | 'defaultValue'> {
  label: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: readonly RadioOption[];
  orientation?: 'horizontal' | 'vertical';
  required?: boolean;
}
export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup({
  label, name, value, defaultValue = '', onValueChange, options, orientation = 'vertical', required, disabled, className, ...props
}, ref) {
  const autoName = useId(); const [selected, setSelected] = useValue(value, defaultValue, onValueChange);
  return <fieldset {...props} ref={ref} disabled={disabled} className={cx('mc-radio-group', `mc-radio-group--${orientation}`, className)}>
    <legend className="mc-field__label">{label}</legend>
    <div className="mc-radio-options">{options.map(option => <label key={option.value} className={cx('mc-choice', (disabled || option.disabled) && 'mc-is-disabled')}>
      <input type="radio" className="mc-choice__input" name={name ?? autoName} value={option.value}
        checked={selected === option.value} disabled={disabled || option.disabled} required={required}
        onChange={() => setSelected(option.value)}/>
      <span className="mc-radio" aria-hidden="true"/><span>{option.label}</span>
    </label>)}</div>
  </fieldset>;
});

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value' | 'defaultValue' | 'min' | 'max'> {
  label: ReactNode;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onValueChange?: (value: number) => void;
  formatValue?: (value: number) => string;
}
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider({
  label, value, defaultValue, min = 0, max = 100, onValueChange, formatValue = String,
  id: givenId, className, onChange, style, ...props
}, ref) {
  const autoId = useId(); const id = givenId ?? autoId;
  const [current, setCurrent] = useValue(value, defaultValue ?? min, onValueChange);
  const safeMax = Math.max(min, max); const bounded = Math.min(safeMax, Math.max(min, current));
  const percentage = safeMax > min ? ((bounded - min) / (safeMax - min)) * 100 : 0;
  return <div className={cx('mc-field', 'mc-slider', className)}>
    <div className="mc-slider__heading"><label htmlFor={id}>{label}</label><output htmlFor={id}>{formatValue(bounded)}</output></div>
    <div className="mc-range-shell" data-disabled={props.disabled || undefined}
      style={{ '--mc-range-fill': `${percentage}%`, '--mc-range-ratio': percentage / 100 } as CSSProperties}>
      <span className="mc-range-track" aria-hidden="true"><span className="mc-range-rail"/><span className="mc-range-fill"/></span>
      <span className="mc-range-thumb" aria-hidden="true"/>
      <input {...props} ref={ref} type="range" id={id} min={min} max={safeMax} value={bounded} className="mc-range"
        aria-valuetext={formatValue(bounded)} style={style}
        onChange={event => { setCurrent(event.currentTarget.valueAsNumber); onChange?.(event); }}/>
    </div>
  </div>;
});

export interface SelectOption { value: string; label: string; disabled?: boolean }
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {
  options: readonly SelectOption[];
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({
  label, description, error, options, id: givenId, className, 'aria-describedby': describedBy, ...props
}, ref) {
  return <ComboboxBase label={label} description={description} error={error} options={options} id={givenId} className={className}
    nativeAdapter={{ props: { ...props, 'aria-describedby': describedBy }, ref }} name={props.name} form={props.form}
    disabled={props.disabled} required={props.required} hidden={props.hidden} autoFocus={props.autoFocus} tabIndex={props.tabIndex}
    title={props.title} style={props.style} dir={props.dir} lang={props.lang} accessKey={props.accessKey}
    aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-invalid={props['aria-invalid']}
    aria-describedby={describedBy}/>;
});

export interface TabItem { value: string; label: ReactNode; content: ReactNode; disabled?: boolean }
export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  items: readonly TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label: string;
  orientation?: 'horizontal' | 'vertical';
}
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs({
  items, value, defaultValue, onValueChange, label, orientation = 'horizontal', className, ...props
}, ref) {
  const id = useId();
  const [selected, setSelected] = useValue(value, defaultValue ?? items.find(item => !item.disabled)?.value ?? '', onValueChange);
  const enabled = items.filter(item => !item.disabled);
  return <div {...props} ref={ref} className={cx('mc-tabs', `mc-tabs--${orientation}`, className)}>
    <div className="mc-tablist" role="tablist" aria-label={label} aria-orientation={orientation}>
      {items.map(item => {
        const key = encodeURIComponent(item.value); const active = item.value === selected;
        return <button key={item.value} type="button" role="tab" id={`${id}-tab-${key}`}
          aria-controls={`${id}-panel-${key}`} aria-selected={active} disabled={item.disabled}
          tabIndex={active ? 0 : -1} className="mc-tab" onClick={() => setSelected(item.value)}
          onKeyDown={event => {
            const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
            const previousKey = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
            const nextKey = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
            if (![previousKey, nextKey, 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const index = enabled.findIndex(tab => tab.value === item.value);
            const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)
              : enabled[(index + (event.key === nextKey ? 1 : -1) + enabled.length) % enabled.length];
            if (next) {
              setSelected(next.value);
              event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[id="${id}-tab-${encodeURIComponent(next.value)}"]`)?.focus();
            }
          }}><span className="mc-tab__label">{item.label}</span></button>;
      })}
    </div>
    {items.map(item => <div key={item.value} role="tabpanel" id={`${id}-panel-${encodeURIComponent(item.value)}`}
      aria-labelledby={`${id}-tab-${encodeURIComponent(item.value)}`} hidden={item.value !== selected} tabIndex={0}
      className="mc-tabpanel">{item.content}</div>)}
  </div>;
});

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Border-box width: a number is CSS pixels; CSS lengths such as rem or calc() are supported. */
  width?: CSSProperties['width'];
  /** Explicit heights are not reduced to the default viewport limit. */
  height?: CSSProperties['height'];
  /** Inline styles take precedence over the dedicated size props. */
  style?: CSSProperties;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeLabel?: string;
  closeOnBackdrop?: boolean;
}
export function Dialog({ open, onOpenChange, title, width, height, style, description, children, footer, className, closeLabel = 'Close dialog', closeOnBackdrop = true }: DialogProps) {
  const id = useId(); const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const dialog = ref.current;
    if (!mounted || !dialog) return;
    if (!open) { if (dialog.open) dialog.close(); return; }
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const unlock = lockScroll(dialog.ownerDocument);
    return () => { if (dialog.open) dialog.close(); unlock(); if (trigger?.isConnected) trigger.focus(); };
  }, [open, mounted]);
  if (!mounted) return null;
  return createPortal(<dialog ref={ref} className={cx('mc-dialog', className)} aria-labelledby={`${id}-title`}
    style={{ width, height, maxHeight: height !== undefined || style?.height !== undefined || style?.blockSize !== undefined ? 'none' : undefined, ...style }}
    aria-describedby={description ? `${id}-description` : undefined}
    onCancel={event => { event.preventDefault(); onOpenChange(false); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]'))
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0 && !element.closest('[hidden], [inert]'));
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onClick={event => {
      if (event.target !== event.currentTarget || !closeOnBackdrop) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onOpenChange(false);
    }}>
    <div className="mc-dialog__header"><h2 id={`${id}-title`}>{title}</h2><button type="button" className="mc-dialog__close" aria-label={closeLabel} onClick={() => onOpenChange(false)}><span className="mc-dialog__close-icon" aria-hidden="true"/></button></div>
    <div className="mc-dialog__body">{description && <p id={`${id}-description`} className="mc-dialog__description">{description}</p>}{children}</div>
    {footer && <div className="mc-dialog__footer">{footer}</div>}
  </dialog>, document.body);
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { variant?: 'default' | 'success' | 'warning' | 'danger' }
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge({ variant = 'default', className, ...props }, ref) {
  return <span {...props} ref={ref} className={cx('mc-badge', `mc-badge--${variant}`, className)}/>;
});

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: string;
  value?: number;
  max?: number;
  showValue?: boolean;
}
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress({ label, value, max = 100, showValue, className, ...props }, ref) {
  const safeMax = max > 0 ? max : 100;
  const bounded = value === undefined ? undefined : Math.min(safeMax, Math.max(0, value));
  const percent = bounded === undefined ? undefined : Math.round(bounded / safeMax * 100);
  return <div className={cx('mc-progress', className)}>
    {showValue && <div className="mc-slider__heading"><span>{label}</span><span>{percent === undefined ? '…' : `${percent}%`}</span></div>}
    <div {...props} ref={ref} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeMax}
      aria-valuenow={bounded} className="mc-progress__track" data-indeterminate={value === undefined || undefined}>
      <div className="mc-progress__fill" style={{ '--mc-progress-percent': bounded === undefined ? '35%' : `${bounded / safeMax * 100}%` } as CSSProperties}/>
    </div>
  </div>;
});

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> { title?: ReactNode; variant?: 'info' | 'success' | 'warning' | 'danger' }
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert({ title, variant = 'info', className, children, ...props }, ref) {
  return <div role={variant === 'danger' ? 'alert' : 'status'} {...props} ref={ref} className={cx('mc-alert', `mc-alert--${variant}`, className)}>
    <PixelIcon name={variant === 'success' ? 'check' : 'info'}/><div>{title && <strong className="mc-alert__title">{title}</strong>}{children}</div>
  </div>;
});

export const Separator = forwardRef<HTMLHRElement, HTMLAttributes<HTMLHRElement>>(function Separator({ className, ...props }, ref) {
  return <hr {...props} ref={ref} className={cx('mc-separator', className)}/>;
});

const iconPaths = {
  arrow: 'M2 7h10V4l4 4-4 4V9H2z',
  chevron: 'M5 2h2v2h2v2h2v4H9v2H7v2H5v-2h2v-2h2V6H7V4H5z',
  close: 'M3 2h2v2h2v2h2V4h2V2h2v2h-2v2H9v4h2v2h2v2h-2v-2H9v-2H7v2H5v2H3v-2h2v-2h2V6H5V4H3z',
  check: 'M1 7h2v2h2v2h2V9h2V7h2V5h2V3h2v4h-2v2h-2v2H9v2H7v2H5v-2H3v-2H1z',
  plus: 'M7 2h2v5h5v2H9v5H7V9H2V7h5z',
  code: 'M4 3h2v2H4v2H2v2h2v2h2v2H4v-2H2V9H0V7h2V5h2zm6 0h2v2h2v2h2v2h-2v2h-2v2h-2v-2h2V9h2V7h-2V5h-2z',
  copy: 'M5 1h9v11h-3v3H1V4h4zm2 3h4v6h1V3H7zM3 6v7h6V6z',
  info: 'M4 0h8v2h2v2h2v8h-2v2h-2v2H4v-2H2v-2H0V4h2V2h2zm3 3v2h2V3zm0 4v6h2V7z',
  heart: 'M2 2h4v2h4V2h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2v-2H0V4h2z',
  settings: 'M6 0h4v3h3V1h2v4h-2v2h3v4h-3v2h2v2h-4v-2H9v3H5v-3H3v2H1v-4h2V9H0V5h3V3H1V1h4v2h1zm0 6v4h4V6z',
  book: 'M1 1h6v1h2V1h6v12H9v2H7v-2H1zm2 2v8h4V4H5V3zm6 1v7h4V3h-2v1z',
  grid: 'M1 1h6v6H1zm8 0h6v6H9zM1 9h6v6H1zm8 0h6v6H9z',
  search: 'M2 0h6v2h2v6H8v2H2V8H0V2h2zm0 2v6h6V2zm7 7h3v2h2v2h2v3h-3v-2h-2v-2H9z',
  download: 'M6 0h4v7h4v2h-2v2h-2v2H6v-2H4V9H2V7h4zM0 13h3v1h10v-1h3v3H0z',
  sun: 'M7 0h2v3H7zM7 13h2v3H7zM0 7h3v2H0zM13 7h3v2h-3zM4 4h8v8H4zM2 1h2v3H2zM12 1h2v3h-2zM2 12h2v3H2zM12 12h2v3h-2z',
  moon: 'M4 0h6v2H6v8h2v2h6v-2h2v4h-2v2H4v-2H2v-2H0V4h2V2h2z',
} as const;
export type PixelIconName = keyof typeof iconPaths;
export interface PixelIconProps extends Omit<HTMLAttributes<SVGSVGElement>, 'children'> { name: PixelIconName; size?: number; }
export function PixelIcon({ name, size = 20, className, ...props }: PixelIconProps) {
  return <svg {...props} aria-hidden="true" width={size} height={size} viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" className={cx('mc-icon', className)}><path d={iconPaths[name]}/></svg>;
}
