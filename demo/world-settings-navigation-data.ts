import type{WorldSettingsNavigationSnapshot,WorldSettingsNavigationImage,WorldSettingsNavigationId}from'../src/world-settings-navigation-model';

/** Explicit host examples, not values or image defaults supplied by Minecraft. */
export function createWorldNavigationDemoSnapshot(images:{readonly white:WorldSettingsNavigationImage;readonly thumbnail:WorldSettingsNavigationImage;readonly pack:WorldSettingsNavigationImage}):WorldSettingsNavigationSnapshot{
 const labels:Record<WorldSettingsNavigationId,readonly[string,string,number]>={
  server_settings_button:['服务器设置','服务器设置',2],game_button:['游戏','游戏设置',4],classroom_button:['课堂','课堂设置',5],switch_game_button:['游戏','游戏设置',4],multiplayer_button:['多人游戏','多人游戏设置',9],edu_cloud_button:['云存储','云存储',12],debug_button:['调试','调试',15],level_texture_pack_button:['资源包','资源包',20],addon_button:['行为包','行为包',21]};
 const buttons=Object.fromEntries(Object.entries(labels).map(([id,[label,panelTitle,sourceIndex]])=>[id,{label,panelTitle,sourceIndex,enabled:true}]))as WorldSettingsNavigationSnapshot['buttons'];
 return{context:{worldSectionIncluded:true,packsSectionsIncluded:true,spatialPatternFixEnabled:false,pregame:true,educationEdition:false,nxOs:false,publish:true,editorModeEnabled:false,cloudEnabled:false,cloudGeneralToggleEnabled:false,multiplayerClient:false},
  buttons,groups:{server:{label:'服务器',height:18},world:{label:'编辑设置',height:18},addons:{label:'附加内容',height:18}},
  thumbnail:{textureName:'host-original-resource-example',fileSystem:'host-resolved',image:images.thumbnail,alt:'宿主示例：完整原始资源图',webFit:'cover'},
  server:{visible:false,iconName:'',outlineName:'',fileSystem:'host-resolved',icon:null,outline:null,loadingFrame:0},cloud:{outline:null,color:null},
  packs:{level:{path:'host-original-level-icon-example',zip:'',fileSystem:'host-resolved',image:images.pack},addon:{path:'host-original-addon-icon-example',zip:'',fileSystem:'host-resolved',image:images.pack},border:{...images.white,resolution:'host-resolved'}},
  launch:{primary:{label:'创建',enabled:true,labelMaxHeight:20},realms:{label:'在Realms上创建',enabled:true,labelMaxHeight:25,visible:true},play:{label:'游玩',enabled:true,labelMaxHeight:20},host:{label:'主持',enabled:true,labelMaxHeight:20}}};
}
