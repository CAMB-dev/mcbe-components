import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ManifestValidationButton} from '../src/index';
import type {ManifestValidationActionDetail, ManifestValidationState} from '../src/index';
import '../src/styles.css';

/** Actual public component only. No private glyph, source URL, expected PNG,
 * canvas, timer, clipboard service or mutation provider is supplied here. */
export type ManifestValidationMaterialVariant='copy'|'delete-icon'|'refresh-icon';
export interface ManifestValidationMaterialConfiguration {variant:ManifestValidationMaterialVariant;scale:1|2|3;background:'black'|'white'}
interface Rectangle {x:number;y:number;width:number;height:number}
interface AncestorPaint {tag:string;className:string;filter:string;opacity:string;transform:string}
export interface ManifestValidationMaterialInspection {
  configuration:ManifestValidationMaterialConfiguration;targetSelector:string;controlSelector:string;ready:boolean;visible:boolean;decoded:boolean;decodeError:string|null;
  rect:Rectangle|null;width:number|null;height:number|null;sourceSize:readonly[number,number]|null;expectedSourceSize:readonly[number,number];expectedSize:readonly[number,number];
  displaySizeMatches:boolean;sourceSizeMatches:boolean;originIsInteger:boolean;filter:string|null;opacity:string|null;ancestorPaint:AncestorPaint[];
  nativeState:{hover:boolean;active:boolean;focus:boolean;focusVisible:boolean;disabled:boolean};defaultState:boolean;
  explicitState:ManifestValidationState;loadingFrame:0;isolation:'complete-actual-glyph-on-opaque-host';
}
interface MaterialAPI {
  configure:(configuration:ManifestValidationMaterialConfiguration)=>ManifestValidationMaterialInspection;
  inspect:()=>ManifestValidationMaterialInspection;ready:()=>Promise<ManifestValidationMaterialInspection>;align:()=>ManifestValidationMaterialInspection;
  readonly targetSelector:string;readonly controlSelector:string;readonly supportedVariants:readonly ManifestValidationMaterialVariant[];events:Record<string,unknown>[];
}
declare global {interface Window {manifestValidationMaterial:MaterialAPI}}

const targetSelector='#material-host .mc-manifest-validation-button__icon-wrapper > .mc-image';
const controlSelector='#material-host .mc-manifest-validation-button';
const facts:Record<ManifestValidationMaterialVariant,{source:readonly[number,number];display:readonly[number,number];label:string}>={
  copy:{source:[12,12],display:[13,14],label:'Copy this material issue'},
  'delete-icon':{source:[16,16],display:[11,12],label:'Request deletion of this material pack'},
  'refresh-icon':{source:[18,14],display:[18,14],label:'Request refresh of this material pack'},
};
const explicitState:ManifestValidationState={isWorking:false,isDeleting:false,isDoneValidating:true};
let current:ManifestValidationMaterialConfiguration={variant:'copy',scale:1,background:'black'},epoch=0;
const failures=new WeakMap<HTMLImageElement,string>();
const mount=document.getElementById('root');if(!mount)throw new Error('The manifest material fixture root is required.');
const root=createRoot(mount);
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
function actualTarget():HTMLImageElement|null{const node=document.querySelector(targetSelector);return node instanceof HTMLImageElement?node:null;}
function inspect():ManifestValidationMaterialInspection {
  const image=actualTarget(),control=document.querySelector<HTMLButtonElement>(controlSelector),f=facts[current.variant];
  const visible=!!image&&image.getClientRects().length>0&&getComputedStyle(image).visibility==='visible'&&getComputedStyle(image).display!=='none';
  const bounds=visible?image!.getBoundingClientRect():null,rect=bounds?{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}:null;
  const nativeState={hover:!!control?.matches(':hover'),active:!!control?.matches(':active'),focus:!!control?.matches(':focus'),focusVisible:!!control?.matches(':focus-visible'),disabled:!!control?.disabled};
  const defaultState=!Object.values(nativeState).some(Boolean),sourceSize=image?[image.naturalWidth,image.naturalHeight] as const:null,expectedSize=[f.display[0]*current.scale,f.display[1]*current.scale] as const;
  const decoded=!!image&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0&&!failures.has(image),ancestorPaint:AncestorPaint[]=[];
  for(let node:HTMLElement|null=image;node;node=node.parentElement){const style=getComputedStyle(node);ancestorPaint.push({tag:node.tagName,className:node.className,filter:style.filter,opacity:style.opacity,transform:style.transform});if(node.id==='material-host')break;}
  return {configuration:{...current},targetSelector,controlSelector,ready:visible&&decoded&&defaultState,visible,decoded,decodeError:image?failures.get(image)??null:null,rect,width:rect?.width??null,height:rect?.height??null,sourceSize,
    expectedSourceSize:f.source,expectedSize,displaySizeMatches:rect?.width===expectedSize[0]&&rect?.height===expectedSize[1],sourceSizeMatches:sourceSize?.[0]===f.source[0]&&sourceSize[1]===f.source[1],
    originIsInteger:!!rect&&Number.isInteger(rect.x)&&Number.isInteger(rect.y),filter:image?getComputedStyle(image).filter:null,opacity:image?getComputedStyle(image).opacity:null,ancestorPaint,nativeState,defaultState,
    explicitState:{...explicitState},loadingFrame:0,isolation:'complete-actual-glyph-on-opaque-host'};
}
function ActualButton({configuration:c}:{configuration:ManifestValidationMaterialConfiguration}){
  const common={identity:{runKey:'manifest-material-run',packId:'manifest-material-pack',payload:{fixture:true,variant:c.variant}},state:{...explicitState},loadingFrame:0,label:facts[c.variant].label,scale:c.scale,
    disabled:false,readOnly:false,onAction:(detail:ManifestValidationActionDetail)=>{api.events.push({action:detail.action,target:detail.target,issueId:detail.issue?.id,runKey:detail.runKey,packId:detail.packId});return false as const;}};
  const button=c.variant==='copy'?<ManifestValidationButton {...common} variant="copy" issue={{id:'material-copy-issue',index:0,collection:'pack_errors',payload:{fixture:true}}}/>:<ManifestValidationButton {...common} variant={c.variant}/>;
  return <div id="material-host" data-variant={c.variant} data-isolation="complete-actual-glyph-on-opaque-host" style={{left:128,top:128,background:c.background==='black'?'#000':'#fff'}}><div id="material-mount">{button}</div></div>;
}
const api:MaterialAPI={
  configure(configuration){
    if(!configuration||!Object.hasOwn(facts,configuration.variant)||![1,2,3].includes(configuration.scale)||!['black','white'].includes(configuration.background))throw new RangeError('Manifest material configuration requires copy/delete-icon/refresh-icon, scale1/2/3, and black/white.');
    if(document.activeElement instanceof HTMLElement&&document.activeElement.closest('#material-host'))document.activeElement.blur();
    current={...configuration};epoch++;api.events.length=0;flushSync(()=>root.render(<ActualButton key={epoch} configuration={current}/>));return inspect();
  },
  inspect,
  async ready(){
    const accepted=epoch,image=actualTarget();if(image){try{await image.decode();}catch(error:unknown){failures.set(image,error instanceof Error?error.message:String(error));}}
    await frame();await frame();if(accepted!==epoch)return inspect();return inspect();
  },
  align(){
    const before=inspect();if(!before.visible||!before.rect)throw new Error('The actual glyph must be visible before outer-host alignment.');
    const owner=document.querySelector<HTMLElement>('#material-host');if(!owner)throw new Error('Opaque material host is absent.');
    owner.style.left=`${parseFloat(owner.style.left)+Math.round(before.rect.x)-before.rect.x}px`;
    owner.style.top=`${parseFloat(owner.style.top)+Math.round(before.rect.y)-before.rect.y}px`;
    owner.dataset.alignmentPolicy='opaque-host-only';return inspect();
  },
  targetSelector,controlSelector,supportedVariants:Object.freeze(['copy','delete-icon','refresh-icon'] as const),events:[],
};
window.manifestValidationMaterial=api;
api.configure(current);
