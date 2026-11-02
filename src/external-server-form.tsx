import { forwardRef, useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent, FormHTMLAttributes, KeyboardEvent, MouseEvent, Ref } from 'react';
import { ClassicSkin } from './classic-skin';
import { useClassicNodeRef } from './classic-screen-lifecycle';
import { externalServerAssets } from './external-server-assets';
import { ExternalServerField } from './external-server-field';
import type { ExternalServerFieldProps } from './external-server-field';

export type ExternalServerFieldKind = 'name' | 'address' | 'port';
export type ExternalServerAction = 'play' | 'save' | 'remove';
export interface ExternalServerValues { name: string; address: string; port: string }
/** The original bindings are independent. A disabled-named overlay does not
 * imply the inverse of its corresponding enabled binding. */
export interface ExternalServerBindings {
  playEnabled: boolean;
  playDisabledVisible: boolean;
  saveEnabled: boolean;
  saveDisabledVisible: boolean;
}
export interface ExternalServerLabels {
  name: string; address: string; port: string;
  play: string; save: string; remove: string; close: string;
}
export type ExternalServerValueChangeDetail =
  | { reason: 'input'; field: ExternalServerFieldKind; event: ChangeEvent<HTMLInputElement> }
  | { reason: 'reset'; event: FormEvent<HTMLFormElement> };
export type ExternalServerActionDetail =
  | { reason: 'button'; event: MouseEvent<HTMLButtonElement> }
  | { reason: 'submit'; event: FormEvent<HTMLFormElement> };
export type ExternalServerCloseDetail =
  | { reason: 'close-button'; event: MouseEvent<HTMLButtonElement> }
  | { reason: 'escape'; event: KeyboardEvent<HTMLFormElement> };
type FieldOverrides = Omit<ExternalServerFieldProps, 'kind' | 'label' | 'scale' | 'width' | 'value' | 'defaultValue'>;
export interface ExternalServerFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'title' | 'children' | 'defaultValue' | 'onChange'> {
  title: string;
  /** Explicit host mode. The source's new/edit aliases supply no mode value. */
  mode: 'add' | 'edit';
  labels: ExternalServerLabels;
  bindings: ExternalServerBindings;
  value?: ExternalServerValues;
  defaultValue?: ExternalServerValues;
  onValueChange?: (value: ExternalServerValues, detail: ExternalServerValueChangeDetail) => void;
  onAction?: (action: ExternalServerAction, value: ExternalServerValues, detail: ExternalServerActionDetail) => void;
  onClose?: (detail: ExternalServerCloseDetail) => void;
  /** Web Enter submission policy; it never selects Remove. Default: Save. */
  submitAction?: 'save' | 'play';
  scale?: number;
  /** Logical dimensions; default is the original 316×179. Overflow is clipped. */
  size?: readonly [number, number];
  disabled?: boolean;
  readOnly?: boolean;
  fieldProps?: Readonly<Partial<Record<ExternalServerFieldKind, FieldOverrides>>>;
  fieldRefs?: Readonly<Partial<Record<ExternalServerFieldKind, Ref<HTMLInputElement>>>>;
}

const fields: readonly ExternalServerFieldKind[] = ['name', 'address', 'port'];
const empty: ExternalServerValues = { name: '', address: '', port: '' };
function copyValues(value: ExternalServerValues): ExternalServerValues {
  if (!value || fields.some(field => typeof value[field] !== 'string')) throw new TypeError('External server values must contain string name, address and port.');
  return { name: value.name, address: value.address, port: value.port };
}
function validateProfile(scale: number, size: readonly [number, number], bindings: ExternalServerBindings) {
  if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('External server scale must be a positive safe integer.');
  if (!Array.isArray(size) || size.length !== 2 || !Number.isFinite(size[0]) || !Number.isFinite(size[1]) || size[0] <= 27 || size[1] <= 52
    || size.some(n => n * scale > 8192) || size[0] * size[1] * scale * scale > 16777216)
    throw new RangeError('External server size must leave a positive source content rectangle within the Web extent budget.');
  if (!bindings || ['playEnabled', 'playDisabledVisible', 'saveEnabled', 'saveDisabledVisible'].some(key => typeof bindings[key as keyof ExternalServerBindings] !== 'boolean'))
    throw new TypeError('External server bindings must be four explicit independent booleans.');
}

function Skin({ name, width, height, scale }: { name: keyof typeof externalServerAssets; width: number; height: number; scale: number }) {
  return <ClassicSkin asset={externalServerAssets[name]} width={width} height={height} scale={scale} baseClass="mc-external-server-skin" errorName="External server"/>;
}
/** One original state painter; state changes are driven by the real button. */
function ButtonPaint({ width, scale, label }: { width: number; scale: number; label: string }) {
  return <>
    {(['normal', 'hover', 'pressed', 'locked'] as const).map(state => <span key={state} className={`mc-external-server-action__state mc-external-server-action__state--${state}`} aria-hidden="true">
      <span className="mc-external-server-action__face"><Skin name={state === 'normal' ? 'button_borderless_light' : state === 'hover' ? 'button_borderless_lighthover' : state === 'pressed' ? 'button_borderless_lightpressed' : 'disabledButtonNoBorder'} width={width - 2} height={28} scale={scale}/></span>
      <span className="mc-external-server-action__border"><Skin name="focus_border_white" width={width} height={30} scale={scale}/></span>
      <span className="mc-external-server-action__label">{label}</span>
    </span>)}
  </>;
}

/** Embeddable Classic source form. It makes requests, never saves or connects.
 * The host owns placement, modal lifecycle, localization and validation. */
export const ExternalServerForm = forwardRef<HTMLFormElement, ExternalServerFormProps>(function ExternalServerForm({
  title, mode, labels, bindings, value, defaultValue = empty, onValueChange, onAction, onClose,
  submitAction = 'save', scale = 2, size = [316, 179], disabled = false, readOnly = false,
  fieldProps, fieldRefs, className, style, onSubmit, onReset, onKeyDown,
  onCompositionStart, onCompositionEnd, ...props
}, ref) {
  validateProfile(scale, size, bindings);
  if (mode !== 'add' && mode !== 'edit') throw new RangeError('External server mode must be add or edit.');
  if (submitAction !== 'save' && submitAction !== 'play') throw new RangeError('External server submitAction must be save or play.');
  if (typeof title !== 'string') throw new TypeError('External server title must be explicit localized text.');
  if (!labels || [...fields, 'play', 'save', 'remove', 'close'].some(key => typeof labels[key as keyof ExternalServerLabels] !== 'string'))
    throw new TypeError('External server labels must be explicit localized strings.');
  const [internal, setInternal] = useState(() => copyValues(defaultValue));
  const initial = useRef(copyValues(defaultValue));
  const [root, attach] = useClassicNodeRef(ref);
  const current = copyValues(value ?? internal), id = useId();
  const composing = useRef(new Set<EventTarget>());
  const isComposing = () => {
    for (const target of composing.current) if (!(target as Node).isConnected || !root.current?.contains(target as Node)) composing.current.delete(target);
    return composing.current.size !== 0;
  };
  const enabled = (action: ExternalServerAction) => !disabled && !readOnly &&
    (action === 'remove' ? mode === 'edit' : action === 'play' ? mode === 'add' && bindings.playEnabled : bindings.saveEnabled);
  const available = (action: ExternalServerAction) => action !== 'save' || bindings.saveEnabled || bindings.saveDisabledVisible;
  const request = (action: ExternalServerAction, detail: ExternalServerActionDetail) => {
    if (!detail.event.defaultPrevented && !isComposing() && enabled(action) && available(action)) onAction?.(action, copyValues(current), detail);
  };
  const commit = (next: ExternalServerValues, detail: ExternalServerValueChangeDetail) => {
    if (value === undefined) setInternal(copyValues(next));
    onValueChange?.(copyValues(next), detail);
  };
  const width = size[0], height = size[1], actionWidth = width / 2 - 8;
  const left = mode === 'edit' ? 'remove' : 'play';
  const action = (name: ExternalServerAction, overlay: boolean, underlay: boolean) => <div className={`mc-external-server-action-slot mc-external-server-action-slot--${name === 'save' ? 'right' : 'left'}`}
    data-source-overlay={overlay || undefined} data-source-underlay={underlay || undefined}>
    {underlay && <span className="mc-external-server-action mc-external-server-action--underlay" data-enabled={!disabled && (name === 'play' ? bindings.playEnabled : bindings.saveEnabled)} aria-hidden="true"><ButtonPaint width={actionWidth} scale={scale} label={labels[name]}/></span>}
    <button type="button" className="mc-external-server-action" data-external-server-action={name}
      data-source-control={overlay ? `${name}_disabled` : name} disabled={disabled || (name === 'play' ? !bindings.playEnabled : name === 'save' ? !bindings.saveEnabled : false)}
      aria-disabled={readOnly || undefined} aria-label={labels[name]} onClick={event => request(name, { reason: 'button', event })}>
      <ButtonPaint width={actionWidth} scale={scale} label={labels[name]}/>
    </button>
  </div>;
  return <form {...props} ref={attach} noValidate={props.noValidate ?? true}
    className={['mc-external-server-form', className].filter(Boolean).join(' ')}
    aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? `${id}-title`}
    aria-disabled={disabled || undefined} data-mode={mode} data-source="add_external_server.main_panel" data-native-certified="false"
    style={{ '--mc-external-server-unit': `${scale}px`, width: width * scale, height: height * scale, ...style } as CSSProperties}
    onCompositionStart={event => { composing.current.add(event.target); onCompositionStart?.(event); }}
    onCompositionEnd={event => { composing.current.delete(event.target); onCompositionEnd?.(event); }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229 || isComposing()) return;
      if (event.key === 'Escape' && onClose && !disabled) { event.preventDefault(); event.stopPropagation(); onClose({ reason: 'escape', event }); }
    }}
    onSubmit={event => {
      onSubmit?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      // The request guard checks before this Web default is prevented.
      if (!isComposing() && enabled(submitAction) && available(submitAction)) onAction?.(submitAction, copyValues(current), { reason: 'submit', event });
    }}
    onReset={event => {
      onReset?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      if (!disabled && !readOnly && !isComposing()) commit(copyValues(initial.current), { reason: 'reset', event });
    }}>
    <span className="mc-external-server-form__wash" aria-hidden="true"><Skin name="control" width={width - 8} height={height - 8} scale={scale}/></span>
    <span className="mc-external-server-form__frame" aria-hidden="true"><Skin name="dialog_background_hollow_2" width={width} height={height} scale={scale}/></span>
    <h2 className="mc-external-server-form__title" id={`${id}-title`}>{title}</h2>
    <button type="button" className="mc-external-server-close" disabled={disabled} aria-label={labels.close}
      onClick={event => { if (!event.defaultPrevented && !isComposing()) onClose?.({ reason: 'close-button', event }); }}>
      {(['normal', 'hover', 'pressed'] as const).map(state => <span key={state} aria-hidden="true" className={`mc-external-server-close__state mc-external-server-close__state--${state}`}><Skin name={`close_${state}`} width={15} height={15} scale={scale}/></span>)}
    </button>
    <div className="mc-external-server-form__content">
      {fields.map(kind => {
        const override = fieldProps?.[kind];
        return <ExternalServerField {...override} key={kind} ref={fieldRefs?.[kind]} kind={kind} label={labels[kind]} scale={scale} width={width - 21}
          value={current[kind]} disabled={disabled || override?.disabled} readOnly={readOnly || override?.readOnly}
          name={override?.name ?? kind} onChange={event => {
            override?.onChange?.(event);
            if (!event.defaultPrevented && !event.currentTarget.disabled && !event.currentTarget.readOnly)
              commit({ ...current, [kind]: event.currentTarget.value }, { reason: 'input', field: kind, event });
          }}/>
      })}
    </div>
    {action(left, mode === 'add' && bindings.playDisabledVisible, mode === 'add' && bindings.playDisabledVisible)}
    {(bindings.saveEnabled || bindings.saveDisabledVisible) && action('save', bindings.saveDisabledVisible, bindings.saveEnabled && bindings.saveDisabledVisible)}
    {/* Web Enter policy requests the declared action, never Remove. */}
    <button type="submit" className="mc-external-server-submit" tabIndex={-1} aria-hidden="true" disabled={!enabled(submitAction) || !available(submitAction)}/>
  </form>;
});
