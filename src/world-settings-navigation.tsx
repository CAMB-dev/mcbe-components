import{forwardRef}from'react';import type{CSSProperties}from'react';
import{SourceSettingsNavigation,planSourceSettingsNavigation}from'./settings-navigation';
import type{SourceSettingsNavigationNode,SourceSettingsNavigationSection}from'./settings-navigation-source-model';
import{ClassicSkin}from'./classic-skin';import{Image}from'./image';import{WorldLaunchActions}from'./world-settings-actions';
import{worldNavigationAssets as assets}from'./world-navigation-assets';
import{snapshotWorldNavigation,worldNavigationIds,worldNavigationViewBindings}from'./world-settings-navigation-data';
import{useClassicNodeRef}from'./classic-screen-lifecycle';import{WorldNavigationMaterialPlane,validateWorldNavigationMaterial}from'./world-settings-navigation-material';
import type{WorldSettingsNavigationProps,WorldSettingsNavigationId,WorldSettingsNavigationImage}from'./world-settings-navigation-model';
export type{WorldSettingsNavigationProps,WorldSettingsNavigationSnapshot,WorldSettingsNavigationContext,WorldSettingsNavigationButtonState,WorldSettingsNavigationImage,WorldSettingsNavigationId,WorldSettingsNavigationMaterialRendering}from'./world-settings-navigation-model';

const rootPath='world_section.selector_pane_content';
const file=(name:keyof typeof assets,visible=true)=>{const a=assets[name];return{src:a.url,sourceSize:[a.width,a.height]as const,visible};};
const image=(a:WorldSettingsNavigationImage|null,size:readonly[number,number],scale:number,className:string)=>a&&<Image src={a.src} sourceSize={a.sourceSize} size={size} scale={scale} alt="" className={className}/>;
/** Exact World/Add-ons selector subtrees and their source spacers. Other settings,
 * Realms and platform selector subtrees are not synthesized here. */
export const WorldSettingsNavigation=forwardRef<HTMLDivElement,WorldSettingsNavigationProps>(function WorldSettingsNavigation({snapshot:input,mode,value,onValueChange,onLaunchAction,launchButtonProps,launchButtonRefs,nodeRefs,className,materialRendering,...props},ref){
 const p=snapshotWorldNavigation(input),c=p.context,s=props.scale,width=props.width;
 validateWorldNavigationMaterial(materialRendering);
 if(!['create','template-create','edit'].includes(mode))throw new TypeError('World navigation requires a source create/template-create/edit mode.');
 if(value!==null&&!worldNavigationIds.includes(value))throw new TypeError('World navigation selected value must be a named source button or null.');
 if(typeof width!=='number'||!Number.isFinite(width)||width<=38||!Number.isSafeInteger(s)||s<1||s>32||width*s>8192)throw new RangeError('World navigation requires a finite width>38 and integer scale1..32 within8192 physical pixels.');
 const[,attach]=useClassicNodeRef(ref);
 const base=(id:string,sourceControl:string,ignored=false,visible=true,enabled=true)=>({id,sourceControl,ignored,visible,enabled});
 const spacer=(id:string,sourceControl:string,height:number,ignored=false):SourceSettingsNavigationNode=>({...base(id,sourceControl,ignored),kind:'spacer',size:['100%',height]});
 const stack=(id:string,sourceControl:string,children:readonly SourceSettingsNavigationNode[],ignored=false,visible=true):SourceSettingsNavigationNode=>({...base(id,sourceControl,ignored,visible),kind:'source-stack',children});
 const group=(id:string,sourceControl:string,key:'server'|'world'|'addons',ignored=false):SourceSettingsNavigationNode=>({...base(id,sourceControl,ignored),kind:'group',label:p.groups[key].label,height:p.groups[key].height});
 const sourcePath=(id:WorldSettingsNavigationId)=>id==='server_settings_button'?`${rootPath}/server_settings_visibility_panel/${id}`:id==='level_texture_pack_button'||id==='addon_button'?`world_section.addons_selector_panel/${id}`:`${rootPath}/${id}`;
 const section=(id:WorldSettingsNavigationId,ignored=false,visible=true):SourceSettingsNavigationSection=>{
  const button=p.buttons[id];return{...base(id,sourcePath(id),ignored,visible,button.enabled),kind:'section',label:button.label,panelTitle:button.panelTitle,sourceIndex:button.sourceIndex,viewBinding:worldNavigationViewBindings[id],glyph:{outline:null,color:null,size:[21,14]}};
 };
 const staticGlyph=(id:WorldSettingsNavigationId,outline:keyof typeof assets,color:keyof typeof assets,size:readonly[number,number],ignored=false,visible=true):SourceSettingsNavigationSection=>({...section(id,ignored,visible),glyph:{outline:file(outline),color:file(color),size}});
 const server=section('server_settings_button',c.pregame),wave=assets['textures/ui/loading_bar'];
 const loading=p.server.iconName==='loading',serverIconVisible=!!p.server.iconName&&!loading,serverOutlineVisible=!!p.server.outlineName&&p.server.outlineName!=='loading';
 const serverNode:SourceSettingsNavigationSection={...server,glyphContent:<span className="mc-world-navigation__server-glyph">
  {serverOutlineVisible&&image(p.server.outline,[21,14],s,'mc-world-navigation__server-outline')}
  {serverIconVisible&&image(p.server.icon,[21,14],s,'mc-world-navigation__server-color')}
  {loading&&<span className="mc-world-navigation__loading" data-source-control="progress.progress_loading_bars" data-source-uv-frame={p.server.loadingFrame} style={{width:21*s,height:14*s}}><Image src={wave.url} sourceSize={[640,8]} size={[210,14]} scale={s} alt="" style={{position:'absolute',left:-p.server.loadingFrame*21*s,top:0}}/></span>}
 </span>};
 const cloudIgnored=!c.educationEdition||!c.cloudEnabled||!c.cloudGeneralToggleEnabled||c.multiplayerClient;
 const cloud:SourceSettingsNavigationSection={...section('edu_cloud_button',cloudIgnored),glyph:{outline:p.cloud.outline?{...p.cloud.outline,visible:true}:null,color:p.cloud.color?{...p.cloud.color,visible:true}:null,size:[20,14]}};
 const pack=(id:'level_texture_pack_button'|'addon_button',key:'level'|'addon'):SourceSettingsNavigationSection=>({...section(id),sourceLabelMaxInset:[34,0],glyph:{outline:null,color:null,size:[17,17]},glyphContent:<>
  {p.packs.border&&image(p.packs.border,[17,17],s,'mc-world-navigation__pack-border')}
  {p.packs[key].image&&<span className="mc-world-navigation__cycling" data-source-control="resource_packs.resource_packs_section_toggle_control/cycling_icon" data-source-collection={key} style={{left:s,top:s}}>{image(p.packs[key].image,[15,15],s,'mc-world-navigation__pack-icon')}</span>}
 </>});
 const thumbnailWidth=width-2,thumbnailHeight=thumbnailWidth*.5625+2.25;
 const thumbnail:SourceSettingsNavigationNode={...base('world_snapshot_image',`${rootPath}/world_snapshot_image`,!c.pregame),kind:'source-slot',height:thumbnailHeight+2,content:<div className="mc-world-navigation__thumbnail" style={{width:thumbnailWidth*s,height:thumbnailHeight*s,left:s,top:s}}>
  {p.thumbnail.image&&<Image src={p.thumbnail.image.src} sourceSize={p.thumbnail.image.sourceSize} size={[thumbnailWidth,thumbnailHeight]} scale={s} alt={p.thumbnail.alt} style={{objectFit:p.thumbnail.webFit,imageRendering:'auto'}}/>}
  <span className="mc-world-navigation__thumbnail-border" aria-hidden="true" style={{left:-s,top:-s,width:(thumbnailWidth+2)*s,height:(thumbnailHeight+2)*s}}><ClassicSkin asset={assets['textures/ui/BannersTransparent']} width={thumbnailWidth+2} height={thumbnailHeight+2} scale={s} baseClass="mc-world-navigation-skin"/></span>
 </div>};
 const launch=(education:boolean):SourceSettingsNavigationNode=>{
  const ignored=!c.pregame||c.educationEdition!==education,id=education?'play_or_host_panel':'play_or_create_panel';
  return{...base(id,`${rootPath}/${id}`,ignored),kind:'source-slot',height:35,content:<WorldLaunchActions width={width} scale={s} font={props.font} hiddenSlots={props.hiddenSlots} disabled={props.disabled||!c.worldSectionIncluded} inert={props.inert} model={education?{edition:'education',mode,pregame:c.pregame,play:p.launch.play,host:p.launch.host}:{edition:'bedrock',mode,pregame:c.pregame,editor:c.editorModeEnabled,primary:p.launch.primary,realms:p.launch.realms}} onAction={onLaunchAction} buttonProps={launchButtonProps} buttonRefs={launchButtonRefs}/>};
 };
 const world:SourceSettingsNavigationNode[]=[thumbnail,launch(false),launch(true),spacer('world-spacer',`${rootPath}/spacer`,8),
  stack('server_settings_visibility_panel',`${rootPath}/server_settings_visibility_panel`,[group('server-group',`${rootPath}/server_settings_visibility_panel/selector_group_label_0`,'server',c.pregame),serverNode,spacer('server-spacer',`${rootPath}/server_settings_visibility_panel/server_spacer`,2)],false,p.server.visible),
  group('world-group',`${rootPath}/selector_group_label_1`,'world'),staticGlyph('game_button','textures/ui/controller_glyph','textures/ui/controller_glyph_color',[21,14],c.nxOs),
  spacer('world-spacer-01',`${rootPath}/spacer_01`,25,c.nxOs||!c.educationEdition||!c.spatialPatternFixEnabled),
  staticGlyph('classroom_button','textures/ui/bookshelf_flat_border','textures/ui/bookshelf_flat',[21,14],c.nxOs||!c.educationEdition),
  spacer('world-spacer-02',`${rootPath}/spacer_02`,25,!c.nxOs||!c.spatialPatternFixEnabled),staticGlyph('switch_game_button','textures/ui/controller_glyph_switch','textures/ui/controller_glyph_color_switch',[21,14],!c.nxOs),
  spacer('world-spacer-03',`${rootPath}/spacer_03`,25,c.educationEdition||!c.spatialPatternFixEnabled),staticGlyph('multiplayer_button','textures/ui/multiplayer_glyph','textures/ui/multiplayer_glyph_color',[22,12],false,!c.educationEdition),
  spacer('world-spacer-04',`${rootPath}/spacer_04`,25,cloudIgnored||!c.spatialPatternFixEnabled),cloud,spacer('world-spacer-05',`${rootPath}/spacer_05`,25,c.publish||!c.spatialPatternFixEnabled),staticGlyph('debug_button','textures/ui/debug_glyph','textures/ui/debug_glyph_color',[15,15],c.publish)];
 const nodes:SourceSettingsNavigationNode[]=[spacer('outer-spacer-0','settings.selector_stack_panel/spacer_0',2,!c.worldSectionIncluded),spacer('outer-spacer-01','settings.selector_stack_panel/spacer_01',25,!c.worldSectionIncluded||!c.spatialPatternFixEnabled),stack('world_selector_pane','settings.selector_stack_panel/world_selector_pane',world,!c.worldSectionIncluded),
  spacer('outer-spacer-24','settings.selector_stack_panel/spacer_24',25,!c.spatialPatternFixEnabled&&!c.packsSectionsIncluded),stack('addons_selector_panel','settings.selector_stack_panel/addons_selector_panel',[
   spacer('addons-spacer-01','world_section.addons_selector_panel/spacer_01',8),group('addons-group','world_section.addons_selector_panel/selector_group_label_2','addons'),pack('level_texture_pack_button','level'),spacer('addons-spacer-02','world_section.addons_selector_panel/spacer_02',25,!c.spatialPatternFixEnabled),pack('addon_button','addon')],!c.packsSectionsIncluded)];
 const materialPlan=planSourceSettingsNavigation({...props,nodes,value});
 const presentedNodes:readonly SourceSettingsNavigationNode[]=materialRendering?[{...base('web-material-plane','web.world_navigation_material_plane'),kind:'source-slot',height:0,content:<WorldNavigationMaterialPlane profile={materialRendering} plan={materialPlan} snapshot={p} value={value} hiddenSlots={props.hiddenSlots}/>},...nodes]:nodes;
 return<SourceSettingsNavigation {...props} ref={attach} nodes={presentedNodes} nodeRefs={nodeRefs} value={value} onValueChange={(next,detail)=>onValueChange?.(next as WorldSettingsNavigationId,detail)} className={['mc-world-navigation',className].filter(Boolean).join(' ')} data-world-settings-mode={mode} data-material-profile={materialRendering?.profile??'css'} data-material-state={materialRendering?'loading':'css'} style={{...props.style,'--mc-world-navigation-u':`${s}px`}as CSSProperties}/>;
});
