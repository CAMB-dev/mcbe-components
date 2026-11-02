import {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {OreExternalServerForm} from '../src/ore-external-server-form';
import type {OreExternalServerValues,OreExternalServerActionDetail} from '../src/ore-external-server-form';
import {OreButton} from '../src/ore-button';
import {OreActionBar} from '../src/ore-action-bar';
import {OreScreenFrame} from '../src/ore-screen-frame';
import {OreScrollArea} from '../src/ore-scroll-area';
import {oreTextFieldSkins,oreExternalServerIcons,orePermissionAssets} from 'virtual:mcbeui-game-font';
import '../src/ore-external-server-form.css';

export interface OreServerConfiguration{
 mode:'add'|'edit';accept:boolean;controlled:boolean;disabled:boolean;readOnly:boolean;hidden:boolean;
 size:readonly[number,number];viewportSize:readonly[number,number];guiScale:number;
 portValidation:'source-blur'|'host';submitAction:'source-blur'|'add'|'add-and-play'|'save';
 preventFieldChange:boolean;preventChange:boolean;preventBlur:boolean;preventSubmit:boolean;preventReset:boolean;preventKey:boolean;
 descriptions:boolean;nativeProfile:boolean;safeArea:{top:number;left:number;right:number};
}
interface Request{action:string;value:OreExternalServerValues;dirty:boolean;origin:string;parsedPort:number|null;owner:string}
declare global{interface Window{oreServerFixture:{configure:(v:Partial<OreServerConfiguration>)=>void;setValue:(v:OreExternalServerValues)=>void;form:HTMLFormElement|null;inputs:Record<'name'|'address'|'port',HTMLInputElement|null>;requests:Request[];changes:{value:OreExternalServerValues;origin:string;field?:string;owner:string}[];invalid:{value:string;suggestedValue:string;reason:string}[];native:string[];clear:()=>void;nativeReady:boolean;refEvents:string[];toggleRefComponent:(show:boolean)=>void;buttonClicks:()=>number}}}
// Explicit test-host leaf for behavior-only runs without private local images.
// It is not a library default or a source/native pixel reference.
const leaf='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const skins=oreTextFieldSkins??{normal:leaf,disabled:leaf};
const initial:OreExternalServerValues={name:'Host server',address:'host.example',port:'00123'};
const api:Window['oreServerFixture']={configure:()=>{},setValue:()=>{},form:null,inputs:{name:null,address:null,port:null},requests:[],changes:[],invalid:[],native:[],clear(){api.requests=[];api.changes=[];api.invalid=[];api.native=[];},nativeReady:false,refEvents:[],toggleRefComponent:()=>{},buttonClicks:()=>0};
window.oreServerFixture=api;
const image=(url:string)=> <img src={url} alt="" style={{display:'block',width:'100%',height:'100%',objectFit:'contain',imageRendering:'pixelated'}}/>;
function Fixture(){
 const [config,setConfig]=useState<OreServerConfiguration>({mode:'add',accept:true,controlled:true,disabled:false,readOnly:false,hidden:false,size:[900,560],viewportSize:[900,560],guiScale:2,portValidation:'source-blur',submitAction:'source-blur',preventFieldChange:false,preventChange:false,preventBlur:false,preventSubmit:false,preventReset:false,preventKey:false,descriptions:false,nativeProfile:false,safeArea:{top:0,left:0,right:0}});
 const [value,setValue]=useState<OreExternalServerValues>(initial),buttonCount=useRef(0);
 const [showRef,setShowRef]=useState(true),cleanupRef=useRef((node:HTMLDivElement|null)=>{if(node){api.refEvents.push('attach');return()=>{api.refEvents.push('cleanup');};}api.refEvents.push('null');}).current;
 api.configure=patch=>setConfig(old=>({...old,...patch}));api.setValue=setValue;api.toggleRefComponent=setShowRef;api.buttonClicks=()=>buttonCount.current;
 const labels=config.nativeProfile?{name:'服务器名称',address:'服务器地址',port:'端口',add:'添加服务器',addAndPlay:'添加并开始',delete:'删除',save:'保存'}:{name:'Server name',address:'Server address',port:'Server port',add:'Add host',addAndPlay:'Add and play host',delete:'Delete host',save:'Save host'};
 const route=config.mode==='add'?{mode:'add' as const,...config.submitAction==='source-blur'?{}:{submitAction:config.submitAction==='add-and-play'?'add-and-play' as const:'add' as const}}:{mode:'edit' as const,...config.submitAction==='source-blur'?{}:{submitAction:'save' as const}};
 const request=(detail:OreExternalServerActionDetail)=>{api.requests.push({action:detail.action,value:detail.value,parsedPort:Number.isNaN(detail.parsedPort)?null:detail.parsedPort,dirty:detail.dirty,origin:detail.origin,owner:detail.event.currentTarget.tagName});};
 return <main style={{padding:config.nativeProfile?0:12,boxSizing:'border-box',minWidth:0}}>
  {!config.nativeProfile&&<button id="outside">Outside</button>}
  <OreExternalServerForm {...route} title={config.nativeProfile?'添加新服务器':'Host external server'} backLabel="Back host" labels={labels} skins={skins}
   size={config.size} viewportSize={config.viewportSize} safeArea={config.safeArea} guiScale={config.guiScale} locale={config.nativeProfile?'zh_CN':'en_US'}
   {...config.controlled?{value,onValueChange:(next,detail)=>{api.changes.push({value:next,origin:detail.origin,field:detail.field,owner:detail.event.currentTarget.tagName});if(config.accept)setValue(next);}}:{defaultValue:initial}}
   ref={node=>{api.form=node;}} fieldRefs={{name:node=>{api.inputs.name=node;},address:node=>{api.inputs.address=node;},port:node=>{api.inputs.port=node;}}}
   backIcon={orePermissionAssets?.back?image(orePermissionAssets.back):undefined}
   editIcons={oreExternalServerIcons?{delete:image(oreExternalServerIcons.delete),save:image(oreExternalServerIcons.save)}:undefined}
   placeholders={config.nativeProfile?{name:'示例服务器名称',address:'IP (1.0.0.1) 或 URL (www.exmare.com)'}:{name:'Name placeholder',address:'Address placeholder'}}
   descriptions={config.descriptions?{name:'A long description '.repeat(60),address:'Address description'}:undefined}
   disabled={config.disabled} readOnly={config.readOnly} hidden={config.hidden} portValidation={config.portValidation}
   onPortInvalid={detail=>api.invalid.push({value:detail.value,suggestedValue:detail.suggestedValue,reason:detail.reason})} onAction={request}
   fieldProps={{name:{onChange:event=>{api.native.push('field-change');if(config.preventFieldChange)event.preventDefault();}},port:{onBlur:event=>{api.native.push('field-blur');if(config.preventBlur)event.preventDefault();}}}}
   formProps={{id:'ore-server-primary','data-testid':'ore-server-primary',onChange:event=>{api.native.push('form-change');if(config.preventChange)event.preventDefault();},onSubmit:event=>{api.native.push('submit');if(config.preventSubmit)event.preventDefault();},onReset:event=>{api.native.push('reset');if(config.preventReset)event.preventDefault();},onKeyDown:event=>{if(config.preventKey)event.preventDefault();}}}/>
  {!config.nativeProfile&&<>
   <OreActionBar label="Standalone action bar" guiScale={2} style={{maxWidth:500}}><OreButton horizontal variant="secondary" onClick={()=>buttonCount.current++}>Standalone left</OreButton><OreButton horizontal variant="primary" onClick={()=>buttonCount.current++}>Standalone right</OreButton></OreActionBar>
   <OreScreenFrame title="Standalone frame" backLabel="Standalone back" onBack={()=>buttonCount.current++} size={[300,220]} viewportSize={[300,220]} safeArea={{top:0,left:0,right:0}} scrollLabel="Standalone content" guiScale={1}><div style={{height:600}}>Overflow content</div></OreScreenFrame>
   {showRef&&<div style={{display:'flex',width:260,height:120}}><OreScrollArea label="Ref cleanup content" ref={cleanupRef} viewportRef={cleanupRef} guiScale={1}><div style={{height:400}}>Ref content</div></OreScrollArea></div>}
  </>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
