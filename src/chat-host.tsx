import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, Ref, SyntheticEvent } from 'react';
import { ClassicSkin } from './classic-skin';
import { Image } from './image';
import { ScrollArea } from './scroll-area';
import { useClassicNodeRef } from './classic-screen-lifecycle';
import { chatAssets } from './chat-assets';
import { snapshotChatCapabilities, snapshotChatHost, snapshotChatProfile, validateChatRef } from './chat-data';
import type { ChatCapabilities, ChatHostCollection, ChatHostEntry, ChatHostGrid, ChatHostPlayer, ChatHostState,
  ChatPresentationProfile, ChatTextRenderContext, ChatTextRenderer, ChatWholeImage } from './chat-types';

export interface ChatHostEntryMetadata {
  readonly collection: ChatHostCollection; readonly id: string; readonly index: number;
  readonly navigation: unknown; readonly subCommand: unknown;
}
export interface ChatHostRequest {
  readonly target: 'button.menu_navigation'|'button.sub_command'|'button.teleport_clear'|'button.host_main';
  readonly control: HTMLElement; readonly event: SyntheticEvent<HTMLElement>; readonly hostEntry?: ChatHostEntryMetadata;
}
export interface ChatHostSelectionRequest {
  readonly collection: 'host_teleport_collection'; readonly id: string; readonly index: number; readonly selected: boolean;
  readonly control: HTMLInputElement; readonly event: SyntheticEvent<HTMLInputElement>; readonly hostEntry: ChatHostEntryMetadata;
}
export interface ChatHostOptionsPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'|'dangerouslySetInnerHTML'|'onChange'|'defaultValue'> {
  readonly children?: never; readonly dangerouslySetInnerHTML?: never;
  readonly host: ChatHostState; readonly capabilities: ChatCapabilities; readonly profile: ChatPresentationProfile;
  readonly disabled?: boolean; readonly readOnly?: boolean; readonly renderText?: ChatTextRenderer;
  /** Raw synchronous leaf requests. The owning ChatScreen performs the sole
   * owner-task/native-veto/latest-membership checkpoint and semantic callback. */
  readonly onRequest: (detail: ChatHostRequest) => void|false;
  readonly onHostSelectionChange: (detail: ChatHostSelectionRequest) => void|false;
}
type Rect = readonly [number,number,number,number];
interface GridPlan { readonly collection: ChatHostCollection; readonly grid: ChatHostGrid<ChatHostEntry>; readonly width: number; readonly height: number; readonly cellWidth: number }
const states = ['default','hover','pressed','locked'] as const;
const asset = (key: keyof typeof chatAssets) => chatAssets[key];
function extent(width:number,height:number,scale:number,label:string,empty=false) {
  if (![width,height].every(n=>Number.isFinite(n)&&(empty?n>=0:n>0)) || width*scale>8192 || height*scale>8192 || width*height*scale*scale>4194304)
    throw new RangeError(`${label} exceeds the finite positive Web8192-axis/4194304-pixel extent budget.`);
}
function gridPlan(collection:ChatHostCollection,grid:ChatHostGrid<ChatHostEntry>,width:number,scale:number):GridPlan {
  const height=grid.dimensions[1]*30,cellWidth=grid.dimensions[0]>0?width/grid.dimensions[0]:width;
  extent(width,height,scale,collection,true);
  if (cellWidth<=6) throw new RangeError(`${collection} computed row width must exceed the source six-unit content inset.`);
  return Object.freeze({collection,grid,width,height,cellWidth});
}

/** Private pure preflight shared with the owning Screen. Validate every known
 * child before any sibling leaf can invoke a glyph/item renderer. No hooks,
 * callback invocation, timers or I/O; opaque host payloads remain untouched. */
export function planChatHostOptions({host,capabilities,profile,disabled=false,readOnly=false,renderText,onRequest,onHostSelectionChange,...native}:ChatHostOptionsPanelProps,
  forwardedRef?:Ref<HTMLDivElement>) {
  if (native.children!==undefined || native.dangerouslySetInnerHTML!==undefined) throw new TypeError('Chat host content is data-driven.');
  if (typeof disabled!=='boolean'||typeof readOnly!=='boolean') throw new TypeError('Chat host disabled/readOnly must be boolean.');
  if (typeof onRequest!=='function'||typeof onHostSelectionChange!=='function') throw new TypeError('Chat host request callbacks are required.');
  if (renderText!==undefined&&typeof renderText!=='function') throw new TypeError('Chat host renderText must render glyphs only.');
  validateChatRef(forwardedRef,'Chat host ref');
  // Finish every known snapshot and child geometry before invoking any host
  // glyph callback. Navigation/subcommand/filesystem payloads stay opaque.
  const caps=snapshotChatCapabilities(capabilities),view=snapshotChatProfile(profile),model=snapshotChatHost(host,caps),scale=view.scale;
  const height=view.availableSize[1]-20,width=160;
  extent(width,height,scale,'host_options.host_panel');
  const scrollWidth=158,scrollHeight=86,scrollCross=caps.touch?0:7,scrollContentWidth=scrollWidth-scrollCross;
  const main=gridPlan('host_main_collection',model.main,width,scale),teleport=gridPlan('host_teleport_collection',model.teleport,width,scale),
    time=gridPlan('host_time_collection',model.time,scrollContentWidth,scale),weather=gridPlan('host_weather_collection',model.weather,width,scale),
    players=gridPlan('players_collection',model.players,scrollContentWidth,scale);
  for (const plan of [main,teleport,time,weather,players]) for (const entry of plan.grid.entries) {
    if (plan.collection==='players_collection') {
      const player=entry as ChatHostPlayer,platform=caps.platformIconsVisible&&player.platformIcon.visible;
      const labelWidth=plan.cellWidth-10-(caps.educationEdition?0:20)-(platform?17:2);
      if (labelWidth<=0) throw new RangeError('players_collection computed gamertag fill width must be positive under source picture/platform extents.');
    }
  }
  for (const [name,h] of [['main',main.height],['teleport',30+teleport.height],['time',120],['weather',30+weather.height],['players',90]] as const)
    extent(width,h,scale,`Chat host ${name} pane`,true);
  return Object.freeze({caps,view,model,scale,height,width,scrollWidth,scrollHeight,main,teleport,time,weather,players,disabled,readOnly});
}

/** Private concrete source Host Options composition. Five visibility bindings
 * remain independent. No commands, navigation, player providers or host state
 * are inferred or executed by this leaf. */
export const ChatHostOptionsPanel = forwardRef<HTMLDivElement,ChatHostOptionsPanelProps>(function ChatHostOptionsPanel({
  host,capabilities,profile,disabled=false,readOnly=false,renderText,onRequest,onHostSelectionChange,className='',style,...native
},forwardedRef) {
  const {caps,view,model,scale,height,scrollWidth,scrollHeight,main,teleport,time,weather,players}=
    planChatHostOptions({host,capabilities,profile,disabled,readOnly,renderText,onRequest,onHostSelectionChange,...native},forwardedRef);
  const [,attach]=useClassicNodeRef(forwardedRef),font=view.fonts.chrome;
  const rect=(r:Rect):CSSProperties=>({position:'absolute',left:r[0]*scale,top:r[1]*scale,width:r[2]*scale,height:r[3]*scale});
  const skin=(key:keyof typeof chatAssets,w:number,h:number,extra:CSSProperties={})=>
    <span className="mc-chat-host__skin-box" style={{...rect([0,0,w,h]),...extra}}><ClassicSkin asset={asset(key)} width={w} height={h} scale={scale} baseClass="mc-chat-host-skin" errorName="Chat host"/></span>;
  const picture=(image:ChatWholeImage,r:Rect,className='')=><Image className={`mc-chat-host__image ${className}`} src={image.src} sourceSize={image.naturalSize} size={[r[2],r[3]]} scale={scale} alt="" aria-hidden="true" style={rect(r)}/>;
  const originalImage=(key:keyof typeof chatAssets,r:Rect,filter?:string)=>picture({src:asset(key).url,naturalSize:[asset(key).width,asset(key).height],provenance:'whole-original-chat-dependency'},r,filter??'');
  const literal=(text:string,id:string,color:string,r:Rect)=><span className="mc-chat-host__label" style={{...rect(r),fontFamily:font.family,fontSize:font.logicalSize*scale,lineHeight:`${font.lineHeight*scale}px`,color,textShadow:'none'}}>
    {renderText?renderText(text,Object.freeze({role:'host-label',font:Object.freeze({...font}),scale,color,shadow:false,id}) satisfies ChatTextRenderContext):text}
  </span>;
  const metadata=(collection:ChatHostCollection,entry:ChatHostEntry,index:number):ChatHostEntryMetadata=>Object.freeze({collection,id:entry.id,index,navigation:entry.navigation,
    subCommand:collection==='players_collection'?(entry as ChatHostPlayer).gamertag:entry.subCommand});
  const focus=(entry:ChatHostEntry)=>({'data-source-focus-id':entry.focusId,'data-source-focus-up':entry.focus.up,'data-source-focus-down':entry.focus.down,'data-source-focus-left':entry.focus.left,'data-source-focus-right':entry.focus.right});
  const stateVisual=(entry:ChatHostEntry,w:number,kind:'main'|'sub'|'return'|'teleport'|'clear'|'player',selected=false)=>states.map(state=>{
    const light=kind==='main'||kind==='return'||kind==='teleport',locked=state==='locked',hover=state==='hover',pressed=state==='pressed';
    const texture:keyof typeof chatAssets=locked?'textures/ui/disabledButtonNoBorder':kind==='teleport'
      ? selected?(hover||pressed?'textures/ui/button_borderless_lightpressed':'textures/ui/button_borderless_lightpressednohover'):(hover||pressed?'textures/ui/button_borderless_lighthover':'textures/ui/button_borderless_light')
      :light?(pressed?'textures/ui/button_borderless_lightpressed':hover?'textures/ui/button_borderless_lighthover':'textures/ui/button_borderless_light')
      :(pressed?'textures/ui/button_borderless_darkpressed':hover?'textures/ui/button_borderless_darkhover':'textures/ui/button_borderless_dark');
    const color=kind==='player'?'#ffffff':locked?(light?'rgb(30% 30% 30%)':'rgb(70% 70% 70%)'):hover||pressed?'#ffffff':kind==='teleport'&&selected?'rgb(12.16% 12.16% 12.16%)':light?'rgb(30% 30% 30%)':'#ffffff';
    const text=kind==='clear'?entry.teleportName:kind==='player'?(entry as ChatHostPlayer).gamertag:entry.text;
    const labelX=kind==='sub'||kind==='return'?33:13;
    const glyphClass=kind==='teleport'?hover||pressed?'':'mc-chat-host__glyph--black':locked?'mc-chat-host__glyph--locked':light&&!hover&&!pressed?'mc-chat-host__glyph--light':'';
    return <span key={state} className={`mc-chat-host__state mc-chat-host__state--${state}`} aria-hidden="true" data-source-state={state}>
      {skin(texture,w-2,28,{left:scale,top:scale})}
      {skin('textures/ui/focus_border_white',w,30,{filter:hover||pressed?'none':'brightness(.075)'})}
      <span className="mc-chat-host__content" style={{transform:pressed&&kind!=='teleport'?`translateY(${scale}px)`:undefined}}>
        {kind==='player'?<>{(()=>{const p=entry as ChatHostPlayer,platform=caps.platformIconsVisible&&p.platformIcon.visible,pictureWidth=caps.educationEdition?0:20,platformWidth=platform?17:2;
          return <>
            {!caps.educationEdition&&<span data-source-control="host_options.player_pic_panel" style={rect([8,5,20,20])}>
              {p.gamerPicture.visible&&p.gamerPicture.image&&<>{picture(p.gamerPicture.image,[0,1,18,18])}{skin('textures/ui/pause_screen_border',20,20,{left:-scale,top:0,filter:'brightness(0)'})}</>}
              {p.localPlayerIconVisible&&originalImage('textures/ui/lan_icon',[3.5,3.5,13,13])}
            </span>}
            {literal(text,entry.id,color,[7+pictureWidth,15-font.lineHeight/2,w-10-pictureWidth-platformWidth,font.lineHeight])}
            {platform&&p.platformIcon.image&&picture(p.platformIcon.image,[w-3-platformWidth,7.5,15,15])}
          </>;
        })()}</>:<>
          {literal(text,entry.id,color,[labelX,15-font.lineHeight/2,w-labelX-3,font.lineHeight])}
          {kind==='return'?originalImage('textures/ui/arrowLeft',[13,11,8,8],glyphClass)
            :kind==='clear'?originalImage('textures/ui/arrowRight',[w-21,11,8,8],glyphClass)
            :entry.glyphVisible&&(entry.glyph?picture(entry.glyph,kind==='sub'?[5,5,20,20]:[w-21,11,8,8],glyphClass)
              :kind==='main'||kind==='teleport'?originalImage('textures/ui/arrowRight',[w-21,11,8,8],glyphClass):null)}
        </>}
      </span>
    </span>;
  });
  const control=(plan:GridPlan,entry:ChatHostEntry,index:number)=>{
    const tele=plan.collection==='host_teleport_collection'&&entry.teleportVisible,kind=plan.collection==='host_main_collection'?'main':plan.collection==='host_teleport_collection'?(tele?'teleport':'clear'):plan.collection==='players_collection'?'player':'sub';
    const text=kind==='clear'?entry.teleportName:kind==='player'?(entry as ChatHostPlayer).gamertag:entry.text,entryData=metadata(plan.collection,entry,index);
    const target=kind==='main'?'button.menu_navigation':kind==='clear'?'button.teleport_clear':'button.sub_command';
    const common={...focus(entry),'data-chat-host-collection':plan.collection,'data-chat-host-id':entry.id,'data-chat-host-index':index,'data-source-control':kind==='main'?'host_options.host_menu_grid_item':kind==='teleport'?'host_options.host_teleport_grid_item':kind==='player'?'host_options.player_grid_item':'host_options.host_sub_command_grid_item'};
    return <div key={entry.id} className="mc-chat-host__cell" style={rect([(index%plan.grid.dimensions[0])*plan.cellWidth,Math.floor(index/plan.grid.dimensions[0])*30,plan.cellWidth,30])}>
      {tele?<label className="mc-chat-host__control mc-chat-host__toggle" data-selected={String(entry.toggleSelected)} data-locked={disabled||undefined} style={{width:plan.cellWidth*scale,height:30*scale}}>
        <input {...common} type="checkbox" name="navigation_tab" checked={entry.toggleSelected} disabled={disabled} readOnly={readOnly} aria-readonly={readOnly||undefined} aria-label={text} data-source-toggle-name="navigation_tab" data-source-radio-toggle-group="true" data-source-binding="#toggle_selected"
          onChange={event=>{if(!disabled&&!readOnly)onHostSelectionChange(Object.freeze({collection:'host_teleport_collection',id:entry.id,index,selected:event.currentTarget.checked,control:event.currentTarget,event,hostEntry:entryData}));}}/>
        {stateVisual(entry,plan.cellWidth,'teleport',entry.toggleSelected)}
      </label>:<button {...common} type="button" className="mc-chat-host__control" data-kind={kind} disabled={disabled} aria-disabled={readOnly||undefined} aria-label={text} data-source-action={target}
        style={{width:plan.cellWidth*scale,height:30*scale}} onClick={event=>{if(!disabled&&!readOnly)onRequest(Object.freeze({target,control:event.currentTarget,event,hostEntry:entryData}));}}>
        {stateVisual(entry,plan.cellWidth,kind)}<span className="mc-chat-host__text-alt">{text}</span>
      </button>}
    </div>;
  };
  const grid=(plan:GridPlan)=><div className="mc-chat-host__grid" data-source-collection={plan.collection} data-grid-dimensions={plan.grid.dimensions.join(',')} style={{position:'relative',width:plan.width*scale,height:plan.height*scale}}>{plan.grid.entries.map((entry,index)=>control(plan,entry,index))}</div>;
  const returnButton=(key:'hostOption.teleport'|'hostOption.time'|'hostOption.weather')=>{
    const text=view.labels[key]??key,entry:ChatHostEntry={id:key,text,navigation:undefined,subCommand:undefined,glyph:null,glyphVisible:false,focusId:'',focus:{up:'',down:'',left:'',right:''},teleportVisible:false,toggleSelected:false,teleportName:''};
    return <button type="button" className="mc-chat-host__control mc-chat-host__return" disabled={disabled} aria-disabled={readOnly||undefined} aria-label={text} data-source-action="button.host_main" data-source-control="host_options.return_from_sub_command_button"
      style={{width:160*scale,height:30*scale}} onClick={event=>{if(!disabled&&!readOnly)onRequest(Object.freeze({target:'button.host_main',control:event.currentTarget,event}));}}>{stateVisual(entry,160,'return')}<span className="mc-chat-host__text-alt">{text}</span></button>;
  };
  const scroller=(plan:GridPlan)=><div className="mc-chat-host__scroll-panel" style={{position:'relative',width:160*scale,height:90*scale}} data-source-control="host_options.scrolling_panel">
    {skin('textures/ui/Banners',164,90,{left:-2*scale})}
    <ScrollArea className="mc-chat-host__scroll" variant={caps.touch?'touch':'document'} scale={scale} label={view.labels[plan.collection]??plan.collection} scrollbarVisibility="auto"
      style={rect([1,3,scrollWidth,scrollHeight])} contentProps={{style:{height:plan.height*scale,position:'relative'}}}>{grid(plan)}</ScrollArea>
  </div>;
  return <div {...native} ref={attach} className={`mc-chat-host ${className}`} data-source-control="host_options.host_panel" data-native-certified="false" data-chat-host-options="true"
    data-chat-host-layout={JSON.stringify({root:[0,-27,160,height],anchor:'bottom_left',subtab:[16,0],secondSubtab:[178,0],rowHeight:30,timeScrollerHeight:90,gridPlacement:'explicit-row-major-web;source-default-direction-unknown',readOnlyVisual:'hover-retained-no-selection-mutation',independentFlags:[model.mainVisible,model.teleportMainVisible,model.teleportPlayersVisible,model.timeVisible,model.weatherVisible],policy:view.sourceGeometry})}
    style={{...style,position:'absolute',left:0,bottom:27*scale,width:160*scale,height:height*scale,margin:0,padding:0,border:0,overflow:'visible',zIndex:5,'--mc-chat-host-unit':`${scale}px`,
      '--mc-skin-scroll-track':`url(${JSON.stringify(chatAssets['textures/ui/ScrollRail'].url)})`,'--mc-skin-scroll-thumb':`url(${JSON.stringify(chatAssets['textures/ui/ScrollHandle'].url)})`} as CSSProperties}>
    <div className="mc-chat-host__pane" hidden={!model.mainVisible} data-chat-host-pane="main" style={{height:main.height*scale}}>{grid(main)}</div>
    <div className="mc-chat-host__pane" hidden={!model.teleportMainVisible} data-chat-host-pane="teleport" style={{height:(30+teleport.height)*scale}}>{returnButton('hostOption.teleport')}<div style={{position:'relative',left:16*scale}}>{grid(teleport)}</div></div>
    <div className="mc-chat-host__pane" hidden={!model.teleportPlayersVisible} data-chat-host-pane="players" style={{height:90*scale,left:178*scale}}>{scroller(players)}</div>
    <div className="mc-chat-host__pane" hidden={!model.timeVisible} data-chat-host-pane="time" style={{height:120*scale}}>{returnButton('hostOption.time')}<div style={{position:'relative',left:16*scale}}>{scroller(time)}</div></div>
    <div className="mc-chat-host__pane" hidden={!model.weatherVisible} data-chat-host-pane="weather" style={{height:(30+weather.height)*scale}}>{returnButton('hostOption.weather')}<div style={{position:'relative',left:16*scale}}>{grid(weather)}</div></div>
  </div>;
});
