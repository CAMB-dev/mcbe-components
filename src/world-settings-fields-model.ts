import type {SettingsFieldsProps,SettingsFieldsTypography,SettingsSliderWebDomain,SettingsRadioRow,SettingsPermissionRow,SettingsFieldRow,SettingsChoice,SettingsOptionLayout} from './settings-fields-model';
import {snapshotSettingsFields} from './settings-fields-data';
import {worldSettingsFieldsSchema} from './world-settings-fields-schema';
import type {WorldSettingsFieldsBindingTypes,WorldSettingsFieldsMetricKinds} from './world-settings-fields-schema';

type Family='game'|'multiplayer'|'cloud'|'debug';
type NamedRecord<K extends string,T>=[K]extends[never]?Readonly<Record<string,never>>:Readonly<Record<K,T>>;
type MetricType<T>=T extends 'number'?number:T extends 'string'?string:T extends 'placement'?'above'|'below':T extends 'sliderWeb'?SettingsSliderWebDomain:T extends 'radioVisuals'?SettingsRadioRow['visuals']:T extends 'pair'?readonly[number,number]:T extends 'shadow'?SettingsRadioRow['labelShadow']:T extends 'permissionHeights'?Readonly<Record<'visitor'|'member'|'operator',number>>:T extends 'imageOrNull'?SettingsPermissionRow['faceIcon']:never;
export type WorldSettingsFieldMetrics<F extends Family>={readonly[K in keyof WorldSettingsFieldsMetricKinds[F]]:{readonly[P in keyof WorldSettingsFieldsMetricKinds[F][K]]:MetricType<WorldSettingsFieldsMetricKinds[F][K][P]>}&{readonly typography?:Partial<SettingsFieldsTypography>}};
/** A complete source collection. Only runtime identity/index and source-bound data vary. */
export interface WorldSettingsExperimentSnapshot {
 readonly id:string;readonly index:number;
 readonly '#experimental_toggle_value':boolean;
 readonly '#experimental_toggle_enabled':boolean;
 readonly '#show_experimental_toggle':boolean;
 readonly '#experimental_toggle_text':string;
 readonly metrics:{readonly height:number;readonly labelHeight:number;readonly descriptionHeight:number;readonly controlY:number;readonly typography?:Partial<SettingsFieldsTypography>};
}
export interface WorldSettingsNamedSnapshot<F extends Family> {
 readonly bindings:WorldSettingsFieldsBindingTypes[F];
 /** Exact expressions from the pinned source, resolved by the host. This is not a native expression evaluator. */
 readonly conditions:Readonly<Record<(typeof worldSettingsFieldsSchema.conditions)[F][number],boolean>>;
 readonly strings:NamedRecord<(typeof worldSettingsFieldsSchema.strings)[F][number],string>;
 readonly metrics:WorldSettingsFieldMetrics<F>;
 readonly layoutPolicy:{readonly unresolvedPanelAnchor:'top-left'|'center';readonly unresolvedStackCrossAlignment:'start'|'center'};
}
export interface WorldGameSettingsSnapshot extends WorldSettingsNamedSnapshot<'game'> {
 /** Complete dynamic factory records, including source-hidden records. Count is #experimental_toggle_count. */
 readonly experiments:readonly WorldSettingsExperimentSnapshot[];
}
export type WorldMultiplayerSettingsSnapshot=WorldSettingsNamedSnapshot<'multiplayer'>;
export interface WorldCloudSettingsImage {readonly src:string;readonly sourceSize:readonly[number,number]}
export interface WorldCloudSettingsSnapshot extends WorldSettingsNamedSnapshot<'cloud'> {
  /** Exact texture is absent from the fixed ZIP. No substitute is bundled or selected. */
  readonly images:Readonly<Record<'textures/ui/icon_external_link',WorldCloudSettingsImage>>;
}
export type WorldDebugSettingsSnapshot=WorldSettingsNamedSnapshot<'debug'>;
export interface WorldCloudSettingsProps extends Omit<SettingsFieldsProps,'rows'|'inputMode'> {readonly snapshot:WorldCloudSettingsSnapshot;readonly inputMode:'mouse'|'touch';readonly rows?:never}
export interface WorldDebugSettingsProps extends Omit<SettingsFieldsProps,'rows'|'inputMode'> {readonly snapshot:WorldDebugSettingsSnapshot;readonly inputMode:'mouse'|'touch';readonly rows?:never}

export interface WorldGameSettingsProps extends Omit<SettingsFieldsProps,'rows'|'inputMode'> {readonly snapshot:WorldGameSettingsSnapshot;readonly inputMode:'mouse'|'touch';readonly rows?:never}
export interface WorldMultiplayerSettingsProps extends Omit<SettingsFieldsProps,'rows'|'inputMode'> {readonly snapshot:WorldMultiplayerSettingsSnapshot;readonly inputMode:'mouse'|'touch';readonly rows?:never}

type SourceText=string|{readonly literal:string}|{readonly condition:string;readonly yes:SourceText;readonly no:SourceText};
interface Choice {id:string;sourceControl:string;binding:string;label:SourceText;state:State}
interface State {ignored:boolean|string;visible:boolean|string;enabled:boolean|string}
interface Spec {
 key:string;id:string;sourceControl:string;kind:string;sourceType:string|null;sourceKey:string;origins:readonly string[];state:State;size:readonly unknown[];offset:readonly unknown[];anchor:string|null;option:boolean;
 label?:SourceText;showLabel?:boolean;description?:string|null;oneLine?:boolean;labelAlignment?:'left'|'center';
 color?:string;text?:SourceText;profile?:'plain'|'group'|'header'|'education-cloud';texture?:'textures/ui/icon_external_link';binding?:string;inset?:number;toggleName?:string;bindingCondition?:'once'|'visible'|'always_when_visible';
 placeholder?:SourceText;textBoxName?:string;maxLength?:number;sourceTextType?:'ExtendedASCII'|'NumberChars';allowDataBinding?:boolean;target?:string;actionLabel?:SourceText;presentation?:'text'|'arrow'|'mock-arrow';textFraction?:number;
 choices?:readonly Choice[];descriptionKeys?:readonly string[];dropdownName?:string;faceBinding?:string;scrolling?:boolean;highlightOffset?:readonly[number,number];highlightExtraSize?:readonly[number,number];sliderName?:string;stepsBinding?:string;textBinding?:string;tone?:'light'|'dark'|'realms';uri?:string;orientation?:'vertical'|'horizontal';children?:readonly Spec[];
}
type PlainRecord=Record<string,unknown>;
const fail=(message:string):never=>{throw new TypeError(`World Settings named snapshot: ${message}`);};
function clone(value:unknown,depth=0):unknown {
 if(depth>48)throw new RangeError('World Settings snapshot exceeds48 data levels.');
 if(value===null||value===undefined||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
 if(typeof value!=='object'||(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)||Object.getOwnPropertySymbols(value).length)fail('plain data only.');
 if(Array.isArray(value)&&value.length>4096||Object.keys(value).length>16384)throw new RangeError('World Settings snapshot data exceeds finite capacity.');
 const source=value as object,result:PlainRecord|unknown[]=Array.isArray(value)?[]:{};
 for(const key of Object.keys(source)){
  const d=Object.getOwnPropertyDescriptor(source,key)!;if(!('value'in d))fail('accessors are forbidden.');
  if(Array.isArray(result)){if(!/^(0|[1-9][0-9]*)$/.test(key))fail('array properties are forbidden.');result[Number(key)]=clone(d.value,depth+1);}else Object.defineProperty(result,key,{value:clone(d.value,depth+1),enumerable:true});
 }
 if(Array.isArray(value)){if((result as unknown[]).length!==value.length)fail('sparse arrays are forbidden.');for(let i=0;i<value.length;i++)if(!Object.hasOwn(result,i))fail('sparse arrays are forbidden.');}
 return Object.freeze(result);
}
function record(value:unknown,keys:readonly string[],name:string):PlainRecord {
 if(!value||typeof value!=='object'||Array.isArray(value))fail(`${name} must be a complete named record.`);
 const actual=Object.keys(value as object);if(actual.length!==keys.length||actual.some(k=>!keys.includes(k)))fail(`${name} must contain exactly the canonical keys; missing, extra and renamed keys are forbidden.`);
 return value as PlainRecord;
}
function finite(value:unknown,name:string,zero=true):number {if(typeof value!=='number'||!Number.isFinite(value)||value<(zero?0:Number.MIN_VALUE)||value>8192)throw new RangeError(`World Settings ${name} requires finite ${zero?'nonnegative':'positive'} logical units <=8192.`);return value;}
function boundedText(value:unknown,name:string):string {if(typeof value!=='string'||value.length>1048576)fail(`${name} requires bounded text.`);return value as string;}
/** Private canonical source preflight. Never reads DOM, invokes callbacks or evaluates game rules. */
export function planWorldSettingsFields<F extends Family>(family:F,props:Omit<SettingsFieldsProps,'inputMode'>&{snapshot:WorldSettingsNamedSnapshot<F>|WorldGameSettingsSnapshot;inputMode:'mouse'|'touch'}) {
 if(props.inputMode!=='mouse'&&props.inputMode!=='touch')fail('inputMode must be mouse or touch.');
 const raw=clone(props.snapshot)as PlainRecord,schema=worldSettingsFieldsSchema;
 if(family==='cloud'&&(!raw||!Object.hasOwn(raw,'images')))fail('Cloud requires an explicit whole host image for textures/ui/icon_external_link; the fixed archive does not contain this exact texture.');
 record(raw,['bindings','conditions','strings','metrics','layoutPolicy',...(family==='game'?['experiments']:family==='cloud'?['images']:[])],'snapshot');
 if(family==='cloud')record(raw.images,['textures/ui/icon_external_link'],'images (required exact textures/ui/icon_external_link)');
 const bindings=record(raw.bindings,Object.keys(schema.bindings[family]),'bindings'),conditions=record(raw.conditions,schema.conditions[family],'conditions'),strings=record(raw.strings,schema.strings[family],'strings'),metrics=record(raw.metrics,Object.keys(schema.metrics[family]),'metrics');
 for(const[k,t]of Object.entries(schema.bindings[family])){if(typeof bindings[k]!==t)fail(`${k} must be ${t}.`);if(t==='number'&&!Number.isFinite(bindings[k]))fail(`${k} must be finite.`);if(t==='string')boundedText(bindings[k],k);}
 for(const[k,v]of Object.entries(conditions))if(typeof v!=='boolean')fail(`${k} condition must be boolean.`);
 for(const[k,v]of Object.entries(strings))boundedText(v,k);
 const policy=record(raw.layoutPolicy,['unresolvedPanelAnchor','unresolvedStackCrossAlignment'],'layoutPolicy');if(!['top-left','center'].includes(policy.unresolvedPanelAnchor as string))fail('unresolvedPanelAnchor must be explicit.');if(!['start','center'].includes(policy.unresolvedStackCrossAlignment as string))fail('unresolvedStackCrossAlignment must be explicit.');
 for(const[path,shape]of Object.entries(schema.metrics[family] as Readonly<Record<string,Readonly<Record<string,string>>>>)){
  const m=metrics[path]as PlainRecord;if(!m||typeof m!=='object'||Array.isArray(m))fail(`metrics ${path} must be a record.`);
  const required=Object.keys(shape),actual=Object.keys(m);if(required.some(k=>!Object.hasOwn(m,k))||actual.some(k=>!required.includes(k)&&k!=='typography'))fail(`metrics ${path} may only supply its exact unresolved budgets.`);
  for(const[k,t]of Object.entries(shape)){
   const v=m[k],name=`${path}.${k}`;
   if(t==='number')finite(v,name);else if(t==='string')boundedText(v,name);
   else if(t==='placement'){if(v!=='above'&&v!=='below')fail(name+' requires explicit popup placement.');}
   else if(t==='sliderWeb'){const web=record(v,['value','min','max','step','markers'],name);if(!Array.isArray(web.markers))fail(name+' markers must be complete.');for(const marker of web.markers as unknown[])record(marker,['offset','progress'],name+' marker');}
   else if(t==='radioVisuals'){if(!Array.isArray(v)||v.length!==2)fail(name+' requires two complete source visuals.');for(const visual of v as unknown[])record(visual,['height','y','labelHeight'],name+' visual');}
   else if(t==='pair'){if(!Array.isArray(v)||v.length!==2)fail(name+' requires two axes.');}
   else if(t==='shadow')record(v,['offset','color'],name);
   else if(t==='permissionHeights')record(v,['visitor','member','operator'],name);
   else if(t==='imageOrNull'&&v!==null)record(v,['src','sourceSize'],name);
  }
  if(m.typography!==undefined){const fonts=m.typography as PlainRecord;if(!fonts||typeof fonts!=='object'||Array.isArray(fonts)||Object.keys(fonts).some(k=>!['label','description','control'].includes(k)))fail(path+' typography roles are fixed.');for(const f of Object.values(fonts))if(f!==undefined)record(f,['family','size','lineHeight'],path+' font');}
 }
 const state=(v:boolean|string):boolean=>typeof v==='boolean'?v:typeof bindings[v]==='boolean'?bindings[v]as boolean:typeof conditions[v]==='boolean'?conditions[v]as boolean:fail('missing source condition '+v);
 const text=(v:SourceText|undefined):string=>{if(!v)return'';if(typeof v==='object')return'literal'in v?v.literal:text(state(v.condition)?v.yes:v.no);return v.startsWith('#')?boundedText(bindings[v],v):boundedText(strings[v],v);};
 const dim=(value:unknown,parent:number,fallback:unknown,name:string):number=>{
  if(typeof value==='number')return finite(value,name);
  if(typeof value==='string'){
   const px=/^([0-9.]+)(?:px)?$/.exec(value);if(px)return finite(Number(px[1]),name);
   const p=/^([0-9.]+)%\s*(?:([+-])\s*([0-9.]+)px)?$/.exec(value);if(p)return finite(parent*Number(p[1])/100+(p[2]==='-'?-1:1)*Number(p[3]??0),name);
  }
  return finite(fallback,name);
 };
 const build=(spec:Spec,parentWidth:number,parentHeight:number,positioning:'panel'|'vertical'|'horizontal'='vertical'):SettingsFieldRow=>{
  const m=metrics[spec.key]as PlainRecord,width=dim(spec.size[0],parentWidth,m.resolvedWidth,`${spec.key}.width`),height=dim(spec.size[1],parentHeight,m.height,`${spec.key}.height`);
  const enabled=state(spec.state.enabled),ignored=state(spec.state.ignored),visible=state(spec.state.visible),sourceOffset=spec.offset;
  if(!Array.isArray(sourceOffset)||sourceOffset.length!==2||sourceOffset.some(v=>typeof v!=='number'||!Number.isFinite(v)))fail('unsupported dynamic source offset '+spec.key);
  let x=sourceOffset[0]as number,y=sourceOffset[1]as number;
  if(positioning==='panel'){const anchor=spec.anchor??(policy.unresolvedPanelAnchor==='center'?'center':'top_left');if(anchor.includes('right'))x+=parentWidth-width;else if(anchor==='center'||anchor.includes('middle'))x+=(parentWidth-width)/2;if(anchor.includes('bottom'))y+=parentHeight-height;else if(anchor==='center'||anchor.includes('middle')&&!anchor.startsWith('top'))y+=(parentHeight-height)/2;}
  else if(positioning==='horizontal'){const a=spec.anchor;if(a?.startsWith('bottom'))y+=parentHeight-height;else if(a==='center'||a?.endsWith('_middle')||!a&&policy.unresolvedStackCrossAlignment==='center')y+=(parentHeight-height)/2;}
  else {const a=spec.anchor;if(a?.endsWith('_right'))x+=parentWidth-width;else if(a==='center'||a?.endsWith('_middle')||!a&&policy.unresolvedStackCrossAlignment==='center')x+=(parentWidth-width)/2;}
  const base={id:spec.key,sourceControl:spec.sourceControl,ignored,visible,enabled,width,height,offset:[x,y]as const,...(m.typography?{typography:m.typography as Partial<SettingsFieldsTypography>}:{})};
  const option:SettingsOptionLayout|undefined=spec.option?{mode:spec.oneLine&&state('$desktop_screen')?'one-line':'two-line',label:text(spec.label),showLabel:spec.showLabel??true,labelHeight:m.labelHeight as number,description:spec.description===null?null:text(spec.description),descriptionHeight:m.descriptionHeight as number,labelAlignment:spec.labelAlignment??'left',controlY:m.controlY as number}:undefined;
  const optionBase={...base,option:option!};
  const choices=():SettingsChoice[]=>(spec.choices??[]).map(c=>({id:c.id,sourceControl:c.sourceControl,binding:c.binding,label:text(c.label),checked:state(c.binding),ignored:state(c.state.ignored),visible:state(c.state.visible),enabled:state(c.state.enabled)}));
  const popup=()=>({scrolling:spec.scrolling!,height:m.popupHeight as number,placement:m.popupPlacement as 'above'|'below',label:m.popupLabel as string,inputMode:props.inputMode,highlightOffset:spec.highlightOffset!,highlightExtraSize:spec.highlightExtraSize!});
  switch(spec.kind){
   case 'stack':return{...base,kind:'stack',orientation:spec.orientation!,rows:(spec.children??[]).map(c=>build(c,width,height,spec.orientation!))};
   case 'panel':return{...base,kind:'panel',...(option?{option,panelHeight:m.panelHeight as number}:{}),rows:(spec.children??[]).map(c=>build(c,width,option?m.panelHeight as number:height,'panel'))};
   case 'label':return{...base,kind:'label',profile:spec.profile as 'plain'|'group'|'header',text:text(spec.text),textHeight:m.textHeight as number,color:spec.color};
   case 'info':return{...base,kind:'info',...(option?{option}:{}),binding:spec.binding,textBinding:spec.binding!,text:boundedText(bindings[spec.binding!],spec.binding!),textHeight:m.textHeight as number,panelHeight:m.panelHeight as number};
   case 'spacer':return{...base,kind:'spacer'};
   case 'divider':return{...base,kind:'divider',inset:spec.inset!};
   case 'toggle':return{...optionBase,kind:'toggle',binding:spec.binding!,checked:state(spec.binding!),toggleName:spec.toggleName!,bindingCondition:spec.bindingCondition!};
   case 'text':return{...optionBase,kind:'text',binding:spec.binding!,value:boundedText(bindings[spec.binding!],spec.binding!),placeholder:text(spec.placeholder),textBoxName:spec.textBoxName!,maxLength:spec.maxLength!,sourceTextType:spec.sourceTextType!,allowDataBinding:spec.allowDataBinding!};
   case 'text-action':return{...optionBase,kind:'text-action',binding:spec.binding!,value:boundedText(bindings[spec.binding!],spec.binding!),placeholder:text(spec.placeholder),textBoxName:spec.textBoxName!,maxLength:spec.maxLength!,sourceTextType:spec.sourceTextType!,allowDataBinding:spec.allowDataBinding!,textFraction:spec.textFraction!,action:{presentation:spec.presentation!,label:text(spec.actionLabel),target:spec.target!,enabled,labelMaxHeight:m.labelMaxHeight as number}};
   case 'dropdown':return{...optionBase,kind:'dropdown',dropdownName:spec.dropdownName!,faceLabel:text(spec.faceBinding),faceLabelBinding:spec.faceBinding!,choices:choices(),popup:popup()};
   case 'radio':return{...optionBase,kind:'radio',profile:'waypoints',choices:choices()as[SettingsChoice,SettingsChoice],visuals:m.visuals as SettingsRadioRow['visuals'],descriptions:(spec.descriptionKeys??[]).map((k,i)=>({text:text(k),height:(m.descriptionHeights as readonly number[])[i]!}))as unknown as SettingsRadioRow['descriptions'],labelShadow:m.labelShadow as SettingsRadioRow['labelShadow']};
   case 'slider':return{...optionBase,kind:'slider',binding:spec.binding!,sliderName:spec.sliderName!,sourceValue:bindings[spec.binding!]as number,sourceSteps:bindings[spec.stepsBinding!]as number,stepsBinding:spec.stepsBinding!,textValue:text(spec.textBinding),textValueBinding:spec.textBinding!,web:m.web as SettingsSliderWebDomain};
   case 'permissions':{
    const cc=choices(),roles=['visitor','member','operator']as const,checked=Object.fromEntries(roles.map((r,i)=>[r,cc[i]!.checked]))as Record<typeof roles[number],boolean>;
    return{...optionBase,kind:'permissions',binding:spec.binding!,value:null,checked,labels:{label:text('permissions.title.settings'),visitor:text('permissions.level.visitor'),member:text('permissions.level.member'),operator:text('permissions.level.operator'),custom:text('permissions.level.custom'),visitorDescription:text('permissions.description.visitors'),memberDescription:text('permissions.description.members'),operatorDescription:text('permissions.description.operators')},faceLabel:text(spec.faceBinding),faceIcon:m.faceIcon as SettingsPermissionRow['faceIcon'],choiceBindings:Object.fromEntries(roles.map((r,i)=>[r,cc[i]!.binding]))as SettingsPermissionRow['choiceBindings'],popup:popup(),choiceHeights:m.choiceHeights as SettingsPermissionRow['choiceHeights'],descriptionHeights:m.descriptionHeights as SettingsPermissionRow['descriptionHeights']};
   }
   case 'underline-action':return{...base,kind:'underline-action',profile:'education-cloud',label:text(spec.text),target:spec.target!,stateWidth:m.stateWidth as number,labelPanelSize:m.labelPanelSize as readonly[number,number],labelSize:m.labelSize as readonly[number,number],defaultAnchor:policy.unresolvedPanelAnchor as 'top-left'|'center'};
   case 'image':{
    const images=raw.images as PlainRecord,image=record(images?.[spec.texture!],['src','sourceSize'],'images '+spec.texture);return{...base,kind:'image',texture:spec.texture!,image:{src:image.src as string,sourceSize:image.sourceSize as readonly[number,number]}};
   }
   case 'action':return{...base,kind:'action',label:text(spec.text),target:spec.target!,tone:spec.tone!,labelMaxHeight:m.labelMaxHeight as number,...(spec.uri?{uri:spec.uri}:{})};
   case 'experiments':{
    const entries=raw.experiments,count=bindings['#experimental_toggle_count'];if(!Number.isSafeInteger(count)||Number(count)<0||Number(count)>4096||!Array.isArray(entries)||entries.length!==count)fail('experiments require complete source count and records.');const ids=new Set<string>();
    return{...base,kind:'experiments',collectionName:'experimental_toggles',count:count as number,countBinding:'#experimental_toggle_count',rows:(entries as unknown[]).map((entry,i)=>{
     const v=record(entry,['id','index','#experimental_toggle_value','#experimental_toggle_enabled','#show_experimental_toggle','#experimental_toggle_text','metrics'],'experiment');if(typeof v.id!=='string'||!v.id.trim()||ids.has(v.id)||v.index!==i)fail('experiment identity/index must be unique and complete.');ids.add(v.id as string);
     for(const key of ['#experimental_toggle_value','#experimental_toggle_enabled','#show_experimental_toggle'])if(typeof v[key]!=='boolean')fail('experiment source flags must be boolean.');const em=record(v.metrics,Object.hasOwn(v.metrics as object,'typography')?['height','labelHeight','descriptionHeight','controlY','typography']:['height','labelHeight','descriptionHeight','controlY'],'experiment metrics');
     return{kind:'toggle',id:`${spec.key}/${encodeURIComponent(v.id as string)}`,sourceControl:'world_section.experimental_toggle',collection:{name:'experimental_toggles',index:i,id:v.id as string},binding:'#experimental_toggle_value',enabledBinding:'#experimental_toggle_enabled',ignored:false,visible:v['#show_experimental_toggle']as boolean,enabled:v['#experimental_toggle_enabled']as boolean,checked:v['#experimental_toggle_value']as boolean,height:em.height as number,width,toggleName:'experimental_toggle',bindingCondition:'once',option:{mode:state('$desktop_screen')?'one-line':'two-line',label:boundedText(v['#experimental_toggle_text'],'experiment text'),showLabel:true,labelHeight:em.labelHeight as number,description:null,descriptionHeight:em.descriptionHeight as number,labelAlignment:'left',controlY:em.controlY as number},...(em.typography?{typography:em.typography as Partial<SettingsFieldsTypography>}:{})};
    })};
   }
   default:return fail('unsupported source kind '+spec.kind);
  }
 };
 const rows=(schema.groups[family]as unknown as readonly Spec[]).map(s=>build(s,props.width,0));
 const result=snapshotSettingsFields({...props,inputMode:undefined,rows});
 return Object.freeze({...result,snapshot:raw});
}
