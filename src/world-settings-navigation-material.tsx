import{useCallback,useRef,useState}from'react';import type{RefObject}from'react';
import{GuiImageLayer}from'./gui-image';import type{GuiImage,GuiImageLayerState}from'./gui-image';
import type{ClassicSkinAsset}from'./classic-skin';import type{SourceSettingsNavigationPlan}from'./settings-navigation-source-model';
import{settingsNavigationAssets as skins}from'./settings-navigation-assets';import{worldNavigationAssets as icons}from'./world-navigation-assets';import{worldActionAssets}from'./world-settings-assets';
import{useClassicLayoutEffect}from'./classic-screen-lifecycle';
import type{WorldSettingsNavigationId,WorldSettingsNavigationSnapshot,WorldSettingsNavigationMaterialRendering}from'./world-settings-navigation-model';

type Skin='unchecked'|'checked'|'uncheckedHover'|'checkedHover'|'locked';
interface Pose{skin:Skin;glyph:number;border:number;alpha:number;z:number}
interface LaunchPose{state:'idle'|'hover'|'pressed'|'locked';border:number}
interface Palette{readonly rows:Readonly<Record<string,Pose>>;readonly launch:Readonly<Record<string,LaunchPose>>}
const rowIds=['server_settings_button','game_button','classroom_button','switch_game_button','multiplayer_button','edu_cloud_button','debug_button','level_texture_pack_button','addon_button']as const;
function defaults(plan:SourceSettingsNavigationPlan,value:WorldSettingsNavigationId|null):Palette{
 const rows:Record<string,Pose>={};for(const e of plan.entries)if(e.kind==='section')rows[e.id]={skin:!e.enabled?'locked':e.id===value?'checked':'unchecked',glyph:0,border:.075,alpha:e.enabled?1:.5,z:e.enabled&&e.id===value?2:1};return{rows,launch:{}};
}
function skin(asset:ClassicSkinAsset,rect:readonly[number,number,number,number],tint=1,alpha=1):GuiImage{
 return{texture:asset.url,rect,tint:[tint,tint,tint,1],hudOpacity:alpha,...(asset.metadata?.nineslice_size===undefined?{}:{nineSlice:{baseSize:asset.metadata.base_size,insets:asset.metadata.nineslice_size}})};
}
const source=(p:{readonly src:string},rect:readonly[number,number,number,number],tint=1,alpha=1):GuiImage=>({texture:p.src,rect,tint:[tint,tint,tint,1],hudOpacity:alpha});
/** Canonical material queue only. Logical source layout, explicit existing image
 * geometry quantization and shader projection are distinct from native defaults. */
export function worldNavigationMaterialImages(plan:SourceSettingsNavigationPlan,p:WorldSettingsNavigationSnapshot,value:WorldSettingsNavigationId|null,hiddenSlots:'reserve'|'collapse',palette:Palette=defaults(plan,value)):readonly GuiImage[]{
 const images:GuiImage[]=[],entries=plan.entries.filter(e=>!e.ignored&&e.visible),byId=new Map(entries.map(e=>[e.id,e]));
 const thumbnail=byId.get('world_snapshot_image');if(thumbnail)images.push(skin(icons['textures/ui/BannersTransparent'],thumbnail.box));
 const launches=[['play_or_create_panel',false],['play_or_host_panel',true]]as const;
 for(const[id,edu]of launches){const e=byId.get(id);if(!e)continue;const realmSpace=!p.context.editorModeEnabled&&(p.launch.realms.visible||hiddenSlots==='reserve');
  const buttons=edu?[{id:'play',state:p.launch.play,x:0,w:plan.width/2,realm:false},{id:'host',state:p.launch.host,x:plan.width/2,w:plan.width/2,realm:false}]:[{id:'primary',state:p.launch.primary,x:0,w:realmSpace?plan.width/2:plan.width,realm:false},...(!p.context.editorModeEnabled&&p.launch.realms.visible?[{id:'realms',state:p.launch.realms,x:plan.width/2,w:plan.width/2,realm:true}]:[])];
  for(const b of buttons){const pose=palette.launch[b.id]??{state:e.enabled&&b.state.enabled?'idle':'locked',border:.075},bank=b.realm?[worldActionAssets.realms,worldActionAssets.realmsHover,worldActionAssets.realmsPressed,skins.locked]:[skins.unchecked,skins.uncheckedHover,skins.checkedHover,skins.locked],index={idle:0,hover:1,pressed:2,locked:3}[pose.state];images.push(skin(bank[index]!,[b.x+1,e.box[1]+1,b.w-2,33]),skin(skins.border,[b.x,e.box[1],b.w,35],pose.border));}
 }
 const sections=entries.filter(e=>e.kind==='section').map((e,index)=>({e,index,pose:palette.rows[e.id]??{skin:!e.enabled?'locked':e.id===value?'checked':'unchecked',glyph:0,border:.075,alpha:e.enabled?1:.5,z:1}as Pose})).sort((a,b)=>a.pose.z-b.pose.z||a.index-b.index);
 for(const{e,pose}of sections){const y=e.box[1],width=e.box[2],a=pose.alpha,g=pose.glyph;images.push(skin(skins[pose.skin],[1,y+.5,width-2,29]),skin(skins.border,[0,y-.5,width,31],pose.border));
  const pair=(outline:ClassicSkinAsset,color:ClassicSkinAsset,w:number,h:number)=>{const r=[8,y+(30-h)/2,w,h]as const;images.push(skin(outline,r,g,a),skin(color,r,1,a));};
  switch(e.id){
   case'game_button':pair(icons['textures/ui/controller_glyph'],icons['textures/ui/controller_glyph_color'],21,14);break;
   case'switch_game_button':pair(icons['textures/ui/controller_glyph_switch'],icons['textures/ui/controller_glyph_color_switch'],21,14);break;
   case'multiplayer_button':pair(icons['textures/ui/multiplayer_glyph'],icons['textures/ui/multiplayer_glyph_color'],22,12);break;
   case'classroom_button':pair(icons['textures/ui/bookshelf_flat_border'],icons['textures/ui/bookshelf_flat'],21,14);break;
   case'debug_button':pair(icons['textures/ui/debug_glyph'],icons['textures/ui/debug_glyph_color'],15,15);break;
   case'edu_cloud_button':{const r=[8,y+8,20,14]as const;if(p.cloud.outline)images.push(source(p.cloud.outline,r,g,a));if(p.cloud.color)images.push(source(p.cloud.color,r,1,a));break;}
   case'server_settings_button':{const r=[8,y+8,21,14]as const;if(p.server.outlineName&&p.server.outlineName!=='loading'&&p.server.outline)images.push(source(p.server.outline,r,g,a));if(p.server.iconName&&p.server.iconName!=='loading'&&p.server.icon)images.push(source(p.server.icon,r,1,a));if(p.server.iconName==='loading')images.push({...skin(icons['textures/ui/loading_bar'],r,g,a),uvRect:[p.server.loadingFrame/10,0,.1,1]});break;}
   case'level_texture_pack_button':case'addon_button':{const pack=p.packs[e.id==='addon_button'?'addon':'level'];if(p.packs.border)images.push(source(p.packs.border,[8,y+6.5,17,17],g,a));if(pack.image)images.push(source(pack.image,[9,y+7.5,15,15],1,a));break;}
  }
 }
 return Object.freeze(images);
}
export function validateWorldNavigationMaterial(profile:WorldSettingsNavigationMaterialRendering|undefined):void{
 if(profile===undefined)return;if(!profile||profile.profile!=='source-image'||profile.extentPolicy!=='ceil')throw new TypeError('World navigation material rendering requires source-image and explicit ceil extent policy.');
 const b=profile.background;if(!b||!['solid','transparent'].includes(b.kind))throw new TypeError('World navigation material rendering needs an explicit uniform solid or transparent backdrop.');
 if(b.kind==='solid'&&(!Array.isArray(b.color)||b.color.length!==4||![0,1,2,3].every(i=>Object.hasOwn(b.color,i)&&Number.isFinite(b.color[i])&&b.color[i]!>=0&&b.color[i]!<=1)))throw new RangeError('World navigation material background requires four finite0..1 components.');
 if(profile.renderKey!==undefined&&typeof profile.renderKey!=='string'&&(typeof profile.renderKey!=='number'||!Number.isFinite(profile.renderKey)))throw new TypeError('World navigation material retry key must be text or a finite number.');
 for(const f of[profile.onStateChange,profile.onError])if(f!==undefined&&typeof f!=='function')throw new TypeError('World navigation material callbacks must be functions.');
}
export function useWorldNavigationMaterial(root:RefObject<HTMLDivElement|null>,profile:WorldSettingsNavigationMaterialRendering|undefined,plan:SourceSettingsNavigationPlan,p:WorldSettingsNavigationSnapshot,value:WorldSettingsNavigationId|null,hiddenSlots:'reserve'|'collapse'){
 const[read,setRead]=useState<{key:string;palette:Palette}>(),[rendered,setRendered]=useState<{key:string;state:GuiImageLayerState}>(),callbacks=useRef(profile);
 // A reactivated painter is a new owner even when all source values match.
 // Derive this during render so CSS remains visible on its first commit.
 const[activation,setActivation]=useState({active:!!profile,epoch:0});
 const epoch=activation.active===!!profile?activation.epoch:activation.epoch+1;
 if(activation.active!==!!profile)setActivation({active:!!profile,epoch});
 const committed=useRef<string|null>(null);
 useClassicLayoutEffect(()=>{callbacks.current=profile;},[profile]);
 const key=JSON.stringify([plan,value,p.launch,hiddenSlots]),initial=defaults(plan,value),palette=read?.key===key?read.palette:initial;
 useClassicLayoutEffect(()=>{
  const node=root.current;if(!profile||!node)return;let live=true;const view=node.ownerDocument.defaultView!;
  const update=()=>{if(!live)return;const rows:Record<string,Pose>={},launch:Record<string,LaunchPose>={};
   for(const id of rowIds){const button=node.querySelector<HTMLButtonElement>(`button[data-settings-navigation-id="${id}"]`);if(!button)continue;const css=view.getComputedStyle(button),content=button.querySelector('.mc-settings-navigation-section__content'),state=(['unchecked','checked','uncheckedHover','checkedHover','locked']as const).find(s=>{const element=button.querySelector('.mc-settings-navigation-section__state--'+s);return element&&view.getComputedStyle(element).display!=='none';});rows[id]={skin:state??'unchecked',glyph:Number(css.getPropertyValue('--mc-settings-navigation-glyph')),border:Number(css.getPropertyValue('--mc-settings-navigation-border')),alpha:content?Number(view.getComputedStyle(content).opacity):1,z:Number(css.zIndex)||1};}
   for(const button of node.querySelectorAll<HTMLButtonElement>('button[data-world-launch-button]')){const id=button.dataset.worldLaunchButton!,state=(['idle','hover','pressed','locked']as const).find(s=>{const element=button.querySelector('.mc-world-settings-action-'+s);return element&&view.getComputedStyle(element).display!=='none';}),outline=button.querySelector('.mc-world-settings-action__outline'),filter=outline?view.getComputedStyle(outline).filter:'none';launch[id]={state:state??'idle',border:filter==='none'?1:.075};}
   const next={rows,launch};setRead(old=>old?.key===key&&JSON.stringify(old.palette)===JSON.stringify(next)?old:{key,palette:next});
  };
  const later=()=>queueMicrotask(update);for(const type of['pointerover','pointerout','pointerdown','pointerup','focusin','focusout','keydown','keyup'])node.addEventListener(type,later);
  const observer=new MutationObserver(later);observer.observe(node,{subtree:true,attributes:true,attributeFilter:['class','style','disabled','aria-checked']});update();return()=>{live=false;observer.disconnect();for(const type of['pointerover','pointerout','pointerdown','pointerup','focusin','focusout','keydown','keyup'])node.removeEventListener(type,later);};
 },[root,!!profile,key]);
 const images=profile?worldNavigationMaterialImages(plan,p,value,hiddenSlots,palette):[],width=Math.ceil(plan.width*plan.scale),height=Math.ceil(plan.height*plan.scale),signature=JSON.stringify([epoch,images,profile?.background,profile?.renderKey,width,height,plan.scale]);
 useClassicLayoutEffect(()=>{committed.current=profile?signature:null;return()=>{committed.current=null;};},[!!profile,signature]);
 const empty=!height,state=profile?(empty?'ready':rendered?.key===signature?rendered.state:'loading'):'css';
 const layer=profile&&!empty?<GuiImageLayer key={epoch} width={width} height={height} guiScale={plan.scale} images={images} background={profile.background} renderKey={profile.renderKey} className="mc-world-navigation__material-plane" style={{position:'absolute',left:0,top:0,pointerEvents:'none',visibility:state==='ready'?'visible':'hidden'}}
  onRenderStateChange={next=>{if(committed.current!==signature)return;setRendered(old=>old?.key===signature&&old.state===next?old:{key:signature,state:next});callbacks.current?.onStateChange?.(next);}} onRenderError={error=>{if(committed.current===signature)callbacks.current?.onError?.(error);}}/>:null;
 return{layer,state,ready:!!profile&&state==='ready',width,height};
}

const materialOwners=new WeakMap<HTMLDivElement,object>();
/** Paint state stays below the source interaction tree. A decode or hover repaint
 * must not replace source callbacks and invalidate a pending logical request. */
export function WorldNavigationMaterialPlane({profile,plan,snapshot,value,hiddenSlots}:{profile:WorldSettingsNavigationMaterialRendering;plan:SourceSettingsNavigationPlan;snapshot:WorldSettingsNavigationSnapshot;value:WorldSettingsNavigationId|null;hiddenSlots:'reserve'|'collapse'}){
 const root=useRef<HTMLDivElement|null>(null),owner=useRef({});
 const attach=useCallback((marker:HTMLSpanElement|null)=>{if(marker)root.current=marker.closest<HTMLDivElement>('.mc-world-navigation');},[]);
 const material=useWorldNavigationMaterial(root,profile,plan,snapshot,value,hiddenSlots);
 useClassicLayoutEffect(()=>{
  const node=root.current;if(!node)return;const token=owner.current;materialOwners.set(node,token);
  return()=>{if(materialOwners.get(node)!==token)return;materialOwners.delete(node);node.classList.remove('mc-world-navigation--material-ready');node.dataset.materialState=node.dataset.materialProfile==='css'?'css':'loading';};
 },[]);
 useClassicLayoutEffect(()=>{
  const node=root.current;if(!node||materialOwners.get(node)!==owner.current)return;
  // ScrollArea observes descendant attributes. Reapplying identical classes (or
  // cleanup/readding them on every commit) would feed its measurement updates.
  if(node.classList.contains('mc-world-navigation--material-ready')!==material.ready)node.classList.toggle('mc-world-navigation--material-ready',material.ready);
  if(node.dataset.materialState!==material.state)node.dataset.materialState=material.state;
 });
 return<span ref={attach} aria-hidden="true" style={{display:'contents'}}>{material.layer}</span>;
}
