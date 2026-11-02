import{forwardRef,useId,useRef,version as reactVersion}from'react';
import type{CSSProperties,SyntheticEvent}from'react';
import{ClassicSkin}from'./classic-skin';import{Image}from'./image';import{ScrollArea}from'./scroll-area';
import{chatAssets}from'./chat-assets';import{playScreenAssets}from'./play-screen-assets';
import{classicModalOwnsInput,classicModalTab,deferClassicRequest,scheduleClassicTask,useClassicLayoutEffect,useClassicModal,useClassicNodeRef}from'./classic-screen-lifecycle';
import{layoutSettingsFrame,settingsFrameFont}from'./settings-frame-model';
import type{SettingsFrameBox,SettingsFramePane,SettingsFrameProps,SettingsFrameRequest,SettingsFrameCommand,SettingsFrameController}from'./settings-frame-model';
export type{SettingsFrameLayout,SettingsFrameGeometry,SettingsFramePane,SettingsFrameBox,SettingsFrameBackground,SettingsFrameBack,SettingsFrameCommand,SettingsFrameRequest,SettingsFrameController,SettingsFrameProps}from'./settings-frame-model';
export{layoutSettingsFrame}from'./settings-frame-model';
const at=(box:SettingsFrameBox,s:number):CSSProperties=>({position:'absolute',left:box[0]*s,top:box[1]*s,width:box[2]*s,height:box[3]*s});
function available(node:HTMLElement|null):boolean{
  if(!node?.isConnected||node.closest('[hidden],[inert]')||!node.getClientRects().length||node.ownerDocument.defaultView?.getComputedStyle(node).visibility==='hidden')return false;
  try{const d=node.ownerDocument;return!d.querySelector('dialog:modal')||!!d.activeElement?.closest('dialog:modal')?.contains(node);}catch{return true;}
}
const inertAttributes=(inert:boolean|undefined)=>{
  if(inert!==undefined&&typeof inert!=='boolean')throw new TypeError('Settings frame inert must be boolean.');
  return{inert:inert?(Number.parseInt(reactVersion,10)<19?'':true):undefined}as Record<string,string|boolean|undefined>;
};
function Tint({id,value}:{id:string;value:readonly[number,number,number]}){
  return<svg width="0" height="0" aria-hidden="true" focusable="false" className="mc-settings-frame__filters"><defs><filter id={id} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={`${value[0]} 0 0 0 0 0 ${value[1]} 0 0 0 0 0 ${value[2]} 0 0 0 0 0 1 0`}/></filter></defs></svg>;
}
/** Actual settings_content/dialog_content frame. Empty world header/footer slots
 * remain empty; source page providers and all field bindings belong to the caller. */
export const SettingsFrame=forwardRef<HTMLDivElement,SettingsFrameProps>(function SettingsFrame(props,forwarded){
 const{layout:input,label,background,font,titleFont,titleShadow,titleVerticalAlignment,dialogTitleAlignment,dialogTitle,sectionTitle,back,
  selectorContent,content,headerContent,footerContent,selectorScrollLabel,contentScrollLabel,disabled=false,menuCancelEnabled=true,modal=false,inert,
  onRequest,controllerRef,backButtonRef,selectorViewportRef,contentViewportRef,popupHostRef,backButtonProps={},className,style,hidden,onKeyDown,children,dangerouslySetInnerHTML,...native}=props;
 if(children!==undefined||dangerouslySetInnerHTML!==undefined)throw new TypeError('Settings frame uses named source slots, not injected children or HTML.');
 for(const[text,name]of[[label,'label'],[dialogTitle,'dialog title'],[sectionTitle,'section title'],[selectorScrollLabel,'selector scroll label'],[contentScrollLabel,'content scroll label']]as const)if(typeof text!=='string'||text.length>1048576||(name==='label'&&!text.trim()))throw new TypeError(`Settings frame ${name} must be resolved bounded text.`);
 for(const value of[disabled,menuCancelEnabled,modal,titleShadow,back?.visible,back?.enabled])if(typeof value!=='boolean')throw new TypeError('Settings frame capability/shadow flags must be explicit booleans.');
 if(modal&&native.role!==undefined&&native.role!=='dialog'&&native.role!=='alertdialog')throw new TypeError('A modal SettingsFrame requires a dialog or alertdialog role.');
 if(titleVerticalAlignment!=='top'&&titleVerticalAlignment!=='center'||dialogTitleAlignment!=='left'&&dialogTitleAlignment!=='center')throw new TypeError('Settings frame requires explicit text alignment policies.');
 const plan=layoutSettingsFrame(input),layout=plan.layout,s=layout.scale;
 const bodyStyle=settingsFrameFont(font,s),titleStyle=settingsFrameFont(titleFont,s);
 if(!background||typeof background.src!=='string'||!background.src||!Array.isArray(background.sourceSize)||background.sourceSize.length!==2||![...background.sourceSize].every(n=>Number.isSafeInteger(n)&&n>0&&n<=8192)||!['exact-source','host-resolved'].includes(background.resolution))throw new TypeError('Settings frame background requires a resolved whole source image and explicit resolution.');
 for(const box of[back.box,back.paintBox])if(!Array.isArray(box)||box.length!==4||![...box].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n*s)<=8192)||box[2]<=0||box[3]<=0)throw new RangeError('Settings frame back control needs explicit finite hit/paint boxes.');
 if(!Array.isArray(back.glyphOffset)||back.glyphOffset.length!==2||![...back.glyphOffset].every(n=>Number.isFinite(n)&&Math.abs(n*s)<=8192)||typeof back.label!=='string'||!back.label.trim())throw new TypeError('Settings frame back glyph/label must be resolved by the host.');
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,''),backgroundTint=`settings-bg-${id}`,glyphTint=`settings-back-${id}`;
 const[root,attach]=useClassicNodeRef(forwarded),[backNode,attachBack]=useClassicNodeRef(backButtonRef),[,attachSelector]=useClassicNodeRef(selectorViewportRef),[,attachContent]=useClassicNodeRef(contentViewportRef),[,attachPopups]=useClassicNodeRef(popupHostRef);
 const active=!hidden&&!inert;
 useClassicModal(root,root,active&&modal);
 const current=useRef({plan,disabled,menuCancelEnabled,modal,active,back,onRequest});
 useClassicLayoutEffect(()=>{current.current={plan,disabled,menuCancelEnabled,modal,active,back,onRequest};});
 const valid=(captured:typeof current.current)=>current.current===captured&&captured.active&&!captured.disabled&&available(root.current)&&(!captured.modal||classicModalOwnsInput(root.current));
 const request=(command:SettingsFrameCommand,origin:SettingsFrameRequest['origin'],event?:SyntheticEvent<HTMLElement>,owner:HTMLElement|null=root.current,captured=current.current)=>{
  if(!owner||!valid(captured)||command==='button.menu_cancel'&&!captured.menuCancelEnabled||command!=='button.menu_cancel'&&captured.plan.layout.variant==='fullscreen-content')return false;
  const target=command==='button.menu_cancel'?'button.menu_exit':command;
  const send=(snapshot?:SyntheticEvent<HTMLElement>)=>{if(valid(captured))captured.onRequest?.(Object.freeze({target,origin,control:owner,fromButtonId:command,...(snapshot?{event:snapshot}:{})}));};
  if(event)deferClassicRequest(event,owner,send,()=>valid(captured));else scheduleClassicTask(owner,()=>send());return true;
 };
 const handle=useRef<SettingsFrameController>({request:()=>false});
 useClassicLayoutEffect(()=>{handle.current.request=command=>['button.menu_cancel','button.menu_tab_left','button.menu_tab_right'].includes(command)&&request(command,'controller');});
 const[,attachController]=useClassicNodeRef<SettingsFrameController>(controllerRef);
 useClassicLayoutEffect(()=>{attachController(handle.current);return()=>{attachController(null);};},[attachController]);
 const scroll=(pane:SettingsFramePane,selector:boolean)=>{
  const rail=selector?layout.selectorScrollbarVisible:layout.contentScrollbarVisible;
  return<ScrollArea className="mc-settings-frame__scroll" style={{...at(pane.box,s),'--mc-settings-rail-space':`${pane.railReservation*s}px`,'--mc-skin-scroll-track':`url(${JSON.stringify(chatAssets['textures/ui/ScrollRail'].url)})`,'--mc-skin-scroll-thumb':`url(${JSON.stringify(chatAssets['textures/ui/ScrollHandle'].url)})`}as CSSProperties}
    variant={layout.inputMode==='mouse'?'document':'touch'} scale={s} label={selector?selectorScrollLabel:contentScrollLabel} scrollbarVisibility="always" thumbVisible={rail}
    data-source-pane={selector?'selector':'content'} data-input-mode={layout.inputMode} data-rail-visible={rail}
    viewportRef={selector?attachSelector:attachContent}
    contentProps={{style:{position:'relative',left:pane.contentOffset[0]*s,width:pane.contentWidth*s,minWidth:0,paddingTop:pane.contentOffset[1]*s,paddingBottom:(selector?2:4)*s,boxSizing:'content-box'}}}>
    {selector?selectorContent:content}
  </ScrollArea>;
 };
 return<div {...native} {...inertAttributes(inert)} ref={attach} hidden={hidden} role={native.role??(modal?'dialog':'region')} aria-label={native['aria-label']??label} aria-modal={modal||undefined}
  tabIndex={native.tabIndex??-1} className={['mc-settings-frame',className].filter(Boolean).join(' ')} data-source-variant={layout.variant} data-native-certified="false"
  style={{...style,...bodyStyle,width:layout.size[0]*s,height:layout.size[1]*s,'--mc-settings-frame-u':`${s}px`}as CSSProperties}
  onKeyDown={event=>{
   const captured=current.current;onKeyDown?.(event);
   if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
   const target=event.target as Element;if(!event.currentTarget.contains(target))return;
   const dialog=target.closest?.('dialog,[role="dialog"],[role="alertdialog"]');if(dialog&&dialog!==event.currentTarget)return;
   if(event.key==='Tab'&&modal)classicModalTab(event,root.current,root.current);
   else if(event.key==='Escape')request('button.menu_cancel','keyboard',event,event.currentTarget,captured);
  }}>
  <Tint id={backgroundTint} value={[.192,.196,.2]}/><Tint id={glyphTint} value={[.3,.3,.3]}/>
  <span className="mc-settings-frame__background" aria-hidden="true" data-source-texture="textures/ui/White" data-texture-resolution={background.resolution} style={{...at(plan.background,s),filter:`url("#${backgroundTint}")`}}><ClassicSkin asset={{url:background.src,width:background.sourceSize[0],height:background.sourceSize[1]}} width={plan.background[2]} height={plan.background[3]} scale={s} baseClass="mc-settings-frame-skin"/></span>
  <span className="mc-settings-frame__topbar" aria-hidden="true" style={at(plan.topBar,s)}><ClassicSkin asset={chatAssets['textures/ui/StoreTopBar']} width={plan.topBar[2]} height={23} scale={s} baseClass="mc-settings-frame-skin"/></span>
  <h2 className="mc-settings-frame__title" data-source-title="dialog" style={{...at(plan.dialogTitle,s),...titleStyle,textAlign:dialogTitleAlignment,justifyContent:titleVerticalAlignment==='top'?'flex-start':'center',textShadow:titleShadow?`${s}px ${s}px #000`: 'none'}}>{dialogTitle}</h2>
  <h3 className="mc-settings-frame__title" data-source-title="section" style={{...at(plan.sectionTitle,s),...titleStyle,textAlign:'center',justifyContent:titleVerticalAlignment==='top'?'flex-start':'center',textShadow:titleShadow?`${s}px ${s}px #000`: 'none'}}>{sectionTitle}</h3>
  {plan.selector&&scroll(plan.selector,true)}
  {layout.contentHeaderHeight>0&&<div className="mc-settings-frame__header" style={at(plan.contentHeader,s)}>{headerContent}</div>}
  {scroll(plan.content,false)}
  {layout.contentFooterHeight>0&&<div className="mc-settings-frame__footer" style={at(plan.contentFooter,s)}>{footerContent}</div>}
  {plan.divider&&<span className="mc-settings-frame__divider" aria-hidden="true" style={at(plan.divider,s)}><ClassicSkin asset={playScreenAssets['textures/ui/HowToPlayDivider']} width={4} height={plan.divider[3]} scale={s} baseClass="mc-settings-frame-skin"/></span>}
  <div ref={attachPopups} className="mc-settings-frame__popups" data-source-popup-area="content_area" style={at(plan.contentArea,s)}/>
  {back.visible&&<button {...backButtonProps} ref={attachBack} type="button" disabled={disabled||!back.enabled} aria-label={backButtonProps['aria-label']??back.label}
   className={['mc-settings-frame__back',backButtonProps.className].filter(Boolean).join(' ')} data-source-target="button.menu_exit" style={{...backButtonProps.style,...at(back.box,s)}}
   onKeyDown={event=>{backButtonProps.onKeyDown?.(event);if(!event.defaultPrevented&&(event.nativeEvent.isComposing||event.keyCode===229)&&['Enter',' '].includes(event.key))event.preventDefault();}}
   onClick={event=>{
    const captured=current.current,owner=event.currentTarget;backButtonProps.onClick?.(event);
    if(event.defaultPrevented||event.nativeEvent.defaultPrevented||!captured.back.enabled||!captured.back.visible||owner.disabled)return;
    const good=()=>valid(captured)&&backNode.current===owner&&!owner.disabled&&available(owner)&&captured.back.enabled&&captured.back.visible;
    deferClassicRequest(event,owner,snapshot=>{if(good())captured.onRequest?.(Object.freeze({target:'button.menu_exit',origin:'back',control:owner,fromButtonId:'button.menu_select',event:snapshot}));},good);
   }}>
   <span className="mc-settings-frame__back-hover" aria-hidden="true" style={at(back.paintBox,s)}><ClassicSkin asset={chatAssets['textures/ui/button_borderless_imagelesshoverbg']} width={back.paintBox[2]} height={back.paintBox[3]} scale={s} baseClass="mc-settings-frame-skin"/></span>
   <span className="mc-settings-frame__back-locked" aria-hidden="true" style={at(back.paintBox,s)}><ClassicSkin asset={chatAssets['textures/ui/disabledButtonNoBorder']} width={back.paintBox[2]} height={back.paintBox[3]} scale={s} baseClass="mc-settings-frame-skin"/></span>
   <Image aria-hidden="true" alt="" src={chatAssets['textures/ui/chevron_left'].url} sourceSize={[4,7]} size={[4,7]} scale={s} className="mc-settings-frame__back-glyph" style={{position:'absolute',left:back.glyphOffset[0]*s,top:back.glyphOffset[1]*s,'--mc-settings-back-filter':`url("#${glyphTint}")`}as CSSProperties}/>
  </button>}
 </div>;
});
