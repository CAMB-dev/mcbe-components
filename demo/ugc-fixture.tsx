import {StrictMode,createRef,useState} from 'react';
import type {SyntheticEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {UGCViewer,UGCItemCard} from '../src/ugc-viewer';
import type {UGCItem,UGCActionDetail} from '../src/ugc-viewer';
import '../src/styles.css';
export interface UGCFixtureSettings {scale:number;size:readonly[number,number];query:string;controlled:boolean;accept:boolean;modal:boolean;disabled:boolean;readOnly:boolean;hidden:boolean;closeVisible:boolean;closeEnabled:boolean;inputMode:'mouse'|'touch';thumb:boolean;max:number;items:readonly UGCItem[];veto:'none'|'leaf'|'root'|'parent'|'native'|'stop'|'unmount'|'late-disabled'|'late-hidden'|'late-remove'|'late-cap';standalone:boolean;cardWidth:number}
const sample=new URL('./screenshot-assets/white-candidate.png',import.meta.url).href;
export const ugcFrameMaterial={src:sample,sourceSize:[15,15] as const}; // Explicit host material, not an alias for missing source White.
const initial:UGCFixtureSettings={scale:1,size:[384,234],query:'',controlled:true,accept:true,modal:false,disabled:false,readOnly:false,hidden:false,closeVisible:true,closeEnabled:true,inputMode:'mouse',thumb:false,max:12,items:Array.from({length:18},(_,i)=>({id:`item-${i}`,label:`World ${i}`,labelHeight:10,image:{src:sample,sourceSize:[15,15]}})),veto:'none',standalone:false,cardWidth:120};
const refs={root:createRef<HTMLElement>(),search:createRef<HTMLInputElement>(),viewport:createRef<HTMLDivElement>(),close:createRef<HTMLButtonElement>(),card:createRef<HTMLButtonElement>(),container:createRef<HTMLDivElement>(),items:Object.fromEntries(initial.items.map(i=>[i.id,createRef<HTMLButtonElement>()]))};
type Log={kind:string;[key:string]:unknown};
interface QA {settings:UGCFixtureSettings;events:Log[];refs:typeof refs;configure:(p:Partial<UGCFixtureSettings>)=>void;unmount:()=>void}
declare global {interface Window {ugcInitial?:Partial<UGCFixtureSettings>;ugcQA:QA}}
const root=createRoot(document.getElementById('root')!);const qa:QA={settings:initial,events:[],refs,configure:()=>{},unmount:()=>root.unmount()};window.ugcQA=qa;
function App(){const[s,set]=useState(()=>({...initial,...window.ugcInitial}));qa.settings=s;qa.configure=p=>set(old=>({...old,...p}));
 const veto=(e:SyntheticEvent,level:string)=>{if(level==='parent'&&e.type==='click'&&s.veto.startsWith('late-'))flushSync(()=>set(old=>({...old,max:s.veto==='late-cap'?0:old.max,items:s.veto==='late-remove'?old.items.filter(i=>i.id!=='item-0'):old.items.map(i=>i.id==='item-0'?{...i,disabled:s.veto==='late-disabled',hidden:s.veto==='late-hidden'}:i)})));if(s.veto===level)e.preventDefault();if(s.veto==='stop'&&level==='leaf')e.stopPropagation();if(s.veto==='unmount'&&level==='parent')root.unmount()};
 const action=(d:UGCActionDetail)=>qa.events.push({kind:'action',action:d.action,target:d.target,reason:d.reason,id:d.item?.id,index:d.index,query:d.query,current:d.event.currentTarget.tagName,button:d.button?.tagName,methods:[d.event.isDefaultPrevented(),d.event.isPropagationStopped()],connected:d.event.currentTarget.isConnected});
 return <main onClick={e=>veto(e,'parent')} onChange={e=>veto(e,'parent')} onKeyDown={e=>veto(e,'parent')} ref={n=>{if(n&&s.veto==='native')n.onclick=e=>e.preventDefault();else if(n)n.onclick=null}}><button id="ugc-sink">Outside</button><div className="qa-pan"><div className="qa-host">
 <UGCViewer id="ugc-viewer" ref={refs.root} size={s.size} scale={s.scale} title="World library" searchLabel="Search worlds" searchPlaceholder="Search" imageFrameMaterial={ugcFrameMaterial} items={s.items} maxGridItems={s.max} query={s.controlled?s.query:undefined} defaultQuery={s.query} disabled={s.disabled} readOnly={s.readOnly} hidden={s.hidden} closeVisible={s.closeVisible} closeEnabled={s.closeEnabled} modal={s.modal} inputMode={s.inputMode} touchThumbVisible={s.thumb} searchRef={refs.search} scrollViewportRef={refs.viewport} closeRef={refs.close} itemRefs={refs.items}
 onClick={e=>veto(e,'root')} onChange={e=>veto(e,'root')} onKeyDown={e=>veto(e,'root')} searchProps={{onChange:e=>veto(e,'leaf'),onCompositionStart:()=>qa.events.push({kind:'composition-start'}),onCompositionEnd:()=>qa.events.push({kind:'composition-end'})}}
 onQueryChange={(value,d)=>{qa.events.push({kind:'query',value,current:d.event.currentTarget.tagName});if(s.accept)set(old=>({...old,query:value}))}} onAction={action}/>
 {s.standalone&&<UGCItemCard id="ugc-card" ref={refs.card} containerRef={refs.container} item={s.items[0]!} width={s.cardWidth} imageFrameMaterial={ugcFrameMaterial} scale={s.scale} disabled={s.disabled} readOnly={s.readOnly} onClick={e=>veto(e,'leaf')} onAction={action}/>}</div></div><output>{JSON.stringify(s)}</output></main>;
}root.render(location.search.includes('strict')?<StrictMode><App/></StrictMode>:<App/>);
