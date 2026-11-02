import {forwardRef, useId} from 'react';
import type {ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode} from 'react';
import {Image} from './image';
import {Combobox} from './combobox';
import {progressAssets} from './progress-assets';
import {useClassicNodeRef} from './classic-screen-lifecycle';
import {PlaySourceButton, PlaySourceScroll, PlaySourceBackground, PlayStatus, PlayLoading, PlayWarning, playAsset, playDimension, playImage, playSize, playStyle, playText,planPlaySourceScrollGeometry} from './play-screen-parts';
import type {PlayActionHandler, PlaySourceImage} from './play-screen-parts';

/** A required external family dependency, not an implemented Realms card.
 * The host resolves the source family and its intrinsic engine expression to
 * a finite logical height. Visible missing dependencies fail before paint. */
export interface PlayExternalFamilyDependency<TSource extends string=string> {readonly sourcePath:TSource;readonly height:number;readonly content:ReactNode}
export interface PlayWorldRecord {
  readonly id:string;readonly name:string;readonly date:string;readonly gameMode:string;readonly fileSize:string;
  readonly thumbnail:PlaySourceImage|null;readonly enabled:boolean;readonly payload?:unknown;
  readonly lockVisible?:boolean;readonly realmsPlusExpired?:boolean;readonly realmsPlusOverlay?:PlayExternalFamilyDependency<'play.collection_world_screenshot.gradient_container_stacked_panel'>;
  readonly ownership?:{readonly visible:boolean;readonly text:string;readonly frame:number};
}
export type PlayWorldCollection='local_worlds'|'legacy_worlds'|'beta_retail_local_worlds'|'beta_retail_legacy_worlds';
export interface PlayWorldRowProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'> {
  readonly item:PlayWorldRecord;readonly collection:PlayWorldCollection;readonly index:number;readonly width:number;readonly scale:number;
  readonly labels:{readonly edit:string;readonly delete:string;readonly migrate:string};readonly onAction?:PlayActionHandler;
  readonly localWorldUpload?:boolean;readonly editVisible?:boolean;readonly legacyShareStorage?:boolean;readonly legacySupportsMigration?:boolean;
  readonly disabled?:boolean;readonly readOnly?:boolean;
  readonly mainButtonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'type'|'disabled'>;
  readonly secondaryButtonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'type'|'disabled'>;
}
export interface PlayNetworkWorldRecord {
  readonly id:string;readonly name:string;readonly details:string;readonly playerCount:string;readonly enabled:boolean;readonly payload?:unknown;
  readonly gameOnline:boolean;readonly gameUnavailable:boolean;readonly gameOffline:boolean;readonly statusLabel:string;
  readonly hardcoreVisible:boolean;readonly hardcoreLabel:string;readonly headerIconVisible:boolean;readonly headerIcon:PlaySourceImage|null;
  readonly hideNetworkIcon:boolean;readonly networkIcon:PlaySourceImage|null;
}
export interface PlayNetworkWorldRowProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'> {
  readonly item:PlayNetworkWorldRecord;readonly collection:string;readonly index:number;readonly width:number;readonly scale:number;
  readonly crossPlatformEnabled:boolean;readonly ignoreCrossplay?:boolean;readonly onAction?:PlayActionHandler;readonly disabled?:boolean;readonly readOnly?:boolean;
  readonly buttonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'type'|'disabled'>;
}
function bool(value:unknown,name:string){if(typeof value!=='boolean')throw new TypeError(`Play ${name} must be an explicit boolean.`);}
function count(value:number,name:string,max=10000){if(!Number.isSafeInteger(value)||value<0||value>max)throw new RangeError(`Play ${name} must be an integer within0..${max}.`);}
function dependency(value:PlayExternalFamilyDependency|undefined,path:string,scale:number):PlayExternalFamilyDependency {
  if(!value||value.sourcePath!==path||value.content===undefined||value.content===null||value.content===false)throw new TypeError(`Visible Play branch requires an external family dependency: ${path}`);
  playDimension(value.height*scale,'external family height',true);return value;
}
function worldPlan(item:PlayWorldRecord,scale:number,active=true){
  if(!item||typeof item!=='object')throw new TypeError('Play world record is required.');
  for(const key of['id','name','date','gameMode','fileSize'] as const)playText(item[key],`world ${key}`);bool(item.enabled,'world.enabled');
  if(item.thumbnail!==null)playImage(item.thumbnail,'world thumbnail');
  if(item.lockVisible!==undefined)bool(item.lockVisible,'world lock');
  if(item.realmsPlusExpired!==undefined)bool(item.realmsPlusExpired,'RealmsPlus expiry');
  if(item.realmsPlusExpired&&active)dependency(item.realmsPlusOverlay,'play.collection_world_screenshot.gradient_container_stacked_panel',scale);
  if(item.lockVisible&&active)playAsset('textures/ui/lock');
  if(item.ownership){bool(item.ownership.visible,'ownership visible');playText(item.ownership.text);count(item.ownership.frame,'ownership frame',9);if(item.ownership.visible&&active)playAsset('textures/ui/DarkBannerNoBorder');}
}
function networkPlan(item:PlayNetworkWorldRecord){
  if(!item||typeof item!=='object')throw new TypeError('Play network world is required.');
  for(const key of['id','name','details','playerCount','statusLabel','hardcoreLabel']as const)playText(item[key],key);
  for(const key of['enabled','gameOnline','gameUnavailable','gameOffline','hardcoreVisible','headerIconVisible','hideNetworkIcon']as const)bool(item[key],key);
  if(item.headerIconVisible){if(!item.headerIcon)throw new TypeError('Visible Play network header icon requires its whole host image.');playImage(item.headerIcon);}
  if(!item.hideNetworkIcon){if(!item.networkIcon)throw new TypeError('Visible Play network type icon requires its whole host image.');playImage(item.networkIcon);}
}
function Ownership({item,width,scale}:{item:PlayWorldRecord;width:number;scale:number}){
  if(!item.ownership?.visible)return null;const strip=progressAssets['textures/ui/loading_bar'];
  const barWidth=width*.75,barHeight=((29-4-2-2)/2)*.75;
  return <span className="mc-play-world-row__ownership">
    <span className="mc-play-world-row__ownership-skin" style={{maskImage:`url(${JSON.stringify(playAsset('textures/ui/DarkBannerNoBorder').url)})`}}/>
    <span className="mc-play-world-row__ownership-bar" style={{width:barWidth*scale,height:barHeight*scale,marginLeft:-barWidth*scale/2}}><Image src={strip.url} sourceSize={[strip.width,strip.height]} size={[barWidth*10,barHeight]} scale={scale} alt="" style={{position:'absolute',left:-item.ownership.frame*barWidth*scale,top:0}}/></span>
    <span className="mc-play-world-row__ownership-text">{item.ownership.text}</span>
  </span>;
}

/** Source rows only: no filesystem, world mutation, selection model or list scroll wrapper. */
export const PlayWorldRow=forwardRef<HTMLDivElement,PlayWorldRowProps>(function PlayWorldRow({item,collection,index,width,scale,labels,onAction,localWorldUpload=false,editVisible=true,legacyShareStorage=false,legacySupportsMigration=false,disabled=false,readOnly=false,mainButtonProps,secondaryButtonProps,className,style,...native},ref){
  const local=collection==='local_worlds';
  playSize([width,30],scale);if(width<84)throw new RangeError('Play world row must provide at least84 logical pixels.');count(index,'world index');worldPlan(item,scale,local);
  if(!['local_worlds','legacy_worlds','beta_retail_local_worlds','beta_retail_legacy_worlds'].includes(collection))throw new TypeError('Play world collection must identify its source collection.');
  for(const [name,value]of Object.entries({localWorldUpload,editVisible,legacyShareStorage,legacySupportsMigration,disabled,readOnly}))bool(value,name);
  for(const key of['edit','delete','migrate']as const)playText(labels?.[key],key);
  const [,attach]=useClassicNodeRef(ref),legacy=collection==='legacy_worlds';
  const branches:('edit'|'delete'|'migrate'|'single'|'beta')[]=legacy?[...(legacyShareStorage?['delete' as const]:[]),...(legacySupportsMigration?['migrate' as const]:[]),...(!legacyShareStorage&&!legacySupportsMigration?['single' as const]:[])]:local?['edit']:['beta'];
  const target=local?(localWorldUpload?'button.local_world_upload':'button.menu_start_local_world'):legacy?'button.convert_legacy_world':collection==='beta_retail_local_worlds'?'button.import_beta_retail_local_world':'button.import_beta_retail_legacy_world';
  return <div {...native} ref={attach} role={native.role??'listitem'} className={['mc-play-world-row',className].filter(Boolean).join(' ')} data-source-collection={collection} data-world-id={item.id}
    data-source-y-policy="resolved-height-web" data-source-picture-width="173.91%y"
    style={playStyle(scale,{...style,width:width*scale,height:29*scale,'--mc-play-indent':`url(${JSON.stringify(playAsset('textures/ui/default_indent').url)})`,'--mc-play-screenshot-focus':`url(${JSON.stringify(playAsset('textures/ui/world_screenshot_focus_border').url)})`,'--mc-play-lock':item.lockVisible?`url(${JSON.stringify(playAsset('textures/ui/lock').url)})`:undefined}as CSSProperties)}>
    {branches.map(branch=>{const secondary=branch==='edit'?editVisible:branch==='delete'||branch==='migrate';return <div key={branch} className="mc-play-world-row__branch" data-source-branch={branch} style={{width:width*scale,height:30*scale}}>
      <PlaySourceButton {...mainButtonProps} className="mc-play-world-row__main" label={item.name} target={target} scale={scale} onAction={onAction} collection={collection} index={index} itemId={item.id} payload={item.payload}
        disabled={disabled||!item.enabled} readOnly={readOnly} style={{width:(branch==='beta'||branch==='single'?width+1:width-(secondary?31:2))*scale,height:30*scale}}>
        <span className="mc-play-world-row__thumbnail">
          {item.thumbnail&&<Image src={item.thumbnail.src} sourceSize={item.thumbnail.sourceSize} size={[38.2602,22]} scale={scale} alt=""/>}
          {local&&item.realmsPlusExpired&&<span className="mc-play-world-row__realms-plus">{item.realmsPlusOverlay!.content}</span>}
        </span>
        <span className="mc-play-world-row__text"><span className="mc-play-world-row__line"><span className="mc-play-world-row__name">{item.name}</span>{local&&item.lockVisible&&<span className="mc-play-world-row__lock" aria-hidden="true"/>}<span className="mc-play-world-row__secondary">{item.date}</span></span><span className="mc-play-world-row__line mc-play-world-row__secondary"><span>{item.gameMode}</span><span>{item.fileSize}</span></span></span>
      </PlaySourceButton>
      {secondary&&<PlaySourceButton {...secondaryButtonProps} className="mc-play-world-row__action" label={`${labels[branch as 'edit'|'delete'|'migrate']} ${item.name}`} target={branch==='edit'?'button.menu_local_world_item_edit':branch==='delete'?'button.menu_legacy_world_item_delete':'button.menu_legacy_world_item_migrate'} scale={scale} onAction={onAction} collection={collection} index={index} itemId={item.id} payload={item.payload} disabled={disabled||!item.enabled||(local&&!!item.ownership?.visible)} readOnly={readOnly} style={{right:scale,width:29*scale,height:30*scale}}>{(()=>{const asset=playAsset(branch==='edit'?'textures/ui/editIcon':branch==='delete'?'textures/ui/trash_light':'textures/ui/world_download');return <Image src={asset.url} sourceSize={[asset.width,asset.height]} size={branch==='migrate'?[15,16]:[22,16]} scale={scale} alt=""/>;})()}</PlaySourceButton>}
    </div>;})}
    {local&&<Ownership item={item} width={width} scale={scale}/>}
  </div>;
});

export const PlayNetworkWorldRow=forwardRef<HTMLDivElement,PlayNetworkWorldRowProps>(function PlayNetworkWorldRow({item,collection,index,width,scale,crossPlatformEnabled,ignoreCrossplay=false,onAction,disabled=false,readOnly=false,buttonProps,className,style,...native},ref){
  playSize([width,31],scale);count(index,'network index');playText(collection);bool(crossPlatformEnabled,'crossPlatformEnabled');bool(ignoreCrossplay,'ignoreCrossplay');networkPlan(item);
  const [,attach]=useClassicNodeRef(ref);
  return <div {...native} ref={attach} role={native.role??'listitem'} className={['mc-play-network-row',className].filter(Boolean).join(' ')} style={playStyle(scale,{...style,width:width*scale,height:30*scale,'--mc-play-online':`url(${JSON.stringify(playAsset('textures/ui/online').url)})`,'--mc-play-offline':`url(${JSON.stringify(playAsset('textures/ui/offline').url)})`}as CSSProperties)} data-source-collection={collection} data-network-id={item.id} data-cross-platform-enabled={crossPlatformEnabled} data-ignore-crossplay={ignoreCrossplay}>
    <PlaySourceButton {...buttonProps} className="mc-play-network-row__main" label={[item.name,item.details,item.playerCount,item.statusLabel].filter(Boolean).join(', ')} target="button.menu_network_world_item" scale={scale} onAction={onAction} collection={collection} index={index} itemId={item.id} payload={item.payload} disabled={disabled||!item.enabled} readOnly={readOnly} style={{width:width*scale,height:31*scale}}>
      <span className="mc-play-network-row__text"><span className="mc-play-network-row__header">{item.headerIconVisible&&<Image src={item.headerIcon!.src} sourceSize={item.headerIcon!.sourceSize} size={[10,10]} scale={scale} alt=""/>}<span>{item.name}</span></span><span className="mc-play-network-row__details">{item.details}</span></span>
      <span className="mc-play-network-row__status"><span className="mc-play-network-row__count"><span>{item.playerCount}</span><span className="mc-play-network-row__icons" aria-hidden="true">{item.gameOnline&&<span className="mc-play-network-row__online"/>}{item.gameUnavailable&&<span className="mc-play-network-row__offline"/>}{item.gameOffline&&<span className="mc-play-network-row__offline"/>}</span></span>{item.hardcoreVisible&&<span>{item.hardcoreLabel}</span>}</span>
      {!item.hideNetworkIcon&&<span className="mc-play-network-row__type"><Image src={item.networkIcon!.src} sourceSize={item.networkIcon!.sourceSize} size={[14,14]} scale={scale} alt=""/></span>}
    </PlaySourceButton>
    {!ignoreCrossplay&&!crossPlatformEnabled&&<PlaySourceButton className="mc-play-network-row__tts-border" label={[item.name,item.details,item.playerCount,item.statusLabel].filter(Boolean).join(', ')} target="button.focus_filler" scale={scale} onAction={onAction} collection={collection} index={index} itemId={item.id} payload={item.payload} disabled={disabled} readOnly={readOnly} surface="outline" data-source-control="common.tts_activate_sibling" data-focus-policy="native-html-focus-filler" style={{width:width*scale,height:30*scale}}/>}
  </div>;
});

/** Explicit one-column source grid capacity. Missing indices selects a dense,
 * ordered leading snapshot; supplied indices preserve sparse native identity.
 * Empty tail slots reserve geometry and never synthesize a world record. */
export interface PlayWorldCollectionData {readonly items:readonly PlayWorldRecord[];readonly rowCount:number;readonly indices?:readonly number[]}
export interface PlayNetworkCollectionData {readonly items:readonly PlayNetworkWorldRecord[];readonly rowCount:number;readonly indices?:readonly number[]}
export interface PlayContentProvider {
  readonly isRealmsEnabled:boolean;readonly crossPlatformEnabled:boolean;readonly educationEdition:boolean;readonly worldPickerScreen:boolean;
  readonly localWorldUpload:boolean;readonly worldArchiveSupport:boolean;readonly supportsLegacyWorlds:boolean;readonly autoFetchLegacyWorlds:boolean;
  readonly legacyWorldsShareStorage:boolean;readonly legacyWorldsSupportsMigration:boolean;
}
export interface PlayContentLoading {readonly message:string;readonly height:number;readonly frame:number;readonly barsVisible:boolean;readonly placeholderRows:number}
export interface PlayContentWarning {readonly text:string;readonly height:number;readonly moreInfoWidth:number}
type PaneNative=Omit<HTMLAttributes<HTMLDivElement>,'children'|'inputMode'|'dangerouslySetInnerHTML'>;
interface PaneBase extends PaneNative {readonly size:readonly[number,number];readonly scale:number;readonly inputMode:'mouse'|'touch';readonly disabled?:boolean;readonly readOnly?:boolean;readonly onAction?:PlayActionHandler;readonly warning?:PlayContentWarning}
export interface PlayWorldsFlags {
  readonly deviceSunsetting:boolean;readonly showNewPlayScreenOptIn:boolean;readonly personalRealmsGridVisible:boolean;readonly realmLabelVisible:boolean;
  readonly realmsSignInVisible:boolean;readonly freePreviewVisible:boolean;readonly freePreviewNewOfferVisible:boolean;readonly createOnRealmsVisible:boolean;
  readonly loadingPersonalRealmsVisible:boolean;readonly realmTrialVisible:boolean;readonly nintendoFirstPurchaseVisible:boolean;readonly multiplayerBlockedVisible:boolean;
  readonly openAccountUriVisible:boolean;readonly openAccountGamecoreVisible:boolean;readonly localWorldsVisible:boolean;readonly noLocalWorlds:boolean;
  readonly noLocalSwitchSettingVisible:boolean;readonly noLocalSwitchVisible:boolean;readonly noLocalHelpVisible:boolean;
  readonly betaRetailLocalWorldsVisible:boolean;readonly syncLegacyWorldsButtonVisible:boolean;readonly loadingLegacyWorldsVisible:boolean;readonly legacyWorldsVisible:boolean;readonly betaRetailLegacyWorldsVisible:boolean;
}
export interface PlayWorldsLabels {
  readonly worlds:string;readonly legacyWorlds:string;readonly betaLocal:string;readonly betaLegacy:string;readonly realms:string;
  readonly create:string;readonly quickPlay:string;readonly optIn:string;readonly import:string;readonly signIn:string;readonly freePreview:string;readonly createOnRealms:string;readonly trial:string;readonly nintendoPurchase:string;
  readonly noLocal:string;readonly noLocalSwitch:string;readonly storageType:string;readonly storageExternal:string;readonly storagePackage:string;readonly help:string;readonly noLocalHelp:string;
  readonly syncLegacy:string;readonly dontSeeLegacy:string;readonly crossPlatformDisabled:string;readonly blocked:string;readonly accountSettings:string;readonly accountGamecore:string;readonly warningMoreInfo:string;
  readonly editWorld:string;readonly deleteWorld:string;readonly migrateWorld:string;
  readonly storageUsage:string;
}
export interface PlayWorldsContentProps extends PaneBase {
  readonly provider:PlayContentProvider;readonly flags:PlayWorldsFlags;readonly labels:PlayWorldsLabels;
  readonly localWorlds:PlayWorldCollectionData;readonly legacyWorlds:PlayWorldCollectionData;readonly betaRetailLocalWorlds:PlayWorldCollectionData;readonly betaRetailLegacyWorlds:PlayWorldCollectionData;
  readonly loadingPersonalRealms:PlayContentLoading;readonly loadingLegacyWorlds:PlayContentLoading;
  readonly externalFamilies?:{
    readonly personalRealms?:PlayExternalFamilyDependency<'play.realms_world_item_grid/personal_realms'>;
    readonly freePreview?:PlayExternalFamilyDependency<'play.realms_trial_content_panel/free_preview'>;
    readonly trial?:PlayExternalFamilyDependency<'play.realms_trial_content_panel/trial'>;
    readonly nintendoPurchase?:PlayExternalFamilyDependency<'play.realms_trial_content_panel/nintendo_first_purchase'>;
    readonly newOffer?:PlayExternalFamilyDependency<'common_store.new_offer_icon'>;
  };
  readonly storage?:{readonly enabled:boolean;readonly value:'external'|'package';readonly onValueChange?:(value:'external'|'package')=>void;readonly toggleLabel:string};
  readonly worldLabelColors?:{readonly local:string;readonly legacy:string};
  /** Host-resolved100%c height; clip meaning is an explicit Web policy. */
  readonly storageUsage?:{readonly contentHeight:number;readonly localClipRatio:number;readonly legacyClipRatio:number;readonly clipPolicy:'visible-fraction-web'|'left-removal-web'};
}
export interface PlayFriendsProvider {readonly isRealmsEnabled:boolean;readonly crossPlatformEnabled:boolean;readonly supportsAddFriend:boolean;readonly nxOs:boolean;readonly isPs4:boolean;readonly editorMode:boolean;readonly educationEdition:boolean;readonly addFriendNotVisible:boolean;readonly inboxEnabled:boolean}
export interface PlayFriendsFlags {
  readonly deviceSunsetting:boolean;readonly addFriendButtonVisible:boolean;readonly joinByCodeVisible:boolean;readonly notificationVisible:boolean;
  readonly joinableRealmsPanelVisible:boolean;readonly friendsRealmsVisible:boolean;readonly realmsSignInVisible:boolean;readonly loadingFriendsRealmsVisible:boolean;readonly offlineAuthCodeVisible:boolean;readonly noFriendsRealmsVisible:boolean;
  readonly friendsGridVisible:boolean;readonly noFriendsMessageVisible:boolean;readonly crossPlatformFriendsGridVisible:boolean;readonly noCrossPlatformFriendsMessageVisible:boolean;readonly generalNoMultiplayerVisible:boolean;readonly lanGridVisible:boolean;readonly openAccountGamecoreVisible:boolean;
}
export interface PlayFriendsLabels {
  readonly addFriend:string;readonly joinByCode:string;readonly notification:string;readonly joinableRealms:string;readonly signIn:string;readonly offlineAuthCode:string;readonly noFriendsRealms:string;
  readonly friends:string;readonly noFriends:string;readonly findCrossPlatformFriend:string;readonly crossPlatformFriends:string;readonly noCrossPlatformFriends:string;readonly generalNoMultiplayer:string;readonly lan:string;readonly accountGamecore:string;readonly crossPlatformDisabled:string;readonly warningMoreInfo:string;
}
export interface PlayFriendsContentProps extends PaneBase {
  readonly provider:PlayFriendsProvider;readonly flags:PlayFriendsFlags;readonly labels:PlayFriendsLabels;
  readonly friends:PlayNetworkCollectionData;readonly crossPlatformFriends:PlayNetworkCollectionData;readonly lan:PlayNetworkCollectionData;readonly loadingFriendsRealms:PlayContentLoading;
  readonly externalFamilies?:{readonly friendsRealms?:PlayExternalFamilyDependency<'play.realms_world_item_grid/friends_realms'>};
  readonly notificationCount:string;
}

const worldFlagNames='deviceSunsetting showNewPlayScreenOptIn personalRealmsGridVisible realmLabelVisible realmsSignInVisible freePreviewVisible freePreviewNewOfferVisible createOnRealmsVisible loadingPersonalRealmsVisible realmTrialVisible nintendoFirstPurchaseVisible multiplayerBlockedVisible openAccountUriVisible openAccountGamecoreVisible localWorldsVisible noLocalWorlds noLocalSwitchSettingVisible noLocalSwitchVisible noLocalHelpVisible betaRetailLocalWorldsVisible syncLegacyWorldsButtonVisible loadingLegacyWorldsVisible legacyWorldsVisible betaRetailLegacyWorldsVisible'.split(' ')as(keyof PlayWorldsFlags)[];
const worldProviderNames='isRealmsEnabled crossPlatformEnabled educationEdition worldPickerScreen localWorldUpload worldArchiveSupport supportsLegacyWorlds autoFetchLegacyWorlds legacyWorldsShareStorage legacyWorldsSupportsMigration'.split(' ')as(keyof PlayContentProvider)[];
const worldLabelNames='worlds legacyWorlds betaLocal betaLegacy realms create quickPlay optIn import signIn freePreview createOnRealms trial nintendoPurchase noLocal noLocalSwitch storageType storageExternal storagePackage help noLocalHelp syncLegacy dontSeeLegacy crossPlatformDisabled blocked accountSettings accountGamecore warningMoreInfo editWorld deleteWorld migrateWorld storageUsage'.split(' ')as(keyof PlayWorldsLabels)[];
const friendFlagNames='deviceSunsetting addFriendButtonVisible joinByCodeVisible notificationVisible joinableRealmsPanelVisible friendsRealmsVisible realmsSignInVisible loadingFriendsRealmsVisible offlineAuthCodeVisible noFriendsRealmsVisible friendsGridVisible noFriendsMessageVisible crossPlatformFriendsGridVisible noCrossPlatformFriendsMessageVisible generalNoMultiplayerVisible lanGridVisible openAccountGamecoreVisible'.split(' ')as(keyof PlayFriendsFlags)[];
const friendProviderNames='isRealmsEnabled crossPlatformEnabled supportsAddFriend nxOs isPs4 editorMode educationEdition addFriendNotVisible inboxEnabled'.split(' ')as(keyof PlayFriendsProvider)[];
const friendLabelNames='addFriend joinByCode notification joinableRealms signIn offlineAuthCode noFriendsRealms friends noFriends findCrossPlatformFriend crossPlatformFriends noCrossPlatformFriends generalNoMultiplayer lan accountGamecore crossPlatformDisabled warningMoreInfo'.split(' ')as(keyof PlayFriendsLabels)[];
function flags<T extends object>(value:T,keys:readonly(keyof T)[],name:string){if(!value||typeof value!=='object')throw new TypeError(`Play ${name} is required.`);for(const key of keys)bool(value[key],`${name}.${String(key)}`);}
function texts<T extends object>(value:T,keys:readonly(keyof T)[]){if(!value||typeof value!=='object')throw new TypeError('Play localized labels are required.');for(const key of keys)playText(value[key]as string,String(key));}
function loadingPlan(value:PlayContentLoading,scale:number){if(!value)throw new TypeError('Play explicit loading snapshot is required.');playText(value.message);playDimension(value.height*scale);count(value.frame,'loading frame',9);count(value.placeholderRows,'placeholder rows',1000);bool(value.barsVisible,'loading bars visible');}
function warningPlan(value:PlayContentWarning|undefined,scale:number){if(!value)throw new TypeError('Visible Play warning requires text and explicit resolved dimensions.');playText(value.text);playDimension(value.height*scale);playDimension(value.moreInfoWidth*scale);playAsset('textures/ui/greyBorder');playAsset('textures/ui/infobulb');}
function collectionIndices(value:{items:readonly unknown[];rowCount:number;indices?:readonly number[]}){count(value.rowCount,'grid row count');if(value.rowCount<value.items.length)throw new RangeError('Play rowCount cannot be smaller than supplied records.');if(value.indices!==undefined){if(!Array.isArray(value.indices)||value.indices.length!==value.items.length)throw new TypeError('Play source indices must correspond one-to-one with supplied records.');const used=new Set<number>();for(let i=0;i<value.indices.length;i++){const n=value.indices[i]!;count(n,'source index');if(n>=value.rowCount||used.has(n))throw new RangeError('Play source indices must be unique and inside the explicit grid capacity.');used.add(n);}}}
function worldCollection(value:PlayWorldCollectionData,scale:number,active:boolean){if(!value||!Array.isArray(value.items)||value.items.length>1000)throw new TypeError('Play world collection requires at most1000 host records.');collectionIndices(value);const ids=new Set<string>();for(const item of value.items){worldPlan(item,scale,active);if(ids.has(item.id))throw new TypeError('Play collection IDs must be unique within the collection.');ids.add(item.id);}}
function networkCollection(value:PlayNetworkCollectionData,active:boolean){if(!value||!Array.isArray(value.items)||value.items.length>1000)throw new TypeError('Play network collection requires at most1000 host records.');collectionIndices(value);const ids=new Set<string>();for(const item of value.items){if(active)networkPlan(item);if(ids.has(item.id))throw new TypeError('Play network IDs must be unique within the collection.');ids.add(item.id);}}
function basePlan(p:PaneBase){const unsafe=p as unknown as Record<string,unknown>;if(unsafe.children!==undefined||unsafe.dangerouslySetInnerHTML!==undefined)throw new TypeError('Play content owns source children.');playSize(p.size,p.scale);if(p.size[0]<128||p.size[1]<50)throw new RangeError('Play content requires at least128x50 logical pixels.');if(p.inputMode!=='mouse'&&p.inputMode!=='touch')throw new TypeError('Play content inputMode is required.');if(p.disabled!==undefined)bool(p.disabled,'disabled');if(p.readOnly!==undefined)bool(p.readOnly,'readOnly');}
function signInPlan(){playAsset('textures/ui/realmsIcon');playAsset('textures/ui/realms_chevron_play');}
/** Pure complete branch validation precedes any hosted React family rendering. */
export function planPlayWorldsContent(p:PlayWorldsContentProps){
  basePlan(p);flags(p.provider,worldProviderNames,'world provider');flags(p.flags,worldFlagNames,'world flags');texts(p.labels,worldLabelNames);loadingPlan(p.loadingPersonalRealms,p.scale);loadingPlan(p.loadingLegacyWorlds,p.scale);
  const active=!p.hidden,f=p.flags,v=p.provider,realms=active&&v.isRealmsEnabled&&f.personalRealmsGridVisible;
  // These raw bindings govern headings/padding. Every source grid independently
  // uses its explicit collection/grid dimension and is never gated by a label.
  worldCollection(p.localWorlds,p.scale,active);worldCollection(p.legacyWorlds,p.scale,false);worldCollection(p.betaRetailLocalWorlds,p.scale,false);worldCollection(p.betaRetailLegacyWorlds,p.scale,false);
  if(active&&f.deviceSunsetting)warningPlan(p.warning,p.scale);
  if(realms){
    if(f.realmsSignInVisible)signInPlan();
    if(!v.worldPickerScreen)dependency(p.externalFamilies?.personalRealms,'play.realms_world_item_grid/personal_realms',p.scale);
    if(f.freePreviewVisible)dependency(p.externalFamilies?.freePreview,'play.realms_trial_content_panel/free_preview',p.scale);
    if(f.freePreviewVisible&&f.freePreviewNewOfferVisible)dependency(p.externalFamilies?.newOffer,'common_store.new_offer_icon',p.scale);
    if(f.realmTrialVisible&&!v.worldPickerScreen)dependency(p.externalFamilies?.trial,'play.realms_trial_content_panel/trial',p.scale);
    if(f.nintendoFirstPurchaseVisible&&!v.worldPickerScreen)dependency(p.externalFamilies?.nintendoPurchase,'play.realms_trial_content_panel/nintendo_first_purchase',p.scale);
    if(f.createOnRealmsVisible)for(const path of['textures/ui/realmsContent','textures/ui/realmsContentHover','textures/ui/realmsContentPressed'])playAsset(path);
    if(!v.worldPickerScreen&&f.loadingPersonalRealmsVisible&&p.loadingPersonalRealms.height<39)throw new RangeError('Play personal Realms loading source min_size is39 logical pixels.');
  }
  if(active&&f.loadingLegacyWorldsVisible&&p.loadingLegacyWorlds.height<39)throw new RangeError('Play legacy loading source min_size is39 logical pixels.');
  if(active&&f.noLocalSwitchSettingVisible&&!v.educationEdition&&f.noLocalSwitchVisible){if(!p.storage)throw new TypeError('Visible Play storage dropdown requires explicit host selection state.');bool(p.storage.enabled,'storage enabled');if(!['external','package'].includes(p.storage.value))throw new TypeError('Play storage selection must be external/package.');playText(p.storage.toggleLabel);}
  const separate=v.legacyWorldsShareStorage||v.legacyWorldsSupportsMigration;
  if(active&&separate){if(!p.storageUsage)throw new TypeError('Play separate20% storage status requires raw clip ratios and an explicit Web clip policy.');playDimension(p.storageUsage.contentHeight*p.scale,'resolved storage content height');for(const n of[p.storageUsage.localClipRatio,p.storageUsage.legacyClipRatio])if(!Number.isFinite(n)||n<0||n>1)throw new RangeError('Play storage clip ratios must be finite0..1.');if(!['visible-fraction-web','left-removal-web'].includes(p.storageUsage.clipPolicy))throw new TypeError('Play storage clip resolution policy is required.');playAsset('textures/ui/White');}
  return Object.freeze({separateStorage:separate,mainHeight:p.size[1]*(separate?.8:1),storageHeight:separate?p.size[1]*.2:0,active});
}
export function planPlayFriendsContent(p:PlayFriendsContentProps){
  basePlan(p);flags(p.provider,friendProviderNames,'friends provider');flags(p.flags,friendFlagNames,'friends flags');texts(p.labels,friendLabelNames);playText(p.notificationCount);loadingPlan(p.loadingFriendsRealms,p.scale);
  const active=!p.hidden,f=p.flags,v=p.provider,realms=active&&!v.editorMode&&f.joinableRealmsPanelVisible;
  networkCollection(p.friends,active&&f.friendsGridVisible);networkCollection(p.crossPlatformFriends,active&&(v.nxOs||v.isPs4)&&f.crossPlatformFriendsGridVisible);networkCollection(p.lan,active&&f.lanGridVisible);
  if(active&&f.deviceSunsetting)warningPlan(p.warning,p.scale);
  if(realms){dependency(p.externalFamilies?.friendsRealms,'play.realms_world_item_grid/friends_realms',p.scale);if(f.realmsSignInVisible)signInPlan();if(f.offlineAuthCodeVisible)playAsset('textures/ui/external_link');}
  if(active&&!v.addFriendNotVisible&&f.notificationVisible)for(const path of['textures/ui/invite_number_background',v.inboxEnabled?'textures/ui/icon_bell':'textures/ui/invite_base'])playAsset(path);
  const headerHeight=!v.addFriendNotVisible&&((v.supportsAddFriend&&!v.nxOs&&!v.isPs4&&f.addFriendButtonVisible)||(!v.editorMode&&f.joinByCodeVisible)||f.notificationVisible)?30:0;
  return Object.freeze({active,joinableRealms:realms,headerHeight});
}
function SourceNode({name,children,height,scale}:{name:string;children?:ReactNode;height?:number;scale:number}){return <div data-play-node={name} style={height===undefined?undefined:{height:height*scale,position:'relative'}}>{children}</div>;}
function Space({size,scale,name}:{size:number;scale:number;name:string}){return <SourceNode name={name} height={size} scale={scale}/>;}
function SectionLabel({text,scale,colored,color}:{text:string;scale:number;colored?:boolean;color?:string}){return <div className="mc-play-section-label" style={playStyle(scale)}>{colored&&<span className="mc-play-worlds__section-color" style={{backgroundColor:color}}><PlaySourceBackground asset={progressAssets['textures/ui/progress_bar_simple']} scale={scale}/></span>}{text}</div>;}
function Family({value,scale}:{value:PlayExternalFamilyDependency;scale:number}){return <div className="mc-play-external-family" data-source-family={value.sourcePath} data-family-implementation="external-host-dependency" style={{height:value.height*scale}}>{value.content}</div>;}
function SignIn({label,scale,onAction,disabled,readOnly}:{label:string;scale:number;onAction?:PlayActionHandler;disabled?:boolean;readOnly?:boolean}){const chevron=playAsset('textures/ui/realms_chevron_play'),portal=playAsset('textures/ui/realmsIcon');return <PlaySourceButton className="mc-play-sign-in" label={label} target="button.menu_sign_in_to_view_realms" scale={scale} onAction={onAction} disabled={disabled} readOnly={readOnly} style={{width:'100%',height:29*scale}}><span className="mc-play-sign-in__art"><Image className="mc-play-sign-in__chevron" src={chevron.url} sourceSize={[chevron.width,chevron.height]} size={[23,28]} scale={scale} alt=""/><Image className="mc-play-sign-in__portal" src={portal.url} sourceSize={[portal.width,portal.height]} size={[11,14]} scale={scale} alt=""/></span><span>{label}</span></PlaySourceButton>;}
function Loading({value,scale,legacyBinding=false}:{value:PlayContentLoading;scale:number;legacyBinding?:boolean}){return <PlayLoading label={value.message} height={value.height} scale={scale} frame={value.frame} barsVisible={legacyBinding||value.barsVisible} placeholderRows={value.placeholderRows}/>;}
function WorldRows({value,collection,width,p}:{value:PlayWorldCollectionData;collection:PlayWorldCollection;width:number;p:PlayWorldsContentProps}){return <div role="list" aria-label={collection} data-source-collection={collection} style={{position:'relative',height:value.rowCount*29*p.scale}}>{value.items.map((item,ordinal)=>{const index=value.indices?.[ordinal]??ordinal;return <PlayWorldRow key={item.id} item={item} collection={collection} index={index} width={width} scale={p.scale} style={{position:'absolute',left:0,top:index*29*p.scale}} localWorldUpload={p.provider.localWorldUpload} legacyShareStorage={p.provider.legacyWorldsShareStorage} legacySupportsMigration={p.provider.legacyWorldsSupportsMigration} labels={{edit:p.labels.editWorld,delete:p.labels.deleteWorld,migrate:p.labels.migrateWorld}} onAction={p.onAction} disabled={p.disabled} readOnly={p.readOnly}/>;})}</div>;}
function NetworkRows({value,collection,width,p,ignoreCrossplay=false}:{value:PlayNetworkCollectionData;collection:string;width:number;p:PlayFriendsContentProps;ignoreCrossplay?:boolean}){return <div role="list" aria-label={collection} data-source-collection={collection} style={{position:'relative',height:value.rowCount*30*p.scale}}>{value.items.map((item,ordinal)=>{const index=value.indices?.[ordinal]??ordinal;return <PlayNetworkWorldRow key={item.id} item={item} collection={collection} index={index} width={width} scale={p.scale} style={{position:'absolute',left:0,top:index*30*p.scale}} crossPlatformEnabled={p.provider.crossPlatformEnabled} ignoreCrossplay={ignoreCrossplay} onAction={p.onAction} disabled={p.disabled} readOnly={p.readOnly}/>;})}</div>;}
function StorageStatus({p,width}:{p:PlayWorldsContentProps;width:number}){
  const usage=p.storageUsage!,s=p.scale,asset=playAsset('textures/ui/White'),clip=(ratio:number)=>usage.clipPolicy==='visible-fraction-web'?`inset(0 ${(1-ratio)*100}% 0 0)`:`inset(0 0 0 ${ratio*100}%)`;
  return <div className="mc-play-storage" data-source-control="play.legacy_world_content_status_area_panel" data-clip-direction="left" data-clip-policy={usage.clipPolicy} style={{width:width*s,height:usage.contentHeight*s}}>
    <span className="mc-play-storage__divider" style={{maskImage:`url(${JSON.stringify(asset.url)})`}}/>
    <div className="mc-play-storage__information"><span>{p.labels.storageUsage}</span><span className="mc-play-storage__padding"/><span className="mc-play-storage__bar">
      <span data-source-layer="1" className="mc-play-storage__empty" style={{maskImage:`url(${JSON.stringify(asset.url)})`}}/>
      <span data-source-layer="2" className="mc-play-storage__legacy" data-raw-clip-ratio={usage.legacyClipRatio} style={{maskImage:`url(${JSON.stringify(asset.url)})`,clipPath:clip(usage.legacyClipRatio)}}/>
      <span data-source-layer="3" className="mc-play-storage__local" data-raw-clip-ratio={usage.localClipRatio} style={{maskImage:`url(${JSON.stringify(asset.url)})`,clipPath:clip(usage.localClipRatio)}}/>
    </span></div>
  </div>;
}

/** Selected default Classic Worlds stack. Realms card/provider renderers are
 * explicit external family dependencies; this is not their implementation. */
export const PlayWorldsContent=forwardRef<HTMLDivElement,PlayWorldsContentProps>(function PlayWorldsContent(p,ref){
  const plan=planPlayWorldsContent(p),{size,scale:s,inputMode,provider:v,flags:f,labels:l,onAction,disabled,readOnly,className,style,id,hidden}=p;
  const [,attach]=useClassicNodeRef(ref),generated=useId(),rootId=id??`mc-play-worlds-${generated}`;
  // The common mouse scroll reserves9, then content applies2px on each side.
  const width=planPlaySourceScrollGeometry(size,s,inputMode).contentWidth,node=(name:string,child:ReactNode)=><SourceNode key={name} name={name} scale={s}>{child}</SourceNode>;
  const button=(label:string,target:string,height=30,surface:'dark'|'light'|'outline'='light',content?:ReactNode)=><PlaySourceButton label={label} target={target} scale={s} onAction={onAction} disabled={disabled} readOnly={readOnly} surface={surface} style={{width:'100%',height:height*s}}>{content}</PlaySourceButton>;
  const warning=plan.active&&f.deviceSunsetting?node('play_screen_warning',<PlayWarning text={p.warning!.text} height={p.warning!.height} moreInfoWidth={p.warning!.moreInfoWidth} moreInfoLabel={l.warningMoreInfo} scale={s} onAction={onAction} disabled={disabled} readOnly={readOnly}/>):null;
  const rawFlags=p as unknown as Record<string,unknown>,native:Record<string,unknown>={};for(const[key,value]of Object.entries(rawFlags))if(key.startsWith('aria-')||key.startsWith('data-')||key.startsWith('on')&&!['onAction'].includes(key)||['title','role','tabIndex','dir','lang'].includes(key))native[key]=value;
  return <div {...native} ref={attach} id={rootId} hidden={hidden} className={['mc-play-worlds',className].filter(Boolean).join(' ')} style={playStyle(s,{...style,width:size[0]*s,height:size[1]*s})} data-profile="default-classic-worlds" data-native-certified="false">
    {plan.active&&<>
      <PlaySourceScroll size={[size[0],plan.mainHeight]} scale={s} inputMode={inputMode} label={l.worlds}>
        <Space size={2} scale={s} name="padding_0"/>{warning}
        {!v.localWorldUpload&&node('header_button',<div className="mc-play-worlds__header" style={{paddingBottom:4*s}}>
          {v.educationEdition&&button(l.quickPlay,'button.menu_quick_play')}
          <div className="mc-play-worlds__header-row" style={{height:30*s}}>
            <div className="mc-play-worlds__create" style={{width:(width-1-(f.showNewPlayScreenOptIn&&!v.educationEdition?((width-1)*.5-10):0)-(v.worldArchiveSupport?30:0))*s}}>{button(l.create,'button.menu_local_world_create')}</div>
            {f.showNewPlayScreenOptIn&&!v.educationEdition&&<div style={{width:((width-1)*.5-10)*s}}>{button(l.optIn,'button.switch_to_new_ui')}</div>}
            {v.worldArchiveSupport&&<div style={{width:30*s}}>{button(l.import,'button.menu_import_level',30,'light',<Image src={playAsset('textures/ui/import').url} sourceSize={[16,16]} size={[16,16]} scale={s} alt=""/>)}</div>}
          </div>
        </div>)}
        {v.isRealmsEnabled&&!v.crossPlatformEnabled&&<>{node('worlds_crossplatform_disabled_panel',<PlayStatus text={l.crossPlatformDisabled} scale={s}/>)}<Space size={5} scale={s} name="worlds_crossplatform_disable_spacer"/></>}
        {v.isRealmsEnabled&&f.personalRealmsGridVisible&&node('realms_panel',<>
          {!v.worldPickerScreen&&f.realmLabelVisible&&<SectionLabel text={l.realms} scale={s}/>}
          {f.realmsSignInVisible&&<SignIn label={l.signIn} scale={s} onAction={onAction} disabled={disabled} readOnly={readOnly}/>}
          {f.freePreviewVisible&&<div className="mc-play-worlds__preview">{button(l.freePreview,'button.free_preview_realm_available',30,'dark',<Family value={p.externalFamilies!.freePreview!} scale={s}/>)}{f.freePreviewNewOfferVisible&&<span className="mc-play-worlds__new-offer"><Family value={p.externalFamilies!.newOffer!} scale={s}/></span>}</div>}
          {f.createOnRealmsVisible&&<PlaySourceButton className="mc-play-worlds__create-realms" label={l.createOnRealms} target="button.create_on_realms_button" scale={s} onAction={onAction} disabled={disabled} readOnly={readOnly} style={{width:'100%',height:29*s,'--mc-play-normal':`url(${JSON.stringify(playAsset('textures/ui/realmsContent').url)})`,'--mc-play-hover':`url(${JSON.stringify(playAsset('textures/ui/realmsContentHover').url)})`,'--mc-play-pressed':`url(${JSON.stringify(playAsset('textures/ui/realmsContentPressed').url)})`}as CSSProperties}/>}
          {!v.worldPickerScreen&&<Family value={p.externalFamilies!.personalRealms!} scale={s}/>}
          {!v.worldPickerScreen&&f.loadingPersonalRealmsVisible&&<Loading value={p.loadingPersonalRealms} scale={s}/>}
          {f.realmTrialVisible&&<SourceNode name="realms_trial_panel" height={29} scale={s}>{!v.worldPickerScreen&&button(l.trial,'button.menu_realm_world_trial',30,'dark',<Family value={p.externalFamilies!.trial!} scale={s}/>)}</SourceNode>}
          {f.nintendoFirstPurchaseVisible&&<SourceNode name="realms_nintendo_first_realm_purchase_panel" height={29} scale={s}>{!v.worldPickerScreen&&button(l.nintendoPurchase,'button.menu_realm_nintendo_first_realm_purchase_button',30,'dark',<Family value={p.externalFamilies!.nintendoPurchase!} scale={s}/>)}</SourceNode>}
          <Space size={4} scale={s} name="realms_padding_1"/>
        </>)}
        {v.isRealmsEnabled&&f.multiplayerBlockedVisible&&node('realms_multiplayer_blocked_panel',<><PlayStatus text={l.blocked} heading={l.realms} scale={s}/>{f.openAccountUriVisible&&<PlaySourceButton label={l.accountSettings} target="button.menu_open_uri" payload={{'#hyperlink':'https://aka.ms/MCMultiplayerHelp'}} scale={s} onAction={onAction} disabled={disabled} readOnly={readOnly} surface="light" style={{width:'100%',height:30*s}}/>}{f.openAccountGamecoreVisible&&button(l.accountGamecore,'button.open_account_setting_gamecore')}</>)}
        {f.localWorldsVisible&&node('worlds_label',<SectionLabel text={l.worlds} scale={s} colored={plan.separateStorage} color={p.worldLabelColors?.local??'rgb(56.5% 64.3% 49.8%)'}/>)}
        {node('grid',<WorldRows value={p.localWorlds} collection="local_worlds" width={width} p={p}/>)}
        {v.localWorldUpload&&f.noLocalWorlds&&node('no_local_worlds_label',<PlayStatus text={l.noLocal} scale={s}/>)}
        {!v.educationEdition&&f.noLocalSwitchSettingVisible&&node('no_local_worlds_switch_setting',<div className="mc-play-worlds__storage-setting">
          <PlaySourceBackground asset={playAsset('textures/ui/mainbanners')} scale={s}/>
          {f.noLocalSwitchVisible&&<div className="mc-play-worlds__storage-inner"><SectionLabel text={l.noLocalSwitch} scale={s}/><div className="mc-play-worlds__storage-select"><Combobox label={l.storageType} value={p.storage!.value} disabled={disabled||readOnly||!p.storage!.enabled} options={[{value:'external',label:l.storageExternal},{value:'package',label:l.storagePackage}]} onValueChange={value=>p.storage!.onValueChange?.(value as 'external'|'package')} aria-label={`${l.storageType}: ${p.storage!.toggleLabel}`}/></div></div>}
          {f.noLocalHelpVisible&&<div className="mc-play-worlds__storage-inner"><SectionLabel text={l.noLocalHelp} scale={s}/>{button(l.help,'button.no_local_worlds_launch_help',29)}</div>}
        </div>)}
        {f.betaRetailLocalWorldsVisible&&<><Space size={4} scale={s} name="beta_retail_local_padding"/>{node('beta_retail_local_worlds_label',<SectionLabel text={l.betaLocal} scale={s}/>)}</>}
        {node('beta_retail_local_grid',<WorldRows value={p.betaRetailLocalWorlds} collection="beta_retail_local_worlds" width={width} p={p}/>)}
        {v.supportsLegacyWorlds&&f.syncLegacyWorldsButtonVisible&&<Space size={4} scale={s} name="loading_legacy_worlds_panel_padding"/>}
        {!v.autoFetchLegacyWorlds&&v.supportsLegacyWorlds&&node('legacy_worlds_button',<>{f.syncLegacyWorldsButtonVisible&&<><SectionLabel text={l.dontSeeLegacy} scale={s}/>{button(l.syncLegacy,'button.menu_sync_legacy_worlds')}<Space size={4} scale={s} name="sync_legacy_padding"/></>}</>)}
        {f.loadingLegacyWorldsVisible&&node('loading_legacy_worlds_panel',<Loading value={p.loadingLegacyWorlds} scale={s} legacyBinding/>)}
        {f.legacyWorldsVisible&&<><Space size={4} scale={s} name="padding_2"/>{node('upgrade_legacy_worlds_label',<SectionLabel text={l.legacyWorlds} scale={s} colored={plan.separateStorage} color={p.worldLabelColors?.legacy??'rgb(37.3% 51.8% 79.2%)'}/>)}</>}
        {node('legacy_world_item_grid',<WorldRows value={p.legacyWorlds} collection="legacy_worlds" width={width} p={p}/>)}
        {f.betaRetailLegacyWorldsVisible&&<><Space size={4} scale={s} name="beta_retail_legacy_padding"/>{node('beta_retail_legacy_worlds_label',<SectionLabel text={l.betaLegacy} scale={s}/>)}</>}
        {node('beta_retail_legacy_grid',<WorldRows value={p.betaRetailLegacyWorlds} collection="beta_retail_legacy_worlds" width={width} p={p}/>)}
        <Space size={3} scale={s} name="pad_hack_panel"/>
      </PlaySourceScroll>
      {plan.separateStorage&&<PlaySourceScroll className="mc-play-worlds__storage-scroll" size={[size[0],plan.storageHeight]} scale={s} inputMode={inputMode} label={l.storageUsage}><StorageStatus p={p} width={width}/></PlaySourceScroll>}
    </>}
  </div>;
});

/** Actual owned Friends headings/messages/auth/actions and network collections.
 * friends_realms remains the declared external Realms card-family dependency. */
export const PlayFriendsContent=forwardRef<HTMLDivElement,PlayFriendsContentProps>(function PlayFriendsContent(p,ref){
  const plan=planPlayFriendsContent(p),{size,scale:s,inputMode,provider:v,flags:f,labels:l,onAction,disabled,readOnly,className,style,id,hidden}=p;
  const [,attach]=useClassicNodeRef(ref),width=planPlaySourceScrollGeometry(size,s,inputMode).contentWidth;
  const node=(name:string,children:ReactNode)=><SourceNode name={name} scale={s}>{children}</SourceNode>,button=(label:string,target:string,height=30,blocked=false,content?:ReactNode)=><PlaySourceButton label={label} target={target} scale={s} onAction={onAction} disabled={disabled||blocked} readOnly={readOnly} surface="light" style={{width:'100%',height:height*s}}>{content}</PlaySourceButton>;
  const native:Record<string,unknown>={};for(const[key,value]of Object.entries(p))if(key.startsWith('aria-')||key.startsWith('data-')||key.startsWith('on')&&key!=='onAction'||['title','role','tabIndex','dir','lang'].includes(key))native[key]=value;
  return <div {...native} ref={attach} id={id} hidden={hidden} className={['mc-play-friends',className].filter(Boolean).join(' ')} style={playStyle(s,{...style,width:size[0]*s,height:size[1]*s})} data-profile="default-classic-friends" data-native-certified="false">
    {plan.active&&<PlaySourceScroll size={size} scale={s} inputMode={inputMode} label={l.friends}>
      <Space size={2} scale={s} name="padding_0"/>
      {f.deviceSunsetting&&node('friends_screen_warning',<PlayWarning text={p.warning!.text} height={p.warning!.height} moreInfoWidth={p.warning!.moreInfoWidth} moreInfoLabel={l.warningMoreInfo} scale={s} onAction={onAction} disabled={disabled} readOnly={readOnly}/>)}
      {node('header_button',<div style={{paddingBottom:4*s}}>{!v.addFriendNotVisible&&<div className="mc-play-friends__header" style={{height:plan.headerHeight*s}}>
        {v.supportsAddFriend&&!v.nxOs&&!v.isPs4&&f.addFriendButtonVisible&&<div className="mc-play-friends__header-fill">{button(l.addFriend,'button.menu_network_add_friend',30,!v.crossPlatformEnabled)}</div>}
        {v.supportsAddFriend&&!v.nxOs&&!v.isPs4&&<span style={{width:s,flex:'none'}}/>}
        {!v.editorMode&&f.joinByCodeVisible&&<div className="mc-play-friends__header-fill">{button(l.joinByCode,'button.menu_network_join_by_code',30,!v.crossPlatformEnabled)}</div>}
        {f.notificationVisible&&<><span style={{width:s,flex:'none'}}/><div style={{width:'13%',flex:'none'}}>{button(l.notification+' '+p.notificationCount,'button.menu_invite_notification',30,false,<span className="mc-play-friends__notification"><Image src={playAsset(v.inboxEnabled?'textures/ui/icon_bell':'textures/ui/invite_base').url} sourceSize={v.inboxEnabled?[16,16]:[20,20]} size={[20,20]} scale={s} alt=""/><span className="mc-play-friends__notification-count" data-source-control="start.notification_button_text_panel" data-source-anchor="top_right:center" data-source-offset="-0.5,0"><span className="mc-play-friends__notification-count-background"><PlaySourceBackground asset={playAsset('textures/ui/invite_number_background')} scale={s}/></span><span className="mc-play-friends__notification-count-text">{p.notificationCount}</span></span></span>)}</div></>}
      </div>}</div>)}
      {v.isRealmsEnabled&&!v.crossPlatformEnabled&&<>{node('friends_crossplatform_disabled_panel',<PlayStatus text={l.crossPlatformDisabled} scale={s}/>)}<Space size={5} scale={s} name="friends_crossplatform_disable_spacer"/></>}
      {plan.joinableRealms&&node('joinable_realms_panel',<>
        {f.friendsRealmsVisible&&<SectionLabel text={l.joinableRealms} scale={s}/>}
        {f.realmsSignInVisible&&<SignIn label={l.signIn} scale={s} onAction={onAction} disabled={disabled} readOnly={readOnly}/>}
        <Family value={p.externalFamilies!.friendsRealms!} scale={s}/>
        {f.loadingFriendsRealmsVisible&&<Loading value={p.loadingFriendsRealms} scale={s}/>}
        {f.offlineAuthCodeVisible&&<div className="mc-play-friends__offline-panel"><PlaySourceBackground asset={playAsset('textures/ui/mainbanners')} scale={s}/><PlaySourceButton className="mc-play-friends__offline" label={l.offlineAuthCode} target="button.get_offline_authcode" scale={s} onAction={onAction} disabled={disabled} readOnly={readOnly} surface="outline" style={{width:'100%',height:40*s}}><span>{l.offlineAuthCode}</span><Image src={playAsset('textures/ui/external_link').url} sourceSize={[20,20]} size={[8,8]} scale={s} alt=""/></PlaySourceButton></div>}
        {f.noFriendsRealmsVisible&&<PlayStatus heading={l.joinableRealms} text={l.noFriendsRealms} scale={s}/>}
        <Space size={3} scale={s} name="realms_padding_1"/>
      </>)}
      {f.friendsGridVisible&&node('friends_grid',<><SectionLabel text={l.friends} scale={s}/><NetworkRows value={p.friends} collection="friends_network_worlds" width={width} p={p} ignoreCrossplay/><Space size={4} scale={s} name="friends_grid_content_padding"/></>)}
      {f.friendsGridVisible&&<Space size={3} scale={s} name="pad_hack_panel"/>}
      {!v.educationEdition&&f.noFriendsMessageVisible&&node('no_friends_grid_message',<PlayStatus heading={l.friends} text={l.noFriends} scale={s}/>)}
      {(v.nxOs||v.isPs4)&&<>
        {f.addFriendButtonVisible&&node('switch_find_cross_platform_friend_button',button(l.findCrossPlatformFriend,'button.menu_network_add_friend',30,!v.crossPlatformEnabled))}
        <Space size={2} scale={s} name="add_friend_button_padding"/>
        {f.crossPlatformFriendsGridVisible&&node('cross_platform_friends_grid',<><SectionLabel text={l.crossPlatformFriends} scale={s}/><NetworkRows value={p.crossPlatformFriends} collection="cross_platform_friends_network_worlds" width={width} p={p}/><Space size={4} scale={s} name="cross_platform_content_padding"/></>)}
        {f.noCrossPlatformFriendsMessageVisible&&node('no_cross_platform_friends_grid_message',<PlayStatus heading={l.crossPlatformFriends} text={l.noCrossPlatformFriends} scale={s}/>)}
      </>}
      {f.generalNoMultiplayerVisible&&node('general_no_multiplayer_grid_message',<PlayStatus heading={l.friends} text={l.generalNoMultiplayer} scale={s}/>)}
      {f.lanGridVisible&&node('lan_grid',<><SectionLabel text={l.lan} scale={s}/><NetworkRows value={p.lan} collection="lan_network_worlds" width={width} p={p}/><Space size={4} scale={s} name="lan_content_padding"/></>)}
      {f.openAccountGamecoreVisible&&node('open_account_setting_button_gamecore',button(l.accountGamecore,'button.open_account_setting_gamecore'))}
    </PlaySourceScroll>}
  </div>;
});
