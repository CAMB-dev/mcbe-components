import type { ProgressPresentationProfile, ProgressSize, ProgressTextRole, ProgressWholeImage } from '../src';

export const progressDemoFamily='"MCBE Pixel", "MCBE CJK", monospace';
export const progressDemoText={title:'正在加载世界',progress:'正在准备资源，请稍候。',error:'处理失败，请重试。',description:'加入前选择要下载的资源包。',warning:'此内容可能需要光线追踪支持。',conflict:'本地与云端世界不同，请选择保留版本。'};
export type ProgressDemoMeasure=(text:string,maxWidth:number)=>ProgressSize;
/** Demo-owned finite Web profile, measured after bundled open fonts load.
 * Unresolved c%/%content rectangles are explicit host choices, not a native evaluator. */
export function makeProgressDemoProfile(size:ProgressSize,scale:number,measure:ProgressDemoMeasure,materials:{externalLink?:ProgressWholeImage;realmsBackground?:ProgressWholeImage}):ProgressPresentationProfile{
  const provenance='Demo host profile: loaded MCBE Pixel/CJK metrics and declared finite source formulas; native fonts/intrinsic evaluator unqualified';
  const roles:readonly ProgressTextRole[]=['title','progress','code','error','button','pack','conflict','auxiliary'];
  const fonts=Object.fromEntries(roles.map(role=>[role,{family:progressDemoFamily,logicalSize:12,lineHeight:14,provenance}])) as ProgressPresentationProfile['fonts'];
  const title=measure(progressDemoText.title,196),text=measure(progressDemoText.progress,278),popupW=size[0]*.5,contentW=popupW-20;
  const desc=measure(progressDemoText.description,contentW),warning=measure(progressDemoText.warning,contentW),selectorW=size[0]*.9;
  const intrinsicSizes:Record<string,ProgressSize>={
    'progress.world_modal_progress_panel':[290,Math.max(100,9+title[1]+8+Math.min(40,text[1])+6+8+5+26+14)],
    'progress.world_modal_progress_panel/progress_title_text':title,'progress.world_modal_progress_panel/progress_bar_text':[text[0],Math.min(40,text[1])],
    'progress.world_modal_progress_panel/loading_bar_panel':[278,8],'progress.world_modal_progress_panel/modal_button_panel':[278,26],
    'progress.modal_progress_panel_with_cancel/progress_title_text':[Math.min(title[0],184),20],'progress.modal_progress_panel_with_cancel/progress_bar_text':[Math.min(text[0],184),20],
    'progress.title_panel/progress_title_text':[title[0],20],'progress.title_panel/progress_bar_text':[text[0],20],
    'progress.mobile_data_icon':[90,55],'progress.mobile_data_icon_text':[90,35],'progress.server_region_connected_text':[80,70],
    'progress.popup_dialog_base.scrolling_panel':[selectorW,size[1]*.6],
    'progress.popup_dialog_base.scrolling_pane':[selectorW-10,size[1]*.6-10],
    'progress.popup_dialog_base.scrolling_pane.offset':[1,1],
    'progress.resource_pack_section':[selectorW-20,17*5+4],
    'progress.popup_dialog_base.totalSelected':[selectorW*.5,10],'progress.popup_dialog_base.totalSelectedSize':[selectorW*.4,10],
    'progress.simple_popup_dialog_base':[popupW,96+desc[1]+8+warning[1]+32+10],
    'progress.simple_popup_dialog_base.description':[contentW,desc[1]],'progress.simple_popup_dialog_base.description2':[contentW,warning[1]],
  };
  const roots={upload:'cloud_upload_panel',fetch:'cloud_fetch_panel',download:'cloud_download_panel','server-fetch':'server_fetch_panel'} as const;
  const wrappers={upload:['world_image_wrapper','arrow_image_wrapper','cloud_image_wrapper'],fetch:['cloud_image_wrapper','spyglass_image_wrapper','world_image_wrapper'],download:['cloud_image_wrapper','arrow_image_wrapper','world_image_wrapper'],'server-fetch':['server_image_wrapper_left','spyglass_image_wrapper','server_image_wrapper_right']};
  const images={upload:'edu_cloud_upload_image',fetch:'edu_cloud_fetch_image',download:'edu_cloud_download_image','server-fetch':'edu_server_fetch_image'};
  for(const kind of Object.keys(roots) as (keyof typeof roots)[]){const root='progress.'+roots[kind];intrinsicSizes[root+'/base_content/progress_title_text']=[Math.min(title[0],250),Math.min(title[1],20)];intrinsicSizes[root+'/base_content/'+(kind==='download'?'progress_bar_text':'progress_text')]=[Math.min(text[0],250),kind==='download'?40:60];intrinsicSizes[root+(kind==='download'?'':'/base_content')+'/loading_bar_panel']=[kind==='download'?270:258,16];for(const wrapper of wrappers[kind])intrinsicSizes['progress.'+images[kind]+'/'+wrapper]=[16,16];}
  for(const[name,s]of Object.entries({'progress_title_text':[Math.min(title[0],250),Math.min(title[1],20)],'progress_text':[Math.min(text[0],250),60],'loading_bar_panel':[258,16]}))intrinsicSizes['progress.server_fetch_timeout_panel/base_content/'+name]=s as unknown as ProgressSize;
  const error='progress.cloud_error_panel',content=error+'/content_wrapper',tts=content+'/error_text_tts_wrapper',stack=tts+'/edu_cloud_error_text_wrapper';
  Object.assign(intrinsicSizes,{[error+'/common_panel']:[300,176],[content]:[300,176],[content+'/title_wrapper']:[288,20],[content+'/title_wrapper/progress_title_text']:[Math.min(title[0],280),14],
    [tts]:[300,90],[stack]:[276,80],[stack+'/edu_cloud_error_text']:[268,measure(progressDemoText.error,268)[1]],
    [stack+'/error_code/code_text']:[48,14],[stack+'/error_code/code_number']:[42,14],[stack+'/cloud_support_link/cloud_support_hypertext']:[130,14],[stack+'/cloud_support_link/padded_icon']:[9,9],
    [stack+'/cloud_support_link/cloud_support_hypertext/default']:[130,10],[stack+'/cloud_support_link/cloud_support_hypertext/default/label_hover']:[130,17],[stack+'/cloud_support_link/cloud_support_hypertext/default/label_hover/label_panel']:[130,14]});
  const conflict='edu_common.edu_cloud_conflict_resolution_content',description=conflict+'/conflict_resolution_description_wrapper',info=conflict+'/world_info_wrapper';
  intrinsicSizes['popup_dialog.form_fit_screen_with_title_and_close/panel_content/header/header_content']=[170,14];
  intrinsicSizes[description]=[250,measure(progressDemoText.conflict,250)[1]];intrinsicSizes[description+'/conflict_resolution_description']=intrinsicSizes[description]!;intrinsicSizes[info]=[250,56];
  for(const name of ['local_world_name_label','local_world_last_changed_label','cloud_world_name_label','cloud_world_last_changed_label'])intrinsicSizes[info+'/world_info_stack/'+name]=[250,14];
  return {availableSize:size,scale,fonts,layoutPolicy:'finite-parent-content-source-formulas-web',provenance,intrinsicSizes,
    labels:{'gui.close':'关闭','gui.ok':'确定','gui.cancel':'取消','gui.retry':'重试','progressScreen.progress':'加载进度','progressScreen.label.mobileData':'正在使用移动数据',
      'progressScreen.dialog.title.resourcePack':'资源包','progressScreen.dialog.button.leave':'离开','progressScreen.dialog.button.join':'加入',
      'edu.cloudError.local.download.open':'打开本地','popup.title.eduCloudConflictResolution':'选择保留的世界','popup.buttons.eduConflictResolution.local':'保留本地版本','popup.buttons.eduConflictResolution.cloud':'保留云端版本','popup.buttons.eduConflictResolution.both':'保留两个版本'},
    loadingTextColor:'#ffffff',titleTextColor:'rgb(30% 30% 30%)',transitions:{pushSeconds:.2,popSeconds:.3,policy:'host-screen-events-web'},
    customBar:{kind:'explicit-web-clip',clipRatio:.4,provenance:'Demo host visible fraction; independent of current/total'},unresolvedMaterials:materials,
    buttonStatePolicy:'explicit-common-classic-web',motionPolicy:'explicit-frames-web',modalPolicy:'explicit-web-stack'};
}
