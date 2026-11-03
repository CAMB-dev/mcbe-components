import type{Ref}from'react';
import{SettingsFrame}from'../src/settings-frame';import{layoutSettingsFrame}from'../src/settings-frame-model';import type{SettingsFrameLayout,SettingsFrameController}from'../src/settings-frame-model';
import{WorldSettingsNavigation}from'../src/world-settings-navigation';import type{WorldSettingsNavigationId,WorldSettingsNavigationSnapshot,WorldSettingsNavigationMaterialRendering}from'../src/world-settings-navigation-model';
import{WorldGameSettings,WorldMultiplayerSettings}from'../src/world-settings-fields';import type{WorldGameSettingsSnapshot,WorldMultiplayerSettingsSnapshot}from'../src/world-settings-fields-model';
import type{SettingsFieldsRequest,SettingsFieldsProps}from'../src/settings-fields-model';import type{WorldSettingsMode}from'../src/world-settings-actions';
import{ResourcePackManager}from'../src/resource-packs';import{createResourcePackDemoProps}from'./resource-pack-data';
import{resourcePackAssets}from'../src/resource-pack-assets';import{settingsDemoTypography}from'./settings-data';
import{worldSettingsDemoChoiceGroups,worldSettingsDemoSliders}from'./world-settings-model-data';

/** Demo-only acceptance policy; the library never changes another source flag. */
export function acceptWorldDemoRequest<T extends WorldGameSettingsSnapshot|WorldMultiplayerSettingsSnapshot>(family:'game'|'multiplayer',snapshot:T,request:SettingsFieldsRequest):T{
 if(request.proposedValue===undefined)return snapshot;
 const bindings={...snapshot.bindings}as Record<string,string|number|boolean>,next=request.proposedValue;
 if(Object.hasOwn(bindings,request.target)&&typeof bindings[request.target]===typeof next)bindings[request.target]=next as string|number|boolean;
 for(const group of worldSettingsDemoChoiceGroups[family]){
  const selected=group.choices.find(choice=>choice.binding===request.target);if(!selected)continue;
  for(const choice of group.choices)bindings[choice.binding]=choice===selected;
  if(group.faceBinding)bindings[group.faceBinding]=selected.label;
 }
 let metrics=snapshot.metrics;
 for(const slider of worldSettingsDemoSliders)if(slider.binding===request.target&&typeof next==='number'){
  const m=(metrics as WorldGameSettingsSnapshot['metrics'])[slider.key];metrics={...metrics,[slider.key]:{...m,web:{...m.web,value:next}}};bindings[slider.textBinding]=String(next);
 }
 if('experiments'in snapshot&&request.identity.collection?.name==='experimental_toggles')return{...snapshot,bindings,metrics,experiments:snapshot.experiments.map(row=>row.id===request.identity.collection!.id&&typeof next==='boolean'?{...row,'#experimental_toggle_value':next}:row)}as T;
 return{...snapshot,bindings,metrics}as T;
}

export interface WorldSettingsPreviewProps{
 readonly width:number;readonly height:number;readonly scale:number;readonly mode:WorldSettingsMode;readonly inputMode:'mouse'|'touch';readonly rail:boolean;
 readonly page:WorldSettingsNavigationId|null;readonly game:WorldGameSettingsSnapshot;readonly multiplayer:WorldMultiplayerSettingsSnapshot;readonly navigation:WorldSettingsNavigationSnapshot;
 readonly disabled?:boolean;readonly inert?:boolean;readonly hidden?:boolean;readonly modal?:boolean;readonly mounted?:boolean;
 readonly materialRendering?:WorldSettingsNavigationMaterialRendering;
 readonly popupHost:HTMLDivElement|null;readonly popupHostRef:Ref<HTMLDivElement>;readonly controllerRef?:Ref<SettingsFrameController>;
 readonly rootRef?:Ref<HTMLDivElement>;readonly gameRef?:Ref<HTMLDivElement>;readonly multiplayerRef?:Ref<HTMLDivElement>;
 readonly fieldInputProps?:SettingsFieldsProps['inputProps'];readonly fieldButtonProps?:SettingsFieldsProps['buttonProps'];readonly fieldInputRefs?:SettingsFieldsProps['inputRefs'];readonly fieldButtonRefs?:SettingsFieldsProps['buttonRefs'];
 readonly navItemRefs?:Parameters<typeof WorldSettingsNavigation>[0]['itemRefs'];readonly contentViewportRef?:Ref<HTMLDivElement>;
 readonly onNavigate:(id:WorldSettingsNavigationId)=>void;readonly onField:(family:'game'|'multiplayer',request:SettingsFieldsRequest)=>void;readonly onIntent:(target:string)=>void;
 readonly backButtonProps?:Parameters<typeof SettingsFrame>[0]['backButtonProps'];
}
export function WorldSettingsPreview(p:WorldSettingsPreviewProps){
 const layout:SettingsFrameLayout={size:[p.width,p.height],scale:p.scale,dialogRect:[0,2,p.width,p.height-4],backgroundHeight:p.height,variant:'navigation',inputMode:p.inputMode,mouseRailAllocation:'reserve',selectorScrollbarVisible:p.rail,contentScrollbarVisible:p.rail,contentHeaderHeight:0,contentFooterHeight:0};
 const geometry=layoutSettingsFrame(layout),width=geometry.content.contentWidth,font=settingsDemoTypography.control;
 const fields={width,scale:p.scale,inputMode:p.inputMode,typography:settingsDemoTypography,hiddenSlots:'collapse' as const,disabled:p.disabled,inert:p.inert,popupHost:p.popupHost,inputProps:p.fieldInputProps,buttonProps:p.fieldButtonProps,inputRefs:p.fieldInputRefs,buttonRefs:p.fieldButtonRefs,
  // Explicit example palette only; native glyph rasterization is not certified.
  textFormatting:{colors:{'7':[170/255,170/255,170/255]as const},resetCode:'r'}};
 let content;
 if(p.page==='game_button'||p.page==='switch_game_button')content=<WorldGameSettings {...fields} snapshot={p.game} ref={p.gameRef} onRequest={request=>p.onField('game',request)}/>;
 else if(p.page==='multiplayer_button')content=<WorldMultiplayerSettings {...fields} snapshot={p.multiplayer} ref={p.multiplayerRef} onRequest={request=>p.onField('multiplayer',request)}/>;
 else if(p.page==='level_texture_pack_button'||p.page==='addon_button'){
  const profile=p.page==='addon_button'?'addon':'level',pack=createResourcePackDemoProps(profile);content=<ResourcePackManager {...pack} width={width} scale={p.scale} provider={{educationEdition:p.navigation.context.educationEdition,isWorldCreate:p.mode==='create',isTemplateCreate:p.mode==='template-create',isWorldEdit:p.mode==='edit'}} disabled={p.disabled} onAction={request=>p.onIntent(request.target)}/>;
 }else content=<div data-world-settings-unmounted-provider={p.page??'none'}>此专用 provider 尚未挂载；不以通用字段替代。</div>;
 return<SettingsFrame ref={p.rootRef} label="世界设置原版控件示例" layout={layout} background={{src:resourcePackAssets['textures/ui/White'].url,sourceSize:[2,2],resolution:'host-resolved'}} font={font} titleFont={font} titleShadow={false} titleVerticalAlignment="center" dialogTitleAlignment="left" dialogTitle={p.mode==='edit'?'编辑世界':'创建世界'} sectionTitle={p.page?p.navigation.buttons[p.page].panelTitle:''}
  back={{visible:true,enabled:true,label:'返回',box:[4,1,16,16],paintBox:[0,0,16,16],glyphOffset:[6,4]}} backButtonProps={p.backButtonProps} controllerRef={p.controllerRef} contentViewportRef={p.contentViewportRef} popupHostRef={p.popupHostRef}
  selectorScrollLabel="世界设置导航" contentScrollLabel="世界设置内容" disabled={p.disabled} inert={p.inert} hidden={p.hidden} modal={p.modal} onRequest={request=>p.onIntent(request.target)}
  selectorContent={<WorldSettingsNavigation label="世界设置分区" width={geometry.selector!.contentWidth} scale={p.scale} font={font} mode={p.mode} snapshot={p.navigation} value={p.page} hiddenSlots="collapse" sourceDefaultIndex={0} toggleOnHover={false} hoverPolicy="activation-only" itemRefs={p.navItemRefs} disabled={p.disabled} inert={p.inert} materialRendering={p.materialRendering} onValueChange={p.onNavigate} onLaunchAction={request=>p.onIntent(request.target)}/>}
  content={content}/>;
}
