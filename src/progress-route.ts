import type { ProgressContent, ProgressResolvedRoute, ProgressResourcePopupId, ProgressRoute, ProgressScreenAnimation, ProgressScreenSnapshot } from './progress-types';

/** Fixed resource_pack/ui/progress_screen.json, v1.26.60.5, SHA2453144b... */
export const PROGRESS_SOURCE=Object.freeze({archiveSHA256:'d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf',member:'resource_pack/ui/progress_screen.json',memberSHA256:'2453144b1e4d98bcc56d63c014034dae50172f5e15989589a8dca2676599ee80',memberBytes:72699,nativeCertified:false});
/** Source binding names are retained independently of field naming. Alias-only
 * entries do not manufacture new host state or current/total-to-ratio rules. */
export const PROGRESS_BINDING_LEDGER=Object.freeze({
 '#auto_save_animation_visible':'indicators.autoSaveVisible','#bar_animation_visible':'indicators.barAnimationVisible',
 '#cancel_button_text':'bindings.cancelText','#cancel_visible':'bindings.cancelVisible','#clip_ratio':'source-target-alias:indicators.percentage',
 '#cloud_link_visible':'cloud.linkVisible','#code_number':'cloud.codeNumber','#code_text':'cloud.codeText',
 '#edu_cloud_download_error':'cloud.downloadError','#edu_cloud_error_hyperlink_label':'cloud.hyperlinkLabel','#edu_cloud_upload_error':'cloud.uploadError',
 '#edu_cloud_upload_images_visible':'cloud.uploadImagesVisible','#edu_server_timeout_button_text':'cloud.serverTimeoutText',
 '#empty_binding':'source-empty-binding-literal','#enabled':'source-local-enabled-target',
 '#join_and_download_everything':'resourcePopup.joinEverythingText','#join_and_download_required':'resourcePopup.joinRequiredText',
 '#loading_bar_current_amount':'indicators.currentAmount','#loading_bar_percentage':'indicators.percentage','#loading_bar_total_amount':'indicators.totalAmount',
 '#loading_bar_visible':'indicators.loadingBarVisible','#mobile_data_icon_visible':'auxiliary.mobileDataVisibleAtInstanceCreation','#ok_visible':'bindings.okVisible',
 '#one_button_panel':'cloud.oneButtonPanel','#optional_resource_pack_grid_dimension':'packs.optional.dimensions','#pack_download_type_message':'resourcePopup.description',
 '#progress_animation_visible':'indicators.progressAnimationVisible','#progress_bar_current_amount':'source-target-alias:indicators.currentAmount','#progress_bar_total_amount':'source-target-alias:indicators.totalAmount',
 '#progress_text':'bindings.progressText','#ray_tracing_warning_message':'resourcePopup.rayTracingWarning','#required_resource_pack_grid_dimension':'packs.required.dimensions',
 '#resource_pack_name':'packs.*.entries[].name:collection-once','#retry_and_abort_visible':'bindings.retryAndAbortVisible',
 '#selectedPackSize':'packs.selectedSizeText','#selectedPacks':'packs.selectedCountText','#server_region_connected_visible':'auxiliary.serverRegionVisible',
 '#server_region_ping_icon':'auxiliary.serverRegionPingIcon','#server_region_text':'auxiliary.serverRegionText','#show_ray_tracing_warning':'resourcePopup.showRayTracingWarning',
 '#spinner_animation_visible':'indicators.spinnerAnimationVisible','#texture':'source-dynamic-image-target','#title_text':'bindings.titleText',
 '#touch_progress_bar_visible':'source-target-alias:indicators.loadingBarVisible','#tts_enabled':'bindings.ttsEnabled','#use_determinate_animation':'indicators.useDeterminateAnimation','#visible':'source-local-visible-target',
});
export const PROGRESS_UNRESOLVED_LITERALS=Object.freeze(['textures/ui/icon_external_link','progress.realms_loading_screen_background','common.button_state_default','common.button_state_hover','common.button_state_pressed'] as const);
/** Literal frame metadata only; endpoint dwell and native clock phase remain
 * unknown. The first profile supports explicit host-selected frames. */
export const PROGRESS_SOURCE_FLIPBOOKS=Object.freeze({
 wave:Object.freeze({texture:'textures/ui/loading_bar',naturalSize:Object.freeze([640,8] as const),displaySize:Object.freeze([64,8] as const),frames:10,step:64,fps:10,reversible:true}),
 spinner:Object.freeze({texture:'textures/ui/loading_spin',naturalSize:Object.freeze([70,7] as const),displaySize:Object.freeze([14,14] as const),frames:10,step:7,fps:10,reversible:'unspecified'}),
 autoSave:Object.freeze({texture:'textures/ui/auto_save',naturalSize:Object.freeze([162,30] as const),displaySize:Object.freeze([18,30] as const),frames:9,step:18,fps:10,reversible:true,disableAnimFastForward:true}),
});
export const PROGRESS_ROUTES:readonly ProgressRoute[]=Object.freeze(['progress_screen','modal_progress_screen','delete_progress_screen','realms_stories_loading_progress_screen','world_loading_progress_screen','experience_world_loading_progress_screen','overworld_loading_progress_screen','nether_loading_progress_screen','theend_loading_progress_screen','world_saving_progress_screen','fetching_edu_cloud_worlds','edu_cloud_download_progress_screen','fetching_edu_servers','joining_edu_server','world_convert_modal_progress_screen']);
export const PROGRESS_CONTENTS:readonly ProgressContent[]=Object.freeze(['empty','modal_screen_content','progress_screen_content','world_convert_modal_progress_screen_content','realms_loading_world_modal_progress_screen_content','world_save_modal_progress_screen_content','cloud_upload_screen_content','edu_cloud_fetch_screen_content','cloud_download_screen_content','edu_server_fetch_screen_content','joining_edu_server_progress_screen_content']);
export const PROGRESS_RESOURCE_FACTORY_IDS:readonly ProgressResourcePopupId[]=Object.freeze(['test','resource_pack_download_server_required','resource_pack_download_optional_and_required','resource_pack_download_optional','resource_pack_download_required']);
const exits:readonly ProgressScreenAnimation[]=Object.freeze(['screen_exit_animation_push_fade','screen_exit_animation_pop_fade']);
const allFades:readonly ProgressScreenAnimation[]=Object.freeze([...exits,'screen_entrance_animation_push_fade','screen_entrance_animation_pop_fade']);
const mapping=Object.freeze([Object.freeze({from:'button.menu_cancel',to:'button.menu_exit',scope:'global'} as const)]);
const worldEntries=new Set<ProgressRoute>(['world_loading_progress_screen','experience_world_loading_progress_screen','overworld_loading_progress_screen','nether_loading_progress_screen','theend_loading_progress_screen']);
/** Source button matrices, not caller-defined arbitrary action arrays. Targets
 * remain distinct from root menu_exit and resource modal popup_dialog.escape. */
export const PROGRESS_RESOURCE_BUTTONS=Object.freeze({
 test:Object.freeze(['button.confirm_download','button.deny_packs'] as const),
 resource_pack_download_server_required:Object.freeze([null,'button.join_and_download_everything','button.leave'] as const),
 resource_pack_download_optional_and_required:Object.freeze(['button.join_and_download_everything','button.join_and_download_required','button.leave'] as const),
 resource_pack_download_optional:Object.freeze([null,'button.join_and_download_everything','button.join'] as const),
 resource_pack_download_required:Object.freeze([null,'button.join_and_download_required','button.leave'] as const),
});
/** Accepts a validated immutable snapshot. No engine or layout evaluator is
 * implied: generic/false-gated content really stays inherited-empty. */
export function resolveProgressRoute(snapshot:ProgressScreenSnapshot):ProgressResolvedRoute {
 const {route,capabilities:c}=snapshot;
 if(!PROGRESS_ROUTES.includes(route))throw new RangeError('Unknown Progress source entry');
 let content:ProgressContent='empty',background:ProgressResolvedRoute['background']='inherited',gateSatisfied=true;
 let provenance:ProgressResolvedRoute['contentProvenance']='source';
 const chain:string[]=['progress.'+route];
 if(route==='delete_progress_screen')chain.push('progress.modal_progress_screen');
 if(worldEntries.has(route)&&route!=='world_loading_progress_screen')chain.push('progress.world_loading_progress_screen');
 if(route!=='progress_screen')chain.push('progress.progress_screen');chain.push('common.base_screen');
 if(route==='modal_progress_screen'||route==='delete_progress_screen')content='modal_screen_content';
 else if(worldEntries.has(route)||route==='world_convert_modal_progress_screen')content='world_convert_modal_progress_screen_content';
 else if(route==='realms_stories_loading_progress_screen'){content='realms_loading_world_modal_progress_screen_content';background='realms_loading_background';}
 else if(route==='world_saving_progress_screen')content=c.educationEdition&&c.cloudSaveOn?'cloud_upload_screen_content':'world_save_modal_progress_screen_content';
 else if(route==='fetching_edu_cloud_worlds'||route==='edu_cloud_download_progress_screen'){
  gateSatisfied=c.educationEdition&&c.cloudSaveOn;
  if(gateSatisfied)content=route==='fetching_edu_cloud_worlds'?'edu_cloud_fetch_screen_content':'cloud_download_screen_content';
 }else if(route==='fetching_edu_servers'){gateSatisfied=c.educationEdition;if(gateSatisfied)content='edu_server_fetch_screen_content';}
 else if(route==='joining_edu_server')content='joining_edu_server_progress_screen_content';
 if(route==='overworld_loading_progress_screen')background='overworld_loading_background';
 if(route==='nether_loading_progress_screen')background='nether_loading_background';
 if(route==='theend_loading_progress_screen')background='theend_loading_background';
 if(content==='empty')provenance='inherited-empty';
 if(route==='progress_screen'&&snapshot.injectedContent){content=snapshot.injectedContent.content;provenance='explicit-host-source-helper';}
 const panels:string[]=[];
 if(content==='modal_screen_content')panels.push('progress.modal_progress_panel_with_cancel');
 if(content==='progress_screen_content')panels.push('progress.progress_content_panel');
 if(['world_convert_modal_progress_screen_content','world_save_modal_progress_screen_content','realms_loading_world_modal_progress_screen_content','joining_edu_server_progress_screen_content'].includes(content))panels.push('progress.world_modal_progress_panel');
 if(content==='world_save_modal_progress_screen_content')panels.push('progress.auto_save');
 if(content==='cloud_upload_screen_content')panels.push(snapshot.cloud.uploadError?'progress.cloud_error_panel':'progress.cloud_upload_panel');
 if(content==='cloud_download_screen_content')panels.push(snapshot.cloud.downloadError?'progress.cloud_error_panel':'progress.cloud_download_panel');
 if(content==='edu_cloud_fetch_screen_content')panels.push('progress.cloud_fetch_panel');
 if(content==='edu_server_fetch_screen_content')panels.push(snapshot.bindings.cancelVisible?'progress.server_fetch_timeout_panel':'progress.server_fetch_panel');
 return Object.freeze({route,content,contentProvenance:provenance,background,animations:route==='delete_progress_screen'?allFades:route==='joining_edu_server'?Object.freeze([]):exits,rootMappings:mapping,sourceChain:Object.freeze(chain),gateSatisfied,panels:Object.freeze(panels),resourceFactoryDeclared:content!=='empty'&&content!=='modal_screen_content',conflictFactoryDeclared:content==='cloud_upload_screen_content',nativeCertified:false});
}
