import { forwardRef, useId, useRef, useState } from 'react';
import type {
  ChangeEvent, CSSProperties, FieldsetHTMLAttributes, HTMLAttributes, InputHTMLAttributes,
  KeyboardEvent, MouseEvent, ReactNode, Ref,
} from 'react';
import { Button, Switch, TextField } from './components';
import { Image } from './image';
import { ScrollArea } from './scroll-area';
import type { ScrollAreaProps } from './scroll-area';
import { craftingImageAssets } from './crafting-image-assets';
import { jigsawImageAssets } from './jigsaw-image-assets';

export type JigsawJointMode = 'rollable' | 'aligned';
export type JigsawIdentifierField = 'targetPool' | 'name' | 'target' | 'finalBlock';
export type JigsawPriorityField = 'selectionPriority' | 'placementPriority';
export type JigsawTextField = JigsawIdentifierField | JigsawPriorityField;
export type JigsawField = JigsawTextField | 'joint';
export interface JigsawPriorities {
  /** Draft strings preserve empty, minus and out-of-range edits. Host validates signed int32 on commit. */
  selectionPriority: string;
  placementPriority: string;
}
export interface JigsawValue extends JigsawPriorities {
  targetPool: string;
  name: string;
  target: string;
  finalBlock: string;
  joint: JigsawJointMode;
}
export interface JigsawChangeDetail {
  field: JigsawField;
  event: ChangeEvent<HTMLInputElement>;
}
export interface JigsawPriorityChangeDetail {
  field: JigsawPriorityField;
  event: ChangeEvent<HTMLInputElement>;
}
/** Uses TextField's existing className-on-field convention; other native input
 * props, events, style and refs are retained. Value and type are managed. */
export type JigsawInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'children' | 'dangerouslySetInnerHTML'>;
export interface JigsawLabels extends Record<JigsawTextField, string> {
  jointType: string;
  aligned: string;
  rollable: string;
  done: string;
  help: string;
  back: string;
  content: string;
  priorities: string;
}
export interface JigsawPriorityFieldsProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'defaultValue' | 'onChange' | 'children'> {
  value?: JigsawPriorities;
  defaultValue?: Partial<JigsawPriorities>;
  onValueChange?: (value: JigsawPriorities, detail: JigsawPriorityChangeDetail) => void;
  readOnly?: boolean;
  labels?: Partial<Record<JigsawPriorityField, ReactNode>>;
  inputProps?: Partial<Record<JigsawPriorityField, JigsawInputProps>>;
  inputRefs?: Partial<Record<JigsawPriorityField, Ref<HTMLInputElement>>>;
  /** Positive integer CSS pixels per logical source unit; defaults to 2. */
  scale?: number;
  /** Resolved host row height. Default 32 keeps the 10+22 children visible.
   * Raw source declares 16; its overflowing stack resolution is unverified. */
  fieldHeight?: number;
}
export interface JigsawCancelDetail {
  reason: 'back' | 'escape';
  event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement>;
}
export interface JigsawEditorProps extends Omit<HTMLAttributes<HTMLElement>, 'defaultValue' | 'onChange' | 'onCancel' | 'children' | 'title'> {
  value?: JigsawValue;
  defaultValue?: Partial<JigsawValue>;
  onValueChange?: (value: JigsawValue, detail: JigsawChangeDetail) => void;
  title?: ReactNode;
  labels?: Partial<JigsawLabels>;
  disabled?: boolean;
  readOnly?: boolean;
  /** Source controller supplies this condition; orientation is not inferred. */
  jointEnabled?: boolean;
  /** Host viewport in logical units, default [320,260]; not a native fixed canvas. */
  size?: readonly [number, number];
  scale?: number;
  priorityFieldHeight?: number;
  inputProps?: Partial<Record<JigsawTextField, JigsawInputProps>>;
  inputRefs?: Partial<Record<JigsawTextField, Ref<HTMLInputElement>>>;
  jointProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'defaultChecked' | 'onChange' | 'value' | 'defaultValue'> & {
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  };
  jointRef?: Ref<HTMLInputElement>;
  scrollViewportRef?: Ref<HTMLDivElement>;
  scrollViewportProps?: ScrollAreaProps['viewportProps'];
  onDone?: (value: JigsawValue, event: MouseEvent<HTMLButtonElement>) => void;
  onHelp?: (value: JigsawValue, event: MouseEvent<HTMLButtonElement>) => void;
  onCancel?: (value: JigsawValue, detail: JigsawCancelDetail) => void;
}

const defaults: JigsawValue = { targetPool: '', name: '', target: '', finalBlock: '', selectionPriority: '0', placementPriority: '0', joint: 'rollable' };
const defaultLabels: JigsawLabels = {
  targetPool: 'Target Pool:', name: 'Name:', target: 'Target Name:', finalBlock: 'Turns Into:',
  selectionPriority: 'Selection Priority:', placementPriority: 'Placement Priority:',
  jointType: 'Joint Type:', aligned: 'Aligned', rollable: 'Rollable', done: 'Done', help: 'Help', back: 'Back', content: 'Jigsaw properties', priorities: 'Jigsaw priorities',
};
const identifiers: readonly JigsawIdentifierField[] = ['targetPool', 'name', 'target', 'finalBlock'];
const priorities: readonly JigsawPriorityField[] = ['selectionPriority', 'placementPriority'];
function scaleValue(scale: number) {
  if (!Number.isSafeInteger(scale) || scale <= 0) throw new RangeError('Jigsaw scale must be a positive safe integer.');
  return scale;
}
function fieldHeightValue(height: number) {
  if (!Number.isFinite(height) || height <= 0) throw new RangeError('Jigsaw priority fieldHeight must be positive and finite.');
  return height;
}
function initialValue(value: Partial<JigsawValue> | undefined): JigsawValue {
  return { ...defaults, ...Object.fromEntries(Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined)) };
}
function useDraft<T>(value: T | undefined, initial: () => T) {
  const [internal, setInternal] = useState(initial);
  return [value === undefined ? internal : value, (next: T) => { if (value === undefined) setInternal(next); }] as const;
}
function skinURL(source: string) { return `url(${JSON.stringify(source)})`; }
function localInput(props: JigsawInputProps, id: string, name: JigsawTextField, disabled: boolean, readOnly: boolean) {
  return { ...props, id: props.id ?? id, name: props.name ?? name, type: 'text' as const,
    disabled: disabled || props.disabled, readOnly: readOnly || props.readOnly,
    maxLength: props.maxLength ?? 40, spellCheck: props.spellCheck ?? false, autoComplete: props.autoComplete ?? 'off' };
}

/** A reusable semantic pair of the source's two priority text edits. No numeric
 * parsing, clamping, generation or persistence is performed. */
export const JigsawPriorityFields = forwardRef<HTMLFieldSetElement, JigsawPriorityFieldsProps>(function JigsawPriorityFields({
  value, defaultValue, onValueChange, readOnly = false, disabled = false, labels, inputProps = {}, inputRefs,
  scale = 2, fieldHeight = 32, className, style, ...props
}, ref) {
  scaleValue(scale); fieldHeightValue(fieldHeight);
  if (!Number.isFinite(fieldHeight * scale)) throw new RangeError('Jigsaw scaled fieldHeight must be finite.');
  const id = useId(); const [draft, setDraft] = useDraft(value, () => ({ selectionPriority: defaultValue?.selectionPriority ?? '0', placementPriority: defaultValue?.placementPriority ?? '0' }));
  return <fieldset {...props} ref={ref} disabled={disabled} aria-label={props['aria-label'] ?? defaultLabels.priorities}
    className={['mc-jigsaw-priorities', className].filter(Boolean).join(' ')} data-source-field-height="16"
    data-resolved-field-height={fieldHeight} data-readonly={readOnly}
    style={{ '--mc-jigsaw-u': `${scale}px`, '--mc-jigsaw-priority-height': `${fieldHeight * scale}px`, ...style } as CSSProperties}>
    {priorities.map(field => {
      const native = inputProps[field] ?? {};
      return <TextField {...localInput(native, `${id}-${field}`, field, disabled, readOnly)} key={field}
        ref={inputRefs?.[field]} label={labels?.[field] ?? defaultLabels[field]} value={draft[field]}
        className={['mc-jigsaw__field', native.className].filter(Boolean).join(' ')} data-jigsaw-field={field}
        onChange={event => {
          native.onChange?.(event);
          if (event.defaultPrevented || disabled || readOnly || native.disabled || native.readOnly) return;
          const next = { ...draft, [field]: event.currentTarget.value }; setDraft(next); onValueChange?.(next, { field, event });
        }}/>;
    })}
  </fieldset>;
});

/** Inline source composition, not a modal dialog or a world-generation API.
 * All completion/help/cancel callbacks receive only the accepted React draft. */
export const JigsawEditor = forwardRef<HTMLElement, JigsawEditorProps>(function JigsawEditor({
  value, defaultValue, onValueChange, title = 'Jigsaw Block', labels: overrides, disabled = false, readOnly = false,
  jointEnabled = true, size = [320, 260], scale = 2, priorityFieldHeight = 32,
  inputProps = {}, inputRefs, jointProps = {}, jointRef, scrollViewportRef, scrollViewportProps,
  onDone, onHelp, onCancel, onKeyDown, className, style, ...props
}, ref) {
  scaleValue(scale); fieldHeightValue(priorityFieldHeight);
  if (!Number.isFinite(priorityFieldHeight * scale)) throw new RangeError('Jigsaw scaled priorityFieldHeight must be finite.');
  if (size.length !== 2 || ![...size].every(n => Number.isFinite(n) && n > 0) || !size.every(n => Number.isFinite(n * scale)))
    throw new RangeError('Jigsaw size must be a positive finite pair.');
  const id = useId(); const [draft, setDraft] = useDraft(value, () => initialValue(defaultValue));
  if (draft.joint !== 'rollable' && draft.joint !== 'aligned') throw new RangeError('Unknown Jigsaw joint mode.');
  const labels: JigsawLabels = { ...defaultLabels, ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([, entry]) => entry !== undefined)) };
  const composing = useRef(new Set<EventTarget>());
  const blocked = () => disabled || composing.current.size > 0;
  const snapshot = (): JigsawValue => ({ ...draft });
  const update = (next: JigsawValue, detail: JigsawChangeDetail) => {
    if (disabled || readOnly) return;
    setDraft(next); onValueChange?.(next, detail);
  };
  const nativeProps = (field: JigsawTextField): JigsawInputProps => {
    const native = inputProps[field] ?? {};
    return { ...native, onCompositionStart: event => { composing.current.add(event.currentTarget); native.onCompositionStart?.(event); },
      onCompositionEnd: event => { composing.current.delete(event.currentTarget); native.onCompositionEnd?.(event); } };
  };
  const jointTitle = `${id}-joint-title`, jointState = `${id}-joint-state`;
  return <section {...props} ref={ref} aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? `${id}-title`}
    className={['mc-jigsaw', className].filter(Boolean).join(' ')} data-source="jigsaw-editor" data-readonly={readOnly} data-disabled={disabled}
    style={{ '--mc-jigsaw-u': `${scale}px`, width: size[0] * scale, height: size[1] * scale,
      '--mc-jigsaw-header-skin': skinURL(jigsawImageAssets.StoreTopBar.url),
      '--mc-jigsaw-scroll-skin': skinURL(jigsawImageAssets.dialog_background_hollow_4.url),
      '--mc-jigsaw-control-skin': skinURL(jigsawImageAssets.control.url),
      '--mc-jigsaw-footer-skin': skinURL(craftingImageAssets.recipe_back_panel.url), ...style } as CSSProperties}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || blocked() || event.nativeEvent.isComposing || event.keyCode === 229 || event.key !== 'Escape') return;
      event.preventDefault(); onCancel?.(snapshot(), { reason: 'escape', event });
    }}>
    <header className="mc-jigsaw__header">
      <button type="button" className="mc-jigsaw__back" data-jigsaw-action="back" aria-label={labels.back} disabled={disabled}
        onClick={event => { if (!blocked()) onCancel?.(snapshot(), { reason: 'back', event }); }}>
        <Image src={jigsawImageAssets.chevron_left.url} sourceSize={jigsawImageAssets.chevron_left.sourceSize} size={[4, 7]} scale={scale} alt=""/>
      </button>
      <h2 className="mc-jigsaw__title" id={`${id}-title`}>{title}</h2>
    </header>
    <div className="mc-jigsaw__scroll-frame">
      <span className="mc-jigsaw__scroll-fill" aria-hidden="true"/>
      <ScrollArea className="mc-jigsaw__scroll" scale={scale} label={labels.content} viewportRef={scrollViewportRef}
        viewportProps={scrollViewportProps} contentProps={{ className: 'mc-jigsaw__content' }}>
        {identifiers.map(field => {
          const native = nativeProps(field);
          return <TextField {...localInput(native, `${id}-${field}`, field, disabled, readOnly)} key={field} ref={inputRefs?.[field]}
            label={labels[field]} value={draft[field]} className={['mc-jigsaw__field', native.className].filter(Boolean).join(' ')} data-jigsaw-field={field}
            onChange={event => {
              native.onChange?.(event);
              if (event.defaultPrevented || native.disabled || native.readOnly) return;
              update({ ...draft, [field]: event.currentTarget.value }, { field, event });
            }}/>;
        })}
        <JigsawPriorityFields value={{ selectionPriority: draft.selectionPriority, placementPriority: draft.placementPriority }}
          onValueChange={(next, detail) => update({ ...draft, ...next }, detail)} disabled={disabled} readOnly={readOnly}
          scale={scale} fieldHeight={priorityFieldHeight} aria-label={labels.priorities}
          labels={{ selectionPriority: labels.selectionPriority, placementPriority: labels.placementPriority }}
          inputProps={{ selectionPriority: nativeProps('selectionPriority'), placementPriority: nativeProps('placementPriority') }}
          inputRefs={{ selectionPriority: inputRefs?.selectionPriority, placementPriority: inputRefs?.placementPriority }}/>
        <div className="mc-jigsaw__joint" data-joint-enabled={jointEnabled}>
          <span className="mc-jigsaw__joint-title" id={jointTitle}>{labels.jointType}</span>
          <Switch {...jointProps} ref={jointRef} className={['mc-jigsaw__joint-switch', jointProps.className].filter(Boolean).join(' ')}
            id={jointProps.id ?? `${id}-joint`} name={jointProps.name ?? 'joint'} data-jigsaw-field="joint"
            label={<span id={jointState}>{draft.joint === 'aligned' ? labels.aligned : labels.rollable}</span>}
            aria-labelledby={jointProps['aria-labelledby'] ?? (jointProps['aria-label'] ? undefined : `${jointTitle} ${jointState}`)}
            aria-readonly={readOnly || jointProps.readOnly || undefined} disabled={disabled || !jointEnabled || jointProps.disabled}
            readOnly={readOnly || jointProps.readOnly} checked={draft.joint === 'aligned'}
            onClick={event => { jointProps.onClick?.(event); if (readOnly || jointProps.readOnly) event.preventDefault(); }}
            onChange={event => {
              jointProps.onChange?.(event);
              if (event.defaultPrevented || !jointEnabled || jointProps.disabled || jointProps.readOnly) return;
              // Explicit Web mapping. The source exposes state/text bindings;
              // their native boolean-to-enum controller formula is not recovered.
              update({ ...draft, joint: event.currentTarget.checked ? 'aligned' : 'rollable' }, { field: 'joint', event });
            }}/>
        </div>
      </ScrollArea>
    </div>
    <div className="mc-jigsaw__footer-wrapper"><footer className="mc-jigsaw__footer">
      <div className="mc-jigsaw__exit-buttons">
        <Button className="mc-jigsaw__done" disabled={disabled} data-jigsaw-action="done"
          onClick={event => { if (!blocked()) onDone?.(snapshot(), event); }}>{labels.done}</Button>
        <Button className="mc-jigsaw__help" disabled={disabled} aria-label={labels.help} data-jigsaw-action="help"
          onClick={event => { if (!blocked()) onHelp?.(snapshot(), event); }}>
          <Image src={craftingImageAssets.how_to_play_button_default_light.url}
            sourceSize={craftingImageAssets.how_to_play_button_default_light.sourceSize} size={[32, 16]} scale={scale} alt=""/>
        </Button>
      </div>
    </footer></div>
  </section>;
});
