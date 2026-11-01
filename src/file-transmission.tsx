import {forwardRef,useRef} from 'react';
import type {CSSProperties,KeyboardEvent,MouseEvent,ReactNode,Ref,SyntheticEvent} from 'react';
import {ClassicSkin} from './classic-skin';
import {Image} from './image';
import {classicModalOwnsInput,classicModalTab,deferClassicEvent,deferClassicRequest,scheduleClassicTask,useClassicLayoutEffect,useClassicModal,useClassicNodeRef} from './classic-screen-lifecycle';
import {validateProgressRef} from './progress-data';
import {projectProgressElementProps} from './progress-react-props';
import {progressAssets} from './progress-assets';
import {planFileTransmission} from './file-transmission-model';
import type {FileTransmissionAction,FileTransmissionModel,FileTransmissionTarget,FileTransmissionTextRole} from './file-transmission-model';

function TransmissionText({text,role,sourceControl,model,color}:{text:string;role:FileTransmissionTextRole;sourceControl:string;model:FileTransmissionModel;color:string}){
 const p=model.profile,font=p.fonts[role],context=Object.freeze({role,sourceControl,font,scale:p.scale,color,shadow:false as const});
 return <span className="mc-file-transmission-text" data-source-control={sourceControl} data-file-transmission-text-role={role} data-text-policy={p.textPolicy} style={{fontFamily:font.family,fontSize:font.logicalSize*p.scale,lineHeight:`${font.lineHeight*p.scale}px`,color}}>
  {model.renderText?<><span aria-hidden="true">{model.renderText(text,context)}</span><span className="mc-file-transmission-text__literal">{text}</span></>:text}
 </span>;
}

export interface FileTransferProgressProps {
 readonly width:number;readonly scale:number;readonly percentage:number;readonly visible:boolean;
 readonly imageClipPolicy:'visible-fraction-web'|'left-removal-web';readonly label:string;
}
function progressInput(p:FileTransferProgressProps){
 if(!Number.isFinite(p.width)||p.width<10||p.width>8192||typeof p.visible!=='boolean'||!Number.isFinite(p.percentage)||p.percentage<0||p.percentage>1)throw new RangeError('File transfer progress requires width[10,8192], boolean visibility and finite percentage[0,1]');
 if(!Number.isSafeInteger(p.scale)||p.scale<1||p.scale>64||p.width*p.scale>8192)throw new RangeError('File transfer progress exceeds finite Web scale/width budget');
 if(!['visible-fraction-web','left-removal-web'].includes(p.imageClipPolicy)||typeof p.label!=='string'||p.label.length>1048576||p.visible&&!p.label.trim())throw new TypeError('File transfer progress requires explicit clip interpretation and accessible literal label');
 return Object.freeze({...p});
}
/** Same complete experience textures and tiled nub as the source, not CSS artwork. */
export const FileTransferProgress=forwardRef<HTMLDivElement,FileTransferProgressProps>(function FileTransferProgress(raw,ref){
 const p=progressInput(projectProgressElementProps(raw));validateProgressRef(ref);const[,attach]=useClassicNodeRef(ref),s=p.scale;
 const skin=(key:keyof typeof progressAssets)=><ClassicSkin asset={progressAssets[key]} width={p.width} height={5} scale={s} baseClass="mc-progress-skin"/>;
 return <div ref={attach} hidden={!p.visible} role="img" aria-label={p.label} className="mc-file-transfer-progress" data-source-control="file_upload.progress_bar_icon" data-image-clip-policy={p.imageClipPolicy} style={{width:p.width*s,height:5*s}}>
  <span className="mc-file-transfer-progress__empty" aria-hidden="true">{skin('textures/ui/experiencebarempty')}</span>
  <span className="mc-file-transfer-progress__full" aria-hidden="true" style={{clipPath:p.imageClipPolicy==='visible-fraction-web'?`inset(0 ${(1-p.percentage)*100}% 0 0)`:`inset(0 0 0 ${p.percentage*100}%)`}}>{skin('textures/ui/experiencebarfull')}</span>
  <span className="mc-file-transfer-progress__nub" aria-hidden="true" style={{left:5*s,width:(p.width-10)*s,height:5*s,backgroundImage:`url(${JSON.stringify(progressAssets['textures/ui/experiencenub'].url)})`,backgroundSize:`${11*s}px ${5*s}px`}}/>
 </div>;
});
export interface FileTransmissionPanelProps {
 readonly model:FileTransmissionModel;readonly onNativeClick?:(event:MouseEvent<HTMLDivElement>)=>void;
}
type Plan=ReturnType<typeof planFileTransmission>;
function useRequest(plan:Plan,root:{readonly current:HTMLElement|null},ownsInput:()=>boolean=()=>true){
 const latest=useRef<Plan|null>(plan),epoch=useRef(0),lifetime=useRef('');
 useClassicLayoutEffect(()=>{const key=JSON.stringify([plan.snapshot.runKey,plan.snapshot.disabled,plan.snapshot.readOnly,plan.buttons.map(b=>b.id),!!root.current?.closest('[hidden],[inert]')]);if(lifetime.current!==key){lifetime.current=key;epoch.current++;}latest.current=plan;});useClassicLayoutEffect(()=>()=>{latest.current=null;epoch.current++;},[]);
 return (target:FileTransmissionTarget,sourceControl:string,control:HTMLElement,origin:FileTransmissionAction['origin'],event?:SyntheticEvent<HTMLElement>,buttonId?:string)=>{
  const captured=plan.snapshot,capturedEpoch=epoch.current;
  const valid=()=>{const now=latest.current,node=root.current;if(!now||!ownsInput()||epoch.current!==capturedEpoch||now.snapshot.runKey!==captured.runKey||!node?.isConnected||node.closest('[hidden],[inert]')||!control.isConnected||control.closest('[hidden],[inert]')||!node.contains(control)||now.snapshot.disabled)return false;
   if(origin==='control'&&(now.snapshot.readOnly||!now.buttons.some(b=>b.id===buttonId&&b.target===target&&b.visible)))return false;return true;};
  const apply=(snapshot?:SyntheticEvent<HTMLElement>)=>{if(!valid())return;const now=latest.current!;now.snapshot.onAction(Object.freeze({runKey:now.snapshot.runKey,target,sourceControl,origin,control,...snapshot?{event:snapshot}:{}}));};
  if(event)deferClassicRequest(event,control,apply,valid);else scheduleClassicTask(control,()=>apply());
 };
}
const boxStyle=(box:readonly[number,number,number,number],s:number):CSSProperties=>({left:box[0]*s,top:box[1]*s,width:box[2]*s,height:box[3]*s});
function PanelPaint({plan,forwardedRef,onNativeClick}:{plan:Plan;forwardedRef:Ref<HTMLDivElement>;onNativeClick?:FileTransmissionPanelProps['onNativeClick']}){
 const[root,attach]=useClassicNodeRef(forwardedRef),request=useRequest(plan,root),m=plan.snapshot,s=m.profile.scale;
 const skin=(key:keyof typeof progressAssets,w:number,h:number)=><ClassicSkin asset={progressAssets[key]} width={w} height={h} scale={s} baseClass="mc-progress-skin"/>;
 return <div ref={attach} tabIndex={-1} className="mc-file-transmission-panel" data-source-control="file_upload.file_upload_content/content" data-native-certified="false" data-material-policy={m.materialPolicy} style={{width:268*s,height:95*s,'--mc-file-transfer-unit':`${s}px`} as CSSProperties} onClick={onNativeClick}>
  <span className="mc-file-transmission-panel__fill" aria-hidden="true"><Image src={progressAssets['textures/ui/control'].url} sourceSize={[2,2]} size={[260,87]} scale={s} alt="" style={{left:4*s,top:4*s,opacity:.8}}/></span>
  <span className="mc-file-transmission-panel__frame" aria-hidden="true">{skin('textures/ui/dialog_background_hollow_2',268,95)}</span>
  {plan.texts.map(leaf=><span key={leaf.sourceControl} className="mc-file-transmission-panel__text" style={boxStyle(leaf.box,s)}><TransmissionText text={leaf.text} role={leaf.role} sourceControl={leaf.sourceControl} model={m} color={leaf.color}/></span>)}
  <span className="mc-file-transmission-panel__progress" style={boxStyle(plan.progress.box,s)}><FileTransferProgress width={248} scale={s} percentage={m.bindings.percentage} visible={plan.progress.visible} imageClipPolicy={m.imageClipPolicy} label={plan.progress.label}/></span>
  {plan.buttons.map(b=><button key={b.id} type="button" className="mc-file-transmission-button" disabled={m.disabled} aria-disabled={m.readOnly||undefined} aria-label={b.label} data-file-transmission-button={b.id} data-source-target={b.target} style={boxStyle(b.box,s)} onClick={event=>request(b.target,b.sourceControl,event.currentTarget,'control',event,b.id)}>
   {(['normal','hover','pressed','locked'] as const).map(state=><span key={state} aria-hidden="true" className={`mc-file-transmission-button__state mc-file-transmission-button__state--${state}`}>
    <span className="mc-file-transmission-button__face" style={{inset:s}}>{skin(state==='hover'?'textures/ui/button_borderless_lighthover':state==='pressed'?'textures/ui/button_borderless_lightpressed':state==='locked'?'textures/ui/disabledButtonNoBorder':'textures/ui/button_borderless_light',b.box[2]-2,b.box[3]-2)}</span>
    <span className="mc-file-transmission-button__border" style={{filter:state==='normal'||state==='locked'?'brightness(.075)':undefined}}>{skin('textures/ui/focus_border_white',b.box[2],b.box[3])}</span>
    <span className="mc-file-transmission-button__label"><TransmissionText text={b.label} role="button" sourceControl={b.sourceControl+'/label'} model={m} color={state==='normal'||state==='locked'?'rgb(30% 30% 30%)':'#fff'}/></span>
   </span>)}
  </button>)}
 </div>;
}
function checkNative(value:unknown){if(value!==undefined&&typeof value!=='function')throw new TypeError('File transmission native handler must be callable');}
export const FileTransmissionPanel=forwardRef<HTMLDivElement,FileTransmissionPanelProps>(function FileTransmissionPanel(raw,ref){
 const p=projectProgressElementProps(raw);validateProgressRef(ref);checkNative(p.onNativeClick);const plan=planFileTransmission(p.model);
 return <PanelPaint key={plan.snapshot.runKey} plan={plan} forwardedRef={ref} onNativeClick={p.onNativeClick}/>;
});
export interface FileTransmissionController {request(command:'button.menu_cancel'|'button.menu_tab_left'|'button.menu_tab_right'):boolean}
export interface FileTransmissionScreenProps extends Omit<FileTransmissionPanelProps,'onNativeClick'> {
 readonly open:boolean;readonly label:string;
 /** Host recovers the base-screen and platform-title providers; no invented source default. */
 readonly baseLayer:ReactNode;readonly titleArt:ReactNode;
 readonly controllerRef?:Ref<FileTransmissionController>;readonly onNativeKeyDown?:(event:KeyboardEvent<HTMLElement>)=>void;
 readonly onNativeClick?:(event:MouseEvent<HTMLElement>)=>void;
}
function ScreenSession({p,plan,forwardedRef}:{p:FileTransmissionScreenProps;plan:Plan;forwardedRef:Ref<HTMLElement>}){
 const[root,attach]=useClassicNodeRef(forwardedRef),panel=useRef<HTMLDivElement>(null),request=useRequest(plan,root,()=>classicModalOwnsInput(root.current)),m=plan.snapshot,s=m.profile.scale,[w,h]=m.profile.availableSize;
 useClassicModal(root,panel,p.open);
 const latest=useRef({p,plan,request});useClassicLayoutEffect(()=>{latest.current={p,plan,request};});useClassicLayoutEffect(()=>()=>{latest.current={...latest.current,p:{...latest.current.p,open:false}};},[]);
 const controller=useRef<FileTransmissionController|null>(null);
 if(!controller.current)controller.current={request(command){const now=latest.current,node=root.current;if(!['button.menu_cancel','button.menu_tab_left','button.menu_tab_right'].includes(command))throw new TypeError('Unknown FileTransmission controller command');if(!node?.isConnected||!now.p.open||now.plan.snapshot.disabled||!classicModalOwnsInput(node))return false;now.request(command==='button.menu_cancel'?'button.menu_exit':command,'file_upload.file_transmission_screen',node,'host-controller');return true;}};
 const[,controllerAttach]=useClassicNodeRef(p.controllerRef);useClassicLayoutEffect(()=>{controllerAttach(controller.current);return()=>{controllerAttach(null);};},[controllerAttach]);
 return <section ref={attach} className="mc-file-transmission-screen" hidden={!p.open} role="dialog" aria-modal="true" aria-label={p.label} tabIndex={-1} data-source-route="file_transmission_screen" data-native-certified="false" style={{width:w*s,height:h*s}} onClick={p.onNativeClick} onKeyDown={event=>{
  p.onNativeKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229)return;
  if(event.key==='Tab')deferClassicEvent(event,event.currentTarget,snapshot=>{if(root.current&&panel.current)classicModalTab(snapshot,root.current,panel.current);},()=>latest.current.p.open);
  else if(event.key==='Escape'&&!event.repeat&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)request('button.menu_exit','file_upload.file_transmission_screen',event.currentTarget,'keyboard',event);
 }}>
  <div className="mc-file-transmission-screen__base">{p.baseLayer}</div><div className="mc-file-transmission-screen__title">{p.titleArt}</div>
  <div className="mc-file-transmission-screen__content" style={{left:(w-268)/2*s,top:(h-95)/2*s}}><PanelPaint plan={plan} forwardedRef={panel}/></div>
 </section>;
}
export const FileTransmissionScreen=forwardRef<HTMLElement,FileTransmissionScreenProps>(function FileTransmissionScreen(raw,ref){
 const p=projectProgressElementProps(raw);validateProgressRef(ref);checkNative(p.onNativeClick);checkNative(p.onNativeKeyDown);
 if(typeof p.open!=='boolean'||typeof p.label!=='string'||!p.label.trim()||p.label.length>4096)throw new TypeError('File transmission screen requires boolean open and bounded label');
 validateProgressRef(p.controllerRef);
 const plan=planFileTransmission(p.model);return <ScreenSession key={plan.snapshot.runKey} p={p} plan={plan} forwardedRef={ref}/>;
});
