import {createRef, useEffect, useRef, useState} from 'react';
import type {CSSProperties, RefCallback, SyntheticEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ResourcePackManager, ResourcePackSection} from '../src/resource-packs';
import type {ResourcePackCollectionData, ResourcePackManagerBindings, ResourcePackManagerProps, ResourcePackManagerActionDetail, ResourcePackProfile, ResourcePackSectionProps} from '../src/resource-packs';
import {ResourcePackItem, ResourcePackActions, ResourcePackDiagnostics} from '../src/resource-pack-items';
import type {ResourcePackActionBindings, ResourcePackActionDetail, ResourcePackDiagnosticSnapshot, ResourcePackItemBindings, ResourcePackItemProps, ResourcePackKind, ResourcePackTargets} from '../src/resource-pack-items';
import {PackSettingsScreen, PackSettingsContent, PackContentTier} from '../src/pack-settings';
import {createResourcePackDemoProps} from './resource-pack-data';
import {createPackSettingsDemoProps} from './pack-settings-data';
import '../src/styles.css';
import '../src/fonts.css';

export type ResourcePacksFixturePart='manager'|'section'|'item'|'actions'|'diagnostics'|'settings'|'content'|'tier';
export interface ResourcePacksFixtureSettings {
  part:ResourcePacksFixturePart;profile:ResourcePackProfile;scale:number;width:number;show:boolean;open:boolean;
  disabled:boolean;readOnly:boolean;acceptValues:boolean;acceptClose:boolean;inputMode:'mouse'|'touch';fontSize:number;educationEdition:boolean;
  kind:ResourcePackKind;managerBindings:Partial<ResourcePackManagerBindings>;itemBindings:Partial<ResourcePackItemBindings>;
  headerImageProfile?:ResourcePackSectionProps['headerImageProfile'];headerImageProfiles?:ResourcePackManagerProps['headerImageProfiles'];
  actionBindings:Partial<ResourcePackActionBindings>;diagnostics:Partial<ResourcePackDiagnosticSnapshot>;
  headerCount:string;mainHeight:number;expandedTextHeight:number;hasTier:boolean;supportedTier:boolean;sourceValue:number;sourceSteps:number;webValue:number;webDomain:{min:number;max:number;step:number};
  generatedHidden:boolean;callbackRefs:boolean;veto:'none'|'leaf'|'ancestor-react'|'ancestor-native';vetoEvent:'click'|'change'|'keydown';unmountOnBubble:boolean;
}
type Logged={kind:string;[key:string]:unknown};
const defaults:ResourcePacksFixtureSettings={part:'manager',profile:'level',scale:1,width:340,show:true,open:true,disabled:false,readOnly:false,acceptValues:true,acceptClose:false,inputMode:'mouse',fontSize:18,educationEdition:false,kind:'selected',managerBindings:{},itemBindings:{},actionBindings:{},diagnostics:{},headerCount:'99',mainHeight:44,expandedTextHeight:80,hasTier:true,supportedTier:true,sourceValue:.6,sourceSteps:4,webValue:25,webDomain:{min:10,max:50,step:5},generatedHidden:false,callbackRefs:false,veto:'none',vetoEvent:'click',unmountOnBubble:false};
const refs={manager:createRef<HTMLDivElement>(),section:createRef<HTMLDivElement>(),item:createRef<HTMLDivElement>(),actions:createRef<HTMLDivElement>(),diagnostics:createRef<HTMLDivElement>(),settings:createRef<HTMLDivElement>(),content:createRef<HTMLDivElement>(),tier:createRef<HTMLDivElement>(),panel:createRef<HTMLDivElement>(),close:createRef<HTMLButtonElement>(),range:createRef<HTMLInputElement>(),viewport:createRef<HTMLDivElement>(),row:createRef<HTMLButtonElement>()};
interface FixtureAPI {settings:ResourcePacksFixtureSettings;events:Logged[];refs:typeof refs;configure:(patch:Partial<ResourcePacksFixtureSettings>)=>void;clear:()=>void;unmount:()=>void;remount:()=>void}
declare global {interface Window {resourcePacksFixture:FixtureAPI;resourcePacksFixtureInitial?:Partial<ResourcePacksFixtureSettings>}}
const root=createRoot(document.getElementById('root')!);
const api:FixtureAPI={settings:defaults,events:[],refs,configure:()=>{},clear:()=>{api.events.length=0;},unmount:()=>{},remount:()=>{}};
window.resourcePacksFixture=api;
const trackedItemRef:RefCallback<HTMLDivElement>=node=>{refs.item.current=node;api.events.push({kind:'ref',name:'item',connected:!!node});if(node)return()=>{if(refs.item.current===node)refs.item.current=null;api.events.push({kind:'ref-cleanup',name:'item'});};};
let optionAttachId=0,optionNodeId=0;
const optionNodes=new WeakMap<HTMLInputElement,number>();
// Stable function identity across all fixture renders. Only the actual particles
// input receives it; no proxy DOM node or duplicate forwarded ref is installed.
const trackedOptionRef:RefCallback<HTMLInputElement>=node=>{
  if(!node){api.events.push({kind:'option-ref',phase:'null',field:'visible-details',option:'particles'});return;}
  let nodeId=optionNodes.get(node);if(nodeId===undefined){nodeId=++optionNodeId;optionNodes.set(node,nodeId);}
  const attachmentId=++optionAttachId;
  api.events.push({kind:'option-ref',phase:'attach',attachmentId,nodeId,id:node.id,tagName:node.tagName,field:'visible-details',option:'particles',connected:node.isConnected});
  return()=>{api.events.push({kind:'option-ref',phase:'cleanup',attachmentId,nodeId,id:node.id,field:'visible-details',option:'particles'});};
};
const targets=(profile:ResourcePackProfile,kind:ResourcePackKind):ResourcePackTargets=>({select:`button.${kind}_pack_${profile}`,readToggle:`button.read_toggle_${profile}`,moveLeft:`button.move_left_${profile}`,store:`button.store_${profile}`,sortUp:`button.sort_up_${profile}`,sortDown:`button.sort_down_${profile}`,reportErrors:`button.report_errors_${profile}`,packSettings:`button.pack_settings_${profile}`,deselect:`button.deselected_pack_${profile}`});
function recordEvent(detail:ResourcePackManagerActionDetail|ResourcePackActionDetail){api.events.push({kind:'action',action:detail.action,target:detail.target,sourceControl:'sourceControl'in detail?detail.sourceControl:undefined,control:detail.control.tagName,currentTarget:detail.event.currentTarget?.tagName,currentTargetMatches:detail.event.currentTarget===detail.control,defaultPrevented:detail.event.defaultPrevented,...('collection'in detail?{collection:detail.collection}:{}),...('id'in detail?{id:detail.id}:{}),...('checked'in detail?{checked:detail.checked}:{})});}
function Fixture(){
  const [s,set]=useState<ResourcePacksFixtureSettings>(()=>({...defaults,...window.resourcePacksFixtureInitial}));
  const [epoch,remount]=useState(0);const host=useRef<HTMLDivElement>(null);api.settings=s;
  api.configure=patch=>flushSync(()=>set(old=>({...old,...patch})));api.unmount=()=>flushSync(()=>set(old=>({...old,show:false})));api.remount=()=>flushSync(()=>{remount(v=>v+1);set(old=>({...old,show:true}));});
  const veto=(layer:'leaf'|'ancestor-react',event:SyntheticEvent<HTMLElement>)=>{api.events.push({kind:'native',layer,type:event.type,currentTarget:event.currentTarget.tagName});if(s.veto===layer&&s.vetoEvent===event.type)event.preventDefault();if(layer==='ancestor-react'&&s.unmountOnBubble)set(old=>({...old,show:false}));};
  useEffect(()=>{const owner=host.current;if(!owner)return;const handle=(event:Event)=>{if(s.veto==='ancestor-native'&&event.type===s.vetoEvent){api.events.push({kind:'native',layer:'ancestor-native',type:event.type});event.preventDefault();}};for(const name of ['click','change','keydown'])owner.addEventListener(name,handle);return()=>{for(const name of ['click','change','keydown'])owner.removeEventListener(name,handle);};},[s.veto,s.vetoEvent,epoch]);
  const base:ResourcePackManagerProps=createResourcePackDemoProps(s.profile);
  const diagnostics=(d:ResourcePackDiagnosticSnapshot):ResourcePackDiagnosticSnapshot=>({...d,...s.diagnostics});
  const collection=(kind:ResourcePackKind):ResourcePackCollectionData=>{const c=base.collections[kind];return{...c,count:s.headerCount,items:c.items.map(r=>({...r,bindings:{...r.bindings,...s.itemBindings},diagnostics:diagnostics(r.diagnostics),layout:{...r.layout,mainHeight:s.mainHeight,expandedTextHeight:s.expandedTextHeight},actions:r.actions?{...r.actions,bindings:{...r.actions.bindings,...s.actionBindings,isSelected:s.itemBindings.isSelected??r.bindings.isSelected,directionVisible:s.itemBindings.directionVisible??r.bindings.directionVisible},diagnostics:diagnostics(r.actions.diagnostics)}:undefined}))};};
  const collections={selected:collection('selected'),available:collection('available'),realms:collection('realms'),unowned:collection('unowned'),invalid:collection('invalid')};
  const manager={...base,profile:s.profile,width:s.width,scale:s.scale,collections,headerImageProfiles:s.headerImageProfiles,provider:{...base.provider,educationEdition:s.educationEdition},bindings:{...base.bindings,...s.managerBindings},disabled:s.disabled,readOnly:s.readOnly,onAction:recordEvent};
  const row=collections[s.kind].items[0]??collections.selected.items[0];
  if(!row)throw new Error('The authored resource-pack dataset requires a complete source record for fixture leaf tests.');
  const item:ResourcePackItemProps={...row,kind:s.kind,identity:{profile:s.profile,collection:`#${s.kind}_pack_items_${s.profile}`,id:row.id,index:row.index},width:s.width,scale:s.scale,targets:targets(s.profile,s.kind),disabled:s.disabled,readOnly:s.readOnly,onAction:recordEvent,buttonRef:refs.row,buttonProps:{onClick:e=>veto('leaf',e)}};
  const actions=item.actions;
  const settings=createPackSettingsDemoProps();
  const tier={...settings.content.tier,hasContentTiering:s.hasTier,contentTierSupported:s.supportedTier,value:s.sourceValue,steps:s.sourceSteps,web:{...settings.content.tier.web,...s.webDomain,value:s.webValue},inputRef:refs.range,inputProps:{'aria-label':'Content tier',onChange:(e:SyntheticEvent<HTMLInputElement>)=>veto('leaf',e)},onValueChange:(next:number,detail:{sourceValue:number;sourceSteps:number;previousValue:number;event:SyntheticEvent<HTMLInputElement>})=>{api.events.push({kind:'tier',value:next,sourceValue:detail.sourceValue,sourceSteps:detail.sourceSteps,previousValue:detail.previousValue,currentTarget:detail.event.currentTarget.tagName});if(s.acceptValues)set(old=>({...old,webValue:next}));}};
  const generated={...settings.content.generated,contents:{...settings.content.generated.contents,optionRefs:{...settings.content.generated.contents.optionRefs,'visible-details':{...settings.content.generated.contents.optionRefs?.['visible-details'],particles:trackedOptionRef}},onValueChange:(value:unknown,detail:{id:string;type:string})=>api.events.push({kind:'generated',id:detail.id,type:detail.type,value}),fields:settings.content.generated.contents.fields.map(field=>s.generatedHidden?{...field,visible:false}:field)}};
  const content={...settings.content,inputMode:s.inputMode,tier,generated,disabled:s.disabled,readOnly:s.readOnly,scrollViewportRef:refs.viewport};
  const sectionBase={profile:s.profile,width:s.width,scale:s.scale,title:'Independent section',titleVisible:true,expanded:s.managerBindings.selectedGridVisible??true,collection:collections[s.kind],headerImageProfile:s.headerImageProfile,disabled:s.disabled,readOnly:s.readOnly,onAction:recordEvent};
  const section:ResourcePackSectionProps=s.kind==='available'?{...sectionBase,kind:'available',noPacks:s.managerBindings.noAvailablePacks??false,educationEdition:base.provider.educationEdition,unownedVisible:true,noPacksText:'No packs',toStoreLabel:'View store',invalidCollection:collections.invalid,diagnostics:{visible:true,anyErrors:true,anyWarnings:true,label:'Available diagnostics'}}:s.kind==='unowned'?{...sectionBase,kind:'unowned',noPacks:false,viewMoreLabel:'View more'}:s.kind==='realms'?{...sectionBase,kind:'realms',noPacks:false}:{...sectionBase,kind:'selected',defaultItem:base.defaultItem,diagnostics:{visible:true,anyErrors:true,anyWarnings:true,label:'Selected diagnostics'}};
  let child;
  if(s.part==='manager')child=<ResourcePackManager {...manager} ref={refs.manager}/>;
  else if(s.part==='section')child=<ResourcePackSection {...section} ref={refs.section}/>;
  else if(s.part==='item')child=<ResourcePackItem {...item} ref={s.callbackRefs?trackedItemRef:refs.item}/>;
  else if(s.part==='actions'){if(!actions)throw new Error('Authored row needs explicit action snapshot.');child=<ResourcePackActions {...actions} kind={s.kind} identity={item.identity} width={s.width} scale={s.scale} labels={item.labels} targets={item.targets} lowMemoryDevice={item.lowMemoryDevice} disabled={s.disabled} readOnly={s.readOnly} onAction={recordEvent} ref={refs.actions}/>;}
  else if(s.part==='diagnostics')child=<ResourcePackDiagnostics variant="icons" data={item.diagnostics} width={16} scale={s.scale} lowMemoryDevice={item.lowMemoryDevice} loadingLabel={item.labels.loading} ref={refs.diagnostics}/>;
  else if(s.part==='content')child=<PackSettingsContent {...content} size={[354,219]} scale={s.scale} ref={refs.content}/>;
  else if(s.part==='tier')child=<PackContentTier {...tier} width={339} scale={s.scale} disabled={s.disabled} readOnly={s.readOnly} ref={refs.tier}/>;
  else child=<PackSettingsScreen {...settings} open={s.open} viewportSize={[420,300]} scale={s.scale} content={content} disabled={s.disabled} readOnly={s.readOnly} ref={refs.settings} panelRef={refs.panel} contentRef={refs.content} closeButtonRef={refs.close} closeButtonProps={{onClick:e=>veto('leaf',e)}} onCloseRequest={detail=>{api.events.push({kind:'close',origin:detail.origin,target:detail.target,currentTarget:detail.event.currentTarget.tagName});if(s.acceptClose)set(old=>({...old,open:false}));}}/>;
  return <><div id="fixture-stage" style={{'--mc-font-size':`${s.fontSize}px`}as CSSProperties}><div key={epoch} ref={host} id="fixture-host" onClick={e=>veto('ancestor-react',e)} onChange={e=>veto('ancestor-react',e)} onKeyDown={e=>veto('ancestor-react',e)}>{s.show&&child}</div></div><output id="fixture-state">{JSON.stringify(s)}</output></>;
}
root.render(<Fixture/>);
