import { StrictMode } from 'react';
import type { RefCallback, SyntheticEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { MobEffectScreen } from '../src/mob-effect-screen';
import type { MobEffectCloseDetail, MobEffectControllerCommand, MobEffectControllerHandle, MobEffectEntry, MobEffectScreenProps } from '../src/mob-effect-types';
import '../src/mob-effect-screen.css';

/** Explicit authored font metrics/policies, not game install fonts or a native
 * screen preset. World state/navigation are owned by this fixture host. */
export type MobEffectFixtureSettings = Omit<MobEffectScreenProps, 'onCloseRequested'|'controllerRef'|'viewportRef'|'closeRef'|'rowRefs'>;
export interface MobEffectFixtureRefs {
  root:HTMLElement|null; viewport:HTMLDivElement|null; close:HTMLButtonElement|null;
  row0:HTMLDivElement|null; controller:MobEffectControllerHandle|null;
}
export interface MobEffectFixtureReceipt {
  readonly version:number;readonly reason:MobEffectCloseDetail['reason'];readonly origin:MobEffectCloseDetail['origin'];
  readonly target?:'button.menu_continue';readonly fromButtonId?:MobEffectControllerCommand['fromButtonId'];readonly sourceProperty?:'close_on_player_hurt';
  readonly event:boolean;readonly trusted:boolean|null;readonly currentTag:string|null;readonly controlTag:string;readonly currentMatchesControl:boolean|null;
}
export interface MobEffectFixtureNativeEvent {readonly type:string;readonly trusted:boolean;readonly cancelable:boolean;readonly prevented:boolean;readonly key:string|null}
export interface MobEffectFixtureQA {
  configure(patch:Partial<MobEffectFixtureSettings>):void;
  reset():void;clear():void;getVersion():number;
  getRefs():Readonly<MobEffectFixtureRefs>;
  getRefStats():Readonly<Record<keyof MobEffectFixtureRefs,{readonly attach:number;readonly release:number}>>;
  getReceipts():readonly MobEffectFixtureReceipt[];
  getNativeEvents():readonly MobEffectFixtureNativeEvent[];
  setDocumentVeto(value:boolean):void;setHideOnDocumentEvent(value:boolean):void;
  request(command:MobEffectControllerCommand):boolean;notifyPlayerHurt():boolean;
  queuedAndPatch(patch:Partial<MobEffectFixtureSettings>):boolean;
  unmount():void;
}
declare global { interface Window { __mobEffectQA:MobEffectFixtureQA } }

const refs:MobEffectFixtureRefs={root:null,viewport:null,close:null,row0:null,controller:null};
const refIds:readonly(keyof MobEffectFixtureRefs)[]=['root','viewport','close','row0','controller'];
const stats:Record<keyof MobEffectFixtureRefs,{attach:number;release:number}>={root:{attach:0,release:0},viewport:{attach:0,release:0},close:{attach:0,release:0},row0:{attach:0,release:0},controller:{attach:0,release:0}};
const receipts:MobEffectFixtureReceipt[]=[],nativeEvents:MobEffectFixtureNativeEvent[]=[];
const element=(id:string)=>document.getElementById(id)!;
for(const id of refIds){const span=document.createElement('span');span.id=`ref-${id}`;span.textContent=`${id}: detached`;element('ref-status').append(span);}
function callback<T>(id:keyof MobEffectFixtureRefs,store:(value:T|null)=>void):RefCallback<T> {
  let previous:(()=>void)|undefined;
  return value=>{
    previous?.();previous=undefined;
    if(value===null)return;
    store(value);stats[id].attach++;element(`ref-${id}`).textContent=`${id}: attached`;
    let live=true;
    const release=()=>{if(!live)return;live=false;store(null);stats[id].release++;element(`ref-${id}`).textContent=`${id}: released`;};
    previous=release;return release;
  };
}
const attach={root:callback<HTMLElement>('root',value=>{refs.root=value;}),viewport:callback<HTMLDivElement>('viewport',value=>{refs.viewport=value;}),
  close:callback<HTMLButtonElement>('close',value=>{refs.close=value;}),row0:callback<HTMLDivElement>('row0',value=>{refs.row0=value;}),
  controller:callback<MobEffectControllerHandle>('controller',value=>{refs.controller=value;})};
function initial():MobEffectFixtureSettings {
  const effects=Array.from({length:12},(_,index):MobEffectEntry=>({id:`e${index}`,name:`Effect ${index}`,timer:`${index}:07`,ambient:index%2===1,icon:{kind:'known-effect',effect:index%2?'haste':'speed'}}));
  return {effects,gridDimensions:[1,12],availableSize:[400,200],scale:2,sourceProfile:'desktop',inputMode:'mouse',closeButtonVisible:true,touchThumbVisible:true,
    textProfile:{name:{fontSize:8,lineHeight:8,fontFamily:'monospace'},timer:{fontSize:8,lineHeight:8,fontFamily:'monospace',shadow:false},provenance:'explicit-web-profile'},
    iconLayout:{kind:'parent-percent-contain-web-policy'},layoutPolicy:'source-formulas-parent-percent-web',label:'Effects',closeLabel:'Close effects',scrollLabel:'Effect list'};
}
let settings=initial(),version=0,veto=false,hideOnEvent=false;
const mounted=createRoot(element('app'));
function record(detail:MobEffectCloseDetail,callbackVersion:number){
  const event:SyntheticEvent<HTMLElement>|undefined='event'in detail?detail.event:undefined;
  const common={version:callbackVersion,reason:detail.reason,origin:detail.origin,event:!!event,trusted:event?.isTrusted??null,
    currentTag:event?.currentTarget.tagName??null,controlTag:detail.control.tagName,currentMatchesControl:event?event.currentTarget===detail.control:null};
  const receipt:MobEffectFixtureReceipt=detail.reason==='continue'?{...common,target:detail.target,...(detail.fromButtonId?{fromButtonId:detail.fromButtonId}:{})}:{...common,sourceProperty:detail.sourceProperty};
  receipts.push(receipt);const li=document.createElement('li');li.textContent=JSON.stringify(receipt);li.dataset.reason=receipt.reason;li.dataset.version=String(receipt.version);element('close-events').append(li);
  element('close-status').textContent=`Requested ${detail.reason} via ${detail.origin}`;
}
function configure(patch:Partial<MobEffectFixtureSettings>={}){
  settings={...settings,...patch};const callbackVersion=++version;
  flushSync(()=>mounted.render(<StrictMode><MobEffectScreen {...settings} ref={attach.root} controllerRef={attach.controller} viewportRef={attach.viewport}
    closeRef={attach.close} rowRefs={{e0:attach.row0}} onCloseRequested={detail=>record(detail,callbackVersion)}/></StrictMode>));
  element('callback-version').textContent=String(callbackVersion);
}
function clear(){receipts.splice(0);nativeEvents.splice(0);element('close-events').replaceChildren();element('native-events').replaceChildren();element('close-status').textContent='No close requests';}
for(const type of['click','keydown'])document.addEventListener(type,event=>{
  if(!(event.target instanceof Node)||!refs.root?.contains(event.target))return;
  if(veto)event.preventDefault();
  if(hideOnEvent)configure({open:false});
  const value:MobEffectFixtureNativeEvent={type:event.type,trusted:event.isTrusted,cancelable:event.cancelable,prevented:event.defaultPrevented,key:event instanceof KeyboardEvent?event.key:null};
  nativeEvents.push(value);const li=document.createElement('li');li.textContent=JSON.stringify(value);li.dataset.type=value.type;li.dataset.prevented=String(value.prevented);element('native-events').append(li);
});
window.__mobEffectQA={configure,reset(){settings=initial();veto=false;hideOnEvent=false;configure();},clear,getVersion:()=>version,
  getRefs:()=>({...refs}),getRefStats:()=>Object.fromEntries(refIds.map(id=>[id,{...stats[id]}])) as Record<keyof MobEffectFixtureRefs,{attach:number;release:number}>,
  getReceipts:()=>receipts.map(value=>({...value})),getNativeEvents:()=>nativeEvents.map(value=>({...value})),
  setDocumentVeto(value){veto=value;},setHideOnDocumentEvent(value){hideOnEvent=value;},
  request:command=>refs.controller?.request(command)??false,notifyPlayerHurt:()=>refs.controller?.notifyPlayerHurt()??false,
  queuedAndPatch(patch){const accepted=refs.controller?.request({destination:'screen',fromButtonId:'button.menu_cancel'})??false;configure(patch);return accepted;},
  unmount(){flushSync(()=>mounted.unmount());}
};
configure();
