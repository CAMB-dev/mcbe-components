import {forwardRef,useState} from 'react';
import type {CSSProperties,Ref} from 'react';
import {Image} from './image';
import {useClassicNodeRef} from './classic-screen-lifecycle';
import {snapshotProgressScreenModel,snapshotProgressWholeImage,validateProgressRef} from './progress-data';
import {resolveProgressRoute} from './progress-route';
import {progressAssets} from './progress-assets';
import {planProgressIndicators,ProgressIndicators} from './progress-indicators';
import type {ProgressIndicatorsProps,ProgressIndicatorTemplate} from './progress-indicators';
import {planProgressActions,ProgressActions,planProgressText,ProgressText,planProgressPanelSkin,ProgressPanelSkin} from './progress-actions';
import type {ProgressActionsProps,ProgressActionVariant,ProgressRawRequestSink,ProgressTextProps} from './progress-actions';
import {progressBox,progressCentered,progressIntrinsic,PROGRESS_CONTENT_BRANDING,PROGRESS_PANEL_INTRINSIC_KEYS as keys} from './progress-layout';
import type {ProgressBox} from './progress-layout';
import type {ProgressScreenSnapshot,ProgressSize,ProgressWholeImage} from './progress-types';

export interface ProgressBasePanelsProps{readonly snapshot:ProgressScreenSnapshot;readonly onRequest:ProgressRawRequestSink;readonly imageClipPolicy:ProgressIndicatorsProps['imageClipPolicy']}
export interface TextLeaf extends ProgressTextProps{readonly box:ProgressBox}
export function planProgressBasePanels(p:ProgressBasePanelsProps,ref?:Ref<HTMLDivElement>){
 validateProgressRef(ref);const s=snapshotProgressScreenModel(p.snapshot),route=resolveProgressRoute(s),profile=s.profile,[w,h]=profile.availableSize;
 if(typeof p.onRequest!=='function')throw new TypeError('Progress panels require source owner sink');
 if(!['visible-fraction-web','left-removal-web'].includes(p.imageClipPolicy))throw new TypeError('Progress panels require explicit image clip policy');
 const world=['world_convert_modal_progress_screen_content','world_save_modal_progress_screen_content','realms_loading_world_modal_progress_screen_content','joining_edu_server_progress_screen_content'].includes(route.content),modal=route.content==='modal_screen_content',generic=route.content==='progress_screen_content';
 const texts:TextLeaf[]=[],indicators:{box:ProgressBox;props:ProgressIndicatorsProps}[]=[];let panel:ProgressBox|null=null,skin:Parameters<typeof planProgressPanelSkin>[0]|null=null,actions:{box:ProgressBox;props:ProgressActionsProps}|null=null;
 const leaf=(text:string,role:'title'|'progress',sourceControl:string,box:ProgressBox,color:string)=>{const value=Object.freeze({text,role,sourceControl,box,profile,renderText:s.renderText,color});planProgressText(value);texts.push(value);};
 const indicatorsAt=(box:ProgressBox,templates:readonly ProgressIndicatorTemplate[])=>{const props:ProgressIndicatorsProps={templates,state:s.indicators,availableSize:Object.freeze([box[2],box[3]]),scale:profile.scale,imageClipPolicy:p.imageClipPolicy,customBar:profile.customBar,label:profile.labels['progressScreen.progress']??s.bindings.progressText};planProgressIndicators(props);indicators.push(Object.freeze({box,props}));};
 const actionsAt=(box:ProgressBox,variant:ProgressActionVariant)=>{const props:ProgressActionsProps={snapshot:s,variant,availableSize:Object.freeze([box[2],box[3]]),onRequest:p.onRequest,material:modal?'modal-stroke':'source-light'};planProgressActions(props);actions=Object.freeze({box,props});};
 if(modal){
  panel=progressCentered([w,h],[204,140]);skin={size:[204,140],scale:profile.scale,frame:'hollow2',fillAlpha:.8};planProgressPanelSkin(skin);
  const size:ProgressSize=[192,80],title=progressIntrinsic(profile,keys.modalTitle),message=progressIntrinsic(profile,keys.modalText);
  if(title[0]>184||title[1]!==20||message[0]>184||message[1]!==20)throw new RangeError('Progress modal text must preserve source max-width184 / height20');
  leaf(s.bindings.titleText,'title','progress.progress_title_text',progressBox([6+(192-title[0])/2,20+40-15-10,...title],'Progress modal title'),profile.loadingTextColor);
  leaf(s.bindings.progressText,'progress','progress.progress_bar_text',progressBox([6+(192-message[0])/2,20+40+9-10,...message],'Progress modal text'),profile.loadingTextColor);
  indicatorsAt([6,20,...size],['wave','custom']);actionsAt([0,100,204,40],'modal');
 }else if(world){
  const resolved=progressIntrinsic(profile,keys.world);if(resolved[0]!==290||resolved[1]<100)throw new RangeError('Progress world modal preserves width290 / minimum height100');panel=progressCentered([w,h],resolved);skin={size:resolved,scale:profile.scale,frame:'hollow3',fillAlpha:.8};planProgressPanelSkin(skin);
  const title=progressIntrinsic(profile,keys.worldTitle),message=progressIntrinsic(profile,keys.worldText),indicatorSize=progressIntrinsic(profile,keys.worldIndicators),buttonSize=progressIntrinsic(profile,keys.worldButtons);
  if(title[0]>278||message[0]>270||message[1]>40||indicatorSize[0]!==278||buttonSize[0]!==278)throw new RangeError('Progress world source text/fill widths or max-height40 violated');
  leaf(s.bindings.titleText,'title','progress.world_modal_progress_panel/progress_title_text',progressBox([6+(278-title[0])/2,9,...title],'Progress world title'),profile.titleTextColor);
  leaf(s.bindings.progressText,'progress','progress.world_modal_progress_panel/progress_bar_text',progressBox([6+(278-message[0])/2,9+title[1]+8,...message],'Progress world text'),profile.loadingTextColor);
  const bottom=indicatorSize[1]+5+buttonSize[1]+14;
  indicatorsAt([6,resolved[1]-bottom,...indicatorSize],['wave','fancy']);
  const variant:ProgressActionVariant=route.content==='world_save_modal_progress_screen_content'?'modal-retry':route.content==='joining_edu_server_progress_screen_content'?'modal-ok-retry':'modal';
  actionsAt([6,resolved[1]-buttonSize[1]-14,...buttonSize],variant);
  if(route.content==='world_save_modal_progress_screen_content')indicatorsAt([0,0,...resolved],['autosave']);
 }else if(generic){
  panel=progressBox([0,0,w,h],'Progress generic source content');const title=progressIntrinsic(profile,keys.genericTitle),message=progressIntrinsic(profile,keys.genericText);
  if(title[0]>w-8||message[0]>w-8||title[1]!==20||message[1]!==20)throw new RangeError('Progress generic text max-width and height20 violated');
  leaf(s.bindings.titleText,'title','progress.progress_title_text',progressBox([(w-title[0])/2,h/2-25,...title],'Progress generic title'),profile.loadingTextColor);
  leaf(s.bindings.progressText,'progress','progress.progress_bar_text',progressBox([(w-message[0])/2,h/2-1,...message],'Progress generic text'),profile.loadingTextColor);
  indicatorsAt([0,0,w,h],['wave','custom']);actionsAt([0,0,w,h],'generic');
 }
 return Object.freeze({snapshot:s,route,panel,skin,actions:actions as {box:ProgressBox;props:ProgressActionsProps}|null,texts:Object.freeze(texts),indicators:Object.freeze(indicators),sourceWrapperSize:profile.availableSize});
}
const at=(box:ProgressBox,scale:number):CSSProperties=>({position:'absolute',left:box[0]*scale,top:box[1]*scale,width:box[2]*scale,height:box[3]*scale});
export const ProgressBasePanels=forwardRef<HTMLDivElement,ProgressBasePanelsProps>(function ProgressBasePanels(p,ref){const plan=planProgressBasePanels(p,ref),[,attach]=useClassicNodeRef(ref),s=plan.snapshot.profile.scale;return <div ref={attach} className="mc-progress-base-panels" data-progress-content={plan.route.content} style={{width:plan.sourceWrapperSize[0]*s,height:plan.sourceWrapperSize[1]*s}}>{plan.panel&&<div className="mc-progress-base-panel" data-source-control={plan.route.panels[0]} style={at(plan.panel,s)}>{plan.skin&&<ProgressPanelSkin {...plan.skin}/>} {plan.texts.map((text,index)=><ProgressText key={index} {...text}/>)}{plan.indicators.map((item,index)=><div key={index} className="mc-progress-base-panel__indicators" style={at(item.box,s)}><ProgressIndicators {...item.props}/></div>)}{plan.actions&&<div className="mc-progress-base-panel__actions" style={at(plan.actions.box,s)}><ProgressActions {...plan.actions.props}/></div>}</div>}</div>;});

export interface ProgressBackgroundProps{readonly snapshot:ProgressScreenSnapshot;readonly gradientPolicy:'native-unrecovered'|'css-linear-top-bottom-web'}
export function planProgressBackground(p:ProgressBackgroundProps){const snapshot=snapshotProgressScreenModel(p.snapshot),route=resolveProgressRoute(snapshot),size=snapshot.profile.availableSize;if(!['native-unrecovered','css-linear-top-bottom-web'].includes(p.gradientPolicy))throw new TypeError('Progress background gradient policy is required');let tile:typeof progressAssets['textures/blocks/dirt']|null=null,gradient:string|null=null,brightness=1;
 if(route.background==='overworld_loading_background'){tile=progressAssets['textures/blocks/dirt'];gradient='linear-gradient(to bottom,rgba(0,0,0,.5),rgba(0,0,0,.7))';}
 if(route.background==='nether_loading_background'){tile=progressAssets['textures/blocks/netherrack'];brightness=.5;gradient='linear-gradient(to bottom,rgba(30%,30%,30%,.2),rgba(50%,18.8%,18.8%,.4))';}
 if(route.background==='theend_loading_background'){tile=progressAssets['textures/blocks/end_stone'];gradient='linear-gradient(to bottom,rgba(0,0,0,.2),rgba(0,0,0,.4))';}
 if(gradient&&p.gradientPolicy==='native-unrecovered')throw new RangeError('Visible native gradient_renderer is unrecovered; supply explicit CSS Web policy');
 const realms=route.background==='realms_loading_background',realmsBase=snapshot.profile.unresolvedMaterials.realmsBackground;
 if(realms&&!realmsBase)throw new RangeError('Progress Realms background requires explicit whole material for missing base template');
 return Object.freeze({snapshot,route,size,tile,gradient,brightness,realms,realmsBase,gradientPolicy:p.gradientPolicy});}
export function ProgressBackground(p:ProgressBackgroundProps){const plan=planProgressBackground(p),s=plan.snapshot.profile.scale,[w,h]=plan.size;return <div className="mc-progress-background" data-source-control={'progress.'+plan.route.background} data-gradient-policy={plan.gradientPolicy} style={{width:w*s,height:h*s}}>{plan.tile&&<><span className="mc-progress-background__tiles" style={{backgroundImage:`url(${JSON.stringify(plan.tile.url)})`,backgroundSize:`${32*s}px ${32*s}px`,filter:plan.brightness===1?undefined:`brightness(${plan.brightness})`}}/><span className="mc-progress-background__gradient" style={{backgroundImage:plan.gradient!}}/></>}{plan.realms&&<><Image src={plan.realmsBase!.src} sourceSize={plan.realmsBase!.naturalSize} size={plan.size} scale={s} alt=""/><Image className="mc-progress-background__realms-fill" src={progressAssets['textures/ui/navy_blue'].url} sourceSize={[24,24]} size={plan.size} scale={s} alt=""/><span className="mc-progress-background__realms-gradient" style={{height:h*.25*s,backgroundImage:`url(${JSON.stringify(progressAssets['textures/ui/realms_gradient_top'].url)})`,backgroundSize:`${s}px 100%`}}/></>}</div>;}

export interface ProgressBrandingDescriptor{readonly image:ProgressWholeImage;readonly sourceVariant:'title_panel_win10'|'title_panel_osx'|'title_panel_edu_desktop'|'title_panel_edu_mobile'|'title_panel_pocket';readonly box:ProgressBox;readonly provenance:string}
export interface ProgressAuxiliaryProps{readonly snapshot:ProgressScreenSnapshot;readonly branding:ProgressBrandingDescriptor|null;readonly mobileDataVisibleAtInstanceCreation?:boolean}
export function planProgressAuxiliary(p:ProgressAuxiliaryProps){
 const snapshot=snapshotProgressScreenModel(p.snapshot),route=resolveProgressRoute(snapshot),profile=snapshot.profile,[w,h]=profile.availableSize,needsBranding=PROGRESS_CONTENT_BRANDING[route.content];let branding:ProgressBrandingDescriptor|null=null;
 if(needsBranding){if(!p.branding||!['title_panel_win10','title_panel_osx','title_panel_edu_desktop','title_panel_edu_mobile','title_panel_pocket'].includes(p.branding.sourceVariant)||typeof p.branding.provenance!=='string'||!p.branding.provenance.trim())throw new RangeError('Progress source content requires explicit platform branding descriptor');branding=Object.freeze({...p.branding,image:snapshotProgressWholeImage(p.branding.image),box:progressBox(p.branding.box,'Progress branding')});}
 let realmsTitle:ProgressBox|null=null,region:{box:ProgressBox;text:TextLeaf;icon:ProgressWholeImage;iconBox:ProgressBox}|null=null,mobile:{box:ProgressBox;text:TextLeaf;android:boolean;ios:boolean}|null=null;
 if(route.content==='realms_loading_world_modal_progress_screen_content'){
  realmsTitle=progressBox([(w-220)/2,-7,220,220*.38],'Progress Realms title');
  if(snapshot.auxiliary.serverRegionVisible){const textSize=progressIntrinsic(profile,keys.regionText);if(textSize[1]!==70)throw new RangeError('Progress Realms region text source height70 required');const total=textSize[0]+16,box=progressBox([(w-total)/2,h-70+30,total,70],'Progress Realms region');const icon=snapshot.auxiliary.serverRegionPingIcon;if(!icon)throw new RangeError('Visible Progress Realms ping requires whole host image');const text:TextLeaf={text:snapshot.auxiliary.serverRegionText,role:'auxiliary',sourceControl:'progress.server_region_connected_text',profile,renderText:snapshot.renderText,color:profile.loadingTextColor,box:progressBox([0,0,...textSize],'Progress region label')};planProgressText(text);region={box,text,icon,iconBox:progressBox([textSize[0]+8,31,8,8],'Progress region icon')};}
 }
 const declaresMobile=route.content==='world_convert_modal_progress_screen_content'||route.content==='realms_loading_world_modal_progress_screen_content',visible=p.mobileDataVisibleAtInstanceCreation??snapshot.auxiliary.mobileDataVisibleAtInstanceCreation;
 if(typeof visible!=='boolean')throw new TypeError('Progress mobile once visible must be boolean');
 if(declaresMobile&&visible&&(snapshot.capabilities.android||snapshot.capabilities.ios)){const size=progressIntrinsic(profile,keys.mobile),textSize=progressIntrinsic(profile,keys.mobileText);if(textSize[1]!==35)throw new RangeError('Progress mobile label source height35 required');const label=profile.labels['progressScreen.label.mobileData'];if(typeof label!=='string')throw new RangeError('Progress mobile label localization required');const text:TextLeaf={text:label,role:'auxiliary',sourceControl:'progress.mobile_data_icon_text',profile,renderText:snapshot.renderText,color:'#fff',box:progressBox([(size[0]-textSize[0])/2,size[1]-35,...textSize],'Progress mobile label')};planProgressText(text);mobile={box:progressBox([w-size[0]-3,10,...size],'Progress mobile panel'),text,android:snapshot.capabilities.android,ios:snapshot.capabilities.ios};}
 return Object.freeze({snapshot,route,branding,needsBranding,realmsTitle,region:region?Object.freeze(region):null,mobile:mobile?Object.freeze(mobile):null});
}
function AuxiliarySession(p:ProgressAuxiliaryProps){const[onceVisible]=useState(p.mobileDataVisibleAtInstanceCreation??p.snapshot.auxiliary.mobileDataVisibleAtInstanceCreation),plan=planProgressAuxiliary({...p,mobileDataVisibleAtInstanceCreation:onceVisible}),s=plan.snapshot.profile.scale,[w,h]=plan.snapshot.profile.availableSize;return <div className="mc-progress-auxiliary" style={{width:w*s,height:h*s}}>{plan.branding&&<div className="mc-progress-branding" data-source-control={'common_art.'+plan.branding.sourceVariant} data-web-provenance={plan.branding.provenance} style={at(plan.branding.box,s)}><Image src={plan.branding.image.src} sourceSize={plan.branding.image.naturalSize} size={[plan.branding.box[2],plan.branding.box[3]]} scale={s} alt=""/></div>}{plan.realmsTitle&&<div style={at(plan.realmsTitle,s)}><Image src={progressAssets['textures/ui/realms_title'].url} sourceSize={[2872,1096]} size={[220,83.6]} scale={s} alt=""/></div>}{plan.region&&<div data-source-control="progress.server_region_connected" style={at(plan.region.box,s)}><ProgressText {...plan.region.text}/><Image src={plan.region.icon.src} sourceSize={plan.region.icon.naturalSize} size={[8,8]} scale={s} alt="" style={at(plan.region.iconBox,s)}/></div>}{plan.mobile&&<div data-source-control="progress.mobile_data_icon" data-source-once="true" style={at(plan.mobile.box,s)}>{plan.mobile.android&&<Image src={progressAssets['textures/ui/mobile_data_icon_android'].url} sourceSize={[32,16]} size={[16,9]} scale={s} alt="" style={{position:'absolute',left:(plan.mobile.box[2]-16)/2*s,top:-2*s}}/>}{plan.mobile.ios&&<Image src={progressAssets['textures/ui/mobile_data_icon_ios'].url} sourceSize={[22,23]} size={[12,13]} scale={s} alt="" style={{position:'absolute',left:(plan.mobile.box[2]-12)/2*s,top:-2*s}}/>}<ProgressText {...plan.mobile.text}/></div>}</div>;}
export function ProgressAuxiliary(p:ProgressAuxiliaryProps){return <AuxiliarySession key={p.snapshot.runKey} {...p}/>;}
