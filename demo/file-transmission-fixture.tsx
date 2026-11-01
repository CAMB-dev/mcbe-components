import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {FileTransmissionScreen,FileTransmissionPanel,FileTransferProgress} from '../src/file-transmission';
import type {FileTransmissionController} from '../src/file-transmission';
import type {FileTransmissionBindings,FileTransmissionAction} from '../src/file-transmission-model';
import {makeFileTransmissionModel} from '../tests/fixtures/file-transmission-profile';
import '../src/file-transmission.css';

const root=createRoot(document.getElementById('root')!);let model=makeFileTransmissionModel();
let open=false,mode='screen',nativeVeto=false,callback='first',controller:FileTransmissionController|null=null;
const actions:{target:FileTransmissionAction['target'];callback:string;origin:string;connected:boolean}[]=[];
function render(){flushSync(()=>root.render(<><button id="open" onClick={()=>{open=true;render();}}>Open transfer</button><div id="file-transmission-host" data-file-transmission-material-plane={mode} style={{position:'relative',width:500,height:301,background:'#203040'}}>
 {mode.startsWith('bar-')?<div style={{position:'absolute',left:126,top:148}}><FileTransferProgress width={248} scale={1} percentage={mode==='bar-0'?0:mode==='bar-1'?1:.5} visible={true} imageClipPolicy="visible-fraction-web" label="Source bar"/></div>:mode==='panel'?<FileTransmissionPanel model={{...model,onAction:detail=>{actions.push({target:detail.target,origin:detail.origin,callback,connected:detail.control.isConnected});}}}/>:<FileTransmissionScreen model={{...model,onAction:detail=>{actions.push({target:detail.target,origin:detail.origin,callback,connected:detail.control.isConnected});}}} open={open} label="File transfer" baseLayer={null} titleArt={null} controllerRef={value=>{controller=value;}} onNativeClick={event=>{if(nativeVeto)event.preventDefault();}}/>}
 </div></>));}
window.fileTransmissionFixture={ready:true,actions,render(options={}){if(options.open!==undefined)open=options.open;if(options.mode!==undefined)mode=options.mode;model={...model,...options.disabled===undefined?{}:{disabled:options.disabled},...options.readOnly===undefined?{}:{readOnly:options.readOnly},...options.runKey===undefined?{}:{runKey:options.runKey},bindings:{...model.bindings,...options.bindings}};if(options.callback)callback=options.callback;if(options.nativeVeto!==undefined)nativeVeto=options.nativeVeto;render();},command(command){return controller?.request(command)??false;},clear(){actions.length=0;},unmount(){flushSync(()=>root.unmount());}};
render();
declare global {interface Window {fileTransmissionFixture:{ready:boolean;actions:{target:FileTransmissionAction['target'];callback:string;origin:string;connected:boolean}[];render(options?:{open?:boolean;mode?:string;disabled?:boolean;readOnly?:boolean;runKey?:string;bindings?:Partial<FileTransmissionBindings>;callback?:string;nativeVeto?:boolean}):void;command(command:'button.menu_cancel'|'button.menu_tab_left'|'button.menu_tab_right'):boolean;clear():void;unmount():void}}}
