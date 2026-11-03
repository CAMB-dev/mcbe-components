import {forwardRef, useRef} from 'react';
import type {ButtonHTMLAttributes, ChangeEvent, CSSProperties, HTMLAttributes, MouseEvent} from 'react';
import {ClassicSkin} from './classic-skin';
import type {ClassicSkinAsset} from './classic-skin';
import {Image} from './image';
import {resourcePackAssets} from './resource-pack-assets';
import {ResourcePackItem, validateResourcePackItemProps} from './resource-pack-items';
import type {ResourcePackActionDetail, ResourcePackImage, ResourcePackItemProps, ResourcePackKind, ResourcePackTargets} from './resource-pack-items';
import {deferClassicRequest, useClassicLayoutEffect, useClassicNodeRef} from './classic-screen-lifecycle';
import {ResourcePackHeaderToggle} from './resource-pack-header-images';
import type {ResourcePackHeaderImageProfile} from './resource-pack-header-images';
export type {ResourcePackHeaderImageProfile} from './resource-pack-header-images';
import {ResourcePackHeaderCount} from './resource-pack-header-text';
import type {ResourcePackHeaderTextProfile} from './resource-pack-header-text';
export type {ResourcePackHeaderTextProfile} from './resource-pack-header-text';

export type ResourcePackProfile = 'global' | 'level' | 'addon';
export type ResourcePackSectionKind = Exclude<ResourcePackKind, 'invalid'>;
/** A complete materialized source record. The Manager owns source identity,
 * aliases and geometry; all row status/layout values remain explicit input. */
export interface ResourcePackManagerRecord extends Omit<ResourcePackItemProps, 'kind' | 'identity' | 'width' | 'scale' | 'targets' | 'disabled' | 'readOnly' | 'onAction'> {
  readonly id: string; readonly index: number; readonly payload?: unknown;
}
/** capacity is the explicit #collection_length, not a two-dimensional grid.
 * Every slot needs its complete record: missing natural heights are not guessed. */
export interface ResourcePackCollectionData {readonly capacity: number; readonly count: string; readonly items: readonly ResourcePackManagerRecord[]}
export interface ResourcePackDefaultItem {
  readonly icon: ResourcePackImage | null; readonly title: string; readonly description: string;
  readonly bottomDescription: string;
  /** Host-resolved smooth label height before the source's extra3 units. */
  readonly fillerTextHeight: number;
}
export interface ResourcePackHeaderDiagnostics {readonly visible: boolean; readonly anyErrors: boolean; readonly anyWarnings: boolean; readonly label: string}
export type ResourcePackContentRequest = {
  readonly action: 'expand-selected' | 'expand-available' | 'expand-realms' | 'expand-unowned' | 'more-offers' | 'ignore' | 'addon-link';
  readonly origin: 'manager'; readonly profile: ResourcePackProfile; readonly collection?: string;
  readonly target: string; readonly sourceControl: string;
  readonly control: HTMLButtonElement; readonly event: MouseEvent<HTMLButtonElement>;
};
export type ResourcePackAgreementRequest = {
  readonly action: 'agreement-change'; readonly origin: 'checkbox'; readonly profile: ResourcePackProfile;
  readonly target: '#force_user_agreement_level'; readonly checked: boolean;
  readonly control: HTMLInputElement; readonly event: ChangeEvent<HTMLInputElement>;
};
export type ResourcePackManagerActionDetail = ResourcePackActionDetail | ResourcePackContentRequest | ResourcePackAgreementRequest;
export type ResourcePackManagerActionHandler = (detail: ResourcePackManagerActionDetail) => void | false;
type DataAttributes = {[key: `data-${string}`]: string | number | boolean | undefined};
type NativeDiv = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'onChange'> & DataAttributes & {readonly children?: never; readonly dangerouslySetInnerHTML?: never};
interface SectionBase extends NativeDiv {
  readonly profile: ResourcePackProfile; readonly width: number; readonly scale: number;
  readonly title: string; readonly titleVisible: boolean; readonly expanded: boolean;
  readonly collection: ResourcePackCollectionData;
  /** Optional whole-frame source sampling for the toggle image only. */
  readonly headerImageProfile?: ResourcePackHeaderImageProfile;
  /** Optional original TrueType count, with explicit source paint coordinates. */
  readonly headerTextProfile?: ResourcePackHeaderTextProfile;
  readonly disabled?: boolean; readonly readOnly?: boolean; readonly onAction?: ResourcePackManagerActionHandler;
}
export type ResourcePackSectionProps = SectionBase & (
  {readonly kind: 'selected'; readonly defaultItem: ResourcePackDefaultItem; readonly diagnostics: ResourcePackHeaderDiagnostics}
  | {readonly kind: 'available'; readonly noPacks: boolean; readonly educationEdition: boolean; readonly unownedVisible: boolean;
    readonly noPacksText: string; readonly toStoreLabel: string; readonly invalidCollection: ResourcePackCollectionData; readonly diagnostics: ResourcePackHeaderDiagnostics}
  | {readonly kind: 'realms'; readonly noPacks: boolean}
  | {readonly kind: 'unowned'; readonly noPacks: boolean; readonly viewMoreLabel: string}
);
export interface ResourcePackManagerProvider {readonly educationEdition: boolean; readonly isWorldCreate: boolean; readonly isTemplateCreate: boolean; readonly isWorldEdit: boolean}
export interface ResourcePackManagerBindings {
  readonly worldTemplateLocked: boolean;
  readonly forcePackDownloadEnabled: boolean; readonly forcePackDownloadLocked: boolean;
  readonly forceUserAgreement: boolean; readonly forceUserAgreementEnabled: boolean;
  readonly addonStackingWarningVisible: boolean;
  readonly selectedGridVisible: boolean; readonly availableGridVisible: boolean;
  readonly realmsVisible: boolean; readonly realmsGridVisible: boolean;
  readonly unownedVisible: boolean; readonly unownedGridVisible: boolean;
  readonly noAvailablePacks: boolean; readonly noRealmsPacks: boolean; readonly noUnownedPacks: boolean;
  readonly selectedAnyExceptions: boolean; readonly selectedAnyErrors: boolean; readonly selectedAnyWarnings: boolean;
  readonly invalidHasErrors: boolean; readonly availableAnyErrors: boolean; readonly availableAnyWarnings: boolean;
}
export interface ResourcePackManagerLabels {
  readonly selected: string; readonly available: string; readonly realms: string; readonly unowned: string;
  readonly templateWarning: string; readonly forceDownload: string; readonly addonWarning: string; readonly addonLink: string;
  readonly noPacks: string; readonly toStore: string; readonly viewMore: string;
  readonly selectedDiagnostics: string; readonly availableDiagnostics: string;
}
export interface ResourcePackManagerLayout {
  /** Required only when the template warning is actually visible. */
  readonly templateWarningHeight?: number;
  /** Visible addon warning's native100%c widths/heights are not recovered. */
  readonly addonTextWidth?: number; readonly addonLinkSize?: readonly [number, number];
}
/** Settings content for the fixed global/level/addon aliases. No invented
 * fullscreen chrome, scroll owner, pack file operation or marketplace renderer. */
export interface ResourcePackManagerProps extends NativeDiv {
  readonly profile: ResourcePackProfile; readonly width: number; readonly scale: number;
  readonly provider: ResourcePackManagerProvider; readonly bindings: ResourcePackManagerBindings; readonly labels: ResourcePackManagerLabels;
  readonly collections: Readonly<Record<ResourcePackKind, ResourcePackCollectionData>>;
  readonly defaultItem: ResourcePackDefaultItem; readonly layout: ResourcePackManagerLayout;
  /** Each host-resolved toggle origin is independent of source section height. */
  readonly headerImageProfiles?: Readonly<Partial<Record<ResourcePackSectionKind, ResourcePackHeaderImageProfile>>>;
  readonly headerTextProfiles?: Readonly<Partial<Record<ResourcePackSectionKind, ResourcePackHeaderTextProfile>>>;
  readonly disabled?: boolean; readonly readOnly?: boolean; readonly onAction?: ResourcePackManagerActionHandler;
}

// Exact fixed source aliases; captions such as $button.add are localization keys.
const profiles = {
  "global": {
    "collections": {
      "selected": "#selected_pack_items_global",
      "available": "#available_pack_items_global",
      "realms": "#realms_pack_items_global",
      "unowned": "#unowned_pack_items_global",
      "invalid": "#invalid_pack_items_global"
    },
    "select": {
      "selected": "button.selected_pack_global",
      "available": "button.available_pack_global",
      "realms": "button.realms_pack_global",
      "unowned": "button.unowned_pack_global",
      "invalid": "button.invalid_pack_global"
    },
    "expand": {
      "selected": "button.expand_selected_global",
      "available": "button.expand_available_global",
      "realms": "button.expand_realms_global",
      "unowned": "button.expand_unowned_global"
    },
    "row": {
      "readToggle": "button.read_toggle_global",
      "moveLeft": "button.move_left_global",
      "store": "button.store_global",
      "sortUp": "button.sort_up_global",
      "sortDown": "button.sort_down_global",
      "reportErrors": "button.report_errors_global",
      "packSettings": "button.pack_settings_global",
      "deselect": "button.deselected_pack_global"
    },
    "moreOffers": "button.more_suggested_content_offers_global",
    "showCheckbox": false,
    "topLabelBox": false,
    "suggestedOffersDeclared": true
  },
  "level": {
    "collections": {
      "selected": "#selected_pack_items_level",
      "available": "#available_pack_items_level",
      "realms": "#realms_pack_items_level",
      "unowned": "#unowned_pack_items_level",
      "invalid": "#invalid_pack_items_level"
    },
    "select": {
      "selected": "button.selected_pack_level",
      "available": "button.available_pack_level",
      "realms": "button.realms_pack_level",
      "unowned": "button.unowned_pack_level",
      "invalid": "button.invalid_pack_level"
    },
    "expand": {
      "selected": "button.expand_selected_level",
      "available": "button.expand_available_level",
      "realms": "button.expand_realms_level",
      "unowned": "button.expand_unowned_level"
    },
    "row": {
      "readToggle": "button.read_toggle_level",
      "moveLeft": "button.move_left_level",
      "store": "button.store_level",
      "sortUp": "button.sort_up_level",
      "sortDown": "button.sort_down_level",
      "reportErrors": "button.report_errors_level",
      "packSettings": "button.pack_settings_level",
      "deselect": "button.deselected_pack_level"
    },
    "moreOffers": "button.more_suggested_content_offers_level",
    "showCheckbox": true,
    "topLabelBox": true,
    "suggestedOffersDeclared": true
  },
  "addon": {
    "collections": {
      "selected": "#selected_pack_items_addon",
      "available": "#available_pack_items_addon",
      "realms": "#realms_pack_items_addon",
      "unowned": "#unowned_pack_items_addon",
      "invalid": "#invalid_pack_items_addon"
    },
    "select": {
      "selected": "button.selected_pack_addon",
      "available": "button.available_pack_addon",
      "realms": "button.realms_pack_addon",
      "unowned": "button.unowned_pack_addon",
      "invalid": "button.invalid_pack_addon"
    },
    "expand": {
      "selected": "button.expand_selected_addon",
      "available": "button.expand_available_addon",
      "realms": "button.expand_realms_addon",
      "unowned": "button.expand_unowned_addon"
    },
    "row": {
      "readToggle": "button.read_toggle_addon",
      "moveLeft": "button.move_left_addon",
      "store": "button.store_addon",
      "sortUp": "button.sort_up_addon",
      "sortDown": "button.sort_down_addon",
      "reportErrors": "button.report_errors_addon",
      "packSettings": "button.pack_settings_addon",
      "deselect": "button.deselected_pack_addon"
    },
    "moreOffers": "button.more_suggested_content_offers_addon",
    "showCheckbox": false,
    "topLabelBox": true,
    "suggestedOffersDeclared": false
  }
} as const;

const cx = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(' ');
function literal(value: unknown, name: string) {if (typeof value !== 'string' || value.length > 1048576) throw new TypeError('Resource-pack ' + name + ' must be bounded literal text.');}
function bool(value: unknown, name: string) {if (typeof value !== 'boolean') throw new TypeError('Resource-pack ' + name + ' must be an explicit boolean.');}
function extent(value: unknown, name: string, zero = false): asserts value is number {if (typeof value !== 'number' || !Number.isFinite(value) || value < (zero ? 0 : Number.MIN_VALUE) || value > 8192) throw new RangeError('Resource-pack ' + name + ' must be a finite bounded logical extent.');}
function geometry(profile: ResourcePackProfile, width: number, scale: number) {
  if (!Object.hasOwn(profiles, profile)) throw new TypeError('Resource-pack profile must be global, level or addon.');
  extent(width, 'width'); if (width < 100 || !Number.isSafeInteger(scale) || scale < 1 || scale > 32 || width * scale > 8192) throw new RangeError('Resource-pack content requires width>=100 and integer scale1..32 within the Web extent budget.');
}
function asset(name: string): ClassicSkinAsset {const value = (resourcePackAssets as Readonly<Record<string, ClassicSkinAsset>>)[name]; if (!value) throw new TypeError('Missing complete source material: ' + name); return value;}
function style(scale: number, given?: CSSProperties): CSSProperties {return {...given, '--mc-rp-scale': scale} as CSSProperties;}
function picture(image: ResourcePackImage | null) {
  if (image === null) return;
  if (!image || typeof image.src !== 'string' || !image.src.trim() || image.src.length > 8192 || /[\u0000-\u001f\u007f]/.test(image.src) || !Array.isArray(image.sourceSize) || image.sourceSize.length !== 2 || !image.sourceSize.every(n => Number.isSafeInteger(n) && n > 0 && n <= 32768)) throw new TypeError('Resource-pack icon requires a complete host URL/sourceSize or explicit null.');
}
function itemProps(profile: ResourcePackProfile, kind: ResourcePackKind, value: ResourcePackManagerRecord, width: number, scale: number, disabled?: boolean, readOnly?: boolean, onAction?: ResourcePackManagerActionHandler): ResourcePackItemProps {
  const source = profiles[profile], targets: ResourcePackTargets = {...source.row, select: source.select[kind]};
  const {id, index, payload, ...row} = value;
  return {...row, kind, identity: {profile, collection: source.collections[kind], id, index, ...payload === undefined ? {} : {payload}}, width, scale, targets, disabled, readOnly, onAction};
}
function collection(value: ResourcePackCollectionData, profile: ResourcePackProfile, kind: ResourcePackKind, width: number, scale: number) {
  if (!value || !Array.isArray(value.items) || !Number.isSafeInteger(value.capacity) || value.capacity < 0 || value.capacity > 1000 || value.items.length !== value.capacity) throw new RangeError('Resource-pack factory needs a complete explicit0..1000 capacity snapshot, with one record for every slot.');
  literal(value.count, 'provider count'); const ids = new Set<string>();
  value.items.forEach((record, index) => {
    if (!record || typeof record.id !== 'string' || !record.id.trim() || record.id.length > 8192 || ids.has(record.id) || record.index !== index) throw new TypeError('Resource-pack factory records require unique IDs and contiguous explicit source indices.');
    ids.add(record.id); validateResourcePackItemProps(itemProps(profile, kind, record, width, scale));
  });
}
function defaultItem(value: ResourcePackDefaultItem, scale: number) {
  if (!value) throw new TypeError('Selected pack section requires its separate source default item.');
  picture(value.icon); for (const key of ['title', 'description', 'bottomDescription'] as const) literal(value[key], 'default ' + key);
  extent(value.fillerTextHeight, 'default filler text height', true); extent((value.fillerTextHeight + 3) * scale, 'physical default filler');
}
function summary(value: ResourcePackHeaderDiagnostics) {if (!value) throw new TypeError('Resource-pack header diagnostic snapshot is required.'); for (const key of ['visible', 'anyErrors', 'anyWarnings'] as const) bool(value[key], key); literal(value.label, 'diagnostic label');}
function sectionPlan(p: ResourcePackSectionProps) {
  const unsafe = p as unknown as Record<string, unknown>; if (unsafe.children !== undefined || unsafe.dangerouslySetInnerHTML !== undefined) throw new TypeError('Resource-pack sections own their source children.');
  geometry(p.profile, p.width, p.scale); literal(p.title, 'section title'); bool(p.titleVisible, 'titleVisible'); bool(p.expanded, 'expanded');
  if (p.disabled !== undefined) bool(p.disabled, 'disabled'); if (p.readOnly !== undefined) bool(p.readOnly, 'readOnly');
  if (p.onAction !== undefined && typeof p.onAction !== 'function') throw new TypeError('Resource-pack request handler must be callable.');
  if (!['selected', 'available', 'realms', 'unowned'].includes(p.kind)) throw new TypeError('Resource-pack section must be selected, available, realms or unowned.');
  collection(p.collection, p.profile, p.kind, p.width, p.scale);
  if (p.kind === 'selected') {defaultItem(p.defaultItem, p.scale); summary(p.diagnostics);}
  else {bool(p.noPacks, 'noPacks'); if (p.kind === 'available') {bool(p.educationEdition, 'educationEdition'); bool(p.unownedVisible, 'unownedVisible'); literal(p.noPacksText, 'empty text'); literal(p.toStoreLabel, 'store label'); summary(p.diagnostics); collection(p.invalidCollection, p.profile, 'invalid', p.width, p.scale);} else if (p.kind === 'unowned') literal(p.viewMoreLabel, 'view-more label');}
}

type RequestData = Pick<ResourcePackContentRequest, 'action' | 'target' | 'profile' | 'sourceControl' | 'collection'>;
interface SourceButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'onClick'> {
  width: number; height: number; scale: number; children?: import('react').ReactNode;
  request: RequestData; onAction?: ResourcePackManagerActionHandler; readOnly?: boolean; indicator?: boolean; underline?: boolean;
}
function SourceButton({width, height, scale, children, request, onAction, readOnly, disabled, indicator = false, underline = false, className, style: givenStyle, ...native}: SourceButtonProps) {
  const [owner, attach] = useClassicNodeRef<HTMLButtonElement>(), latest = useRef({request, onAction, readOnly, disabled});
  useClassicLayoutEffect(() => {latest.current = {request, onAction, readOnly, disabled};});
  return <button {...native} ref={attach} type="button" disabled={disabled || readOnly} className={cx('mc-resource-packs-button', indicator && 'mc-resource-packs-button--indicator', underline && 'mc-resource-packs-button--underline', className)} data-source-target={request.target} data-source-control={request.sourceControl}
    style={{...givenStyle, width: width * scale, height: height * scale}}
    onKeyDown={event => {native.onKeyDown?.(event); if (!event.defaultPrevented && (event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter', ' '].includes(event.key)) event.preventDefault();}}
    onClick={event => {
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || disabled || readOnly) return;
      const control = event.currentTarget, identity = request;
      deferClassicRequest(event, control, snapshot => latest.current.onAction?.({...identity, origin: 'manager', control, event: snapshot}), () => {
        const now = latest.current; return owner.current === control && !now.disabled && !now.readOnly && !control.disabled && !control.closest('[hidden],[inert]') && Object.entries(identity).every(([key, value]) => now.request[key as keyof RequestData] === value);
      });
    }}>
    {!underline && (['default', 'hover', 'pressed', 'locked'] as const).map(state => <span key={state} className={'mc-resource-packs-button__state mc-resource-packs-button__state--' + state} aria-hidden="true">
      <span className="mc-resource-packs-button__face"><ClassicSkin asset={asset(state === 'default' ? 'textures/ui/button_borderless_light' : state === 'hover' ? 'textures/ui/button_borderless_lighthover' : state === 'pressed' ? 'textures/ui/button_borderless_lightpressed' : 'textures/ui/disabledButtonNoBorder')} width={width - 2} height={height - 2} scale={scale} baseClass="mc-resource-packs-skin"/></span>
      <span className="mc-resource-packs-button__border"><ClassicSkin asset={asset('textures/ui/focus_border_white')} width={width} height={height} scale={scale} baseClass="mc-resource-packs-skin"/></span>
    </span>)}
    <span className="mc-resource-packs-button__content">{children}</span>
    {underline && <span className="mc-resource-packs-button__underline" aria-hidden="true" style={{'--mc-resource-underline': `url(${JSON.stringify(asset('textures/ui/underline').url)})`, '--mc-resource-underline-focus': `url(${JSON.stringify(asset('textures/ui/underline_focus').url)})`} as CSSProperties}/>}
  </button>;
}
function Glyph({name, width, height, scale, contain}: {name: string; width: number; height: number; scale: number; contain?: boolean}) {const image = asset(name); return <Image src={image.url} sourceSize={[image.width, image.height]} size={[width, height]} scale={scale} alt="" style={contain ? {objectFit: 'contain'} : undefined}/>;}
function Spacer({height, scale, name}: {height: number; scale: number; name: string}) {return <div className="mc-resource-packs-spacer" data-source-control={name} style={{height: height * scale}} aria-hidden="true"/>;}
function DefaultItem({value, width, scale}: {value: ResourcePackDefaultItem; width: number; scale: number}) {return <>
  <div className="mc-resource-packs-default" data-source-control="selected_pack_section.default_item" style={{width: (width - 2) * scale, height: 44 * scale}}>
    <span className="mc-resource-packs-default__icon">{value.icon && <Image src={value.icon.src} sourceSize={value.icon.sourceSize} size={[42, 42]} scale={scale} alt=""/>}</span>
    <span className="mc-resource-packs-default__name">{value.title}</span><span className="mc-resource-packs-default__description">{value.description}</span>
  </div>
  <div className="mc-resource-packs-filler" data-source-control="selected_pack_section.filler_panel" style={{height: (value.fillerTextHeight + 3) * scale}}><span style={{height: value.fillerTextHeight * scale}}>{value.bottomDescription}</span></div>
  </>;
}
function Factory({data, kind, p}: {data: ResourcePackCollectionData; kind: ResourcePackKind; p: ResourcePackSectionProps}) {return <div className="mc-resource-packs-factory" data-source-factory={kind + '_pack_factory'} data-source-collection={profiles[p.profile].collections[kind]} data-source-capacity={data.capacity}>
  {data.items.map(record => <ResourcePackItem key={record.id} {...itemProps(p.profile, kind, record, p.width, p.scale, p.disabled, p.readOnly, p.onAction)}/>)}
  </div>;}

/** One real source header and controlled vertical factory, without a new
 * scroll owner. Header count, header visibility and expansion are independent. */
export const ResourcePackSection = forwardRef<HTMLDivElement, ResourcePackSectionProps>(function ResourcePackSection(p, forwarded) {
  sectionPlan(p); const {profile, kind, width, scale, title, titleVisible, expanded, collection: data, disabled, readOnly, onAction, className, style: givenStyle} = p;
  const [, attach] = useClassicNodeRef(forwarded), source = profiles[profile], diagnostics = kind === 'selected' || kind === 'available' ? p.diagnostics : undefined;
  const native: Record<string, unknown> = {}; for (const [key, value] of Object.entries(p)) if (key.startsWith('aria-') || key.startsWith('data-') || key.startsWith('on') && key !== 'onAction' || ['id', 'role', 'hidden', 'inert', 'tabIndex', 'dir', 'lang'].includes(key)) native[key] = value;
  const more = (label: string) => <SourceButton width={width} height={15} scale={scale} readOnly={readOnly} disabled={disabled} onAction={onAction} request={{action: 'more-offers', target: source.moreOffers, profile, sourceControl: 'to_store_button', collection: source.collections[kind]}}>{label}</SourceButton>;
  return <div {...native} ref={attach} className={cx('mc-resource-packs-section', className)} data-source-section={kind} data-expanded={expanded} style={style(scale, {...givenStyle, width: width * scale})}>
    <div className="mc-resource-packs-section__header" data-source-control={kind === 'selected' || kind === 'available' ? kind + '_packs_title_panel' : kind + '_packs_title_button'} hidden={!titleVisible} style={{height: 20 * scale}}>
      <SourceButton width={width - (diagnostics?.visible ? 25 : 0)} height={20} scale={scale} readOnly={readOnly} disabled={disabled} onAction={onAction} aria-expanded={expanded} request={{action: ('expand-' + kind) as ResourcePackContentRequest['action'], target: source.expand[kind], profile, sourceControl: kind + '_packs_title_button', collection: source.collections[kind]}}>
        <span className="mc-resource-packs-section__heading"><span className="mc-resource-packs-section__title">{title}</span><span className="mc-resource-packs-section__fill"/><Glyph name={kind === 'available' ? 'textures/items/book_normal' : kind === 'realms' ? 'textures/ui/sidebar_icons/csb_sidebar_icon' : 'textures/blocks/grass_side_carried'} width={9} height={9} scale={scale}/><span className="mc-resource-packs-section__gap"/><ResourcePackHeaderCount text={data.count} profile={titleVisible ? p.headerTextProfile : undefined} scale={scale} disabled={!!(disabled || readOnly)}/><span className="mc-resource-packs-section__arrow-gap"/><ResourcePackHeaderToggle expanded={expanded} profile={p.headerImageProfile} scale={scale} disabled={!!(disabled || readOnly)} texture={asset(expanded ? 'textures/ui/minus' : 'textures/ui/plus').url}><Glyph name={expanded ? 'textures/ui/minus' : 'textures/ui/plus'} width={10} height={10} scale={scale} contain={expanded}/></ResourcePackHeaderToggle></span>
      </SourceButton>
      {diagnostics?.visible && <div className="mc-resource-packs-section__diagnostic-holder" style={{width: 25 * scale, height: 20 * scale}}><SourceButton indicator width={20} height={20} scale={scale} readOnly={readOnly} disabled={disabled} aria-label={diagnostics.label} onAction={onAction} request={{action: 'ignore', target: 'button.ignore_me', profile, sourceControl: 'tooltip.button', collection: source.collections[kind]}}><span className="mc-resource-packs-section__diagnostic-icons">{diagnostics.anyErrors && <Glyph name="textures/ui/ErrorGlyph" width={9} height={14} scale={scale}/>} {diagnostics.anyWarnings && <Glyph name="textures/ui/Caution" width={9} height={14} scale={scale}/>}</span></SourceButton></div>}
    </div>
    <div className="mc-resource-packs-section__body" data-source-control={kind === 'selected' ? 'selected_pack_section' : kind + '_packs_section'} hidden={!expanded}>
      {kind === 'selected' ? <><Spacer height={6} scale={scale} name="selected_pack_section.offset"/><Factory data={data} kind="selected" p={p}/><DefaultItem value={p.defaultItem} width={width} scale={scale}/></> : <>
        {!p.noPacks && <Spacer height={6} scale={scale} name={kind + '_packs_section.offset'}/>}
        {kind === 'available' && p.noPacks && !p.educationEdition && <div data-source-control="available_packs_section.empty_panel"><div className="mc-resource-packs-empty" style={{height: 13 * scale}}>{p.noPacksText}</div>{p.unownedVisible && more(p.toStoreLabel)}</div>}
        <div hidden={p.noPacks}><Factory data={data} kind={kind} p={p}/></div>
        {kind === 'available' && <Factory data={p.invalidCollection} kind="invalid" p={p}/>}
        {kind === 'unowned' && more(p.viewMoreLabel)}
        {(kind === 'realms' || kind === 'unowned') && <Spacer height={10} scale={scale} name={kind + '_packs_section.offset_4'}/>}
      </>}
    </div>
  </div>;
});

const bindingKeys = 'worldTemplateLocked forcePackDownloadEnabled forcePackDownloadLocked forceUserAgreement forceUserAgreementEnabled addonStackingWarningVisible selectedGridVisible availableGridVisible realmsVisible realmsGridVisible unownedVisible unownedGridVisible noAvailablePacks noRealmsPacks noUnownedPacks selectedAnyExceptions selectedAnyErrors selectedAnyWarnings invalidHasErrors availableAnyErrors availableAnyWarnings'.split(' ') as (keyof ResourcePackManagerBindings)[];
const labelKeys = 'selected available realms unowned templateWarning forceDownload addonWarning addonLink noPacks toStore viewMore selectedDiagnostics availableDiagnostics'.split(' ') as (keyof ResourcePackManagerLabels)[];
/** Private pure source preflight shared by parent Settings composition. */
export function planResourcePackManager(p: ResourcePackManagerProps) {
  const unsafe = p as unknown as Record<string, unknown>; if (unsafe.children !== undefined || unsafe.dangerouslySetInnerHTML !== undefined) throw new TypeError('Resource-pack Manager owns its complete source content graph.');
  geometry(p.profile, p.width, p.scale);
  if (!p.provider || !p.bindings || !p.labels || !p.collections || !p.layout) throw new TypeError('Resource-pack Manager requires complete provider/bindings/labels/collections/layout snapshots.');
  for (const key of ['educationEdition', 'isWorldCreate', 'isTemplateCreate', 'isWorldEdit'] as const) bool(p.provider[key], 'provider.' + key);
  for (const key of bindingKeys) bool(p.bindings[key], 'binding.' + key);
  for (const key of labelKeys) literal(p.labels[key], 'label.' + key);
  for (const kind of ['selected', 'available', 'realms', 'unowned', 'invalid'] as const) collection(p.collections[kind], p.profile, kind, p.width, p.scale);
  defaultItem(p.defaultItem, p.scale);
  if (p.disabled !== undefined) bool(p.disabled, 'disabled'); if (p.readOnly !== undefined) bool(p.readOnly, 'readOnly');
  if (p.onAction !== undefined && typeof p.onAction !== 'function') throw new TypeError('Resource-pack Manager onAction must be callable.');
  const warning = (p.provider.isWorldCreate || p.provider.isTemplateCreate || p.provider.isWorldEdit) && p.bindings.worldTemplateLocked;
  if (warning) {extent(p.layout.templateWarningHeight, 'template warning resolved height'); extent(p.layout.templateWarningHeight * p.scale, 'physical template warning');}
  if (p.bindings.addonStackingWarningVisible) {
    extent(p.layout.addonTextWidth, 'addon text width'); if (!Array.isArray(p.layout.addonLinkSize) || p.layout.addonLinkSize.length !== 2) throw new TypeError('Visible addon link requires its explicit resolved logical size.');
    for (const value of p.layout.addonLinkSize) extent(value, 'addon link extent');
    if (p.layout.addonTextWidth + p.layout.addonLinkSize[0] + 2 > p.width || p.layout.addonLinkSize[1] + 1 > 30) throw new RangeError('Host addon intrinsic extents must fit the original30-high warning row.');
    for (const value of [p.layout.addonTextWidth, ...p.layout.addonLinkSize]) extent(value * p.scale, 'physical addon intrinsic extent');
  }
  return {warning, forceDownload: profiles[p.profile].showCheckbox && p.bindings.forcePackDownloadEnabled};
}
function Agreement({p}: {p: ResourcePackManagerProps}) {
  const {scale, profile, bindings: b, disabled, readOnly} = p, [input, attach] = useClassicNodeRef<HTMLInputElement>(), latest = useRef(p);
  useClassicLayoutEffect(() => {latest.current = p;});
  const locked = disabled || readOnly || !b.forcePackDownloadLocked || !b.forceUserAgreementEnabled;
  return <label className="mc-resource-packs-agreement" data-source-control="top_panel" data-source-parent-enabled={b.forcePackDownloadLocked} data-source-checkbox-enabled={b.forceUserAgreementEnabled} style={{height: 30 * scale}}>
    <span className="mc-resource-packs-panel-bg" aria-hidden="true"><ClassicSkin asset={asset('textures/ui/Black')} width={p.width} height={30} scale={scale} baseClass="mc-resource-packs-skin"/><span style={{inset: scale}}><ClassicSkin asset={asset('textures/ui/Gray')} width={p.width - 2} height={28} scale={scale} baseClass="mc-resource-packs-skin"/></span></span>
    <input ref={attach} type="checkbox" aria-label={p.labels.forceDownload} checked={b.forceUserAgreement} disabled={locked} onKeyDown={event => {if ((event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter', ' '].includes(event.key)) event.preventDefault();}}
      onChange={event => {
        if (event.defaultPrevented || event.nativeEvent.defaultPrevented || locked) return;
        const control = event.currentTarget, checked = control.checked, accepted = b.forceUserAgreement;
        deferClassicRequest(event, control, snapshot => latest.current.onAction?.({action: 'agreement-change', origin: 'checkbox', profile, target: '#force_user_agreement_level', checked, control, event: snapshot}), () => {
          const now = latest.current; return input.current === control && now.profile === profile && !now.disabled && !now.readOnly && now.bindings.forcePackDownloadEnabled && now.bindings.forcePackDownloadLocked && now.bindings.forceUserAgreementEnabled && now.bindings.forceUserAgreement === accepted && !control.disabled && !control.closest('[hidden],[inert]');
        });
      }}/>
    <span className="mc-resource-packs-agreement__holder" aria-hidden="true">{(['default', 'hover', 'locked'] as const).map(state => <span key={state} className={'mc-resource-packs-agreement__state mc-resource-packs-agreement__state--' + state}><Glyph name={'textures/ui/checkbox_' + (b.forceUserAgreement ? 'check' : 'space') + (state === 'hover' ? 'Hover' : state === 'locked' ? 'Disabled' : '')} width={10} height={10} scale={scale}/></span>)}</span>
    <span className="mc-resource-packs-agreement__label">{p.labels.forceDownload}</span>
  </label>;
}

/** The complete finite selected_stack_panel graph, reused by three source
 * Settings aliases. Parent Settings chrome/scroll, services and native layout
 * remain external. No arbitrary children substitute for the actual branches. */
export const ResourcePackManager = forwardRef<HTMLDivElement, ResourcePackManagerProps>(function ResourcePackManager(p, forwarded) {
  const plan = planResourcePackManager(p), {profile, scale, width, bindings: b, provider, labels: l, collections: c, disabled, readOnly, onAction, className, style: givenStyle} = p;
  const [, attach] = useClassicNodeRef(forwarded), native: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(p)) if (key.startsWith('aria-') || key.startsWith('data-') || key.startsWith('on') && key !== 'onAction' || ['id', 'title', 'role', 'hidden', 'inert', 'tabIndex', 'dir', 'lang'].includes(key)) native[key] = value;
  const common = {profile, width, scale, disabled, readOnly, onAction};
  return <div {...native} ref={attach} className={cx('mc-resource-packs', className)} style={style(scale, {...givenStyle, width: width * scale})} data-source-profile={profile} data-source-control="resource_packs.selected_stack_panel" data-native-certified="false" data-snapshot-policy="complete-materialized-factory" data-declared-suggested-offers={profiles[profile].suggestedOffersDeclared}>
    {plan.warning && <div className="mc-resource-packs-template-warning" data-source-control="world_template_option_lock_panel" style={{height: p.layout.templateWarningHeight! * scale}}>{l.templateWarning}</div>}
    {plan.forceDownload && <Agreement p={p}/>}
    <Spacer height={2} scale={scale} name="offset_0"/>
    {b.addonStackingWarningVisible && <div className="mc-resource-packs-addon" data-source-control="addon_stacking_warning_panel" style={{height: 30 * scale}}>
      <span className="mc-resource-packs-panel-bg" aria-hidden="true"><ClassicSkin asset={asset('textures/ui/Black')} width={width} height={30} scale={scale} baseClass="mc-resource-packs-skin"/><span className="mc-resource-packs-addon__yellow" style={{inset: scale, maskImage: `url(${JSON.stringify(asset('textures/ui/White').url)})`}}/></span>
      <span className="mc-resource-packs-addon__copy" style={{width: p.layout.addonTextWidth! * scale}}>{l.addonWarning}</span><span style={{width: 2 * scale}}/>
      <SourceButton underline width={p.layout.addonLinkSize![0]} height={p.layout.addonLinkSize![1]} scale={scale} readOnly={readOnly} disabled={disabled} onAction={onAction} style={{top: scale}} request={{action: 'addon-link', target: 'button.addonLink', sourceControl: 'addon_link_button', profile}}>{l.addonLink}</SourceButton>
    </div>}
    <Spacer height={2} scale={scale} name="offset_1"/>
    <ResourcePackSection {...common} kind="selected" headerImageProfile={p.headerImageProfiles?.selected} headerTextProfile={p.headerTextProfiles?.selected} title={l.selected} titleVisible expanded={b.selectedGridVisible} collection={c.selected} defaultItem={p.defaultItem} diagnostics={{visible: b.selectedAnyExceptions, anyErrors: b.selectedAnyErrors, anyWarnings: b.selectedAnyWarnings, label: l.selectedDiagnostics}}/>
    <Spacer height={6} scale={scale} name="offset_2"/>
    <ResourcePackSection {...common} kind="available" headerImageProfile={p.headerImageProfiles?.available} headerTextProfile={p.headerTextProfiles?.available} title={l.available} titleVisible expanded={b.availableGridVisible} collection={c.available} invalidCollection={c.invalid} noPacks={b.noAvailablePacks} educationEdition={provider.educationEdition} unownedVisible={b.unownedVisible} noPacksText={l.noPacks} toStoreLabel={l.toStore} diagnostics={{visible: b.invalidHasErrors, anyErrors: b.availableAnyErrors, anyWarnings: b.availableAnyWarnings, label: l.availableDiagnostics}}/>
    <Spacer height={6} scale={scale} name="offset_3"/>
    <ResourcePackSection {...common} kind="realms" headerImageProfile={p.headerImageProfiles?.realms} headerTextProfile={p.headerTextProfiles?.realms} title={l.realms} titleVisible={b.realmsVisible} expanded={b.realmsGridVisible} collection={c.realms} noPacks={b.noRealmsPacks}/>
    {b.realmsVisible && <Spacer height={6} scale={scale} name="offset_4"/>}
    {!provider.educationEdition && <ResourcePackSection {...common} kind="unowned" headerImageProfile={p.headerImageProfiles?.unowned} headerTextProfile={p.headerTextProfiles?.unowned} title={l.unowned} titleVisible={b.unownedVisible} expanded={b.unownedGridVisible} collection={c.unowned} noPacks={b.noUnownedPacks} viewMoreLabel={l.viewMore}/>}
  </div>;
});
