import type {SettingsFieldRow,SettingsOptionLayout,SettingsFieldsTypography,SettingsFieldsProps} from '../src/settings-fields-model';
import type {SettingsFrameLayout,SettingsFrameProps} from '../src/settings-frame-model';
import type {SettingsNavigationProps} from '../src/settings-navigation';

/** Plain, explicit qualification snapshots; not a native69/8 world-settings database.
 * Relative original-image URLs are resolved by the installed consumer worker, never imported here. */
export function createSettingsPackageData():{
 frame:Omit<SettingsFrameProps,'selectorContent'|'content'>;
 navigation:SettingsNavigationProps;fields:SettingsFieldsProps;
}{
 const font={family:'var(--mc-font, monospace)',size:10,lineHeight:10};
 const typography:SettingsFieldsTypography={label:{...font},description:{...font,size:9},control:{...font}};
 const layout:SettingsFrameLayout={size:[520,340],scale:1,dialogRect:[0,2,520,336],backgroundHeight:340,variant:'navigation',inputMode:'mouse',mouseRailAllocation:'reserve',selectorScrollbarVisible:true,contentScrollbarVisible:true,contentHeaderHeight:0,contentFooterHeight:0};
 const base={ignored:false,visible:true,enabled:true};
 const glyph=(name:string,size:readonly[number,number])=>({outline:{src:'./assets/gui-icons/'+name+'-glyph.png',sourceSize:size,visible:true},color:{src:'./assets/gui-icons/'+name+'-glyph-color.png',sourceSize:size,visible:true},size});
 const rows:SettingsFieldRow[]=[...packageRows(),
 {id:'package-info',sourceControl:'settings_common.option_info_label',...base,height:30,kind:'info',text:'Host-provided information',textHeight:20,textBinding:'#host_info'},
 {id:'package-stack',sourceControl:'settings_common.source_stack',...base,height:8,kind:'stack',orientation:'vertical',rows:[{id:'nested-space',sourceControl:'common.empty_panel',...base,height:8,kind:'spacer'}]}];
 return {
 frame:{label:'World settings source framework',layout,background:{src:'./assets/play-screen/white_background.png',sourceSize:[2,2],resolution:'host-resolved'},font,titleFont:{...font},titleShadow:true,titleVerticalAlignment:'center',dialogTitleAlignment:'left',dialogTitle:'World settings',sectionTitle:'Game',back:{visible:true,enabled:true,label:'Back',box:[0,0,18,23],paintBox:[0,0,18,23],glyphOffset:[7,8]},selectorScrollLabel:'Settings sections',contentScrollLabel:'Settings fields'},
 navigation:{label:'Settings sections',width:205,scale:1,font,items:[
 {kind:'group',id:'world-group',sourceControl:'world_section.selector_group_label_1',...base,label:'World settings',height:16},
 {kind:'section',id:'game',sourceControl:'world_section.game_button',...base,label:'Game',viewBinding:'game_button_toggle',sourceIndex:4,panelTitle:'Game',glyph:glyph('controller',[21,14])},
 {kind:'section',id:'multiplayer',sourceControl:'world_section.multiplayer_button',...base,label:'Multiplayer',viewBinding:'multiplayer_button_toggle',sourceIndex:9,panelTitle:'Multiplayer',glyph:glyph('multiplayer',[22,12])},
 {kind:'spacer',id:'navigation-space',sourceControl:'common.empty_panel',...base,size:['100%',4]}],value:'game',sourceDefaultIndex:99,toggleOnHover:false,hoverPolicy:'activation-only',hiddenSlots:'reserve'},
 fields:{width:300,scale:1,typography,rows,hiddenSlots:'reserve'}
 };
}

function packageRows(values:Readonly<Record<string,string|number|boolean|null>>={},page:'game'|'multiplayer'='game'):SettingsFieldRow[]{
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
  {...base('copy_world',30),kind:'action',label:'复制世界',target:'copy_world_button',tone:'light',labelMaxHeight:10},
  {...base('bottom_gap',8),kind:'spacer'}
 ];
}
