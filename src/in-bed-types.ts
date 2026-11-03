import type {ButtonHTMLAttributes, HTMLAttributes, Ref, SyntheticEvent, ReactNode} from 'react';

export interface InBedFont {readonly family:string; readonly size:number; readonly lineHeight:number}
export interface InBedButtonLayout {
  /** Host-resolved form-fitting outer dimensions; not a guessed font width. */
  readonly size:readonly[number,number];
  /** Normal label intrinsic size, bounded by source max120x10. */
  readonly labelSize:readonly[number,number];
}
export interface InBedControlsLayout {
  readonly scale:number; readonly font:InBedFont;
  readonly rowHeight:number;
  readonly buttons:readonly[InBedButtonLayout,InBedButtonLayout];
}
export interface InBedLayout extends Omit<InBedControlsLayout,'rowHeight'> {
  readonly size:readonly[number,number];
  /** Host-resolved safe-zone content rectangle in whole-frame logical units. */
  readonly contentRect:readonly[number,number,number,number];
  /** Resolved default-anchor/intrinsic label box. Source height remains49. */
  readonly status:{readonly origin:readonly[number,number];readonly width:number;
    readonly alignment:'left'|'center';readonly verticalAlignment:'top'|'center'};
}
export interface InBedLabels {readonly wake:string;readonly chat:string}
export type InBedAction='wake-up'|'chat';
export type InBedCommand='button.wake_up_button'|'button.chat'|'button.menu_cancel'|'button.menu_exit'|'button.menu_select'|'button.menu_ok';
export interface InBedActionDetail {
  readonly action:InBedAction;
  readonly buttonId:'button.wake_up_button'|'button.chat';
  readonly sourceControl:'bed.wake_up_button'|'bed.chat_button'|'bed.in_bed_screen';
  readonly source:'button'|'menu-cancel'|'menu-exit'|'controller';
  readonly event?:SyntheticEvent<HTMLElement>;
}
export interface InBedControllerHandle {
  /** Logical commands; no physical gamepad polling or network/game operations. */
  request(command:InBedCommand):boolean;
}
export type InBedNativeButtonProps=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'type'|'disabled'|'hidden'>;
export interface InBedControlsProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'onChange'> {
  readonly layout:InBedControlsLayout; readonly labels:InBedLabels;
  readonly disabled?:boolean;readonly readOnly?:boolean;
  readonly onAction?:(detail:InBedActionDetail)=>void;
  readonly buttonProps?:Readonly<Partial<Record<'wake'|'chat',InBedNativeButtonProps>>>;
  readonly buttonRefs?:Readonly<Partial<Record<'wake'|'chat',Ref<HTMLButtonElement>>>>;
}
export interface InBedScreenProps extends Omit<HTMLAttributes<HTMLElement>,'children'|'title'> {
  readonly open:boolean;readonly inert?:boolean;readonly modal?:boolean;
  readonly label:string;readonly status:string;readonly labels:InBedLabels;
  readonly layout:InBedLayout;
  readonly disabled?:boolean;readonly readOnly?:boolean;
  /** Host-resolved platform glyph/content, in source bottom26-high hint panel. */
  readonly inputHint:{readonly visible:boolean;readonly content?:ReactNode};
  readonly onAction?:(detail:InBedActionDetail)=>void;
  readonly controllerRef?:Ref<InBedControllerHandle>;
  readonly buttonProps?:InBedControlsProps['buttonProps'];
  readonly buttonRefs?:InBedControlsProps['buttonRefs'];
}
