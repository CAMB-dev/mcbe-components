import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {DisconnectScreen, DisconnectMessage, DisconnectActions} from '../src/disconnect';
import type {DisconnectControllerHandle, DisconnectScreenProps, DisconnectVariant} from '../src/disconnect-types';
import {createDisconnectDemoProps} from './disconnect-data';
import '../src/disconnect.css';

interface Config {
  variant: DisconnectVariant; part: 'screen'|'message'|'actions'; scale: number;
  width: number; height: number; renderer: 'css'|'gpu'; mounted: boolean; hidden: boolean;
  modal: boolean; disabled: boolean; menuCancelEnabled: boolean; uriVisible: boolean;
  storeIgnored: boolean; hiddenSlots: 'reserve'|'collapse'; backgroundOnly: boolean;
  preventLeaf: boolean; preventAncestor: boolean; preventDocument: boolean;
  disableOnClick: boolean; hideButton: string; strict: boolean; longText: boolean; inset: number; nativeHintDialog: boolean; inert: boolean;
}
declare global {interface Window {disconnectQA: any}}
const initial: Config = {variant:'disconnect',part:'screen',scale:1,width:320,height:240,renderer:'css',mounted:true,hidden:false,
  modal:false,disabled:false,menuCancelEnabled:true,uriVisible:false,storeIgnored:false,hiddenSlots:'reserve',backgroundOnly:false,
  preventLeaf:false,preventAncestor:false,preventDocument:false,disableOnClick:false,hideButton:'',strict:false,longText:false,inset:0,nativeHintDialog:false,inert:false};
const api: any = window.disconnectQA = {events:[],refs:{},refEvents:[],config:initial,controller:null};
const refCache = new Map<string, (node: any) => any>();
function tracked(name: string) {
  if (!refCache.has(name)) refCache.set(name, node => {
    api.refs[name] = node; if (name === 'controller') api.controller = node;
    api.refEvents.push({name,phase:node?'attach':'null'});
    if (node) return () => { if (api.refs[name] === node) api.refs[name] = null;
      if (name === 'controller' && api.controller === node) api.controller = null;
      api.refEvents.push({name,phase:'cleanup'}); };
  });
  return refCache.get(name)!;
}
function Fixture() {
  const [config, setConfig] = useState(initial);
  api.config = config;
  api.configure = (patch: Partial<Config>) => flushSync(() => setConfig(before => ({...before,...patch})));
  api.clear = () => { api.events.length = 0; };
  useEffect(() => {
    const veto = (event: Event) => { if (api.config.preventDocument && (event.target as Element)?.closest('#disconnect-stage')) event.preventDefault(); };
    document.addEventListener('click', veto); document.addEventListener('keydown', veto);
    return () => { document.removeEventListener('click', veto); document.removeEventListener('keydown', veto); };
  }, []);
  const p = createDisconnectDemoProps(config.variant);
  let model = {...p.actions};
  if ('openAccount' in model) model = {...model,openAccount:{...model.openAccount,visible:config.uriVisible}};
  if ('storeIgnored' in model) model = {...model,storeIgnored:config.storeIgnored};
  const key = config.hideButton === 'open-account' ? 'openAccount' : config.hideButton;
  if (key && key in model && typeof (model as any)[key] === 'object') model = {...model,[key]:{...(model as any)[key],visible:false}};
  const onAction: DisconnectScreenProps['onAction'] = detail => api.events.push({...detail,
    event:detail.event?{type:detail.event.type,ownerTag:detail.event.currentTarget?.tagName,ownerButton:(detail.event.currentTarget as HTMLElement)?.dataset.disconnectButton}:undefined});
  const buttonRefs = Object.fromEntries(['ok','back','store','continue','cancel','open-account'].map(name => [name,tracked(name)]));
  const buttonProps = Object.fromEntries(['ok','back','store','continue','cancel','open-account'].map(name => [name,{onClick:(event:React.MouseEvent<HTMLButtonElement>)=>{
    if (api.config.preventLeaf) event.preventDefault();
    if (api.config.disableOnClick) api.configure({disabled:true});
  }}]));
  const props = {...p,actions:model,layout:{...p.layout,size:[config.width,config.height] as const,scale:config.scale,hiddenSlots:config.hiddenSlots},
    contentRect:[config.inset,config.inset,config.width-2*config.inset,config.height-2*config.inset] as const,
    background:{...p.background,renderer:config.renderer},hidden:config.hidden,modal:config.modal,disabled:config.disabled,
    menuCancelEnabled:config.menuCancelEnabled,inert:config.inert,buttonProps,buttonRefs,onAction,
    ...(config.nativeHintDialog?{inputHint:{visible:true,box:[0,0,1,1] as const,content:<dialog id="native-hint-dialog"><button>Native dialog action</button></dialog>}}:{}),
    ...(config.longText?{title:'A very long disconnected title '.repeat(12),body:'Long server message with spaces and 中文 '.repeat(30)}:{})};
  const element = config.part === 'message' ? <DisconnectMessage layout={props.layout} title={props.title} body={props.body} hidden={props.hidden} inert={props.inert} ref={tracked('message')}/>
    : config.part === 'actions' ? <DisconnectActions layout={props.layout} model={props.actions} disabled={props.disabled} inert={props.inert} onAction={onAction} buttonProps={buttonProps} buttonRefs={buttonRefs} ref={tracked('actions')}/>
    : <DisconnectScreen {...props} ref={tracked('screen')} controllerRef={tracked('controller') as (handle:DisconnectControllerHandle|null)=>void}/>;
  return <><button id="opener" onClick={()=>api.configure({modal:true})}>Open disconnect</button>
    <div id="disconnect-stage" className={config.backgroundOnly?'background-only':undefined}
      onClick={event=>{if(api.config.preventAncestor)event.preventDefault();}}
      onKeyDown={event=>{if(api.config.preventAncestor)event.preventDefault();}}>
      {config.mounted && (config.strict?<StrictMode>{element}</StrictMode>:element)}
    </div><button id="outside">Outside</button></>;
}
createRoot(document.getElementById('disconnect-fixture-root')!).render(<Fixture/>);
