import type {FileTransmissionModel} from 'mcbeui';

/** Authored explicit Web measurements, not recovered font/intrinsic defaults. */
export function makeFileTransmissionModel():FileTransmissionModel{
 const provenance='Authored installed-package Web contract; no native font/layout claim';
 const font={family:'monospace',logicalSize:10,lineHeight:12,provenance};
 return{runKey:'file-transmission-package',disabled:false,readOnly:false,
  bindings:{singleTitle:'  Host file title 好  ',leftTitle:'Host left',rightTitle:'Host right',message:'Host transfer message',progressSize:'Host current bytes',totalSize:'Host total bytes',singleTitleVisible:true,dualTitleVisible:true,uploadContentVisible:true,warningContentVisible:true,messageVisible:true,progressTextVisible:true,progressVisible:true,playVisible:true,cancelVisible:true,warningButtonsVisible:true,percentage:1/3},
  profile:{availableSize:[500,300],scale:1,fonts:{title:{...font},progress:{...font},button:{...font}},measurements:{singleTitleWidth:120,leftTitleWidth:90,rightTitleWidth:50,messageWidth:160,progressSizeWidth:55,totalSizeWidth:75,warningHeight:24},labels:{play:'Play host world',cancel:'Cancel transfer',continue:'Continue transfer',mobileDataWarning:'Host mobile-data warning',progress:'Host transfer progress'},bodyColor:'#ffffff',titleColor:'#4c4c4c',provenance,textPolicy:'explicit-host-font-no-shadow-web'},
  imageClipPolicy:'visible-fraction-web',materialPolicy:'explicit-common-hollow2-and-light-web',
  stackLayout:{height:25,messageY:0,progressTextY:10,progressBarY:20,policy:'explicit-host-content-measurement-web',provenance},onAction(){}};
}
