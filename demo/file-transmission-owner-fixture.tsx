import {useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {FileTransmissionScreen} from '../src/file-transmission';
import type {FileTransmissionController} from '../src/file-transmission';
import {makeFileTransmissionModel} from '../tests/fixtures/file-transmission-profile';
import '../src/file-transmission.css';
let renders=0,update:(state:Partial<{outer:boolean;inner:boolean;percentage:number}>)=>void=()=>{};
let controller:FileTransmissionController|null=null;
const events:string[]=[];
function App(){
 const[state,setState]=useState({outer:false,inner:false,percentage:.25});
 const[outerController,setOuterController]=useState<FileTransmissionController|null>(null);renders++;
 useLayoutEffect(()=>{controller=outerController;update=next=>setState(old=>({...old,...next}));window.fileTransmissionOwner.ready=true;});
 const base=makeFileTransmissionModel(),model={...base,bindings:{...base.bindings,percentage:state.percentage}};
 return <><button onClick={()=>setState(old=>({...old,outer:true}))}>Open outer</button><FileTransmissionScreen model={{...model,runKey:'outer',onAction:detail=>{events.push('outer:'+detail.target);}}} open={state.outer} label="Outer transfer" controllerRef={setOuterController} titleArt={null}
 baseLayer={<FileTransmissionScreen model={{...model,runKey:'nested',onAction:detail=>{events.push('nested:'+detail.target);}}} open={state.inner} label="Nested transfer" baseLayer={null} titleArt={null}/>}/></>;
}
window.fileTransmissionOwner={ready:false,events,set(next){flushSync(()=>update(next));},command(){return controller?.request('button.menu_cancel')??false;},renders:()=>renders};
createRoot(document.getElementById('root')!).render(<App/>);
declare global {interface Window {fileTransmissionOwner:{ready:boolean;events:string[];set(next:Partial<{outer:boolean;inner:boolean;percentage:number}>):void;command():boolean;renders():number}}}
