import {forwardRef,useId,useRef} from 'react';
import type {KeyboardEvent,MouseEvent,ReactNode,Ref} from 'react';
import {PlayScreenFrame} from './play-screen-frame';
import type {PlayScreenFrameProps,PlayTabId} from './play-screen-frame';
import {PlayWorldsContent,PlayFriendsContent} from './play-worlds';
import type {PlayWorldsContentProps,PlayFriendsContentProps} from './play-worlds';
import {PlayServersContent} from './play-servers';
import type {PlayServersContentProps} from './play-servers';
import {PlayJoinCodeDialog,PlayHighPingDialog} from './play-popups';
import type {PlayJoinCodeDialogProps,PlayHighPingDialogProps} from './play-popups';
import {deferClassicRequest,useClassicLayoutEffect,useClassicNodeRef} from './classic-screen-lifecycle';

export type PlayExitDetail =
 | {readonly reason:'close-button';readonly target:'button.menu_exit';readonly control:HTMLButtonElement;readonly event:MouseEvent<HTMLButtonElement>}
 | {readonly reason:'escape';readonly target:'button.menu_exit';readonly control:HTMLDivElement;readonly event:KeyboardEvent<HTMLDivElement>};
export interface PlayInputHintSide {readonly size:readonly[number,number];readonly content:ReactNode}
/** Source helper intrinsics and controller glyphs belong to the host. */
export interface PlayInputHintPair {readonly visible:boolean;readonly left:PlayInputHintSide;readonly right:PlayInputHintSide}
export interface PlayScreenProps extends Omit<PlayScreenFrameProps,'children'|'overlays'|'onCloseRequest'|'inputMode'> {
 readonly inputMode:'mouse'|'touch';
 readonly worlds:Omit<PlayWorldsContentProps,'size'|'scale'|'inputMode'>;
 readonly friends:Omit<PlayFriendsContentProps,'size'|'scale'|'inputMode'>;
 readonly servers:Omit<PlayServersContentProps,'size'|'scale'|'inputMode'>;
 readonly paneRefs?:Readonly<Partial<Record<PlayTabId,Ref<HTMLDivElement>>>>;
 readonly onExitRequest?:(detail:PlayExitDetail)=>void|false;
 /** Independent factory instances; their source visibility remains controlled. */
 readonly popups?:{readonly joinByCode?:Omit<PlayJoinCodeDialogProps,'scale'>;readonly highPing?:Omit<PlayHighPingDialogProps,'scale'>};
 /** Independent keyboard/gamepad source visibility; never inferred from pointer type. */
 readonly inputHints?:{readonly keyboard?:PlayInputHintPair;readonly gamepad?:PlayInputHintPair};
}

const tabs=['worlds','friends','servers'] as const;
function hints(value:PlayScreenProps['inputHints'],scale:number){
 if(value===undefined)return;
 for(const pair of Object.values(value)){
  if(!pair||typeof pair.visible!=='boolean')throw new TypeError('Play input hint visibility must be explicit.');
  for(const side of[pair.left,pair.right]){
   if(!side||!Array.isArray(side.size)||side.size.length!==2||![side.size[0],side.size[1]].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&Number.isFinite(n*scale)))throw new TypeError('Play input hints require finite resolved game-pixel sizes.');
   if(pair.visible&&(side.content===null||side.content===undefined))throw new TypeError('Visible Play input hints require host glyph content.');
  }
 }
}
function Hint({pair,kind,viewport,scale}:{pair:PlayInputHintPair;kind:string;viewport:readonly[number,number];scale:number}){
 if(!pair.visible)return null;
 return <>{(['left','right'] as const).map(side=>{
  const hint=pair[side],x=(viewport[0]-282)/2+(side==='left'?-hint.size[0]-1:283);
  return <span key={side} ref={node=>{node?.setAttribute('inert','');}} className="mc-play-screen__input-hint" data-play-hint={`${kind}-${side}`} aria-hidden="true"
   style={{left:x*scale,top:25*scale,width:hint.size[0]*scale,height:hint.size[1]*scale}}>{hint.content}</span>;
 })}</>;
}

/** Default Classic desktop composition. Includes the real three content
 * families and two source popup factories; external Realm card families and
 * services remain explicit dependencies, not simulated game behavior.
 * Native route selection, text rasterization and pixel snapping are unqualified. */
export const PlayScreen=forwardRef<HTMLDivElement,PlayScreenProps>(function PlayScreen({
 viewportSize,scale,inputMode,navigation,worlds,friends,servers,paneRefs,popups,inputHints,onExitRequest,
 id:givenId,className,onKeyDown,onCompositionStartCapture,onCompositionEndCapture,...native
},ref){
 if(inputMode!=='mouse'&&inputMode!=='touch')throw new TypeError('Play Screen inputMode must be mouse or touch.');
 hints(inputHints,scale);
 const generated=useId(),id=givenId??`mc-play-screen-${generated}`,[root,attach]=useClassicNodeRef(ref),composing=useRef(new Set<EventTarget>());
 const latest=useRef({navigation,onExitRequest});
 useClassicLayoutEffect(()=>{latest.current={navigation,onExitRequest};});
 const active=(origin?:Element)=>!!root.current?.isConnected&&!root.current.closest('[hidden],[inert]')&&(!origin||origin.isConnected&&!origin.closest('[hidden],[inert]'));
 const composition=()=>{for(const target of composing.current)if(!root.current?.contains(target as Node))composing.current.delete(target);return composing.current.size>0;};
 const contentSize:readonly[number,number]=[270,viewportSize[1]-88];
 const overlays=<>
  {inputHints?.keyboard&&<Hint pair={inputHints.keyboard} kind="keyboard" viewport={viewportSize} scale={scale}/>}
  {inputHints?.gamepad&&<Hint pair={inputHints.gamepad} kind="gamepad" viewport={viewportSize} scale={scale}/>}
  {popups?.joinByCode&&<PlayJoinCodeDialog {...popups.joinByCode} scale={scale} style={{...popups.joinByCode.style,position:'absolute',inset:0}}/>}
  {popups?.highPing&&<PlayHighPingDialog {...popups.highPing} scale={scale} style={{...popups.highPing.style,position:'absolute',inset:0}}/>}
 </>;
 return <PlayScreenFrame {...native} ref={attach} id={id} viewportSize={viewportSize} scale={scale} navigation={navigation}
  role={native.role??'region'} aria-label={native['aria-label']??'Play'} className={['mc-play-screen',className].filter(Boolean).join(' ')} overlays={overlays}
  onCloseRequest={event=>latest.current.onExitRequest?.(Object.freeze({reason:'close-button',target:'button.menu_exit',control:event.currentTarget,event}))}
  onCompositionStartCapture={event=>{composing.current.add(event.target);onCompositionStartCapture?.(event);}}
  onCompositionEndCapture={event=>{composing.current.delete(event.target);onCompositionEndCapture?.(event);}}
  onKeyDown={event=>{
   onKeyDown?.(event);
   const owner=event.currentTarget,origin=event.target as Element;
   if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.repeat||event.altKey||event.ctrlKey||event.metaKey||composition()||typeof origin.closest!=='function'||!owner.contains(origin)||!active(origin))return;
   // Popup Escape belongs to the top modal, even before its deferred request
   // runs. React portal events outside this viewport are likewise excluded.
   if(origin.closest('[role="dialog"],[role="alertdialog"]'))return;
   if(event.key==='Escape'&&latest.current.onExitRequest){
    deferClassicRequest(event,owner,snapshot=>latest.current.onExitRequest?.(Object.freeze({reason:'escape',target:'button.menu_exit',control:owner,event:snapshot})),()=>active(origin));
   }else if((event.key==='['||event.key===']')&&!origin.closest('input,textarea,[contenteditable="true"],[role="combobox"],[role="listbox"]')){
    const before=latest.current.navigation;if(before.disabled)return;
    const enabled=tabs.filter(tab=>!before.tabButtonProps?.[tab]?.disabled&&!before.tabButtonProps?.[tab]?.hidden);
    const index=enabled.indexOf(before.value);if(index<0||enabled.length===0)return;
    const next=enabled[(index+(event.key===']'?1:-1)+enabled.length)%enabled.length]!;
    deferClassicRequest(event,owner,()=>{
     latest.current.navigation.onValueChange?.(next);
     const button=owner.ownerDocument.getElementById(`${id}-navigation-tab-${next}`);
     if(button&&owner.contains(button))button.focus();
    },()=>active(origin)&&latest.current.navigation.value===before.value&&!latest.current.navigation.disabled);
   }
  }}>
  <div className="mc-play-screen__pane" data-play-pane="worlds" hidden={navigation.value!=='worlds'}><PlayWorldsContent {...worlds} ref={paneRefs?.worlds} size={contentSize} scale={scale} inputMode={inputMode}/></div>
  <div className="mc-play-screen__pane" data-play-pane="friends" hidden={navigation.value!=='friends'}><PlayFriendsContent {...friends} ref={paneRefs?.friends} size={contentSize} scale={scale} inputMode={inputMode}/></div>
  <div className="mc-play-screen__pane" data-play-pane="servers" hidden={navigation.value!=='servers'}><PlayServersContent {...servers} ref={paneRefs?.servers} size={contentSize} scale={scale} inputMode={inputMode}/></div>
 </PlayScreenFrame>;
});
