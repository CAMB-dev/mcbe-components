import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ProgressIndicators} from '../src';
import type {ProgressIndicatorTemplate,ProgressIndicatorState} from '../src';
import '../src/progress-indicators.css';
const root=createRoot(document.getElementById('root')!);
const state:ProgressIndicatorState={barAnimationVisible:true,spinnerAnimationVisible:true,loadingBarVisible:true,progressAnimationVisible:true,useDeterminateAnimation:true,autoSaveVisible:true,percentage:.5,currentAmount:19,totalAmount:93,waveFrame:0,spinnerFrame:0,autoSaveFrame:0,paused:true};
const harness={ready:true,render(value:{template:ProgressIndicatorTemplate;height:number;frame?:number;ratio?:number}){
 const next={...state,percentage:value.ratio??.5,spinnerFrame:value.template==='spinner'?value.frame??0:0,autoSaveFrame:value.template==='autosave'?value.frame??0:0};
 flushSync(()=>root.render(<ProgressIndicators templates={[value.template]} state={next} availableSize={[200,value.height]} scale={1} imageClipPolicy="visible-fraction-web" customBar={{kind:'native-unrecovered'}} label="Progress material"/>));
}};
declare global{interface Window{progressMaterial:typeof harness}}
window.progressMaterial=harness;harness.render({template:'spinner',height:100,frame:0});
