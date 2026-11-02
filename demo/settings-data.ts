import type{SettingsFieldRow,SettingsOptionLayout,SettingsFieldsTypography}from'../src/settings-fields-model';
import type{SettingsFrameLayout}from'../src/settings-frame-model';
import type{SettingsNavigationItem}from'../src/settings-navigation';
import{settingsNavigationAssets as images}from'../src/settings-navigation-assets';

export const settingsDemoTypography:SettingsFieldsTypography={label:{family:'var(--mc-font, monospace)',size:10,lineHeight:10},description:{family:'var(--mc-font, monospace)',size:9,lineHeight:10},control:{family:'var(--mc-font, monospace)',size:10,lineHeight:10}};
export function settingsDemoLayout(width=520,height=340):SettingsFrameLayout{return{size:[width,height],scale:1,dialogRect:[0,2,width,height-4],backgroundHeight:height,variant:'navigation',inputMode:'mouse',mouseRailAllocation:'reserve',selectorScrollbarVisible:true,contentScrollbarVisible:true,contentHeaderHeight:0,contentFooterHeight:0};}
export function settingsDemoNavigation():SettingsNavigationItem[]{
 const glyph=(outline:{url:string;width:number;height:number},color:{url:string;width:number;height:number})=>({outline:{src:outline.url,sourceSize:[outline.width,outline.height]as const,visible:true},color:{src:color.url,sourceSize:[color.width,color.height]as const,visible:true},size:[outline.width,outline.height]as const});
 return[{kind:'group',id:'world-group',sourceControl:'world_section.selector_pane_content/selector_group_label_1',ignored:false,visible:true,enabled:true,label:'编辑设置',height:16},
  {kind:'section',id:'game',sourceControl:'world_section.selector_pane_content/game_button',ignored:false,visible:true,enabled:true,label:'游戏',viewBinding:'game_button_toggle',sourceIndex:4,panelTitle:'游戏设置',glyph:glyph(images.controller,images.controllerColor)},
  {kind:'section',id:'multiplayer',sourceControl:'world_section.selector_pane_content/multiplayer_button',ignored:false,visible:true,enabled:true,label:'多人游戏',viewBinding:'multiplayer_button_toggle',sourceIndex:9,panelTitle:'多人游戏设置',glyph:glyph(images.multiplayer,images.multiplayerColor)}];
}
/** Explicit host fixture data, not engine defaults or the complete69-control page.
 * Every text/font/intrinsic/range/visibility value is deliberately supplied. */
export function settingsDemoRows(values:Readonly<Record<string,string|number|boolean|null>>={},page:'game'|'multiplayer'='game',width=292):SettingsFieldRow[]{
 const base=(id:string,height:number)=>({id,sourceControl:`world_section.${page}_section/${id}`,ignored:false,visible:true,enabled:true,height});
 const option=(label:string):SettingsOptionLayout=>({mode:'two-line',label,showLabel:true,labelHeight:10,description:null,descriptionHeight:0,labelAlignment:'left',controlY:14});
 const choice=(id:string,label:string,checked=false)=>({id,sourceControl:`world_section.${id}`,binding:`#${id}`,label,checked,ignored:false,visible:true,enabled:true});
 const popup={scrolling:true,height:80,placement:'above' as const,label:'可选值',inputMode:'mouse' as const,highlightOffset:[0,0]as const,highlightExtraSize:[0,0]as const};
 const toggle=(id:string,label:string,binding:string):SettingsFieldRow=>({...base(id,38),kind:'toggle',binding,checked:values[binding]===true,toggleName:id,bindingCondition:'visible',option:{...option(label),mode:'one-line',controlY:3}});
 if(page==='multiplayer')return[toggle('multiplayer_game_toggle','多人游戏','#multiplayer_game'),toggle('server_visible_toggle','局域网玩家可见','#server_visible'),{...base('general_multiplayer_warning_label',30),kind:'info',text:'连接与账号状态由宿主提供。',textHeight:24,textBinding:'#general_multiplayer_warning_text'}];
 return[
  {...base('world_title',22),kind:'label',profile:'group',text:'世界设置',textHeight:14},
  {...base('option_text_edit_0',48),kind:'text',option:option('世界名称'),binding:'#world_name',value:String(values['#world_name']??'我的世界'),placeholder:'名称',textBoxName:'world_name_text_box',maxLength:32,sourceTextType:'ExtendedASCII',allowDataBinding:true},
  {...base('option_dropdown_0',48),kind:'dropdown',option:option('默认游戏模式'),dropdownName:'world_game_mode_dropdown',faceLabel:String(values.modeLabel??'生存'),faceLabelBinding:'#world_game_mode_dropdown_toggle_label',choices:[choice('world_game_mode_survival','生存',values['#world_game_mode_creative']!==true),choice('world_game_mode_creative','创造',values['#world_game_mode_creative']===true),choice('world_game_mode_adventure','冒险')],popup},
  toggle('is_hardcore_toggle','极限模式','#is_hardcore'),
  {...base('level_seed_selector',48),kind:'text-action',option:option('种子'),binding:'#world_seed',value:String(values['#world_seed']??'12345'),placeholder:'种子',textBoxName:'world_seed_text_box',maxLength:32,sourceTextType:'ExtendedASCII',allowDataBinding:true,textFraction:.85,action:{presentation:'arrow',label:'选择种子',target:'seed_picker',enabled:true,labelMaxHeight:10}},
  {...base('server_sim_distance_slider',50),kind:'slider',option:option('模拟距离'),binding:'#server_sim_distance',sliderName:'server_sim_distance',sourceValue:6,sourceSteps:5,stepsBinding:'#server_sim_distance_steps',textValue:String(values['#server_sim_distance']??6),textValueBinding:'#server_sim_distance_text_value',web:{value:Number(values['#server_sim_distance']??6),min:2,max:12,step:2,markers:[]}},
  {...base('player_waypoints_selector',80),kind:'radio',option:option('定位器栏'),profile:'waypoints',choices:[choice('player_waypoints_show_all','所有玩家',values['#player_waypoints_show_none']!==true),choice('player_waypoints_show_none','关闭',values['#player_waypoints_show_none']===true)],visuals:[{height:17,y:0,labelHeight:10},{height:17,y:0,labelHeight:10}],descriptions:[{text:'显示玩家位置。',height:20},{text:'隐藏玩家位置。',height:20}],labelShadow:{offset:[1,1],color:'#000'}},
  {...base('option_dropdown_permissions',48),kind:'permissions',option:option('默认玩家权限'),binding:'#player_permissions_dropdown',value:'member',faceLabel:'成员',faceIcon:null,labels:{label:'权限级别',visitor:'访客',member:'成员',operator:'操作员',custom:'自定义',visitorDescription:'探索世界。',memberDescription:'建造和交互。',operatorDescription:'管理世界。'},choiceBindings:{visitor:'#permission_visitor',member:'#permission_member',operator:'#permission_operator'},popup:{...popup,height:128,label:'权限级别'},choiceHeights:{visitor:40,member:40,operator:40},descriptionHeights:{visitor:18,member:18,operator:18}},
  {...base('experiment_heading',22),kind:'label',profile:'header',text:'实验',textHeight:14},
  {...base('experimental_toggle_factory',38),kind:'experiments',collectionName:'experimental_toggles',count:1,countBinding:'#experimental_toggle_count',rows:[{...base('experiment-0',38),kind:'toggle',option:{...option('宿主实验开关'),mode:'one-line',controlY:3},binding:'#host_experiment_0',checked:values['#host_experiment_0']===true,toggleName:'experiment-0',bindingCondition:'visible',collection:{name:'experimental_toggles',index:0,id:'host-experiment'}}]},
  {...base('section_line',12),kind:'divider',inset:4},
  {...base('management_row',30),kind:'stack',orientation:'horizontal',rows:[
    {...base('export_world',30),kind:'action',width:width/2,label:'导出',target:'export_world_button',tone:'light',labelMaxHeight:10},
    {...base('management_gap',0),kind:'spacer',width:1},
    {...base('delete_world',30),kind:'action',width:width/2-1,label:'删除',target:'delete_world_button',tone:'light',labelMaxHeight:10}]},
  {...base('copy_world',30),kind:'action',label:'复制世界',target:'copy_world_button',tone:'light',labelMaxHeight:10},
  {...base('bottom_gap',8),kind:'spacer'}
 ];
}
