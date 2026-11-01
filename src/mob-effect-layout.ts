import type { Ref } from 'react';
import { classicInputFontFamily, resolveClassicInputFont } from './classic-input-font';
import { mobEffectIconBackgrounds } from './mob-effect-assets';
import type { MobEffectEntry, MobEffectIconLayout, MobEffectIconSource, MobEffectLabelFont, MobEffectLayoutTrace, MobEffectListLayout,
  MobEffectRect, MobEffectRowLayout, MobEffectScreenLayout, MobEffectTextProfile } from './mob-effect-types';

const MAX_CELLS=4096, MAX_TEXT=4096, MAX_UNITS=1048576, MAX_EXTENT=8192, MAX_PIXELS=4194304;
function record(value:unknown,label:string,max=64):Record<string,unknown> {
  if (!value || typeof value!=='object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${label} must be a plain data record`);
  const copy:Record<string,unknown>=Object.create(null);
  const keys=Reflect.ownKeys(value);if(keys.length>max)throw new RangeError(`${label} exceeds the finite${max}-property Web record budget`);
  for (const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if (typeof key!=='string' || !descriptor || !descriptor.enumerable || !('value' in descriptor)) throw new TypeError(`${label} requires enumerable data properties, without accessors or symbols`);
    copy[key]=descriptor.value;
  }
  return copy;
}
function array(value:unknown,label:string,max:number):unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value)!==Array.prototype) throw new TypeError(`${label} must be a dense plain array within${max} entries`);
  const lengthDescriptor=Object.getOwnPropertyDescriptor(value,'length');
  const length=lengthDescriptor&&'value' in lengthDescriptor?lengthDescriptor.value:undefined;
  if(!Number.isSafeInteger(length)||length<0||length>max)throw new RangeError(`${label} exceeds the finite${max}-entry Web array budget`);
  const copy:unknown[]=[];
  for (let index=0;index<length;index++) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new TypeError(`${label}[${index}] must be an own data element`);
    copy.push(descriptor.value);
  }
  if (Reflect.ownKeys(value).some(key=>key!=='length' && (typeof key!=='string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key)>=length))) throw new TypeError(`${label} cannot have extra properties`);
  return copy;
}
function number(value:unknown,label:string,min=0):number { if (typeof value!=='number' || !Number.isFinite(value) || value<min) throw new RangeError(`${label} must be finite and at least${min}`); return value; }
function integer(value:unknown,label:string,min=0):number { const next=number(value,label,min);if(!Number.isSafeInteger(next))throw new RangeError(`${label} must be a safe integer`);return next; }
function positive(value:unknown,label:string):number {const next=number(value,label);if(next===0)throw new RangeError(`${label} must be positive`);return next;}
function flag(value:unknown,label:string):boolean {if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function text(value:unknown,label:string,max=MAX_TEXT,nonempty=false):string {if(typeof value!=='string'||value.length>max||(nonempty&&!value.trim()))throw new TypeError(`${label} must be a${nonempty?' nonempty':''} string within${max} UTF-16 units`);return value;}
function singleLine(value:unknown,label:string):string {const next=text(value,label);if(/[\r\n]/.test(next))throw new RangeError(`${label} must be a literal single line under the explicit Web profile`);return next;}
function pair(value:unknown,label:string,allowZero=false,whole=false):readonly[number,number] {
  const values=array(value,label,2);if(values.length!==2)throw new TypeError(`${label} requires two entries`);
  const read=whole?integer:allowZero?number:positive;
  const result=[read(values[0],`${label}[0]`,allowZero?0:1),read(values[1],`${label}[1]`,allowZero?0:1)] as const;
  return Object.freeze(result);
}
function scaleValue(value:unknown):number {return integer(value,'MobEffect scale',1);}
function physical(width:number,height:number,scale:number,label:string,zero=false) {
  if (![width,height].every(value=>Number.isFinite(value)&&(zero?value>=0:value>0))) throw new RangeError(`${label} computed child extent must be ${zero?'nonnegative':'positive'} and finite`);
  const w=width*scale,h=height*scale;
  if (!Number.isFinite(w)||!Number.isFinite(h)||w>MAX_EXTENT||h>MAX_EXTENT||w*h>MAX_PIXELS)throw new RangeError(`${label} exceeds the finite Web8192-per-axis/4194304-pixel budget`);
}
function dimensions(value:unknown):readonly[number,number] {
  const result=pair(value,'#mob_effect_grid_size',true,true);
  if(result[0]*result[1]>MAX_CELLS||!Number.isSafeInteger(result[0]*result[1]))throw new RangeError('#mob_effect_grid_size capacity exceeds4096 cells');
  return result;
}
function effectCopy(value:unknown,label:string):MobEffectEntry {
  const data=record(value,label),icon=record(data.icon,`${label}.icon`);let copied:MobEffectIconSource;
  if(icon.kind==='none')copied=Object.freeze({kind:'none'});
  else if(icon.kind==='known-effect') {
    const effect=text(icon.effect,`${label}.icon.effect`,100,true);
    if(!Object.hasOwn(mobEffectIconBackgrounds,effect))throw new RangeError(`${label}.icon.effect must be an existing BedrockStatusEffect`);
    copied=Object.freeze({kind:'known-effect',effect:effect as Extract<MobEffectIconSource,{kind:'known-effect'}>['effect']});
  } else if(icon.kind==='whole-image') {
    const naturalSize=pair(icon.naturalSize,`${label}.icon.naturalSize`,false,true);physical(naturalSize[0],naturalSize[1],1,`${label}.icon.naturalSize`);
    copied=Object.freeze({kind:'whole-image',src:text(icon.src,`${label}.icon.src`,MAX_UNITS,true),naturalSize});
  } else throw new RangeError(`${label}.icon.kind is unknown`);
  return Object.freeze({id:text(data.id,`${label}.id`,256,true),name:singleLine(data.name,`${label}.name`),timer:singleLine(data.timer,`${label}.timer`),ambient:flag(data.ambient,`${label}.ambient`),icon:copied});
}
/** Copy all collection fields before rendering any host glyph callback. */
export function snapshotMobEffectEntries(effects:readonly MobEffectEntry[],gridDimensions:readonly[number,number]):readonly MobEffectEntry[] {
  const dims=dimensions(gridDimensions),values=array(effects,'mob_effects_collection',MAX_CELLS);
  if(values.length>dims[0]*dims[1])throw new RangeError('mob_effects_collection length exceeds independent #mob_effect_grid_size capacity');
  let units=0;const ids=new Set<string>();
  const result=values.map((value,index)=>{const effect=effectCopy(value,`mob_effects_collection[${index}]`);
    if(ids.has(effect.id))throw new RangeError(`Duplicate mob_effects_collection id: ${effect.id}`);ids.add(effect.id);
    units+=effect.id.length+effect.name.length+effect.timer.length+(effect.icon.kind==='whole-image'?effect.icon.src.length:0);
    if(units>MAX_UNITS)throw new RangeError('mob_effects_collection exceeds the finite1048576 UTF-16-unit budget');return effect;});
  return Object.freeze(result);
}
function fontCopy(value:unknown,label:string):MobEffectLabelFont {
  const data=record(value,label);const fontSize=positive(data.fontSize,`${label}.fontSize`),lineHeight=positive(data.lineHeight,`${label}.lineHeight`);
  if(fontSize>MAX_EXTENT||lineHeight>MAX_EXTENT)throw new RangeError(`${label} metrics exceed8192 logical units`);
  const fontMode=data.fontMode===undefined?'auto':data.fontMode;
  if(fontMode!=='auto'&&fontMode!=='latin'&&fontMode!=='unicode')throw new RangeError(`${label}.fontMode is unknown`);
  const fontFamily=data.fontFamily===undefined?undefined:text(data.fontFamily,`${label}.fontFamily`,1024,true);
  return Object.freeze({fontSize,lineHeight,fontMode,...(fontFamily===undefined?{}:{fontFamily})});
}
export function snapshotMobEffectProfiles(textProfile:MobEffectTextProfile,iconLayout:MobEffectIconLayout):{readonly textProfile:MobEffectTextProfile;readonly iconLayout:MobEffectIconLayout} {
  const data=record(textProfile,'MobEffect textProfile'),timer=record(data.timer,'MobEffect textProfile.timer');
  const provenance=data.provenance;if(provenance!=='explicit-web-profile'&&provenance!=='host-resolved')throw new RangeError('MobEffect textProfile provenance is unknown');
  const copiedText=Object.freeze({name:fontCopy(data.name,'MobEffect textProfile.name'),timer:Object.freeze({...fontCopy(data.timer,'MobEffect textProfile.timer'),shadow:flag(timer.shadow,'MobEffect textProfile.timer.shadow')}),provenance});
  const icon=record(iconLayout,'MobEffect iconLayout');let copiedIcon:MobEffectIconLayout;
  if(icon.kind==='parent-percent-contain-web-policy')copiedIcon=Object.freeze({kind:icon.kind});
  else if(icon.kind==='host-resolved') {
    const box=array(icon.box,'MobEffect iconLayout.box',4);if(box.length!==4)throw new TypeError('MobEffect iconLayout.box requires four values');
    const x=number(box[0],'MobEffect iconLayout.box.x',-MAX_EXTENT),y=number(box[1],'MobEffect iconLayout.box.y',-MAX_EXTENT);
    if(x>MAX_EXTENT||y>MAX_EXTENT)throw new RangeError('MobEffect iconLayout offsets exceed8192');
    const width=positive(box[2],'MobEffect iconLayout.box.width'),height=positive(box[3],'MobEffect iconLayout.box.height');
    physical(width,height,1,'MobEffect iconLayout.box');if(icon.fit!=='fill'&&icon.fit!=='contain')throw new RangeError('MobEffect iconLayout.fit is unknown');
    copiedIcon=Object.freeze({kind:icon.kind,box:Object.freeze([x,y,width,height] as const),fit:icon.fit});
  } else throw new RangeError('MobEffect iconLayout.kind is unknown');
  return Object.freeze({textProfile:copiedText,iconLayout:copiedIcon});
}
export function validateMobEffectRef<T>(ref:Ref<T>|undefined,label:string):void {
  if(ref===undefined||ref===null||typeof ref==='function')return;
  if(typeof ref!=='object')throw new TypeError(`${label} must be a React object/callback ref`);
  const descriptor=Object.getOwnPropertyDescriptor(ref,'current');
  if(!descriptor||!('value'in descriptor)||!descriptor.writable)throw new TypeError(`${label}.current must be an own writable data property`);
}
export function snapshotMobEffectRowRefs(refs:Readonly<Record<string,Ref<HTMLDivElement>>>|undefined):Readonly<Record<string,Ref<HTMLDivElement>>>|undefined {
  if(refs===undefined)return undefined;const input=record(refs,'MobEffect rowRefs',MAX_CELLS),result:Record<string,Ref<HTMLDivElement>>=Object.create(null);
  for(const [key,value]of Object.entries(input)){text(key,'MobEffect rowRefs key',256,true);validateMobEffectRef(value as Ref<HTMLDivElement>,'MobEffect rowRefs.'+key);result[key]=value as Ref<HTMLDivElement>;}
  return Object.freeze(result);
}
function rect(x:number,y:number,width:number,height:number):MobEffectRect {return Object.freeze([x,y,width,height] as const);}
function trace(paths:string[],unresolved:string[],formulas:Record<string,string>):MobEffectLayoutTrace {
  return Object.freeze({nativeCertified:false,policy:'source-formulas-parent-percent-web',sourcePaths:Object.freeze(paths),unresolved:Object.freeze(unresolved),formulas:Object.freeze(formulas)});
}
export function resolveMobEffectRowLayout(request:{effect:MobEffectEntry;scale:number;textProfile:MobEffectTextProfile;iconLayout:MobEffectIconLayout}):MobEffectRowLayout {
  const effect=effectCopy(request.effect,'MobEffectRow.effect'),scale=scaleValue(request.scale),profiles=snapshotMobEffectProfiles(request.textProfile,request.iconLayout);
  physical(240,30,scale,'MobEffectRow240x30');
  for(const [kind,font]of Object.entries({name:profiles.textProfile.name,timer:profiles.textProfile.timer}))physical(font.fontSize,font.lineHeight,scale,`MobEffectRow ${kind} font`);
  let icon:MobEffectRowLayout['icon']=null;
  if(effect.icon.kind!=='none') {
    const layout=profiles.iconLayout,box=layout.kind==='host-resolved'?layout.box:rect(-57,5,144,18),fit=layout.kind==='host-resolved'?layout.fit:'contain';
    const natural=effect.icon.kind==='known-effect'?[18,18] as const:effect.icon.naturalSize;
    let paint=box;
    if(fit==='contain'){const ratio=Math.min(box[2]/natural[0],box[3]/natural[1]),w=natural[0]*ratio,h=natural[1]*ratio;paint=rect(box[0]+(box[2]-w)/2,box[1]+(box[3]-h)/2,w,h);}
    physical(paint[2],paint[3],scale,'MobEffectRow icon paint');icon=Object.freeze({controlBox:box,paintBox:paint,fit});
  }
  const name=profiles.textProfile.name,timer=profiles.textProfile.timer;
  return Object.freeze({effect,scale,size:Object.freeze([240,30] as const),...profiles,
    name:Object.freeze({x:27,y:5,color:'#ffffff',shadow:true,font:name,family:name.fontFamily??classicInputFontFamily(resolveClassicInputFont(name.fontMode??'auto',effect.name))}),
    timer:Object.freeze({x:27,y:30-5-timer.lineHeight,color:'rgb(70% 70% 70%)',shadow:timer.shadow,font:timer,family:timer.fontFamily??classicInputFontFamily(resolveClassicInputFont(timer.fontMode??'auto',effect.timer))}),icon,
    trace:trace(['mob_effect.mob_effect_grid_item','mob_effect.effect_name','mob_effect.effect_timer','mob_effect.effect_icon','mob_effect.effect_background'],
      ['native label font/size/outline/default geometry','native icon anchor/aspect/rounding'],
      {row:'240x30',name:'top_left+[27,5]',timer:'bottom_left+[27,-5];Web intrinsic lineHeight',icon:'60%×60%;offset[-105,-1];explicit centered contain or host-resolved box',text:'literal intrinsic single-line Web;no CR/LF;source overflow until ancestor clip'})});
}
function mode(value:unknown):'mouse'|'touch' {if(value!=='mouse'&&value!=='touch')throw new RangeError('MobEffect inputMode must be mouse or touch');return value;}
function policy(value:unknown):'source-formulas-parent-percent-web' {if(value!=='source-formulas-parent-percent-web')throw new RangeError('MobEffect layoutPolicy must explicitly choose source-formulas-parent-percent-web');return value;}
export function resolveMobEffectListLayout(request:{size:readonly[number,number];gridDimensions:readonly[number,number];effectCount:number;scale:number;inputMode:'mouse'|'touch';layoutPolicy:'source-formulas-parent-percent-web'}):MobEffectListLayout {
  const size=pair(request.size,'MobEffectList size'),dims=dimensions(request.gridDimensions),scale=scaleValue(request.scale),inputMode=mode(request.inputMode);policy(request.layoutPolicy);
  const count=integer(request.effectCount,'MobEffectList effectCount');if(count>dims[0]*dims[1])throw new RangeError('MobEffectList effectCount exceeds independent grid capacity');
  physical(size[0],size[1],scale,'MobEffectList size');
  const cross=inputMode==='mouse'?12:4,viewportWidth=inputMode==='mouse'?size[0]-12:size[0],railHeight=inputMode==='mouse'?size[1]-4:size[1];
  if(viewportWidth<=0)throw new RangeError('MobEffectList computed viewport width=size.width−12 must be positive; provide width>12');
  if(railHeight<=0)throw new RangeError('MobEffectList computed mouse rail height=size.height−4 must be positive; provide height>4');
  // The source pane starts two units below its fixed clipping boundary.
  // Keep that placement while allowing the whole last row to be reached:
  // this trailing extent is an explicit Web scroll mechanic, not source data.
  const gridX=.45*viewportWidth-60,gridHeight=dims[1]*30,paintWidth=dims[0]*240,contentHeight=4+gridHeight+2;
  physical(Math.max(150,paintWidth),Math.max(4,contentHeight),scale,'MobEffectList declared grid/cell extent');
  const cells=Array.from({length:count},(_,index)=>{const column=index%dims[0],row=Math.floor(index/dims[0]);return Object.freeze({index,column,row,rect:rect(column*240,row*30,240,30)});});
  return Object.freeze({size,scale,inputMode,gridDimensions:dims,scrollRect:rect(0,2,size[0],size[1]),viewportRect:rect(0,2,viewportWidth,size[1]),
    railRect:rect(size[0]-cross,inputMode==='mouse'?4:2,cross,railHeight),grid:Object.freeze({declaredWidth:150,cellStep:Object.freeze([240,30] as const),offset:Object.freeze([gridX,4] as const),size:Object.freeze([150,gridHeight] as const),
      contentSize:Object.freeze([viewportWidth,contentHeight] as const),paintWidth,capacity:dims[0]*dims[1],cells:Object.freeze(cells)}),
    trace:trace(['mob_effect.mob_effect_list_content_panel','mob_effect.mob_effect_grid','mob_effect.mob_effect_grid_panel','common.scrolling_panel','common.scroll_view_control','common.scroll_bar_and_track'],
      ['native grid default height/cell placement/percent evaluator','native thumb projection/minimum/scroll anchoring','native touch released fade/gesture and gamepad arbitration'],
      {scroll:'top_middle;offset[default,2];Web default height=fill local list;fixed overflow clip never scrolls on focus',grid:'declared[150,default];offset[45%−60px,4];Web row-major240x30 cells',content:'Web4+declaredRows*30+2 trailing units for reachable clipped viewport;no dimensions inferred from data',mouse:'noncontained2+8+2 rail;height100%−4;actual shared ScrollBar measured extent',touch:'contained4;full viewport;no track;host-resolved thumb visibility'})});
}
export function resolveMobEffectScreenLayout(request:{availableSize:readonly[number,number];gridDimensions:readonly[number,number];effectCount:number;scale:number;sourceProfile:'desktop'|'pocket';inputMode:'mouse'|'touch';layoutPolicy:'source-formulas-parent-percent-web'}):MobEffectScreenLayout {
  const availableSize=pair(request.availableSize,'MobEffectScreen availableSize'),scale=scaleValue(request.scale),sourceProfile=request.sourceProfile;
  if(sourceProfile!=='desktop'&&sourceProfile!=='pocket')throw new RangeError('MobEffect sourceProfile must be desktop or pocket');policy(request.layoutPolicy);
  physical(availableSize[0],availableSize[1],scale,'MobEffectScreen availableSize');const [width,height]=availableSize;
  const listPanel=rect(-4,4,.9*width,.9*height-4);if(listPanel[3]<=0)throw new RangeError('MobEffectScreen computed list height=.9*availableHeight−4 must be positive');
  const list=resolveMobEffectListLayout({size:[listPanel[2],listPanel[3]],gridDimensions:request.gridDimensions,effectCount:request.effectCount,scale,inputMode:request.inputMode,layoutPolicy:request.layoutPolicy});
  return Object.freeze({availableSize,scale,sourceProfile,mainBackground:rect(4,4,.9*width,.9*height),buttonBackground:rect(.9*width+2,4,25,25),closeButton:rect(.9*width+4,7.5,18,18),listPanel,list,
    trace:trace(['common.base_screen.desktop/pocket.$mob_effect_screen_size','mob_effect.main_background','mob_effect.button_background','mob_effect.mob_effect_screen_close_button','mob_effect.mob_effect_list_content_panel'],
      ['native percent/default evaluator and screen registration','native close input/focus/TTS arbitration'],
      {mainBackground:'offset[4,4];size[90%,90%]',buttonBackground:'[90%+2px,4,25,25]',closeButton:'[90%+4px,7.5,18,18]',listPanel:'offset[−4,4];size[90%,90%−4px]',parent:'explicit availableSize is common-screen content parent;desktop/pocket independent of inputMode'})});
}
