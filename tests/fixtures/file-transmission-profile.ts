import type {FileTransmissionModel} from '../../src/file-transmission-model';
/** Explicit authored Web measurements; not native default-font/content recovery. */
export function makeFileTransmissionModel():FileTransmissionModel{
 const font={family:'monospace',logicalSize:10,lineHeight:12,provenance:'Authored finite Web test font; not native recovery'};
 return {runKey:'transfer-test',disabled:false,readOnly:false,
  bindings:{singleTitle:'Upload world',leftTitle:'Upload',rightTitle:'1 of 3',message:'Sending file',progressSize:'2 MB',totalSize:'8 MB',singleTitleVisible:true,dualTitleVisible:false,uploadContentVisible:true,warningContentVisible:false,messageVisible:true,progressTextVisible:true,progressVisible:true,playVisible:false,cancelVisible:true,warningButtonsVisible:false,percentage:.25},
  profile:{availableSize:[500,301],scale:1,fonts:{title:font,progress:font,button:font},measurements:{singleTitleWidth:120,leftTitleWidth:100,rightTitleWidth:100,messageWidth:200,progressSizeWidth:60,totalSizeWidth:60,warningHeight:24},labels:{play:'Let us go',continue:'Continue',cancel:'Cancel',mobileDataWarning:'This transfer uses mobile data.',progress:'File transfer progress'},bodyColor:'#ffffff',titleColor:'#4c4c4c',provenance:'Authored finite Web fixture profile',textPolicy:'explicit-host-font-no-shadow-web'},
  materialPolicy:'explicit-common-hollow2-and-light-web',imageClipPolicy:'visible-fraction-web',
  stackLayout:{height:25,messageY:0,progressTextY:10,progressBarY:20,policy:'explicit-host-content-measurement-web',provenance:'Authored test layout retains all three declared extents; not native hidden-row semantics'},onAction:()=>{}};
}
