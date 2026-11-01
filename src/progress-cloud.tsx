import {useRef} from 'react';
import type {CSSProperties} from 'react';
import {ClassicSkin} from './classic-skin';
import {Image} from './image';
import {useClassicLayoutEffect,useClassicNodeRef} from './classic-screen-lifecycle';
import {snapshotProgressScreenModel} from './progress-data';
import {ProgressPanelSkin,ProgressSourceButton,ProgressText,planProgressPanelSkin,planProgressSourceButton,planProgressText} from './progress-actions';
import type {ProgressButtonSpec,ProgressRawRequestSink,ProgressTextProps} from './progress-actions';
import {ProgressIndicators,planProgressIndicators} from './progress-indicators';
import type {ProgressIndicatorsProps} from './progress-indicators';
import {progressBox,progressCentered,progressIntrinsic} from './progress-layout';
import type {ProgressBox} from './progress-layout';
import {progressAssets} from './progress-assets';
import type {ProgressScreenSnapshot,ProgressSize} from './progress-types';

/** Private composition of the original progress_screen.json and
 * ui_edu_common.json from Bedrock Samples v1.26.60.5, archive SHA256
 * d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
 * Explicit Web intrinsic/font/clip inputs do not certify native evaluation. */

export type ProgressCloudKind='upload'|'fetch'|'download'|'server-fetch';
export interface ProgressCloudPanelProps{readonly snapshot:ProgressScreenSnapshot;readonly kind:ProgressCloudKind;readonly onRequest:ProgressRawRequestSink;readonly imageClipPolicy:ProgressIndicatorsProps['imageClipPolicy']}
type TextLeaf=ProgressTextProps & {readonly box:ProgressBox};
interface ImageLeaf{readonly sourceControl:string;readonly asset:keyof typeof progressAssets;readonly box:ProgressBox;readonly visible:boolean}
interface FocusLeaf{readonly sourceControl:string;readonly box:ProgressBox;readonly label:string;readonly enabled:boolean}
interface LinkLeaf{readonly sourceControl:string;readonly box:ProgressBox;readonly label:string;readonly visible:boolean;readonly iconBox:ProgressBox;readonly textBox:ProgressBox;readonly underlineBox:ProgressBox}
interface IndicatorLeaf{readonly box:ProgressBox;readonly props:ProgressIndicatorsProps}
export interface ProgressCloudBranchPlan{readonly sourceControl:string;readonly size:ProgressSize;readonly skinBox:ProgressBox;readonly visible:boolean;readonly texts:readonly TextLeaf[];readonly images:readonly ImageLeaf[];readonly buttons:readonly ProgressButtonSpec[];readonly focus:readonly FocusLeaf[];readonly link?:LinkLeaf;readonly indicator?:IndicatorLeaf}
export interface ProgressCloudPlan{readonly snapshot:ProgressScreenSnapshot;readonly kind:ProgressCloudKind;readonly branches:readonly ProgressCloudBranchPlan[];readonly selected:ProgressCloudBranchPlan;readonly onRequest:ProgressRawRequestSink;readonly nativeCertified:false}

const simpleSources={upload:'cloud_upload_panel',fetch:'cloud_fetch_panel',download:'cloud_download_panel','server-fetch':'server_fetch_panel'} as const;
const imageSources={upload:'edu_cloud_upload_image',fetch:'edu_cloud_fetch_image',download:'edu_cloud_download_image','server-fetch':'edu_server_fetch_image'} as const;
const wrappers={upload:['world_image_wrapper','arrow_image_wrapper','cloud_image_wrapper'],fetch:['cloud_image_wrapper','spyglass_image_wrapper','world_image_wrapper'],download:['cloud_image_wrapper','arrow_image_wrapper','world_image_wrapper'],'server-fetch':['server_image_wrapper_left','spyglass_image_wrapper','server_image_wrapper_right']} as const;
const errorRoot='progress.cloud_error_panel';
const errorContent=errorRoot+'/content_wrapper';
const errorTts=errorContent+'/error_text_tts_wrapper';
const errorText=errorTts+'/edu_cloud_error_text_wrapper';
const conflictRoot='edu_common.edu_cloud_conflict_resolution_content';
const descriptionRoot=conflictRoot+'/conflict_resolution_description_wrapper';
const infoRoot=conflictRoot+'/world_info_wrapper';
const infoLabels=['local_world_name_label','local_world_last_changed_label','cloud_world_name_label','cloud_world_last_changed_label'] as const;
function inputRecord(value:unknown,label:string):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError(label+' requires plain data props');
 const keys=Reflect.ownKeys(value);if(keys.length>16)throw new RangeError(label+' exceeds finite prop budget');const copy:Record<string,unknown>=Object.create(null);
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!d?.enumerable||!('value'in d))throw new TypeError(label+' requires own enumerable data props');copy[key]=d.value;}
 if(copy.children!==undefined||copy.dangerouslySetInnerHTML!==undefined)throw new TypeError(label+' owns its source composition');return copy;
}
/** Every entry resolves a literal default/%c/%cm/%sm source path. These are
 * presentation inputs, never estimates from browser glyph metrics. */
export const PROGRESS_CLOUD_INTRINSIC_KEYS=Object.freeze(Object.fromEntries((['upload','fetch','download','server-fetch'] as const).map(kind=>{
 const base='progress.'+simpleSources[kind],image='progress.'+imageSources[kind];return[kind,Object.freeze([base+'/base_content/progress_title_text',base+'/base_content/'+(kind==='download'?'progress_bar_text':'progress_text'),base+(kind==='download'?'':'/base_content')+'/loading_bar_panel',...wrappers[kind].map(w=>image+'/'+w)])];
})) as Readonly<Record<ProgressCloudKind,readonly string[]>>);
export const PROGRESS_CLOUD_ERROR_INTRINSIC_KEYS=Object.freeze([errorRoot+'/common_panel',errorContent,errorContent+'/title_wrapper',errorContent+'/title_wrapper/progress_title_text',errorTts,errorText,errorText+'/edu_cloud_error_text',errorText+'/error_code/code_text',errorText+'/error_code/code_number',errorText+'/cloud_support_link/cloud_support_hypertext',errorText+'/cloud_support_link/padded_icon']);
export const PROGRESS_CLOUD_LINK_INTRINSIC_KEYS=Object.freeze([errorText+'/cloud_support_link/cloud_support_hypertext/default',errorText+'/cloud_support_link/cloud_support_hypertext/default/label_hover',errorText+'/cloud_support_link/cloud_support_hypertext/default/label_hover/label_panel']);
export const PROGRESS_CLOUD_TIMEOUT_INTRINSIC_KEYS=Object.freeze(['progress.server_fetch_timeout_panel/base_content/progress_title_text','progress.server_fetch_timeout_panel/base_content/progress_text','progress.server_fetch_timeout_panel/base_content/loading_bar_panel',...wrappers['server-fetch'].map(w=>'progress.edu_server_fetch_image/'+w)]);
export const PROGRESS_CONFLICT_INTRINSIC_KEYS=Object.freeze(['popup_dialog.form_fit_screen_with_title_and_close/panel_content/header/header_content',descriptionRoot,descriptionRoot+'/conflict_resolution_description',infoRoot,...infoLabels.map(k=>infoRoot+'/world_info_stack/'+k)]);

const rect=(x:number,y:number,w:number,h:number,label='Progress cloud source box')=>progressBox([x,y,w,h],label);
const translate=(box:ProgressBox,x:number,y:number)=>rect(box[0]+x,box[1]+y,box[2],box[3]);
const finiteFit=(size:ProgressSize,max:ProgressSize,path:string)=>{if(size[0]>max[0]||size[1]>max[1])throw new RangeError(`${path} exceeds its source max_size`);return size;};
const label=(s:ProgressScreenSnapshot,id:string)=>{const value=s.profile.labels[id];if(typeof value!=='string')throw new RangeError(`Progress cloud requires profile.labels[${JSON.stringify(id)}]`);return value;};
function textLeaf(s:ProgressScreenSnapshot,text:string,role:TextLeaf['role'],sourceControl:string,box:ProgressBox,color?:string):TextLeaf{const p=Object.freeze({text,role,sourceControl,box,profile:s.profile,renderText:s.renderText,...color?{color}:{}});planProgressText(p);return p;}
function button(s:ProgressScreenSnapshot,onRequest:ProgressRawRequestSink,id:string,target:ProgressButtonSpec['target'],text:string,box:ProgressBox,visible=true,instanceId?:string):ProgressButtonSpec{const b:ProgressButtonSpec=Object.freeze({id,sourceControl:id,target,label:text,box,visible,enabled:true,material:'source-light',...instanceId===undefined?{}:{instanceId}});planProgressSourceButton({snapshot:s,button:b,onRequest});return b;}
function checkBranch(s:ProgressScreenSnapshot,branch:ProgressCloudBranchPlan){
 planProgressPanelSkin({size:[branch.skinBox[2],branch.skinBox[3]],scale:s.profile.scale,frame:'hollow3',fillAlpha:.8});
 const boxes=[branch.skinBox,...branch.texts.map(v=>v.box),...branch.images.map(v=>v.box),...branch.buttons.map(v=>v.box),...branch.focus.map(v=>v.box),...branch.indicator?[branch.indicator.box]:[],...branch.link?[branch.link.box,branch.link.textBox,branch.link.underlineBox,branch.link.iconBox]:[]];
 for(const b of boxes){const w=b[2]*s.profile.scale,h=b[3]*s.profile.scale;if(w>8192||h>8192||w*h>16777216)throw new RangeError('Progress cloud source leaf exceeds finite physical Web budget');}
 return Object.freeze(branch);
}

function composite(s:ProgressScreenSnapshot,kind:ProgressCloudKind,parent:ProgressSize,offsetY:number,visible:boolean):readonly ImageLeaf[]{
 if(!visible)return Object.freeze([]);
 const root='progress.'+imageSources[kind],sizes=wrappers[kind].map(w=>progressIntrinsic(s.profile,root+'/'+w)),width=sizes.reduce((n,v)=>n+v[0],0),height=kind==='upload'?20:16;
 const position=progressCentered(parent,[width,height],[0,offsetY]);let x=position[0];
 const images:(readonly[keyof typeof progressAssets,number,number,number,number])[]=kind==='upload'?[['textures/ui/worldsIcon',16,16,-6,0],['textures/ui/arrow',16,16,0,0],['textures/ui/cloud_only_storage',14,10,6,3]]:kind==='fetch'?[['textures/ui/cloud_only_storage',14,10,-6,3],['textures/ui/spyglass_flat',16,16,0,0],['textures/ui/worldsIcon',16,16,6,0]]:kind==='download'?[['textures/ui/cloud_only_storage',14,10,-6,5],['textures/ui/arrow',18,15,0,2],['textures/ui/worldsIcon',16,16,6,1]]:[['textures/ui/servers',16,16,-6,0],['textures/ui/spyglass_flat',16,16,0,0],['textures/ui/servers',16,16,6,0]];
 return Object.freeze(images.map(([asset,w,h,dx,dy],i)=>{const size=sizes[i]!,box=translate(progressCentered(size,[w,h],[dx,dy]),x,position[1]+(height-size[1])/2);x+=size[0];return Object.freeze({sourceControl:root+'/'+wrappers[kind][i],asset,box,visible});}));
}
function simple(s:ProgressScreenSnapshot,kind:ProgressCloudKind,onRequest:ProgressRawRequestSink,policy:ProgressCloudPanelProps['imageClipPolicy'],timeout=false):ProgressCloudBranchPlan{
 const root='progress.'+(timeout?'server_fetch_timeout_panel':simpleSources[kind]),size:ProgressSize=[270,timeout?120:84],baseSize:ProgressSize=[258,timeout?75:72];
 const titleSize=finiteFit(progressIntrinsic(s.profile,root+'/base_content/progress_title_text'),[250,20],root+'/progress_title_text');
 const textPath=root+'/base_content/'+(kind==='download'?'progress_bar_text':'progress_text'),intrinsic=progressIntrinsic(s.profile,textPath),textSize:ProgressSize=[Math.min(intrinsic[0],250),kind==='download'?40:60];
 const texts=[textLeaf(s,s.bindings.titleText,'title',root+'/base_content/progress_title_text',rect(6+(258-titleSize[0])/2,9-titleSize[1]/2,...titleSize),s.profile.titleTextColor),textLeaf(s,s.bindings.progressText,'progress',textPath,translate(progressCentered(baseSize,textSize,[0,kind==='download'?5:15]),6,6))];
 const imageOffset=kind==='download'?5:kind==='server-fetch'&&!timeout?6:10,images=composite(s,kind,baseSize,imageOffset,kind!=='upload'||s.cloud.uploadImagesVisible).map(v=>Object.freeze({...v,box:translate(v.box,6,6)}));
 // download's loading_bar_panel is a sibling of base_content; other panels nest it.
 const indicatorSize=progressIntrinsic(s.profile,root+(kind==='download'?'':'/base_content')+'/loading_bar_panel');if(indicatorSize[0]!== (kind==='download'?270:258))throw new RangeError(root+'/loading_bar_panel must resolve source 100% width');
 const indicatorParent:ProgressSize=kind==='download'?size:baseSize,indicatorBox=translate(progressCentered(indicatorParent,indicatorSize),kind==='download'?0:6,kind==='download'?0:6);
 const indicatorProps:ProgressIndicatorsProps={templates:[kind==='upload'?'cloud-upload':'wave'],state:s.indicators,availableSize:indicatorSize,scale:s.profile.scale,label:s.bindings.progressText||s.bindings.titleText||'Progress indicator',imageClipPolicy:policy,customBar:s.profile.customBar};
 planProgressIndicators(indicatorProps);
 // cloud fetch/server override the wave offset 24 -> 25 in the real nested control.
 const adjusted=kind==='fetch'||kind==='server-fetch'?translate(indicatorBox,0,1):indicatorBox;
 const buttons=timeout?[button(s,onRequest,root+'/base_content/timeout_button','button.menu_exit',s.cloud.serverTimeoutText,translate(progressCentered(baseSize,[66,26],[0,50]),6,6),s.bindings.cancelVisible)]:[];
 return checkBranch(s,{sourceControl:root,size,skinBox:rect(0,0,...size),visible:true,texts:Object.freeze(texts),images:Object.freeze(images),buttons:Object.freeze(buttons),focus:Object.freeze([]),indicator:Object.freeze({box:adjusted,props:indicatorProps})});
}
function error(s:ProgressScreenSnapshot,onRequest:ProgressRawRequestSink):ProgressCloudBranchPlan{
 const p=s.profile,rootSize:ProgressSize=[300,p.availableSize[1]],skinSize=progressIntrinsic(p,errorRoot+'/common_panel'),contentSize=progressIntrinsic(p,errorContent),titleWrapper=progressIntrinsic(p,errorContent+'/title_wrapper'),title=progressIntrinsic(p,errorContent+'/title_wrapper/progress_title_text'),tts=progressIntrinsic(p,errorTts),stack=progressIntrinsic(p,errorText),errorSize=progressIntrinsic(p,errorText+'/edu_cloud_error_text'),codeA=progressIntrinsic(p,errorText+'/error_code/code_text'),codeB=progressIntrinsic(p,errorText+'/error_code/code_number');
 if(skinSize[0]!==300||contentSize[0]!==300||titleWrapper[0]!==288||tts[0]!==300||stack[0]!==276)throw new RangeError('Cloud error explicit intrinsic widths must preserve source parent formulas');
 finiteFit(title,[280,20],errorRoot+'/title');finiteFit(errorSize,[268,60],errorRoot+'/error_text');
 const contentOrigin=progressCentered(rootSize,contentSize),[cx,cy]=contentOrigin,titleY=cy+6;
 const ttsOrigin=translate(progressCentered(contentSize,tts),cx,cy),stackOrigin=translate(progressCentered(tts,stack,[0,-8]),ttsOrigin[0],ttsOrigin[1]);
 const [sx,sy]=stackOrigin,codeY=sy+errorSize[1]+5,linkY=codeY+15+5;
 const texts=[textLeaf(s,s.bindings.titleText,'title',errorContent+'/title_wrapper/progress_title_text',rect(cx+6+(288-title[0])/2,titleY+3-title[1]/2,...title),p.titleTextColor),textLeaf(s,s.bindings.progressText,'error',errorText+'/edu_cloud_error_text',rect(sx,sy,...errorSize)),textLeaf(s,s.cloud.codeText,'code',errorText+'/error_code/code_text',rect(sx,codeY,...codeA)),textLeaf(s,s.cloud.codeNumber,'code',errorText+'/error_code/code_number',rect(sx+codeA[0],codeY,...codeB),'rgb(100% 100% 33.3%)')];
 const focus=[Object.freeze({sourceControl:errorTts+'/tts_border',box:translate(progressCentered(tts,[stack[0]+5,stack[1]],[0,-8]),ttsOrigin[0],ttsOrigin[1]),label:[s.bindings.progressText,s.cloud.codeText,s.cloud.codeNumber,...s.cloud.linkVisible?[s.cloud.hyperlinkLabel]:[]].join(' '),enabled:s.bindings.ttsEnabled})];
 let link:LinkLeaf|undefined;
 if(s.cloud.linkVisible){const linkSize=progressIntrinsic(p,errorText+'/cloud_support_link/cloud_support_hypertext'),iconWrapper=progressIntrinsic(p,errorText+'/cloud_support_link/padded_icon'),state=progressIntrinsic(p,PROGRESS_CLOUD_LINK_INTRINSIC_KEYS[0]!),single=progressIntrinsic(p,PROGRESS_CLOUD_LINK_INTRINSIC_KEYS[1]!),glyph=progressIntrinsic(p,PROGRESS_CLOUD_LINK_INTRINSIC_KEYS[2]!);if(state[1]!==10)throw new RangeError('edu_common.underline_text retains source height 10');const stateBox=progressCentered(linkSize,state),singleBox=translate(progressCentered(state,single),stateBox[0],stateBox[1]),textBox=rect(singleBox[0]+2,singleBox[1]+1,...glyph);link=Object.freeze({sourceControl:errorText+'/cloud_support_link/cloud_support_hypertext',box:rect(sx,linkY,...linkSize),label:s.cloud.hyperlinkLabel,visible:true,textBox,underlineBox:rect(textBox[0],textBox[1]+glyph[1]-1,glyph[0],1),iconBox:translate(progressCentered(iconWrapper,[9,9],[7,.6]),sx+linkSize[0],linkY+(Math.max(linkSize[1],iconWrapper[1])-iconWrapper[1])/2)});}
 if(s.cloud.linkVisible&&!p.unresolvedMaterials.externalLink)throw new RangeError('Cloud support link requires exact profile.unresolvedMaterials.externalLink; fixed archive lacks textures/ui/icon_external_link');
 if(link)planProgressText({text:link.label,role:'error',sourceControl:link.sourceControl+'/label',profile:p,renderText:s.renderText});
 const buttons=s.cloud.oneButtonPanel?[button(s,onRequest,errorContent+'/button_content/modal_button_panel/ok_button','button.menu_exit',label(s,'gui.ok'),rect(cx+(300-66)/2,cy+contentSize[1]-52+(52-26)/2,66,26),s.bindings.okVisible)]:[button(s,onRequest,errorContent+'/error_button_content/download_ok_button','button.download_failed_open',label(s,'edu.cloudError.local.download.open'),rect(cx+80,cy+contentSize[1]-52+13+(52-26)/2,70,26)),button(s,onRequest,errorContent+'/error_button_content/download_cancel_button','button.download_failed_cancel',s.bindings.cancelText,rect(cx+80+70,cy+contentSize[1]-52+13+(52-26)/2,70,26))];
 return checkBranch(s,{sourceControl:errorRoot,size:rootSize,skinBox:progressCentered(rootSize,skinSize),visible:true,texts:Object.freeze(texts),images:Object.freeze([]),buttons:Object.freeze(buttons),focus:Object.freeze(focus),...link?{link}:{}});
}
/** Pure complete active subtree preflight before any glyph-only callback.
 * snapshotProgressScreenModel still validates all latent data fields. */
export function planProgressCloudPanel(input:ProgressCloudPanelProps):ProgressCloudPlan{
 input=inputRecord(input,'Progress cloud panel') as unknown as ProgressCloudPanelProps;
 const s=snapshotProgressScreenModel(input.snapshot);if(typeof input.onRequest!=='function'||!Object.hasOwn(simpleSources,input.kind))throw new TypeError('Cloud panel requires known kind and source owner');
 if(!['visible-fraction-web','left-removal-web'].includes(input.imageClipPolicy))throw new TypeError('Cloud requires explicit image clip policy');
 const isError=input.kind==='upload'?s.cloud.uploadError:input.kind==='download'?s.cloud.downloadError:false;
 const active=isError?error(s,input.onRequest):simple(s,input.kind,input.onRequest,input.imageClipPolicy,input.kind==='server-fetch'&&s.bindings.cancelVisible);
 return Object.freeze({snapshot:s,kind:input.kind,branches:Object.freeze([active]),selected:active,onRequest:input.onRequest,nativeCertified:false});
}

function FocusBorder({leaf,snapshot}:{leaf:FocusLeaf;snapshot:ProgressScreenSnapshot}){const s=snapshot.profile.scale;return <span className="mc-progress-cloud__tts" tabIndex={leaf.enabled&&!snapshot.disabled?0:-1} role="group" aria-label={leaf.label} data-source-control={leaf.sourceControl} data-tts-inherit-siblings="true" data-source-enabled={leaf.enabled} style={styleBox(leaf.box,s)}><span aria-hidden="true" className="mc-progress-cloud__tts-border"><ClassicSkin asset={progressAssets['textures/ui/square_image_border_white']} width={leaf.box[2]} height={leaf.box[3]} scale={s} baseClass="mc-progress-skin"/></span></span>;}
const styleBox=(box:ProgressBox,s:number):CSSProperties=>({left:box[0]*s,top:box[1]*s,width:box[2]*s,height:box[3]*s});
function CloudLink({leaf,snapshot,onRequest}:{leaf:LinkLeaf;snapshot:ProgressScreenSnapshot;onRequest:ProgressRawRequestSink}){
 const [node,attach]=useClassicNodeRef<HTMLButtonElement>(undefined),latest=useRef<{snapshot:ProgressScreenSnapshot;leaf:LinkLeaf;onRequest:ProgressRawRequestSink}|null>(null);useClassicLayoutEffect(()=>{latest.current={snapshot,leaf,onRequest};});useClassicLayoutEffect(()=>()=>{latest.current=null;},[]);
 const s=snapshot.profile.scale,valid=()=>{const now=latest.current,n=node.current;return !!now&&now.snapshot.runKey===snapshot.runKey&&now.leaf.visible&&!now.snapshot.disabled&&!now.snapshot.readOnly&&!!n?.isConnected&&!n.closest('[hidden],[inert]');};
 const icon=snapshot.profile.unresolvedMaterials.externalLink;
 return <><button ref={attach} type="button" className="mc-progress-cloud__link" hidden={!leaf.visible} disabled={snapshot.disabled} aria-disabled={snapshot.readOnly||undefined} aria-label={leaf.label} data-source-control={leaf.sourceControl} data-source-target="button.edu_cloud_hyperlink" style={styleBox(leaf.box,s)} onClick={event=>{if(event.defaultPrevented||event.nativeEvent.defaultPrevented||!valid())return;latest.current!.onRequest({target:'button.edu_cloud_hyperlink',sourceControl:leaf.sourceControl,control:event.currentTarget,event,origin:'control',valid});}}><ProgressText text={leaf.label} role="error" sourceControl={leaf.sourceControl+'/label'} profile={snapshot.profile} renderText={snapshot.renderText} box={leaf.textBox} color="#fff"/><Image className="mc-progress-cloud__underline" src={progressAssets['textures/ui/underline'].url} sourceSize={[1,1]} size={[leaf.underlineBox[2],1]} scale={s} alt="" style={{left:leaf.underlineBox[0]*s,top:leaf.underlineBox[1]*s}}/><Image className="mc-progress-cloud__underline-focus" src={progressAssets['textures/ui/underline_focus'].url} sourceSize={[1,1]} size={[leaf.underlineBox[2],1]} scale={s} alt="" style={{left:leaf.underlineBox[0]*s,top:leaf.underlineBox[1]*s}}/></button>{leaf.visible&&icon&&<Image className="mc-progress-cloud__external" src={icon.src} sourceSize={icon.naturalSize} size={[9,9]} scale={s} alt="" data-source-control={leaf.sourceControl+'/padded_icon/icon'} style={{left:leaf.iconBox[0]*s,top:leaf.iconBox[1]*s}}/>}</>;
}
function Branch({plan,snapshot,onRequest}:{plan:ProgressCloudBranchPlan;snapshot:ProgressScreenSnapshot;onRequest:ProgressRawRequestSink}){const s=snapshot.profile.scale;return <div className="mc-progress-cloud-branch" data-source-control={plan.sourceControl} data-native-certified="false" style={{width:plan.size[0]*s,height:plan.size[1]*s}}><span className="mc-progress-cloud__skin" style={styleBox(plan.skinBox,s)}><ProgressPanelSkin size={[plan.skinBox[2],plan.skinBox[3]]} scale={s} frame="hollow3" fillAlpha={.8}/></span>{plan.texts.map(text=><ProgressText key={text.sourceControl} {...text}/>)}{plan.images.filter(image=>image.visible).map(image=>{const asset=progressAssets[image.asset];return <Image key={image.sourceControl} className="mc-progress-cloud__image" src={asset.url} sourceSize={[asset.width,asset.height]} size={[image.box[2],image.box[3]]} scale={s} alt="" data-source-control={image.sourceControl} style={{left:image.box[0]*s,top:image.box[1]*s}}/>;})}{plan.indicator&&<span className="mc-progress-cloud__indicator" style={styleBox(plan.indicator.box,s)}><ProgressIndicators {...plan.indicator.props}/></span>}{plan.focus.map(leaf=><FocusBorder key={leaf.sourceControl} leaf={leaf} snapshot={snapshot}/>)}{plan.link&&<CloudLink leaf={plan.link} snapshot={snapshot} onRequest={onRequest}/>} {plan.buttons.map(button=><ProgressSourceButton key={button.id} snapshot={snapshot} button={button} onRequest={onRequest}/>)}</div>;}
export function ProgressCloudPanel(props:ProgressCloudPanelProps){const plan=planProgressCloudPanel(props);return <Branch plan={plan.selected} snapshot={plan.snapshot} onRequest={plan.onRequest}/>;}

export interface ProgressCloudConflictFactoryProps{readonly snapshot:ProgressScreenSnapshot;readonly onRequest:ProgressRawRequestSink}
export interface ProgressCloudConflictPlan{readonly snapshot:ProgressScreenSnapshot;readonly factoryId:'conflict_resolution_popup';readonly instanceId:string;readonly escapeTarget:'button.close_edu_cloud_conflict_resolution_popup';readonly panel:ProgressCloudBranchPlan;readonly onRequest:ProgressRawRequestSink;readonly nativeCertified:false}
export function planProgressCloudConflictFactory(input:ProgressCloudConflictFactoryProps):ProgressCloudConflictPlan|null{
 input=inputRecord(input,'Progress cloud conflict') as unknown as ProgressCloudConflictFactoryProps;
 const s=snapshotProgressScreenModel(input.snapshot),popup=s.conflictPopup;if(typeof input.onRequest!=='function')throw new TypeError('Cloud conflict requires source owner');if(!popup)return null;
 const p=s.profile,descWrapper=progressIntrinsic(p,descriptionRoot),desc=progressIntrinsic(p,descriptionRoot+'/conflict_resolution_description'),infoWrapper=progressIntrinsic(p,infoRoot),info=infoLabels.map(k=>progressIntrinsic(p,infoRoot+'/world_info_stack/'+k)),titlePath=PROGRESS_CONFLICT_INTRINSIC_KEYS[0]!,title=progressIntrinsic(p,titlePath);
 if(descWrapper[0]!==250||desc[0]!==250||infoWrapper[0]!==250||info.some(v=>v[0]!==250))throw new RangeError('Cloud conflict content preserves source width 250');
 const infoHeight=info.reduce((n,v)=>n+v[1],0);if(descWrapper[1]<desc[1]||infoWrapper[1]<infoHeight)throw new RangeError('Cloud conflict %cm wrappers cannot truncate source labels');
 const contentHeight=descWrapper[1]+10+infoWrapper[1]+10+72,size:ProgressSize=[Math.max(250,title[0]+15)+16,Math.max(contentHeight,6)+31],ox=(size[0]-250)/2,oy=23;
 const texts:TextLeaf[]=[textLeaf(s,label(s,'popup.title.eduCloudConflictResolution'),'title',titlePath,rect((size[0]-title[0])/2,13-title[1]/2,...title),'rgb(30% 30% 30%)'),textLeaf(s,popup.description,'conflict',descriptionRoot+'/conflict_resolution_description',rect(ox,oy,...desc),'#fff')];
 let y=oy+descWrapper[1]+10;const infoY=y;[popup.localName,popup.localDate,popup.cloudName,popup.cloudDate].forEach((literal,i)=>{texts.push(textLeaf(s,literal,'conflict',infoRoot+'/world_info_stack/'+infoLabels[i],rect(ox,y,...info[i]!),'#fff'));y+=info[i]![1];});
 const focus=[{sourceControl:descriptionRoot+'/tts_border',box:rect(ox-2.5,oy,255,desc[1]),label:popup.description,enabled:s.bindings.ttsEnabled},{sourceControl:infoRoot+'/tts_border',box:rect(ox-2.5,infoY,255,infoHeight),label:[popup.localName,popup.localDate,popup.cloudName,popup.cloudDate].join(' '),enabled:s.bindings.ttsEnabled}];
 const targets=['button.edu_cloud_conflict_resolution_local_button','button.edu_cloud_conflict_resolution_cloud_button','button.edu_cloud_conflict_resolution_both_button'] as const;
 const names=['keep_local_button','keep_cloud_button','keep_both_button'] as const,ids=['popup.buttons.eduConflictResolution.local','popup.buttons.eduConflictResolution.cloud','popup.buttons.eduConflictResolution.both'];
 const buttons=targets.map((target,i)=>button(s,input.onRequest,conflictRoot+'/'+names[i],target,label(s,ids[i]!),rect(ox,oy+descWrapper[1]+10+infoWrapper[1]+10+i*24,250,24),true,popup.instanceId));
 const panel=checkBranch(s,{sourceControl:'edu_common.edu_cloud_conflict_resolution_popup',size,skinBox:rect(0,0,...size),visible:true,texts:Object.freeze(texts),images:Object.freeze([]),buttons:Object.freeze(buttons),focus:Object.freeze(focus.map(v=>Object.freeze(v)))});
 return Object.freeze({snapshot:s,factoryId:'conflict_resolution_popup',instanceId:popup.instanceId,escapeTarget:'button.close_edu_cloud_conflict_resolution_popup',panel,onRequest:input.onRequest,nativeCertified:false});
}
/** Independent factory. Escape/focus stacking belongs to ProgressScreen; the
 * source explicitly hides its close icon but retains its escape mapping. */
export function ProgressCloudConflictFactory(props:ProgressCloudConflictFactoryProps){const plan=planProgressCloudConflictFactory(props);return plan?<div className="mc-progress-cloud-conflict" data-progress-factory={plan.factoryId} data-progress-instance={plan.instanceId} data-source-escape-target={plan.escapeTarget} data-source-no-close-button="true"><Branch plan={plan.panel} snapshot={plan.snapshot} onRequest={plan.onRequest}/></div>:null;}
