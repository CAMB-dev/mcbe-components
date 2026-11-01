import type {ProgressPresentationProfile,ProgressSize} from './progress-types';

export type ProgressBox=readonly[number,number,number,number];
/** Finite Web geometry guards, not a recovered native intrinsic evaluator. */
export function progressBox(value:readonly number[],label:string):ProgressBox{
 if(value.length!==4||!value.every(Number.isFinite)||value.some(n=>Math.abs(n)>8192)||value[2]!<=0||value[3]!<=0)throw new RangeError(`${label} requires a finite positive box within8192 logical units`);
 return Object.freeze([value[0]!,value[1]!,value[2]!,value[3]!]);
}
export function progressSize(value:ProgressSize,label:string):ProgressSize{const b=progressBox([0,0,...value],label);return Object.freeze([b[2],b[3]]);}
/** Exact key: a missing default/%content measurement is an error, not an
 * invitation to substitute a guessed font height or content formula. */
export function progressIntrinsic(profile:ProgressPresentationProfile,key:string):ProgressSize{
 const size=profile.intrinsicSizes[key];if(!size)throw new RangeError(`Progress requires profile.intrinsicSizes[${JSON.stringify(key)}] for unresolved source geometry`);return progressSize(size,key);
}
export function progressCentered(parent:ProgressSize,size:ProgressSize,offset:ProgressSize=[0,0]):ProgressBox{return progressBox([(parent[0]-size[0])/2+offset[0],(parent[1]-size[1])/2+offset[1],...size],'Progress centered source box');}
export const PROGRESS_PANEL_INTRINSIC_KEYS=Object.freeze({world:'progress.world_modal_progress_panel',worldTitle:'progress.world_modal_progress_panel/progress_title_text',worldText:'progress.world_modal_progress_panel/progress_bar_text',worldIndicators:'progress.world_modal_progress_panel/loading_bar_panel',worldButtons:'progress.world_modal_progress_panel/modal_button_panel',modalTitle:'progress.modal_progress_panel_with_cancel/progress_title_text',modalText:'progress.modal_progress_panel_with_cancel/progress_bar_text',genericTitle:'progress.title_panel/progress_title_text',genericText:'progress.title_panel/progress_bar_text',mobile:'progress.mobile_data_icon',mobileText:'progress.mobile_data_icon_text',regionText:'progress.server_region_connected_text'} as const);
/** Root/cloud planners can use this to prevent duplicated title layers. */
export const PROGRESS_CONTENT_BRANDING=Object.freeze({empty:false,modal_screen_content:false,progress_screen_content:false,world_convert_modal_progress_screen_content:true,realms_loading_world_modal_progress_screen_content:false,world_save_modal_progress_screen_content:true,cloud_upload_screen_content:true,edu_cloud_fetch_screen_content:false,cloud_download_screen_content:false,edu_server_fetch_screen_content:false,joining_edu_server_progress_screen_content:true} as const);
