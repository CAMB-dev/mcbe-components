import {forwardRef,useId} from 'react';
import type {CSSProperties,HTMLAttributes,MouseEvent,ReactNode,Ref} from 'react';
import {OreScrollArea} from './ore-scroll-area';

/** Explicit source wc margins in physical CSS pixels. Negative finite margins
 * are retained: the source safe-zone formula does not clamp them to zero. */
export interface OreScreenSafeArea {readonly top:number;readonly left:number;readonly right:number}
export interface OreScreenFrameProps extends Omit<HTMLAttributes<HTMLElement>,'title'|'children'|'inputMode'> {
  readonly title:ReactNode;
  readonly backLabel:string;
  readonly onBack:(event:MouseEvent<HTMLButtonElement>)=>void;
  /** Optional caller-owned decorative image/icon. No private/default art is drawn. */
  readonly backIcon?:ReactNode;
  readonly backButtonRef?:Ref<HTMLButtonElement>;
  readonly backDisabled?:boolean;
  readonly children:ReactNode;
  /** Host footer node, in normal flow after the flex body; no invented footer skin. */
  readonly footer?:ReactNode;
  /** Actual local host extent in physical CSS pixels, independent of source window. */
  readonly size:readonly[number,number];
  /** Explicit source window CSS extent used by the source70/128rem breakpoints. */
  readonly viewportSize:readonly[number,number];
  readonly safeArea:OreScreenSafeArea;
  /** Existing Web Ore convention: one source rem is guiScale×5 CSS pixels. */
  readonly guiScale?:number;
  readonly locale?:string;
  /** False exposes a flex body for children which already own their scroller. */
  readonly scroll?:boolean;
  /** Required for scrolling non-string titles; string title is the default name. */
  readonly scrollLabel?:string;
  readonly inputMode?:'mouse'|'touch';
  /** Independent source qp/rf track exclusion, in CSS pixels. Dde defaults to0. */
  readonly scrollBottomInset?:number;
  /** Explicit host-resolved extra flow space. No automatic4rem+wc.safeBottom. */
  readonly extraBottom?:number;
  /** The inner body container, not the root or the scroll viewport. */
  readonly bodyRef?:Ref<HTMLDivElement>;
}

function extent(value:readonly[number,number],name:string,bounded:boolean){
  if(!Array.isArray(value)||value.length!==2||Array.from(value).some(n=>!Number.isFinite(n)||n<=0)
    ||bounded&&(value.some(n=>n>8192)||value[0]*value[1]>16777216))
    throw new RangeError(`OreScreenFrame ${name} requires a positive finite CSS-pixel pair${bounded?' within the Web extent budget':''}.`);
}
function appearance(guiScale:number,locale:string|undefined):CSSProperties {
  if(!Number.isFinite(guiScale)||guiScale<=0||!Number.isFinite(5*guiScale)||5*guiScale>8192)
    throw new RangeError('OreScreenFrame guiScale must give a positive finite Web unit.');
  if(locale!==undefined&&typeof locale!=='string')throw new TypeError('OreScreenFrame locale must be text.');
  const code=locale?.replaceAll('-','_').toLowerCase();
  const family=code==='zh_cn'?'Noto Sans SC':code==='zh_tw'?'Noto Sans TC':code?.startsWith('ja')?'Noto Sans JP':code?.startsWith('ko')?'Noto Sans KR':code?.startsWith('ar_')?'Noto Sans AR':'Noto Sans';
  return {'--mc-ore-unit':`${guiScale*5}px`,'--mc-ore-min-border':`${Math.max(Math.floor(guiScale/2),1)}px`,
    '--mc-ore-fallback':`"${family}","Noto Sans","Noto Sans SC","Noto Sans TC","Noto Sans JP","Noto Sans KR","Noto Sans AR",sans-serif`} as CSSProperties;
}

/** Source O_/tO shell with explicit host size/window/safe margins. It does not
 * create a modal, glass pane, focus trap, global scroll lock or back navigation.
 * The source header flow is safeTop+4.4rem nav+.4rem strip; its .2rem bottom
 * drop shadow is absolute paint. Font registration and back art remain host-owned. */
export const OreScreenFrame=forwardRef<HTMLElement,OreScreenFrameProps>(function OreScreenFrame({
  title,backLabel,onBack,backIcon,backButtonRef,backDisabled=false,children,footer,size,viewportSize,safeArea,
  guiScale=1,locale,scroll=true,scrollLabel,inputMode='mouse',scrollBottomInset=0,extraBottom=0,bodyRef,
  className,style,...native
},ref){
  const uid=useId(),units=appearance(guiScale,locale);
  extent(size,'size',true);extent(viewportSize,'viewportSize',false);
  if(!safeArea||typeof safeArea!=='object'||['top','left','right'].some(key=>!Number.isFinite(safeArea[key as keyof OreScreenSafeArea])))
    throw new RangeError('OreScreenFrame safeArea requires explicit finite top,left,right CSS-pixel margins.');
  if(typeof backLabel!=='string'||!backLabel.trim()||typeof onBack!=='function')throw new TypeError('OreScreenFrame requires a back label and native-button handler.');
  if(typeof backDisabled!=='boolean'||typeof scroll!=='boolean')throw new TypeError('OreScreenFrame scroll and backDisabled must be boolean.');
  if(inputMode!=='mouse'&&inputMode!=='touch')throw new TypeError('OreScreenFrame inputMode must be mouse or touch.');
  if(!Number.isFinite(scrollBottomInset)||!Number.isFinite(extraBottom)||extraBottom<0)
    throw new RangeError('OreScreenFrame track exclusion must be finite and extraBottom must be nonnegative CSS pixels.');
  const label=scrollLabel??(typeof title==='string'?title:undefined);
  if(scroll&&(typeof label!=='string'||!label.trim()))throw new TypeError('OreScreenFrame scrolling content needs an accessible scrollLabel.');
  const unit=guiScale*5,breakpoint=viewportSize[0]<70*unit?'narrow':viewportSize[0]<128*unit?'tablet':'desktop';
  const content=<>{children}</>;
  return <section {...native} ref={ref} className={['mc-ore-screen-frame',className].filter(Boolean).join(' ')}
    aria-labelledby={native['aria-labelledby']??(native['aria-label']===undefined?`${uid}-title`:undefined)}
    data-ore-screen-breakpoint={breakpoint} data-native-certified="false"
    style={{...units,width:size[0],height:size[1],'--mc-ore-screen-safe-top':`${safeArea.top}px`,
      '--mc-ore-screen-safe-left':`${safeArea.left}px`,'--mc-ore-screen-safe-right':`${safeArea.right}px`,...style} as CSSProperties}>
    <header className="mc-ore-screen-frame__header">
      <div className="mc-ore-screen-frame__safe-header">
        <div className="mc-ore-screen-frame__nav">
          <div className="mc-ore-screen-frame__left">
            <button type="button" className="mc-ore-screen-frame__back" ref={backButtonRef} disabled={backDisabled}
              aria-label={backLabel} onClick={event=>{if(!event.defaultPrevented)onBack(event);}}>
              {backIcon===undefined?<span className="mc-ore-screen-frame__back-text">{backLabel}</span>
                :<span aria-hidden="true" className="mc-ore-screen-frame__back-icon">{backIcon}</span>}
            </button>
          </div>
          <div className="mc-ore-screen-frame__center"><h2 id={`${uid}-title`} className="mc-ore-screen-frame__title">{title}</h2></div>
        </div>
        <span className="mc-ore-screen-frame__specular" aria-hidden="true"/>
      </div>
      <div className="mc-ore-screen-frame__strip" aria-hidden="true"/>
      <span className="mc-ore-screen-frame__shadow" aria-hidden="true"/>
    </header>
    <div className="mc-ore-screen-frame__body-space">
      <div ref={bodyRef} className="mc-ore-screen-frame__body" data-scroll-owner={scroll?'frame':'children'}>
        {scroll?<OreScrollArea label={label!} guiScale={guiScale} inputMode={inputMode} bottomInset={scrollBottomInset}>{content}</OreScrollArea>:content}
      </div>
    </div>
    {extraBottom>0&&<div aria-hidden="true" className="mc-ore-screen-frame__extra" style={{height:extraBottom}}/>}
    {footer!==undefined&&footer!==null&&<div className="mc-ore-screen-frame__footer">{footer}</div>}
  </section>;
});
