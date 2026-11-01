import type {FileTransmissionModel} from '../../src/file-transmission-model';
import {makeProgressScreenProps} from './progress-profile';
/** Explicit authored Web measurements; not native default-font/content recovery. */
export function makeFileTransmissionModel():FileTransmissionModel{
 const profile=makeProgressScreenProps().profile;
 const intrinsicSizes={...profile.intrinsicSizes,
  'file_upload.single_title_panel/center':[120,10] as const,
  'file_upload.dual_title_panel/left':[100,10] as const,'file_upload.dual_title_panel/right':[100,10] as const,
  'file_upload.message_text_panel/message_text':[200,10] as const,
  'file_upload.progress_text_panel/progress':[60,10] as const,'file_upload.progress_text_panel/total':[60,10] as const,
  'file_upload.warning_content_panel/message':[248,24] as const};
 return {runKey:'transfer-test',disabled:false,readOnly:false,
  bindings:{singleTitle:'Upload world',leftTitle:'Upload',rightTitle:'1 of 3',message:'Sending file',progressSize:'2 MB',totalSize:'8 MB',singleTitleVisible:true,dualTitleVisible:false,uploadContentVisible:true,warningContentVisible:false,messageVisible:true,progressTextVisible:true,progressVisible:true,playVisible:false,cancelVisible:true,warningButtonsVisible:false,percentage:.25},
  profile:{...profile,availableSize:[500,301],scale:1,intrinsicSizes,labels:{...profile.labels,'progressScreen.message.letsGo':'Let us go','permissions.Continue':'Continue','gui.cancel':'Cancel','progressScreen.noWifi.mobileDataWarning':'This transfer uses mobile data.','accessibility.fileTransferProgress':'File transfer progress'}},
  materialPolicy:'explicit-common-hollow2-and-light-web',imageClipPolicy:'visible-fraction-web',
  stackLayout:{height:25,messageY:0,progressTextY:10,progressBarY:20,policy:'explicit-host-content-measurement-web',provenance:'Authored test layout retains all three declared extents; not native hidden-row semantics'},onAction:()=>{}};
}
