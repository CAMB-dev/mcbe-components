import {StrictMode,createRef,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';import {createPortal,flushSync} from 'react-dom';
import {AutoSaveInfoScreen,AutoSaveIcon} from '../src';
import type {AutoSaveInfoLayout,AutoSaveInfoControllerHandle,AutoSaveInfoActionDetail} from '../src';
import '../src/auto-save-info.css';
export const autoSaveLayout:AutoSaveInfoLayout={size:[320,200],panelOrigin:[60,10],scale:2,font:{family:'monospace',size:8,lineHeight:10},titleSize:[120,10],acceptLabelSize:[24,10],messageAlignment:'left',messageVerticalAlignment:'top'};
const defaults={open:true,modal:true,disabled:false,readOnly:false,inert:false,hidden:false,strict:false,setterRef:false,nested:false,veto:'none',tag:'first',message:'Your world saves automatically.',frame:0,visible:true,part:'screen',layout:autoSaveLayout};
type Settings=typeof defaults;
const refs={root:createRef<HTMLElement>(),button:createRef<HTMLButtonElement>(),controller:createRef<AutoSaveInfoControllerHandle>()};
const api:any={events:[],refs,retained:[],controller:null};
declare global{interface Window{autoSaveInitial?:Partial<Settings>;autoSaveFixture:any}}
window.autoSaveFixture=api;
function Fixture(){
 const[s,set]=useState(()=>({...defaults,...window.autoSaveInitial})),[controller,setController]=useState<AutoSaveInfoControllerHandle|null>(null),host=useRef<HTMLDivElement>(null);api.settings=s;
 api.configure=(patch:Partial<Settings>)=>flushSync(()=>set(old=>({...old,...patch})));
 api.request=(command='button.info_accept',index?:number)=>(index===undefined?(s.setterRef?controller:refs.controller.current):api.retained[index])?.request(command)??false;
 api.retain=()=>{api.retained.push(s.setterRef?controller:refs.controller.current);return api.retained.length-1;};
 useLayoutEffect(()=>{api.controller=s.setterRef?controller:refs.controller.current;});
 useLayoutEffect(()=>{const node=host.current;if(!node)return;const listener=(e:Event)=>{if(s.veto==='native')e.preventDefault();};node.addEventListener('click',listener);return()=>node.removeEventListener('click',listener);},[s.veto]);
 const receive=(d:AutoSaveInfoActionDetail)=>api.events.push({...d,event:undefined,tag:s.tag,target:d.event?.currentTarget.tagName});
 const props={layout:s.layout,open:s.open,modal:s.modal,hidden:s.hidden,inert:s.inert,title:'Auto Save',message:s.message,messageVariant:'desktop' as const,acceptLabel:'OK',icon:{visible:s.visible,frame:s.frame},inputHint:{visible:false as const},disabled:s.disabled,readOnly:s.readOnly,onAccept:receive,buttonRef:refs.button,buttonProps:{onClick:(e:any)=>{if(s.veto==='leaf')e.preventDefault();}}};
 const element=s.part==='icon'?<AutoSaveIcon frame={s.frame} scale={s.layout.scale} label="Saving" visible={s.visible}/>:<AutoSaveInfoScreen {...props} ref={refs.root} controllerRef={s.setterRef?setController:refs.controller}/>;
 return <div id="host" ref={host} onClick={e=>{if(s.veto==='react')e.preventDefault();}}>{s.strict?<StrictMode>{element}</StrictMode>:element}
  {s.nested&&createPortal(<AutoSaveInfoScreen {...props} ref={undefined} buttonRef={undefined} title="Nested save" style={{position:'fixed',left:0,top:0}} onAccept={()=>api.events.push({owner:'nested'})}/>,document.body)}
 </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
