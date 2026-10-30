import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, FieldsetHTMLAttributes, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, MouseEvent, PointerEvent, ReactNode, Ref } from 'react';
import { Button, Checkbox, Slider, Switch, TextField } from './components';
import { Combobox } from './combobox';
import { Image } from './image';
import { ScrollArea } from './scroll-area';
import type { ScrollAreaProps } from './scroll-area';
import { jigsawImageAssets } from './jigsaw-image-assets';
import { craftingImageAssets } from './crafting-image-assets';
import { structureEditorImageAssets } from './structure-editor-image-assets';

export interface XYZValue { x: string; y: string; z: string }
export type XYZAxis = keyof XYZValue;
export type XYZInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'type' | 'children'>;
export interface XYZChangeDetail { axis: XYZAxis; event: ChangeEvent<HTMLInputElement> }
export interface XYZVectorInputProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'defaultValue' | 'onChange' | 'children'> {
  value?: XYZValue;
  defaultValue?: Partial<XYZValue>;
  onValueChange?: (value: XYZValue, detail: XYZChangeDetail) => void;
  label: ReactNode;
  readOnly?: boolean;
  inputProps?: Partial<Record<XYZAxis, XYZInputProps>>;
  inputRefs?: Partial<Record<XYZAxis, Ref<HTMLInputElement>>>;
  /** Source size fields default to 3; offset fields explicitly use 5. No parser is implied. */
  maxLength?: number;
  scale?: number;
}

/** Names correspond to source UI bindings; they are not engine numeric enums. */
export type StructureEditorMode = 'save' | 'load' | 'data' | 'corner' | 'export';
export type StructureVectorField = 'saveSize' | 'saveOffset' | 'loadOffset' | 'exportSize' | 'exportOffset';
export type StructureTextField = 'name' | 'integrity' | 'seed' | 'data' | 'animationTime';
export type StructureBooleanField = 'includeEntities' | 'removeBlocks' | 'waterlogging' | 'showBoundingBox' | 'mirrorX' | 'mirrorZ';
export interface StructureEditorValue {
  mode: StructureEditorMode;
  name: string;
  saveSize: XYZValue; saveOffset: XYZValue; loadOffset: XYZValue; exportSize: XYZValue; exportOffset: XYZValue;
  integrity: string; seed: string; data: string; animationTime: string;
  includeEntities: boolean; removeBlocks: boolean; waterlogging: boolean; showBoundingBox: boolean;
  mirrorX: boolean; mirrorZ: boolean;
  /** Raw slider units. The host supplies a resolved range; no degree mapping is inferred. */
  rotation: number;
  redstoneSaveMode: 'memory' | 'disk';
  animationMode: 'none' | 'layers' | 'blocks';
}
export type StructureEditorField = keyof StructureEditorValue;
export type StructureInputField = StructureTextField | `${StructureVectorField}.${XYZAxis}`;
export interface StructureEditorChangeDetail { field: StructureEditorField; axis?: XYZAxis; event?: ChangeEvent<HTMLInputElement> }
export type StructureEditorAction = 'save' | 'load' | 'export' | 'export3d' | 'detect' | 'reset' | 'import' | 'help';
export interface StructureEditorCapabilities { dataSupport?: boolean; export3dSupport?: boolean; filePickingSupported?: boolean }
export interface StructureEditorVisibility extends Partial<Record<StructureEditorMode, boolean>> {
  boundingBox?: boolean; renderer?: boolean; cornerText?: boolean; rotationHint?: boolean; progress?: boolean; progressBar?: boolean; exportDisabled?: boolean;
}
export interface StructureEditorLabels {
  title: string; back: string; content: string; preview: string; mode: string;
  save: string; load: string; data: string; corner: string; export: string; exportAction: string;
  name: string; size: string; offset: string; includeEntities: string; removeBlocks: string; waterlogging: string;
  showBoundingBox: string; off: string; include: string; remove: string; show: string; on: string;
  redstoneSaveMode: string; memory: string; disk: string; integrity: string; seed: string;
  rotation: string; mirror: string; animationMode: string; none: string; layers: string; blocks: string;
  animationTime: string; animationTimePlaceholder: string; dataLabel: string;
  detect: string; reset: string; import: string; help: string; generating: string;
  cornerTitle: string; cornerDescription: string; exportDisabled: string;
}
export interface StructurePreviewTurnDetail {
  phase: 'start' | 'move' | 'end' | 'keyboard'; deltaX: number; deltaY: number;
  event: PointerEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>;
}
export interface StructureEditorCancelDetail { reason: 'back' | 'escape'; event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement> }
export interface StructureEditorProps extends Omit<HTMLAttributes<HTMLElement>, 'defaultValue' | 'onChange' | 'onCancel' | 'children' | 'title'> {
  value?: StructureEditorValue;
  defaultValue?: Partial<Omit<StructureEditorValue, StructureVectorField>> & Partial<Record<StructureVectorField, Partial<XYZValue>>>;
  onValueChange?: (value: StructureEditorValue, detail: StructureEditorChangeDetail) => void;
  onAction?: (action: StructureEditorAction, accepted: StructureEditorValue, event: MouseEvent<HTMLButtonElement>) => void;
  onCancel?: (accepted: StructureEditorValue, detail: StructureEditorCancelDetail) => void;
  disabled?: boolean; readOnly?: boolean;
  /** Explicit host capabilities, corresponding to source ignored branches. */
  capabilities?: StructureEditorCapabilities;
  visibility?: StructureEditorVisibility;
  enabled?: Partial<Record<StructureEditorField, boolean>>;
  actionVisibility?: Partial<Record<StructureEditorAction, boolean>>;
  actionEnabled?: Partial<Record<StructureEditorAction, boolean>>;
  /** Independent source footer bindings, separate from the mode-panel visibility. */
  footerVisibility?: Partial<Record<StructureEditorMode, boolean>>;
  labels?: Partial<StructureEditorLabels>;
  /** Embedded host viewport; [480,270] is a Web default, not a fixed game canvas. */
  size?: readonly [number, number]; scale?: number;
  inputProps?: Partial<Record<StructureInputField, XYZInputProps>>;
  inputRefs?: Partial<Record<StructureInputField, Ref<HTMLInputElement>>>;
  dropdownRefs?: Partial<Record<'mode' | 'redstoneSaveMode' | 'animationMode', Ref<HTMLButtonElement>>>;
  toggleRefs?: Partial<Record<StructureBooleanField, Ref<HTMLInputElement>>>;
  /** Source state-label visibility bindings can override the coherent Web value mapping. */
  toggleStateVisibility?: Partial<Record<StructureBooleanField, { off?: boolean; on?: boolean }>>;
  rotationRef?: Ref<HTMLInputElement>;
  rotationRange?: { min: number; max: number; step: number };
  rotationLabel?: ReactNode;
  rotationFormat?: (value: number) => string;
  nameColor?: CSSProperties['color'];
  scrollViewportRef?: Ref<HTMLDivElement>;
  scrollViewportProps?: ScrollAreaProps['viewportProps'];
  /** Caller-owned renderer. This component never reads or generates a world. */
  preview?: ReactNode;
  previewProps?: HTMLAttributes<HTMLDivElement>;
  previewRef?: Ref<HTMLDivElement>;
  onPreviewTurn?: (detail: StructurePreviewTurnDetail) => void;
  cornerText?: ReactNode;
  exportDisabledText?: ReactNode;
  feedback?: ReactNode;
  progress?: number;
  progressLabel?: ReactNode;
}

const axes: readonly XYZAxis[] = ['x', 'y', 'z'];
const vectors: readonly StructureVectorField[] = ['saveSize', 'saveOffset', 'loadOffset', 'exportSize', 'exportOffset'];
const modes: readonly StructureEditorMode[] = ['save', 'load', 'data', 'corner', 'export'];
const initialVector = (): XYZValue => ({ x: '0', y: '0', z: '0' });
const initial: Omit<StructureEditorValue, StructureVectorField> = { mode: 'save', name: '', integrity: '100.00', seed: '', data: '', animationTime: '', includeEntities: true, removeBlocks: false, waterlogging: false, showBoundingBox: true, mirrorX: false, mirrorZ: false, rotation: 0, redstoneSaveMode: 'memory', animationMode: 'none' };
const text: StructureEditorLabels = { title: 'Structure Block', back: 'Back', content: 'Structure properties', preview: 'Structure preview', mode: 'Mode:', save: 'Save', load: 'Load', data: 'Data', corner: 'Corner', export: '3D Export', exportAction: 'Export', name: 'Structure Name', size: 'Size:', offset: 'Offset:', includeEntities: 'Include Entities:', removeBlocks: 'Remove Blocks:', waterlogging: 'Waterlog Blocks', showBoundingBox: 'Show Bounding Box:', off: 'Off', include: 'Include', remove: 'Remove', show: 'Show', on: 'ON', redstoneSaveMode: 'Redstone Save Mode', memory: 'Save In Memory', disk: 'Save To Disk', integrity: 'Integrity:', seed: 'Seed:', rotation: 'Rotation', mirror: 'Mirror:', animationMode: 'Animation Mode:', none: 'None', layers: 'Place by Layer', blocks: 'Place by Block', animationTime: 'Animation Time:', animationTimePlaceholder: 'In Seconds', dataLabel: 'Data:', detect: 'Detect', reset: 'Reset', import: 'Import', help: 'Help', generating: 'Generating your model...', cornerTitle: 'Corner Mode:', cornerDescription: 'Corner Mode is used with the Detect button in Save Mode to define the area to save. It will only detect Corner Blocks with the same name as the structure being saved.', exportDisabled: 'Export is disabled on Minecraft Marketplace world templates.' };
const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
function useDraft<T>(value: T | undefined, fallback: () => T) { const [inside, set] = useState(fallback); return [value === undefined ? inside : value, (next: T) => { if (value === undefined) set(next); }] as const; }
function scaleValue(scale: number) { if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Structure editor scale must be a positive safe integer.'); }
function snapshot(value: StructureEditorValue): StructureEditorValue { const next = { ...value }; for (const field of vectors) next[field] = { ...value[field] }; return next; }
function url(value: string) { return `url(${JSON.stringify(value)})`; }

/** Raw XYZ drafts and source vertical axis geometry; no coordinate conversion or clamping. */
export const XYZVectorInput = forwardRef<HTMLFieldSetElement, XYZVectorInputProps>(function XYZVectorInput({ value, defaultValue, onValueChange, label, disabled = false, readOnly = false, inputProps = {}, inputRefs, maxLength = 3, scale = 2, className, style, ...props }, ref) {
  scaleValue(scale); const id = useId(); const [draft, setDraft] = useDraft(value, () => ({ ...initialVector(), ...defaultValue }));
  return <fieldset {...props} ref={ref} disabled={disabled} className={['mc-xyz-vector', className].filter(Boolean).join(' ')} style={{ '--mc-structure-u': `${scale}px`, ...style } as CSSProperties}>
    <legend>{label}</legend>
    {axes.map(axis => { const native = inputProps[axis] ?? {}; const inputId = native.id ?? `${id}-${axis}`;
      return <div className="mc-xyz-vector__axis" data-axis={axis} key={axis}>
        <label htmlFor={inputId}>{axis.toUpperCase()}:</label>
        <input {...native} ref={inputRefs?.[axis]} id={inputId} type="text" className={['mc-input', native.className].filter(Boolean).join(' ')} value={draft[axis]}
          aria-label={native['aria-label'] ?? (typeof label === 'string' ? `${label} ${axis.toUpperCase()}` : undefined)}
          placeholder={native.placeholder ?? '0'} maxLength={native.maxLength ?? maxLength} spellCheck={native.spellCheck ?? false}
          disabled={disabled || native.disabled} readOnly={readOnly || native.readOnly}
          onChange={event => { native.onChange?.(event); if (event.defaultPrevented || disabled || readOnly || native.disabled || native.readOnly) return; const next = { ...draft, [axis]: event.currentTarget.value }; setDraft(next); onValueChange?.(next, { axis, event }); }}/>
      </div>;
    })}
  </fieldset>;
});

/** Static-source composition. All engine actions and preview rendering remain host-owned. */
export const StructureEditor = forwardRef<HTMLElement, StructureEditorProps>(function StructureEditor({ value, defaultValue, onValueChange, onAction, onCancel, disabled = false, readOnly = false, capabilities = {}, visibility = {}, enabled = {}, actionVisibility = {}, actionEnabled = {}, footerVisibility = {}, labels: overrides, size = [480, 270], scale = 2, inputProps = {}, inputRefs, dropdownRefs, toggleRefs, toggleStateVisibility = {}, rotationRef, rotationRange = { min: 0, max: 1, step: 1 }, rotationLabel, rotationFormat, nameColor, scrollViewportRef, scrollViewportProps, preview, previewProps = {}, previewRef, onPreviewTurn, cornerText, exportDisabledText, feedback, progress = 0, progressLabel, className, style, onKeyDown, ...props }, ref) {
  scaleValue(scale); if (size.length !== 2 || ![...size].every(n => Number.isFinite(n) && n > 0 && Number.isFinite(n * scale))) throw new RangeError('Structure editor dimensions must be a positive finite pair.');
  if (![rotationRange.min, rotationRange.max, rotationRange.step].every(Number.isFinite) || rotationRange.max < rotationRange.min || rotationRange.step <= 0) throw new RangeError('Structure rotation range must be finite and ordered with a positive step.');
  const [draft, setDraft] = useDraft(value, () => { const result = { ...initial, ...defaultValue } as StructureEditorValue; for (const field of vectors) result[field] = { ...initialVector(), ...defaultValue?.[field] }; return result; });
  if (!modes.includes(draft.mode) || !['memory', 'disk'].includes(draft.redstoneSaveMode) || !['none', 'layers', 'blocks'].includes(draft.animationMode)) throw new RangeError('Unknown structure editor mode.');
  const labels = { ...text, ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([, entry]) => entry !== undefined)) };
  const id = useId(); const composing = useRef(new Set<EventTarget>()), heldMode = useRef(draft.mode); const [, refresh] = useState(0);
  const root = useRef<HTMLElement | null>(null), progressNode = useRef<HTMLDivElement | null>(null);
  const attach = useCallback((node: HTMLElement | null) => { root.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }, [ref]);
  useSafeLayoutEffect(() => {
    if (!visibility.progress || !root.current) return;
    const host = root.current, panel = progressNode.current;
    const owner = host.ownerDocument, active = owner.activeElement as HTMLElement | null;
    const groups = Array.from(host.querySelectorAll<HTMLElement>('.mc-structure__header,.mc-structure__left,.mc-structure__footer,.mc-structure__renderer'));
    const before = groups.map(node => [node, node.getAttribute('inert')] as const);
    let ownsFocus = false;
    const onFocusIn = (event: FocusEvent) => {
      if (event.target === panel || panel?.contains(event.target as Node)) ownsFocus = true;
      else if (event.target !== owner.body && event.target !== owner.documentElement) ownsFocus = false;
    };
    const onPointerDown = (event: globalThis.PointerEvent) => { if (!host.contains(event.target as Node)) ownsFocus = false; };
    owner.addEventListener('focusin', onFocusIn);
    owner.addEventListener('pointerdown', onPointerDown, true);
    for (const [node] of before) node.setAttribute('inert', '');
    if (active && host.contains(active)) { panel?.focus(); ownsFocus = owner.activeElement === panel; }
    return () => {
      owner.removeEventListener('focusin', onFocusIn);
      owner.removeEventListener('pointerdown', onPointerDown, true);
      for (const [node, attribute] of before) if (attribute === null) node.removeAttribute('inert'); else node.setAttribute('inert', attribute);
      // Hiding the progress node can make the UA move focus to body before this
      // layout cleanup. Restore only while this progress session still owns it.
      if (ownsFocus && active?.isConnected && (owner.activeElement === panel || owner.activeElement === owner.body || owner.activeElement === owner.documentElement)) active.focus();
    };
  }, [visibility.progress]);
  if (!composing.current.size) heldMode.current = draft.mode;
  const shownMode = composing.current.size ? heldMode.current : draft.mode;
  const modeVisible = (mode: StructureEditorMode) => (mode !== 'data' || !!capabilities.dataSupport) && (mode !== 'export' || !!capabilities.export3dSupport) && (visibility[mode] ?? shownMode === mode);
  const activeScope = (scopes: readonly StructureEditorMode[]) => scopes.includes(shownMode) && modeVisible(shownMode) ? shownMode : scopes.find(modeVisible);
  const blocked = () => disabled || visibility.progress === true || composing.current.size > 0;
  const update = (field: StructureEditorField, next: StructureEditorValue[StructureEditorField], detail?: Omit<StructureEditorChangeDetail, 'field'>) => { if (disabled || readOnly || visibility.progress === true || enabled[field] === false) return; const result = { ...snapshot(draft), [field]: next }; setDraft(result); onValueChange?.(result, { field, ...detail }); };
  const native = (field: StructureInputField): XYZInputProps => { const given = inputProps[field] ?? {}; return { ...given, 'data-structure-field': field,
    onCompositionStart: event => { if (!composing.current.size) heldMode.current = shownMode; composing.current.add(event.currentTarget); refresh(n => n + 1); given.onCompositionStart?.(event); },
    onCompositionEnd: event => { composing.current.delete(event.currentTarget); refresh(n => n + 1); given.onCompositionEnd?.(event); } } as XYZInputProps; };
  const scalar = (field: StructureTextField, limit: number, placeholder = '', visibleLabel = true, scope?: StructureEditorMode) => { const attributes = native(field); const active = !scope || activeScope(['save', 'load', 'corner']) === scope;
    return <TextField {...attributes} key={field} ref={active ? inputRefs?.[field] : undefined} label={labels[field === 'data' ? 'dataLabel' : field]} aria-label={attributes['aria-label'] ?? labels[field === 'data' ? 'dataLabel' : field]} id={active ? attributes.id ?? `${id}-${field}` : `${attributes.id ?? `${id}-${field}`}-${scope}`}
    className={['mc-structure__text-field', !visibleLabel && 'mc-structure__text-field--hidden-label', attributes.className].filter(Boolean).join(' ')}
    type="text" value={draft[field]} maxLength={attributes.maxLength ?? limit} placeholder={attributes.placeholder ?? placeholder} spellCheck={attributes.spellCheck ?? false}
    disabled={disabled || enabled[field] === false || attributes.disabled} readOnly={readOnly || attributes.readOnly}
    style={{ ...(field === 'name' ? { color: nameColor } : {}), ...attributes.style }}
    onChange={event => { attributes.onChange?.(event); if (!event.defaultPrevented && !attributes.disabled && !attributes.readOnly) update(field, event.currentTarget.value, { event }); }}/>; };
  const vector = (field: StructureVectorField, title: string) => <XYZVectorInput key={field} label={title} data-structure-vector={field} value={draft[field]} scale={scale} maxLength={field.endsWith('Size') ? 3 : 5} disabled={disabled || enabled[field] === false} readOnly={readOnly}
    inputProps={Object.fromEntries(axes.map(axis => [axis, native(`${field}.${axis}`)]))}
    inputRefs={Object.fromEntries(axes.map(axis => [axis, inputRefs?.[`${field}.${axis}`]]))}
    onValueChange={(next, detail) => update(field, next, detail)}/>;
  const stateLabels = (field: StructureBooleanField, on: string, marked = false) => <><span data-structure-state={marked ? 'off' : undefined} hidden={!(toggleStateVisibility[field]?.off ?? !draft[field])}>{labels.off}</span><span data-structure-state={marked ? 'on' : undefined} hidden={!(toggleStateVisibility[field]?.on ?? draft[field])}>{on}</span></>;
  const toggle = (field: StructureBooleanField, title: string, on: string, scope = 'common') => <div className="mc-structure__toggle-field" data-structure-toggle={field}>
    <span id={`${id}-${scope}-${field}-label`}>{title}</span>
    <Switch ref={scope === 'common' || activeScope(field === 'removeBlocks' ? ['export', 'save', 'load'] : ['save', 'load']) === scope ? toggleRefs?.[field] : undefined} label={stateLabels(field, on, true)} checked={draft[field]} disabled={disabled || enabled[field] === false} readOnly={readOnly}
      aria-labelledby={`${id}-${scope}-${field}-label ${id}-${scope}-${field}-state`} aria-readonly={readOnly || undefined} id={`${id}-${scope}-${field}`}
      description={undefined} onClick={event => { if (readOnly) event.preventDefault(); }} onChange={event => update(field, event.currentTarget.checked, { event })}/>
    <span id={`${id}-${scope}-${field}-state`} className="mc-structure__sr-only">{stateLabels(field, on)}</span>
  </div>;
  const action = (kind: StructureEditorAction, label: ReactNode, extraClass?: string) => <Button key={kind} className={['mc-structure__action', extraClass].filter(Boolean).join(' ')} data-structure-action={kind}
    hidden={actionVisibility[kind] === false} disabled={disabled || actionEnabled[kind] === false || (readOnly && !['help', 'export', 'export3d'].includes(kind))}
    aria-label={typeof label === 'string' ? label : labels.help} onClick={event => { if (!event.defaultPrevented && !blocked() && actionEnabled[kind] !== false && (!readOnly || ['help', 'export', 'export3d'].includes(kind))) onAction?.(kind, snapshot(draft), event); }}>{label}</Button>;
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const turn = (phase: StructurePreviewTurnDetail['phase'], event: PointerEvent<HTMLDivElement>, deltaX = 0, deltaY = 0) => { if (!blocked() && !event.defaultPrevented) onPreviewTurn?.({ phase, deltaX, deltaY, event }); };
  const footerGroups: readonly [StructureEditorMode, StructureEditorAction[]][] = [['save', capabilities.filePickingSupported ? ['save', 'export', 'reset'] : ['save', 'reset']], ['load', capabilities.filePickingSupported ? ['load', 'import', 'reset'] : ['load', 'reset']], ['export', ['export3d', 'import', 'reset']], ['data', ['reset']], ['corner', []]];
  return <section {...props} ref={attach} className={['mc-structure', className].filter(Boolean).join(' ')} data-mode={draft.mode} data-source="structure-editor" data-readonly={readOnly} aria-busy={visibility.progress || undefined}
    aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? `${id}-title`} style={{ '--mc-structure-u': `${scale}px`, width: size[0] * scale, height: size[1] * scale,
      '--mc-structure-header': url(jigsawImageAssets.StoreTopBar.url), '--mc-structure-hollow': url(jigsawImageAssets.dialog_background_hollow_4.url), '--mc-structure-control': url(jigsawImageAssets.control.url), '--mc-structure-footer': url(craftingImageAssets.recipe_back_panel.url), ...style } as CSSProperties}
    onKeyDown={event => { onKeyDown?.(event); if (event.defaultPrevented || blocked() || event.nativeEvent.isComposing || event.keyCode === 229 || event.key !== 'Escape') return; event.preventDefault(); onCancel?.(snapshot(draft), { reason: 'escape', event }); }}>
    <header className="mc-structure__header"><button type="button" className="mc-structure__back" data-structure-action="back" aria-label={labels.back} disabled={disabled}
      onClick={event => { if (!event.defaultPrevented && !blocked()) onCancel?.(snapshot(draft), { reason: 'back', event }); }}><Image src={jigsawImageAssets.chevron_left.url} sourceSize={jigsawImageAssets.chevron_left.sourceSize} size={[4, 7]} scale={scale} alt=""/></button><h2 id={`${id}-title`}>{labels.title}</h2></header>
    <div className="mc-structure__left"><div className="mc-structure__scroll-frame"><span className="mc-structure__frame-fill" aria-hidden="true"/>
      <ScrollArea className="mc-structure__scroll" scale={scale} label={labels.content} viewportRef={scrollViewportRef} viewportProps={scrollViewportProps} contentProps={{ className: 'mc-structure__scroll-content' }}>
        <div className="mc-structure__stack">
          <Combobox label={labels.mode} value={draft.mode} ref={dropdownRefs?.mode} disabled={disabled || enabled.mode === false} aria-readonly={readOnly || undefined} data-structure-field="mode"
            options={modes.filter(mode => (mode !== 'data' || capabilities.dataSupport) && (mode !== 'export' || capabilities.export3dSupport)).map(mode => ({ value: mode, label: labels[mode] }))} onValueChange={next => update('mode', next as StructureEditorMode)}/>
          <div className="mc-structure__mode" data-structure-mode="export" hidden={!modeVisible('export')}><div className="mc-structure__vectors">{vector('exportSize', labels.size)}{vector('exportOffset', labels.offset)}</div><div className="mc-structure__gap" style={{ height: scale * 4 }}/>{toggle('removeBlocks', labels.removeBlocks, labels.remove, 'export')}</div>
          <div className="mc-structure__mode" data-structure-mode="save" hidden={!modeVisible('save')}>
            {scalar('name', 30, labels.name, false, 'save')}<div className="mc-structure__vectors">{vector('saveSize', labels.size)}{vector('saveOffset', labels.offset)}</div>
            <div className="mc-structure__detect">{action('detect', labels.detect)}</div>{toggle('includeEntities', labels.includeEntities, labels.include, 'save')}{toggle('removeBlocks', labels.removeBlocks, labels.remove, 'save')}
            <Combobox label={labels.redstoneSaveMode} value={draft.redstoneSaveMode} ref={dropdownRefs?.redstoneSaveMode} disabled={disabled || enabled.redstoneSaveMode === false} aria-readonly={readOnly || undefined} data-structure-field="redstoneSaveMode"
              options={[{ value: 'memory', label: labels.memory }, { value: 'disk', label: labels.disk }]} onValueChange={next => update('redstoneSaveMode', next as StructureEditorValue['redstoneSaveMode'])}/>
          </div>
          <div className="mc-structure__mode" data-structure-mode="load" hidden={!modeVisible('load')}>
            {scalar('name', 30, labels.name, false, 'load')}{vector('loadOffset', labels.offset)}{toggle('includeEntities', labels.includeEntities, labels.include, 'load')}{toggle('waterlogging', labels.waterlogging, labels.on, 'load')}{toggle('removeBlocks', labels.removeBlocks, labels.remove, 'load')}
            {scalar('integrity', 64, '100.00')}{scalar('seed', 256)}
            <Slider label={rotationLabel ?? labels.rotation} value={draft.rotation} ref={rotationRef} min={rotationRange.min} max={rotationRange.max} step={rotationRange.step} formatValue={rotationFormat}
              disabled={disabled || enabled.rotation === false} aria-readonly={readOnly || undefined} data-structure-field="rotation" onValueChange={next => update('rotation', next)}/>
            <div className="mc-structure__mirror"><span>{labels.mirror}</span><div>{(['mirrorX', 'mirrorZ'] as const).map(field => <Checkbox key={field} ref={toggleRefs?.[field]} label={field === 'mirrorX' ? 'X:' : 'Z:'} checked={draft[field]} disabled={disabled || enabled[field] === false} readOnly={readOnly} aria-readonly={readOnly || undefined}
              data-structure-field={field} onClick={event => { if (readOnly) event.preventDefault(); }} onChange={event => update(field, event.currentTarget.checked, { event })}/>)}</div></div>
            <Combobox label={labels.animationMode} value={draft.animationMode} ref={dropdownRefs?.animationMode} disabled={disabled || enabled.animationMode === false} aria-readonly={readOnly || undefined} data-structure-field="animationMode"
              options={[{ value: 'none', label: labels.none }, { value: 'layers', label: labels.layers }, { value: 'blocks', label: labels.blocks }]} onValueChange={next => update('animationMode', next as StructureEditorValue['animationMode'])}/>
            {scalar('animationTime', 10, labels.animationTimePlaceholder)}
          </div>
          <div className="mc-structure__mode" data-structure-mode="data" hidden={!modeVisible('data')}>{scalar('data', 256)}</div>
          <div className="mc-structure__mode" data-structure-mode="corner" hidden={!modeVisible('corner')}>{scalar('name', 30, labels.name, false, 'corner')}</div>
          <div hidden={visibility.boundingBox === false}>{toggle('showBoundingBox', labels.showBoundingBox, labels.show)}</div>
        </div>
      </ScrollArea></div></div>
    <div className="mc-structure__right">
      <div className="mc-structure__preview-frame"><span className="mc-structure__frame-fill" aria-hidden="true"/>
        <div className="mc-structure__preview">
          <div {...previewProps} ref={previewRef} role={previewProps.role ?? 'group'} className={['mc-structure__renderer', previewProps.className].filter(Boolean).join(' ')} hidden={visibility.renderer === false}
            tabIndex={disabled || !onPreviewTurn ? previewProps.tabIndex ?? -1 : previewProps.tabIndex ?? 0} aria-label={previewProps['aria-label'] ?? labels.preview}
            onPointerDown={event => { previewProps.onPointerDown?.(event); const target = event.target as Element; if (blocked() || event.defaultPrevented || !onPreviewTurn || event.button !== 0 || (target !== event.currentTarget && target.closest?.('input,textarea,button,select,a,[contenteditable="true"]'))) return; pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); turn('start', event); }}
            onPointerMove={event => { previewProps.onPointerMove?.(event); const last = pointer.current; if (!last || last.id !== event.pointerId) return; turn('move', event, event.clientX - last.x, event.clientY - last.y); last.x = event.clientX; last.y = event.clientY; }}
            onPointerUp={event => { previewProps.onPointerUp?.(event); if (pointer.current?.id === event.pointerId) { pointer.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); turn('end', event); } }}
            onPointerCancel={event => { previewProps.onPointerCancel?.(event); if (pointer.current?.id === event.pointerId) { pointer.current = null; turn('end', event); } }}
            onKeyDown={event => { previewProps.onKeyDown?.(event); if (event.defaultPrevented || event.target !== event.currentTarget || blocked() || !onPreviewTurn || event.nativeEvent.isComposing || event.keyCode === 229) return; const delta = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as const)[event.key as 'ArrowLeft']; if (delta) { event.preventDefault(); onPreviewTurn({ phase: 'keyboard', deltaX: delta[0], deltaY: delta[1], event }); } }}>{preview}</div>
          <div className="mc-structure__corner-text" hidden={!(visibility.cornerText ?? shownMode === 'corner')}>{cornerText ?? <><p>{labels.cornerTitle}</p><p>{labels.cornerDescription}</p></>}</div>
          <Image className="mc-structure__rotation-hint" hidden={visibility.rotationHint === false} src={structureEditorImageAssets.Rotate.url} sourceSize={structureEditorImageAssets.Rotate.sourceSize} size={[45, 7]} scale={scale} alt=""/>
          <div className="mc-structure__progress" ref={progressNode} tabIndex={-1} hidden={!visibility.progress} role="status"><div>{progressLabel ?? labels.generating}</div>
            <div className="mc-structure__progress-bar" hidden={visibility.progressBar === false} role="progressbar" aria-label={labels.generating} aria-valuemin={0} aria-valuemax={1} aria-valuenow={Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0}>
              <span className="mc-structure__progress-empty" aria-hidden="true"/><span className="mc-structure__progress-full" aria-hidden="true" style={{ clipPath: `inset(0 ${(1 - (Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0)) * 100}% 0 0)` }}/><span className="mc-structure__progress-nub" aria-hidden="true"/>
            </div>
          </div>
        </div>
        <div className="mc-structure__feedback" role="status">{feedback}</div><div className="mc-structure__export-disabled" hidden={!visibility.exportDisabled}>{exportDisabledText ?? labels.exportDisabled}</div>
      </div>
      <div className="mc-structure__footer"><div className="mc-structure__footer-inner">
        {footerGroups.map(([mode, actions]) => <div key={mode} className="mc-structure__action-group" data-structure-actions={mode} data-count={actions.length} hidden={!(mode !== 'export' || capabilities.export3dSupport) || !(mode !== 'data' || capabilities.dataSupport) || !(footerVisibility[mode] ?? modeVisible(mode))}>{actions.map(kind => action(kind, labels[kind === 'export3d' || kind === 'export' ? 'exportAction' : kind]))}</div>)}
        <div className="mc-structure__help">{action('help', <Image src={craftingImageAssets.how_to_play_button_default_light.url} sourceSize={craftingImageAssets.how_to_play_button_default_light.sourceSize} size={[32, 16]} scale={scale} alt=""/>)}</div>
      </div></div>
    </div>
  </section>;
});
