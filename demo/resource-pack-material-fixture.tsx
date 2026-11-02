import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {PackContentTier, ResourcePackActions, ResourcePackSection} from '../src/index';
import type {ResourcePackActionBindings, ResourcePackDiagnosticSnapshot, ResourcePackTargets} from '../src/index';
import {createResourcePackDemoProps, createResourcePackDemoRecord} from './resource-pack-data';
import {createPackSettingsDemoProps} from './pack-settings-data';
import '../src/styles.css';
import '../src/fonts.css';

/** Real public components only. Source URLs are never supplied by this fixture.
 * Expected PNGs stay outside the app; root compares captures independently. */
export type ResourcePackMaterialFixtureId =
  | 'error-default' | 'error-hover' | 'warning-default' | 'warning-hover' | 'no-error-default' | 'no-error-hover'
  | 'options-default-layer' | 'options-hover-border-layer'
  | 'up-default' | 'up-hover' | 'down-default' | 'down-hover'
  | 'slider-thumb-default' | 'slider-thumb-hover' | 'slider-thumb-indent' | 'slider-thumb-locked'
  | 'header-plus-default' | 'header-plus-hover' | 'header-minus-default' | 'header-minus-hover';
export interface ResourcePackMaterialConfiguration {fixtureId:ResourcePackMaterialFixtureId;scale:1|2|3;background:'black'|'white'}
type NativeState='default'|'hover'|'pressed'|'disabled';
interface Definition {family:'diagnostics'|'actions'|'tier'|'section';state:NativeState;width:number;height:number;target:string;control:string}
interface Rect {x:number;y:number;width:number;height:number}
export interface ResourcePackMaterialInspection {
  configuration:ResourcePackMaterialConfiguration;targetSelector:string;controlSelector:string;actionButtonSelector:string|null;
  requestedState:NativeState;expectedSize:readonly[number,number];ready:boolean;visible:boolean;imagesReady:boolean;stateMatches:boolean;
  rect:Rect|null;originIsInteger:boolean;actualState:{hover:boolean;active:boolean;focusVisible:boolean;disabled:boolean};
  targetFilter:string|null;pendingBackgroundResources:string[];failedBackgroundResources:{url:string;error:string}[];backgroundReadinessPolicy:'decoded-actual-computed-css-url-cache';isolation:'individual-leaf-opaque-host';
}
interface MaterialAPI {
  configure:(configuration:ResourcePackMaterialConfiguration)=>ResourcePackMaterialInspection;
  inspect:()=>ResourcePackMaterialInspection;ready:()=>Promise<ResourcePackMaterialInspection>;align:()=>ResourcePackMaterialInspection;
  readonly targetSelector:string;readonly controlSelector:string;readonly actionButtonSelector:string|null;
  readonly supportedFixtureIds:readonly ResourcePackMaterialFixtureId[];readonly unsupportedFixtureIds:readonly string[];
  events:Record<string,unknown>[];
}
declare global {interface Window {resourcePackMaterial:MaterialAPI}}

const host='#material-host',report=`${host} .mc-rp-action--report`,tier=`${host} .mc-pack-content-tier__input`;
const definitions:Record<ResourcePackMaterialFixtureId,Definition>={
  'error-default':{family:'diagnostics',state:'default',width:9,height:14,target:`${host} [data-diagnostic="error"]>.mc-rp-default-only`,control:report},
  'error-hover':{family:'diagnostics',state:'hover',width:11,height:16,target:`${host} [data-diagnostic="error"]>.mc-rp-not-default`,control:report},
  'warning-default':{family:'diagnostics',state:'default',width:9,height:14,target:`${host} [data-diagnostic="warning"]>.mc-rp-idle`,control:report},
  'warning-hover':{family:'diagnostics',state:'hover',width:11,height:16,target:`${host} [data-diagnostic="warning"]>.mc-rp-hover`,control:report},
  'no-error-default':{family:'diagnostics',state:'default',width:14,height:12,target:`${host} [data-diagnostic="success"]>.mc-rp-idle`,control:report},
  'no-error-hover':{family:'diagnostics',state:'hover',width:16,height:14,target:`${host} [data-diagnostic="success"]>.mc-rp-hover`,control:report},
  'options-default-layer':{family:'actions',state:'default',width:14,height:14,target:`${host} .mc-rp-options>.mc-image:not(.mc-rp-hover)`,control:`${host} .mc-rp-action--options`},
  'options-hover-border-layer':{family:'actions',state:'hover',width:14,height:14,target:`${host} .mc-rp-options>.mc-image.mc-rp-hover`,control:`${host} .mc-rp-action--options`},
  'up-default':{family:'actions',state:'default',width:14,height:14,target:`${host} .mc-rp-arrow>.mc-image`,control:`${host} .mc-rp-action--up`},
  'up-hover':{family:'actions',state:'hover',width:14,height:14,target:`${host} .mc-rp-arrow>.mc-image`,control:`${host} .mc-rp-action--up`},
  'down-default':{family:'actions',state:'default',width:14,height:14,target:`${host} .mc-rp-arrow>.mc-image`,control:`${host} .mc-rp-action--down`},
  'down-hover':{family:'actions',state:'hover',width:14,height:14,target:`${host} .mc-rp-arrow>.mc-image`,control:`${host} .mc-rp-action--down`},
  'slider-thumb-default':{family:'tier',state:'default',width:10,height:16,target:`${host} .mc-pack-content-tier__thumb-default>.mc-pack-settings-skin`,control:tier},
  'slider-thumb-hover':{family:'tier',state:'hover',width:10,height:16,target:`${host} .mc-pack-content-tier__thumb-hover>.mc-pack-settings-skin`,control:tier},
  'slider-thumb-indent':{family:'tier',state:'pressed',width:10,height:16,target:`${host} .mc-pack-content-tier__thumb-indent>.mc-pack-settings-skin`,control:tier},
  'slider-thumb-locked':{family:'tier',state:'disabled',width:10,height:16,target:`${host} .mc-pack-content-tier__thumb-locked>.mc-pack-settings-skin`,control:tier},
  'header-plus-default':{family:'section',state:'default',width:10,height:10,target:`${host} .mc-resource-packs-section__toggle>.mc-image`,control:`${host} .mc-resource-packs-section__header>.mc-resource-packs-button`},
  'header-plus-hover':{family:'section',state:'hover',width:10,height:10,target:`${host} .mc-resource-packs-section__toggle>.mc-image`,control:`${host} .mc-resource-packs-section__header>.mc-resource-packs-button`},
  'header-minus-default':{family:'section',state:'default',width:10,height:10,target:`${host} .mc-resource-packs-section__toggle>.mc-image`,control:`${host} .mc-resource-packs-section__header>.mc-resource-packs-button`},
  'header-minus-hover':{family:'section',state:'hover',width:10,height:10,target:`${host} .mc-resource-packs-section__toggle>.mc-image`,control:`${host} .mc-resource-packs-section__header>.mc-resource-packs-button`},
};
const supported=Object.keys(definitions) as ResourcePackMaterialFixtureId[];
let current:ResourcePackMaterialConfiguration={fixtureId:'error-default',scale:1,background:'black'};
let generation=0;
const mount=document.getElementById('root');if(!mount)throw new Error('The material fixture root is required.');
const root=createRoot(mount);
const targets:ResourcePackTargets={select:'button.selected_pack_global',readToggle:'button.read_toggle_global',moveLeft:'button.move_left_global',store:'button.store_global',sortUp:'button.sort_up_global',sortDown:'button.sort_down_global',reportErrors:'button.report_errors_global',packSettings:'button.pack_settings_global',deselect:'button.deselected_pack_global'};
const afterFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
function visible(node:Element|null):node is HTMLElement {
  if(!(node instanceof HTMLElement)||!node.getClientRects().length)return false;
  const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.visibility==='visible'&&s.display!=='none'&&r.width>0&&r.height>0;
}
interface BackgroundDecode {state:'pending'|'decoded'|'failed';promise:Promise<void>;image:HTMLImageElement;error?:string}
const backgroundDecodeCache=new Map<string,BackgroundDecode>();
function actualBackgroundURLs():string[]{
  const urls=new Set<string>();
  for(const el of document.querySelectorAll<HTMLElement>(`${host} *`)){
    if(!visible(el))continue;
    for(const match of getComputedStyle(el).backgroundImage.matchAll(/url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g)){
      const url=match[1]??match[2]??match[3]??'';if(url)urls.add(url);
    }
  }
  return [...urls];
}
function decodeActualBackground(url:string):BackgroundDecode {
  const cached=backgroundDecodeCache.get(url);if(cached)return cached;
  // Decode only the URL read from the actual rendered component's computed
  // background. This cache Image is never attached to DOM or used for paint.
  // Resource timing buffers may evict completed entries, so they are not an
  // image readiness oracle. Failed decode remains explicitly unready.
  const image=new window.Image();image.decoding='async';
  const entry:BackgroundDecode={state:'pending',promise:Promise.resolve(),image};
  backgroundDecodeCache.set(url,entry);image.src=url;
  entry.promise=image.decode().then(()=>{
    if(image.naturalWidth<=0||image.naturalHeight<=0)throw new Error('Decoded background has no positive intrinsic dimensions.');
    entry.state='decoded';
  }).catch((error:unknown)=>{entry.state='failed';entry.error=error instanceof Error?error.message:String(error);});
  return entry;
}
function pendingBackgrounds():string[]{return actualBackgroundURLs().filter(url=>backgroundDecodeCache.get(url)?.state!=='decoded');}
function failedBackgrounds():{url:string;error:string}[]{return actualBackgroundURLs().flatMap(url=>{
  const entry=backgroundDecodeCache.get(url);return entry?.state==='failed'?[{url,error:entry.error??'Background decode failed.'}]:[];
});}
function inspect():ResourcePackMaterialInspection{
  const d=definitions[current.fixtureId],target=document.querySelector<HTMLElement>(d.target),control=document.querySelector<HTMLElement>(d.control);
  const actualState={hover:!!control?.matches(':hover'),active:!!control?.matches(':active'),focusVisible:!!control?.matches(':focus-visible'),disabled:!!control&&'disabled'in control&&control.disabled===true};
  const stateMatches=d.state==='disabled'?actualState.disabled:d.state==='pressed'?actualState.active&&!actualState.disabled:d.state==='hover'?actualState.hover&&!actualState.active&&!actualState.disabled:!actualState.hover&&!actualState.active&&!actualState.focusVisible&&!actualState.disabled;
  const isVisible=visible(target),b=isVisible?target.getBoundingClientRect():null,rect=b?{x:b.x,y:b.y,width:b.width,height:b.height}:null;
  const imagesReady=[...document.querySelectorAll<HTMLImageElement>(`${host} img`)].every(img=>img.complete&&img.naturalWidth>0),pending=pendingBackgrounds();
  const expectedSize=[d.width*current.scale,d.height*current.scale] as const;
  return {configuration:{...current},targetSelector:d.target,controlSelector:d.control,actionButtonSelector:d.family==='tier'?null:d.control,requestedState:d.state,expectedSize,
    ready:isVisible&&imagesReady&&pending.length===0&&stateMatches&&rect?.width===expectedSize[0]&&rect?.height===expectedSize[1],visible:isVisible,imagesReady,stateMatches,rect,
    originIsInteger:!!rect&&Number.isInteger(rect.x)&&Number.isInteger(rect.y),actualState,targetFilter:target?getComputedStyle(target).filter:null,pendingBackgroundResources:pending,failedBackgroundResources:failedBackgrounds(),backgroundReadinessPolicy:'decoded-actual-computed-css-url-cache',isolation:'individual-leaf-opaque-host'};
}
function ActualComponents({configuration:c}:{configuration:ResourcePackMaterialConfiguration}){
  const d=definitions[c.fixtureId],record=createResourcePackDemoRecord('selected','global'),base=createResourcePackDemoProps('global');
  if(!record.actions)throw new Error('The authored demo record must include complete action bindings.');
  const diagnostic:ResourcePackDiagnosticSnapshot={...record.actions.diagnostics,hasErrors:c.fixtureId.startsWith('error-'),hasWarnings:c.fixtureId.startsWith('warning-'),hasExpired:false,errorFree:c.fixtureId.startsWith('no-error-'),reportGenerating:false};
  const bindings:ResourcePackActionBindings={...record.actions.bindings,directionVisible:true,isUsingGamepad:false,isSelected:true,platformLocked:false,canMove:false,canGoToStore:false,
    canSortUp:c.fixtureId.startsWith('up-'),canSortDown:c.fixtureId.startsWith('down-'),hasPackSettings:c.fixtureId.startsWith('options-'),reportButtonVisible:d.family==='diagnostics',reportGenerating:false};
  let child;
  if(d.family==='tier'){
    const tierProps=createPackSettingsDemoProps().content.tier;
    child=<PackContentTier {...tierProps} width={339} scale={c.scale} disabled={d.state==='disabled'} web={{...tierProps.web,markers:[]}}
      inputProps={{'aria-label':'Actual source content tier material control'}} onValueChange={(value,detail)=>{api.events.push({kind:'tier-request',value,sourceValue:detail.sourceValue,sourceSteps:detail.sourceSteps});return false;}}/>;
  }else if(d.family==='section'){
    child=<ResourcePackSection profile="global" kind="selected" width={242} scale={c.scale} title="Actual source header" titleVisible expanded={c.fixtureId.startsWith('header-minus-')}
      collection={base.collections.selected} defaultItem={base.defaultItem} diagnostics={{visible:false,anyErrors:false,anyWarnings:false,label:'Source header diagnostics'}}
      onAction={detail=>{api.events.push({kind:'header-request',action:detail.action,target:detail.target});return false;}}/>;
  }else{
    // Public Actions renders the public Diagnostics component inside its real
    // report button. Native button hover/pressed selectors remain production CSS.
    child=<ResourcePackActions {...record.actions} kind="selected" identity={{profile:'global',collection:'#selected_pack_items_global',id:record.id,index:record.index,payload:record.payload}}
      width={242} scale={c.scale} labels={record.labels} targets={targets} lowMemoryDevice={record.lowMemoryDevice} bindings={bindings} diagnostics={diagnostic}
      onAction={detail=>{api.events.push({kind:'action-request',action:detail.action,target:detail.target});return false;}}/>;
  }
  return <div id="material-host" data-fixture-id={c.fixtureId} data-isolation="individual-leaf-opaque-host" style={{left:128,top:128,background:c.background==='black'?'#000':'#fff'}}><div id="material-component">{child}</div></div>;
}
const api:MaterialAPI={
  configure(configuration){
    if(!configuration||!Object.hasOwn(definitions,configuration.fixtureId))throw new RangeError('Unsupported actual public leaf. minus-base/plus-base are unused base controls; use header-plus/minus-default/hover for actual10x10 instances.');
    if(![1,2,3].includes(configuration.scale)||!['black','white'].includes(configuration.background))throw new RangeError('Material fixture requires scale1/2/3 and an opaque black/white background.');
    if(document.activeElement instanceof HTMLElement&&document.activeElement.closest(host))document.activeElement.blur();
    current={...configuration};generation++;api.events.length=0;flushSync(()=>root.render(<ActualComponents key={generation} configuration={current}/>));return inspect();
  },
  inspect,
  async ready(){
    const accepted=generation;await document.fonts.ready;
    await Promise.all([...document.querySelectorAll<HTMLImageElement>(`${host} img`)].map(img=>img.decode().catch(()=>{})));
    await afterFrame();await afterFrame();
    for(let attempt=0;attempt<4&&accepted===generation;attempt++){
      await Promise.all(actualBackgroundURLs().map(url=>decodeActualBackground(url).promise));
      await afterFrame();await afterFrame();
      const result=inspect();if(result.failedBackgroundResources.length>0||result.pendingBackgroundResources.length===0)return result;
    }
    return inspect();
  },
  align(){
    const before=inspect();if(!before.visible||!before.rect)throw new Error('Set the requested native pointer state before aligning its actual visible target.');
    const owner=document.querySelector<HTMLElement>(host);if(!owner)throw new Error('Opaque material host is absent.');
    const dx=Math.round(before.rect.x)-before.rect.x,dy=Math.round(before.rect.y)-before.rect.y;
    owner.style.left=`${parseFloat(owner.style.left)+dx}px`;owner.style.top=`${parseFloat(owner.style.top)+dy}px`;
    owner.dataset.alignmentPolicy='opaque-host-only';return inspect();
  },
  get targetSelector(){return definitions[current.fixtureId].target;},get controlSelector(){return definitions[current.fixtureId].control;},
  get actionButtonSelector(){return definitions[current.fixtureId].family==='tier'?null:definitions[current.fixtureId].control;},
  supportedFixtureIds:Object.freeze(supported),unsupportedFixtureIds:Object.freeze(['minus-base','plus-base']),events:[],
};
window.resourcePackMaterial=api;
api.configure(current);
