import {forwardRef,useRef,useState} from 'react';
import type {CSSProperties,HTMLAttributes,ReactNode,Ref,SyntheticEvent} from 'react';
import {InventoryToolbar} from './inventory-screens';
import {Furnace,BlastFurnace,Smoker} from './processing';
import type {FurnaceProps} from './processing';
import {FurnaceRecipeBook} from './furnace-recipe-book';
import type {FurnaceRecipeBookProps} from './furnace-recipe-book';
import {useClassicNodeRef} from './classic-screen-lifecycle';

/** Source #is_recipe_book_layout is caller state. No viewport breakpoint or
 * game inventory mode is inferred from the available browser width. */
export type FurnaceScreenLayout='recipe-book'|'compact';
export interface FurnaceScreenFrameProps extends Omit<HTMLAttributes<HTMLElement>,'children'|'title'> {
 readonly title:string;readonly recipeBook:ReactNode;readonly children:ReactNode;
 readonly layout?:FurnaceScreenLayout;
 /** Explicit Web initial value; not a recovered engine binding default. */
 readonly defaultLayout?:FurnaceScreenLayout;
 readonly onLayoutChange?:(layout:FurnaceScreenLayout)=>void;
 readonly showClose?:boolean;readonly onHelp?:()=>void;readonly onClose?:()=>void;
 readonly toolbarLabel?:string;readonly recipeBookLayoutLabel?:string;readonly compactLayoutLabel?:string;readonly helpLabel?:string;readonly closeLabel?:string;
 /** Locks toolbar/help/close/Escape only. Slot content and processing panes
  * retain their own host-controlled interaction state. */
 readonly disabled?:boolean;
}
interface ScreenChromeProps extends Omit<FurnaceScreenFrameProps,'title'|'recipeBook'|'children'> {
 readonly title?:string;readonly recipeBook:FurnaceRecipeBookProps;readonly processing?:Omit<FurnaceProps,'title'>;
}
export interface FurnaceScreenProps extends ScreenChromeProps{}
export interface BlastFurnaceScreenProps extends ScreenChromeProps{}
export interface SmokerScreenProps extends ScreenChromeProps{}

function validate(layout:unknown,label:string):asserts layout is FurnaceScreenLayout{if(layout!=='recipe-book'&&layout!=='compact')throw new TypeError('Furnace '+label+' must be recipe-book or compact');}
function literal(value:unknown,label:string){if(typeof value!=='string'||value.length>1048576)throw new TypeError('Furnace '+label+' must be bounded literal text');}
function button(node:EventTarget,owner:HTMLElement):node is HTMLButtonElement{const view=owner.ownerDocument.defaultView;return !!view&&node instanceof view.HTMLButtonElement;}
function visible(node:HTMLElement){return node.isConnected&&!node.closest('[hidden],[inert]')&&!node.matches(':disabled');}

/** Classic furnace stack: 146 book +4 fold +176 processing =326 game pixels,
 * or an intrinsic176-wide processing stack. The GUI2 CSS plane doubles those
 * dimensions. This is not InventoryScreenFrame's fixed326/padding75 profile.
 * Native full-screen pixels, engine renderer overlays and source focus timing
 * remain unqualified; no imageRender profile is supplied by this component. */
export const FurnaceScreenFrame=forwardRef<HTMLElement,FurnaceScreenFrameProps>(function FurnaceScreenFrame({
 title,recipeBook,children,layout,defaultLayout='recipe-book',onLayoutChange,showClose=true,onHelp,onClose,
 toolbarLabel='Furnace toolbar',recipeBookLayoutLabel='Recipe book layout',compactLayoutLabel='Furnace inventory layout',helpLabel='How to use this furnace',closeLabel='Close furnace',disabled=false,
 className,style,onKeyDown,onKeyDownCapture,onCompositionStart,onCompositionEnd,...native
},ref){
 validate(defaultLayout,'defaultLayout');if(layout!==undefined)validate(layout,'layout');literal(title,'title');
 for(const[label,value]of Object.entries({toolbarLabel,recipeBookLayoutLabel,compactLayoutLabel,helpLabel,closeLabel}))literal(value,label);
 if(typeof showClose!=='boolean'||typeof disabled!=='boolean')throw new TypeError('Furnace toolbar flags must be boolean');
 for(const[label,value]of Object.entries({onLayoutChange,onHelp,onClose}))if(value!==undefined&&typeof value!=='function')throw new TypeError('Furnace '+label+' must be callable');
 const[internal,setInternal]=useState(defaultLayout),current=layout??internal,[root,attach]=useClassicNodeRef(ref),toolbarEvent=useRef<SyntheticEvent<HTMLDivElement>|null>(null),composing=useRef(new Set<EventTarget>());
 const active=()=>!disabled&&!!root.current&&visible(root.current);
 const composition=()=>{for(const target of composing.current)if(!root.current?.contains(target as Node))composing.current.delete(target);return composing.current.size>0;};
 const toolbarAllowed=()=>{const event=toolbarEvent.current;return active()&&!composition()&&!event?.defaultPrevented&&!event?.nativeEvent.defaultPrevented;};
 const width=current==='recipe-book'?652:352,toolbarWidth=showClose?198:168;
 return <div className="mc-furnace-screen-scroll"><section {...native} ref={attach} className={['mc-furnace-screen-frame',className].filter(Boolean).join(' ')} aria-label={native['aria-label']??title}
  data-furnace-layout={current} data-layout={current} data-native-certified="false" data-source-profile="classic-gui2-intrinsic-furnace" data-source-game-size={`${width/2}x166`}
  style={{...style,width,height:332,'--mc-furnace-toolbar-width':`${toolbarWidth}px`}as CSSProperties}
  onCompositionStart={event=>{composing.current.add(event.target);onCompositionStart?.(event);}} onCompositionEnd={event=>{composing.current.delete(event.target);onCompositionEnd?.(event);}}
  onKeyDownCapture={event=>{
   onKeyDownCapture?.(event);if(!active()||event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||composition()||!button(event.target,event.currentTarget))return;
   const source=event.target,search=source.matches('.mc-furnace-recipe-categories [data-category="search"]');
   const target=event.key==='ArrowRight'&&search?event.currentTarget.querySelector<HTMLButtonElement>('.mc-furnace-screen-frame__toolbar [data-layout="recipe-book"]'):event.key==='ArrowLeft'&&current==='recipe-book'&&source.matches('.mc-furnace-screen-frame__toolbar [data-layout="recipe-book"]')?event.currentTarget.querySelector<HTMLButtonElement>('.mc-furnace-recipe-categories [data-category="search"]'):null;
   if(target&&visible(target)){event.preventDefault();target.focus();}
  }}
  onKeyDown={event=>{onKeyDown?.(event);if(active()&&!event.defaultPrevented&&!event.nativeEvent.defaultPrevented&&!event.nativeEvent.isComposing&&event.keyCode!==229&&!composition()&&!event.repeat&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&event.key==='Escape'&&onClose){event.preventDefault();onClose();}}}>
  <div className="mc-furnace-screen-frame__book" hidden={current==='compact'} data-source-control="furnace.recipe_book_panel">{recipeBook}</div>
  <div className="mc-furnace-screen-frame__fold" hidden={current==='compact'} data-source-control="common.center_fold" aria-hidden="true"/>
  <div className="mc-furnace-screen-frame__right" data-source-control="furnace.right_panel">{children}</div>
  <InventoryToolbar className="mc-furnace-screen-frame__toolbar" layouts={['recipe-book','survival']} value={current==='compact'?'survival':'recipe-book'}
   label={toolbarLabel} modeLabels={{'recipe-book':recipeBookLayoutLabel,survival:compactLayoutLabel}} helpLabel={helpLabel} closeLabel={closeLabel} showClose={showClose} disabled={disabled}
   onClickCapture={event=>{toolbarEvent.current=event;}}
   onValueChange={next=>{if(!toolbarAllowed()||next==='creative')return;const selected:FurnaceScreenLayout=next==='survival'?'compact':'recipe-book';if(layout===undefined)setInternal(selected);onLayoutChange?.(selected);}}
   onHelp={()=>{if(toolbarAllowed())onHelp?.();}} onClose={()=>{if(toolbarAllowed())onClose?.();}}/>
 </section></div>;
});

function Screen({variant,p,forwardedRef}:{variant:'furnace'|'blast-furnace'|'smoker';p:ScreenChromeProps;forwardedRef:Ref<HTMLElement>}){
 const{title=variant==='blast-furnace'?'Blast Furnace':variant==='smoker'?'Smoker':'Furnace',recipeBook,processing,className,...chrome}=p;
 const Right=variant==='blast-furnace'?BlastFurnace:variant==='smoker'?Smoker:Furnace;
 return <FurnaceScreenFrame {...chrome} ref={forwardedRef} title={title} className={[`mc-${variant}-screen`,className].filter(Boolean).join(' ')} recipeBook={<FurnaceRecipeBook {...recipeBook}/>}><Right {...processing} title={title}/></FurnaceScreenFrame>;
}
export const FurnaceScreen=forwardRef<HTMLElement,FurnaceScreenProps>(function FurnaceScreen(p,ref){return <Screen variant="furnace" p={p} forwardedRef={ref}/>;});
export const BlastFurnaceScreen=forwardRef<HTMLElement,BlastFurnaceScreenProps>(function BlastFurnaceScreen(p,ref){return <Screen variant="blast-furnace" p={p} forwardedRef={ref}/>;});
export const SmokerScreen=forwardRef<HTMLElement,SmokerScreenProps>(function SmokerScreen(p,ref){return <Screen variant="smoker" p={p} forwardedRef={ref}/>;});
