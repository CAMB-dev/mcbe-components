import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import { PROGRESS_CONTENTS, PROGRESS_RESOURCE_FACTORY_IDS, PROGRESS_ROUTES } from './progress-route';
import type { ProgressAuxiliaryState, ProgressCapabilities, ProgressCloudState, ProgressConflictPopup, ProgressFontSpec, ProgressPackCollection, ProgressPackState, ProgressPresentationProfile, ProgressResourcePopup, ProgressScreenModel, ProgressScreenSnapshot, ProgressSize, ProgressTextRole, ProgressWholeImage } from './progress-types';

/** Explicit finite Web implementation limits, never inferred engine budgets. */
export const PROGRESS_WEB_LIMITS=Object.freeze({recordFields:256,mapFields:512,entries:4096,textUnits:4194304,stringUnits:1048576,imageAxis:8192,imagePixels:16777216,physicalPixels:16777216});
interface Budget{units:number;images:number}
type Data=Record<string,unknown>;
function record(value:unknown,label:string,max:number=PROGRESS_WEB_LIMITS.recordFields):Data{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError(`${label} must be a plain data record`);
 const keys=Reflect.ownKeys(value);if(keys.length>max)throw new RangeError(`${label} exceeds finite Web property budget`);
 const copy:Data=Object.create(null);for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!d?.enumerable||!('value'in d))throw new TypeError(`${label} requires enumerable own data properties`);copy[key]=d.value;}return copy;
}
function array(value:unknown,label:string):unknown[]{
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new TypeError(`${label} must be a dense plain array`);
 const length=Object.getOwnPropertyDescriptor(value,'length')?.value;if(!Number.isSafeInteger(length)||length>PROGRESS_WEB_LIMITS.entries)throw new RangeError(`${label} exceeds finite Web array budget`);
 const result:unknown[]=[];for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d?.enumerable||!('value'in d))throw new TypeError(`${label} has a sparse/accessor entry`);result.push(d.value);}
 if(Reflect.ownKeys(value).length!==length+1)throw new TypeError(`${label} has additional array properties`);return result;
}
function text(value:unknown,label:string,b:Budget,max:number=PROGRESS_WEB_LIMITS.stringUnits,nonempty=false):string{
 if(typeof value!=='string'||value.length>max||nonempty&&!value.trim())throw new TypeError(`${label} must be a bounded${nonempty?' nonempty':''} string`);
 if((b.units+=value.length)>PROGRESS_WEB_LIMITS.textUnits)throw new RangeError('Progress aggregate UTF-16 budget exceeded');return value;
}
const id=(value:unknown,label:string,b:Budget)=>text(value,label,b,256,true);
function flag(value:unknown,label:string):boolean{if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function number(value:unknown,label:string,min=-Number.MAX_VALUE,max=Number.MAX_VALUE):number{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${label} must be finite in[${min},${max}]`);return value;}
function integer(value:unknown,label:string,min:number,max:number):number{const n=number(value,label,min,max);if(!Number.isSafeInteger(n))throw new RangeError(`${label} must be a safe integer`);return n;}
function member<T extends string>(value:unknown,choices:readonly T[],label:string):T{if(typeof value!=='string'||!choices.includes(value as T))throw new RangeError(`${label} is unknown`);return value as T;}
function size(value:unknown,label:string,zero=false):ProgressSize{const a=array(value,label);if(a.length!==2)throw new TypeError(`${label} requires two axes`);return Object.freeze([number(a[0],label+'.width',zero?0:Number.MIN_VALUE,8192),number(a[1],label+'.height',zero?0:Number.MIN_VALUE,8192)]);}
function color(value:unknown,label:string,b:Budget):string{const s=text(value,label,b,128,true);if(!/^(#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|rgba?\([\d.% ,/+-]+\))$/i.test(s))throw new TypeError(`${label} requires an explicit hex/rgb color`);return s;}
function image(value:unknown,label:string,b:Budget):ProgressWholeImage{
 const d=record(value,label),src=text(d.src,label+'.src',b,PROGRESS_WEB_LIMITS.stringUnits,true),naturalSize=size(d.naturalSize,label+'.naturalSize');
 if(/^\s*(?:javascript|vbscript):/i.test(src))throw new TypeError(`${label} has an unsupported image scheme`);
 if(!naturalSize.every(Number.isSafeInteger))throw new RangeError(`${label} physical dimensions must be integral`);
 if((b.images+=naturalSize[0]*naturalSize[1])>PROGRESS_WEB_LIMITS.imagePixels)throw new RangeError('Progress whole-image pixel budget exceeded');
 return Object.freeze({src,naturalSize,provenance:text(d.provenance,label+'.provenance',b,4096,true)});
}
function font(value:unknown,label:string,b:Budget):ProgressFontSpec{const d=record(value,label);return Object.freeze({family:text(d.family,label+'.family',b,512,true),logicalSize:number(d.logicalSize,label+'.logicalSize',Number.MIN_VALUE,1024),lineHeight:number(d.lineHeight,label+'.lineHeight',Number.MIN_VALUE,4096),provenance:text(d.provenance,label+'.provenance',b,4096,true)});}
function capabilities(value:unknown):ProgressCapabilities{const d=record(value,'Progress capabilities');return Object.freeze({sourceProfile:member(d.sourceProfile,['desktop','pocket'],'Progress sourceProfile'),inputMode:member(d.inputMode,['mouse','touch'],'Progress inputMode'),educationEdition:flag(d.educationEdition,'educationEdition'),cloudSaveOn:flag(d.cloudSaveOn,'cloudSaveOn'),android:flag(d.android,'android'),ios:flag(d.ios,'ios')});}
function profile(value:unknown,b:Budget):ProgressPresentationProfile{
 const d=record(value,'Progress profile'),f=record(d.fonts,'Progress fonts'),roles:readonly ProgressTextRole[]=['title','progress','code','error','button','pack','conflict','auxiliary'];
 const fonts=Object.fromEntries(roles.map(role=>[role,font(f[role],'Progress font '+role,b)]))as Record<ProgressTextRole,ProgressFontSpec>;
 const sizes=record(d.intrinsicSizes,'Progress intrinsicSizes',PROGRESS_WEB_LIMITS.mapFields),intrinsicSizes:Record<string,ProgressSize>=Object.create(null);
 for(const[key,value]of Object.entries(sizes))intrinsicSizes[id(key,'Progress intrinsic source path',b)]=size(value,'Progress intrinsic '+key,true);
 const rawLabels=record(d.labels,'Progress labels',PROGRESS_WEB_LIMITS.mapFields),labels:Record<string,string>=Object.create(null);
 for(const[key,value]of Object.entries(rawLabels))labels[id(key,'Progress localization id',b)]=text(value,'Progress label '+key,b);
 const availableSize=size(d.availableSize,'Progress availableSize'),scale=integer(d.scale,'Progress scale',1,64);
 if(availableSize[0]*availableSize[1]*scale*scale>PROGRESS_WEB_LIMITS.physicalPixels)throw new RangeError('Progress physical render budget exceeded');
 const transitions=record(d.transitions,'Progress transitions'),bar=record(d.customBar,'Progress customBar'),kind=member(bar.kind,['native-unrecovered','explicit-web-clip'],'Progress customBar kind');
 const customBar:ProgressPresentationProfile['customBar']=kind==='native-unrecovered'?Object.freeze({kind}):Object.freeze({kind,clipRatio:number(bar.clipRatio,'Progress explicit Web clipRatio',0,1),provenance:text(bar.provenance,'Progress customBar provenance',b,4096,true)});
 const materials=record(d.unresolvedMaterials,'Progress unresolvedMaterials');
 return Object.freeze({availableSize,scale,fonts:Object.freeze(fonts),layoutPolicy:member(d.layoutPolicy,['finite-parent-content-source-formulas-web'],'Progress layoutPolicy'),provenance:text(d.provenance,'Progress profile provenance',b,4096,true),intrinsicSizes:Object.freeze(intrinsicSizes),labels:Object.freeze(labels),loadingTextColor:color(d.loadingTextColor,'Progress loading color',b),titleTextColor:color(d.titleTextColor,'Progress title color',b),transitions:Object.freeze({pushSeconds:number(transitions.pushSeconds,'Progress push seconds',0,3600),popSeconds:number(transitions.popSeconds,'Progress pop seconds',0,3600),policy:member(transitions.policy,['host-screen-events-web'],'Progress transition policy')}),customBar,unresolvedMaterials:Object.freeze({...materials.externalLink===undefined?{}:{externalLink:image(materials.externalLink,'Progress externalLink',b)},...materials.realmsBackground===undefined?{}:{realmsBackground:image(materials.realmsBackground,'Progress Realms background',b)}}),buttonStatePolicy:member(d.buttonStatePolicy,['unresolved-desktop-literals','explicit-common-classic-web'],'Progress button state policy'),motionPolicy:member(d.motionPolicy,['explicit-frames-web'],'Progress motion policy'),modalPolicy:member(d.modalPolicy,['explicit-web-stack'],'Progress modal policy')});
}
function packs(value:unknown,label:string,b:Budget):ProgressPackCollection{
 const d=record(value,label),dimensions=size(d.dimensions,label+'.dimensions',true);if(!dimensions.every(Number.isSafeInteger)||dimensions[0]*dimensions[1]>PROGRESS_WEB_LIMITS.entries)throw new RangeError(`${label} grid exceeds finite Web capacity`);
 const entries=array(d.entries,label+'.entries');if(entries.length>dimensions[0]*dimensions[1])throw new RangeError(`${label} exceeds declared grid capacity`);const ids=new Set<string>();
 return Object.freeze({dimensions,entries:Object.freeze(entries.map((entry,index)=>{const e=record(entry,`${label}[${index}]`),key=id(e.id,label+'.id',b);if(ids.has(key))throw new TypeError(`${label} has duplicate id`);ids.add(key);return Object.freeze({id:key,name:text(e.name,label+'.name',b),selected:flag(e.selected,label+'.selected'),payload:e.payload});}))});
}
function resourcePopup(value:unknown,b:Budget):ProgressResourcePopup|null{if(value===null)return null;const d=record(value,'Progress resource popup');return Object.freeze({instanceId:id(d.instanceId,'Progress resource popup instance',b),factoryId:member(d.factoryId,PROGRESS_RESOURCE_FACTORY_IDS,'Progress resource factory id'),description:text(d.description,'Progress resource description',b),showRayTracingWarning:flag(d.showRayTracingWarning,'Progress ray warning visible'),rayTracingWarning:text(d.rayTracingWarning,'Progress ray warning',b),joinEverythingText:text(d.joinEverythingText,'Progress join everything text',b),joinRequiredText:text(d.joinRequiredText,'Progress join required text',b)});}
function conflict(value:unknown,b:Budget):ProgressConflictPopup|null{if(value===null)return null;const d=record(value,'Progress conflict popup');return Object.freeze({instanceId:id(d.instanceId,'Progress conflict instance',b),description:text(d.description,'Progress conflict description',b),localName:text(d.localName,'Progress local name',b),localDate:text(d.localDate,'Progress local date',b),cloudName:text(d.cloudName,'Progress cloud name',b),cloudDate:text(d.cloudDate,'Progress cloud date',b)});}
function cloud(value:unknown,b:Budget):ProgressCloudState{const d=record(value,'Progress cloud');return Object.freeze({uploadError:flag(d.uploadError,'Progress uploadError'),downloadError:flag(d.downloadError,'Progress downloadError'),uploadImagesVisible:flag(d.uploadImagesVisible,'Progress uploadImagesVisible'),oneButtonPanel:flag(d.oneButtonPanel,'Progress oneButtonPanel'),linkVisible:flag(d.linkVisible,'Progress linkVisible'),hyperlinkLabel:text(d.hyperlinkLabel,'Progress hyperlink label',b),codeText:text(d.codeText,'Progress code text',b),codeNumber:text(d.codeNumber,'Progress code number',b),serverTimeoutText:text(d.serverTimeoutText,'Progress server timeout text',b)});}
function auxiliary(value:unknown,b:Budget):ProgressAuxiliaryState{const d=record(value,'Progress auxiliary');return Object.freeze({mobileDataVisibleAtInstanceCreation:flag(d.mobileDataVisibleAtInstanceCreation,'Progress mobile data once visible'),serverRegionVisible:flag(d.serverRegionVisible,'Progress server region visible'),serverRegionText:text(d.serverRegionText,'Progress server region text',b),serverRegionPingIcon:d.serverRegionPingIcon===null?null:image(d.serverRegionPingIcon,'Progress server region ping icon',b)});}
/** Independent private leaves share the same pure schema and fresh budgets. */
export function snapshotProgressProfile(value:ProgressPresentationProfile):ProgressPresentationProfile{return profile(value,{units:0,images:0});}
export function snapshotProgressWholeImage(value:ProgressWholeImage):ProgressWholeImage{return image(value,'Progress whole image',{units:0,images:0});}
export function snapshotProgressPacks(value:ProgressPackState):ProgressPackState{const d=record(value,'Progress packs'),b:Budget={units:0,images:0};return Object.freeze({required:packs(d.required,'Progress required packs',b),optional:packs(d.optional,'Progress optional packs',b),selectedCountText:text(d.selectedCountText,'Progress selected count text',b),selectedSizeText:text(d.selectedSizeText,'Progress selected size text',b)});}
export function snapshotProgressResourcePopup(value:ProgressResourcePopup|null):ProgressResourcePopup|null{return resourcePopup(value,{units:0,images:0});}
export function validateProgressRef(value:unknown):asserts value is Ref<HTMLElement>|undefined{
 if(value===undefined||value===null||typeof value==='function')return;
 if(typeof value!=='object'||!['current'].every(key=>Object.prototype.hasOwnProperty.call(value,key)))throw new TypeError('Progress root ref must be a React callback/object ref');
 const d=Object.getOwnPropertyDescriptor(value,'current');if(!d||!('value'in d)||!d.writable)throw new TypeError('Progress root ref requires a writable data current field');
}
function native(value:unknown,b:Budget):ProgressScreenModel['nativeProps']{
 if(value===undefined)return undefined;const d=record(value,'Progress native props');
 if(d.children!==undefined||d.dangerouslySetInnerHTML!==undefined)throw new TypeError('Progress owns its source contents');
 for(const[key,value]of Object.entries(d)){
  if(/^on[A-Z]/.test(key)&&value!==undefined&&value!==null&&typeof value!=='function')throw new TypeError(`Progress native ${key} must be callable`);
  if(key!=='style'&&!/^on[A-Z]/.test(key)&&value!==undefined&&value!==null&&!['string','boolean','number'].includes(typeof value))throw new TypeError(`Progress native ${key} must be primitive DOM data`);
  if(typeof value==='number'&&!Number.isFinite(value))throw new TypeError(`Progress native ${key} must be finite`);
  if(typeof value==='string')text(value,`Progress native ${key}`,b,key==='className'?4096:PROGRESS_WEB_LIMITS.stringUnits);
  if(key==='ref')throw new TypeError('Use Progress rootRef');
 }
 if(d.hidden!==undefined)flag(d.hidden,'Progress native hidden');if(d.className!==undefined&&typeof d.className!=='string')throw new TypeError('Progress native className must be a string');
 if(d.style!==undefined){const styles=record(d.style,'Progress native style'),copy:Record<string,string|number|undefined>=Object.create(null);for(const[key,value]of Object.entries(styles)){
  if(key.startsWith('--mc-progress-')||['width','height','minWidth','minHeight','padding','border','margin','overflow','position','display'].includes(key))throw new TypeError(`Progress owns style.${key}; position the parent`);
  if(value!==undefined&&typeof value!=='string'&&!(typeof value==='number'&&Number.isFinite(value)))throw new TypeError('Progress style requires finite CSS data');if(typeof value==='string')text(value,`Progress native style.${key}`,b);copy[key]=value as string|number|undefined;
 }d.style=Object.freeze(copy)as CSSProperties;}
 return Object.freeze(d)as HTMLAttributes<HTMLElement>;
}
/** Atomic pure snapshot: no callbacks, DOM/ref writes, service IO or opaque
 * traversal. Every declared branch is validated, including hidden factories. */
export function snapshotProgressScreenModel(value:ProgressScreenModel):ProgressScreenSnapshot{
 const d=record(value,'Progress model'),b:Budget={units:0,images:0};
 for(const key of['onAction','onPackSelectionChange'])if(typeof d[key]!=='function')throw new TypeError(`Progress ${key} is required`);
 if(d.renderText!==undefined&&typeof d.renderText!=='function')throw new TypeError('Progress renderText must be callable');validateProgressRef(d.rootRef);
 const binding=record(d.bindings,'Progress bindings'),ind=record(d.indicators,'Progress indicators'),p=record(d.packs,'Progress packs');
 let injectedContent:ProgressScreenModel['injectedContent']=null;
 if(d.injectedContent!==null){const x=record(d.injectedContent,'Progress explicit content');injectedContent=Object.freeze({content:member(x.content,PROGRESS_CONTENTS,'Progress explicit content name'),provenance:text(x.provenance,'Progress explicit content provenance',b,4096,true)});}
 const route=member(d.route,PROGRESS_ROUTES,'Progress route');if(injectedContent&&route!=='progress_screen')throw new TypeError('Progress explicit helper injection belongs only to generic progress_screen');
 const snapshot:ProgressScreenSnapshot={runKey:id(d.runKey,'Progress runKey',b),open:flag(d.open,'Progress open'),disabled:flag(d.disabled,'Progress disabled'),readOnly:flag(d.readOnly,'Progress readOnly'),route,capabilities:capabilities(d.capabilities),profile:profile(d.profile,b),injectedContent,
 bindings:Object.freeze({titleText:text(binding.titleText,'Progress title text',b),progressText:text(binding.progressText,'Progress progress text',b),titleBinding:id(binding.titleBinding,'Progress title binding',b),progressBinding:id(binding.progressBinding,'Progress progress binding',b),cancelText:text(binding.cancelText,'Progress cancel text',b),cancelVisible:flag(binding.cancelVisible,'Progress cancel visible'),retryAndAbortVisible:flag(binding.retryAndAbortVisible,'Progress retry and abort visible'),okVisible:flag(binding.okVisible,'Progress OK visible'),ttsEnabled:flag(binding.ttsEnabled,'Progress TTS enabled'),forceRenderBelow:flag(binding.forceRenderBelow,'Progress force render below')}),
 indicators:Object.freeze({barAnimationVisible:flag(ind.barAnimationVisible,'Progress wave visible'),spinnerAnimationVisible:flag(ind.spinnerAnimationVisible,'Progress spinner visible'),loadingBarVisible:flag(ind.loadingBarVisible,'Progress loading bar visible'),progressAnimationVisible:flag(ind.progressAnimationVisible,'Progress animation visible'),useDeterminateAnimation:flag(ind.useDeterminateAnimation,'Progress use determinate'),autoSaveVisible:flag(ind.autoSaveVisible,'Progress autosave visible'),percentage:number(ind.percentage,'Progress percentage',0,1),currentAmount:number(ind.currentAmount,'Progress current amount'),totalAmount:number(ind.totalAmount,'Progress total amount'),waveFrame:integer(ind.waveFrame,'Progress wave frame',0,9),spinnerFrame:integer(ind.spinnerFrame,'Progress spinner frame',0,9),autoSaveFrame:integer(ind.autoSaveFrame,'Progress autosave frame',0,8),paused:flag(ind.paused,'Progress paused')}),
 packs:Object.freeze({required:packs(p.required,'Progress required packs',b),optional:packs(p.optional,'Progress optional packs',b),selectedCountText:text(p.selectedCountText,'Progress selected count text',b),selectedSizeText:text(p.selectedSizeText,'Progress selected size text',b)}),resourcePopup:resourcePopup(d.resourcePopup,b),cloud:cloud(d.cloud,b),conflictPopup:conflict(d.conflictPopup,b),auxiliary:auxiliary(d.auxiliary,b),onAction:d.onAction as ProgressScreenModel['onAction'],onPackSelectionChange:d.onPackSelectionChange as ProgressScreenModel['onPackSelectionChange'],renderText:d.renderText as ProgressScreenModel['renderText'],rootRef:d.rootRef as ProgressScreenModel['rootRef'],nativeProps:native(d.nativeProps,b)};
 return Object.freeze(snapshot);
}
