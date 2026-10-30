import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ServerActionForm,ServerCustomForm} from '../src/server-forms';
import type {ServerActionRow,ServerCustomField,ServerCustomFormValues,ServerFormInputProps} from '../src/server-forms';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/server-forms.css';

export interface ServerFormsQASettings {
  rows:ServerActionRow[];fields:ServerCustomField[];value:ServerCustomFormValues;controlled:boolean;acceptance:'accept'|'reject';
  disabled:boolean;readOnly:boolean;size:readonly[number,number];scale:number;showAction:boolean;showCustom:boolean;showSecond:boolean;
  body:string;closeVisible:boolean;closeEnabled:boolean;submitVisible:boolean;submitEnabled:boolean;
  preventEscape:boolean;stopCompositionPropagation:boolean;acceptExpanded:boolean;nativeTitle:string;
}
interface QAEvent {kind:string;value?:unknown;detail?:unknown}
interface QA {
  mounted:boolean;settings:ServerFormsQASettings;events:QAEvent[];snapshots:unknown[];
  configure:(patch:Partial<ServerFormsQASettings>)=>void;unmount:()=>void;
  refs:{action:HTMLElement|null;custom:HTMLElement|null;actionViewport:HTMLDivElement|null;customViewport:HTMLDivElement|null;
    inputs:Record<string,HTMLInputElement|null>;dropdowns:Record<string,HTMLButtonElement|null>;multiselects:Record<string,HTMLButtonElement|null>;options:Record<string,Record<string,HTMLInputElement|null>>};
}
declare global {interface Window {serverFormsQA:QA}}
const initial:ServerFormsQASettings={
  rows:[{id:'info',type:'label',text:'A source-backed action list'},{id:'section',type:'header',text:'Actions'},{id:'plain',type:'button',text:'Plain action'},
    {id:'ready',type:'button',text:'Icon action',icon:{state:'ready',url:new URL('../src/assets/jigsaw/chevron_left.png',import.meta.url).href}},
    {id:'loading',type:'button',text:'Loading action',icon:{state:'loading'}},{id:'locked',type:'button',text:'Locked action',disabled:true},{id:'separator',type:'divider'}],
  fields:[{id:'intro',type:'label',text:'Custom form informational label'},{id:'heading',type:'header',text:'Editable fields'},
    {id:'name',type:'input',label:'Player name',placeholder:'Enter raw text',defaultValue:'QA'},
    {id:'enabled',type:'toggle',label:'Enabled',defaultValue:true},
    {id:'amount',type:'slider',label:'Amount',min:-2,max:6,step:.5,defaultValue:1},
    {id:'stage',type:'step_slider',label:'Stage',options:[{value:'first',label:'First'},{value:'second',label:'Second'},{value:'last',label:'Last'}],defaultValue:'second'},
    {id:'difficulty',type:'dropdown',label:'Difficulty',options:[{value:'easy',label:'Easy'},{value:'locked',label:'Locked',disabled:true},{value:'hard',label:'Hard'}],defaultValue:'easy'},
    {id:'features',type:'multiselect',label:'Features',options:[{value:'a',label:'Alpha'},{value:'b',label:'Beta'},{value:'c',label:'Gamma',disabled:true}],defaultValue:['a']},
    {id:'line',type:'divider'}],
  value:{name:'QA',enabled:true,amount:1,stage:'second',difficulty:'easy',features:['a']},controlled:true,acceptance:'accept',disabled:false,readOnly:false,size:[225,200],scale:2,
  showAction:true,showCustom:true,showSecond:false,body:'Caller-owned body',closeVisible:true,closeEnabled:true,submitVisible:true,submitEnabled:true,
  preventEscape:false,stopCompositionPropagation:false,acceptExpanded:false,nativeTitle:'Caller native title',
};
const qa:QA={mounted:false,settings:initial,events:[],snapshots:[],configure:()=>{},unmount:()=>{},refs:{action:null,custom:null,actionViewport:null,customViewport:null,inputs:{},dropdowns:{},multiselects:{},options:{}}};window.serverFormsQA=qa;
const ids=['name','enabled','amount','stage','difficulty','features','extra'];
const inputRefs=Object.fromEntries(ids.map(id=>[id,(node:HTMLInputElement|null)=>{qa.refs.inputs[id]=node;}]));
const dropdownRefs=Object.fromEntries(ids.map(id=>[id,(node:HTMLButtonElement|null)=>{qa.refs.dropdowns[id]=node;}]));
const multiselectRefs=Object.fromEntries(ids.map(id=>[id,(node:HTMLButtonElement|null)=>{qa.refs.multiselects[id]=node;}]));
const optionRefs={features:Object.fromEntries(['a','b','c'].map(value=>[value,(node:HTMLInputElement|null)=>{(qa.refs.options.features??={})[value]=node;}]))};
const actionRef=(node:HTMLElement|null)=>{qa.refs.action=node;},customRef=(node:HTMLElement|null)=>{qa.refs.custom=node;};
const actionViewportRef=(node:HTMLDivElement|null)=>{qa.refs.actionViewport=node;},customViewportRef=(node:HTMLDivElement|null)=>{qa.refs.customViewport=node;};
function App(){
  const[settings,setSettings]=useState(initial);qa.settings=settings;qa.mounted=true;qa.configure=patch=>setSettings(previous=>({...previous,...patch}));
  const native=(id:string):ServerFormInputProps=>({id:`qa-server-${id}`,title:settings.nativeTitle,onChange:event=>qa.events.push({kind:'native-change',value:event.currentTarget.value,detail:{id}}),
    onKeyDown:event=>{if(settings.preventEscape&&event.key==='Escape')event.preventDefault();},
    onCompositionStart:event=>{qa.events.push({kind:'composition-start',detail:{id}});if(settings.stopCompositionPropagation)event.stopPropagation();},
    onCompositionEnd:event=>{qa.events.push({kind:'composition-end',detail:{id}});if(settings.stopCompositionPropagation)event.stopPropagation();}});
  const common={size:settings.size,scale:settings.scale,disabled:settings.disabled,readOnly:settings.readOnly,closeVisible:settings.closeVisible,closeEnabled:settings.closeEnabled};
  return <main><button id="server-forms-sink">Outside server forms</button>
    <section className="server-qa-host" id="server-action-host">{settings.showAction&&<ServerActionForm {...common} ref={actionRef} title="Action form" body={settings.body} rows={settings.rows} scrollViewportRef={actionViewportRef}
      onAction={(id,detail)=>{qa.snapshots.push(detail.row);qa.events.push({kind:'action',value:id,detail:{index:detail.index,row:structuredClone(detail.row),eventType:detail.event.type}});}}
      onCancel={detail=>qa.events.push({kind:'action-cancel',detail:{reason:detail.reason,eventType:detail.event.type}})}
      onIconError={id=>qa.events.push({kind:'icon-error',value:id})}/>}</section>
    <section className="server-qa-host" id="server-custom-host">{settings.showCustom&&<ServerCustomForm {...common} ref={customRef} title="Custom form" fields={settings.fields}
      {...(settings.controlled?{value:settings.value}:{defaultValue:settings.value})} inputProps={Object.fromEntries(ids.map(id=>[id,native(id)]))} inputRefs={inputRefs} dropdownRefs={dropdownRefs} multiselectRefs={multiselectRefs} optionRefs={optionRefs} scrollViewportRef={customViewportRef}
      submitText="Submit form" submitVisible={settings.submitVisible} submitEnabled={settings.submitEnabled}
      onValueChange={(value,detail)=>{qa.events.push({kind:'value',value:structuredClone(value),detail:{id:detail.id,type:detail.type,eventType:detail.event?.type}});if(settings.controlled&&settings.acceptance==='accept')setSettings(previous=>({...previous,value}));}}
      onExpandedChange={(id,expanded,event)=>{qa.events.push({kind:'expanded',value:expanded,detail:{id,eventType:event.type}});if(settings.acceptExpanded)setSettings(previous=>({...previous,fields:previous.fields.map(field=>field.id===id&&field.type==='multiselect'?{...field,expanded}:field)}));}}
      onSubmit={(value,event)=>{qa.snapshots.push(value);qa.events.push({kind:'submit',value:structuredClone(value),detail:{eventType:event.type}});}}
      onCancel={(value,detail)=>{qa.snapshots.push(value);qa.events.push({kind:'custom-cancel',value:structuredClone(value),detail:{reason:detail.reason,eventType:detail.event.type}});}}
    />}</section>
    <section className="server-qa-host" id="server-second-host">{settings.showSecond&&<ServerCustomForm title="Second form" fields={[{id:'name',type:'input',label:'Second player',defaultValue:'Second'}]} scale={settings.scale} onValueChange={value=>qa.events.push({kind:'second-value',value:structuredClone(value)})}/>}</section>
    <output>{JSON.stringify(settings.value)}</output>
  </main>;
}
const root=createRoot(document.getElementById('server-forms-root')!);qa.unmount=()=>{root.unmount();qa.mounted=false;};root.render(new URLSearchParams(location.search).has('strict')?<StrictMode><App/></StrictMode>:<App/>);
