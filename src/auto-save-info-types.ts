import type {ButtonHTMLAttributes, HTMLAttributes, ReactNode, Ref, SyntheticEvent} from 'react';

export interface AutoSaveInfoFont {readonly family:string;readonly size:number;readonly lineHeight:number}
export interface AutoSaveInfoLayout {
  /** Whole host frame; the source panel remains exactly200x180 logical units. */
  readonly size:readonly[number,number];
  /** Host-resolved main-panel origin, including native safe-zone/anchor policy. */
  readonly panelOrigin:readonly[number,number];
  readonly scale:number;readonly font:AutoSaveInfoFont;
  /** Resolved original label intrinsic boxes; no browser font-width guessing. */
  readonly titleSize:readonly[number,number];readonly acceptLabelSize:readonly[number,number];
  readonly messageAlignment:'left'|'center';readonly messageVerticalAlignment:'top'|'center';
}
export interface AutoSaveIconProps extends Omit<HTMLAttributes<HTMLSpanElement>,'children'|'dangerouslySetInnerHTML'> {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly scale:number;
  /** Explicit source strip frame0..8. The component owns no clock. */
  readonly frame:number;readonly visible:boolean;
  /** Empty means decorative. Otherwise exposes one image with this name. */
  readonly label:string;
}
export interface AutoSaveInfoActionDetail {
  readonly buttonId:'button.info_accept';readonly sourceControl:'auto_save_info.accept_button';
  readonly source:'button'|'controller';readonly event?:SyntheticEvent<HTMLElement>;
}
export interface AutoSaveInfoControllerHandle {
  /** Queues a host request; true is not proof of eventual delivery. */
  request(command:'button.info_accept'):boolean;
}
export interface AutoSaveInfoScreenProps extends Omit<HTMLAttributes<HTMLElement>,'children'|'dangerouslySetInnerHTML'|'title'> {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly open:boolean;readonly modal?:boolean;readonly inert?:boolean;
  readonly layout:AutoSaveInfoLayout;readonly title:string;readonly message:string;readonly acceptLabel:string;
  /** Host selects/localizes the original platform message, rather than UA detection. */
  readonly messageVariant:'general'|'nx'|'xbox'|'desktop'|'berwick';
  readonly icon:{readonly visible:boolean;readonly frame:number};
  /** The source helper's105% anchored offset is unresolved; supply its resolved box. */
  readonly inputHint:{readonly visible:false}|{readonly visible:true;readonly rect:readonly[number,number,number,number];readonly content:ReactNode};
  readonly disabled?:boolean;readonly readOnly?:boolean;
  readonly onAccept?:(detail:AutoSaveInfoActionDetail)=>void;
  readonly controllerRef?:Ref<AutoSaveInfoControllerHandle>;
  readonly buttonRef?:Ref<HTMLButtonElement>;
  readonly buttonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'type'|'disabled'|'hidden'>;
}
