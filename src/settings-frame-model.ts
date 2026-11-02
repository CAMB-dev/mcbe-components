import type {ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode, Ref, SyntheticEvent} from 'react';
import type {WorldSettingsFont} from './world-settings-actions';

export type SettingsFrameBox=readonly[number,number,number,number];
export interface SettingsFrameLayout {
  readonly size:readonly[number,number]; readonly scale:number;
  /** Host-resolved settings_content container, relative to this local frame.
   * Inherited default size/anchor and safe-zone evaluation are not inferred. */
  readonly dialogRect:SettingsFrameBox;
  readonly backgroundHeight:number;
  readonly variant:'navigation'|'fullscreen-content';
  readonly inputMode:'mouse'|'touch';
  /** Source slot width and paint visibility are independent. The alternate
   * reflow is an explicit Web policy, not derived from scroll_box_visible. */
  readonly mouseRailAllocation:'reserve'|'when-visible';
  /** Explicit resolved engine visibility; no native scrollbar is shown. */
  readonly selectorScrollbarVisible:boolean; readonly contentScrollbarVisible:boolean;
  readonly contentHeaderHeight:number; readonly contentFooterHeight:number;
}
export interface SettingsFramePane {
  readonly box:SettingsFrameBox; readonly viewportWidth:number; readonly contentWidth:number;
  readonly contentOffset:readonly[number,number]; readonly railReservation:number;
}
export interface SettingsFrameGeometry {
  readonly layout:SettingsFrameLayout;
  readonly background:SettingsFrameBox; readonly topBar:SettingsFrameBox;
  readonly dialogTitle:SettingsFrameBox; readonly sectionTitle:SettingsFrameBox;
  readonly selector:SettingsFramePane|null; readonly content:SettingsFramePane;
  readonly contentArea:SettingsFrameBox;
  readonly contentHeader:SettingsFrameBox; readonly contentFooter:SettingsFrameBox;
  readonly divider:SettingsFrameBox|null;
}
export interface SettingsFrameBackground {
  readonly src:string; readonly sourceSize:readonly[number,number];
  /** The literal textures/ui/White is not exact-case present in the fixed ZIP.
   * The host must make any alias/provider resolution explicit. */
  readonly resolution:'exact-source'|'host-resolved';
}
export interface SettingsFrameBack {
  readonly visible:boolean; readonly enabled:boolean; readonly label:string;
  /** Resolved hit, state-paint and glyph geometry. The source's form-fitting
   * intrinsic/default anchors are not recovered merely from its child sizes. */
  readonly box:SettingsFrameBox; readonly paintBox:SettingsFrameBox;
  readonly glyphOffset:readonly[number,number];
}
export type SettingsFrameCommand='button.menu_cancel'|'button.menu_tab_left'|'button.menu_tab_right';
export interface SettingsFrameRequest {
  readonly target:'button.menu_exit'|'button.menu_tab_left'|'button.menu_tab_right';
  readonly origin:'back'|'keyboard'|'controller'; readonly control:HTMLElement;
  readonly fromButtonId:SettingsFrameCommand|'button.menu_select';
  readonly event?:SyntheticEvent<HTMLElement>;
}
export interface SettingsFrameController {request(command:SettingsFrameCommand):boolean}
export interface SettingsFrameProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'|'title'|'content'> {
  readonly children?:never; readonly dangerouslySetInnerHTML?:never; readonly inert?:boolean;
  readonly label:string; readonly layout:SettingsFrameLayout; readonly background:SettingsFrameBackground;
  readonly font:WorldSettingsFont; readonly titleFont:WorldSettingsFont; readonly titleShadow:boolean;
  readonly titleVerticalAlignment:'top'|'center'; readonly dialogTitleAlignment:'left'|'center';
  readonly dialogTitle:string; readonly sectionTitle:string; readonly back:SettingsFrameBack;
  readonly selectorContent:ReactNode; readonly content:ReactNode;
  readonly headerContent?:ReactNode; readonly footerContent?:ReactNode;
  readonly selectorScrollLabel:string; readonly contentScrollLabel:string;
  /** Frame chrome requests only; embedded controls retain their own capabilities. */
  readonly disabled?:boolean; readonly menuCancelEnabled?:boolean; readonly modal?:boolean;
  readonly onRequest?:(detail:SettingsFrameRequest)=>void|false;
  readonly controllerRef?:Ref<SettingsFrameController>; readonly backButtonRef?:Ref<HTMLButtonElement>;
  readonly selectorViewportRef?:Ref<HTMLDivElement>; readonly contentViewportRef?:Ref<HTMLDivElement>;
  /** Known descendant host for source dropdown_area='content_area'. */
  readonly popupHostRef?:Ref<HTMLDivElement>;
  readonly backButtonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'type'|'disabled'|'hidden'>;
}

const finite=(n:number,name:string,zero=false)=>{
  if(typeof n!=='number'||!Number.isFinite(n)||n<(zero?0:Number.MIN_VALUE)||n>8192)throw new RangeError(`Settings frame ${name} must be finite ${zero?'nonnegative':'positive'} within8192.`);
};
const boolean=(value:boolean,name:string)=>{if(typeof value!=='boolean')throw new TypeError(`Settings frame ${name} must be boolean.`);};
const frozenBox=(values:[number,number,number,number]):SettingsFrameBox=>Object.freeze(values);
function snapshot(input:SettingsFrameLayout):SettingsFrameLayout {
  if(!input||!Array.isArray(input.size)||input.size.length!==2||!Array.isArray(input.dialogRect)||input.dialogRect.length!==4)throw new TypeError('Settings frame requires an explicit size and resolved dialog rectangle.');
  const [w,h]=input.size,[x,y,dw,dh]=input.dialogRect,s=input.scale;
  if(!Number.isSafeInteger(s)||s<1||s>32)throw new RangeError('Settings frame scale must be an integer1..32.');
  for(const n of[w,h,dw,dh,input.backgroundHeight]){finite(n,'extent');finite(n*s,'physical extent');}
  finite(x,'dialog X',true);finite(y,'dialog Y',true);
  if(w*h*s*s>16777216||x+dw>w||y+dh>h||dw<=80||dh<=23||h<23)throw new RangeError('Settings frame dialog must fit the finite source frame and its title/scroll insets.');
  if(input.variant!=='navigation'&&input.variant!=='fullscreen-content')throw new TypeError('Settings frame requires a source navigation/fullscreen-content variant.');
  if(input.inputMode!=='mouse'&&input.inputMode!=='touch')throw new TypeError('Settings frame input mode must be mouse or touch.');
  if(input.mouseRailAllocation!=='reserve'&&input.mouseRailAllocation!=='when-visible')throw new TypeError('Settings frame requires an explicit mouse rail allocation policy.');
  boolean(input.selectorScrollbarVisible,'selector scrollbar visibility');boolean(input.contentScrollbarVisible,'content scrollbar visibility');
  finite(input.contentHeaderHeight,'header height',true);finite(input.contentFooterHeight,'footer height',true);
  if(input.contentHeaderHeight+input.contentFooterHeight>=dh-19)throw new RangeError('Settings frame header/footer must leave a positive scrolling viewport.');
  return Object.freeze({...input,size:Object.freeze([w,h])as readonly[number,number],dialogRect:frozenBox([x,y,dw,dh])});
}
/** Source percentages and explicit host resolutions, without DOM/font measurement.
 * Fractional positions remain fractional; this is not native quantization. */
export function layoutSettingsFrame(input:SettingsFrameLayout):SettingsFrameGeometry {
  const layout=snapshot(input),[w]=layout.size,[x,y,dw,dh]=layout.dialogRect;
  const pane=(box:SettingsFrameBox,barVisible:boolean,selector=false):SettingsFramePane=>{
    const reservation=layout.inputMode==='mouse'&&(layout.mouseRailAllocation==='reserve'||barVisible)?8:0,viewport=box[2]-reservation;
    if(viewport<=4)throw new RangeError('Settings frame pane is smaller than its source content insets.');
    return Object.freeze({box,viewportWidth:viewport,contentWidth:viewport-4,
      contentOffset:Object.freeze([2,selector?2:0])as readonly[number,number],railReservation:reservation});
  };
  const full=layout.variant==='fullscreen-content',contentWidth=full?.8*dw:.6*dw-8;
  const contentX=full?x+.1*dw:x+dw-contentWidth-1,contentY=y+21,areaHeight=dh-19;
  const dialogTitleWidth=.4*dw-3,sectionTitleWidth=dw-18-dialogTitleWidth-9-22;
  const content=pane(frozenBox([contentX,contentY+layout.contentHeaderHeight,contentWidth,areaHeight-layout.contentHeaderHeight-layout.contentFooterHeight]),layout.contentScrollbarVisible);
  return Object.freeze({layout,background:frozenBox([0,0,w,layout.backgroundHeight]),topBar:frozenBox([0,0,w,23]),
    dialogTitle:frozenBox([x+18,y+3.5,dialogTitleWidth,15]),sectionTitle:frozenBox([x+18+dialogTitleWidth+9,y+3.5,sectionTitleWidth,15]),
    selector:full?null:pane(frozenBox([x+2,y+21,.4*dw-3,areaHeight]),layout.selectorScrollbarVisible,true),content,
    contentArea:frozenBox([contentX,contentY,contentWidth,areaHeight]),
    contentHeader:frozenBox([contentX,contentY,contentWidth,layout.contentHeaderHeight]),
    contentFooter:frozenBox([contentX,contentY+areaHeight-layout.contentFooterHeight,contentWidth,layout.contentFooterHeight]),
    divider:full?null:frozenBox([x+.4*dw,y+20,4,dh-18])});
}
export function settingsFrameFont(font:WorldSettingsFont,scale:number):CSSProperties {
  if(!font||typeof font.family!=='string'||!font.family.trim()||font.family.length>4096)throw new TypeError('Settings frame needs a resolved font family.');
  for(const n of[font.size,font.lineHeight]){finite(n,'font metric');finite(n*scale,'physical font metric');}
  return{fontFamily:font.family,fontSize:font.size*scale,lineHeight:`${font.lineHeight*scale}px`};
}
