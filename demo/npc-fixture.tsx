import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {NpcPortrait,NpcSkinPicker,NpcActionEditor,NpcDialogue,NpcEditor} from '../src/npc';
import type {NpcActionValue,NpcActionState,NpcDialogueAction,NpcEditorValue,NpcEditorPage,NpcNativeInputProps,NpcNativeTextareaProps,NpcSkin,NpcLabels,NpcDialogueLayout} from '../src/npc';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/npc.css';
export interface NpcQASettings {
  value:NpcEditorValue;controlled:boolean;acceptValue:boolean;page:NpcEditorPage;pageControlled:boolean;acceptPage:boolean;
  maximizedActionId:string|null;maxControlled:boolean;acceptMax:boolean;
  action:NpcActionValue;actionControlled:boolean;actionMaximized:boolean;actionMaxControlled:boolean;
  dialogue:string;dialogueControlled:boolean;worldBuilder:boolean;dialogueActions:NpcDialogueAction[];
  skins:Omit<NpcSkin,'actor'>[];pickerValue:string|null;pickerControlled:boolean;pickerPage:number;pickerPageControlled:boolean;acceptSkinPage:boolean;editorSkinPage:number;
  columns:number;rows:number;cycleVisible:boolean;disabled:boolean;readOnly:boolean;educationEdition:boolean;commandsEnabled:boolean;addButtonsEnabled:boolean;helpVisible:boolean;
  actionState:NpcActionState;actionStates:Record<string,NpcActionState>;pageVisibility:Partial<Record<NpcEditorPage,boolean>>;
  closeVisible:boolean;closeEnabled:boolean;scale:number;size:readonly[number,number];dialogueWidth:number;
  showEditor:boolean;showAction:boolean;showDialogue:boolean;showPicker:boolean;showPortrait:boolean;showSecond:boolean;actorVisible:boolean;portraitVariant:'skin'|'dialogue';
  preventEscape:boolean;stopCompositionPropagation:boolean;nativeTitle:string;
  labels:Partial<NpcLabels>;
  readerVisible:boolean;dialogueLayout:Partial<NpcDialogueLayout>;
}
interface QAEvent {kind:string;value?:unknown;detail?:unknown}
interface NpcQA {
  mounted:boolean;settings:NpcQASettings;events:QAEvent[];snapshots:unknown[];configure:(patch:Partial<NpcQASettings>)=>void;unmount:()=>void;
  refs:{editor:HTMLElement|null;action:HTMLElement|null;dialogue:HTMLElement|null;picker:HTMLDivElement|null;portrait:HTMLDivElement|null;
    name:HTMLInputElement|null;editorDialogue:HTMLTextAreaElement|null;actionText:HTMLTextAreaElement|null;actionButtonName:HTMLInputElement|null;dialogueText:HTMLTextAreaElement|null;
    actionTexts:Record<string,HTMLTextAreaElement|null>;buttonNames:Record<string,HTMLInputElement|null>;skinButtons:Record<string,HTMLButtonElement|null>;pickerButtons:Record<string,HTMLButtonElement|null>;dialogueButtons:Record<string,HTMLButtonElement|null>;
    advancedViewport:HTMLDivElement|null;dialogueViewport:HTMLDivElement|null;standaloneViewport:HTMLDivElement|null};
}
declare global {interface Window {npcQA:NpcQA;npcQAInitial?:Partial<NpcQASettings>}}
const command:NpcActionValue={id:'command',kind:'command',text:'say raw command',buttonName:'Command button',buttonMode:true,onEnter:false,onExit:false};
const url:NpcActionValue={id:'url',kind:'url',text:'https://example.invalid/qa',buttonName:'URL button',buttonMode:false,onEnter:false,onExit:false};
const initial:NpcQASettings={value:{name:'QA NPC',dialogue:'Hello traveller',skinId:'skin-0',actions:[command,url]},controlled:true,acceptValue:true,page:'basic',pageControlled:true,acceptPage:true,
  maximizedActionId:null,maxControlled:true,acceptMax:true,action:{...command,id:'standalone'},actionControlled:true,actionMaximized:false,actionMaxControlled:true,
  dialogue:'Hello traveller',dialogueControlled:true,worldBuilder:true,dialogueActions:[{id:'talk',label:'Talk',kind:'command'},{id:'visit',label:'Visit',kind:'url'},{id:'locked',label:'Locked',disabled:true}],
  skins:Array.from({length:9},(_,index)=>({id:`skin-${index}`,label:`Skin ${index}`,disabled:index===7})),pickerValue:'skin-0',pickerControlled:true,pickerPage:0,pickerPageControlled:true,acceptSkinPage:true,editorSkinPage:0,
  columns:4,rows:1,cycleVisible:true,disabled:false,readOnly:false,educationEdition:true,commandsEnabled:true,addButtonsEnabled:true,helpVisible:true,actionState:{},actionStates:{},pageVisibility:{},closeVisible:true,closeEnabled:true,
  scale:2,size:[325,200],dialogueWidth:320,showEditor:true,showAction:false,showDialogue:false,showPicker:false,showPortrait:false,showSecond:false,actorVisible:true,portraitVariant:'skin',preventEscape:false,stopCompositionPropagation:false,nativeTitle:'Caller NPC native title',labels:{},readerVisible:true,dialogueLayout:{}};
const initialSettings:NpcQASettings={...initial,...window.npcQAInitial};
const qa:NpcQA={mounted:false,settings:initialSettings,events:[],snapshots:[],configure:()=>{},unmount:()=>{},refs:{editor:null,action:null,dialogue:null,picker:null,portrait:null,name:null,editorDialogue:null,actionText:null,actionButtonName:null,dialogueText:null,actionTexts:{},buttonNames:{},skinButtons:{},pickerButtons:{},dialogueButtons:{},advancedViewport:null,dialogueViewport:null,standaloneViewport:null}};window.npcQA=qa;
const ids=['command','url','extra'];
const actionTextareaRefs=Object.fromEntries(ids.map(id=>[id,(node:HTMLTextAreaElement|null)=>{qa.refs.actionTexts[id]=node;}]));
const actionButtonNameRefs=Object.fromEntries(ids.map(id=>[id,(node:HTMLInputElement|null)=>{qa.refs.buttonNames[id]=node;}]));
const skinButtonRefs=Object.fromEntries(initial.skins.map(skin=>[skin.id,(node:HTMLButtonElement|null)=>{qa.refs.skinButtons[skin.id]=node;}]));
const pickerButtonRefs=Object.fromEntries(initial.skins.map(skin=>[skin.id,(node:HTMLButtonElement|null)=>{qa.refs.pickerButtons[skin.id]=node;}]));
const dialogueButtonRefs=Object.fromEntries(['talk','visit','locked','extra'].map(id=>[id,(node:HTMLButtonElement|null)=>{qa.refs.dialogueButtons[id]=node;}]));
const editorRef=(node:HTMLElement|null)=>{qa.refs.editor=node;},actionRef=(node:HTMLElement|null)=>{qa.refs.action=node;},dialogueRef=(node:HTMLElement|null)=>{qa.refs.dialogue=node;},pickerRef=(node:HTMLDivElement|null)=>{qa.refs.picker=node;},portraitRef=(node:HTMLDivElement|null)=>{qa.refs.portrait=node;};
const nameRef=(node:HTMLInputElement|null)=>{qa.refs.name=node;},editorDialogueRef=(node:HTMLTextAreaElement|null)=>{qa.refs.editorDialogue=node;},actionTextRef=(node:HTMLTextAreaElement|null)=>{qa.refs.actionText=node;},actionButtonNameRef=(node:HTMLInputElement|null)=>{qa.refs.actionButtonName=node;},dialogueTextRef=(node:HTMLTextAreaElement|null)=>{qa.refs.dialogueText=node;};
const advancedViewportRef=(node:HTMLDivElement|null)=>{qa.refs.advancedViewport=node;},editorDialogueViewportRef=(node:HTMLDivElement|null)=>{qa.refs.dialogueViewport=node;},standaloneViewportRef=(node:HTMLDivElement|null)=>{qa.refs.standaloneViewport=node;};
function App(){
  const[settings,setSettings]=useState(initialSettings);qa.settings=settings;qa.mounted=true;qa.configure=patch=>setSettings(previous=>({...previous,...patch}));
  const native=(id:string):NpcNativeInputProps&NpcNativeTextareaProps=>({id:`qa-npc-${id.replace(/[^a-zA-Z0-9_-]/g,'-')}`,'aria-label':id,title:settings.nativeTitle,
    onKeyDown:event=>{if(settings.preventEscape&&event.key==='Escape')event.preventDefault();},
    onCompositionStart:event=>{qa.events.push({kind:'composition-start',detail:{id}});if(settings.stopCompositionPropagation)event.stopPropagation();},
    onCompositionEnd:event=>{qa.events.push({kind:'composition-end',detail:{id}});if(settings.stopCompositionPropagation)event.stopPropagation();}});
  const skins=settings.skins.map(skin=>({...skin,actor:settings.actorVisible?<div className="npc-caller-model" data-qa-actor={skin.id}>{skin.label} caller actor</div>:undefined}));
  const actor=settings.actorVisible?<div className="npc-caller-model" data-qa-actor="dialogue">Caller-owned dialogue actor</div>:undefined;
  const shared={disabled:settings.disabled,readOnly:settings.readOnly,scale:settings.scale};
  return <main><button id="npc-sink">Outside NPC</button>
    <section className="npc-qa-host" id="npc-editor-host">{settings.showEditor&&<NpcEditor {...shared} labels={settings.labels} ref={editorRef} title="QA NPC editor" {...(settings.controlled?{value:settings.value}:{defaultValue:settings.value})}
      {...(settings.pageControlled?{page:settings.page}:{defaultPage:settings.page})} {...(settings.maxControlled?{maximizedActionId:settings.maximizedActionId}:{defaultMaximizedActionId:settings.maximizedActionId})}
      size={settings.size} dialogueWidth={settings.dialogueWidth} dialogueLayout={settings.dialogueLayout} skins={skins} actor={actor} skinPage={settings.editorSkinPage} skinColumns={settings.columns} skinRows={settings.rows} cycleVisible={settings.cycleVisible}
      educationEdition={settings.educationEdition} commandsEnabled={settings.commandsEnabled} addButtonsEnabled={settings.addButtonsEnabled} helpVisible={settings.helpVisible} actionStates={settings.actionStates} pageVisibility={settings.pageVisibility} closeVisible={settings.closeVisible} closeEnabled={settings.closeEnabled}
      nameProps={native('NPC name')} nameRef={nameRef} dialogueProps={native('NPC dialogue text')} dialogueRef={editorDialogueRef} actionTextareaProps={Object.fromEntries(ids.map(id=>[id,native(`Editor ${id} text`)]))} actionTextareaRefs={actionTextareaRefs} actionButtonNameRefs={actionButtonNameRefs} skinButtonRefs={skinButtonRefs} advancedViewportRef={advancedViewportRef} dialogueViewportRef={editorDialogueViewportRef}
      onValueChange={(value,detail)=>{qa.events.push({kind:'editor-value',value:structuredClone(value),detail:{field:detail.field,reason:detail.reason,actionId:detail.actionId,actionField:detail.actionField,eventType:detail.event?.type}});if(settings.controlled&&settings.acceptValue)setSettings(previous=>({...previous,value}));}}
      onPageChange={(page,detail)=>{qa.events.push({kind:'editor-page',value:page,detail:{reason:detail.reason}});if(settings.pageControlled&&settings.acceptPage)setSettings(previous=>({...previous,page}));}}
      onMaximizedActionChange={(id,detail)=>{qa.events.push({kind:'editor-max',value:id,detail:{reason:detail.reason}});if(settings.maxControlled&&settings.acceptMax)setSettings(previous=>({...previous,maximizedActionId:id}));}}
      onSkinPageChange={(page,detail)=>{qa.events.push({kind:'editor-skin-page',value:page,detail:{direction:detail.direction}});if(settings.acceptSkinPage)setSettings(previous=>({...previous,editorSkinPage:page}));}}
      onClose={(value,detail)=>{qa.snapshots.push(value);qa.events.push({kind:'editor-close',value:structuredClone(value),detail:{reason:detail.reason}});}}
    />}</section>
    <section className="npc-qa-host" id="npc-action-host">{settings.showAction&&<NpcActionEditor {...shared} labels={settings.labels} style={{width:292*settings.scale}} ref={actionRef} {...(settings.actionControlled?{value:settings.action}:{defaultValue:settings.action})} {...(settings.actionMaxControlled?{maximized:settings.actionMaximized}:{defaultMaximized:settings.actionMaximized})}
      state={settings.actionState} commandsEnabled={settings.commandsEnabled} textareaProps={native('Standalone action text')} textareaRef={actionTextRef} buttonNameProps={native('Standalone button name')} buttonNameRef={actionButtonNameRef}
      onValueChange={(action,detail)=>{qa.events.push({kind:'action-value',value:structuredClone(action),detail:{field:detail.field}});if(settings.actionControlled&&settings.acceptValue)setSettings(previous=>({...previous,action}));}}
      onMaximizedChange={(maximized,detail)=>{qa.events.push({kind:'action-max',value:maximized,detail:{reason:detail.reason}});if(settings.actionMaxControlled&&settings.acceptMax)setSettings(previous=>({...previous,actionMaximized:maximized}));}}
      onDelete={(value,event)=>{qa.snapshots.push(value);qa.events.push({kind:'action-delete',value:structuredClone(value),detail:{eventType:event.type}});}}
    />}</section>
    <section className="npc-qa-host" id="npc-dialogue-host">{settings.showDialogue&&<NpcDialogue {...shared} labels={settings.labels} ref={dialogueRef} title="QA dialogue" {...(settings.dialogueControlled?{value:settings.dialogue}:{defaultValue:settings.dialogue})} worldBuilder={settings.worldBuilder} actor={actor} actions={settings.dialogueActions} width={settings.dialogueWidth} layout={settings.dialogueLayout} closeVisible={settings.closeVisible} closeEnabled={settings.closeEnabled} educationEdition={settings.educationEdition} readerVisible={settings.readerVisible} onReaderRequest={(value,event)=>qa.events.push({kind:'reader',value,detail:{eventType:event.type}})}
      textareaProps={native('Standalone dialogue text')} textareaRef={dialogueTextRef} scrollViewportRef={standaloneViewportRef} actionRefs={dialogueButtonRefs}
      onValueChange={dialogue=>{qa.events.push({kind:'dialogue-value',value:dialogue});if(settings.dialogueControlled&&settings.acceptValue)setSettings(previous=>({...previous,dialogue}));}}
      onAction={(id,detail)=>{qa.snapshots.push(detail.action);qa.events.push({kind:'dialogue-action',value:id,detail:{index:detail.index,action:structuredClone(detail.action)}});}}
      onClose={(value,detail)=>qa.events.push({kind:'dialogue-close',value,detail:{reason:detail.reason}})}
    />}</section>
    <section className="npc-qa-host" id="npc-picker-host">{settings.showPicker&&<NpcSkinPicker {...shared} style={{width:301*settings.scale}} ref={pickerRef} skins={skins} {...(settings.pickerControlled?{value:settings.pickerValue}:{defaultValue:settings.pickerValue})} {...(settings.pickerPageControlled?{page:settings.pickerPage}:{defaultPage:settings.pickerPage})} columns={settings.columns} rows={settings.rows} cycleVisible={settings.cycleVisible} buttonRefs={pickerButtonRefs} previousLabel="Previous skins" nextLabel="Next skins"
      onValueChange={(id,detail)=>{qa.events.push({kind:'picker-value',value:id,detail:{index:detail.index,skin:{id:detail.skin.id,label:detail.skin.label}}});if(settings.pickerControlled&&settings.acceptValue)setSettings(previous=>({...previous,pickerValue:id}));}}
      onPageChange={(pickerPage,detail)=>{qa.events.push({kind:'picker-page',value:pickerPage,detail:{direction:detail.direction}});if(settings.pickerPageControlled&&settings.acceptSkinPage)setSettings(previous=>({...previous,pickerPage}));}}
      onSkinHover={(id,event)=>qa.events.push({kind:'skin-hover',value:id,detail:{eventType:event.type}})}
    />}</section>
    <section className="npc-qa-host" id="npc-portrait-host">{settings.showPortrait&&<NpcPortrait ref={portraitRef} actor={actor} variant={settings.portraitVariant} scale={settings.scale} size={[80,65]} aria-label="Standalone caller portrait"/>}</section>
    <section className="npc-qa-host" id="npc-second-host">{settings.showSecond&&<NpcEditor defaultValue={{name:'Second NPC'}} scale={settings.scale} nameProps={{'aria-label':'Second NPC name'}} onValueChange={value=>qa.events.push({kind:'second-value',value:structuredClone(value)})}/>}</section>
    <output>{JSON.stringify(settings.value)}</output>
  </main>;
}
const root=createRoot(document.getElementById('npc-root')!);qa.unmount=()=>{root.unmount();qa.mounted=false;};root.render(new URLSearchParams(location.search).has('strict')?<StrictMode><App/></StrictMode>:<App/>);
