import { forwardRef, useId } from 'react';
import type { Ref } from 'react';
import { ClassicSkin } from './classic-skin';
import { Image } from './image';
import { progressAssets } from './progress-assets';
import { useClassicNodeRef } from './classic-screen-lifecycle';
import { validateProgressRef } from './progress-data';
import type { ProgressIndicatorState, ProgressPresentationProfile, ProgressSize } from './progress-types';

export type ProgressIndicatorTemplate = 'wave'|'spinner'|'fancy'|'thick'|'custom'|'autosave'|'cloud-upload';
/** Private reusable visual leaves. No whole-screen model, text renderer or clock. */
export interface ProgressIndicatorsProps {
  readonly templates: readonly ProgressIndicatorTemplate[];
  readonly state: ProgressIndicatorState;
  readonly availableSize: ProgressSize;
  readonly scale: number;
  /** Native clip_ratio evaluation remains unrecovered. Never infer it from amount/total. */
  readonly imageClipPolicy: 'visible-fraction-web'|'left-removal-web';
  readonly customBar: ProgressPresentationProfile['customBar'];
  readonly label: string;
  readonly id?: string;
  readonly className?: string;
}
type Kind = Exclude<ProgressIndicatorTemplate,'cloud-upload'>;
export interface ProgressIndicatorPlan {
  readonly template:ProgressIndicatorTemplate;readonly kind:Kind;readonly visible:boolean;
  readonly sourceControl:string;readonly box:readonly[number,number,number,number];readonly layer:number;
  readonly frame?:number;readonly clipRatio?:number;readonly nativeUnrecovered?:boolean;
}
export interface ProgressIndicatorsPlan {
  readonly state:ProgressIndicatorState;readonly size:ProgressSize;readonly scale:number;readonly label:string;
  readonly id?:string;readonly className:string;readonly imageClipPolicy:ProgressIndicatorsProps['imageClipPolicy'];
  readonly customBar:ProgressIndicatorsProps['customBar'];readonly leaves:readonly ProgressIndicatorPlan[];
}
function data(value:unknown,label:string):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError(`${label} requires a plain data record`);
  const keys=Reflect.ownKeys(value);if(keys.length>64)throw new RangeError(`${label} exceeds the finite property budget`);
  const copy:Record<string,unknown>={};for(const key of keys){const field=Object.getOwnPropertyDescriptor(value,key)!;
    if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!field.enumerable||!('value'in field))throw new TypeError(`${label} requires own enumerable data fields`);copy[key]=field.value;}
  return copy;
}
function finite(value:unknown,label:string,min=-Number.MAX_VALUE,max=Number.MAX_VALUE):number {if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${label} is outside its finite range`);return value;}
function flag(value:unknown,label:string):boolean{if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function frame(value:unknown,label:string,last:number):number{const n=finite(value,label,0,last);if(!Number.isInteger(n))throw new RangeError(`${label} must be integral`);return n;}
function text(value:unknown,label:string,empty=false):string{if(typeof value!=='string'||value.length>4096||(!empty&&!value.trim()))throw new TypeError(`${label} requires finite text`);return value;}
const templates:readonly ProgressIndicatorTemplate[]=['wave','spinner','fancy','thick','custom','autosave','cloud-upload'];
/** Pure atomic preflight, including invisible leaves and frames. No callbacks/IO/clock. */
export function planProgressIndicators(input:ProgressIndicatorsProps,ref?:Ref<HTMLDivElement>):ProgressIndicatorsPlan{
  const p=data(input,'ProgressIndicators'),s=data(p.state,'Progress indicator state');validateProgressRef(ref);
  if(p.children!==undefined||p.dangerouslySetInnerHTML!==undefined)throw new TypeError('ProgressIndicators owns its visual leaves');
  if(!Array.isArray(p.templates)||Object.getPrototypeOf(p.templates)!==Array.prototype||p.templates.length>7)throw new TypeError('Progress indicator templates require a finite plain array');
  const selected:ProgressIndicatorTemplate[]=[],seen=new Set<string>();
  for(let i=0;i<p.templates.length;i++){const field=Object.getOwnPropertyDescriptor(p.templates,String(i));if(!field||!('value'in field)||!templates.includes(field.value)||seen.has(field.value))throw new TypeError('Progress indicator templates require unique known data entries');seen.add(field.value);selected.push(field.value);}
  if(Reflect.ownKeys(p.templates).length!==p.templates.length+1)throw new TypeError('Progress indicator templates have extra fields');
  const state:ProgressIndicatorState=Object.freeze({barAnimationVisible:flag(s.barAnimationVisible,'wave visible'),spinnerAnimationVisible:flag(s.spinnerAnimationVisible,'spinner visible'),loadingBarVisible:flag(s.loadingBarVisible,'bar visible'),progressAnimationVisible:flag(s.progressAnimationVisible,'cloud parent visible'),useDeterminateAnimation:flag(s.useDeterminateAnimation,'cloud determinate'),autoSaveVisible:flag(s.autoSaveVisible,'autosave visible'),
    percentage:finite(s.percentage,'percentage',0,1),currentAmount:finite(s.currentAmount,'current amount'),totalAmount:finite(s.totalAmount,'total amount'),waveFrame:frame(s.waveFrame,'wave frame',9),spinnerFrame:frame(s.spinnerFrame,'spinner frame',9),autoSaveFrame:frame(s.autoSaveFrame,'autosave frame',8),paused:flag(s.paused,'paused')});
  if(!Array.isArray(p.availableSize)||Object.getPrototypeOf(p.availableSize)!==Array.prototype||p.availableSize.length!==2||Reflect.ownKeys(p.availableSize).length!==3)throw new TypeError('Progress indicator availableSize requires a two-value tuple');
  const dimensions:number[]=[];for(let i=0;i<2;i++){const field=Object.getOwnPropertyDescriptor(p.availableSize,String(i));if(!field||!('value'in field))throw new TypeError('Progress indicator dimensions must be own data fields');dimensions.push(finite(field.value,'availableSize',1,8192));}
  const size=dimensions as unknown as ProgressSize;
  const scale=frame(p.scale,'scale',64);if(scale<1||size[0]*scale>8192||size[1]*scale>8192||size[0]*size[1]*scale*scale>4194304)throw new RangeError('Progress indicator extent exceeds finite Web budget');
  if(!['visible-fraction-web','left-removal-web'].includes(p.imageClipPolicy as string))throw new TypeError('Progress indicator requires an explicit Web image clip policy');
  const policy=data(p.customBar,'custom bar');let customBar:ProgressIndicatorsProps['customBar'];
  if(policy.kind==='native-unrecovered')customBar=Object.freeze({kind:'native-unrecovered'});
  else if(policy.kind==='explicit-web-clip')customBar=Object.freeze({kind:'explicit-web-clip',clipRatio:finite(policy.clipRatio,'custom bar clip',0,1),provenance:text(policy.provenance,'custom bar provenance')});
  else throw new TypeError('Progress custom bar requires an explicit renderer policy');
  const leaves:ProgressIndicatorPlan[]=[];
  const leaf=(template:ProgressIndicatorTemplate,kind:Kind,visible:boolean,dy:number)=>{
    const w=kind==='wave'?64:kind==='spinner'?14:kind==='autosave'?18:kind==='custom'?100:size[0]*.9,h=kind==='wave'?8:kind==='spinner'||kind==='thick'?14:kind==='autosave'?30:kind==='custom'?2:5;
    if((kind==='fancy'&&w<=10)||w*scale>8192||w*h*scale*scale>4194304)throw new RangeError('Progress indicator source leaf exceeds Web geometry budget');
    const stripWidth=kind==='wave'?640:kind==='spinner'?140:kind==='autosave'?162:undefined;
    if(stripWidth!==undefined&&(stripWidth*scale>8192||stripWidth*h*scale*scale>4194304))throw new RangeError('Progress indicator complete strip exceeds Web geometry budget');
    if(kind==='custom'&&visible&&customBar.kind==='native-unrecovered')throw new Error('Visible progress_bar_renderer is unrecovered; supply an explicit Web customBar policy');
    leaves.push(Object.freeze({template,kind,visible,sourceControl:'progress.'+({wave:'progress_loading_bars',spinner:'progress_loading_spinner',fancy:'fancy_progress_loading_bars',thick:'thick_progress_bar',custom:'progress_bar',autosave:'auto_save'} as const)[kind],box:Object.freeze([(size[0]-w)/2,(size[1]-h)/2+dy,w,h]) as readonly[number,number,number,number],layer:kind==='autosave'?31:kind==='fancy'||kind==='thick'?5:2,
      ...(kind==='wave'?{frame:state.waveFrame}:kind==='spinner'?{frame:state.spinnerFrame}:kind==='autosave'?{frame:state.autoSaveFrame}:{}),
      ...(kind==='fancy'||kind==='thick'?{clipRatio:state.percentage}:{}),...(kind==='custom'?{nativeUnrecovered:customBar.kind==='native-unrecovered'}:{})}));
  };
  for(const template of selected){
    if(template==='cloud-upload'){leaf(template,'wave',state.progressAnimationVisible&&!state.useDeterminateAnimation,24);leaf(template,'fancy',state.progressAnimationVisible&&state.useDeterminateAnimation,25);}
    else leaf(template,template,template==='wave'?state.barAnimationVisible:template==='spinner'?state.spinnerAnimationVisible:template==='autosave'?state.autoSaveVisible:state.loadingBarVisible,template==='wave'||template==='spinner'?24:template==='autosave'?20:template==='custom'?16:0);
  }
  return Object.freeze({state,size:Object.freeze(size),scale,label:text(p.label,'Progress indicator label'),...(p.id===undefined?{}:{id:text(p.id,'Progress indicator id')}),className:p.className===undefined?'':text(p.className,'Progress indicator className',true),imageClipPolicy:p.imageClipPolicy as ProgressIndicatorsProps['imageClipPolicy'],customBar,leaves:Object.freeze(leaves)});
}

export const ProgressIndicators=forwardRef<HTMLDivElement,ProgressIndicatorsProps>(function ProgressIndicators(props,ref){
  const plan=planProgressIndicators(props,ref),[_,attach]=useClassicNodeRef(ref),filterId='progress-indicators-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const {scale:s}=plan;
  const skin=(key:keyof typeof progressAssets,w:number,h:number)=><ClassicSkin asset={progressAssets[key]} width={w} height={h} scale={s} baseClass="mc-progress-indicator-skin" errorName="ProgressIndicators"/>;
  return <div ref={attach} id={plan.id} className={`mc-progress-indicators ${plan.className}`} role="img" aria-label={plan.label} data-native-certified="false" data-motion-policy="explicit-frames-web" data-paused={plan.state.paused}
    data-image-clip-policy={plan.imageClipPolicy} data-progress-flags={JSON.stringify(plan.state)} style={{width:plan.size[0]*s,height:plan.size[1]*s}}>
    <svg width="0" height="0" aria-hidden="true" className="mc-progress-indicators__filters"><defs>{[['full',.263,.627,.109],['empty',.24,.24,.24]].map(([name,r,g,b])=><filter key={name} id={`${filterId}-${name}`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={`${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`}/></filter>)}</defs></svg>
    {plan.leaves.map((leaf,index)=>{const [x,y,w,h]=leaf.box,clip=plan.imageClipPolicy==='visible-fraction-web'?`inset(0 ${(1-leaf.clipRatio!)*100}% 0 0)`:`inset(0 0 0 ${leaf.clipRatio!*100}%)`;
      return <span key={index} className={`mc-progress-indicator mc-progress-indicator--${leaf.kind}`} hidden={!leaf.visible} aria-hidden="true" data-progress-kind={leaf.kind} data-progress-template={leaf.template} data-source-control={leaf.sourceControl} data-frame={leaf.frame} data-source-clip-ratio={leaf.clipRatio} data-native-renderer={leaf.nativeUnrecovered?'unrecovered':undefined}
        data-current-amount={leaf.kind==='custom'?plan.state.currentAmount:undefined} data-total-amount={leaf.kind==='custom'?plan.state.totalAmount:undefined}
        style={{left:x*s,top:y*s,width:w*s,height:h*s,zIndex:leaf.layer}}>
        {leaf.kind==='wave'||leaf.kind==='spinner'||leaf.kind==='autosave'?(()=>{const asset=progressAssets[leaf.kind==='wave'?'textures/ui/loading_bar':leaf.kind==='spinner'?'textures/ui/loading_spin':'textures/ui/auto_save'],factor=leaf.kind==='spinner'?2:1;return <Image className="mc-progress-indicator__strip" src={asset.url} sourceSize={[asset.width,asset.height]} size={[asset.width*factor,h]} scale={s} alt="" style={{left:-leaf.frame!*w*s,filter:leaf.kind==='wave'?'brightness(.7)':undefined}}/>;})():null}
        {leaf.kind==='fancy'||leaf.kind==='thick'?<>
          <span className="mc-progress-indicator__empty" style={leaf.kind==='thick'?{filter:`url("#${filterId}-empty")`}:undefined}>{skin(leaf.kind==='thick'?'textures/ui/progress_bar_simple':'textures/ui/experiencebarempty',w,h)}</span>
          <span className="mc-progress-indicator__full" style={{clipPath:clip,...leaf.kind==='thick'?{filter:`url("#${filterId}-full")`}:{}}}>{skin(leaf.kind==='thick'?'textures/ui/progress_bar_simple':'textures/ui/experiencebarfull',w,h)}</span>
          {leaf.kind==='fancy'&&<span className="mc-progress-indicator__nub" style={{left:5*s,width:(w-10)*s,height:5*s,backgroundImage:`url(${JSON.stringify(progressAssets['textures/ui/experiencenub'].url)})`,backgroundSize:`${11*s}px ${5*s}px`}}/>}
        </>:null}
        {leaf.kind==='custom'&&plan.customBar.kind==='explicit-web-clip'&&<span className="mc-progress-indicator__custom-web" data-web-provenance={plan.customBar.provenance} style={{clipPath:`inset(0 ${(1-plan.customBar.clipRatio)*100}% 0 0)`}}/>}
      </span>;
    })}
  </div>;
});
