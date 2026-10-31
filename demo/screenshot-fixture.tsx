import {StrictMode,useCallback,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ScreenshotFlash} from '../src/screenshot-flash';
import type {ScreenshotFlashControl,ScreenshotFlashFinishedDetail,ScreenshotFlashProps} from '../src/screenshot-flash';
import '../src/screenshot-flash.css';
const whiteCandidate=new URL('./screenshot-assets/white-candidate.png',import.meta.url).href;

export interface ScreenshotQASettings {
  present:boolean;size:'parent'|readonly[number,number];scale:number;durationMs:number;trigger:string|number|null;
  visible:boolean;hidden:boolean;cancelled:boolean;control?:ScreenshotFlashControl;easing:'web-in-expo'|'linear'|'quadratic';
  motion:'system'|'animate'|'skip';handlerVersion:number;acceptFinish:boolean;
  refMode:'plain'|'cleanup'|'object';refVersion:number;
}
interface QA {
  ready:boolean;configure:(patch:Partial<ScreenshotQASettings>)=>void;settings:ScreenshotQASettings;ref:HTMLDivElement|null;
  events:({kind:'finished';detail:ScreenshotFlashFinishedDetail;handlerVersion:number}|{kind:'under-click'|'caller-click'})[];
  history:{time:number;patch:Partial<ScreenshotQASettings>}[];unmount:()=>void;
  refEvents:{kind:'attach'|'null'|'cleanup';version:number;mode:'plain'|'cleanup'}[];objectRef:{current:HTMLDivElement|null}|null;
}
declare global {interface Window{ screenshotQAInitial?:Partial<ScreenshotQASettings>;screenshotQA:QA;screenshotRAF:{times:number[];requested:number[];cancelled:number[]};}}

// Observe exact public clock inputs without changing callback arguments/timing.
const realRAF=window.requestAnimationFrame.bind(window),realCancel=window.cancelAnimationFrame.bind(window);
window.screenshotRAF={times:[],requested:[],cancelled:[]};
window.requestAnimationFrame=callback=>{const id=realRAF(time=>{window.screenshotRAF.times.push(time);callback(time);});window.screenshotRAF.requested.push(id);return id;};
window.cancelAnimationFrame=id=>{window.screenshotRAF.cancelled.push(id);realCancel(id);};
const initial:ScreenshotQASettings={present:true,size:[180,120],scale:1,durationMs:320,trigger:null,visible:true,hidden:false,cancelled:false,easing:'web-in-expo',motion:'animate',handlerVersion:0,acceptFinish:false,refMode:'plain',refVersion:0,...window.screenshotQAInitial};
const qa:QA=window.screenshotQA={ready:false,configure:()=>{},settings:initial,ref:null,events:[],history:[],unmount:()=>{},refEvents:[],objectRef:null};
const quadratic=(progress:number)=>progress*progress;
const image={src:whiteCandidate,sourceSize:[15,15] as const};
function App(){
 const [value,setValue]=useState(initial),objectRef=useRef<HTMLDivElement>(null),ref=useCallback((node:HTMLDivElement|null)=>{qa.ref=node;qa.refEvents.push({kind:node?'attach':'null',version:value.refVersion,mode:'plain'});},[value.refVersion]);
 const cleanupRef=useCallback((node:HTMLDivElement|null)=>{qa.ref=node;qa.refEvents.push({kind:node?'attach':'null',version:value.refVersion,mode:'cleanup'});if(node)return()=>{qa.refEvents.push({kind:'cleanup',version:value.refVersion,mode:'cleanup'});if(qa.ref===node)qa.ref=null;};},[value.refVersion]);
 useLayoutEffect(()=>{qa.ready=true;qa.settings=value;qa.objectRef=objectRef;if(value.refMode==='object')qa.ref=objectRef.current;qa.configure=patch=>{qa.history.push({time:performance.now(),patch});flushSync(()=>setValue(old=>({...old,...patch})));};qa.unmount=()=>flushSync(()=>setValue(old=>({...old,present:false})));},[value]);
 const shared={id:'qa-screenshot',className:'caller-flash-class','data-caller':'retained',durationMs:value.durationMs,flashImage:image,trigger:value.trigger,visible:value.visible,hidden:value.hidden,cancelled:value.cancelled,control:value.control,easing:value.easing==='quadratic'?quadratic:value.easing,motion:value.motion,
  onClick:()=>qa.events.push({kind:'caller-click'}),onFinished:(detail:ScreenshotFlashFinishedDetail)=>{qa.events.push({kind:'finished',detail:{...detail},handlerVersion:value.handlerVersion});if(value.acceptFinish)setValue(old=>({...old,trigger:null}));}};
 const props:ScreenshotFlashProps=value.size==='parent'?{...shared,size:'parent'}:{...shared,size:value.size,scale:value.scale};
 return <><div className="screenshot-stage"><button id="qa-under" onClick={()=>qa.events.push({kind:'under-click'})}>Underlying real button</button>{value.present?<ScreenshotFlash {...props} ref={value.refMode==='object'?objectRef:value.refMode==='cleanup'?cleanupRef:ref}/>:null}</div><output id="qa-status">Independent original-candidate material; native White alias unqualified</output></>;
}
document.body.dataset.pixel=String(new URLSearchParams(location.search).has('pixel'));
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('strict')?<StrictMode><App/></StrictMode>:<App/>);
