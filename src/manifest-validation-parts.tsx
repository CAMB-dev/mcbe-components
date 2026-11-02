import { forwardRef, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, MouseEvent, Ref } from 'react';
import { Image } from './image';
import { ClassicSkin } from './classic-skin';
import { ScrollArea } from './scroll-area';
import { manifestValidationAssets } from './manifest-validation-assets';
import { deferClassicRequest, useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';

export interface ManifestValidationIdentity { runKey: string; packId: string; payload?: unknown }
export interface ManifestValidationIssueIdentity { id: string; index: number; collection: 'pack_errors'; payload?: unknown }
export interface ManifestValidationState { isWorking: boolean; isDeleting: boolean; isDoneValidating: boolean }
export interface ManifestValidationImage { src: string; sourceSize: readonly [number, number]; alt?: string }
export interface ManifestValidationActionDetail extends ManifestValidationIdentity {
  action: 'copy' | 'delete' | 'refresh';
  target: 'button.copy_to_clipboard' | 'button.delete_manifest' | 'button.refresh_manifest';
  sourceControl: string;
  issue?: ManifestValidationIssueIdentity;
  control: HTMLButtonElement;
  event: MouseEvent<HTMLButtonElement>;
}
export type ManifestValidationActionHandler = (detail: ManifestValidationActionDetail) => void | false;
type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };
type NativeDiv = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'inputMode'>;
type NativeButton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'disabled' | 'dangerouslySetInnerHTML'>;
interface ButtonCommon extends NativeButton, DataAttributes {
  identity: ManifestValidationIdentity;
  state: ManifestValidationState;
  label: string;
  scale: number;
  loadingFrame: number;
  disabled?: boolean;
  readOnly?: boolean;
  onAction?: ManifestValidationActionHandler;
}
export type ManifestValidationButtonProps = ButtonCommon & (
  { variant: 'copy'; issue: ManifestValidationIssueIdentity; width?: never }
  | { variant: 'delete-icon' | 'refresh-icon'; issue?: never; width?: never }
  | { variant: 'delete-text' | 'refresh-text'; issue?: never; width: number }
);
export interface ManifestPackSummaryLayout {
  /** Independently resolved layout/root height; never inferred as50+metadata. */
  summaryHeight: number;
  /** Host-resolved inner type:panel100%c+2 extent. */
  panelHeight: number;
  /** Host-resolved bottom metadata panel100%c+4 extent. */
  metadataHeight: number;
  metadataRowHeights: readonly [number, number, number];
  metadataLabelWidths: readonly [number, number, number];
  packSizeWidth: number;
}
export interface ManifestPackSummaryData {
  icon: ManifestValidationImage | null;
  text: { title: string; size: string; description: string; id: string; version: string; path: string };
  labels: { id: string; version: string; path: string; refresh: string; delete: string };
  visibility: { size: boolean; refresh: boolean; delete: boolean };
  layout: ManifestPackSummaryLayout;
}
export interface ManifestPackSummaryProps extends NativeDiv, DataAttributes {
  width: number;
  scale: number;
  identity: ManifestValidationIdentity;
  state: ManifestValidationState;
  data: ManifestPackSummaryData;
  lowMemoryDevice: boolean;
  loadingFrame: number;
  disabled?: boolean;
  readOnly?: boolean;
  onAction?: ManifestValidationActionHandler;
  refreshButtonProps?: NativeButton & DataAttributes;
  refreshButtonRef?: Ref<HTMLButtonElement>;
  deleteButtonProps?: NativeButton & DataAttributes;
  deleteButtonRef?: Ref<HTMLButtonElement>;
}
export interface ManifestValidationIssueLayout { issueHeight: number; headerHeight: number; bodyHeight: number }
export interface ManifestValidationIssueData { id: string; index: number; type: string; content: string; layout: ManifestValidationIssueLayout; payload?: unknown }
export interface ManifestValidationIssueProps extends NativeDiv, DataAttributes {
  width: number;
  scale: number;
  identity: ManifestValidationIdentity;
  state: ManifestValidationState;
  entry: ManifestValidationIssueData;
  /** Shared screen binding; never derived from an individual issue's text/type. */
  hasErrorsOrWarnings: boolean;
  issueLabel: string;
  copyLabel: string;
  lowMemoryDevice: boolean;
  loadingFrame: number;
  disabled?: boolean;
  readOnly?: boolean;
  onAction?: ManifestValidationActionHandler;
  copyButtonProps?: NativeButton & DataAttributes;
  copyButtonRef?: Ref<HTMLButtonElement>;
}
export interface ManifestValidationIssuesProps extends Omit<ManifestValidationIssueProps, 'entry' | 'copyButtonProps' | 'copyButtonRef'> {
  entries: readonly ManifestValidationIssueData[];
  /** Complete vertical factory snapshot: length and explicit indices must match. */
  capacity: number;
}
export interface ManifestValidationContentProps extends NativeDiv, DataAttributes {
  size: readonly [number, number];
  scale: number;
  inputMode: 'mouse' | 'touch';
  scrollLabel: string;
  identity: ManifestValidationIdentity;
  state: ManifestValidationState;
  summary: ManifestPackSummaryData;
  entries: readonly ManifestValidationIssueData[];
  capacity: number;
  hasErrorsOrWarnings: boolean;
  errorListLabel: string;
  /** Entire source100%c+3 header extent supplied by the host. */
  errorListHeaderHeight: number;
  issueLabel: string;
  copyLabel: string;
  lowMemoryDevice: boolean;
  loadingFrame: number;
  disabled?: boolean;
  readOnly?: boolean;
  onAction?: ManifestValidationActionHandler;
  viewportRef?: Ref<HTMLDivElement>;
  viewportProps?: HTMLAttributes<HTMLDivElement>;
  contentProps?: HTMLAttributes<HTMLDivElement>;
}

const join = (...values: (string | undefined | false)[]) => values.filter(Boolean).join(' ');
function text(value: unknown, name: string, nonblank = false): asserts value is string { if (typeof value !== 'string' || value.length > 1048576 || nonblank && !value.trim()) throw new TypeError(`${name} requires bounded${nonblank ? ' nonblank' : ''} text.`); }
function flag(value: unknown, name: string): asserts value is boolean { if (typeof value !== 'boolean') throw new TypeError(`${name} must be an explicit boolean.`); }
function extent(value: unknown, name: string, minimum = 0): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > 8192) throw new RangeError(`${name} must be a finite logical extent within${minimum}..8192.`); }
function common(width: number, scale: number, identity: ManifestValidationIdentity, state: ManifestValidationState, loadingFrame: number, disabled?: boolean, readOnly?: boolean) {
  extent(width, 'width', 1); if (!Number.isSafeInteger(scale) || scale < 1 || scale > 32 || width * scale > 8192) throw new RangeError('Manifest scale must be an integer1..32 within the finite display budget.');
  if (!identity || !state) throw new TypeError('Manifest identity and explicit state are required.'); text(identity.runKey, 'identity.runKey', true); text(identity.packId, 'identity.packId', true);
  for (const key of ['isWorking', 'isDeleting', 'isDoneValidating'] as const) flag(state[key], `state.${key}`);
  if (!Number.isSafeInteger(loadingFrame) || loadingFrame < 0 || loadingFrame > 9) throw new RangeError('loadingFrame must be an explicit0..9 source UV frame.');
  if (disabled !== undefined) flag(disabled, 'disabled'); if (readOnly !== undefined) flag(readOnly, 'readOnly');
}
function styleFor(scale: number, style?: CSSProperties): CSSProperties { return { '--mc-manifest-scale': scale, ...style } as CSSProperties; }

function issueIdentity(value: ManifestValidationIssueIdentity) {
  if (!value || value.collection !== 'pack_errors') throw new TypeError('Copy requires an explicit pack_errors issue identity.'); text(value.id, 'issue.id', true); if (!Number.isSafeInteger(value.index) || value.index < 0) throw new RangeError('issue.index must be a nonnegative source collection index.');
}
function imagePlan(value: ManifestValidationImage | null) {
  if (value === null) return; if (!value) throw new TypeError('Pack icon must be a whole host source image or explicit null.'); text(value.src, 'icon.src', true);
  if (!Array.isArray(value.sourceSize) || value.sourceSize.length !== 2 || ![value.sourceSize[0], value.sourceSize[1]].every(n => Number.isSafeInteger(n) && n > 0 && n <= 32768)) throw new TypeError('icon.sourceSize requires two positive physical pixel dimensions.');
}
function triple(value: readonly [number, number, number], name: string, minimum: number) { if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${name} requires three explicit logical extents.`); for (let i = 0; i < 3; i++) extent(value[i], `${name}[${i}]`, minimum); }
function sourceSkin(path: keyof typeof manifestValidationAssets, width: number, height: number, scale: number, className?: string) { return <ClassicSkin asset={manifestValidationAssets[path]} width={width} height={height} scale={scale} className={className} baseClass="mc-manifest-skin" />; }
function sourceImage(path: keyof typeof manifestValidationAssets, width: number, height: number, scale: number, className?: string, style?: CSSProperties) { const a = manifestValidationAssets[path]; return <Image src={a.url} sourceSize={[a.width, a.height]} alt="" size={[width, height]} scale={scale} className={className} style={style} />; }
function Divider({ width, scale }: { width: number; scale: number }) { return <div className="mc-manifest-divider" data-source-control="manifest_validation.section_divider" style={{ width: (width - 5) * scale, height: scale, backgroundImage: `url(${JSON.stringify(manifestValidationAssets['textures/ui/divider3'].url)})` }} />; }

/** Private pure preflight; callers can validate hidden complete snapshots without mounting. */
export function planManifestValidationButton(p: ManifestValidationButtonProps) {
  if (!['copy', 'delete-icon', 'delete-text', 'refresh-icon', 'refresh-text'].includes(p.variant)) throw new TypeError('Manifest button variant must name one of five source definitions.');
  const width = p.variant === 'copy' ? 25 : p.variant.endsWith('-icon') ? 30 : p.width!;
  common(width, p.scale, p.identity, p.state, p.loadingFrame, p.disabled, p.readOnly); text(p.label, 'label');
  if (p.variant === 'copy') issueIdentity(p.issue); else if (p.issue !== undefined) throw new TypeError('Only the source copy control has collection issue identity.');
  if (!p.variant.endsWith('-text') && p.width !== undefined) throw new TypeError('Icon/copy source button dimensions are fixed.');
  if (width < 8) throw new RangeError('Text button width must contain its six-unit source content inset.');
  const height = p.variant.endsWith('-text') ? 20 : p.variant === 'copy' ? 25 : 30;
  const action = p.variant === 'copy' ? 'copy' : p.variant.startsWith('delete') ? 'delete' : 'refresh';
  const target = action === 'copy' ? 'button.copy_to_clipboard' : action === 'delete' ? 'button.delete_manifest' : 'button.refresh_manifest';
  const sourceControl = `manifest_validation.${p.variant === 'copy' ? 'clipboard_button' : p.variant.endsWith('-icon') ? (p.variant.startsWith('delete') ? 'delete_button' : 'refresh_button') : p.variant.replace('-', '_') + '_button'}`;
  return { width, height, action, target, sourceControl, enabled: !p.state.isWorking && !p.disabled && !p.readOnly } as const;
}
/** Five declared source buttons; mutation, validation and clipboard services stay with the host. */
export const ManifestValidationButton = forwardRef<HTMLButtonElement, ManifestValidationButtonProps>(function ManifestValidationButton(p, ref) {
  const plan = planManifestValidationButton(p), { identity, state, label, scale, loadingFrame, disabled, readOnly, onAction, variant, issue, width: _width, className, style, onClick, onKeyDown, ...native } = p;
  const [, attach] = useClassicNodeRef(ref), latest = useRef(p); useClassicLayoutEffect(() => { latest.current = p; });
  const textButton = variant.endsWith('-text'), showLoader = variant === 'delete-icon' ? state.isDeleting : variant === 'refresh-icon' ? !state.isDoneValidating : false;
  return <button {...native} ref={attach} type="button" disabled={!plan.enabled} aria-label={native['aria-label'] ?? label} className={join('mc-manifest-validation-button', className)} data-manifest-variant={variant} data-source-control={plan.sourceControl} data-manifest-target={plan.target} data-is-working={state.isWorking} style={styleFor(scale, { ...style, width: plan.width * scale, height: plan.height * scale })}
    onKeyDown={event => { onKeyDown?.(event); if (!event.defaultPrevented && (event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}
    onClick={event => {
      onClick?.(event); if (!plan.enabled || event.defaultPrevented || event.nativeEvent.defaultPrevented) return;
      const owner = event.currentTarget, captured = { ...identity }, capturedIssue = issue ? { ...issue } : undefined, capturedVariant = variant;
      deferClassicRequest(event, owner, snapshot => latest.current.onAction?.(Object.freeze({ ...captured, action: plan.action, target: plan.target, sourceControl: plan.sourceControl, issue: capturedIssue, control: owner, event: snapshot })), () => {
        const now = latest.current;
        return !now.state.isWorking && !now.disabled && !now.readOnly && now.variant === capturedVariant && (['runKey', 'packId', 'payload'] as const).every(key => now.identity[key] === captured[key]) && (capturedIssue ? now.issue !== undefined && (['id', 'index', 'collection', 'payload'] as const).every(key => now.issue![key] === capturedIssue[key]) : now.issue === undefined) && !owner.closest('[hidden],[inert]');
      });
    }}>
    <span aria-hidden="true" className="mc-manifest-validation-button__skins">{sourceSkin('textures/ui/button_borderless_light', plan.width - 2, plan.height - 2, scale, 'mc-manifest-idle')}{sourceSkin('textures/ui/button_borderless_lighthover', plan.width - 2, plan.height - 2, scale, 'mc-manifest-hover')}{sourceSkin('textures/ui/button_borderless_lightpressed', plan.width - 2, plan.height - 2, scale, 'mc-manifest-pressed')}{sourceSkin('textures/ui/disabledButtonNoBorder', plan.width - 2, plan.height - 2, scale, 'mc-manifest-locked')}</span>
    <span aria-hidden="true" className="mc-manifest-validation-button__outline">{sourceSkin('textures/ui/focus_border_white', plan.width, plan.height, scale)}</span>
    <span className="mc-manifest-validation-button__content">{textButton ? <span className="mc-manifest-validation-button__label">{label}</span> : <span className={join('mc-manifest-validation-button__icon-wrapper', variant === 'copy' ? 'mc-manifest-validation-button__icon-wrapper--center' : 'mc-manifest-validation-button__icon-wrapper--top-left')} aria-hidden="true">
      {showLoader ? <span className="mc-manifest-validation-button__loading" data-frame={loadingFrame}>{sourceImage('textures/ui/loading_bar', 160, 8, scale, undefined, { left: -16 * loadingFrame * scale })}</span> : variant === 'copy' ? sourceImage('textures/ui/copy', 13, 14, scale) : variant === 'delete-icon' ? sourceImage('textures/ui/trash_default', 11, 12, scale) : sourceImage('textures/ui/refresh', 18, 14, scale)}
    </span>}</span>
  </button>;
});

export function planManifestPackSummary(p: ManifestPackSummaryProps) {
  common(p.width, p.scale, p.identity, p.state, p.loadingFrame, p.disabled, p.readOnly); flag(p.lowMemoryDevice, 'lowMemoryDevice');
  const d = p.data; if (!d || !d.text || !d.labels || !d.visibility || !d.layout) throw new TypeError('Complete summary source snapshot and resolved layout are required.'); imagePlan(d.icon);
  for (const key of ['title', 'size', 'description', 'id', 'version', 'path'] as const) text(d.text[key], `summary.text.${key}`);
  for (const key of ['id', 'version', 'path', 'refresh', 'delete'] as const) text(d.labels[key], `summary.labels.${key}`);
  for (const key of ['size', 'refresh', 'delete'] as const) flag(d.visibility[key], `summary.visibility.${key}`);
  for (const key of ['summaryHeight', 'panelHeight', 'metadataHeight'] as const) extent(d.layout[key], `summary.layout.${key}`, 1);
  triple(d.layout.metadataRowHeights, 'summary.layout.metadataRowHeights', 1); triple(d.layout.metadataLabelWidths, 'summary.layout.metadataLabelWidths', 0); extent(d.layout.packSizeWidth, 'summary.layout.packSizeWidth');
  const width = p.width - 4, metadataWidth = width - 8, infoWidth = width - 129;
  if (infoWidth <= 7 || d.layout.packSizeWidth > infoWidth - 7 || d.layout.metadataLabelWidths.some(n => n + 2 > metadataWidth)) throw new RangeError('Summary width must contain its source icon/header controls and declared label budgets.');
  if (Math.max(d.layout.summaryHeight, d.layout.panelHeight, d.layout.metadataHeight) * p.scale > 8192) throw new RangeError('Summary exceeds the finite physical paint extent.');
  return { width, metadataWidth, infoWidth, height: d.layout.summaryHeight, panelHeight: d.layout.panelHeight, metadataY: d.layout.panelHeight - d.layout.metadataHeight };
}
/** One pack summary. Its named stack_panel is a panel, so header and metadata are not summed. */
export const ManifestPackSummary = forwardRef<HTMLDivElement, ManifestPackSummaryProps>(function ManifestPackSummary(p, ref) {
  const plan = planManifestPackSummary(p), { width, scale, identity, state, data, lowMemoryDevice, loadingFrame, disabled, readOnly, onAction, refreshButtonProps, refreshButtonRef, deleteButtonProps, deleteButtonRef, className, style, ...native } = p;
  const [, attach] = useClassicNodeRef(ref);
  return <div {...native} ref={attach} className={join('mc-manifest-pack-summary', className)} data-source-control="manifest_validation.pack_secondary_info" data-intrinsic-policy="host-summary-panel-metadata-budgets" data-low-memory-device={lowMemoryDevice} style={styleFor(scale, { ...style, width: width * scale, height: plan.height * scale })}>
    <div className="mc-manifest-pack-summary__layout" style={{ width: plan.width * scale, height: plan.height * scale }}><span aria-hidden="true" className="mc-manifest-skin-layer">{sourceSkin('textures/ui/BannersLight', plan.width, plan.height, scale)}</span>
      <div className="mc-manifest-pack-summary__panel" data-source-type="panel" style={{ height: plan.panelHeight * scale }}>
        <div className="mc-manifest-pack-summary__header">
          <div className="mc-manifest-pack-summary__icon-background">{sourceSkin('textures/ui/Black', 46, 50, scale)}{data.icon && <Image src={data.icon.src} sourceSize={data.icon.sourceSize} alt={data.icon.alt ?? ''} size={[44, 44]} scale={scale} className="mc-manifest-pack-summary__icon" />}</div>
          <div className="mc-manifest-pack-summary__info" style={{ width: plan.infoWidth * scale }}><div className="mc-manifest-pack-summary__title-row"><span className="mc-manifest-pack-summary__title">{data.text.title}</span><span className="mc-manifest-pack-summary__title-gap" /><span hidden={!data.visibility.size} className="mc-manifest-pack-summary__size" style={{ width: data.layout.packSizeWidth * scale }}>{data.text.size}</span></div><div className="mc-manifest-pack-summary__description-row"><span>{data.text.description}</span><span className="mc-manifest-pack-summary__title-gap" /></div></div>
          <div className="mc-manifest-pack-summary__actions"><div className="mc-manifest-pack-summary__pad-four" /><div hidden={!data.visibility.refresh} data-source-once-binding="#refresh_visible"><ManifestValidationButton {...refreshButtonProps} ref={refreshButtonRef} variant="refresh-text" width={80} label={data.labels.refresh} identity={identity} state={state} scale={scale} loadingFrame={loadingFrame} disabled={disabled} readOnly={readOnly} onAction={onAction} /></div><div className="mc-manifest-pack-summary__pad-five" /><div hidden={!data.visibility.delete} data-source-once-binding="#delete_visible"><ManifestValidationButton {...deleteButtonProps} ref={deleteButtonRef} variant="delete-text" width={80} label={data.labels.delete} identity={identity} state={state} scale={scale} loadingFrame={loadingFrame} disabled={disabled} readOnly={readOnly} onAction={onAction} /></div></div><span className="mc-manifest-pack-summary__right-pad" />
        </div>
        <div className="mc-manifest-pack-summary__metadata" style={{ width: plan.metadataWidth * scale, height: data.layout.metadataHeight * scale, top: plan.metadataY * scale }}>
          {(['id', 'version', 'path'] as const).map((key, index) => <div key={key} className="mc-manifest-pack-summary__metadata-group"><Divider width={plan.metadataWidth} scale={scale} /><div className="mc-manifest-pack-summary__metadata-row" data-manifest-field={key} style={{ height: data.layout.metadataRowHeights[index]! * scale }}><span className="mc-manifest-ten" style={{ width: data.layout.metadataLabelWidths[index]! * scale }}>{data.labels[key]}</span><span className="mc-manifest-pack-summary__field-gap" /><span className="mc-manifest-pack-summary__field-value">{data.text[key]}</span></div>{index < 2 && <div className="mc-manifest-pack-summary__pad-two" />}</div>)}
        </div>
      </div>
    </div>
  </div>;
});

export function planManifestValidationIssue(p: ManifestValidationIssueProps) {
  common(p.width, p.scale, p.identity, p.state, p.loadingFrame, p.disabled, p.readOnly); flag(p.hasErrorsOrWarnings, 'hasErrorsOrWarnings'); flag(p.lowMemoryDevice, 'lowMemoryDevice'); text(p.issueLabel, 'issueLabel'); text(p.copyLabel, 'copyLabel');
  const e = p.entry; if (!e || !e.layout) throw new TypeError('Issue entry and explicit resolved header/body/outer heights are required.'); issueIdentity({ ...e, collection: 'pack_errors' }); text(e.type, 'entry.type'); text(e.content, 'entry.content');
  for (const key of ['issueHeight', 'headerHeight', 'bodyHeight'] as const) extent(e.layout[key], `entry.layout.${key}`, 1);
  const width = p.width - 8, panelHeight = e.layout.headerHeight + (p.hasErrorsOrWarnings ? 1 + e.layout.bodyHeight : 0) + 8;
  if (width < 42 || Math.max(e.layout.issueHeight, panelHeight) * p.scale > 8192) throw new RangeError('Issue declared bounds must contain its source prefix/value geometry within the finite paint budget.');
  return { width, height: e.layout.issueHeight, panelHeight, panelY: (e.layout.issueHeight - panelHeight) / 2, copyX: width - 27, copyY: (e.layout.headerHeight - 25) / 2 + 2, valueWidth: width - 40 };
}
/** One pack_errors factory item; its body visibility is the shared screen binding. */
export const ManifestValidationIssue = forwardRef<HTMLDivElement, ManifestValidationIssueProps>(function ManifestValidationIssue(p, ref) {
  const plan = planManifestValidationIssue(p), { width, scale, identity, state, entry, hasErrorsOrWarnings, issueLabel, copyLabel, lowMemoryDevice, loadingFrame, disabled, readOnly, onAction, copyButtonProps, copyButtonRef, className, style, ...native } = p;
  const [, attach] = useClassicNodeRef(ref);
  return <div {...native} ref={attach} className={join('mc-manifest-validation-issue', className)} data-source-control="manifest_validation.error_pack_content_layout" data-issue-id={entry.id} data-collection="pack_errors" data-collection-index={entry.index} data-low-memory-device={lowMemoryDevice} data-intrinsic-policy="host-issue-header-body-budgets-center-web" style={styleFor(scale, { ...style, width: width * scale, height: plan.height * scale })}>
    <span aria-hidden="true" className="mc-manifest-skin-layer">{sourceSkin('textures/ui/BannersLight', width, plan.height, scale)}</span>
    <div className="mc-manifest-validation-issue__panel" style={{ width: plan.width * scale, height: plan.panelHeight * scale, top: plan.panelY * scale }}>
      <div className="mc-manifest-validation-issue__header" style={{ height: entry.layout.headerHeight * scale }}><span className="mc-manifest-validation-issue__type">{entry.type}</span><div className="mc-manifest-validation-issue__copy" hidden={!hasErrorsOrWarnings} style={{ left: plan.copyX * scale, top: plan.copyY * scale }}><ManifestValidationButton {...copyButtonProps} ref={copyButtonRef} variant="copy" issue={{ id: entry.id, index: entry.index, collection: 'pack_errors', payload: entry.payload }} identity={identity} state={state} label={copyLabel} scale={scale} loadingFrame={loadingFrame} disabled={disabled} readOnly={readOnly} onAction={onAction} /></div></div>
      <div hidden={!hasErrorsOrWarnings}><Divider width={plan.width} scale={scale} /><div className="mc-manifest-validation-issue__body" style={{ height: entry.layout.bodyHeight * scale }}><span className="mc-manifest-validation-issue__prefix mc-manifest-ten">{issueLabel}</span><span className="mc-manifest-validation-issue__gap" /><span className="mc-manifest-validation-issue__value-container"><span className="mc-manifest-validation-issue__value">{entry.content}</span></span></div></div>
    </div>
  </div>;
});

export function planManifestValidationIssues(p: ManifestValidationIssuesProps) {
  common(p.width, p.scale, p.identity, p.state, p.loadingFrame, p.disabled, p.readOnly);
  flag(p.hasErrorsOrWarnings, 'hasErrorsOrWarnings'); flag(p.lowMemoryDevice, 'lowMemoryDevice'); text(p.issueLabel, 'issueLabel'); text(p.copyLabel, 'copyLabel');
  if (!Number.isSafeInteger(p.capacity) || p.capacity < 0 || p.capacity > 1024 || !Array.isArray(p.entries) || p.entries.length !== p.capacity) throw new RangeError('pack_errors requires a complete bounded vertical snapshot matching explicit capacity.');
  const ids = new Set<string>(); let height = 0;
  for (let i = 0; i < p.capacity; i++) { const entry = p.entries[i]; if (!entry || entry.index !== i || ids.has(entry.id)) throw new TypeError('pack_errors entries require unique IDs and explicit complete ordered collection indices.'); ids.add(entry.id); height += planManifestValidationIssue({ ...p, entry }).height; }
  if (height * p.scale > 65536) throw new RangeError('Complete issues snapshot exceeds the finite scroll content height budget.');
  return { width: p.width, height, capacity: p.capacity };
}
export const ManifestValidationIssues = forwardRef<HTMLDivElement, ManifestValidationIssuesProps>(function ManifestValidationIssues(p, ref) {
  const plan = planManifestValidationIssues(p), { entries, capacity, width, scale, identity, state, hasErrorsOrWarnings, issueLabel, copyLabel, lowMemoryDevice, loadingFrame, disabled, readOnly, onAction, className, style, ...native } = p, [, attach] = useClassicNodeRef(ref);
  return <div {...native} ref={attach} className={join('mc-manifest-validation-issues', className)} data-source-control="manifest_validation.error_content_grid" data-source-factory="pack_error_factory" data-collection="pack_errors" data-source-capacity={capacity} style={styleFor(scale, { ...style, width: plan.width * scale, height: plan.height * scale })}>{entries.map(entry => <ManifestValidationIssue key={entry.id} entry={entry} width={width} scale={scale} identity={identity} state={state} hasErrorsOrWarnings={hasErrorsOrWarnings} issueLabel={issueLabel} copyLabel={copyLabel} lowMemoryDevice={lowMemoryDevice} loadingFrame={loadingFrame} disabled={disabled} readOnly={readOnly} onAction={onAction} />)}</div>;
});

export function planManifestValidationContent(p: ManifestValidationContentProps) {
  if (!Array.isArray(p.size) || p.size.length !== 2) throw new TypeError('Content size requires two explicit logical axes.'); common(p.size[0], p.scale, p.identity, p.state, p.loadingFrame, p.disabled, p.readOnly); extent(p.size[1], 'size height', 1); if (p.size[1] * p.scale > 8192 || p.size[0] * p.size[1] * p.scale * p.scale > 16777216) throw new RangeError('Content viewport exceeds the finite Web budget.');
  if (p.inputMode !== 'mouse' && p.inputMode !== 'touch') throw new TypeError('Content inputMode must explicitly select mouse or touch.'); text(p.scrollLabel, 'scrollLabel'); text(p.errorListLabel, 'errorListLabel'); extent(p.errorListHeaderHeight, 'errorListHeaderHeight', 1);
  const outerWidth = p.size[0] - 4, paneWidth = outerWidth - 1, viewportWidth = paneWidth - (p.inputMode === 'mouse' ? 9 : 0), stackWidth = viewportWidth - 4;
  const summary = planManifestPackSummary({ ...p, width: stackWidth, data: p.summary });
  const issues = planManifestValidationIssues({ ...p, width: stackWidth });
  return { outer: { x: 2, y: 0, width: outerWidth, height: p.size[1] }, paneWidth, viewportWidth, stackWidth, summary, issues, contentHeight: 10 + summary.height + p.errorListHeaderHeight + issues.height + 4 };
}
/** Source scroll/content subtree only. Its screen/frame/modal route is a separate component. */
export const ManifestValidationContent = forwardRef<HTMLDivElement, ManifestValidationContentProps>(function ManifestValidationContent(p, ref) {
  const plan = planManifestValidationContent(p), { size, scale, inputMode, scrollLabel, identity, state, summary, entries, capacity, hasErrorsOrWarnings, errorListLabel, errorListHeaderHeight, issueLabel, copyLabel, lowMemoryDevice, loadingFrame, disabled, readOnly, onAction, viewportRef, viewportProps, contentProps, className, style, ...native } = p;
  const [, attach] = useClassicNodeRef(ref), [, attachViewport] = useClassicNodeRef(viewportRef);
  return <div {...native} ref={attach} className={join('mc-manifest-validation-content', className)} data-source-control="manifest_validation.manifest_validation_scroll_content" data-input-mode={inputMode} data-low-memory-device={lowMemoryDevice} style={styleFor(scale, { '--mc-skin-scroll-track': `url(${JSON.stringify(manifestValidationAssets['textures/ui/ScrollRail'].url)})`, '--mc-skin-scroll-thumb': `url(${JSON.stringify(manifestValidationAssets['textures/ui/ScrollHandle'].url)})`, ...style, width: size[0] * scale, height: size[1] * scale } as CSSProperties)}>
    <div className="mc-manifest-validation-content__outer" style={{ left: plan.outer.x * scale, top: 0, width: plan.outer.width * scale, height: plan.outer.height * scale }}><ScrollArea variant={inputMode === 'mouse' ? 'document' : 'touch'} scale={scale} label={scrollLabel} scrollbarVisibility="always" thumbVisible={inputMode === 'mouse'} viewportRef={attachViewport} viewportProps={viewportProps} contentProps={contentProps} style={{ width: plan.paneWidth * scale, height: plan.outer.height * scale }}><div className="mc-manifest-validation-content__stack" style={{ width: plan.stackWidth * scale }}><div className="mc-manifest-validation-content__top-pad" /><ManifestPackSummary width={plan.stackWidth} scale={scale} identity={identity} state={state} data={summary} lowMemoryDevice={lowMemoryDevice} loadingFrame={loadingFrame} disabled={disabled} readOnly={readOnly} onAction={onAction} /><div className="mc-manifest-validation-content__error-list-header" style={{ height: errorListHeaderHeight * scale }}><span className="mc-manifest-ten">{errorListLabel}</span></div><ManifestValidationIssues width={plan.stackWidth} scale={scale} identity={identity} state={state} entries={entries} capacity={capacity} hasErrorsOrWarnings={hasErrorsOrWarnings} issueLabel={issueLabel} copyLabel={copyLabel} lowMemoryDevice={lowMemoryDevice} loadingFrame={loadingFrame} disabled={disabled} readOnly={readOnly} onAction={onAction} /><div className="mc-manifest-validation-content__bottom-pad" /></div></ScrollArea></div>
  </div>;
});
