import {forwardRef, useRef, useState} from 'react';
import type {ButtonHTMLAttributes, CSSProperties, HTMLAttributes, MouseEvent, ReactNode, Ref} from 'react';
import {Button} from './components';
import {Image} from './image';
import {ScrollArea} from './scroll-area';
import type {ClassicSkinAsset} from './classic-skin';
import {ClassicSkin} from './classic-skin';
import {playScreenAssets} from './play-screen-assets';
import {progressAssets} from './progress-assets';
import {useClassicLayoutEffect, useClassicNodeRef, deferClassicRequest} from './classic-screen-lifecycle';

/** Private shared Play source leaves. Engine bindings and services are host data. */
export interface PlaySourceImage {readonly src:string;readonly sourceSize:readonly[number,number];readonly alt?:string}
export interface PlayActionDetail {
  readonly target:string;readonly control:HTMLButtonElement;readonly event:MouseEvent<HTMLButtonElement>;
  readonly collection?:string;readonly index?:number;readonly id?:string;readonly payload?:unknown;
}
export type PlayActionHandler=(detail:PlayActionDetail)=>void|false;
export function playScale(value:number):number {if(!Number.isSafeInteger(value)||value<1||value>32)throw new RangeError('Play scale must be an integer from1 to32.');return value;}
export function playDimension(value:number,name='dimension',zero=false):number {if(!Number.isFinite(value)||value>(8192)||value<(zero?0:Number.MIN_VALUE))throw new RangeError(`Play ${name} must be finite ${zero?'nonnegative':'positive'} and within8192.`);return value;}
export function playSize(value:readonly[number,number],scale:number):readonly[number,number] {playScale(scale);if(!Array.isArray(value)||value.length!==2)throw new TypeError('Play size requires two logical axes.');for(const n of value)playDimension(n*scale,'physical size');if(value[0]*value[1]*scale*scale>16777216)throw new RangeError('Play size exceeds Web pixel budget.');return value;}
export function playText(value:string,name='text'):string {if(typeof value!=='string'||value.length>1048576)throw new TypeError(`Play ${name} requires bounded text.`);return value;}
export function playImage(value:PlaySourceImage,name='image'):PlaySourceImage {if(!value||typeof value!=='object'||typeof value.src!=='string'||!value.src.trim()||value.src.length>8192||/[\u0000-\u001f\u007f]/.test(value.src))throw new TypeError(`Play ${name} requires a whole caller-owned URL.`);for(const n of value.sourceSize??[])if(!Number.isSafeInteger(n)||n<=0||n>32768)throw new RangeError('Play source image axes must be positive bounded integers.');if(!Array.isArray(value.sourceSize)||value.sourceSize.length!==2)throw new TypeError('Play source image dimensions are required.');return value;}
export function playAsset(path:string):ClassicSkinAsset {const asset=(playScreenAssets as Readonly<Record<string,ClassicSkinAsset>>)[path];if(!asset)throw new TypeError(`Play source material is not supplied: ${path}`);return asset;}
export function playStyle(scale:number,style?:CSSProperties):CSSProperties {playScale(scale);return {'--mc-play-scale':scale,...style}as CSSProperties;}
export function PlaySourceBackground({asset,scale}:{asset:ClassicSkinAsset;scale:number}){
  playScale(scale);
  const node=useRef<HTMLSpanElement|null>(null),[paint,setPaint]=useState<{width:number;height:number}|null>(null);
  useClassicLayoutEffect(()=>{
    const element=node.current,view=element?.ownerDocument.defaultView;if(!element||!view)return;
    let active=true;
    const update=(width:number,height:number)=>{
      if(!active)return;
      const next=Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0?{width,height}:null;
      if(next&&(width>8192||height>8192||width*height>16777216))throw new RangeError('Play measured skin exceeds the finite Web pixel budget.');
      setPaint(previous=>previous?.width===next?.width&&previous?.height===next?.height?previous:next);
    };
    // Used CSS dimensions and ResizeObserver contentRect are untransformed CSS
    // pixels. The positioning wrapper has no border/padding to subtract.
    const used=view.getComputedStyle(element);update(Number.parseFloat(used.width),Number.parseFloat(used.height));
    const observer=view.ResizeObserver?new view.ResizeObserver(entries=>{for(const entry of entries)if(entry.target===element)update(entry.contentRect.width,entry.contentRect.height);}):undefined;
    observer?.observe(element);
    return()=>{active=false;observer?.disconnect();};
  },[scale]);
  const raw=asset.metadata?.nineslice_size;
  const cuts=typeof raw==='number'?[raw,raw,raw,raw]:raw;
  const style:CSSProperties=cuts?{borderStyle:'solid',borderColor:'transparent',borderWidth:`${cuts[1]!*scale}px ${cuts[2]!*scale}px ${cuts[3]!*scale}px ${cuts[0]!*scale}px`,borderImageSource:`url(${JSON.stringify(asset.url)})`,borderImageSlice:`${cuts[1]} ${cuts[2]} ${cuts[3]} ${cuts[0]} fill`,borderImageWidth:1}:{backgroundImage:`url(${JSON.stringify(asset.url)})`,backgroundSize:'100% 100%'};
  return <span ref={node} aria-hidden="true" className="mc-play-source-background" data-material-paint={paint?'classic-skin':'ssr-fallback'}>
    {paint?<ClassicSkin asset={asset} width={paint.width/scale} height={paint.height/scale} scale={scale} baseClass="mc-play-source-skin" errorName="Play"/>:<span className="mc-play-source-background__fallback" style={style}/>}
  </span>;
}

export interface PlaySourceButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'type'|'dangerouslySetInnerHTML'> {
  readonly label:string;readonly target:string;readonly scale:number;readonly onAction?:PlayActionHandler;readonly children?:ReactNode;
  /** Private opt-in for textual rows: use the native name from visible content
   * unless the caller supplies an explicit ARIA naming attribute. */
  readonly labelFromContent?:boolean;
  readonly selected?:boolean;readonly readOnly?:boolean;readonly collection?:string;readonly index?:number;readonly itemId?:string;readonly payload?:unknown;
  readonly surface?:'dark'|'light'|'outline';
}
export const PlaySourceButton=forwardRef<HTMLButtonElement,PlaySourceButtonProps>(function PlaySourceButton({
  label,target,scale,onAction,children,labelFromContent,selected,readOnly,collection,index,itemId,payload,surface='dark',disabled,className,style,onClick,onKeyDown,...native
},ref){
  playText(label,'button label');playText(target,'action target');playScale(scale);
  if(labelFromContent!==undefined&&typeof labelFromContent!=='boolean')throw new TypeError('Play content-derived naming flag must be boolean.');
  if(!['dark','light','outline'].includes(surface))throw new TypeError('Play button surface is invalid.');
  if(index!==undefined&&(!Number.isSafeInteger(index)||index<0))throw new RangeError('Play collection index must be nonnegative.');
  const stem=surface==='light'?'button_borderless_light':'button_borderless_dark';
  const skinVars={
    '--mc-play-normal':`url(${JSON.stringify(playAsset(`textures/ui/${stem}`).url)})`,
    '--mc-play-hover':`url(${JSON.stringify(playAsset(`textures/ui/${stem==='button_borderless_light'?'button_borderless_lighthover':'button_borderless_darkhover'}`).url)})`,
    '--mc-play-pressed':`url(${JSON.stringify(playAsset(`textures/ui/${stem==='button_borderless_light'?'button_borderless_lightpressed':'button_borderless_darkpressed'}`).url)})`,
    '--mc-play-disabled':`url(${JSON.stringify(playAsset('textures/ui/disabledButtonNoBorder').url)})`,
  }as CSSProperties;
  const [,attach]=useClassicNodeRef(ref),latest=useRef({disabled,readOnly,target,collection,index,itemId,payload,onAction});
  useClassicLayoutEffect(()=>{latest.current={disabled,readOnly,target,collection,index,itemId,payload,onAction};});
  return <Button {...native} ref={attach} type="button" disabled={disabled||readOnly} aria-label={native['aria-label']??(labelFromContent?undefined:label)} aria-pressed={native['aria-pressed']??selected}
    data-play-target={target} data-selected={selected||undefined} data-surface={surface}
    className={['mc-play-source-button',className].filter(Boolean).join(' ')} style={playStyle(scale,{...skinVars,...style})}
    onKeyDown={event=>{onKeyDown?.(event);if(!event.defaultPrevented&&(event.nativeEvent.isComposing||event.keyCode===229)&&['Enter',' '].includes(event.key))event.preventDefault();}}
    onClick={event=>{
      onClick?.(event);if(disabled||readOnly||event.defaultPrevented||event.nativeEvent.defaultPrevented)return;
      const owner=event.currentTarget,identity={target,collection,index,itemId,payload};
      deferClassicRequest(event,owner,snapshot=>latest.current.onAction?.(Object.freeze({target,control:owner,event:snapshot,...collection===undefined?{}:{collection},...index===undefined?{}:{index},...itemId===undefined?{}:{id:itemId},...payload===undefined?{}:{payload}})),()=>{
        const current=latest.current;return !current.disabled&&!current.readOnly&&!owner.closest('[hidden],[inert]')&&Object.entries(identity).every(([key,value])=>current[key as keyof typeof identity]===value);
      });
    }}>{children??label}</Button>;
});

export interface PlaySourceScrollProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'inputMode'|'dangerouslySetInnerHTML'> {
  readonly size:readonly[number,number];readonly scale:number;readonly inputMode:'mouse'|'touch';readonly label:string;readonly children?:ReactNode;
  readonly sourceLayout?:'offsets'|'server-pane';
  readonly widerTouchArea?:boolean;
  readonly viewportRef?:Ref<HTMLDivElement>;readonly viewportProps?:HTMLAttributes<HTMLDivElement>;readonly contentProps?:HTMLAttributes<HTMLDivElement>;readonly thumbVisible?:boolean;
}
/** Pure source boxes, in logical units. The1px loss belongs to the entire
 * scrolling_panel_base, before viewport/bar layout; it is not bar padding. */
export function planPlaySourceScrollGeometry(size:readonly[number,number],scale:number,inputMode:'mouse'|'touch',sourceLayout:'offsets'|'server-pane'='offsets',widerTouchArea=false){
  playSize(size,scale);if(inputMode!=='mouse'&&inputMode!=='touch')throw new TypeError('Play scroll requires explicit mouse/touch input mode.');if(sourceLayout!=='offsets'&&sourceLayout!=='server-pane')throw new TypeError('Play source scroll layout is invalid.');if(typeof widerTouchArea!=='boolean')throw new TypeError('Play widerTouchArea must be boolean.');
  const outer=Object.freeze({x:sourceLayout==='offsets'?2:0,y:2,width:size[0]-(sourceLayout==='offsets'?4:0),height:size[1]-4});
  const paneWidth=outer.width-(inputMode==='touch'&&widerTouchArea?0:1),viewportWidth=paneWidth-(inputMode==='mouse'?9:0),contentWidth=viewportWidth-4;
  if(contentWidth<=0||outer.height<=4)throw new RangeError('Play scroll size must exceed its source insets.');
  return Object.freeze({outer,paneWidth,paneHeight:outer.height,viewportWidth,contentWidth,contentX:2,barReserved:inputMode==='mouse'?9:0});
}
export const PlaySourceScroll=forwardRef<HTMLDivElement,PlaySourceScrollProps>(function PlaySourceScroll({size,scale,inputMode,label,children,sourceLayout='offsets',widerTouchArea=false,viewportRef,viewportProps,contentProps,thumbVisible,className,style,...native},ref){
  const geometry=planPlaySourceScrollGeometry(size,scale,inputMode,sourceLayout,widerTouchArea);playText(label);
  const [,attach]=useClassicNodeRef(ref),[,attachViewport]=useClassicNodeRef(viewportRef);
  if(sourceLayout!=='offsets'&&sourceLayout!=='server-pane')throw new TypeError('Play source scroll layout is invalid.');
  return <div {...native} ref={attach} className={['mc-play-source-scroll',className].filter(Boolean).join(' ')} data-input-mode={inputMode} data-source-layout={sourceLayout} data-native-certified="false"
    style={playStyle(scale,{...style,width:size[0]*scale,height:size[1]*scale})}>
    <div className="mc-play-source-scroll__offsets" data-play-source-layer="offsets" style={{left:geometry.outer.x*scale,top:geometry.outer.y*scale,width:geometry.outer.width*scale,height:geometry.outer.height*scale}}>
      <ScrollArea data-play-source-layer="pane" variant={inputMode==='mouse'?'document':'touch'} scale={scale} style={{width:geometry.paneWidth*scale,height:geometry.paneHeight*scale}} label={label} scrollbarVisibility="always" thumbVisible={thumbVisible??inputMode==='mouse'} viewportRef={attachViewport} viewportProps={viewportProps} contentProps={contentProps}>
        <div className="mc-play-source-scroll__stack">{children}</div>
      </ScrollArea>
    </div>
  </div>;
});

export interface PlayStatusProps {readonly text:string;readonly scale:number;readonly heading?:string;readonly height?:number;readonly surface?:'banner'|'dark'|'none'}
export function PlayStatus({text,scale,heading,height,surface='dark'}:PlayStatusProps){
  playText(text);if(heading!==undefined)playText(heading);playScale(scale);if(height!==undefined)playDimension(height*scale,'status height');
  const background=surface==='none'?undefined:playAsset(surface==='banner'?'textures/ui/mainbanners':'textures/ui/BannersLight');
  return <section className="mc-play-status" style={playStyle(scale)}>
    {heading!==undefined&&<div className="mc-play-section-label">{heading}</div>}
    <div className="mc-play-status__body" style={{height:height===undefined?undefined:height*scale}}>{background&&<PlaySourceBackground asset={background} scale={scale}/>}<span>{text}</span></div>
  </section>;
}
export interface PlayLoadingProps {readonly label:string;readonly scale:number;readonly height:number;readonly frame:number;readonly barsVisible:boolean;readonly placeholderRows:number}
export function PlayLoading({label,scale,height,frame,barsVisible,placeholderRows}:PlayLoadingProps){
  playText(label);playScale(scale);playDimension(height*scale,'loading height');if(!Number.isSafeInteger(frame)||frame<0||frame>9)throw new RangeError('Play loading frame must be0..9.');if(!Number.isSafeInteger(placeholderRows)||placeholderRows<0||placeholderRows>1000)throw new RangeError('Play placeholder rows must be explicit0..1000.');
  const asset=progressAssets['textures/ui/loading_bar'],background=playAsset('textures/ui/mainbanners');
  return <div className="mc-play-loading" aria-label={label} style={playStyle(scale,{height:height*scale})} data-placeholder-rows={placeholderRows} data-frame={frame}>
    <PlaySourceBackground asset={background} scale={scale}/>
    <span aria-hidden="true" className="mc-play-loading__placeholders" style={{height:placeholderRows*29*scale}}>{Array.from({length:placeholderRows},(_,index)=><span key={index} data-source-placeholder-row={index} style={{display:'block',height:29*scale}}/>)}</span>
    <span className="mc-play-loading__label">{label}</span>
    {barsVisible&&<span className="mc-play-loading__clip" aria-hidden="true"><Image src={asset.url} sourceSize={[asset.width,asset.height]} size={[asset.width,asset.height]} scale={scale} alt="" style={{position:'absolute',left:-frame*64*scale,top:0,filter:'brightness(.7)'}}/></span>}
  </div>;
}
export interface PlayWarningProps {readonly text:string;readonly moreInfoLabel:string;readonly moreInfoWidth:number;readonly height:number;readonly scale:number;readonly onAction?:PlayActionHandler;readonly disabled?:boolean;readonly readOnly?:boolean}
export function PlayWarning({text,moreInfoLabel,moreInfoWidth,height,scale,onAction,disabled,readOnly}:PlayWarningProps){
  playText(text);playText(moreInfoLabel);playDimension(moreInfoWidth*scale);playDimension(height*scale);const bg=playAsset('textures/ui/greyBorder'),icon=playAsset('textures/ui/infobulb');
  return <div className="mc-play-warning" style={playStyle(scale,{height:height*scale})}>
    <PlaySourceBackground asset={bg} scale={scale}/>
    <Image src={icon.url} sourceSize={[icon.width,icon.height]} size={[15,19]} scale={scale} alt=""/>
    <span className="mc-play-warning__text">{text}</span>
    <PlaySourceButton label={moreInfoLabel} target="button.realms_warning_more_info" surface="light" scale={scale} onAction={onAction} disabled={disabled} readOnly={readOnly} style={{width:moreInfoWidth*scale,height:20*scale}}/>
  </div>;
}
