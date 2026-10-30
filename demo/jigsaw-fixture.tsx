import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InputHTMLAttributes } from 'react';
import { JigsawEditor, JigsawPriorityFields } from '../src/jigsaw';
import type { JigsawValue } from '../src/jigsaw';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/jigsaw.css';

export type JigsawField = Exclude<keyof JigsawValue, 'joint'>;
export type PriorityField = 'selectionPriority' | 'placementPriority';
export interface JigsawQASettings {
  value: JigsawValue; pairValue: Pick<JigsawValue, PriorityField>;
  controlled: boolean; pairControlled: boolean; acceptance: 'accept' | 'reject' | 'uppercase';
  disabled: boolean; readOnly: boolean; jointEnabled: boolean; scale: number;
  size: readonly [number, number]; priorityFieldHeight?: number;
  showEditor: boolean; showPair: boolean; preventEscape: boolean; stopCompositionPropagation: boolean;
  nativeTitle: string;
}
interface QAEvent { kind: string; value?: unknown; detail?: unknown }
interface JigsawQA {
  mounted: boolean; settings: JigsawQASettings; events: QAEvent[];
  configure: (patch: Partial<JigsawQASettings>) => void; unmount: () => void;
  refs: { editor: HTMLElement | null; pair: HTMLFieldSetElement | null; inputs: Partial<Record<JigsawField, HTMLInputElement | null>>; pairInputs: Partial<Record<PriorityField, HTMLInputElement | null>>; joint: HTMLInputElement | null; viewport: HTMLDivElement | null };
}
declare global { interface Window { jigsawQA: JigsawQA } }
const fields: JigsawField[] = ['targetPool','name','target','finalBlock','selectionPriority','placementPriority'];
const initial: JigsawQASettings = {
  value: { targetPool:'minecraft:village/plains/town_centers',name:'minecraft:street',target:'minecraft:house',finalBlock:'minecraft:air',selectionPriority:'-7',placementPriority:'0',joint:'rollable' },
  pairValue: { selectionPriority:'-12',placementPriority:'34' },controlled:true,pairControlled:true,acceptance:'accept',
  disabled:false,readOnly:false,jointEnabled:true,scale:2,size:[320,260],showEditor:true,showPair:true,
  preventEscape:false,stopCompositionPropagation:false,nativeTitle:'Caller input title',
};
const qa: JigsawQA = { mounted:false,settings:initial,events:[],configure:()=>{},unmount:()=>{},refs:{editor:null,pair:null,inputs:{},pairInputs:{},joint:null,viewport:null} };
window.jigsawQA=qa;
const refs = Object.fromEntries(fields.map(field=>[field,(node:HTMLInputElement|null)=>{qa.refs.inputs[field]=node;}])) as Record<JigsawField,(node:HTMLInputElement|null)=>void>;
const pairRefs = { selectionPriority:(node:HTMLInputElement|null)=>{qa.refs.pairInputs.selectionPriority=node;},placementPriority:(node:HTMLInputElement|null)=>{qa.refs.pairInputs.placementPriority=node;} };
const editorRef=(node:HTMLElement|null)=>{qa.refs.editor=node;},pairRef=(node:HTMLFieldSetElement|null)=>{qa.refs.pair=node;};
const jointRef=(node:HTMLInputElement|null)=>{qa.refs.joint=node;},viewportRef=(node:HTMLDivElement|null)=>{qa.refs.viewport=node;};
function App() {
  const [settings,setSettings]=useState(initial);qa.settings=settings;qa.mounted=true;
  qa.configure=patch=>setSettings(previous=>({...previous,...patch}));
  const native=(field:JigsawField,standalone=false):InputHTMLAttributes<HTMLInputElement>&{'data-native-probe':string}=>({
    id:`${standalone?'pair':'editor'}-${field}`,title:settings.nativeTitle,'data-native-probe':field,
    onChange:event=>{qa.events.push({kind:'native-change',value:event.currentTarget.value,detail:{field,standalone,eventType:event.type}});},
    onKeyDown:event=>{if(settings.preventEscape&&event.key==='Escape')event.preventDefault();},
    onCompositionStart:event=>{qa.events.push({kind:'composition-start',detail:{field,standalone}});if(settings.stopCompositionPropagation)event.stopPropagation();},
    onCompositionEnd:event=>{qa.events.push({kind:'composition-end',detail:{field,standalone}});if(settings.stopCompositionPropagation)event.stopPropagation();},
  });
  const inputProps=Object.fromEntries(fields.map(field=>[field,native(field)]));
  const pairInputProps={selectionPriority:native('selectionPriority',true),placementPriority:native('placementPriority',true)};
  return <main>
    <button id="focus-sink">Outside jigsaw</button>
    <div id="jigsaw-editor-host">{settings.showEditor&&<JigsawEditor ref={editorRef} aria-label="QA Jigsaw"
      {...(settings.controlled?{value:settings.value}:{defaultValue:settings.value})}
      size={settings.size} scale={settings.scale} priorityFieldHeight={settings.priorityFieldHeight}
      disabled={settings.disabled} readOnly={settings.readOnly} jointEnabled={settings.jointEnabled}
      inputProps={inputProps} inputRefs={refs} jointRef={jointRef} scrollViewportRef={viewportRef}
      onValueChange={(next,detail)=>{
        qa.events.push({kind:'value',value:structuredClone(next),detail:{field:detail.field,eventType:detail.event.type}});
        if(settings.controlled&&settings.acceptance!=='reject')setSettings(previous=>({...previous,value:settings.acceptance==='uppercase'&&detail.field!=='joint'?{...next,[detail.field]:next[detail.field].toUpperCase()}:next}));
      }}
      onDone={(value,event)=>qa.events.push({kind:'done',value:structuredClone(value),detail:{eventType:event.type}})}
      onHelp={(value,event)=>qa.events.push({kind:'help',value:structuredClone(value),detail:{eventType:event.type}})}
      onCancel={(value,detail)=>qa.events.push({kind:'cancel',value:structuredClone(value),detail:{reason:detail.reason,eventType:detail.event.type}})}
    />}</div>
    <div id="jigsaw-pair-host">{settings.showPair&&<JigsawPriorityFields ref={pairRef} aria-label="Independent priorities"
      {...(settings.pairControlled?{value:settings.pairValue}:{defaultValue:settings.pairValue})}
      scale={settings.scale} disabled={settings.disabled} readOnly={settings.readOnly}
      inputProps={pairInputProps} inputRefs={pairRefs}
      onValueChange={(value,detail)=>{qa.events.push({kind:'pair',value:structuredClone(value),detail:{field:detail.field,eventType:detail.event.type}});if(settings.pairControlled&&settings.acceptance!=='reject')setSettings(previous=>({...previous,pairValue:value}));}}
    />}</div>
    <output id="jigsaw-accepted">{JSON.stringify(settings.value)}</output>
  </main>;
}
const root=createRoot(document.getElementById('jigsaw-root')!);
qa.unmount=()=>{root.unmount();qa.mounted=false;};
root.render(new URLSearchParams(location.search).has('strict')?<StrictMode><App/></StrictMode>:<App/>);
