import type {ButtonHTMLAttributes,HTMLAttributes,ReactNode,Ref,SyntheticEvent} from 'react';

export interface ContentLogFont {readonly family:string;readonly size:number;readonly lineHeight:number}
export type ContentLogShadow=null|{readonly color:string;readonly offset:readonly[number,number]};
export interface ContentLogMessageRecord {readonly id:string;readonly text:string;readonly height?:number}
export interface ContentLogTextContext {readonly runKey:string;readonly id:string;readonly font:ContentLogFont;readonly width:number;readonly height:number|null;readonly scale:number;readonly linePadding:1;readonly color:'#ffffff';readonly shadow:ContentLogShadow;readonly sourceControl:'content_log_history.content_log_message'}
export type ContentLogTextRenderer=(text:string,context:ContentLogTextContext)=>ReactNode;
export interface ContentLogMessagesProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'> {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly runKey:string;readonly messages:readonly ContentLogMessageRecord[];
  readonly size:readonly[number,number];readonly scale:number;readonly font:ContentLogFont;
  /** Native label defaults are not inferred. line_padding1 is added separately. */
  readonly shadow:ContentLogShadow;readonly heightPolicy:'web-intrinsic'|'host-resolved';
  readonly label:string;readonly viewportRef?:Ref<HTMLDivElement>;
  readonly renderText?:ContentLogTextRenderer;
}
export interface ContentLogActionMetrics {
  readonly copyLabelSize:readonly[number,number];readonly clearLabelSize:readonly[number,number];
  /** Resolved native default vertical anchors, relative to the content wrapper. */
  readonly copyIconY:number;readonly clearIconY:number;readonly copyLabelY:number;readonly clearLabelY:number;
}
export type ContentLogAction='copy'|'clear'|'close';
export type ContentLogCommand='button.copy_to_clipboard'|'button.clear'|'button.menu_cancel'|'button.menu_exit'|'button.menu_select'|'button.menu_ok';
export interface ContentLogActionDetail {
  readonly runKey:string;readonly action:ContentLogAction;
  readonly buttonId:'button.copy_to_clipboard'|'button.clear'|'button.menu_exit';
  readonly sourceControl:'content_log_history.clipboard_button'|'content_log_history.clear_button'|'content_log_history.content_log_history_screen'|'common.close_button';
  readonly source:'button'|'controller'|'menu-cancel';readonly event?:SyntheticEvent<HTMLElement>;
}
export interface ContentLogControllerHandle {request(command:ContentLogCommand):boolean}
export type ContentLogNativeButtonProps=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'type'|'disabled'|'hidden'>;
export interface ContentLogActionsProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'> {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly runKey:string;readonly width:number;readonly scale:number;readonly font:ContentLogFont;
  readonly metrics:ContentLogActionMetrics;readonly labels:{readonly copy:string;readonly clear:string};
  readonly disabled?:boolean;readonly readOnly?:boolean;readonly inert?:boolean;
  readonly onRequest?:(detail:ContentLogActionDetail)=>void;
  readonly buttonRefs?:Readonly<Partial<Record<'copy'|'clear',Ref<HTMLButtonElement>>>>;
  readonly buttonProps?:Readonly<Partial<Record<'copy'|'clear',ContentLogNativeButtonProps>>>;
}
export interface ContentLogHistoryLayout {
  readonly size:readonly[number,number];readonly dialogRect:readonly[number,number,number,number];readonly scale:number;
  readonly titleFont:ContentLogFont;readonly bodyFont:ContentLogFont;readonly actionFont:ContentLogFont;
  readonly titleWidth:number;readonly bodyShadow:ContentLogShadow;readonly actions:ContentLogActionMetrics;
}
export interface ContentLogHistoryScreenProps extends Omit<HTMLAttributes<HTMLElement>,'children'|'dangerouslySetInnerHTML'|'title'> {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly open:boolean;readonly runKey:string;readonly layout:ContentLogHistoryLayout;
  readonly title:string;readonly labels:{readonly copy:string;readonly clear:string;readonly close:string;readonly messages:string};
  readonly messages:readonly ContentLogMessageRecord[];readonly heightPolicy:ContentLogMessagesProps['heightPolicy'];
  readonly renderText?:ContentLogTextRenderer;
  /** False selects the source no-buttons dialog, hiding BOTH copy and clear. */
  readonly supportsClipboardSet:boolean;readonly closeVisible:boolean;
  readonly modal?:boolean;readonly disabled?:boolean;readonly readOnly?:boolean;readonly inert?:boolean;
  readonly onRequest?:(detail:ContentLogActionDetail)=>void;readonly controllerRef?:Ref<ContentLogControllerHandle>;
  readonly viewportRef?:Ref<HTMLDivElement>;readonly closeRef?:Ref<HTMLButtonElement>;
  readonly closeProps?:ContentLogNativeButtonProps;
  readonly buttonRefs?:ContentLogActionsProps['buttonRefs'];readonly buttonProps?:ContentLogActionsProps['buttonProps'];
}
