import { StrictMode,useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InputHTMLAttributes,TextareaHTMLAttributes } from 'react';
import { CommandBlockEditor,CommandInput,CommandOutputPanel } from '../src/command-block';
import type { CommandBlockValue,CommandBlockField,CommandPreviousInfo } from '../src/command-block';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/command-block.css';
export interface CommandQASettings {
  value:CommandBlockValue;controlled:boolean;acceptance:'accept'|'reject'|'uppercase';
  expanded:boolean;expandedControlled:boolean;rejectExpansion:boolean;
  disabled:boolean;readOnly:boolean;enabled:Partial<Record<CommandBlockField,boolean>>;
  firstTickEnabled:boolean;cancelEnabled:boolean;trackOutputEnabled:boolean;pasteEnabled:boolean;charLimitWarning:boolean;dividerVisible:boolean;
  closeVisible?:boolean;minimizeVisible?:boolean;headerPasteVisible?:boolean;
  scale:number;viewportSize:readonly[number,number];panelSize?:readonly[number,number];
  previousOutput:string;previousInfo:CommandPreviousInfo;
  showEditor:boolean;showInput:boolean;showOutput:boolean;standaloneCommand:string;standaloneExpanded:boolean;standaloneTrack:boolean;
  preventEscape:boolean;stopCompositionPropagation:boolean;nativeTitle:string;callerIcon:boolean;
}
interface QAEvent{kind:string;value?:unknown;detail?:unknown}
interface CommandQA{
  mounted:boolean;settings:CommandQASettings;events:QAEvent[];configure:(patch:Partial<CommandQASettings>)=>void;unmount:()=>void;
  refs:{editor:HTMLElement|null;textarea:HTMLTextAreaElement|null;hoverNote:HTMLInputElement|null;tickDelay:HTMLInputElement|null;blockType:HTMLButtonElement|null;condition:HTMLButtonElement|null;redstone:HTMLButtonElement|null;firstTick:HTMLInputElement|null;trackOutput:HTMLInputElement|null;output:HTMLPreElement|null;leftViewport:HTMLDivElement|null;rightViewport:HTMLDivElement|null;standalone:HTMLDivElement|null;standaloneTextarea:HTMLTextAreaElement|null;standaloneOutput:HTMLDivElement|null;standalonePre:HTMLPreElement|null};
}
declare global{interface Window{commandQA:CommandQA}}
const initial:CommandQASettings={value:{hoverNote:'QA block',command:'say accepted',blockType:'impulse',condition:'unconditional',redstone:'needs_redstone',tickDelay:'0',executeFirstTick:false,trackOutput:true},controlled:true,acceptance:'accept',expanded:false,expandedControlled:true,rejectExpansion:false,disabled:false,readOnly:false,enabled:{},firstTickEnabled:true,cancelEnabled:true,trackOutputEnabled:true,pasteEnabled:true,charLimitWarning:false,dividerVisible:true,scale:2,viewportSize:[400,300],previousOutput:'[12:34] Previous accepted output\nSecond output line',previousInfo:{blockType:'Historic chain',condition:'Historic conditional',redstone:'Historic always active',blockTypeColor:'#7fff1f'},showEditor:true,showInput:true,showOutput:true,standaloneCommand:'standalone accepted',standaloneExpanded:false,standaloneTrack:true,preventEscape:false,stopCompositionPropagation:false,nativeTitle:'Caller native title',callerIcon:false};
const qa:CommandQA={mounted:false,settings:initial,events:[],configure:()=>{},unmount:()=>{},refs:{editor:null,textarea:null,hoverNote:null,tickDelay:null,blockType:null,condition:null,redstone:null,firstTick:null,trackOutput:null,output:null,leftViewport:null,rightViewport:null,standalone:null,standaloneTextarea:null,standaloneOutput:null,standalonePre:null}};window.commandQA=qa;
function ref<K extends keyof CommandQA['refs']>(key:K){return(node:CommandQA['refs'][K])=>{qa.refs[key]=node;};}
const refs={editor:ref('editor'),textarea:ref('textarea'),hoverNote:ref('hoverNote'),tickDelay:ref('tickDelay'),blockType:ref('blockType'),condition:ref('condition'),redstone:ref('redstone'),firstTick:ref('firstTick'),trackOutput:ref('trackOutput'),output:ref('output'),leftViewport:ref('leftViewport'),rightViewport:ref('rightViewport'),standalone:ref('standalone'),standaloneTextarea:ref('standaloneTextarea'),standaloneOutput:ref('standaloneOutput'),standalonePre:ref('standalonePre')};
function App(){
  const[settings,setSettings]=useState(initial);qa.settings=settings;qa.mounted=true;qa.configure=patch=>setSettings(previous=>({...previous,...patch}));
  const native=(field:string)=>({title:settings.nativeTitle,onKeyDown:(event:React.KeyboardEvent<HTMLElement>)=>{if(settings.preventEscape&&event.key==='Escape')event.preventDefault();},onCompositionStart:(event:React.CompositionEvent<HTMLElement>)=>{qa.events.push({kind:'composition-start',detail:{field}});if(settings.stopCompositionPropagation)event.stopPropagation();},onCompositionEnd:(event:React.CompositionEvent<HTMLElement>)=>{qa.events.push({kind:'composition-end',detail:{field}});if(settings.stopCompositionPropagation)event.stopPropagation();}});
  const inputs:{hoverNote:InputHTMLAttributes<HTMLInputElement>;tickDelay:InputHTMLAttributes<HTMLInputElement>}={hoverNote:{...native('hoverNote'),id:'command-hover-note'},tickDelay:{...native('tickDelay'),id:'command-tick-delay'}};
  const textarea:TextareaHTMLAttributes<HTMLTextAreaElement>={...native('command'),id:'command-actual-text'};
  return<main>
    <button id="command-sink">Outside command block</button>
    <section className="qa-region" id="command-editor-host">{settings.showEditor&&<CommandBlockEditor ref={refs.editor} aria-label="QA command block"
      {...(settings.controlled?{value:settings.value}:{defaultValue:settings.value})}
      {...(settings.expandedControlled?{expanded:settings.expanded}:{defaultExpanded:settings.expanded})}
      disabled={settings.disabled} readOnly={settings.readOnly} enabled={settings.enabled} firstTickEnabled={settings.firstTickEnabled}
      cancelEnabled={settings.cancelEnabled} trackOutputEnabled={settings.trackOutputEnabled} pasteEnabled={settings.pasteEnabled} charLimitWarning={settings.charLimitWarning} dividerVisible={settings.dividerVisible}
      closeVisible={settings.closeVisible} minimizeVisible={settings.minimizeVisible} headerPasteVisible={settings.headerPasteVisible}
      scale={settings.scale} viewportSize={settings.viewportSize} panelSize={settings.panelSize}
      previousOutput={settings.previousOutput} previousInfo={settings.previousInfo} blockTypeIcon={settings.callerIcon?<span id="command-caller-icon">HOST</span>:undefined}
      inputProps={inputs} inputRefs={{hoverNote:refs.hoverNote,tickDelay:refs.tickDelay}} textareaProps={textarea} textareaRef={refs.textarea}
      dropdownRefs={{blockType:refs.blockType,condition:refs.condition,redstone:refs.redstone}} firstTickRef={refs.firstTick} trackOutputRef={refs.trackOutput}
      outputRef={refs.output} leftViewportRef={refs.leftViewport} rightViewportRef={refs.rightViewport}
      onValueChange={(value,detail)=>{qa.events.push({kind:'value',value:structuredClone(value),detail:{field:detail.field,eventType:detail.event?.type}});if(settings.controlled&&settings.acceptance!=='reject')setSettings(previous=>({...previous,value:settings.acceptance==='uppercase'&&['hoverNote','command','tickDelay'].includes(detail.field)?{...value,[detail.field]:(value[detail.field]as string).toUpperCase()}:value}));}}
      onExpandedChange={(value,detail)=>{qa.events.push({kind:'expanded',value,detail:{reason:detail.reason,eventType:detail.event.type}});if(settings.expandedControlled&&!settings.rejectExpansion)setSettings(previous=>({...previous,expanded:value}));}}
      onClose={(value,detail)=>qa.events.push({kind:'close',value:structuredClone(value),detail:{reason:detail.reason,eventType:detail.event.type}})}
      onPasteRequest={(value,event)=>qa.events.push({kind:'paste',value:structuredClone(value),detail:{eventType:event.type}})}
    />}</section>
    <section className="qa-region" id="command-standalone">{settings.showInput&&<CommandInput ref={refs.standalone} value={settings.standaloneCommand} expanded={settings.standaloneExpanded}
      scale={settings.scale} disabled={settings.disabled} readOnly={settings.readOnly} pasteEnabled={settings.pasteEnabled} charLimitWarning={settings.charLimitWarning}
      textareaRef={refs.standaloneTextarea} textareaProps={{...native('standalone'),id:'command-standalone-text'}}
      onValueChange={value=>{qa.events.push({kind:'standalone-value',value});if(settings.acceptance!=='reject')setSettings(previous=>({...previous,standaloneCommand:value}));}}
      onExpandedChange={(value,detail)=>{qa.events.push({kind:'standalone-expanded',value,detail:{reason:detail.reason}});if(!settings.rejectExpansion)setSettings(previous=>({...previous,standaloneExpanded:value}));}}
      onPasteRequest={value=>qa.events.push({kind:'standalone-paste',value})}
    />}</section>
    <section className="qa-region" id="command-output-host">{settings.showOutput&&<CommandOutputPanel ref={refs.standaloneOutput} outputRef={refs.standalonePre} aria-label="Standalone output panel"
      scale={settings.scale} previousOutput={settings.previousOutput} previousInfo={settings.previousInfo} trackOutput={settings.standaloneTrack}
      disabled={settings.disabled} readOnly={settings.readOnly} trackOutputEnabled={settings.trackOutputEnabled} onTrackOutputChange={value=>{qa.events.push({kind:'standalone-track',value});if(settings.acceptance!=='reject')setSettings(previous=>({...previous,standaloneTrack:value}));}}
    />}</section>
    <output id="command-accepted">{JSON.stringify(settings.value)}</output>
  </main>;
}
const root=createRoot(document.getElementById('command-root')!);qa.unmount=()=>{root.unmount();qa.mounted=false;};root.render(new URLSearchParams(location.search).has('strict')?<StrictMode><App/></StrictMode>:<App/>);
