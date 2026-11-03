import {useEffect,useLayoutEffect,useRef,useState} from 'react';import{createPortal}from'react-dom';
import{Button,InBedControls,InBedScreen}from'../src';import type{InBedActionDetail,InBedControlsLayout,InBedLayout}from'../src';
const labels={wake:'起床',chat:'打开聊天窗口'};
const dirt=new URL('../src/assets/disconnect/bg32.png',import.meta.url).href;
export function InBedExamples(){
 const[open,setOpen]=useState(false),[metrics,setMetrics]=useState<InBedControlsLayout>(),[receipt,setReceipt]=useState('起床和聊天请求交由宿主处理。'),[viewport,setViewport]=useState({width:320,height:240});const button=useRef<HTMLButtonElement>(null),host=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const node=host.current;if(!open||!node)return;const measure=()=>{const width=node.clientWidth,height=node.clientHeight;setViewport(old=>old.width===width&&old.height===height?old:{width,height});};measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[open]);
 useEffect(()=>{let active=true;(async()=>{
  const family=button.current?getComputedStyle(button.current).fontFamily:'monospace';
  await document.fonts.load(`16px ${family}`,labels.wake+labels.chat);
  const context=document.createElement('canvas').getContext('2d');if(!context)return;context.font=`16px ${family}`;
  const widths=[labels.wake,labels.chat].map(text=>Math.min(120,context.measureText(text).width/2));
  if(active)setMetrics({scale:2,font:{family,size:8,lineHeight:10},rowHeight:20,buttons:[{size:[widths[0]!+10,20],labelSize:[widths[0]!,10]},{size:[widths[1]!+10,20],labelSize:[widths[1]!,10]}]});
 })();return()=>{active=false;};},[]);
 const receive=(detail:InBedActionDetail)=>{setReceipt(detail.action==='wake-up'?'请求起床':'请求打开聊天窗口');setOpen(false);};
 const size=[Math.ceil(viewport.width/2),Math.ceil(viewport.height/2)] as const;
 const layout:InBedLayout|undefined=metrics&&{...metrics,size,contentRect:[0,0,size[0],size[1]],status:{origin:[Math.max(0,(size[0]-Math.min(220,size[0]-20))/2),size[1]*.65-24.5],width:Math.max(1,Math.min(220,size[0]-20)),alignment:'center',verticalAlignment:'center'}};
 return <div data-testid="in-bed-demo" style={{display:'grid',gap:16,minWidth:0}}>
  <Button ref={button} disabled={!metrics} onClick={()=>setOpen(true)}>预览睡眠界面</Button>
  <output aria-label="睡眠操作请求">{receipt}</output>
  {metrics&&<div style={{width:256,maxWidth:'100%',overflow:'hidden',minHeight:40,background:'#303030'}}><InBedControls layout={metrics} labels={labels} onAction={receive}/></div>}
  {open&&layout&&createPortal(<div ref={host} data-testid="in-bed-host" style={{position:'fixed',inset:0,zIndex:1000,overflow:'hidden',backgroundImage:`url(${JSON.stringify(dirt)})`,backgroundSize:'64px 64px'}}>
   <InBedScreen open layout={layout} label="睡眠" status="2/3位玩家正在睡觉" labels={labels} inputHint={{visible:false}} onAction={receive}/>
  </div>,document.body)}
 </div>;
}
