import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {StructureEditor,XYZVectorInput} from '../src/structure-editor';
import type {StructureEditorValue,StructureEditorField,StructureEditorAction,StructureEditorCapabilities,StructureEditorVisibility,StructureEditorMode,StructureInputField,StructureBooleanField,XYZValue,XYZInputProps} from '../src/structure-editor';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/structure-editor.css';
export interface StructureQASettings{
  value:StructureEditorValue;controlled:boolean;acceptance:'accept'|'reject';disabled:boolean;readOnly:boolean;
  capabilities:StructureEditorCapabilities;visibility:StructureEditorVisibility;footerVisibility:Partial<Record<StructureEditorMode,boolean>>;
  enabled:Partial<Record<StructureEditorField,boolean>>;actionVisibility:Partial<Record<StructureEditorAction,boolean>>;actionEnabled:Partial<Record<StructureEditorAction,boolean>>;
  toggleStateVisibility:Partial<Record<StructureBooleanField,{off?:boolean;on?:boolean}>>;
  size:readonly[number,number];scale:number;showEditor:boolean;showXYZ:boolean;xyz:XYZValue;xyzControlled:boolean;xyzMaxLength:number;
  nativeTitle:string;preventEscape:boolean;stopCompositionPropagation:boolean;progress:number;rotationRange:{min:number;max:number;step:number};
}
interface QAEvent{kind:string;value?:unknown;detail?:unknown}
interface StructureQA{
  mounted:boolean;settings:StructureQASettings;events:QAEvent[];actionSnapshots:StructureEditorValue[];
  configure:(patch:Partial<StructureQASettings>)=>void;unmount:()=>void;
  refs:{editor:HTMLElement|null;xyz:HTMLFieldSetElement|null;inputs:Partial<Record<StructureInputField,HTMLInputElement|null>>;xyzInputs:Partial<Record<keyof XYZValue,HTMLInputElement|null>>;dropdowns:Partial<Record<'mode'|'redstoneSaveMode'|'animationMode',HTMLButtonElement|null>>;toggles:Partial<Record<'includeEntities'|'removeBlocks'|'waterlogging'|'showBoundingBox'|'mirrorX'|'mirrorZ',HTMLInputElement|null>>;rotation:HTMLInputElement|null;viewport:HTMLDivElement|null;preview:HTMLDivElement|null};
}
declare global{interface Window{structureQA:StructureQA}}
const initial:StructureQASettings={value:{mode:'save',name:'qa:structure',saveSize:{x:'16',y:'8',z:'12'},saveOffset:{x:'-1',y:'0',z:'2'},loadOffset:{x:'-2',y:'3',z:'0'},exportSize:{x:'7',y:'9',z:'11'},exportOffset:{x:'-3',y:'4',z:'1'},integrity:'100.00',seed:'raw-seed',data:'host-data',animationTime:'',includeEntities:true,removeBlocks:false,waterlogging:false,showBoundingBox:true,mirrorX:false,mirrorZ:false,rotation:0,redstoneSaveMode:'memory',animationMode:'none'},controlled:true,acceptance:'accept',disabled:false,readOnly:false,capabilities:{dataSupport:true,export3dSupport:true,filePickingSupported:true},visibility:{},footerVisibility:{},enabled:{},actionVisibility:{},actionEnabled:{},toggleStateVisibility:{},size:[480,270],scale:2,showEditor:true,showXYZ:true,xyz:{x:'1',y:'2',z:'3'},xyzControlled:true,xyzMaxLength:3,nativeTitle:'Caller input title',preventEscape:false,stopCompositionPropagation:false,progress:.25,rotationRange:{min:0,max:10,step:.5}};
const qa:StructureQA={mounted:false,settings:initial,events:[],actionSnapshots:[],configure:()=>{},unmount:()=>{},refs:{editor:null,xyz:null,inputs:{},xyzInputs:{},dropdowns:{},toggles:{},rotation:null,viewport:null,preview:null}};window.structureQA=qa;
const fields:StructureInputField[]=['name','integrity','seed','data','animationTime',...(['saveSize','saveOffset','loadOffset','exportSize','exportOffset']as const).flatMap(field=>(['x','y','z']as const).map(axis=>`${field}.${axis}`as StructureInputField))];
const inputRefs=Object.fromEntries(fields.map(field=>[field,(node:HTMLInputElement|null)=>{qa.refs.inputs[field]=node;}]));
const xyzRefs=Object.fromEntries((['x','y','z']as const).map(axis=>[axis,(node:HTMLInputElement|null)=>{qa.refs.xyzInputs[axis]=node;}]));
const dropdownRefs={mode:(node:HTMLButtonElement|null)=>{qa.refs.dropdowns.mode=node;},redstoneSaveMode:(node:HTMLButtonElement|null)=>{qa.refs.dropdowns.redstoneSaveMode=node;},animationMode:(node:HTMLButtonElement|null)=>{qa.refs.dropdowns.animationMode=node;}};
const toggleRefs=Object.fromEntries((['includeEntities','removeBlocks','waterlogging','showBoundingBox','mirrorX','mirrorZ']as const).map(field=>[field,(node:HTMLInputElement|null)=>{qa.refs.toggles[field]=node;}]));
const editorRef=(node:HTMLElement|null)=>{qa.refs.editor=node;},xyzRef=(node:HTMLFieldSetElement|null)=>{qa.refs.xyz=node;},rotationRef=(node:HTMLInputElement|null)=>{qa.refs.rotation=node;},viewportRef=(node:HTMLDivElement|null)=>{qa.refs.viewport=node;},previewRef=(node:HTMLDivElement|null)=>{qa.refs.preview=node;};
function App(){
  const[settings,setSettings]=useState(initial);qa.settings=settings;qa.mounted=true;qa.configure=patch=>setSettings(previous=>({...previous,...patch}));
  const native=(field:string):XYZInputProps=>({title:settings.nativeTitle,...(field==='seed'?{id:'caller-structure-seed'}:{}),onKeyDown:event=>{if(settings.preventEscape&&event.key==='Escape')event.preventDefault();},onChange:event=>qa.events.push({kind:'native-change',value:event.currentTarget.value,detail:{field}}),onCompositionStart:event=>{qa.events.push({kind:'composition-start',detail:{field}});if(settings.stopCompositionPropagation)event.stopPropagation();},onCompositionEnd:event=>{qa.events.push({kind:'composition-end',detail:{field}});if(settings.stopCompositionPropagation)event.stopPropagation();}});
  return<main><button id="structure-sink">Outside structure</button>
    <section id="structure-editor-host">{settings.showEditor&&<StructureEditor ref={editorRef} aria-label="QA structure editor" {...(settings.controlled?{value:settings.value}:{defaultValue:settings.value})}
      size={settings.size} scale={settings.scale} disabled={settings.disabled} readOnly={settings.readOnly} capabilities={settings.capabilities} visibility={settings.visibility} footerVisibility={settings.footerVisibility}
      enabled={settings.enabled} actionVisibility={settings.actionVisibility} actionEnabled={settings.actionEnabled} rotationRange={settings.rotationRange} toggleStateVisibility={settings.toggleStateVisibility}
      inputProps={Object.fromEntries(fields.map(field=>[field,native(field)]))} inputRefs={inputRefs} dropdownRefs={dropdownRefs} toggleRefs={toggleRefs} rotationRef={rotationRef} scrollViewportRef={viewportRef} previewRef={previewRef}
      preview={<div id="structure-caller-preview">Caller-owned preview; no world renderer</div>} cornerText="Caller corner message" feedback="Caller accepted feedback" exportDisabledText="Caller export unavailable" progress={settings.progress} progressLabel="Caller progress"
      onValueChange={(value,detail)=>{qa.events.push({kind:'value',value:structuredClone(value),detail:{field:detail.field,axis:detail.axis,eventType:detail.event?.type}});if(settings.controlled&&settings.acceptance==='accept')setSettings(previous=>({...previous,value}));}}
      onAction={(action,value,event)=>{qa.actionSnapshots.push(value);qa.events.push({kind:'action',value:structuredClone(value),detail:{action,eventType:event.type}});}}
      onCancel={(value,detail)=>qa.events.push({kind:'cancel',value:structuredClone(value),detail:{reason:detail.reason,eventType:detail.event.type}})}
      onPreviewTurn={detail=>qa.events.push({kind:'preview-turn',detail:{phase:detail.phase,deltaX:detail.deltaX,deltaY:detail.deltaY}})}
    />}</section>
    <section id="xyz-host">{settings.showXYZ&&<XYZVectorInput ref={xyzRef} label="Standalone coordinates" {...(settings.xyzControlled?{value:settings.xyz}:{defaultValue:settings.xyz})}
      scale={settings.scale} maxLength={settings.xyzMaxLength} disabled={settings.disabled} readOnly={settings.readOnly} inputRefs={xyzRefs}
      inputProps={{x:{...native('standalone.x'),id:'caller-xyz-x'},y:native('standalone.y'),z:native('standalone.z')}}
      onValueChange={(value,detail)=>{qa.events.push({kind:'xyz',value:structuredClone(value),detail:{axis:detail.axis,eventType:detail.event.type}});if(settings.xyzControlled&&settings.acceptance==='accept')setSettings(previous=>({...previous,xyz:value}));}}
    />}</section><output>{JSON.stringify(settings.value)}</output>
  </main>;
}
const root=createRoot(document.getElementById('structure-root')!);qa.unmount=()=>{root.unmount();qa.mounted=false;};root.render(new URLSearchParams(location.search).has('strict')?<StrictMode><App/></StrictMode>:<App/>);
