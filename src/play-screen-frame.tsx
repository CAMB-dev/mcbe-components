import {forwardRef,useId,useRef,useState} from 'react';
import type {ButtonHTMLAttributes,CSSProperties,HTMLAttributes,KeyboardEvent,MouseEvent,Ref} from 'react';
import {useClassicNodeRef,useClassicLayoutEffect,deferClassicEvent,deferClassicRequest} from './classic-screen-lifecycle';
import {playScreenAssets} from './play-screen-assets';
import {ClassicSkin} from './classic-skin';
import type {ClassicSkinAsset} from './classic-skin';

export type PlayTabId='worlds'|'friends'|'servers';
export interface PlayFriendsTabIndicators {
 readonly showBouncing:boolean;
 readonly showNotBouncing:boolean;
 readonly showInvites:boolean;
 readonly inboxEnabled:boolean;
 /** Accepted host phase of the source offset animations, never a library clock. */
 readonly bouncePhase?:{readonly friend1Offset:readonly[number,number];readonly friend2Offset:readonly[number,number]};
}
type DataAttributes={[key:`data-${string}`]:string|number|boolean|undefined};
type ContainerProps=Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'> & DataAttributes;
type TabButtonProps=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'id'|'type'|'role'|'aria-selected'|'aria-controls'|'tabIndex'> & DataAttributes;
export interface PlayNavigationTabsProps extends Omit<ContainerProps,'onChange'|'defaultValue'> {
 readonly value:PlayTabId;
 readonly onValueChange?:(value:PlayTabId)=>void;
 readonly labels:Readonly<Record<PlayTabId,string>>;
 /** Literal provider strings; never inferred from a rendered collection. */
 readonly counts:Readonly<Record<PlayTabId,string>>;
 readonly friends:PlayFriendsTabIndicators;
 readonly scale:number;
 /** Logical game pixels; Default Classic desktop supplies282. */
 readonly width?:number;
 readonly label?:string;
 readonly disabled?:boolean;
 readonly idPrefix?:string;
 readonly panelIds?:Readonly<Record<PlayTabId,string>>;
 readonly tabButtonProps?:Readonly<Partial<Record<PlayTabId,TabButtonProps>>>;
 readonly tabRefs?:Readonly<Partial<Record<PlayTabId,Ref<HTMLButtonElement>>>>;
}
export interface PlayScreenFrameProps extends ContainerProps {
 readonly viewportSize:readonly[number,number];
 readonly scale:number;
 readonly navigation:Omit<PlayNavigationTabsProps,'width'|'scale'|'idPrefix'|'panelIds'>;
 readonly children?:import('react').ReactNode;
 /** Viewport-local popup factory siblings, outside the inset common body. */
 readonly overlays?:import('react').ReactNode;
 /** Raw #exit_button_visible: the source X is visible when this is false. */
 readonly exitButtonVisible:boolean;
 readonly onCloseRequest?:(event:MouseEvent<HTMLButtonElement>)=>void|false;
 readonly closeLabel?:string;
 readonly closeButtonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'type'> & DataAttributes;
 readonly closeButtonRef?:Ref<HTMLButtonElement>;
 /** Source282 by(viewportH-50) panel, separate from the outer viewport ref. */
 readonly panelRef?:Ref<HTMLDivElement>;
 readonly panelProps?:ContainerProps;
 /** The common body's inset6 viewport. No separate scrolling is introduced. */
 readonly contentRef?:Ref<HTMLDivElement>;
 readonly contentProps?:Omit<ContainerProps,'id'|'role'|'aria-label'|'aria-labelledby'>;
}

const tabIds=['worlds','friends','servers'] as const;
const cx=(...values:(string|undefined)[])=>values.filter(Boolean).join(' ');
const image=(asset:ClassicSkinAsset)=>`url(${JSON.stringify(asset.url)})`;
function bool(value:unknown,name:string){if(typeof value!=='boolean')throw new TypeError(`Play ${name} must be boolean.`);}
function text(value:unknown,name:string,empty=false){if(typeof value!=='string'||!empty&&!value.trim())throw new TypeError(`Play ${name} must be ${empty?'literal':'nonempty'} text.`);}
function tab(value:unknown):asserts value is PlayTabId {if(!tabIds.includes(value as PlayTabId))throw new TypeError('Play tab must be worlds, friends or servers.');}
function vector(value:unknown,name:string):asserts value is readonly[number,number]{if(!Array.isArray(value)||value.length!==2||![value[0],value[1]].every(n=>typeof n==='number'&&Number.isFinite(n)))throw new TypeError(`Play ${name} must contain two finite game-pixel numbers.`);}
function scaleValue(scale:number){if(!Number.isSafeInteger(scale)||scale<=0)throw new RangeError('Play scale must be a positive safe integer.');}
function friendsValue(friends:PlayFriendsTabIndicators){
 if(!friends||typeof friends!=='object')throw new TypeError('Play Friends indicator bindings are required.');
 for(const key of['showBouncing','showNotBouncing','showInvites','inboxEnabled'] as const)bool(friends[key],`friends.${key}`);
 if(friends.bouncePhase!==undefined){vector(friends.bouncePhase.friend1Offset,'friend1Offset');vector(friends.bouncePhase.friend2Offset,'friend2Offset');}
 if(friends.showBouncing&&!friends.bouncePhase)throw new TypeError('Visible Play Friends bouncing icons require an explicit host bouncePhase.');
}
function appearance(scale:number):CSSProperties {return {'--mc-play-scale':scale} as CSSProperties;}
function skin(asset:ClassicSkinAsset,slice:number,scale:number):CSSProperties{return {backgroundImage:slice?undefined:image(asset),borderImageSource:slice?image(asset):undefined,borderImageSlice:slice?`${slice} fill`:undefined,borderImageWidth:slice?`${slice*scale}px`:undefined};}
function Icon({asset,width,height,offset=[0,0],scale,kind}:{asset:ClassicSkinAsset;width:number;height:number;offset?:readonly[number,number];scale:number;kind:string}){
 if(!offset.every(n=>Number.isFinite(n*scale)))throw new RangeError('Play icon offset exceeds the finite CSS-pixel geometry range.');
 return <span className="mc-play-navigation__icon-section" data-source-icon={kind} style={{width:width*scale}} aria-hidden="true"><span className="mc-play-navigation__icon" style={{width:width*scale,height:height*scale,transform:`translate(calc(-50% + ${offset[0]*scale}px), calc(-50% + ${offset[1]*scale}px))`,backgroundImage:image(asset)}}/></span>;
}

/** Default Classic navigation paint. Explicit CSS centering/font metrics,
 * standard DOM roving focus and native-event veto are Web policies; source
 * snapping, provider clocks, game input services and narration are unrecovered. */
export const PlayNavigationTabs=forwardRef<HTMLDivElement,PlayNavigationTabsProps>(function PlayNavigationTabs({value,onValueChange,labels,counts,friends,scale,width=282,label='Play navigation',disabled=false,idPrefix:givenPrefix,panelIds,tabButtonProps={},tabRefs={},id,className,style,onClick,onKeyDown,...native},ref){
 tab(value);scaleValue(scale);friendsValue(friends);bool(disabled,'disabled');text(label,'navigation label');
 if(friends.bouncePhase&&![...friends.bouncePhase.friend1Offset,...friends.bouncePhase.friend2Offset].every(n=>Number.isFinite(n*scale)))throw new RangeError('Play bouncePhase exceeds the finite CSS-pixel geometry range.');
 if(!Number.isFinite(width)||width<=30||!Number.isFinite(width*scale)||(width-28)*.33<=7)throw new RangeError('Play navigation width must leave finite positive source content geometry.');
 for(const name of tabIds){text(labels?.[name],`${name} label`);text(counts?.[name],`${name} count`,true);if(panelIds)text(panelIds[name],`${name} panel id`);}
 const uid=useId(),prefix=givenPrefix??id??`mc-play-${uid}`;text(prefix,'idPrefix');
 const [root,attach]=useClassicNodeRef(ref),[worlds,attachWorlds]=useClassicNodeRef(tabRefs.worlds),[friendsButton,attachFriends]=useClassicNodeRef(tabRefs.friends),[servers,attachServers]=useClassicNodeRef(tabRefs.servers),[focused,setFocused]=useState<PlayTabId>();
 const refs={worlds,friends:friendsButton,servers},attachments={worlds:attachWorlds,friends:attachFriends,servers:attachServers};
 const blocked=(name:PlayTabId)=>disabled||!!native.hidden||!!tabButtonProps[name]?.disabled||!!tabButtonProps[name]?.hidden;
 const active=()=>!!root.current?.isConnected&&!root.current.closest('[hidden],[inert]');
 const enabled=tabIds.filter(name=>!blocked(name)),stop=focused&&enabled.includes(focused)?focused:enabled.includes(value)?value:enabled[0];
 const ownTarget=(target:EventTarget)=>tabIds.find(name=>refs[name].current===target||!!refs[name].current?.contains(target as Node));
 type Committed={value:PlayTabId;prefix:string;blocked:Record<PlayTabId,boolean>;onValueChange:typeof onValueChange};
 const committed=useRef<Committed|null>(null);
 useClassicLayoutEffect(()=>{committed.current={value,prefix,blocked:{worlds:blocked('worlds'),friends:blocked('friends'),servers:blocked('servers')},onValueChange};});
 const currentButton=(name:PlayTabId,owner:HTMLButtonElement,state:Committed)=>refs[name].current===owner&&owner.ownerDocument===root.current?.ownerDocument&&owner.isConnected&&!owner.disabled&&!owner.hidden&&!owner.closest('[hidden],[inert]')&&!state.blocked[name]&&owner.id===`${state.prefix}-tab-${name}`;
 const currentSource=(accepted:Committed,viewport:HTMLDivElement,sourceDocument=viewport.ownerDocument)=>{const state=committed.current;return !!state&&state.value===accepted.value&&state.prefix===accepted.prefix&&root.current===viewport&&viewport.ownerDocument===sourceDocument&&active();};
 const inner=width-28,widths={worlds:inner*.33,friends:inner*.33,servers:inner-inner*.33*2};
 const vars={'--mc-play-count-front':image(playScreenAssets['textures/ui/numberBGFront']),'--mc-play-count-back':image(playScreenAssets['textures/ui/numberBGBack'])} as CSSProperties;
 return <div {...native} ref={attach} id={id} className={cx('mc-play-navigation',className)} role="tablist" aria-label={native['aria-labelledby']?undefined:native['aria-label']??label} aria-orientation="horizontal" data-profile="classic-desktop-default" data-input-policy="web-roving" data-center-policy="web-default-anchors" style={{...style,...appearance(scale),...vars,width:width*scale,height:30*scale}}
  onClick={event=>{onClick?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented)return;const name=ownTarget(event.target),accepted=committed.current,viewport=root.current,owner=name?refs[name].current:null;if(!name||!accepted||!viewport||!owner||!currentSource(accepted,viewport)||!currentButton(name,owner,accepted))return;
   const sourceDocument=viewport.ownerDocument;deferClassicRequest<HTMLElement,MouseEvent<HTMLElement>>(event,owner,()=>committed.current?.onValueChange?.(name),()=>currentSource(accepted,viewport,sourceDocument)&&!!committed.current&&currentButton(name,owner,committed.current));
  }}
  onKeyDown={event=>{onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey)return;const name=ownTarget(event.target),accepted=committed.current,viewport=root.current,owner=name?refs[name].current:null;if(!name||!accepted||!viewport||!owner||!currentSource(accepted,viewport)||!currentButton(name,owner,accepted))return;
   const acceptedEnabled=tabIds.filter(tab=>!accepted.blocked[tab]);if(!acceptedEnabled.length)return;
   const rtl=event.currentTarget.ownerDocument.defaultView?.getComputedStyle(event.currentTarget).direction==='rtl',previous=rtl?'ArrowRight':'ArrowLeft',next=rtl?'ArrowLeft':'ArrowRight';if(![previous,next,'Home','End'].includes(event.key))return;
   const index=acceptedEnabled.indexOf(name),target=event.key==='Home'?acceptedEnabled[0]:event.key==='End'?acceptedEnabled.at(-1):acceptedEnabled[(index+(event.key===next?1:-1)+acceptedEnabled.length)%acceptedEnabled.length],targetOwner=target?refs[target].current:null;if(!target||!targetOwner||!currentButton(target,targetOwner,accepted))return;
   // Default-sensitive checkpoint: later React ancestors can veto before it.
   // The shared helper does not guarantee a later native key listener's timing.
   const sourceDocument=viewport.ownerDocument;deferClassicEvent<HTMLElement,KeyboardEvent<HTMLElement>>(event,owner,snapshot=>{snapshot.preventDefault();setFocused(target);committed.current?.onValueChange?.(target);const state=committed.current;if(state&&root.current===viewport&&viewport.ownerDocument===sourceDocument&&active()&&currentButton(target,targetOwner,state))targetOwner.focus();},()=>currentSource(accepted,viewport,sourceDocument)&&!!committed.current&&currentButton(name,owner,committed.current)&&currentButton(target,targetOwner,committed.current));
  }}>
  <div className="mc-play-navigation__tabs" style={{width:inner*scale}}>{tabIds.map(name=>{
   const button=tabButtonProps[name]??{},selected=value===name,leftmost=name==='worlds',suffix=leftmost?'LeftMost':'',bgStyle={
    '--mc-play-tab-back':image(playScreenAssets[`textures/ui/TabTopBack${suffix}`]),'--mc-play-tab-back-hover':image(playScreenAssets[`textures/ui/TabTopBack${suffix}Hover`]),
    '--mc-play-tab-front':image(playScreenAssets[`textures/ui/TabTopFront${suffix}`]),'--mc-play-tab-front-hover':image(playScreenAssets[`textures/ui/TabTopFront${suffix}Hover`]),
   } as CSSProperties;
   return <button {...button} key={name} ref={attachments[name]} type="button" role="tab" id={`${prefix}-tab-${name}`} aria-label={button['aria-labelledby']?undefined:button['aria-label']??`${labels[name]}, ${counts[name]}`} aria-selected={selected} aria-controls={panelIds?.[name]} disabled={disabled||button.disabled} tabIndex={name===stop?0:-1}
    className={cx('mc-play-navigation__tab',button.className)} data-play-tab={name} data-source-edge={leftmost?'leftmost':'normal'} style={{...button.style,...bgStyle,width:widths[name]*scale,height:30*scale}}
    onFocus={event=>{button.onFocus?.(event);if(!event.defaultPrevented)setFocused(name);}}>
    <span className="mc-play-navigation__tab-skin" aria-hidden="true"/>
    <span className="mc-play-navigation__sizer"><span className="mc-play-navigation__flow">
     <span className="mc-play-navigation__pad" aria-hidden="true"/>
     {name==='worlds'?<><Icon asset={playScreenAssets['textures/ui/worldsIcon']} width={16} height={17} scale={scale} kind="worlds"/><span className="mc-play-navigation__pad" aria-hidden="true"/></>:name==='servers'?<><Icon asset={playScreenAssets['textures/ui/servers']} width={15} height={15} scale={scale} kind="servers"/><span className="mc-play-navigation__pad" aria-hidden="true"/></>:<>
      {friends.showBouncing&&<><Icon asset={playScreenAssets['textures/ui/Friend2']} width={10} height={10} scale={scale} offset={friends.bouncePhase!.friend2Offset} kind="friend2-bouncing"/><Icon asset={playScreenAssets['textures/ui/Friend1']} width={10} height={10} scale={scale} offset={friends.bouncePhase!.friend1Offset} kind="friend1-bouncing"/></>}
      {friends.showNotBouncing&&<><Icon asset={playScreenAssets['textures/ui/Friend2']} width={10} height={10} scale={scale} offset={[0,-3]} kind="friend2-static"/><Icon asset={playScreenAssets['textures/ui/Friend1']} width={10} height={10} scale={scale} offset={[-5,2]} kind="friend1-static"/></>}
      {friends.showInvites&&<Icon asset={playScreenAssets[friends.inboxEnabled?'textures/ui/icon_bell':'textures/ui/invite_base']} width={20} height={20} scale={scale} offset={[-.5,-1]} kind={friends.inboxEnabled?'bell':'invite'}/>}
     </>}
     <span className="mc-play-navigation__text-stack"><span className="mc-play-navigation__label-section"><span className="mc-play-navigation__label">{labels[name]}</span></span><span className="mc-play-navigation__count-section"><span className="mc-play-navigation__count-badge"><span className="mc-play-navigation__count-skin" aria-hidden="true"/><span className="mc-play-navigation__count">{counts[name]}</span></span></span></span>
    </span></span>
   </button>;
  })}</div>
 </div>;
});

/** A Default Classic desktop frame, not the complete Play screen/provider.
 * The outer ref owns the explicit viewport; the panel and inset body have
 * separate refs. Native global menu actions and popup ownership stay with host. */
export const PlayScreenFrame=forwardRef<HTMLDivElement,PlayScreenFrameProps>(function PlayScreenFrame({viewportSize,scale,navigation,exitButtonVisible,onCloseRequest,closeLabel,closeButtonProps={},closeButtonRef,panelRef,panelProps={},contentRef,contentProps={},children,overlays,id:givenId,className,style,...native},ref){
 vector(viewportSize,'viewportSize');scaleValue(scale);bool(exitButtonVisible,'exitButtonVisible');
 const [vw,vh]=viewportSize,height=vh-50,bodyHeight=height-26;
 if(vw<=0||vh<=0||bodyHeight<=12||![vw,vh,282,height,bodyHeight].every(n=>Number.isFinite(n*scale)))throw new RangeError('Play desktop viewport must produce finite positive282 by(H-50) frame and inset content; small invalid geometry is rejected, not resized.');
 if(closeLabel!==undefined)text(closeLabel,'close label');if(!exitButtonVisible&&!closeButtonProps['aria-labelledby'])text(closeButtonProps['aria-label']??closeLabel,'close label');
 const uid=useId(),id=givenId??`mc-play-frame-${uid}`,prefix=`${id}-navigation`,bodyId=`${id}-content`;
 const [root,attach]=useClassicNodeRef(ref),[,attachPanel]=useClassicNodeRef(panelRef),[,attachContent]=useClassicNodeRef(contentRef),[close,attachClose]=useClassicNodeRef(closeButtonRef),live=useRef({exitButtonVisible,onCloseRequest});live.current={exitButtonVisible,onCloseRequest};
 const {className:panelClass,style:panelStyle,...panelNative}=panelProps,{className:contentClass,style:contentStyle,...contentNative}=contentProps,{onClick:closeClick,className:closeClass,style:closeStyle,...closeNative}=closeButtonProps;
 const panel=<div {...panelNative} key="panel" ref={attachPanel} className={cx('mc-play-frame__panel',panelClass)} style={{...panelStyle,left:(vw-282)*scale/2,top:25*scale,width:282*scale,height:height*scale}}>
   <PlayNavigationTabs {...navigation} scale={scale} width={282} idPrefix={prefix} panelIds={{worlds:bodyId,friends:bodyId,servers:bodyId}}/>
   <div className="mc-play-frame__close-holder" style={{width:30*scale,height:30*scale}}>
    <span className="mc-play-frame__close-back" aria-hidden="true" style={skin(playScreenAssets['textures/ui/XTab'],4,scale)}/>
    {!exitButtonVisible&&<button {...closeNative} ref={attachClose} type="button" className={cx('mc-play-frame__close',closeClass)} aria-label={closeNative['aria-labelledby']?undefined:closeNative['aria-label']??closeLabel} style={{...closeStyle,width:21*scale,height:21*scale}}
     onClick={event=>{closeClick?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.currentTarget.disabled)return;const owner=event.currentTarget;deferClassicRequest(event,owner,snapshot=>live.current.onCloseRequest?.(snapshot),()=>!!root.current?.isConnected&&!root.current.closest('[hidden],[inert]')&&!owner.closest('[hidden],[inert]')&&close.current===owner&&!owner.disabled&&!owner.hidden&&!live.current.exitButtonVisible);}}>
     <span className="mc-play-frame__close-glyph" aria-hidden="true" style={{'--mc-play-close-default':image(playScreenAssets['textures/ui/close_button_default_light']),'--mc-play-close-hover':image(playScreenAssets['textures/ui/close_button_hover_light']),'--mc-play-close-pressed':image(playScreenAssets['textures/ui/close_button_pressed_light'])} as CSSProperties}/>
    </button>}
   </div>
   <div className="mc-play-frame__body" style={{top:26*scale,width:282*scale,height:bodyHeight*scale}}>
    <ClassicSkin asset={playScreenAssets['textures/ui/control']} width={274} height={bodyHeight-8} scale={scale} baseClass="mc-play-frame-skin" className="mc-play-frame__underfill" errorName="Play underfill"/>
    <span className="mc-play-frame__hollow" aria-hidden="true" style={skin(playScreenAssets['textures/ui/dialog_background_hollow_4'],8,scale)}/>
    <div {...contentNative} ref={attachContent} id={bodyId} role="tabpanel" aria-labelledby={`${prefix}-tab-${navigation.value}`} className={cx('mc-play-frame__content',contentClass)} style={{...contentStyle}}>{children}</div>
   </div>
  </div>;
 return <div {...native} id={id} ref={attach} className={cx('mc-play-frame',className)} data-profile="classic-desktop-default" data-native-certified="false" style={{...style,...appearance(scale),width:vw*scale,height:vh*scale}}>{overlays==null?panel:<>{panel}{overlays}</>}</div>;
});
