import type {ReactNode,SyntheticEvent} from 'react';
import type {ProgressBox} from './progress-layout';

export type FileTransmissionSize=readonly[number,number];
export type FileTransmissionTextRole='title'|'progress'|'button';
export interface FileTransmissionFontSpec {readonly family:string;readonly logicalSize:number;readonly lineHeight:number;readonly provenance:string}
export interface FileTransmissionTextContext {readonly role:FileTransmissionTextRole;readonly font:FileTransmissionFontSpec;readonly scale:number;readonly color:string;readonly shadow:false;readonly sourceControl:string}
export type FileTransmissionTextRenderer=(text:string,context:FileTransmissionTextContext)=>ReactNode;
/** Only presentation inputs used by this source family; no unrelated route/cloud state. */
export interface FileTransmissionPresentationProfile {
 readonly availableSize:FileTransmissionSize;readonly scale:number;
 readonly fonts:Readonly<Record<FileTransmissionTextRole,FileTransmissionFontSpec>>;
 readonly measurements:{readonly singleTitleWidth:number;readonly leftTitleWidth:number;readonly rightTitleWidth:number;readonly messageWidth:number;readonly progressSizeWidth:number;readonly totalSizeWidth:number;readonly warningHeight:number};
 readonly labels:{readonly play:string;readonly cancel:string;readonly continue:string;readonly mobileDataWarning:string;readonly progress:string};
 readonly bodyColor:string;readonly titleColor:string;readonly provenance:string;
 /** Common-label default shadow is unresolved; button shadow:false is declared by source. */
 readonly textPolicy:'explicit-host-font-no-shadow-web';
}
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
 readonly bindings:FileTransmissionBindings;readonly profile:FileTransmissionPresentationProfile;
 readonly imageClipPolicy:'visible-fraction-web'|'left-removal-web';
 /** Literal dialog_background_hollow_2 namespace and common desktop states are explicit Web choices. */
 readonly materialPolicy:'explicit-common-hollow2-and-light-web';
 /** Unrecovered100%c/hidden-row/default-anchor layout, sampled explicitly by host. */
 readonly stackLayout:{readonly height:number;readonly messageY:number;readonly progressTextY:number;readonly progressBarY:number;readonly policy:'explicit-host-content-measurement-web';readonly provenance:string};
 readonly renderText?:FileTransmissionTextRenderer;readonly onAction:(detail:FileTransmissionAction)=>void|false;
}
const flags=['singleTitleVisible','dualTitleVisible','uploadContentVisible','warningContentVisible','messageVisible','progressTextVisible','progressVisible','playVisible','cancelVisible','warningButtonsVisible'] as const;
const texts=['singleTitle','leftTitle','rightTitle','message','progressSize','totalSize'] as const;
type Data=Record<string,unknown>;
function data(value:unknown,label:string):Data{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError(`${label} requires a plain data record`);
 const keys=Reflect.ownKeys(value);if(keys.length>256)throw new RangeError(`${label} exceeds the finite256-field Web budget`);
 const result:Data=Object.create(null);for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key)||!d?.enumerable||!('value'in d))throw new TypeError(`${label} requires own enumerable data fields`);result[key]=d.value;}return result;
}
type ReadText=(value:unknown,label:string,max?:number)=>string;
function number(value:unknown,label:string,min:number,max:number){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${label} requires finite[${min},${max}]`);return value;}
/** SSR-safe supported CSS subset: hex, legacy rgb/rgba, modern rgb[/alpha]. */
function validColor(value:string):boolean{
 if(/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value))return true;
 const match=/^(rgb|rgba)\(([^()]*)\)$/i.exec(value);if(!match)return false;
 const numeric=(s:string)=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%?$/i.test(s)&&Number.isFinite(Number(s.replace(/%$/,'')));
 const body=match[2]!.trim();
 if(body.includes(',')){
  const parts=body.split(',').map(s=>s.trim()),count=match[1]!.toLowerCase()==='rgba'?4:3;
  return parts.length===count&&parts.every(numeric)&&parts.slice(0,3).every(s=>s.endsWith('%')===parts[0]!.endsWith('%'));
 }
 const sections=body.split('/');if(sections.length>2||match[1]!.toLowerCase()==='rgba'&&sections.length!==2)return false;
 const channels=sections[0]!.trim().split(/\s+/);return channels.length===3&&channels.every(numeric)&&(sections.length===1||numeric(sections[1]!.trim()));
}
function profile(value:unknown,text:ReadText):FileTransmissionPresentationProfile{
 const p=data(value,'File transmission profile'),rawFonts=data(p.fonts,'File transmission fonts'),rawMeasure=data(p.measurements,'File transmission measurements'),rawLabels=data(p.labels,'File transmission labels');
 const requiredText=(value:unknown,label:string,max:number)=>{const s=text(value,label,max);if(!s.trim())throw new TypeError(`${label} is empty`);return s;};
 const font=(role:FileTransmissionTextRole)=>{const f=data(rawFonts[role],'File transmission '+role+' font');return Object.freeze({family:requiredText(f.family,role+' font family',512),logicalSize:number(f.logicalSize,role+' font logicalSize',Number.MIN_VALUE,1024),lineHeight:number(f.lineHeight,role+' font lineHeight',Number.MIN_VALUE,4096),provenance:requiredText(f.provenance,role+' font provenance',4096)});};
 const measurements=Object.freeze(Object.fromEntries(['singleTitleWidth','leftTitleWidth','rightTitleWidth','messageWidth','progressSizeWidth','totalSizeWidth','warningHeight'].map(key=>[key,number(rawMeasure[key],'File transmission '+key,0,8192)]))) as FileTransmissionPresentationProfile['measurements'];
 const labels=Object.freeze(Object.fromEntries(['play','cancel','continue','mobileDataWarning','progress'].map(key=>[key,text(rawLabels[key],'File transmission label '+key)]))) as FileTransmissionPresentationProfile['labels'];
 const color=(value:unknown,label:string)=>{const s=text(value,label,128);if(!validColor(s))throw new TypeError(`${label} requires supported explicit hex/rgb color`);return s;};
 if(!Array.isArray(p.availableSize)||Object.getPrototypeOf(p.availableSize)!==Array.prototype||Reflect.ownKeys(p.availableSize).length!==3||Object.getOwnPropertyDescriptor(p.availableSize,'length')?.value!==2)throw new TypeError('File transmission availableSize requires a plain two-axis tuple');
 const axis=(i:number)=>{const d=Object.getOwnPropertyDescriptor(p.availableSize,String(i));if(!d?.enumerable||!('value'in d))throw new TypeError('File transmission availableSize requires data axes');return number(d.value,'File transmission availableSize',Number.MIN_VALUE,8192);};
 const availableSize=Object.freeze([axis(0),axis(1)]) as FileTransmissionSize,scale=number(p.scale,'File transmission scale',1,30);
 if(!Number.isSafeInteger(scale)||availableSize[0]*availableSize[1]*scale*scale>16777216)throw new RangeError('File transmission exceeds finite Web physical-pixel/scale budget');
 if(p.textPolicy!=='explicit-host-font-no-shadow-web')throw new TypeError('File transmission requires explicit host text policy');
 return Object.freeze({availableSize,scale,fonts:Object.freeze({title:font('title'),progress:font('progress'),button:font('button')}),measurements,labels,bodyColor:color(p.bodyColor,'File transmission bodyColor'),titleColor:color(p.titleColor,'File transmission titleColor'),provenance:requiredText(p.provenance,'File transmission profile provenance',4096),textPolicy:p.textPolicy});
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
 return Object.freeze({runKey,disabled:flag(d.disabled,'disabled'),readOnly:flag(d.readOnly,'readOnly'),bindings:Object.freeze(bindings),profile:profile(d.profile,text),imageClipPolicy:d.imageClipPolicy as FileTransmissionModel['imageClipPolicy'],materialPolicy:d.materialPolicy,stackLayout,renderText:d.renderText as FileTransmissionTextRenderer|undefined,onAction:d.onAction as FileTransmissionModel['onAction']});
}
/** Source fixed content rectangle268x95. Every visibility binding stays independent. */
export function planFileTransmission(value:FileTransmissionModel){
 const snapshot=snapshotFileTransmission(value),{bindings:b,profile:p}=snapshot;
 if(268*p.scale>8192)throw new RangeError('File transmission fixed panel exceeds finite8192 physical-axis budget');
 const label=(key:keyof FileTransmissionPresentationProfile['labels'])=>p.labels[key];
 const leaves:FileTransmissionTextLeaf[]=[];
 const leaf=(text:string,sourceControl:string,role:'title'|'progress',parent:ProgressBox,anchor:'left'|'right'|'center',visible:boolean,width:number)=>{
  if(!visible)return;
  if(width>parent[2])throw new RangeError(`${sourceControl} default width exceeds declared parent`);
  const box=Object.freeze([parent[0]+(anchor==='left'?0:anchor==='right'?parent[2]-width:(parent[2]-width)/2),parent[1],width,parent[3]]) as ProgressBox;
  const color=role==='title'?p.titleColor:p.bodyColor;
  leaves.push(Object.freeze({text,role,sourceControl,box,color,visible}));
 };
 leaf(b.singleTitle,'file_upload.single_title_panel/center','title',[7,7,254,10],'center',b.singleTitleVisible,p.measurements.singleTitleWidth);
 leaf(b.leftTitle,'file_upload.dual_title_panel/left','title',[7,7,254,10],'left',b.dualTitleVisible,p.measurements.leftTitleWidth);
 leaf(b.rightTitle,'file_upload.dual_title_panel/right','title',[7,7,254,10],'right',b.dualTitleVisible,p.measurements.rightTitleWidth);
 const stack=snapshot.stackLayout,stackY=23+(30-stack.height)/2;
 leaf(b.message,'file_upload.message_text_panel/message_text','progress',[10,stackY+stack.messageY,248,10],'center',b.uploadContentVisible&&b.messageVisible,p.measurements.messageWidth);
 leaf(b.progressSize,'file_upload.progress_text_panel/progress','progress',[10,stackY+stack.progressTextY,248,10],'left',b.uploadContentVisible&&b.progressTextVisible,p.measurements.progressSizeWidth);
 leaf(b.totalSize,'file_upload.progress_text_panel/total','progress',[10,stackY+stack.progressTextY,248,10],'right',b.uploadContentVisible&&b.progressTextVisible,p.measurements.totalSizeWidth);
 // Warning uses width100% and default height, not a default width.
 if(b.warningContentVisible){const key='file_upload.warning_content_panel/message',height=p.measurements.warningHeight,text=label('mobileDataWarning');leaves.push(Object.freeze({text,role:'progress',sourceControl:key,box:Object.freeze([10,23+(30-height)/2,248,height]) as ProgressBox,color:p.bodyColor,visible:true}));}
 const buttons:FileTransmissionButtonLeaf[]=[];
 const button=(id:FileTransmissionButtonLeaf['id'],target:FileTransmissionTarget,key:keyof FileTransmissionPresentationProfile['labels'],box:ProgressBox,visible:boolean)=>{if(!visible)return;const text=label(key),sourceControl='file_upload.'+(id==='play'?'lets_go_button':id==='continue'?'continue_button':'cancel_button');buttons.push(Object.freeze({id,target,sourceControl,label:text,box:Object.freeze([...box]) as ProgressBox,visible}));};
 button('play','button.file_upload_play','play',[7,58,254,30],b.playVisible);
 button('cancel','button.file_upload_cancel','cancel',[7,58,254,30],b.cancelVisible);
 button('continue','button.file_upload_wifi_warning_continue','continue',[7,58,126,30],b.warningButtonsVisible);
 button('warning-cancel','button.file_upload_cancel','cancel',[135,58,126,30],b.warningButtonsVisible);
 const progressLabel=b.uploadContentVisible&&b.progressVisible?label('progress'):'';
 if(b.uploadContentVisible&&b.progressVisible&&!progressLabel.trim())throw new TypeError('Visible file transfer progress requires an accessible label');
 return Object.freeze({snapshot,size:Object.freeze([268,95]) as readonly[number,number],title:Object.freeze([7,7,254,10]) as ProgressBox,content:Object.freeze([10,23,248,30]) as ProgressBox,buttonsBox:Object.freeze([7,58,254,30]) as ProgressBox,texts:Object.freeze(leaves),buttons:Object.freeze(buttons),progress:Object.freeze({box:Object.freeze([10,stackY+stack.progressBarY,248,5]) as ProgressBox,visible:b.uploadContentVisible&&b.progressVisible,percentage:b.percentage,label:progressLabel})});
}
