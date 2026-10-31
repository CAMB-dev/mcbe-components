import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, Ref, SyntheticEvent } from 'react';
import { Button } from './components';
import { ScrollArea } from './scroll-area';
import { storageAssets } from './storage-assets';

/** Resolved Classic construction/visibility/enabled bindings; never inferred from a file or account. */
export interface StorageControlState { readonly included: boolean; readonly visible: boolean; readonly enabled: boolean }
export interface StorageImageSource { readonly src: string; readonly sourceSize: readonly [number, number]; readonly alt?: string }
export type StorageLocation = 'external' | 'appdata';
export type StorageCategoryKind = 'world' | 'world-template' | 'resource' | 'behavior' | 'skin' | 'cache' | 'legacy-world' | 'retail-to-preview-world';
export interface StorageSignals { readonly warning?: boolean; readonly error?: boolean; readonly update?: boolean }
export type StorageAction = 'clear-cache' | 'clear-layout-cache' | 'clear-download-cache' | 'clear-screenshots-cache' | 'delete-local-screenshots' | 'delete-selected' | 'delete-item' | 'generate-texture-list' | 'share-item' | 'show-dependencies' | 'deselect-item' | 'sync-legacy-worlds' | 'sync-preview-worlds' | 'remove-dependencies' | 'dependency-continue' | 'dependency-cancel' | 'sharing-button' | 'sharing-cancel';
export interface StorageToolbarValue { readonly location: StorageLocation | null; readonly multiselect: boolean }
export interface StorageManagementValue extends StorageToolbarValue { readonly expandedIds: readonly string[]; readonly selectedIds: readonly string[] }
export interface StorageActionDetail {
  readonly action: StorageAction;
  /** Original source target where known; missing popup targets must be supplied by the host. */
  readonly target: string;
  readonly event: SyntheticEvent<HTMLElement>;
  readonly categoryId?: string;
  readonly itemId?: string;
  readonly reason?: 'button' | 'escape';
  /** Accepted input snapshot, including hidden/disabled/orphan IDs; no implicit filtering. */
  readonly value?: StorageManagementValue;
}
export type StorageActionHandler = (detail: StorageActionDetail) => void;
export interface StorageActionControl {
  readonly state: StorageControlState;
  readonly label: string;
  readonly target?: string;
  readonly glyph?: ReactNode;
  readonly ref?: Ref<HTMLButtonElement>;
  readonly nativeProps?: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'disabled'>;
}
export interface StorageItemActionControls {
  readonly generateTextureList: StorageActionControl;
  readonly delete: StorageActionControl;
  readonly share: StorageActionControl;
  readonly dependencies: StorageActionControl;
}
export interface StorageItemMetadata {
  readonly id: string;
  readonly name: string;
  readonly sizeText: string;
  readonly state: StorageControlState;
  readonly image?: StorageImageSource;
  readonly imageContent?: ReactNode;
  readonly imageVisible?: boolean;
  readonly lockVisible?: boolean;
  readonly gameTypeText?: string;
  readonly dateText?: string;
  readonly versionText?: string;
  readonly versionVisible?: boolean;
  readonly description?: string;
  readonly signals?: StorageSignals;
}
export interface StorageItemData extends StorageItemMetadata {
  readonly checkboxVisible: boolean;
  /** Independent controller binding; selection does not automatically open this tray. */
  readonly optionsVisible: boolean;
  /** Host-resolved source inline-modal binding; true confines Web Tab navigation to this tray. */
  readonly optionsModal?: boolean;
  readonly actions: StorageItemActionControls;
}
export interface StorageMigrationState {
  readonly sync: StorageActionControl;
  readonly description: string;
  readonly conversionDescription: string;
  readonly conversionVisible: boolean;
  readonly loadingVisible: boolean;
  readonly loadingLabel: string;
  /** Host-resolved original64×8 sprite window,0..9; omitted is authored initial frame0, not a recovered clock. */
  readonly loadingFrame?: number;
}
export interface StorageCategoryData {
  readonly id: string;
  readonly kind: Exclude<StorageCategoryKind, 'legacy-world' | 'retail-to-preview-world'>;
  readonly label: string;
  readonly sizeText: string;
  readonly state: StorageControlState;
  readonly signals?: StorageSignals;
  readonly items: readonly StorageItemData[];
}
export interface StorageMigrationCategoryData extends Omit<StorageCategoryData, 'kind'> { readonly kind: 'legacy-world' | 'retail-to-preview-world'; readonly migration: StorageMigrationState }
export interface StorageChangeDetail {
  readonly field: 'location' | 'multiselect' | 'expandedIds' | 'selectedIds';
  readonly event: SyntheticEvent<HTMLElement>;
  readonly categoryId?: string;
  readonly itemId?: string;
}
export interface StorageToolbarOptions {
  readonly state: StorageControlState;
  readonly location: { readonly state: StorageControlState; readonly label: string; readonly externalLabel: string; readonly appdataLabel: string; readonly toggleLabel?: string };
  readonly clearCache: StorageActionControl;
  readonly clearLayoutCache: StorageActionControl;
  readonly clearDownloadCache: StorageActionControl;
  readonly clearScreenshotsCache: StorageActionControl;
  readonly deleteLocalScreenshots: StorageActionControl;
  readonly multiselect: { readonly state: StorageControlState; readonly label: string; readonly ref?: Ref<HTMLInputElement> };
}
export interface StorageToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'defaultValue' | 'inputMode'>, StorageToolbarOptions {
  value?: StorageToolbarValue; defaultValue?: StorageToolbarValue;
  onValueChange?: (value: StorageToolbarValue, detail: StorageChangeDetail) => void;
  locationRef?: Ref<HTMLButtonElement>;
  inputMode?: 'mouse' | 'touch'; touchThumbVisible?: boolean; minThumbSize?: number;
  disabled?: boolean; readOnly?: boolean; scale?: number; onAction?: StorageActionHandler;
}
export interface StorageItemActionsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  /** Source item-template width in logical units, used by Y=24+.03W. */
  width: number; itemId: string; categoryId?: string; controls: StorageItemActionControls;
  visible: boolean; modal?: boolean; disabled?: boolean; readOnly?: boolean; scale?: number;
  onAction?: StorageActionHandler;
}
export type StorageSelectionInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'size' | 'checked' | 'defaultChecked' | 'disabled' | 'readOnly'>;
export interface StorageItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'defaultValue'> {
  item: StorageItemData; kind: StorageCategoryKind; categoryId?: string;
  presentation?: 'standard' | 'dependency' | 'dependent';
  selected?: boolean; defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean, event: SyntheticEvent<HTMLElement>) => void;
  selectionRef?: Ref<HTMLInputElement>; selectionProps?: StorageSelectionInputProps;
  disabled?: boolean; readOnly?: boolean; scale?: number; onAction?: StorageActionHandler;
}
export interface StorageCategoryProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'defaultValue'> {
  category: StorageCategoryData | StorageMigrationCategoryData;
  expanded?: boolean; defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean, event: SyntheticEvent<HTMLElement>) => void;
  selectedIds?: readonly string[]; defaultSelectedIds?: readonly string[];
  onSelectedIdsChange?: (ids: readonly string[], itemId: string, event: SyntheticEvent<HTMLElement>) => void;
  toggleRef?: Ref<HTMLButtonElement>;
  itemRefs?: Readonly<Record<string, Ref<HTMLDivElement>>>;
  selectionRefs?: Readonly<Record<string, Ref<HTMLInputElement>>>;
  disabled?: boolean; readOnly?: boolean; scale?: number; onAction?: StorageActionHandler;
}
export interface StorageSelectionFooterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  visible: boolean; deleteControl: StorageActionControl;
  disabled?: boolean; readOnly?: boolean; scale?: number; onAction?: StorageActionHandler;
}
export interface StorageDependencyGroup {
  readonly id: string; readonly item: StorageItemMetadata;
  readonly breakLabel: string;
  readonly dependents: readonly StorageItemMetadata[];
  readonly remove: StorageActionControl;
}
/** The frozen archive has no modal_first/second_button definitions. Rectangles are explicit host input. */
export interface StorageResolvedPopupButton extends StorageActionControl {
  readonly target: string;
  /** Logical[x,y,width,height], relative to the proven[panelWidth−14,30] bottom holder. */
  readonly rect: readonly [number, number, number, number];
}
export interface StorageDependencyDialogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'inputMode'> {
  open: boolean; frame: readonly [number, number]; profile: 'desktop' | 'available-frame';
  title: string; description: string; groups: readonly StorageDependencyGroup[];
  continueButton: StorageResolvedPopupButton; continueScrollLabel: string; cancelButton: StorageResolvedPopupButton;
  continueScrollRef?: Ref<HTMLButtonElement>;
  /** Omitted follows this Web viewport's actual end; explicit host source binding takes precedence. */
  continueReady?: boolean; onReachedEndChange?: (ready: boolean) => void;
  viewportRef?: Ref<HTMLDivElement>;
  inputMode?: 'mouse' | 'touch'; touchThumbVisible?: boolean; minThumbSize?: number;
  disabled?: boolean; readOnly?: boolean; scale?: number; onAction?: StorageActionHandler;
}
export interface StorageSharingProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'title'> {
  open: boolean; frame: readonly [number, number]; title: string;
  currentLabel: string; totalLabel: string; progressLabel: string;
  /** Web normalized visible fraction0..1. Native #progress_percentage/clip_ratio mapping is host-owned. */
  progress: number;
  button: StorageActionControl;
  disabled?: boolean; readOnly?: boolean; scale?: number; onAction?: StorageActionHandler;
}
export interface StorageManagementProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'defaultValue' | 'inputMode'> {
  /** Resolved Settings content-area frame, excluding the unrelated Settings navigation/header chrome. */
  size: readonly [number, number]; label: string; state: StorageControlState;
  standardVisible: boolean; categoryPanelVisible: boolean;
  toolbar: StorageToolbarOptions; categories: readonly StorageCategoryData[];
  legacyWorlds?: StorageMigrationCategoryData & { readonly kind: 'legacy-world' };
  retailToPreviewWorlds?: StorageMigrationCategoryData & { readonly kind: 'retail-to-preview-world' };
  deleteControl: StorageActionControl;
  value?: StorageManagementValue; defaultValue?: StorageManagementValue;
  onValueChange?: (value: StorageManagementValue, detail: StorageChangeDetail) => void;
  onAction?: StorageActionHandler;
  inputMode?: 'mouse' | 'touch'; touchThumbVisible?: boolean; minThumbSize?: number;
  viewportRef?: Ref<HTMLDivElement>; toolbarRef?: Ref<HTMLDivElement>; footerRef?: Ref<HTMLDivElement>; locationRef?: Ref<HTMLButtonElement>;
  categoryRefs?: Readonly<Record<string, Ref<HTMLElement>>>;
  itemRefs?: Readonly<Record<string, Ref<HTMLDivElement>>>; selectionRefs?: Readonly<Record<string, Ref<HTMLInputElement>>>;
  dependencyDialog?: Omit<StorageDependencyDialogProps, 'scale' | 'disabled' | 'readOnly' | 'onAction'>;
  sharingProgress?: Omit<StorageSharingProgressProps, 'scale' | 'disabled' | 'readOnly' | 'onAction'>;
  disabled?: boolean; readOnly?: boolean; scale?: number;
}

const imageUrl = (url: string) => `url(${JSON.stringify(url)})`;
const sourceImages = Object.fromEntries(Object.entries(storageAssets).map(([key, asset]) => [`--mc-storage-${key}`, imageUrl(asset.url)])) as CSSProperties;
const allOn: StorageControlState = { included: true, visible: true, enabled: true };
const kindNames = ['world', 'world-template', 'resource', 'behavior', 'skin', 'cache', 'legacy-world', 'retail-to-preview-world'] as const;
const targets: Record<StorageAction, string> = { 'clear-cache':'button.clear_cache', 'clear-layout-cache':'button.clear_layout_cache', 'clear-download-cache':'dev_clear_download_cache_button', 'clear-screenshots-cache':'button.clear_screenshots_cache', 'delete-local-screenshots':'button.delete_local_screenshots', 'delete-selected':'button.deleteResources', 'delete-item':'button.deleteResources', 'generate-texture-list':'button.generateTextureList', 'share-item':'button.shareResources', 'show-dependencies':'button.warningDependency', 'deselect-item':'button.deselect_resource', 'sync-legacy-worlds':'button.sync_legacy_worlds', 'sync-preview-worlds':'button.sync_retailtopreview_worlds', 'remove-dependencies':'button.remove_pack_button', 'dependency-continue':'', 'dependency-cancel':'popup_dialog.escape', 'sharing-button':'popup_dialog.middle_button', 'sharing-cancel':'popup_dialog.escape' };
const viewActions = new Set<StorageAction>(['show-dependencies','deselect-item','dependency-cancel','sharing-cancel']);
const Context = createContext<{ blocked: boolean; readOnly: boolean; defer: boolean; value?: StorageManagementValue; width?: number; inputMode?:'mouse'|'touch'; touchThumbVisible?:boolean; minThumbSize?:number; modalOpen?:boolean }>({ blocked:false, readOnly:false, defer:false });
type Intent = { type:'action'; detail: Omit<StorageActionDetail,'event'> } | { type:'change'; eventType?:string; run:(event:SyntheticEvent<HTMLElement>)=>void; cancel?:()=>void };
const intents = new WeakMap<Event,Intent>();
function positive(value:number,name:string,min=0) { if (!Number.isFinite(value)||value<=min) throw new RangeError(`${name} must exceed ${min}`);return value; }
function guiScale(value=2) { if (!Number.isSafeInteger(value)||value<1) throw new RangeError('scale must be a positive integer');return value; }
function scrollInputs(mode:'mouse'|'touch'|undefined,thumb:boolean|undefined,min:number|undefined) { if(mode!==undefined&&!['mouse','touch'].includes(mode)||thumb!==undefined&&typeof thumb!=='boolean')throw new TypeError('invalid Storage scroll presentation');if(min!==undefined)positive(min,'minimum thumb size'); }
function pair(value:readonly[number,number],name='size') { if (!Array.isArray(value)||value.length!==2) throw new TypeError(`${name} must be a pair`);positive(value[0],name);positive(value[1],name);return value; }
function resolved(value:StorageControlState) { if (!value||['included','visible','enabled'].some(k=>typeof value[k as keyof StorageControlState]!=='boolean')) throw new TypeError('state requires resolved included/visible/enabled booleans');return value; }
function id(value:string) { if (typeof value!=='string'||!value.trim()) throw new TypeError('IDs and accessible labels must be nonempty strings');return value; }
function ids(value:readonly string[]) { if (!Array.isArray(value)||[...value].some(x=>typeof x!=='string'||!x.trim())||new Set(value).size!==value.length) throw new TypeError('IDs must be a dense unique string array');return value; }
function toolbarValue(value:StorageToolbarValue) { if (!value||![null,'external','appdata'].includes(value.location)||typeof value.multiselect!=='boolean') throw new TypeError('invalid toolbar value');return value; }
function fullValue(value:StorageManagementValue) { toolbarValue(value);ids(value.expandedIds);ids(value.selectedIds);return value; }
function copyValue(value:StorageManagementValue):StorageManagementValue { return {...value,expandedIds:[...value.expandedIds],selectedIds:[...value.selectedIds]}; }
function control(value:StorageActionControl) { resolved(value.state);id(value.label);if(value.target!==undefined)id(value.target);return value; }
function ownRef<T>(record:Readonly<Record<string,Ref<T>>>|undefined,key:string) { return record&&Object.hasOwn(record,key)?record[key]:undefined; }
function useRefPair<T>(forwarded:Ref<T>|undefined) {
  const local=useRef<T|null>(null), cleanup=useRef<(()=>void)|undefined>(undefined);
  const attach=useCallback((node:T|null)=>{local.current=node;if(cleanup.current){cleanup.current();cleanup.current=undefined;}else if(node===null&&typeof forwarded==='function')forwarded(null);if(node!==null&&typeof forwarded==='function'){const result=forwarded(node);if(typeof result==='function')cleanup.current=result;}else if(forwarded&&typeof forwarded!=='function')forwarded.current=node;},[forwarded]);
  return [local,attach] as const;
}
function styleAt(scale:number,style?:CSSProperties):CSSProperties { return {...sourceImages,'--mc-storage-unit':`${scale}px`,...style} as CSSProperties; }
function dispatch(event:SyntheticEvent<HTMLElement>,onAction?:StorageActionHandler) { const intent=intents.get(event.nativeEvent);if(!intent||(intent.type==='change'&&intent.eventType&&intent.eventType!==event.type))return;intents.delete(event.nativeEvent);if(event.defaultPrevented||event.nativeEvent.defaultPrevented){if(intent.type==='change')intent.cancel?.();return;}if(intent.type==='change')intent.run(event);else onAction?.({...intent.detail,event}); }
function useOwner(onAction?:StorageActionHandler) { const context=useContext(Context);return (event:SyntheticEvent<HTMLElement>)=>{if(!context.defer){const had=intents.has(event.nativeEvent);dispatch(event,onAction);if(had&&event.type==='keydown'){event.preventDefault();event.stopPropagation();}}}; }
function State({state:stateValue,className,children,style}: {state:StorageControlState;className?:string;children:ReactNode;style?:CSSProperties}) { resolved(stateValue);const c=useContext(Context);if(!stateValue.included)return null;return <Context.Provider value={{...c,blocked:c.blocked||!stateValue.visible||!stateValue.enabled}}><div className={className} style={style} hidden={!stateValue.visible}>{children}</div></Context.Provider>; }
function queueAction(event:SyntheticEvent<HTMLElement>,action:StorageAction,config:StorageActionControl,context:React.ContextType<typeof Context>,itemId?:string,categoryId?:string,reason:'button'|'escape'='button') { if(event.defaultPrevented||event.nativeEvent.defaultPrevented||context.blocked||(context.readOnly&&!viewActions.has(action)))return;intents.set(event.nativeEvent,{type:'action',detail:{action,target:config.target??targets[action],itemId,categoryId,reason,value:context.value?copyValue(context.value):undefined}}); }
function ActionButton({action,config,itemId,categoryId,className,style,children,disabled=false,controlName}: {action:StorageAction;config:StorageActionControl;itemId?:string;categoryId?:string;className?:string;style?:CSSProperties;children?:ReactNode;disabled?:boolean;controlName?:string}) {
  const c=useContext(Context);control(config);if(!config.state.included)return null;const {onClick,...native}=config.nativeProps??{};const blocked=disabled||c.blocked||!config.state.visible||!config.state.enabled||(c.readOnly&&!viewActions.has(action));
  return <Button {...native} ref={config.ref} type="button" hidden={!config.state.visible} disabled={blocked} aria-label={native['aria-label']??config.label} className={`mc-storage-button ${className??''} ${native.className??''}`} style={{...native.style,...style}} data-storage-action={action} data-storage-control={controlName} onClick={event=>{onClick?.(event);if(!blocked)queueAction(event,action,config,c,itemId,categoryId);}}>{children??config.label}</Button>;
}
function Signals({value}: {value?:StorageSignals}) { return <>{(['warning','error','update'] as const).map(name=><span key={name} className={`mc-storage-signal mc-storage-signal--${name}`} hidden={!value?.[name]} aria-hidden="true"/>)}</>; }
function useWidth(node:React.RefObject<HTMLElement|null>,scale:number,fallback:number,active=true) { const [width,setWidth]=useState(fallback);useEffect(()=>{const e=node.current;if(!e||!active)return;const measure=()=>{const next=e.getBoundingClientRect().width/scale;if(next>0)setWidth(next);};measure();const o=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure);o?.observe(e);return()=>o?.disconnect();},[node,scale,active]);return width; }

/** Source six-cell inline action tray, including both permanent blanks and conditional blank replacements. */
export const StorageItemActions=forwardRef<HTMLDivElement,StorageItemActionsProps>(function StorageItemActions({width,itemId,categoryId,controls,visible,modal=false,disabled=false,readOnly=false,scale=2,onAction,onClick,onKeyDown,className,style,...props},ref){
  positive(width,'item width');id(itemId);if(typeof visible!=='boolean'||typeof modal!=='boolean')throw new TypeError('tray visibility and modal require booleans');const s=guiScale(scale),parent=useContext(Context),receive=useOwner(onAction);
  for(const v of Object.values(controls))control(v);
  const y=24+.03*width;const slots:[StorageAction,StorageActionControl,string][]=[['generate-texture-list',controls.generateTextureList,'generate'],['delete-item',controls.delete,'delete'],['share-item',controls.share,'share'],['show-dependencies',controls.dependencies,'dependencies']];
  const cell=(entry:typeof slots[number]|undefined,key:string)=><div key={key} className="mc-storage-item-actions__cell"><span className="mc-storage-item-actions__blank" aria-hidden="true" hidden={!!entry?.[1].state.included&&entry[1].state.visible}/>{entry&&<ActionButton action={entry[0]} config={entry[1]} itemId={itemId} categoryId={categoryId} className={`mc-storage-item-actions__button mc-storage-item-actions__button--${entry[2]}`}><span className="mc-storage-item-actions__glyph">{entry[1].glyph??(entry[0]==='delete-item'?<span className="mc-storage-item-actions__delete-glyph" aria-hidden="true"/>:<span className="mc-storage-item-actions__missing" data-storage-missing-glyph={entry[2]} aria-hidden="true"/>)}</span></ActionButton>}</div>;
  return <Context.Provider value={{...parent,blocked:parent.blocked||disabled||!visible,readOnly:parent.readOnly||readOnly}}><div {...props} ref={ref} hidden={!visible} data-inline-modal={modal} className={`mc-storage-item-actions ${className??''}`} style={styleAt(s,{'--mc-storage-tray-y':`${y*s}px`,...style} as CSSProperties)} onClick={e=>{onClick?.(e);receive(e);}} onKeyDown={e=>{onKeyDown?.(e);if(e.defaultPrevented||e.nativeEvent.isComposing||e.nativeEvent.keyCode===229||!visible||disabled||parent.blocked||e.altKey||e.ctrlKey||e.metaKey)return;if(modal&&modalKey(e,e.currentTarget)){receive(e);return;}if(e.key==='Escape'){queueAction(e,'deselect-item',{state:allOn,label:'Deselect item'}, {...parent,readOnly:readOnly||parent.readOnly},itemId,categoryId,'escape');receive(e);}else if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled):not([hidden])'));if(!buttons.length)return;const current=buttons.indexOf(e.target as HTMLButtonElement);const index=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;intents.set(e.nativeEvent,{type:'change',eventType:e.type,run:()=>buttons[index]?.focus({preventScroll:true})});receive(e);}}}><div className="mc-storage-item-actions__sizing"><span className="mc-storage-item-actions__border" aria-hidden="true"/><div className="mc-storage-item-actions__row">{cell(undefined,'blank-0')}{cell(slots[0],'generate')}{cell(slots[1],'delete')}{cell(slots[2],'share')}{cell(undefined,'blank-4')}{cell(slots[3],'dependencies')}</div></div></div></Context.Provider>;
});

function Metadata({item,kind,checked=false,checkboxVisible=false,presentation='standard'}: {item:StorageItemMetadata;kind:StorageCategoryKind;checked?:boolean;checkboxVisible?:boolean;presentation?:'standard'|'dependency'|'dependent'}) {
  id(item.id);id(item.name);resolved(item.state);if(typeof item.sizeText!=='string')throw new TypeError('sizeText must be preformatted text');
  if(item.image){id(item.image.src);pair(item.image.sourceSize,'sourceSize');}
  if(!item.state.included)return null;
  const world=['world','world-template','legacy-world','retail-to-preview-world'].includes(kind),pack=(kind==='resource'||kind==='behavior')&&presentation!=='dependent';
  return <div className={`mc-storage-metadata ${world?'mc-storage-metadata--world':''} ${pack?'mc-storage-metadata--pack':''} mc-storage-metadata--${presentation}`} hidden={!item.state.visible}>
    <span className="mc-storage-metadata__leading"/><span className="mc-storage-metadata__checkbox" hidden={!checkboxVisible} aria-hidden="true" data-checked={checked}/>
    <div className="mc-storage-metadata__image-panel" hidden={item.imageVisible===false}><span className="mc-storage-metadata__image-border"/><div className="mc-storage-metadata__image">{item.imageContent??(item.image&&<img src={item.image.src} alt={item.image.alt??''} draggable={false}/>)}</div></div>
    <div className="mc-storage-metadata__text">
      <span className="mc-storage-metadata__name">{item.name}</span>
      {world?<><span className="mc-storage-metadata__game-type">{item.gameTypeText}</span><span className="mc-storage-metadata__date">{item.dateText}</span><span className="mc-storage-metadata__lock" hidden={!item.lockVisible} aria-hidden="true"/></>:pack||presentation!=='standard'?<><div className="mc-storage-metadata__version-line">{presentation!=='dependent'&&<Signals value={item.signals}/>}<span className="mc-storage-metadata__version" hidden={item.versionVisible===false}>{item.versionText}</span></div>{presentation!=='dependent'&&<span className="mc-storage-metadata__description">{item.description}</span>}</>:null}
      <span className="mc-storage-metadata__size">{item.sizeText}</span>
    </div>
  </div>;
}
/** Original item templates retain source images/metadata, selected checkbox and independent inline options. */
export const StorageItem=forwardRef<HTMLDivElement,StorageItemProps>(function StorageItem({item,kind,categoryId,presentation='standard',selected,defaultSelected=false,onSelectedChange,selectionRef,selectionProps={},disabled=false,readOnly=false,scale=2,onAction,onClick,onChange,className,style,...props},ref){
  const s=guiScale(scale),parent=useContext(Context),receive=useOwner(onAction),[local,setLocal]=useState(defaultSelected),accepted=selected??local;
  if(!kindNames.includes(kind)||typeof accepted!=='boolean'||selected!==undefined&&typeof selected!=='boolean'||typeof defaultSelected!=='boolean'||typeof item.checkboxVisible!=='boolean'||typeof item.optionsVisible!=='boolean'||item.optionsModal!==undefined&&typeof item.optionsModal!=='boolean')throw new TypeError('invalid item presentation/state');
  const [node,attach]=useRefPair(ref),width=useWidth(node,s,parent.width??200,item.state.included&&item.state.visible),inputId=useId();
  const standard=presentation==='standard',blocked=disabled||parent.blocked||!item.state.visible||!item.state.enabled,readonly=readOnly||parent.readOnly;
  const {onChange:nativeChange,onClick:nativeClick,...native}=selectionProps;
  if(!resolved(item.state).included)return null;
  const rowHeight=presentation==='dependency'?32:presentation==='dependent'?25:['resource','behavior','cache'].includes(kind)?40:30;
  return <Context.Provider value={{...parent,defer:true,blocked,readOnly:readonly}}><div {...props} ref={attach} className={`mc-storage-item mc-storage-item--${kind} ${className??''}`} hidden={!item.state.visible} data-storage-item-id={item.id} data-selected={accepted} data-presentation={presentation} style={styleAt(s,{height:(rowHeight+(standard&&item.optionsVisible?28+.03*width:0)-1)*s,...style})} onClick={e=>{onClick?.(e);receive(e);}} onChange={e=>{onChange?.(e);receive(e);}}>
    {standard?<label className="mc-storage-item__main" htmlFor={native.id??inputId}>
      <input {...native} ref={selectionRef} id={native.id??inputId} type="checkbox" className={`mc-storage-item__selection ${native.className??''}`} aria-label={native['aria-label']??item.name} aria-controls={`${inputId}-options`} checked={accepted} disabled={blocked} readOnly={readonly} aria-readonly={readonly||undefined} onClick={e=>{nativeClick?.(e);if(readonly){e.preventDefault();e.currentTarget.checked=accepted;}}} onChange={e=>{nativeChange?.(e);const target=e.currentTarget,next=target.checked;if(e.defaultPrevented||e.nativeEvent.defaultPrevented||blocked||readonly){target.checked=accepted;return;}intents.set(e.nativeEvent,{type:'change',eventType:e.type,cancel:()=>{target.checked=accepted;},run:event=>{if(selected===undefined)setLocal(next);onSelectedChange?.(next,event);}});}}/>
      <Metadata item={item} kind={kind} checked={accepted} checkboxVisible={item.checkboxVisible}/>
    </label>:<div className="mc-storage-item__main"><Metadata item={item} kind={kind} presentation={presentation}/></div>}
    {standard&&<StorageItemActions id={`${inputId}-options`} width={width} itemId={item.id} categoryId={categoryId} controls={item.actions} visible={item.optionsVisible} modal={item.optionsModal} scale={s}/>}
  </div></Context.Provider>;
});

/** Six source factory kinds and the two distinct world-migration stacks. */
export const StorageCategory=forwardRef<HTMLElement,StorageCategoryProps>(function StorageCategory({category,expanded,defaultExpanded=false,onExpandedChange,selectedIds,defaultSelectedIds=[],onSelectedIdsChange,toggleRef,itemRefs,selectionRefs,disabled=false,readOnly=false,scale=2,onAction,onClick,onChange,onKeyDown,className,style,...props},ref){
  const s=guiScale(scale),parent=useContext(Context),receive=useOwner(onAction),[open,setOpen]=useState(defaultExpanded),[selected,setSelected]=useState<readonly string[]>([...defaultSelectedIds]);
  const acceptedOpen=expanded??open,acceptedIds=ids(selectedIds??selected),kind=category.kind;id(category.id);id(category.label);resolved(category.state);
  if(!kindNames.includes(kind)||typeof acceptedOpen!=='boolean'||expanded!==undefined&&typeof expanded!=='boolean'||typeof defaultExpanded!=='boolean')throw new TypeError('invalid category');
  const names=new Set<string>();for(const item of category.items){id(item.id);if(names.has(item.id))throw new RangeError('item IDs must be unique');names.add(item.id);}
  const isMigration=kind==='legacy-world'||kind==='retail-to-preview-world';
  const migration=isMigration&&Object.hasOwn(category,'migration')?(category as StorageMigrationCategoryData).migration:undefined;
  if(isMigration&&!migration)throw new TypeError('migration category requires its own migration state');
  if(migration){control(migration.sync);if(typeof migration.conversionVisible!=='boolean'||typeof migration.loadingVisible!=='boolean'||migration.loadingFrame!==undefined&&(!Number.isInteger(migration.loadingFrame)||migration.loadingFrame<0||migration.loadingFrame>9))throw new TypeError('invalid migration visibility or loading frame');}
  const blocked=disabled||parent.blocked||!category.state.visible||!category.state.enabled,readonly=readOnly||parent.readOnly,body=useId();
  const request=(next:boolean,e:SyntheticEvent<HTMLElement>)=>{if(blocked||e.defaultPrevented)return;intents.set(e.nativeEvent,{type:'change',eventType:e.type,run:event=>{if(expanded===undefined)setOpen(next);onExpandedChange?.(next,event);}});};
  if(!category.state.included)return null;
  return <Context.Provider value={{...parent,defer:true,blocked,readOnly:readonly}}><section {...props} ref={ref} className={`mc-storage-category ${className??''}`} data-storage-category-id={category.id} data-kind={kind} hidden={!category.state.visible} style={styleAt(s,style)} onClick={e=>{onClick?.(e);receive(e);}} onChange={e=>{onChange?.(e);receive(e);}} onKeyDown={e=>{onKeyDown?.(e);receive(e);}}>
    <button ref={toggleRef} type="button" className="mc-storage-category__toggle" aria-expanded={acceptedOpen} aria-controls={body} disabled={blocked} data-checked={acceptedOpen} onClick={e=>request(!acceptedOpen,e)}><span className="mc-storage-category__name"><span>{category.label}</span><Signals value={category.signals}/></span><span className="mc-storage-category__size">{category.sizeText}</span><span className="mc-storage-category__arrow" aria-hidden="true"/></button>
    <Context.Provider value={{...parent,defer:true,blocked:blocked||!acceptedOpen,readOnly:readonly}}><div id={body} className="mc-storage-category__body" hidden={!acceptedOpen}>
      {migration&&<><State state={migration.sync.state} className="mc-storage-category__sync"><ActionButton action={kind==='legacy-world'?'sync-legacy-worlds':'sync-preview-worlds'} config={migration.sync} categoryId={category.id}/><p>{migration.description}</p></State></>}
      {category.items.map(item=><StorageItem key={item.id} ref={ownRef(itemRefs,item.id)} selectionRef={ownRef(selectionRefs,item.id)} item={item} kind={kind} categoryId={category.id} selected={acceptedIds.includes(item.id)} scale={s} onSelectedChange={(next,e)=>{if(readonly||blocked)return;const value=next?[...acceptedIds,item.id]:acceptedIds.filter(id=>id!==item.id);if(selectedIds===undefined)setSelected(value);onSelectedIdsChange?.([...value],item.id,e);}}/>)}
      {migration&&<><p className="mc-storage-category__conversion" hidden={!migration.conversionVisible}>{migration.conversionDescription}</p><div className="mc-storage-category__loading" hidden={!migration.loadingVisible}><span>{migration.loadingLabel}</span><span className="mc-storage-category__loading-bars" aria-hidden="true" style={{backgroundPosition:`${((migration.loadingFrame??0)/9)*100}% 0`}}/></div></>}
    </div></Context.Provider><div className="mc-storage-category__padding"/>
  </section></Context.Provider>;
});

const useClientLayoutEffect=typeof window==='undefined'?useEffect:useLayoutEffect;
function Location({config,value,onRequest,forwarded,scale}: {scale:number;config:StorageToolbarOptions['location'];value:StorageLocation|null;onRequest:(next:StorageLocation,e:SyntheticEvent<HTMLElement>)=>void;forwarded?:Ref<HTMLButtonElement>}) {
  const context=useContext(Context),[open,setOpen]=useState(false),[active,setActive]=useState(value==='appdata'?1:0),root=useRef<HTMLDivElement>(null),menu=useRef<HTMLDivElement>(null),[trigger,attach]=useRefPair(forwarded),radios=useRef<(HTMLInputElement|null)[]>([]),name=useId();
  const enabled=!context.blocked&&!context.modalOpen&&config.state.visible&&config.state.enabled;
  useEffect(()=>{if(!enabled)setOpen(false);},[enabled]);
  useEffect(()=>{if(!open)return;const document=root.current?.ownerDocument;if(!document)return;const outside=(e:PointerEvent)=>{if(e.target instanceof Node&&!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',outside,true);return()=>document.removeEventListener('pointerdown',outside,true);},[open]);
  useModal(menu,open&&enabled,undefined,true);
  useClientLayoutEffect(()=>{if(!open||!enabled)return;radios.current[active]?.focus({preventScroll:true});},[open,enabled,active]);
  const defer=(e:SyntheticEvent<HTMLElement>,fn:()=>void)=>{if(!e.defaultPrevented&&!context.blocked)intents.set(e.nativeEvent,{type:'change',eventType:e.type,run:fn});};
  const close=()=>{setOpen(false);if(menu.current?.contains(menu.current.ownerDocument.activeElement))trigger.current?.focus({preventScroll:true});};
  const labels=[config.externalLabel,config.appdataLabel];const values:StorageLocation[]=['external','appdata'];
  resolved(config.state);id(config.label);id(config.externalLabel);id(config.appdataLabel);
  return <State state={config.state} className="mc-storage-toolbar__location"><div ref={root} className="mc-storage-location"><span className="mc-storage-location__label" id={`${name}-label`}>{config.label}</span><button ref={attach} className="mc-storage-location__trigger" type="button" aria-labelledby={`${name}-label ${name}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${name}-menu`} disabled={!enabled} onClick={e=>defer(e,()=>{setActive(value==='appdata'?1:0);setOpen(!open);})} onKeyDown={e=>{if(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229||e.altKey||e.ctrlKey||e.metaKey)return;if(['ArrowDown','ArrowUp'].includes(e.key))defer(e,()=>{setActive(value==='appdata'?1:0);setOpen(true);});}}><span id={`${name}-value`}>{config.toggleLabel!==undefined?config.toggleLabel:value==='external'?config.externalLabel:value==='appdata'?config.appdataLabel:''}</span><span className="mc-storage-location__chevron" aria-hidden="true"/></button>
    <div ref={menu} id={`${name}-menu`} className="mc-storage-location__popup" role="dialog" aria-label={config.label} hidden={!open||!enabled} aria-modal="true" onKeyDown={e=>{if(e.defaultPrevented||e.nativeEvent.isComposing||e.nativeEvent.keyCode===229||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey&&e.key!=='Tab')return;if(modalKey(e,menu.current))return;if(e.key==='Escape'&&!intents.has(e.nativeEvent))defer(e,close);}}><ScrollArea className="mc-storage-location__scroll" label={config.label} scale={scale} variant={context.inputMode==='touch'?'touch':'document'} thumbVisible={context.inputMode==='touch'?context.touchThumbVisible:undefined} minThumbSize={context.minThumbSize}><div role="radiogroup" aria-label={config.label}>{values.map((option,index)=><label key={option} className="mc-storage-location__option" data-checked={value===option}><input ref={node=>{radios.current[index]=node;}} type="radio" name={name} value={option} checked={value===option} disabled={!enabled} tabIndex={active===index?0:-1} aria-label={labels[index]} onFocus={()=>setActive(index)} onChange={e=>{if(context.readOnly||e.defaultPrevented||e.nativeEvent.defaultPrevented){e.currentTarget.checked=value===option;return;}const native=e;defer(e,()=>{onRequest(option,native);close();});}} onKeyDown={e=>{if(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='Escape')defer(e,close);else if(['ArrowUp','ArrowDown','Home','End'].includes(e.key))defer(e,()=>setActive(e.key==='Home'?0:e.key==='End'?1:1-index));else if(e.key==='Enter'&&!context.readOnly)defer(e,()=>{onRequest(option,e);close();});}}/><span className="mc-storage-location__radio" aria-hidden="true"/><span>{labels[index]}</span></label>)}</div></ScrollArea></div>
  </div></State>;
}

export const StorageToolbar=forwardRef<HTMLDivElement,StorageToolbarProps>(function StorageToolbar({state:rootState,location,clearCache,clearLayoutCache,clearDownloadCache,clearScreenshotsCache,deleteLocalScreenshots,multiselect,value,defaultValue={location:null,multiselect:false},onValueChange,locationRef,inputMode,touchThumbVisible,minThumbSize,disabled=false,readOnly=false,scale=2,onAction,onClick,onChange,onKeyDown,className,style,...props},ref){
  scrollInputs(inputMode,touchThumbVisible,minThumbSize);
  const s=guiScale(scale),parent=useContext(Context),receive=useOwner(onAction),[local,setLocal]=useState<StorageToolbarValue>({...toolbarValue(defaultValue)}),accepted=toolbarValue(value??local),blocked=disabled||parent.blocked||!rootState.visible||!rootState.enabled,readonly=readOnly||parent.readOnly;
  const multiBlocked=blocked||!multiselect.state.visible||!multiselect.state.enabled;
  resolved(rootState);resolved(multiselect.state);id(multiselect.label);
  const update=(next:StorageToolbarValue,field:StorageChangeDetail['field'],event:SyntheticEvent<HTMLElement>)=>{if(blocked||readonly||event.defaultPrevented)return;if(value===undefined)setLocal({...next});onValueChange?.({...next},{field,event});};
  if(!rootState.included)return null;
  return <Context.Provider value={{...parent,defer:true,blocked,readOnly:readonly,inputMode:inputMode??parent.inputMode??'mouse',touchThumbVisible:touchThumbVisible??parent.touchThumbVisible,minThumbSize:minThumbSize??parent.minThumbSize}}><div {...props} ref={ref} className={`mc-storage-toolbar ${className??''}`} style={styleAt(s,style)} onClick={e=>{onClick?.(e);receive(e);}} onChange={e=>{onChange?.(e);receive(e);}} onKeyDown={e=>{onKeyDown?.(e);receive(e);}}><State state={rootState} className="mc-storage-toolbar__wrapper"><div className="mc-storage-toolbar__panel">
    <Location scale={s} config={location} value={accepted.location} forwarded={locationRef} onRequest={(next,e)=>update({...accepted,location:next},'location',e)}/>
    {([['clear-cache',clearCache],['clear-layout-cache',clearLayoutCache],['clear-download-cache',clearDownloadCache],['clear-screenshots-cache',clearScreenshotsCache],['delete-local-screenshots',deleteLocalScreenshots]] as const).map(([action,config])=><State key={action} state={config.state} className="mc-storage-toolbar__action"><ActionButton action={action} config={config}/></State>)}
    <State state={multiselect.state} className="mc-storage-toolbar__multiselect"><label className="mc-storage-toolbar__multiselect-label" data-checked={accepted.multiselect}><input ref={multiselect.ref} type="checkbox" aria-label={multiselect.label} checked={accepted.multiselect} disabled={multiBlocked} readOnly={readonly} aria-readonly={readonly||undefined} onClick={e=>{if(readonly){e.preventDefault();e.currentTarget.checked=accepted.multiselect;}}} onChange={e=>{const input=e.currentTarget,next=input.checked;if(multiBlocked||readonly||e.defaultPrevented||e.nativeEvent.defaultPrevented){input.checked=accepted.multiselect;return;}intents.set(e.nativeEvent,{type:'change',eventType:e.type,cancel:()=>{input.checked=accepted.multiselect;},run:event=>update({...accepted,multiselect:next},'multiselect',event)});}}/><span className="mc-storage-toolbar__multiselect-icon" aria-hidden="true"/><span className="mc-storage-toolbar__multiselect-text">{multiselect.label}</span></label></State>
  </div></State></div></Context.Provider>;
});

export const StorageSelectionFooter=forwardRef<HTMLDivElement,StorageSelectionFooterProps>(function StorageSelectionFooter({visible,deleteControl,disabled=false,readOnly=false,scale=2,onAction,onClick,className,style,...props},ref){
  const s=guiScale(scale),parent=useContext(Context),receive=useOwner(onAction);if(typeof visible!=='boolean')throw new TypeError('visible must be boolean');
  return <Context.Provider value={{...parent,defer:true,blocked:parent.blocked||disabled||!visible,readOnly:parent.readOnly||readOnly}}><div {...props} ref={ref} className={`mc-storage-selection-footer ${className??''}`} hidden={!visible} style={styleAt(s,style)} onClick={e=>{onClick?.(e);receive(e);}}><ActionButton action="delete-selected" config={deleteControl}/></div></Context.Provider>;
});

const focusSelector='button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])';
function focusNodes(node:HTMLElement){return Array.from(node.querySelectorAll<HTMLElement>(focusSelector)).filter(e=>!e.closest('[hidden],[inert]')&&e.getClientRects().length>0);}
function useModal(node:React.RefObject<HTMLDivElement|null>,open:boolean,initial?:Ref<HTMLButtonElement>,selfBranch=false){
  useClientLayoutEffect(()=>{const dialog=node.current;if(!open||!dialog)return;const doc=dialog.ownerDocument,previous=doc.activeElement as HTMLElement|null,overlay=selfBranch?dialog:dialog.parentElement!,changes:[HTMLElement,boolean][]=[];let branch:HTMLElement=overlay;
    while(branch.parentElement){for(const sibling of Array.from(branch.parentElement.children))if(sibling!==branch&&sibling instanceof HTMLElement){changes.push([sibling,sibling.inert]);sibling.inert=true;}if(branch.parentElement===doc.body)break;branch=branch.parentElement;}
    const preferred=initial&&typeof initial!=='function'?initial.current:null;(preferred&&!preferred.disabled?preferred:focusNodes(dialog)[0]??dialog).focus({preventScroll:true});
    const contain=(e:FocusEvent)=>{if(!dialog.closest('[inert]')&&e.target instanceof Node&&!dialog.contains(e.target))(focusNodes(dialog)[0]??dialog).focus({preventScroll:true});};doc.addEventListener('focusin',contain);
    return()=>{doc.removeEventListener('focusin',contain);for(const[e,before]of changes)e.inert=before;const active=doc.activeElement;if((active===doc.body||active instanceof Node&&overlay.contains(active))&&previous?.isConnected&&!previous.closest('[hidden],[inert]'))previous.focus({preventScroll:true});};
  },[node,open,initial,selfBranch]);
}
function modalKey(event:React.KeyboardEvent<HTMLDivElement>,node:HTMLDivElement|null){
  if(event.key!=='Tab'||event.defaultPrevented||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229||!node)return false;
  const options=focusNodes(node),index=options.indexOf(node.ownerDocument.activeElement as HTMLElement),next=event.shiftKey?index<=0?options.at(-1):options[index-1]:index<0||index===options.length-1?options[0]:options[index+1];intents.set(event.nativeEvent,{type:'change',eventType:event.type,run:()=>{(next??node).focus({preventScroll:true});}});return true;
}
function rect(button:StorageResolvedPopupButton,width:number){control(button);id(button.target);const r=button.rect;if(!Array.isArray(r)||r.length!==4||[...r].some(x=>!Number.isFinite(x))||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>width||r[1]+r[3]>30)throw new RangeError('resolved popup button rectangle must fit its source holder');return r;}
function rectStyle(r:readonly[number,number,number,number],scale:number):CSSProperties{return{position:'absolute',left:r[0]*scale,top:r[1]*scale,width:r[2]*scale,height:r[3]*scale};}
function validateGroups(groups:readonly StorageDependencyGroup[]){const keys=new Set<string>();for(const group of groups){id(group.id);if(keys.has(group.id))throw new RangeError('dependency group IDs must be unique');keys.add(group.id);const children=new Set<string>();for(const item of group.dependents){id(item.id);if(children.has(item.id))throw new RangeError('dependent IDs must be unique within their group');children.add(item.id);}control(group.remove);}}

export const StorageDependencyDialog=forwardRef<HTMLDivElement,StorageDependencyDialogProps>(function StorageDependencyDialog({open,frame:available,profile,title,description,groups,continueButton,continueScrollLabel,continueScrollRef,cancelButton,continueReady,onReachedEndChange,viewportRef,inputMode='mouse',touchThumbVisible=false,minThumbSize,disabled=false,readOnly=false,scale=2,onAction,onClick,onChange,onKeyDown,className,style,hidden:hostHidden,...props},ref){
  scrollInputs(inputMode,touchThumbVisible,minThumbSize);
  const s=guiScale(scale);pair(available,'frame');id(title);if(!['desktop','available-frame'].includes(profile)||typeof open!=='boolean'||!['mouse','touch'].includes(inputMode)||continueReady!==undefined&&typeof continueReady!=='boolean')throw new TypeError('invalid dependency dialog state');validateGroups(groups);open=open&&!hostHidden;
  const size:readonly[number,number]=profile==='desktop'?[372,218]:[positive(available[0]-4,'panel width',28),positive(available[1]-4,'panel height',55)];const left=rect(continueButton,size[0]-14),right=rect(cancelButton,size[0]-14);
  const parent=useContext(Context),receive=useOwner(onAction),dialog=useRef<HTMLDivElement>(null),[,attach]=useRefPair(ref),[viewport,attachViewport]=useRefPair(viewportRef),[cancelNode,cancelRef]=useRefPair(cancelButton.ref),[reached,setReached]=useState(false),reported=useRef<boolean|undefined>(undefined),textId=useId();
  const blocked=disabled||parent.blocked||!open;useModal(dialog,open,cancelNode);
  const measure=useCallback(()=>{const node=viewport.current;if(!node||!open)return;const next=node.scrollHeight-node.clientHeight<=.5||node.scrollTop>=node.scrollHeight-node.clientHeight-.5;setReached(next);if(reported.current!==next){reported.current=next;onReachedEndChange?.(next);}},[viewport,open,onReachedEndChange]);
  useClientLayoutEffect(()=>{const v=viewport.current;if(!open||!v)return;measure();const ro=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure);ro?.observe(v);if(v.firstElementChild)ro?.observe(v.firstElementChild);const mo=typeof MutationObserver==='undefined'?undefined:new MutationObserver(measure);mo?.observe(v,{childList:true,subtree:true,characterData:true});return()=>{ro?.disconnect();mo?.disconnect();};},[open,measure,viewport,groups]);
  const ready=continueReady??reached;
  return <Context.Provider value={{...parent,defer:true,blocked,readOnly:parent.readOnly||readOnly}}><div {...props} ref={attach} className={`mc-storage-modal mc-storage-dependency ${className??''}`} hidden={!open} style={styleAt(s,{width:available[0]*s,height:available[1]*s,...style})} onClick={e=>{onClick?.(e);receive(e);}} onChange={e=>{onChange?.(e);receive(e);}} onKeyDown={e=>{onKeyDown?.(e);if(e.defaultPrevented||e.nativeEvent.isComposing||e.nativeEvent.keyCode===229||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey&&e.key!=='Tab')return;if(modalKey(e,dialog.current)){receive(e);return;}if(e.key==='Escape'&&open&&!disabled&&!parent.blocked){queueAction(e,'dependency-cancel',{state:allOn,label:cancelButton.label,target:targets['dependency-cancel']},parent,undefined,undefined,'escape');}receive(e);}}>
    <div ref={dialog} className="mc-storage-modal__panel" role="dialog" aria-modal="true" aria-labelledby={textId} tabIndex={-1} style={{width:size[0]*s,height:size[1]*s,'--mc-storage-fill-alpha':.98} as CSSProperties}><span className="mc-storage-modal__skin" aria-hidden="true"/><span className="mc-storage-modal__fill" aria-hidden="true"/><h2 id={textId} className="mc-storage-modal__title">{title}</h2>
      <div className="mc-storage-dependency__region"><ScrollArea scale={s} variant={inputMode==='touch'?'touch':'document'} thumbVisible={inputMode==='touch'?touchThumbVisible:undefined} minThumbSize={minThumbSize} className={`mc-storage-dependency__scroll mc-storage-scroll--${inputMode}`} viewportRef={attachViewport} label={description||title} onScrollPositionChange={measure}>
        <div className="mc-storage-dependency__description">{description}</div>{groups.map(group=><div key={group.id} className="mc-storage-dependency__group" data-storage-dependency-id={group.id}><div className="mc-storage-dependency__group-body"><div className="mc-storage-dependency__top-pad"/><div className="mc-storage-dependency__item"><Metadata item={group.item} kind="resource" presentation="dependency"/></div><div className="mc-storage-dependency__break">{group.breakLabel}</div><div className="mc-storage-dependency__dependents">{group.dependents.map(item=>item.state.included&&<div key={item.id} hidden={!item.state.visible} className="mc-storage-dependency__dependent" data-storage-dependent-id={item.id}><Metadata item={item} kind="resource" presentation="dependent"/></div>)}</div><div className="mc-storage-dependency__remove"><ActionButton action="remove-dependencies" config={group.remove} itemId={group.id}/></div><div className="mc-storage-dependency__bottom-pad"/></div><div className="mc-storage-dependency__gap"/></div>)}
      </ScrollArea></div>
      <div className="mc-storage-dependency__buttons"><ActionButton action="dependency-continue" controlName="disabled-left" config={{...continueButton,ref:continueScrollRef,label:continueScrollLabel,state:{...continueButton.state,visible:continueButton.state.visible&&!ready,enabled:false},nativeProps:{...continueButton.nativeProps,id:continueButton.nativeProps?.id?`${continueButton.nativeProps.id}-scroll`:`${textId}-continue-scroll`,'aria-label':continueScrollLabel}}} disabled style={rectStyle(left,s)}/><ActionButton action="dependency-continue" controlName="left" config={{...continueButton,state:{...continueButton.state,visible:continueButton.state.visible&&ready},nativeProps:{...continueButton.nativeProps,id:continueButton.nativeProps?.id??`${textId}-continue`}}} style={rectStyle(left,s)}/><ActionButton action="dependency-cancel" controlName="right" config={{...cancelButton,ref:cancelRef}} style={rectStyle(right,s)}/></div>
    </div>
  </div></Context.Provider>;
});

export const StorageSharingProgress=forwardRef<HTMLDivElement,StorageSharingProgressProps>(function StorageSharingProgress({open,frame:available,title,currentLabel,totalLabel,progressLabel,progress,button:buttonControl,disabled=false,readOnly=false,scale=2,onAction,onClick,onKeyDown,className,style,hidden:hostHidden,...props},ref){
  if(typeof open!=='boolean')throw new TypeError('open must be boolean');open=open&&!hostHidden;
  pair(available,'frame');const s=guiScale(scale),parent=useContext(Context),receive=useOwner(onAction),node=useRef<HTMLDivElement>(null),[,attach]=useRefPair(ref),titleId=useId();id(title);id(progressLabel);control(buttonControl);if(!Number.isFinite(progress)||progress<0||progress>1)throw new RangeError('progress must be0..1');useModal(node,open);
  return <Context.Provider value={{...parent,defer:true,blocked:parent.blocked||disabled||!open,readOnly:parent.readOnly||readOnly}}><div {...props} ref={attach} className={`mc-storage-modal mc-storage-sharing ${className??''}`} hidden={!open} style={styleAt(s,{width:available[0]*s,height:available[1]*s,...style})} onClick={e=>{onClick?.(e);receive(e);}} onKeyDown={e=>{onKeyDown?.(e);if(e.defaultPrevented||e.nativeEvent.isComposing||e.nativeEvent.keyCode===229||e.altKey||e.ctrlKey||e.metaKey)return;if(modalKey(e,node.current)){receive(e);return;}if(e.key==='Escape'&&open&&!disabled&&!parent.blocked)queueAction(e,'sharing-cancel',{state:allOn,label:buttonControl.label,target:targets['sharing-cancel']},parent,undefined,undefined,'escape');receive(e);}}><div ref={node} className="mc-storage-modal__panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} style={{width:268*s,height:95*s,'--mc-storage-fill-alpha':.8} as CSSProperties}><span className="mc-storage-modal__skin" aria-hidden="true"/><span className="mc-storage-modal__fill" aria-hidden="true"/><h2 id={titleId} className="mc-storage-modal__title">{title}</h2><div className="mc-storage-sharing__content"><div className="mc-storage-sharing__labels"><span>{currentLabel}</span><span>{totalLabel}</span></div><div className="mc-storage-sharing__progress" role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress*100}><span className="mc-storage-sharing__empty"/><span className="mc-storage-sharing__full" style={{clipPath:`inset(0 ${(1-progress)*100}% 0 0)`}}/><span className="mc-storage-sharing__nub"/></div></div><div className="mc-storage-sharing__button"><ActionButton action="sharing-button" config={buttonControl}/></div></div></div></Context.Provider>;
});

/** Actual Settings content host: toolbar and categories scroll together; only the selection footer is outside. */
export const StorageManagement=forwardRef<HTMLElement,StorageManagementProps>(function StorageManagement({size,label,state:rootState,standardVisible,categoryPanelVisible,toolbar,categories,legacyWorlds,retailToPreviewWorlds,deleteControl,value,defaultValue={location:null,multiselect:false,expandedIds:[],selectedIds:[]},onValueChange,onAction,inputMode='mouse',touchThumbVisible=false,minThumbSize,viewportRef,toolbarRef,footerRef,locationRef,categoryRefs,itemRefs,selectionRefs,dependencyDialog,sharingProgress,disabled=false,readOnly=false,scale=2,onClick,onChange,onKeyDown,className,style,...props},ref){
  scrollInputs(inputMode,touchThumbVisible,minThumbSize);
  const [w,h]=pair(size),s=guiScale(scale),parent=useContext(Context),receive=useOwner(onAction),[local,setLocal]=useState(()=>copyValue(fullValue(defaultValue))),accepted=fullValue(value??local);positive(w,'content width',10);id(label);resolved(rootState);
  if(typeof standardVisible!=='boolean'||typeof categoryPanelVisible!=='boolean'||!['mouse','touch'].includes(inputMode))throw new TypeError('invalid storage presentation state');
  if(legacyWorlds&&legacyWorlds.kind!=='legacy-world'||retailToPreviewWorlds&&retailToPreviewWorlds.kind!=='retail-to-preview-world')throw new TypeError('migration kind does not match its named source branch');
  if(dependencyDialog?.open&&sharingProgress?.open)throw new RangeError('one Storage modal may be open in a content host');
  const categoryIds=new Set<string>(),itemIds=new Set<string>();const all=[...categories,...legacyWorlds?[legacyWorlds]:[],...retailToPreviewWorlds?[retailToPreviewWorlds]:[]];
  for(const group of all){id(group.id);if(categoryIds.has(group.id))throw new RangeError('category IDs must be globally unique');categoryIds.add(group.id);for(const item of group.items){id(item.id);if(itemIds.has(item.id))throw new RangeError('item IDs must be globally unique in StorageManagement');itemIds.add(item.id);}}
  const blocked=disabled||parent.blocked||!rootState.enabled||!rootState.visible,readonly=readOnly||parent.readOnly;
  const update=(next:StorageManagementValue,detail:StorageChangeDetail)=>{if(blocked||detail.event.defaultPrevented||readonly&&detail.field!=='expandedIds')return;const copy=copyValue(fullValue(next));if(value===undefined)setLocal(copy);onValueChange?.(copyValue(copy),detail);};
  const renderCategory=(category:StorageCategoryData|StorageMigrationCategoryData)=><StorageCategory key={category.id} ref={ownRef(categoryRefs,category.id)} category={category} expanded={accepted.expandedIds.includes(category.id)} selectedIds={accepted.selectedIds} itemRefs={itemRefs} selectionRefs={selectionRefs} scale={s} onExpandedChange={(next,event)=>update({...accepted,expandedIds:next?[...accepted.expandedIds,category.id]:accepted.expandedIds.filter(id=>id!==category.id)},{field:'expandedIds',event,categoryId:category.id})} onSelectedIdsChange={(next,itemId,event)=>update({...accepted,selectedIds:[...next]},{field:'selectedIds',event,categoryId:category.id,itemId})}/>;
  if(!rootState.included)return null;
  return <Context.Provider value={{...parent,defer:true,blocked,readOnly:readonly,value:copyValue(accepted),width:w,inputMode,touchThumbVisible,minThumbSize,modalOpen:!!(dependencyDialog?.open||sharingProgress?.open)}}><section {...props} ref={ref} aria-label={props['aria-label']??label} role={props.role??'region'} hidden={!rootState.visible} className={`mc-storage-management ${className??''}`} style={styleAt(s,{width:w*s,height:h*s,...style})} onClick={e=>{onClick?.(e);receive(e);}} onChange={e=>{onChange?.(e);receive(e);}} onKeyDown={e=>{onKeyDown?.(e);receive(e);}}><ScrollArea scale={s} variant={inputMode==='touch'?'touch':'document'} thumbVisible={inputMode==='touch'?touchThumbVisible:undefined} minThumbSize={minThumbSize} className={`mc-storage-management__scroll mc-storage-scroll--${inputMode}`} viewportRef={viewportRef} label={label}>
    <StorageToolbar {...toolbar} ref={toolbarRef} state={{...toolbar.state,visible:toolbar.state.visible&&standardVisible}} value={{location:accepted.location,multiselect:accepted.multiselect}} locationRef={locationRef} scale={s} inputMode={inputMode} touchThumbVisible={touchThumbVisible} minThumbSize={minThumbSize} onValueChange={(next,detail)=>update({...accepted,...next},detail)}/><Context.Provider value={{...parent,defer:true,blocked:blocked||!categoryPanelVisible,readOnly:readonly,value:copyValue(accepted),width:w,inputMode,touchThumbVisible,minThumbSize}}><div className="mc-storage-management__categories" hidden={!categoryPanelVisible}><Context.Provider value={{...parent,defer:true,blocked:blocked||!categoryPanelVisible||!standardVisible,readOnly:readonly,value:copyValue(accepted),width:w,inputMode,touchThumbVisible,minThumbSize}}><div className="mc-storage-management__standard" hidden={!standardVisible}>{categories.map(renderCategory)}</div></Context.Provider>{legacyWorlds&&renderCategory(legacyWorlds)}{retailToPreviewWorlds&&renderCategory(retailToPreviewWorlds)}</div></Context.Provider><div className="mc-storage-management__selection-padding" hidden={!accepted.multiselect}/>
  </ScrollArea><StorageSelectionFooter ref={footerRef} visible={standardVisible&&accepted.multiselect} deleteControl={deleteControl} scale={s}/>{dependencyDialog&&<StorageDependencyDialog {...dependencyDialog} open={dependencyDialog.open&&rootState.visible} scale={s} disabled={blocked} readOnly={readonly}/>} {sharingProgress&&<StorageSharingProgress {...sharingProgress} open={sharingProgress.open&&rootState.visible} scale={s} disabled={blocked} readOnly={readonly}/>}</section></Context.Provider>;
});
