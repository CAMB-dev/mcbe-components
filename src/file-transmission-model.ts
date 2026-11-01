import type {SyntheticEvent} from 'react';
import {snapshotProgressProfile} from './progress-data';
import {planProgressText} from './progress-actions';
import {progressIntrinsic} from './progress-layout';
import type {ProgressBox} from './progress-layout';
import type {ProgressPresentationProfile,ProgressTextRenderer} from './progress-types';

/** Private source family until installed-consumer and public-preview qualification. */
export interface FileTransmissionBindings {
 readonly singleTitle:string;readonly leftTitle:string;readonly rightTitle:string;
 readonly message:string;readonly progressSize:string;readonly totalSize:string;
 readonly singleTitleVisible:boolean;readonly dualTitleVisible:boolean;
 readonly uploadContentVisible:boolean;readonly warningContentVisible:boolean;
 readonly messageVisible:boolean;readonly progressTextVisible:boolean;readonly progressVisible:boolean;
 readonly playVisible:boolean;readonly cancelVisible:boolean;readonly warningButtonsVisible:boolean;
 readonly percentage:number;
}
export type FileTransmissionTarget='button.file_upload_play'|'button.file_upload_cancel'|'button.file_upload_wifi_warning_continue'|'button.menu_exit'|'button.menu_tab_left'|'button.menu_tab_right';
export interface FileTransmissionAction {
 readonly runKey:string;readonly target:FileTransmissionTarget;readonly sourceControl:string;
 readonly origin:'control'|'keyboard'|'host-controller';readonly control:HTMLElement;readonly event?:SyntheticEvent<HTMLElement>;
}
export interface FileTransmissionModel {
 readonly runKey:string;readonly disabled:boolean;readonly readOnly:boolean;
 readonly bindings:FileTransmissionBindings;readonly profile:ProgressPresentationProfile;
 readonly imageClipPolicy:'visible-fraction-web'|'left-removal-web';
 /** Literal dialog_background_hollow_2 namespace and common desktop states are explicit Web choices. */
 readonly materialPolicy:'explicit-common-hollow2-and-light-web';
 /** Unrecovered100%c/hidden-row/default-anchor layout, sampled explicitly by host. */
 readonly stackLayout:{readonly height:number;readonly messageY:number;readonly progressTextY:number;readonly progressBarY:number;readonly policy:'explicit-host-content-measurement-web';readonly provenance:string};
 readonly renderText?:ProgressTextRenderer;readonly onAction:(detail:FileTransmissionAction)=>void|false;
}
const flags=['singleTitleVisible','dualTitleVisible','uploadContentVisible','warningContentVisible','messageVisible','progressTextVisible','progressVisible','playVisible','cancelVisible','warningButtonsVisible'] as const;
const texts=['singleTitle','leftTitle','rightTitle','message','progressSize','totalSize'] as const;
type Data=Record<string,unknown>;
function data(value:unknown,label:string):Data{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError(`${label} requires a plain data record`);
 const keys=Reflect.ownKeys(value);if(keys.length>256)throw new RangeError(`${label} exceeds the finite256-field Web budget`);
 const result:Data=Object.create(null);for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key)||!d?.enumerable||!('value'in d))throw new TypeError(`${label} requires own enumerable data fields`);result[key]=d.value;}return result;
}
export interface FileTransmissionTextLeaf {readonly text:string;readonly role:'title'|'progress';readonly sourceControl:string;readonly box:ProgressBox;readonly color:string;readonly visible:boolean}
export interface FileTransmissionButtonLeaf {readonly id:'play'|'cancel'|'continue'|'warning-cancel';readonly target:FileTransmissionTarget;readonly sourceControl:string;readonly label:string;readonly box:ProgressBox;readonly visible:boolean}
export function snapshotFileTransmission(value:FileTransmissionModel):FileTransmissionModel{
 const d=data(value,'File transmission'),raw=data(d.bindings,'File transmission bindings');let units=0;
 const text=(v:unknown,label:string,max=1048576)=>{if(typeof v!=='string'||v.length>max)throw new TypeError(`${label} requires bounded literal text`);if((units+=v.length)>4194304)throw new RangeError('File transmission aggregate UTF16 budget exceeded');return v;};
 const runKey=text(d.runKey,'File transmission runKey',256);if(!runKey.trim())throw new TypeError('File transmission runKey is empty');
 const flag=(v:unknown,label:string)=>{if(typeof v!=='boolean')throw new TypeError(`${label} requires boolean`);return v;};
 const bindings={...Object.fromEntries(texts.map(k=>[k,text(raw[k],k)])),...Object.fromEntries(flags.map(k=>[k,flag(raw[k],k)])),percentage:raw.percentage} as unknown as FileTransmissionBindings;
 if(typeof bindings.percentage!=='number'||!Number.isFinite(bindings.percentage)||bindings.percentage<0||bindings.percentage>1)throw new RangeError('File transmission percentage requires finite [0,1]');
 if(!['visible-fraction-web','left-removal-web'].includes(d.imageClipPolicy as string))throw new TypeError('File transmission requires explicit image clip interpretation');
 if(d.materialPolicy!=='explicit-common-hollow2-and-light-web')throw new TypeError('File transmission requires explicit material resolution');
 if(typeof d.onAction!=='function'||d.renderText!==undefined&&typeof d.renderText!=='function')throw new TypeError('File transmission callbacks must be callable');
 const rawStack=data(d.stackLayout,'File transmission stack layout');
 const measure=(key:string)=>{const n=rawStack[key];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>8192)throw new RangeError(`File transmission stack ${key} requires finite[0,8192]`);return n;};
 if(rawStack.policy!=='explicit-host-content-measurement-web')throw new TypeError('File transmission requires explicit stack measurement policy');
 const stackLayout=Object.freeze({height:measure('height'),messageY:measure('messageY'),progressTextY:measure('progressTextY'),progressBarY:measure('progressBarY'),policy:rawStack.policy,provenance:text(rawStack.provenance,'File transmission stack provenance',4096)});
 if(!stackLayout.provenance.trim())throw new TypeError('File transmission stack provenance is empty');
 return Object.freeze({runKey,disabled:flag(d.disabled,'disabled'),readOnly:flag(d.readOnly,'readOnly'),bindings:Object.freeze(bindings),profile:snapshotProgressProfile(d.profile as ProgressPresentationProfile),imageClipPolicy:d.imageClipPolicy as FileTransmissionModel['imageClipPolicy'],materialPolicy:d.materialPolicy,stackLayout,renderText:d.renderText as ProgressTextRenderer|undefined,onAction:d.onAction as FileTransmissionModel['onAction']});
}
/** Source fixed content rectangle268x95. Every visibility binding stays independent. */
export function planFileTransmission(value:FileTransmissionModel){
 const snapshot=snapshotFileTransmission(value),{bindings:b,profile:p}=snapshot;
 if(268*p.scale>8192)throw new RangeError('File transmission fixed panel exceeds finite8192 physical-axis budget');
 if(p.buttonStatePolicy!=='explicit-common-classic-web')throw new RangeError('File transmission light states require explicit common Classic Web policy');
 const label=(key:string)=>{const s=p.labels[key];if(typeof s!=='string')throw new RangeError(`File transmission requires profile.labels[${JSON.stringify(key)}]`);return s;};
 const leaves:FileTransmissionTextLeaf[]=[];
 const leaf=(text:string,sourceControl:string,role:'title'|'progress',parent:ProgressBox,anchor:'left'|'right'|'center',visible:boolean,defaultHeight=false)=>{
  if(!visible)return;
  const size=progressIntrinsic(p,sourceControl),height=defaultHeight?size[1]:parent[3];
  if(size[0]>parent[2])throw new RangeError(`${sourceControl} default width exceeds declared parent`);
  const box=Object.freeze([parent[0]+(anchor==='left'?0:anchor==='right'?parent[2]-size[0]:(parent[2]-size[0])/2),parent[1]+(defaultHeight?(parent[3]-height)/2:0),size[0],height]) as ProgressBox;
  const color=role==='title'?p.titleTextColor:p.loadingTextColor;planProgressText({text,role,sourceControl,profile:p,renderText:snapshot.renderText,color});
  leaves.push(Object.freeze({text,role,sourceControl,box,color,visible}));
 };
 leaf(b.singleTitle,'file_upload.single_title_panel/center','title',[7,7,254,10],'center',b.singleTitleVisible);
 leaf(b.leftTitle,'file_upload.dual_title_panel/left','title',[7,7,254,10],'left',b.dualTitleVisible);
 leaf(b.rightTitle,'file_upload.dual_title_panel/right','title',[7,7,254,10],'right',b.dualTitleVisible);
 const stack=snapshot.stackLayout,stackY=23+(30-stack.height)/2;
 leaf(b.message,'file_upload.message_text_panel/message_text','progress',[10,stackY+stack.messageY,248,10],'center',b.uploadContentVisible&&b.messageVisible);
 leaf(b.progressSize,'file_upload.progress_text_panel/progress','progress',[10,stackY+stack.progressTextY,248,10],'left',b.uploadContentVisible&&b.progressTextVisible);
 leaf(b.totalSize,'file_upload.progress_text_panel/total','progress',[10,stackY+stack.progressTextY,248,10],'right',b.uploadContentVisible&&b.progressTextVisible);
 // Warning uses width100% and default height, not a default width.
 if(b.warningContentVisible){const key='file_upload.warning_content_panel/message',height=progressIntrinsic(p,key)[1],text=label('progressScreen.noWifi.mobileDataWarning');planProgressText({text,role:'progress',sourceControl:key,profile:p,renderText:snapshot.renderText});leaves.push(Object.freeze({text,role:'progress',sourceControl:key,box:Object.freeze([10,23+(30-height)/2,248,height]) as ProgressBox,color:p.loadingTextColor,visible:true}));}
 const buttons:FileTransmissionButtonLeaf[]=[];
 const button=(id:FileTransmissionButtonLeaf['id'],target:FileTransmissionTarget,key:string,box:ProgressBox,visible:boolean)=>{if(!visible)return;const text=label(key),sourceControl='file_upload.'+(id==='play'?'lets_go_button':id==='continue'?'continue_button':'cancel_button');planProgressText({text,role:'button',sourceControl,profile:p,renderText:snapshot.renderText});buttons.push(Object.freeze({id,target,sourceControl,label:text,box:Object.freeze([...box]) as ProgressBox,visible}));};
 button('play','button.file_upload_play','progressScreen.message.letsGo',[7,58,254,30],b.playVisible);
 button('cancel','button.file_upload_cancel','gui.cancel',[7,58,254,30],b.cancelVisible);
 button('continue','button.file_upload_wifi_warning_continue','permissions.Continue',[7,58,126,30],b.warningButtonsVisible);
 button('warning-cancel','button.file_upload_cancel','gui.cancel',[135,58,126,30],b.warningButtonsVisible);
 const progressLabel=b.uploadContentVisible&&b.progressVisible?label('accessibility.fileTransferProgress'):'';
 if(b.uploadContentVisible&&b.progressVisible&&!progressLabel.trim())throw new TypeError('Visible file transfer progress requires an accessible label');
 return Object.freeze({snapshot,size:Object.freeze([268,95]) as readonly[number,number],title:Object.freeze([7,7,254,10]) as ProgressBox,content:Object.freeze([10,23,248,30]) as ProgressBox,buttonsBox:Object.freeze([7,58,254,30]) as ProgressBox,texts:Object.freeze(leaves),buttons:Object.freeze(buttons),progress:Object.freeze({box:Object.freeze([10,stackY+stack.progressBarY,248,5]) as ProgressBox,visible:b.uploadContentVisible&&b.progressVisible,percentage:b.percentage,label:progressLabel})});
}
