import {createRef,StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ScrollArea,ScrollBar} from '../src/scroll-area';
import type {ScrollOrientation,ScrollPosition} from '../src/scroll-area';
import '../src/styles.css';

export interface ScrollTouchSettings {
  scale:number; width:number; height:number; contentWidth:number; contentHeight:number;
  orientation:ScrollOrientation|'both'; thumbVisible?:boolean; minThumbSize?:number;
  value:number; max:number; pageSize:number; accept:boolean; disabled:boolean; hidden:boolean;
  barOrientation:ScrollOrientation; barMounted:boolean; areaMounted:boolean; prevent:boolean;
}
const defaults:ScrollTouchSettings={scale:1,width:240,height:120,contentWidth:720,contentHeight:720,orientation:'both',value:40,max:400,pageSize:100,accept:true,disabled:false,hidden:false,barOrientation:'vertical',barMounted:true,areaMounted:true,prevent:false};
const refs={area:createRef<HTMLDivElement>(),viewport:createRef<HTMLDivElement>(),bar:createRef<HTMLDivElement>()};
type Event={kind:'bar';value:number}|{kind:'scroll';position:ScrollPosition}|{kind:'pointer-down'|'lost-capture';pointerId:number};
interface QA {settings:ScrollTouchSettings;events:Event[];refs:typeof refs;configure:(patch:Partial<ScrollTouchSettings>)=>void;unmount:()=>void}
declare global {interface Window {scrollTouchInitial?:Partial<ScrollTouchSettings>;scrollTouchQA:QA}}
const root=createRoot(document.getElementById('root')!);
const qa:QA={settings:defaults,events:[],refs,configure:()=>{},unmount:()=>root.unmount()};window.scrollTouchQA=qa;
function App(){
 const [s,set]=useState(()=>({...defaults,...window.scrollTouchInitial}));qa.settings=s;qa.configure=patch=>set(old=>({...old,...patch}));
 return <main><button id="touch-sink">Outside focus</button><div className="scroll-touch-pan"><div className="scroll-touch-host">
  {s.areaMounted&&<ScrollArea id="touch-area" ref={refs.area} viewportRef={refs.viewport} variant="touch" scale={s.scale} orientation={s.orientation} label="Touch archive" thumbVisible={s.thumbVisible} minThumbSize={s.minThumbSize}
   style={{width:s.width,height:s.height}} viewportProps={{id:'touch-viewport'}} contentProps={{id:'touch-content',style:{width:s.contentWidth,height:s.contentHeight}}}
   onScrollPositionChange={position=>qa.events.push({kind:'scroll',position})}><input id="touch-note" aria-label="Native note" defaultValue="abcdef"/><p>Independent native content</p></ScrollArea>}
 </div></div><div className="scroll-touch-pan"><div className="scroll-touch-host">
  {s.barMounted&&<ScrollBar id="touch-bar" ref={refs.bar} variant="touch" scale={s.scale} orientation={s.barOrientation} label="Controlled touch" controls="touch-viewport" value={s.value} max={s.max} pageSize={s.pageSize} thumbVisible={s.thumbVisible} minThumbSize={s.minThumbSize} hidden={s.hidden} disabled={s.disabled}
   style={s.barOrientation==='vertical'?{height:180}:{width:180}} onValueChange={value=>{qa.events.push({kind:'bar',value});if(s.accept)set(old=>({...old,value}))}}
   onKeyDown={event=>{if(s.prevent)event.preventDefault()}} onPointerDown={event=>{qa.events.push({kind:'pointer-down',pointerId:event.pointerId});if(s.prevent)event.preventDefault()}} onLostPointerCapture={event=>qa.events.push({kind:'lost-capture',pointerId:event.pointerId})}/>}
 </div></div><output aria-label="Accepted touch settings">{JSON.stringify(s)}</output></main>;
}
root.render(location.search.includes('strict')?<StrictMode><App/></StrictMode>:<App/>);
