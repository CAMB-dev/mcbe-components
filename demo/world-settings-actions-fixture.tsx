import React,{useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {WorldLaunchActions,WorldSettingsActionButton} from '../src/world-settings-actions';
import type {WorldLaunchModel,WorldLaunchButtonKind} from '../src/world-settings-actions';
import '../src/world-settings-actions.css';

type Config={edition:'bedrock'|'education';mode:'create'|'template-create'|'edit';pregame:boolean;editor:boolean;realmVisible:boolean;hiddenSlots:'reserve'|'collapse';width:number;scale:number;disabled:boolean;inert:boolean;mounted:boolean;standalone:boolean;tone:'light'|'dark'|'realms';preventLeaf:boolean;preventAncestor:boolean;preventDocument:boolean;changeOnClick:boolean;composing:boolean};
let config:Config={edition:'bedrock',mode:'create',pregame:true,editor:false,realmVisible:true,hiddenSlots:'reserve',width:260,scale:1,disabled:false,inert:false,mounted:true,standalone:false,tone:'light',preventLeaf:false,preventAncestor:false,preventDocument:false,changeOnClick:false,composing:false};
const events:unknown[]=[],refEvents:string[]=[],refs:Record<string,HTMLElement|null>={},callbacks:Record<string,(node:HTMLElement|null)=>void|(()=>void)>={};
const track=(key:string)=>callbacks[key]??=(node)=>{refs[key]=node;refEvents.push(`${key}:${node?'attach':'null'}`);if(node)return()=>{refs[key]=null;refEvents.push(`${key}:cleanup`);};};
const font={family:'monospace',size:10,lineHeight:10};
function model():WorldLaunchModel{
  const state=(label:string,labelMaxHeight=10)=>({label,enabled:true,labelMaxHeight});
  return config.edition==='bedrock'?{edition:'bedrock',mode:config.mode,pregame:config.pregame,editor:config.editor,primary:state('Primary',20),realms:{...state('Realms',25),visible:config.realmVisible}}:
    {edition:'education',mode:config.mode,pregame:config.pregame,play:state('Play'),host:state('Host')};
}
const root=createRoot(document.getElementById('root')!);
function Fixture(){
  const dialog=useRef<HTMLDialogElement>(null);
  const buttonProps=Object.fromEntries(['primary','realms','play','host'].map(key=>[key,{onClick:(event:React.MouseEvent)=>{if(config.preventLeaf)event.preventDefault();if(config.changeOnClick)configure({mode:config.mode==='edit'?'create':'edit'});}}]));
  const onAction=(detail:{target:string;control:HTMLButtonElement;event:React.MouseEvent;button?:WorldLaunchButtonKind;shouldHost?:boolean})=>events.push({target:detail.target,button:detail.button,shouldHost:detail.shouldHost,type:detail.event.type,control:detail.control.tagName});
  return <div onClick={event=>{if(config.preventAncestor)event.preventDefault();}} style={{padding:20}}>
    <button id="before">Before</button>
    {config.mounted&&(config.standalone?<WorldSettingsActionButton ref={track('root')} size={[config.width,35]} scale={config.scale} font={font} label="Test action" labelMaxHeight={10} target="copy_world_button" tone={config.tone} disabled={config.disabled} inert={config.inert} onAction={onAction}/>:
      <WorldLaunchActions ref={track('root')} width={config.width} scale={config.scale} font={font} model={model()} hiddenSlots={config.hiddenSlots} disabled={config.disabled} inert={config.inert} onAction={onAction}
        buttonProps={buttonProps} buttonRefs={{primary:track('primary'),realms:track('realms'),play:track('play'),host:track('host')}}/>)}
    <button id="after">After</button><button id="open-native" onClick={()=>dialog.current?.showModal()}>Open native dialog</button>
    <dialog ref={dialog}><button>Native child</button></dialog>
  </div>;
}
function render(){flushSync(()=>root.render(<Fixture/>));}
function configure(next:Partial<Config>){config={...config,...next};render();}
document.addEventListener('click',event=>{if(config.preventDocument)event.preventDefault();});
Object.assign(window,{worldSettingsFixture:{configure,events,refs,refEvents,clear:()=>{events.length=0;},unmount:()=>flushSync(()=>root.unmount())}});render();
