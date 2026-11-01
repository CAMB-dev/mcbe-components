import {Component,useCallback,useLayoutEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal,flushSync} from 'react-dom';
import {ProgressScreen,FileTransmissionScreen} from '../src';
import type {ProgressControllerHandle} from '../src';
import {makeProgressScreenProps} from '../tests/fixtures/progress-profile';
import {makeFileTransmissionModel} from '../tests/fixtures/file-transmission-profile';
import '../src/progress-screen.css';
import '../src/file-transmission.css';
const setter=new URL(location.href).searchParams.get('mode')==='setter';
type State={open:boolean;inner:boolean;revision:number;callback:string;runKey:string;disabled:boolean;readOnly:boolean};
let update:(state:Partial<State>)=>void=()=>{},controller:ProgressControllerHandle|null=null,saved:ProgressControllerHandle|null=null,renders=0;
const events:string[]=[],refEvents:('attach'|'detach')[]=[];
class Boundary extends Component<{children:ReactNode},{fault:string|null}>{
 state:{fault:string|null}={fault:null};
 static getDerivedStateFromError(error:Error){return{fault:error.message};}
 render(){return this.state.fault?<output id="fault">{this.state.fault}</output>:this.props.children;}
}
function App(){
 const[state,setState]=useState<State>({open:false,inner:false,revision:0,callback:'first',runKey:'owner-1',disabled:false,readOnly:false}),[handle,setHandle]=useState<ProgressControllerHandle|null>(null),[node,setNode]=useState<HTMLElement|null>(null);renders++;
 const collect=useCallback((value:ProgressControllerHandle|null)=>{controller=value;refEvents.push(value?'attach':'detach');},[]);
 useLayoutEffect(()=>{if(setter)controller=handle;update=next=>setState(old=>({...old,...next}));window.progressOwner.ready=true;});
 const base=makeProgressScreenProps(),p={...base,bindings:{...base.bindings,ttsEnabled:false,progressText:'Progress revision '+state.revision}};
 return <><button id="opener" onClick={()=>setState(old=>({...old,open:true}))}>Open progress</button><ProgressScreen {...p} ref={setter?undefined:setNode} runKey={state.runKey} open={state.open} disabled={state.disabled} readOnly={state.readOnly} controllerRef={setter?setHandle:collect} onAction={detail=>{events.push(state.callback+':'+detail.target);}}/>
 {node&&state.inner&&createPortal(<FileTransmissionScreen model={{...makeFileTransmissionModel(),onAction:detail=>{events.push('nested:'+detail.target);}}} open={true} label="Nested host modal" baseLayer={null} titleArt={null}/>,node)}</>;
}
window.progressOwner={ready:false,events,refEvents,set(next){flushSync(()=>update(next));},command(command){return controller?.request(command)??false;},save(){saved=controller;},savedCommand(command){return saved?.request(command)??false;},sameHandle(){return saved===controller;},renders:()=>renders};
createRoot(document.getElementById('root')!).render(<Boundary><App/></Boundary>);
declare global{interface Window{progressOwner:{ready:boolean;events:string[];refEvents:('attach'|'detach')[];set(next:Partial<State>):void;command(command:'button.menu_cancel'|'activate-focused-web'):boolean;save():void;savedCommand(command:'button.menu_cancel'|'activate-focused-web'):boolean;sameHandle():boolean;renders():number}}}
