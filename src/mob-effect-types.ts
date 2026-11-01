import type { HTMLAttributes, ReactNode, Ref, SyntheticEvent } from 'react';
import type { BedrockStatusEffect } from './hud-overlays';
import type { ClassicInputFontMode } from './classic-input-font';

/** The source #texture binding is open; the existing33 whole PNGs are a convenience route. */
export type MobEffectIconSource = { readonly kind:'known-effect'; readonly effect:BedrockStatusEffect }
  | { readonly kind:'whole-image'; readonly src:string; readonly naturalSize:readonly[number,number] }
  | { readonly kind:'none' };
export interface MobEffectEntry { readonly id:string; readonly name:string; readonly timer:string; readonly ambient:boolean; readonly icon:MobEffectIconSource }
/** Logical Web text metrics. Source font/lineHeight/wrapping defaults remain unknown.
 * Text is a literal intrinsic single line; CR/LF are rejected, never stripped. */
export interface MobEffectLabelFont { readonly fontSize:number; readonly lineHeight:number; readonly fontMode?:ClassicInputFontMode; readonly fontFamily?:string }
export interface MobEffectTextProfile {
  readonly name:MobEffectLabelFont; readonly timer:MobEffectLabelFont & {readonly shadow:boolean};
  readonly provenance:'explicit-web-profile'|'host-resolved';
}
export type MobEffectIconLayout = { readonly kind:'parent-percent-contain-web-policy' }
  | { readonly kind:'host-resolved'; readonly box:readonly[number,number,number,number]; readonly fit:'fill'|'contain' };
export interface MobEffectTextContext {
  readonly kind:'name'|'timer'; readonly effectId:string; readonly font:MobEffectLabelFont;
  readonly scale:number; readonly color:string; readonly shadow:boolean; readonly lineHeight:number;
}
/** Optional glyph-only seam (e.g. existing BitmapText). The component still owns
 * positions and literal accessible text. Returned graphics are aria-hidden. */
export type MobEffectTextRenderer = (text:string,context:MobEffectTextContext)=>ReactNode;
export interface MobEffectRowProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'> {
  readonly children?:never; readonly dangerouslySetInnerHTML?:never;
  readonly effect:MobEffectEntry; readonly scale:number; readonly textProfile:MobEffectTextProfile; readonly iconLayout:MobEffectIconLayout;
  readonly renderText?:MobEffectTextRenderer;
}
/** Private source-aware collection; no whole-content/row replacement renderer. */
export interface MobEffectListProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'|'inputMode'> {
  readonly children?:never; readonly dangerouslySetInnerHTML?:never;
  readonly effects:readonly MobEffectEntry[]; readonly gridDimensions:readonly[number,number]; readonly size:readonly[number,number]; readonly scale:number;
  readonly inputMode:'mouse'|'touch'; readonly touchThumbVisible:boolean; readonly textProfile:MobEffectTextProfile; readonly iconLayout:MobEffectIconLayout;
  readonly layoutPolicy:'source-formulas-parent-percent-web'; readonly label:string; readonly renderText?:MobEffectTextRenderer;
  readonly viewportRef?:Ref<HTMLDivElement>; readonly rowRefs?:Readonly<Record<string,Ref<HTMLDivElement>>>;
}
export type MobEffectCloseDetail = {
  readonly reason:'continue'; readonly target:'button.menu_continue'; readonly fromButtonId?:'button.menu_cancel'|'button.mobeffects'|'button.menu_select'|'button.menu_ok'; readonly origin:'close-button'|'escape'|'host-controller';
  readonly event?:SyntheticEvent<HTMLElement>; readonly control:HTMLElement;
} | { readonly reason:'player-hurt'; readonly sourceProperty:'close_on_player_hurt'; readonly origin:'host-player-hurt'; readonly control:HTMLElement };
export type MobEffectControllerCommand = { readonly fromButtonId:'button.menu_cancel'|'button.mobeffects'; readonly destination:'screen' }
  | { readonly fromButtonId:'button.menu_select'|'button.menu_ok'; readonly destination:'close-button' };
export interface MobEffectControllerHandle { request(command:MobEffectControllerCommand):boolean; notifyPlayerHurt():boolean }
export interface MobEffectScreenProps extends Omit<HTMLAttributes<HTMLElement>,'children'|'dangerouslySetInnerHTML'|'inputMode'> {
  readonly children?:never; readonly dangerouslySetInnerHTML?:never;
  readonly effects:readonly MobEffectEntry[]; readonly gridDimensions:readonly[number,number]; readonly availableSize:readonly[number,number]; readonly scale:number;
  readonly sourceProfile:'desktop'|'pocket'; readonly inputMode:'mouse'|'touch'; readonly closeButtonVisible:boolean; readonly touchThumbVisible:boolean;
  readonly textProfile:MobEffectTextProfile; readonly iconLayout:MobEffectIconLayout; readonly renderText?:MobEffectTextRenderer;
  readonly layoutPolicy:'source-formulas-parent-percent-web'; readonly label:string; readonly closeLabel:string; readonly scrollLabel:string;
  readonly open?:boolean; readonly disabled?:boolean; readonly modal?:boolean;
  readonly onCloseRequested:(detail:MobEffectCloseDetail)=>void; readonly controllerRef?:Ref<MobEffectControllerHandle>;
  readonly viewportRef?:Ref<HTMLDivElement>; readonly closeRef?:Ref<HTMLButtonElement>; readonly rowRefs?:Readonly<Record<string,Ref<HTMLDivElement>>>;
}

/** Private layout DTOs. Rects are logical[x,y,width,height]; no physical rounding. */
export type MobEffectRect = readonly[number,number,number,number];
export interface MobEffectLayoutTrace {
  readonly nativeCertified:false; readonly policy:'source-formulas-parent-percent-web'; readonly sourcePaths:readonly string[];
  readonly unresolved:readonly string[]; readonly formulas:Readonly<Record<string,string>>;
}
export interface MobEffectRowLayout {
  readonly effect:MobEffectEntry; readonly scale:number; readonly size:readonly[240,30]; readonly textProfile:MobEffectTextProfile; readonly iconLayout:MobEffectIconLayout;
  readonly name:{readonly x:27;readonly y:5;readonly color:'#ffffff';readonly shadow:true;readonly font:MobEffectLabelFont;readonly family:string};
  readonly timer:{readonly x:27;readonly y:number;readonly color:'rgb(70% 70% 70%)';readonly shadow:boolean;readonly font:MobEffectLabelFont;readonly family:string};
  readonly icon:{readonly controlBox:MobEffectRect;readonly paintBox:MobEffectRect;readonly fit:'fill'|'contain'}|null;
  readonly trace:MobEffectLayoutTrace;
}
export interface MobEffectListLayout {
  readonly size:readonly[number,number]; readonly scale:number; readonly inputMode:'mouse'|'touch'; readonly gridDimensions:readonly[number,number];
  /** All three rects below are in the local list root. The scroll root starts at y2. */
  readonly scrollRect:MobEffectRect; readonly viewportRect:MobEffectRect; readonly railRect:MobEffectRect;
  readonly grid:{readonly declaredWidth:150;readonly cellStep:readonly[240,30];readonly offset:readonly[number,number];readonly size:readonly[number,number];
    readonly contentSize:readonly[number,number];readonly paintWidth:number;readonly capacity:number;
    /** Cell rects are relative to the grid origin, not the viewport/list origin. */
    readonly cells:readonly{readonly index:number;readonly column:number;readonly row:number;readonly rect:MobEffectRect}[]};
  readonly trace:MobEffectLayoutTrace;
}
export interface MobEffectScreenLayout {
  readonly availableSize:readonly[number,number];readonly scale:number;readonly sourceProfile:'desktop'|'pocket';
  readonly mainBackground:MobEffectRect;readonly buttonBackground:MobEffectRect;readonly closeButton:MobEffectRect;readonly listPanel:MobEffectRect;
  readonly list:MobEffectListLayout;readonly trace:MobEffectLayoutTrace;
}
