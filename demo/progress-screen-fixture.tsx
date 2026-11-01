import {StrictMode, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ProgressScreen} from '../src';
import type {ProgressControllerHandle, ProgressScreenProps} from '../src';
import {makeProgressScreenProps} from '../tests/fixtures/progress-profile';
import '../src/progress-screen.css';

// Authored finite Web contract harness; never a recovered native default profile.
const controller=createRef<ProgressControllerHandle>(),screen=createRef<HTMLElement>();
const mounted=createRoot(document.getElementById('root')!);
const events:Record<string,unknown>[]=[];
let props={...makeProgressScreenProps(),open:false},acceptSelection=false,callbackId='first',attached=true;
let intercept:((event:Event)=>void)|null=null;
const render=()=>flushSync(()=>mounted.render(attached?<StrictMode><ProgressScreen {...props} rootRef={screen} controllerRef={controller}
  onAction={detail=>{events.push({kind:'action',callbackId,runKey:detail.runKey,target:detail.target,sourceControl:detail.sourceControl,origin:detail.origin,instanceId:detail.instanceId,eventCurrentTargetMatches:!detail.event||detail.event.currentTarget===detail.control,controlConnected:detail.control.isConnected});return false;}}
  onPackSelectionChange={detail=>{events.push({kind:'selection',callbackId,...detail});if(acceptSelection){props={...props,packs:{...props.packs,optional:{...props.packs.optional,entries:props.packs.optional.entries.map((entry,i)=>i===detail.index?{...entry,selected:detail.selected}:entry)}}};render();}return false;}}/>
</StrictMode>:null));
function removeIntercept(){if(intercept){document.removeEventListener('click',intercept);document.removeEventListener('keydown',intercept);document.removeEventListener('change',intercept);intercept=null;}}
const harness={
  ready:true,
  reset(patch:Partial<ProgressScreenProps>={}){removeIntercept();acceptSelection=false;callbackId='first';attached=true;props={...props,open:false};render();document.getElementById('opener')!.focus();props={...makeProgressScreenProps(),...patch};render();events.length=0;},
  patch(patch:Partial<ProgressScreenProps>){props={...props,...patch};render();},
  props:()=>props,
  events:()=>events,
  clear(){events.length=0;},
  controller(command:'button.menu_cancel'|'activate-focused-web'){return controller.current?.request(command)??false;},
  callback(id:string){callbackId=id;render();},
  accept(value:boolean){acceptSelection=value;},
  unmount(){attached=false;render();},
  intercept(type:'click'|'keydown'|'change',effect:'veto'|'close'|'close-reopen'|'instance'|'reorder'|'callback'|'unmount'){
    removeIntercept();intercept=()=>{
      removeIntercept();
      if(effect==='veto')return;
      if(effect==='close')harness.patch({open:false});
      else if(effect==='close-reopen'){harness.patch({open:false});harness.patch({open:true});}
      else if(effect==='instance')harness.patch({resourcePopup:props.resourcePopup?{...props.resourcePopup,instanceId:props.resourcePopup.instanceId+'-next'}:null});
      else if(effect==='reorder')harness.patch({modalOrder:[...(props.modalOrder??[])].reverse()});
      else if(effect==='callback')harness.callback('latest');
      else harness.unmount();
    };
    const run=intercept;
    intercept=event=>{if(effect==='veto')event.preventDefault();run(event);};
    document.addEventListener(type,intercept,{once:true});
  },
};
declare global{interface Window{progressHarness:typeof harness}}
window.progressHarness=harness;
render();
