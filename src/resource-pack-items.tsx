import { forwardRef, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref } from 'react';
import { Image } from './image';
import { ClassicSkin } from './classic-skin';
import { resourcePackAssets } from './resource-pack-assets';
import { deferClassicRequest, useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';

export type ResourcePackKind = 'selected' | 'available' | 'realms' | 'unowned' | 'invalid';
export interface ResourcePackIdentity { profile: string; collection: string; id: string; index: number; payload?: unknown }
export interface ResourcePackImage { src: string; sourceSize: readonly [number, number]; alt?: string }
export type ResourcePackAction = 'select' | 'read-toggle' | 'remove' | 'add' | 'store' | 'options' | 'up' | 'down' | 'report' | 'deselect' | 'navigate-left' | 'navigate-right';
type ButtonAction = Exclude<ResourcePackAction, 'deselect' | 'navigate-left' | 'navigate-right'>;
type InputAction = Exclude<ResourcePackAction, ButtonAction>;
export type ResourcePackActionDetail = ResourcePackIdentity & { target: string; sourceControl: string } & (
  { action: ButtonAction; origin: 'button'; control: HTMLButtonElement; event: MouseEvent<HTMLButtonElement> }
  | { action: InputAction; origin: 'keyboard'; control: HTMLDivElement; event: KeyboardEvent<HTMLDivElement> }
);
export type ResourcePackActionHandler = (detail: ResourcePackActionDetail) => void | false;
export interface ResourcePackTargets {
  select: string; readToggle: string; moveLeft: string; store: string; sortUp: string; sortDown: string; reportErrors: string; packSettings: string; deselect: string;
}
export interface ResourcePackLabels { select: string; readMore: string; readLess: string; remove: string; add: string; store: string; options: string; up: string; down: string; report: string; loading: string; actions: string }
/** Values resolve the named collection, including warning_image_wrapper's
 * authored selected-collection binding when reused by other action trays. */
export interface ResourcePackDiagnosticSnapshot {
  collection: string;
  hasErrors: boolean; hasWarnings: boolean; hasExpired: boolean; errorFree: boolean; reportGenerating: boolean;
  errorCount: string; warningCount: string; errorsText: string; warningsText: string; expiredText: string;
  loadingFrame: number;
}
type NativeDiv = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'>;
type NativeButton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'disabled' | 'dangerouslySetInnerHTML'>;
type DataAttributes = { [name: `data-${string}`]: string | number | boolean | undefined };
export interface ResourcePackDiagnosticsProps extends NativeDiv, DataAttributes {
  variant: 'icons' | 'selected-lines' | 'invalid-line';
  data: ResourcePackDiagnosticSnapshot;
  scale: number;
  width: number;
  lowMemoryDevice: boolean;
  loadingLabel: string;
  /** Host-resolved intrinsic cm line height for the invalid profile. */
  invalidErrorHeight?: number;
}
export interface ResourcePackActionBindings {
  directionVisible: boolean; isUsingGamepad: boolean; isSelected: boolean; platformLocked: boolean;
  canMove: boolean; canGoToStore: boolean; canSortUp: boolean; canSortDown: boolean; hasPackSettings: boolean; reportButtonVisible: boolean; reportGenerating: boolean;
}
export interface ResourcePackActionsProps extends NativeDiv, DataAttributes {
  kind: ResourcePackKind;
  identity: ResourcePackIdentity;
  width: number;
  scale: number;
  bindings: ResourcePackActionBindings;
  labels: ResourcePackLabels;
  targets: ResourcePackTargets;
  /** Explicit selected-collection snapshot: never silently substituted with identity.collection. */
  diagnostics: ResourcePackDiagnosticSnapshot;
  lowMemoryDevice: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onAction?: ResourcePackActionHandler;
  buttonProps?: Partial<Record<'move' | 'store' | 'options' | 'up' | 'down' | 'report', NativeButton & DataAttributes>>;
  buttonRefs?: Partial<Record<'move' | 'store' | 'options' | 'up' | 'down' | 'report', Ref<HTMLButtonElement>>>;
}
export interface ResourcePackItemBindings { isSelected: boolean; isReadMore: boolean; isReadLess: boolean; usingEllipses: boolean; directionVisible: boolean }
export interface ResourcePackItemLayout {
  /** Main common.button100%c resolved height; excludes following2/tray/divider/4. */
  mainHeight: number;
  /** Independently resolved100%cm child extent: default paint adds2, hover does not. */
  contentHeight: number;
  /** Expanded text body100%c resolved height, excluding the10-unit name row. */
  expandedTextHeight: number;
  /** Actual Web glyph intrinsic name/size split must be supplied, not inferred from byte size. */
  fileSizeWidth: number;
  readButtonHeight: number;
  invalidErrorHeight: number;
}
export interface ResourcePackItemProps extends NativeDiv, DataAttributes {
  kind: ResourcePackKind;
  identity: ResourcePackIdentity;
  /** Source parent width; this item's outer width is parent minus2. */
  width: number;
  scale: number;
  icon: ResourcePackImage | null;
  text: { name: string; size: string; description: string };
  bindings: ResourcePackItemBindings;
  layout: ResourcePackItemLayout;
  diagnostics: ResourcePackDiagnosticSnapshot;
  labels: ResourcePackLabels;
  targets: ResourcePackTargets;
  lowMemoryDevice: boolean;
  actions?: Omit<ResourcePackActionsProps, 'kind' | 'identity' | 'width' | 'scale' | 'labels' | 'targets' | 'lowMemoryDevice' | 'disabled' | 'readOnly' | 'onAction'>;
  disabled?: boolean;
  readOnly?: boolean;
  onAction?: ResourcePackActionHandler;
  buttonProps?: NativeButton & DataAttributes;
  buttonRef?: Ref<HTMLButtonElement>;
}

const join = (...values: (string | undefined | false)[]) => values.filter(Boolean).join(' ');
function str(value: unknown, name: string, nonblank = false): asserts value is string { if (typeof value !== 'string' || value.length > 1048576 || nonblank && !value.trim()) throw new TypeError(`${name} must be bounded${nonblank ? ' nonblank' : ''} text.`); }
function bool(value: unknown, name: string): asserts value is boolean { if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean source binding.`); }
function dimension(value: unknown, name: string, minimum = 0): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > 8192) throw new RangeError(`${name} must be a finite logical extent within${minimum}..8192.`); }
function appearance(scale: number, style?: CSSProperties): CSSProperties { return { '--mc-rp-scale': scale, '--mc-rp-divider': `url(${JSON.stringify(resourcePackAssets['textures/ui/divider3'].url)})`, ...style } as CSSProperties; }
function common(width: number, scale: number, disabled?: boolean, readOnly?: boolean) {
  dimension(width, 'width', 1); if (!Number.isSafeInteger(scale) || scale < 1 || scale > 32 || width * scale > 8192) throw new RangeError('Resource-pack scale must be1..32 with bounded physical width.');
  if (disabled !== undefined) bool(disabled, 'disabled'); if (readOnly !== undefined) bool(readOnly, 'readOnly');
}
function kindPlan(kind: ResourcePackKind) { if (!['selected', 'available', 'realms', 'unowned', 'invalid'].includes(kind)) throw new TypeError('Resource-pack kind must be a source collection profile.'); }
function identityPlan(value: ResourcePackIdentity) { if (!value) throw new TypeError('Resource-pack identity is required.'); for (const key of ['profile', 'collection', 'id'] as const) str(value[key], `identity.${key}`, true); if (!Number.isSafeInteger(value.index) || value.index < 0) throw new RangeError('identity.index must be a nonnegative source collection index.'); }
function textPlan(labels: ResourcePackLabels, targets: ResourcePackTargets) { if (!labels || !targets) throw new TypeError('Source labels and resolved action aliases are required.'); for (const key of ['select', 'readMore', 'readLess', 'remove', 'add', 'store', 'options', 'up', 'down', 'report', 'loading', 'actions'] as const) str(labels[key], `labels.${key}`); for (const key of ['select', 'readToggle', 'moveLeft', 'store', 'sortUp', 'sortDown', 'reportErrors', 'packSettings', 'deselect'] as const) str(targets[key], `targets.${key}`, true); }
/** Private preflight exports are intentionally absent from the public barrel. */
export function validateResourcePackDiagnosticSnapshot(value: ResourcePackDiagnosticSnapshot) {
  if (!value) throw new TypeError('Explicit diagnostic collection snapshot is required.'); str(value.collection, 'diagnostics.collection', true);
  for (const key of ['hasErrors', 'hasWarnings', 'hasExpired', 'errorFree', 'reportGenerating'] as const) bool(value[key], `diagnostics.${key}`);
  for (const key of ['errorCount', 'warningCount', 'errorsText', 'warningsText', 'expiredText'] as const) str(value[key], `diagnostics.${key}`);
  if (!Number.isSafeInteger(value.loadingFrame) || value.loadingFrame < 0 || value.loadingFrame > 9) throw new RangeError('diagnostics.loadingFrame must be an explicit0..9 source UV frame.');
}

function glyph(path: keyof typeof resourcePackAssets, width: number, height: number, scale: number, className?: string, style?: CSSProperties) {
  const asset = resourcePackAssets[path]; return <Image src={asset.url} sourceSize={[asset.width, asset.height]} alt="" size={[width, height]} scale={scale} className={className} style={style} />;
}
function skin(path: keyof typeof resourcePackAssets, width: number, height: number, scale: number, className?: string) { return <ClassicSkin asset={resourcePackAssets[path]} width={width} height={height} scale={scale} className={className} />; }
export function validateResourcePackDiagnosticsProps(p: ResourcePackDiagnosticsProps) {
  common(p.width, p.scale); bool(p.lowMemoryDevice, 'lowMemoryDevice'); validateResourcePackDiagnosticSnapshot(p.data); str(p.loadingLabel, 'loadingLabel');
  if (!['icons', 'selected-lines', 'invalid-line'].includes(p.variant)) throw new TypeError('Diagnostics variant must name an authored source leaf.');
  if (p.variant === 'icons' && p.width !== 16) throw new RangeError('The source warning_image_wrapper is16 logical units wide.');
  if (p.variant === 'invalid-line' || p.invalidErrorHeight !== undefined) dimension(p.invalidErrorHeight, 'invalidErrorHeight', 1);
}
/** Independent diagnostic image bindings overlap in source order. No severity enum. */
export const ResourcePackDiagnostics = forwardRef<HTMLDivElement, ResourcePackDiagnosticsProps>(function ResourcePackDiagnostics({ variant, data, scale, width, lowMemoryDevice, loadingLabel, invalidErrorHeight, className, style, ...native }, ref) {
  validateResourcePackDiagnosticsProps({ variant, data, scale, width, lowMemoryDevice, loadingLabel, invalidErrorHeight });
  const [, attach] = useClassicNodeRef(ref), lineHeight = variant === 'invalid-line' ? (data.hasErrors ? invalidErrorHeight! : 0) : 10 * (+data.hasWarnings + +data.hasErrors + +data.hasExpired);
  return <div {...native} ref={attach} className={join('mc-resource-pack-diagnostics', `mc-resource-pack-diagnostics--${variant}`, className)} data-source-control={variant === 'icons' ? 'resource_packs.warning_image_wrapper' : variant === 'invalid-line' ? 'resource_packs.invalid_text_panel.error_line' : 'resource_packs.selected_text_panel.full_panel'} data-diagnostic-collection={data.collection} data-low-memory-device={lowMemoryDevice} data-font-instance-factor=".8" data-font-inherited-variable="1.39-and-y-2-if-not-low-memory" style={appearance(scale, { ...style, width: width * scale, height: (variant === 'icons' ? 14 : lineHeight) * scale })}>
    {variant === 'icons' ? <>
      {data.hasErrors && <span className="mc-resource-pack-diagnostics__icon" data-diagnostic="error">{glyph('textures/ui/ErrorGlyph', 9, 14, scale, 'mc-rp-default-only')}{glyph('textures/ui/ErrorGlyph_small_hover', 11, 16, scale, 'mc-rp-not-default')}</span>}
      {data.hasWarnings && <span className="mc-resource-pack-diagnostics__icon" data-diagnostic="warning">{glyph('textures/ui/Caution', 9, 14, scale, 'mc-rp-idle')}{glyph('textures/ui/WarningGlyph_small_hover', 11, 16, scale, 'mc-rp-hover')}</span>}
      {data.errorFree && <span className="mc-resource-pack-diagnostics__icon mc-resource-pack-diagnostics__success" data-diagnostic="success">{glyph('textures/ui/confirm', 14, 12, scale, 'mc-rp-idle')}{glyph('textures/ui/New_confirm_Hover', 16, 14, scale, 'mc-rp-hover')}</span>}
      {data.reportGenerating && <span role="img" aria-label={loadingLabel} className="mc-resource-pack-diagnostics__icon" data-diagnostic="generating"><span className="mc-resource-pack-diagnostics__loading" data-frame={data.loadingFrame}>{glyph('textures/ui/loading_bar', 160, 8, scale, undefined, { left: -data.loadingFrame * 16 * scale })}</span></span>}
    </> : <>
      {variant === 'selected-lines' && data.hasWarnings && <div className="mc-resource-pack-diagnostics__line" data-source-binding="#has_warnings"><span className="mc-resource-pack-diagnostics__warning">{data.warningsText}</span><span>{data.warningCount}</span></div>}
      {data.hasErrors && <div className="mc-resource-pack-diagnostics__line" data-source-binding="#has_errors" style={variant === 'invalid-line' ? { height: invalidErrorHeight! * scale } : undefined}><span className="mc-resource-pack-diagnostics__error">{data.errorsText}</span><span>{data.errorCount}</span></div>}
      {variant === 'selected-lines' && data.hasExpired && <div className="mc-resource-pack-diagnostics__line" data-source-binding="#has_expired"><span className="mc-resource-pack-diagnostics__expired">{data.expiredText}</span></div>}
    </>}
  </div>;
});

type PrivateButtonProps = {
  identity: ResourcePackIdentity; action: ButtonAction; target: string; sourceControl: string; label: string; scale: number;
  disabled?: boolean; readOnly?: boolean; onAction?: ResourcePackActionHandler; native?: NativeButton & DataAttributes; buttonRef?: Ref<HTMLButtonElement>; className?: string; style?: CSSProperties; children?: ReactNode;
};
function PackButton({ identity, action, target, sourceControl, label, scale, disabled, readOnly, onAction, native, buttonRef, className, style, children }: PrivateButtonProps) {
  const [, attach] = useClassicNodeRef(buttonRef), latest = useRef({ identity, action, target, disabled, readOnly, onAction });
  useClassicLayoutEffect(() => { latest.current = { identity, action, target, disabled, readOnly, onAction }; });
  return <button {...native} ref={attach} type="button" disabled={disabled || readOnly} aria-label={native?.['aria-label'] ?? label} className={join('mc-rp-button', className, native?.className)} data-pack-action={action} data-source-control={sourceControl} data-pack-target={target} style={appearance(scale, { ...native?.style, ...style })}
    onKeyDown={event => { native?.onKeyDown?.(event); if (!event.defaultPrevented && (event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}
    onClick={event => {
      native?.onClick?.(event); if (event.defaultPrevented || event.nativeEvent.defaultPrevented || disabled || readOnly) return;
      const owner = event.currentTarget, captured = { ...identity };
      deferClassicRequest(event, owner, snapshot => latest.current.onAction?.(Object.freeze({ ...captured, action, target, sourceControl, origin: 'button', control: owner, event: snapshot })), () => {
        const now = latest.current; return !now.disabled && !now.readOnly && now.action === action && now.target === target && (['profile', 'collection', 'id', 'index', 'payload'] as const).every(key => now.identity[key] === captured[key]) && !owner.closest('[hidden],[inert]');
      });
    }}>{children}</button>;
}

interface ActionSlot { key: 'move' | 'store' | 'options' | 'up' | 'down' | 'report'; slot: number; visible: boolean; enabled: boolean; width: number; height: number; x: number; action: ButtonAction; target: string; sourceControl: string; label: string }
export function validateResourcePackActionsProps(p: ResourcePackActionsProps) {
  kindPlan(p.kind); common(p.width, p.scale, p.disabled, p.readOnly); identityPlan(p.identity); textPlan(p.labels, p.targets); validateResourcePackDiagnosticSnapshot(p.diagnostics); bool(p.lowMemoryDevice, 'lowMemoryDevice');
  if (!p.bindings) throw new TypeError('Source action bindings are required.'); for (const key of ['directionVisible', 'isUsingGamepad', 'isSelected', 'platformLocked', 'canMove', 'canGoToStore', 'canSortUp', 'canSortDown', 'hasPackSettings', 'reportButtonVisible', 'reportGenerating'] as const) bool(p.bindings[key], `actions.bindings.${key}`);
  const b = p.bindings, slots: ActionSlot[] = [];
  const add = (key: ActionSlot['key'], slot: number, visible: boolean, enabled: boolean, width: number, height: number, action: ButtonAction, target: string, sourceControl: string, label: string) => slots.push({ key, slot, visible, enabled, width, height, action, target, sourceControl, label, x: 0 });
  if (p.kind === 'selected' || p.kind === 'available' || p.kind === 'realms') {
    add('move', 0, b.canMove, p.kind === 'selected' ? b.isSelected : !b.platformLocked, -1, 18, p.kind === 'selected' ? 'remove' : 'add', p.targets.moveLeft, `resource_packs.selected_pack_${p.kind === 'selected' ? 'minus' : 'plus'}_button`, p.kind === 'selected' ? p.labels.remove : p.labels.add);
    add('store', 1, b.canGoToStore, b.isSelected, 70, 18, 'store', p.targets.store, 'resource_packs.selected_pack_store_button', p.labels.store);
    if (p.kind === 'selected') { add('options', 2, b.hasPackSettings, true, 18, 14, 'options', p.targets.packSettings, 'resource_packs.selected_pack_options_button', p.labels.options); add('up', 3, b.canSortUp, true, 18, 18, 'up', p.targets.sortUp, 'resource_packs.selected_pack_up_button', p.labels.up); add('down', 4, b.canSortDown, true, 18, 18, 'down', p.targets.sortDown, 'resource_packs.selected_pack_down_button', p.labels.down); }
    add('report', p.kind === 'selected' ? 5 : 2, b.reportButtonVisible, !b.reportGenerating, 16, 16, 'report', p.targets.reportErrors, 'resource_packs.selected_pack_warning_button', p.labels.report);
  } else if (p.kind === 'unowned') add('store', 1, b.canGoToStore, b.isSelected, -1, 18, 'store', p.targets.store, 'resource_packs.selected_pack_store_button_fill', p.labels.store);
  const shown = slots.filter(slot => slot.visible), padding = shown.filter(slot => slot.slot > 0).length * 2, fixed = shown.filter(slot => slot.width >= 0).reduce((sum, slot) => sum + slot.width, 0), fills = shown.filter(slot => slot.width < 0).length;
  const fill = fills ? (p.width - 8 - padding - fixed) / fills : 0;
  if (p.width < 10 || fills && fill < 2 || fixed + padding > p.width - 8) throw new RangeError('Resource-pack action tray cannot contain the declared source controls.');
  let cursor = 0; for (const slot of slots) if (slot.visible) { if (slot.slot > 0) cursor += 2; if (slot.width < 0) slot.width = fill; slot.x = cursor; cursor += slot.width; }
  return { slots, width: p.width, height: 24, visible: b.directionVisible && p.kind !== 'invalid' };
}
function ActionArt({ slot, scale, diagnostics, lowMemoryDevice, loadingLabel }: { slot: ActionSlot; scale: number; diagnostics: ResourcePackDiagnosticSnapshot; lowMemoryDevice: boolean; loadingLabel: string }) {
  if (slot.key === 'report') return <ResourcePackDiagnostics variant="icons" data={diagnostics} scale={scale} width={16} lowMemoryDevice={lowMemoryDevice} loadingLabel={loadingLabel} />;
  if (slot.key === 'options') return <span className="mc-rp-options" data-source-wrapper="resource_packs.options_wrapper">{glyph('textures/ui/icon_setting', 14, 14, scale)}{glyph('textures/ui/settings_glyph_2x', 14, 14, scale, 'mc-rp-hover')}<span className="mc-rp-vertical-divider" /></span>;
  if (slot.key === 'up' || slot.key === 'down') return <span className={`mc-rp-arrow mc-rp-arrow--${slot.key}`} data-source-wrapper={`resource_packs.${slot.key}_arrow_wrapper`}>{glyph(slot.key === 'up' ? 'textures/ui/up_arrow' : 'textures/ui/down_arrow', 14, 14, scale)}<span className="mc-rp-vertical-divider" /></span>;
  return <><span className="mc-rp-button__skins" aria-hidden="true">{skin('textures/ui/button_borderless_light', Math.max(1, slot.width - 2), 16, scale, 'mc-rp-idle')}{skin('textures/ui/button_borderless_lighthover', Math.max(1, slot.width - 2), 16, scale, 'mc-rp-hover')}{skin('textures/ui/button_borderless_lightpressed', Math.max(1, slot.width - 2), 16, scale, 'mc-rp-pressed')}{skin('textures/ui/disabledButtonNoBorder', Math.max(1, slot.width - 2), 16, scale, 'mc-rp-locked')}</span><span className="mc-rp-button__movement-text"><span className="mc-rp-button__movement-label">{slot.label}</span></span></>;
}
/** Source inline input_panel; gamepad modal state never creates a global popup. */
export const ResourcePackActions = forwardRef<HTMLDivElement, ResourcePackActionsProps>(function ResourcePackActions(props, forwarded) {
  const plan = validateResourcePackActionsProps(props), { kind, identity, width, scale, bindings, labels, targets, diagnostics, lowMemoryDevice, disabled, readOnly, onAction, buttonProps, buttonRefs, className, style, onKeyDown, ...native } = props;
  const [, attach] = useClassicNodeRef(forwarded), latest = useRef(props); useClassicLayoutEffect(() => { latest.current = props; });
  return <div {...native} ref={attach} role={native.role ?? 'group'} aria-label={native['aria-label'] ?? labels.actions} className={join('mc-resource-pack-actions', className)} hidden={native.hidden || !plan.visible} data-source-control="resource_packs.input_button_panel" data-inline-modal="true" data-source-modal={bindings.isUsingGamepad} data-source-warning-binding="$selected_pack_items" data-resolved-warning-collection={diagnostics.collection} style={appearance(scale, { ...style, width: width * scale, height: 24 * scale })}
    onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented || event.nativeEvent.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || disabled || readOnly || !plan.visible) return;
      const action: InputAction | undefined = event.key === 'Escape' && bindings.isUsingGamepad ? 'deselect' : event.key === 'Enter' && bindings.isUsingGamepad ? 'deselect' : event.key === 'ArrowLeft' ? 'navigate-left' : event.key === 'ArrowRight' ? 'navigate-right' : undefined;
      if (!action) return; const target = action === 'deselect' ? targets.deselect : action === 'navigate-left' ? 'button.menu_left' : 'button.menu_right', owner = event.currentTarget, captured = { ...identity };
      // DOM key mappings are request-only Web bridges. In particular Enter is
      // non-consuming, matching the authored menu_select mapping.
      deferClassicRequest(event, owner, snapshot => latest.current.onAction?.(Object.freeze({ ...captured, action, target, sourceControl: 'resource_packs.input_button_panel', origin: 'keyboard', control: owner, event: snapshot })), () => { const now = latest.current; return !now.disabled && !now.readOnly && now.bindings.directionVisible && now.bindings.isUsingGamepad === bindings.isUsingGamepad && (action !== 'deselect' || now.targets.deselect === target) && (['profile', 'collection', 'id', 'index', 'payload'] as const).every(key => now.identity[key] === captured[key]) && !owner.closest('[hidden],[inert]'); });
    }}>
    <span className="mc-resource-pack-actions__border" aria-hidden="true">{skin('textures/ui/packs_border', width, 24, scale)}</span><span aria-hidden="true" className="mc-resource-pack-actions__middle" style={{ backgroundImage: `url(${JSON.stringify(resourcePackAssets['textures/ui/packs_middle'].url)})` }} />
    <div className="mc-resource-pack-actions__inner">{plan.slots.filter(slot => slot.visible).map(slot => <PackButton key={slot.key} identity={identity} action={slot.action} target={slot.target} sourceControl={slot.sourceControl} label={slot.label} scale={scale} disabled={disabled || !slot.enabled} readOnly={readOnly} onAction={onAction} native={buttonProps?.[slot.key]} buttonRef={buttonRefs?.[slot.key]} className={join('mc-rp-action', `mc-rp-action--${slot.key}`)} style={{ left: slot.x * scale, top: (18 - slot.height) / 2 * scale, width: slot.width * scale, height: slot.height * scale }}><ActionArt slot={slot} scale={scale} diagnostics={diagnostics} lowMemoryDevice={lowMemoryDevice} loadingLabel={labels.loading} /></PackButton>)}</div>
  </div>;
});

export function validateResourcePackItemProps(p: ResourcePackItemProps) {
  kindPlan(p.kind); common(p.width, p.scale, p.disabled, p.readOnly); identityPlan(p.identity); textPlan(p.labels, p.targets); validateResourcePackDiagnosticSnapshot(p.diagnostics); bool(p.lowMemoryDevice, 'lowMemoryDevice');
  if (!p.text || !p.bindings || !p.layout) throw new TypeError('Resource-pack text, bindings and resolved intrinsic layout are required.');
  for (const key of ['name', 'size', 'description'] as const) str(p.text[key], `text.${key}`);
  for (const key of ['isSelected', 'isReadMore', 'isReadLess', 'usingEllipses', 'directionVisible'] as const) bool(p.bindings[key], `bindings.${key}`);
  for (const key of ['mainHeight', 'contentHeight', 'expandedTextHeight', 'readButtonHeight', 'invalidErrorHeight'] as const) dimension(p.layout[key], `layout.${key}`, 1); dimension(p.layout.fileSizeWidth, 'layout.fileSizeWidth');
  if (p.icon !== null) { if (!p.icon) throw new TypeError('icon must be a whole host image or explicit null.'); str(p.icon.src, 'icon.src', true); if (!Array.isArray(p.icon.sourceSize) || p.icon.sourceSize.length !== 2 || ![p.icon.sourceSize[0], p.icon.sourceSize[1]].every(n => Number.isSafeInteger(n) && n > 0 && n <= 32768)) throw new TypeError('icon.sourceSize requires two physical pixel dimensions.'); }
  const width = p.width - 2; if (width <= 48 || p.layout.fileSizeWidth + (p.kind === 'selected' ? 9 : 0) > width - 48) throw new RangeError('Resource-pack width must contain the icon, text and declared size label.');
  const statusHeight = p.kind === 'selected' ? 10 * (+p.diagnostics.hasWarnings + +p.diagnostics.hasErrors + +p.diagnostics.hasExpired) : 0;
  if (p.kind === 'selected' && p.layout.expandedTextHeight < statusHeight) throw new RangeError('Expanded text height must contain the independently visible source status lines.');
  if (p.kind !== 'invalid' && p.bindings.directionVisible && !p.actions) throw new TypeError('Visible direction tray requires its explicit action bindings and selected-collection diagnostics.');
  if (p.actions) { if (p.actions.bindings.directionVisible !== p.bindings.directionVisible || p.actions.bindings.isSelected !== p.bindings.isSelected) throw new TypeError('Repeated row/tray bindings must resolve the same source directionVisible/isSelected value.'); validateResourcePackActionsProps({ ...p.actions, kind: p.kind, identity: p.identity, width, scale: p.scale, labels: p.labels, targets: p.targets, lowMemoryDevice: p.lowMemoryDevice, disabled: p.disabled, readOnly: p.readOnly, onAction: p.onAction }); }
  const trayVisible = p.kind !== 'invalid' && p.bindings.directionVisible;
  const outerHeight = Math.max(50, p.layout.mainHeight + 2 + (trayVisible ? 24 : 1) + 4);
  if (outerHeight * p.scale > 8192 || p.layout.contentHeight * p.scale > 8190) throw new RangeError('Resource-pack resolved row exceeds the finite Web paint budget.');
  return { width, outerHeight, statusHeight, trayVisible, textWidth: width - 48, bodyWidth: Math.max(0, width - 108) };
}
function ReadAction({ p, label, visible, className }: { p: ResourcePackItemProps; label: string; visible: boolean; className: string }) {
  if (!visible || p.kind === 'invalid') return null;
  return <PackButton identity={p.identity} action="read-toggle" target={p.targets.readToggle} sourceControl="common_buttons.read_button/underline_button" label={label} scale={p.scale} disabled={p.disabled} readOnly={p.readOnly} onAction={p.onAction} className={join('mc-rp-read', className)} style={{ height: p.layout.readButtonHeight * p.scale }}><span className="mc-rp-read__panel" data-source-panel-height="100%c+3px"><span className="mc-rp-read__label">{label}<span aria-hidden="true" className="mc-rp-read__line mc-rp-idle" style={{ backgroundImage: `url(${JSON.stringify(resourcePackAssets['textures/ui/underline'].url)})` }} /><span aria-hidden="true" className="mc-rp-read__line mc-rp-hover" style={{ backgroundImage: `url(${JSON.stringify(resourcePackAssets['textures/ui/underline_focus'].url)})` }} /></span></span></PackButton>;
}
function ItemText({ p, expanded, width, statusHeight }: { p: ResourcePackItemProps; expanded: boolean; width: number; statusHeight: number }) {
  const bodyHeight = expanded ? p.layout.expandedTextHeight : 32;
  if (p.kind === 'invalid') return <div className="mc-rp-item__text mc-rp-item__text--invalid"><ResourcePackDiagnostics variant="invalid-line" data={p.diagnostics} width={width - 48} scale={p.scale} lowMemoryDevice={p.lowMemoryDevice} loadingLabel={p.labels.loading} invalidErrorHeight={p.layout.invalidErrorHeight} /></div>;
  return <div className="mc-rp-item__text" data-source-text-profile={p.kind} data-source-text-state={expanded ? 'full' : 'small'} hidden={expanded ? !p.bindings.isReadLess : !p.bindings.isReadMore}>
    <div className="mc-rp-item__name-row"><span className="mc-rp-item__name">{p.text.name}</span><span className="mc-rp-item__file-size" style={{ width: p.layout.fileSizeWidth * p.scale }}>{p.text.size}</span>{p.kind === 'selected' && <span className="mc-rp-item__active">{glyph('textures/ui/online', 7, 7, p.scale)}</span>}</div>
    <div className="mc-rp-item__body" style={{ height: bodyHeight * p.scale }}>
      {p.kind === 'selected' && <ResourcePackDiagnostics variant="selected-lines" data={p.diagnostics} width={Math.max(1, width - 108)} scale={p.scale} lowMemoryDevice={p.lowMemoryDevice} loadingLabel={p.labels.loading} />}
      <div className="mc-rp-item__description" style={{ height: Math.max(0, bodyHeight - statusHeight) * p.scale }} data-using-ellipses={p.bindings.usingEllipses}>{p.text.description}</div>
    </div>
  </div>;
}
/** A complete authored collection row, not an active/available selection enum. */
export const ResourcePackItem = forwardRef<HTMLDivElement, ResourcePackItemProps>(function ResourcePackItem(props, ref) {
  const plan = validateResourcePackItemProps(props), { kind, identity, width: _parentWidth, scale, icon, text: _text, bindings, layout, diagnostics: _diagnostics, labels, targets, lowMemoryDevice: _lowMemory, actions, disabled, readOnly, onAction, buttonProps, buttonRef, className, style, ...native } = props;
  const [, attach] = useClassicNodeRef(ref);
  const visual = (state: 'default' | 'hover') => <div aria-hidden="true" className={`mc-rp-item__visual mc-rp-item__visual--${state}`} style={{ height: (layout.contentHeight + (state === 'default' ? 2 : 0)) * scale, top: (layout.mainHeight - layout.contentHeight - (state === 'default' ? 2 : 0)) / 2 * scale }}>
    {state === 'hover' && (kind === 'invalid' || bindings.isReadMore) && <span className="mc-rp-item__focus-small">{skin('textures/ui/focus_border_white', plan.width, 44, scale)}</span>}
    <span className="mc-rp-item__icon">{icon && <Image src={icon.src} sourceSize={icon.sourceSize} alt={icon.alt ?? ''} size={[42, 42]} scale={scale} />}</span>
    <ItemText p={props} expanded={false} width={plan.width} statusHeight={plan.statusHeight} />{kind !== 'invalid' && <div className="mc-rp-item__expanded-wrapper" data-source-height={state === 'hover' ? '100%c+2px' : '100%c'} style={{ height: (layout.expandedTextHeight + 10 + (state === 'hover' ? 2 : 0)) * scale }}><ItemText p={props} expanded width={plan.width} statusHeight={plan.statusHeight} /></div>}
  </div>;
  return <div {...native} ref={attach} className={join('mc-resource-pack-item', className)} data-pack-kind={kind} data-row-selected={bindings.isSelected} data-pack-id={identity.id} data-pack-collection={identity.collection} data-source-control={`resource_packs.${kind}_pack_panel`} data-intrinsic-policy="host-main-and-content-extents" style={appearance(scale, { ...style, width: plan.width * scale, height: plan.outerHeight * scale, minHeight: 50 * scale })}>
    <div className="mc-rp-item__main" style={{ height: layout.mainHeight * scale }}><PackButton identity={identity} action="select" target={targets.select} sourceControl={`resource_packs.${kind}_pack_button`} label={labels.select} scale={scale} disabled={disabled} readOnly={readOnly} onAction={onAction} native={buttonProps} buttonRef={buttonRef} className="mc-rp-item__select" style={{ width: plan.width * scale, height: layout.mainHeight * scale }} />{visual('default')}{visual('hover')}
      <div className="mc-rp-item__read-actions" data-source-read-offset="-6,-1" data-intrinsic-policy="host-read-height-web-glyph-width" style={{ right: 6 * scale, top: ((layout.mainHeight + layout.contentHeight) / 2 - layout.readButtonHeight) * scale }}><ReadAction p={props} label={labels.readMore} visible={bindings.isReadMore && bindings.usingEllipses} className="mc-rp-read--more" /><ReadAction p={props} label={labels.readLess} visible={bindings.isReadLess} className="mc-rp-read--less" /></div>
    </div>
    <div className="mc-rp-item__pad-two" />
    {kind !== 'invalid' && actions && <ResourcePackActions {...actions} kind={kind} identity={identity} width={plan.width} scale={scale} labels={labels} targets={targets} lowMemoryDevice={props.lowMemoryDevice} disabled={disabled} readOnly={readOnly} onAction={onAction} />}
    {(kind === 'invalid' || !bindings.directionVisible) && <div className="mc-rp-horizontal-divider" style={{ backgroundImage: `url(${JSON.stringify(resourcePackAssets['textures/ui/divider3'].url)})` }} />}
    <div className="mc-rp-item__pad-four" />
  </div>;
});
