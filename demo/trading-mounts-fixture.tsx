import {useState} from 'react';
import type {ReactNode} from 'react';
import {MountInventory,TradeOffer,TradingScreen} from '../src/trading-mounts';
import type {TradeOfferData} from '../src/trading-mounts';
const diamond=new URL('./assets/minecraft/diamond.png',import.meta.url).href;
const emerald=new URL('./assets/minecraft/emerald.png',import.meta.url).href;
const cost={name:'Emerald',image:emerald,count:6},result={name:'Diamond',image:diamond,count:2};
const available:TradeOfferData={id:'available',label:'Available specimen',costs:[{item:cost}],result};
const offers:TradeOfferData[]=[available,{...available,id:'discount',label:'Discount specimen',costs:[{item:{...cost,count:3},originalCount:6}]},{...available,id:'unavailable',label:'Unavailable specimen',available:false,crossedOut:true},{...available,id:'locked',label:'Locked specimen',locked:true}];
function Case({name,children}:{name:string;children:ReactNode}){return <section className="calibration-case" style={{gridColumn:'1 / -1',minWidth:0}}><h2>{name}</h2><div className="third-calibration-stage" style={{background:'#28292a',padding:24,minHeight:120}} data-case={`third-${name}`}>{children}</div></section>;}
export function TradingMountsFixture(){const[events,setEvents]=useState<string[]>([]),[selected,setSelected]=useState('available');const record=(text:string)=>setEvents(previous=>[...previous,text]);
return <section aria-label="Trading and mount source specimens">
<Case name="trading"><TradingScreen tiers={[{id:'novice',label:'Novice',unlocked:true,offers}]} selectedOfferId={selected} onOfferSelect={(id,action)=>{setSelected(id);record(`offer:${id}:${action}`);}} inputs={[cost,null]} result={result} canTrade onInputAction={(index,action)=>record(`input:${index}:${action}`)} onTakeResult={action=>record(`result:${action}`)} onTrade={()=>record('trade')} onHelp={()=>record('help')} levelProgress={0.25} possibleProgress={0.75}/></Case>
<Case name="trading-single"><TradingScreen showSecondInput={false} showLevelProgress={false}/></Case>
<Case name="trading-details"><TradingScreen detailButtons={[true,true,true]} onDetails={slot=>record(`details:${slot}`)}/></Case>
<Case name="trading-invalid"><TradingScreen slotValidity={[false,true,false]} inputs={[cost,null]} result={result}/></Case>
<Case name="trading-empty"><TradingScreen/></Case>
{(['normal','selected','unavailable','locked','discount','double']as const).map(state=><Case key={state} name={`offer-${state}`}><TradeOffer style={{width:240}} selected={state==='selected'} offer={state==='double'?{...available,id:'double',label:'Double cost specimen',costs:[{item:cost},{item:result}],paddedResult:false}:state==='discount'?offers[1]!:state==='unavailable'?offers[2]!:state==='locked'?offers[3]!:available} onSelect={(id,action)=>record(`single:${id}:${action}`)}/></Case>)}
<Case name="mount-horse"><MountInventory onEquipmentAction={(index,action)=>record(`equip:${index}:${action}`)} onClose={()=>record('close')}/></Case>
{([1,3,5]as const).map(columns=><Case key={columns} name={`mount-chest-${columns}`}><MountInventory chested storageColumns={columns} onStorageAction={(index,action)=>record(`storage:${index}:${action}`)}/></Case>)}
<Case name="mount-overlays"><MountInventory equipment={[{kind:'saddle',item:cost},{kind:'armor',item:result}]}/></Case>
<Case name="mount-carpet"><MountInventory equipment={[{kind:'carpet'}]}/></Case>
<Case name="mount-nautilus"><MountInventory equipment={[{kind:'nautilus-armor'}]}/></Case>
<output aria-label="Trading fixture events">{events.join('|')}</output></section>;}
