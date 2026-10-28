import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ActionBar, BossBar, ChatMessage, ChatPanel, HeldItemTooltip, Scoreboard, StatusEffect, TitleOverlay } from '../src/hud-overlays';

function Sample({id,children,width=600}:{id:string;children:ReactNode;width?:number}){
  return <section className="calibration-case" style={{gridColumn:'1 / -1',minWidth:0}}><h2>{id}</h2><div className="calibration-stage" data-case={id} style={{background:'#28292a',width:'100%',overflow:'auto'}}><div style={{width,maxWidth:'100%',minHeight:60,position:'relative','--mc-font-size':'20px','--mc-font-size-lg':'40px','--mc-font-size-xl':'60px'} as CSSProperties}>{children}</div></div></section>;
}
const messages=[{id:'first',text:'First message'},{id:'second',text:'Second message'}];
function ChatSpecimen({label,children}:{label:string;children:ReactNode}){
  return <div role="region" aria-label={`${label} specimen scroll area`} tabIndex={0} style={{width:'100%',maxWidth:'100%',minWidth:0,overflowX:'auto'}}><div style={{width:420}}>{children}</div></div>;
}
function ChatInteractions(){
  const[attempt,setAttempt]=useState(''),[sent,setSent]=useState(''),[controlledSent,setControlledSent]=useState('');
  const[dynamic,setDynamic]=useState(Array.from({length:40},(_,index)=>({id:String(index),text:`Dynamic message ${index}`})));
  return <section id="hud-overlays-interaction-fixture" aria-label="HUD overlay interaction fixtures" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr)',minWidth:0,gap:24,justifyItems:'start'}}>
    <ChatSpecimen label="Uncontrolled chat"><ChatPanel label="Uncontrolled overlay chat" messages={messages} input defaultValue="  Hello Bedrock  " onSend={setSent}/></ChatSpecimen>
    <output aria-label="Overlay chat sent">{sent}</output>
    <ChatSpecimen label="Controlled chat"><ChatPanel label="Controlled overlay chat" messages={messages} input value="Fixed draft" onValueChange={setAttempt} onSend={setControlledSent}/></ChatSpecimen>
    <output aria-label="Overlay chat attempted draft">{attempt}</output><output aria-label="Controlled overlay chat sent">{controlledSent}</output>
    <ChatSpecimen label="Disabled chat"><ChatPanel label="Disabled overlay chat" messages={messages} input disabled defaultValue="Disabled draft" onSend={setSent}/></ChatSpecimen>
    <ChatSpecimen label="Readonly chat"><ChatPanel label="Readonly overlay chat" messages={messages}/></ChatSpecimen>
    <ChatSpecimen label="Unwired chat"><ChatPanel label="Unwired overlay chat" messages={messages} input defaultValue="Cannot send"/></ChatSpecimen>
    <ChatSpecimen label="Bounded chat"><ChatPanel label="Bounded overlay chat" messages={Array.from({length:60},(_,index)=>({id:String(index),text:`Message ${index}`}))}/></ChatSpecimen>
    <ChatSpecimen label="Dynamic chat"><ChatPanel label="Dynamic overlay chat" messages={dynamic}/></ChatSpecimen>
    <button type="button" onClick={()=>setDynamic(value=>[...value,{id:String(value.length),text:`Dynamic message ${value.length}`}])}>Add overlay message</button>
  </section>;
}
function ControlledOverlays(){
  const[opacity,setOpacity]=useState(1),[background,setBackground]=useState(true);
  return <Sample id="overlay-controlled"><button type="button" onClick={()=>setOpacity(value=>value===1?.25:1)}>Toggle overlay opacity</button><button type="button" onClick={()=>setBackground(value=>!value)}>Toggle overlay background</button><div data-controlled-overlay><ActionBar opacity={opacity} showBackground={background} backgroundOpacity={.5}>Minecraft</ActionBar><HeldItemTooltip opacity={opacity} showBackground={background} backgroundOpacity={.5}>Minecraft</HeldItemTooltip><TitleOverlay title="Minecraft" subtitle="Minecraft" opacity={opacity} showBackground={background} backgroundOpacity={.5}/></div></Sample>;
}
/** Static, source-sized GUI2 specimens. No clocks, timers, masked text or scaled stages. */
export function HudOverlaysFixtures(){return <>
  {[0,.5,1].map(value=><Sample key={value} id={`overlay-boss-${value*100}`}><BossBar name="Minecraft" value={value} color={[1,1,1]}/></Sample>)}
  <Sample id="overlay-boss-magenta"><BossBar name="Minecraft" value={.5} color={[1,0,1]}/></Sample>
  <Sample id="overlay-boss-clamped"><BossBar name="Minecraft" value={Infinity}/></Sample>
  <Sample id="overlay-chat-message" width={320}><ChatMessage backgroundOpacity={.5}>Minecraft</ChatMessage></Sample>
  <Sample id="overlay-chat-opaque" width={320}><ChatMessage backgroundOpacity={1}>Minecraft</ChatMessage></Sample>
  <Sample id="overlay-chat-wrap" width={200}><ChatMessage backgroundOpacity={.5}>Minecraft Minecraft Minecraft Minecraft</ChatMessage></Sample>
  <Sample id="overlay-scoreboard"><Scoreboard title="Minecraft" entries={[{id:'steve',name:'Steve',score:30},{id:'alex',name:'Alex',score:7}]} backgroundOpacity={.5} titleBackgroundOpacity={.5}/></Sample>
  <Sample id="overlay-scoreboard-transparent"><Scoreboard title="Minecraft" entries={[{id:'steve',name:'Steve',score:30}]} backgroundOpacity={0} titleBackgroundOpacity={0}/></Sample>
  <Sample id="overlay-scoreboard-long"><Scoreboard title="Minecraft Minecraft Minecraft Minecraft" entries={[{id:'long',name:'Minecraft Minecraft Minecraft Minecraft',score:123456789}]} backgroundOpacity={.5} titleBackgroundOpacity={.5}/></Sample>
  <Sample id="overlay-effect-speed"><StatusEffect name="Speed" effect="speed" duration="0:30"/></Sample>
  <Sample id="overlay-effect-ambient"><StatusEffect name="Speed" effect="speed" ambient duration="0:30"/></Sample>
  <Sample id="overlay-effect-poison"><StatusEffect name="Poison" effect="poison"/></Sample>
  <Sample id="overlay-action"><ActionBar showBackground backgroundOpacity={.5}>Minecraft</ActionBar></Sample>
  <Sample id="overlay-action-opaque"><ActionBar showBackground backgroundOpacity={1}>Minecraft</ActionBar></Sample>
  <Sample id="overlay-action-plain"><ActionBar>Minecraft</ActionBar></Sample>
  <Sample id="overlay-held"><HeldItemTooltip showBackground backgroundOpacity={.5}>Minecraft</HeldItemTooltip></Sample>
  <Sample id="overlay-held-plain"><HeldItemTooltip>Minecraft</HeldItemTooltip></Sample>
  <Sample id="overlay-held-long"><HeldItemTooltip showBackground backgroundOpacity={.5}>Minecraft Minecraft Minecraft Minecraft Minecraft Minecraft</HeldItemTooltip></Sample>
  <Sample id="overlay-title"><TitleOverlay title="Minecraft" subtitle="Minecraft" showBackground backgroundOpacity={.5}/></Sample>
  <Sample id="overlay-title-plain"><TitleOverlay title="Minecraft" subtitle="Minecraft"/></Sample>
  <Sample id="overlay-title-no-shadow"><TitleOverlay title="Minecraft" subtitle="Minecraft" showBackground shadow={false} backgroundOpacity={.5}/></Sample>
  <Sample id="overlay-hidden"><div data-hidden-overlays><BossBar hidden name="Hidden boss" value={1}/><ChatMessage hidden>Hidden message</ChatMessage><ChatPanel hidden messages={[]}/><Scoreboard hidden title="Hidden board" entries={[]}/><StatusEffect hidden name="Hidden effect" effect="speed"/><ActionBar hidden>Hidden action</ActionBar><TitleOverlay hidden title="Hidden title"/><HeldItemTooltip hidden>Hidden item</HeldItemTooltip></div></Sample>
  <ControlledOverlays/>
  <ChatInteractions/>
</>;}
