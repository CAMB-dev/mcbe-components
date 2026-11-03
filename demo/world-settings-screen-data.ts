import type{WorldSettingsScreenProps,WorldSettingsScreenRequest,WorldSettingsScreenSnapshot}from'../src/world-settings-screen';
import type{WorldSettingsNavigationImage,WorldSettingsNavigationId}from'../src/world-settings-navigation-model';
import type{WorldSettingsMode}from'../src/world-settings-actions';import{createWorldSettingsDemoData}from'./world-settings-model-data';import{createWorldNavigationDemoSnapshot}from'./world-settings-navigation-data';import{createWorldSettingsExtraDemoData,worldDebugDemoChoiceGroups}from'./world-settings-extra-data';import{createResourcePackDemoProps}from'./resource-pack-data';import{acceptWorldDemoRequest}from'./world-settings-accept';
export interface WorldSettingsScreenDemoImages{readonly white:WorldSettingsNavigationImage;readonly thumbnail:WorldSettingsNavigationImage;readonly pack:WorldSettingsNavigationImage;readonly cloudHelp:WorldSettingsNavigationImage}
export function selectWorldDemoPage(snapshot:WorldSettingsScreenSnapshot,id:WorldSettingsNavigationId):WorldSettingsScreenSnapshot{
 const views={...snapshot.views};for(const key of Object.keys(views))views[key as keyof typeof views]=false;
 const mapping:Partial<Record<WorldSettingsNavigationId,keyof typeof views>>={game_button:'game_button_toggle',switch_game_button:'game_button_toggle',multiplayer_button:'multiplayer_button_toggle',server_settings_button:'server_settings_button_toggle',edu_cloud_button:'cloud_button_toggle',debug_button:'world_debug_button_toggle',level_texture_pack_button:'level_texture_pack_button_toggle',addon_button:'addon_button_toggle'};
 if(mapping[id])views[mapping[id]!]=true;return{...snapshot,views,pages:{...snapshot.pages,classroom:snapshot.pages.classroom?{...snapshot.pages.classroom,visible:id==='classroom_button'}:null}};
}
/** Local host acceptance; the library never derives view flags from selection. */
export function acceptWorldScreenDemo(snapshot:WorldSettingsScreenSnapshot,request:WorldSettingsScreenRequest):WorldSettingsScreenSnapshot{
 if(request.kind==='navigation')return selectWorldDemoPage(snapshot,request.value);
 if(request.kind==='server-value'&&snapshot.pages.server)return{...snapshot,pages:{...snapshot.pages,server:{...snapshot.pages.server,value:request.detail.value}}};
 if(request.kind==='field'){
  const{section,detail}=request,current=snapshot.pages[section];if(!current)return snapshot;
  if(section==='game'&&snapshot.pages.game)return{...snapshot,pages:{...snapshot.pages,game:acceptWorldDemoRequest('game',snapshot.pages.game,detail)}};
  if(section==='multiplayer'&&snapshot.pages.multiplayer)return{...snapshot,pages:{...snapshot.pages,multiplayer:acceptWorldDemoRequest('multiplayer',snapshot.pages.multiplayer,detail)}};
  if(detail.proposedValue===undefined||detail.proposedValue===null)return snapshot;const bindings={...current.bindings}as Record<string,string|number|boolean>;
  if(Object.hasOwn(bindings,detail.target)&&typeof bindings[detail.target]===typeof detail.proposedValue)bindings[detail.target]=detail.proposedValue;
  if(section==='debug')for(const group of worldDebugDemoChoiceGroups){const selected=group.choices.find(c=>c.binding===detail.target);if(selected){for(const c of group.choices)bindings[c.binding]=c===selected;bindings[group.faceBinding]=selected.label;}}
  return{...snapshot,pages:{...snapshot.pages,[section]:{...current,bindings}}}as WorldSettingsScreenSnapshot;
 }
 return snapshot;
}
export function createWorldSettingsScreenDemoData(images:WorldSettingsScreenDemoImages,mode:WorldSettingsMode='create'):WorldSettingsScreenProps{
 const fields=createWorldSettingsDemoData(mode),nav=createWorldNavigationDemoSnapshot(images),extra=createWorldSettingsExtraDemoData(images.cloudHelp);
 const pack=(profile:'level'|'addon')=>{const p=createResourcePackDemoProps(profile);return{bindings:p.bindings,labels:p.labels,collections:p.collections,defaultItem:p.defaultItem,layout:p.layout};};
 const{worldSectionIncluded:_world,packsSectionsIncluded:_packs,...context}=nav.context;void _world;void _packs;
 const snapshot:WorldSettingsScreenSnapshot={context:{...context,mayIncludeWorldSection:true,debugSettings:false},navigation:{buttons:nav.buttons,groups:nav.groups,thumbnail:nav.thumbnail,server:{...nav.server,visible:true},cloud:nav.cloud,packs:nav.packs,launch:{...nav.launch,primary:{...nav.launch.primary,label:mode==='edit'?'游玩':'创建'}}},views:{game_button_toggle:true,server_settings_button_toggle:false,multiplayer_button_toggle:false,cloud_button_toggle:false,world_debug_button_toggle:false,level_texture_pack_button_toggle:false,addon_button_toggle:false},pages:{game:fields.game,multiplayer:fields.multiplayer,cloud:extra.cloud,debug:extra.debug,classroom:null,level:pack('level'),addon:pack('addon'),server:{'#custom_form_length':9,'#submit_text':'提交服务器设置','#submit_button_visible':true,metrics:{generatedHeight:430,submitLabelMaxHeight:20},fields:[
   {id:'heading',type:'header',text:'服务器设置'},{id:'description',type:'label',text:'由宿主提供 custom_form 集合。'},{id:'enabled',type:'toggle',label:'启用示例选项'},{id:'distance',type:'slider',label:'范围',min:0,max:10,step:1,textValue:'4'},
   {id:'difficulty',type:'step_slider',label:'难度',options:[{value:'easy',label:'简单'},{value:'normal',label:'普通'}]},{id:'mode',type:'dropdown',label:'模式',options:[{value:'survival',label:'生存'},{value:'creative',label:'创造'}]},{id:'name',type:'input',label:'名称',placeholder:'服务器值'},
   {id:'divider',type:'divider'},{id:'features',type:'multiselect',label:'功能',options:[{value:'chat',label:'聊天'},{value:'map',label:'地图'}]}],value:{enabled:true,distance:4,difficulty:'normal',mode:'survival',name:'原始服务器值',features:['chat']}}}};
 const font={family:'var(--mc-font, monospace)',size:10,lineHeight:10},typography={label:font,description:{...font,size:9},control:font};
 return{mode,snapshot,value:'game_button',label:'世界设置',layout:{size:[520,340],scale:1,dialogRect:[0,2,520,336],backgroundHeight:340,variant:'navigation',inputMode:'mouse',mouseRailAllocation:'reserve',selectorScrollbarVisible:true,contentScrollbarVisible:true},background:{...images.white,resolution:'host-resolved'},font,titleFont:font,titleShadow:false,titleVerticalAlignment:'center',dialogTitleAlignment:'left',dialogTitle:mode==='edit'?'编辑世界':'创建世界',sectionTitle:'游戏设置',back:{visible:true,enabled:true,label:'返回',box:[4,1,16,16],paintBox:[0,0,16,16],glyphOffset:[6,4]},hiddenSlots:'collapse',contentLayout:'max-allocated-groups',typography,textFormatting:{colors:{'7':[170/255,170/255,170/255]},resetCode:'r'},navigation:{label:'世界设置分区',sourceDefaultIndex:0,toggleOnHover:false,hoverPolicy:'activation-only',materialRendering:{profile:'source-image',extentPolicy:'ceil',background:{kind:'solid',color:[49/255,50/255,51/255,1]}}},selectorScrollLabel:'世界设置导航',contentScrollLabel:'世界设置内容'};
}
