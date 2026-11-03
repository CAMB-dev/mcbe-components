import {StrictMode,createRef,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';import {createPortal,flushSync} from 'react-dom';
import {InBedControls,InBedScreen} from '../src';
import type {InBedActionDetail,InBedCommand,InBedControllerHandle,InBedLayout} from '../src';
import '../src/in-bed.css';
export const bedLayout:InBedLayout={size:[320,200],contentRect:[0,0,320,200],scale:2,font:{family:'monospace',size:8,lineHeight:10},
 buttons:[{size:[64,20],labelSize:[54,10]},{size:[72,20],labelSize:[62,10]}],status:{origin:[50,105],width:220,alignment:'center',verticalAlignment:'center'}};
interface Settings{open:boolean;part:'screen'|'controls';modal:boolean;disabled:boolean;readOnly:boolean;inert:boolean;hidden:boolean;strict:boolean;setterRef:boolean;nested:boolean;fakeHint:boolean;veto:'none'|'leaf'|'react'|'native';tag:string;status:string;layout:InBedLayout}
const defaults:Settings={open:true,part:'screen',modal:true,disabled:false,readOnly:false,inert:false,hidden:false,strict:false,setterRef:false,nested:false,fakeHint:false,veto:'none',tag:'first',status:'2/3 players sleeping',layout:bedLayout};
const refs={root:createRef<HTMLElement>(),controls:createRef<HTMLDivElement>(),wake:createRef<HTMLButtonElement>(),chat:createRef<HTMLButtonElement>(),controller:createRef<InBedControllerHandle>()};
const api:any={events:[],refs,retained:[],settings:undefined,configure:undefined,request:undefined,controller:null};
declare global{interface Window{inBedFixture:any;inBedInitial?:Partial<Settings>}}
window.inBedFixture=api;
function Fixture(){
 const[s,set]=useState(()=>({...defaults,...window.inBedInitial})),[controller,setController]=useState<InBedControllerHandle|null>(null),host=useRef<HTMLDivElement>(null);api.settings=s;
 api.configure=(patch:Partial<Settings>)=>flushSync(()=>set(old=>({...old,...patch})));api.controller=s.setterRef?controller:refs.controller.current;
 api.request=(command:InBedCommand,index?:number)=>(index===undefined?(s.setterRef?controller:refs.controller.current):api.retained[index])?.request(command)??false;
 api.retain=()=>{api.retained.push(s.setterRef?controller:refs.controller.current);return api.retained.length-1;};
 useLayoutEffect(()=>{api.controller=s.setterRef?controller:refs.controller.current;});
 useLayoutEffect(()=>{const owner=host.current;if(!owner)return;const veto=(event:Event)=>{if(s.veto==='native')event.preventDefault();};owner.addEventListener('click',veto);owner.addEventListener('keydown',veto);return()=>{owner.removeEventListener('click',veto);owner.removeEventListener('keydown',veto);};},[s.veto]);
 const receive=(detail:InBedActionDetail)=>api.events.push({...detail,event:undefined,tag:s.tag,currentTarget:detail.event?.currentTarget.tagName,defaultPrevented:detail.event?.defaultPrevented});
 const controls={layout:{...s.layout,rowHeight:s.layout.size[1]*.15},labels:{wake:'Leave Bed',chat:'Open Chat'},disabled:s.disabled,readOnly:s.readOnly,onAction:receive,buttonRefs:{wake:refs.wake,chat:refs.chat},buttonProps:{wake:{onClick:(e:any)=>{if(s.veto==='leaf')e.preventDefault();}}}};
 const element=s.part==='controls'?<InBedControls {...controls} ref={refs.controls}/>:<InBedScreen {...controls} ref={refs.root} layout={s.layout} open={s.open} modal={s.modal} hidden={s.hidden} inert={s.inert} label="Sleeping" status={s.status} inputHint={{visible:true,content:s.fakeHint?<button id="hint-control" data-in-bed-action="chat">Host hint</button>:<span>Select</span>}} controllerRef={s.setterRef?setController:refs.controller}/>;
 return <div id="host" ref={host} onClick={e=>{if(s.veto==='react')e.preventDefault();}} onKeyDown={e=>{if(s.veto==='react')e.preventDefault();}}>{s.strict?<StrictMode>{element}</StrictMode>:element}
  {s.nested&&createPortal(<InBedScreen {...controls} buttonRefs={undefined} label="Nested sleeping" status="Nested" open modal layout={s.layout} inputHint={{visible:false}} onAction={d=>api.events.push({action:d.action,owner:'nested'})} style={{position:'fixed',left:0,top:0}}/>,document.body)}
 </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
