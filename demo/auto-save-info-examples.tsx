import {useLayoutEffect,useRef,useState}from'react';import{createPortal}from'react-dom';
import{AutoSaveInfoScreen,AutoSaveIcon,Button}from'../src';import type{AutoSaveInfoLayout}from'../src';
export function AutoSaveInfoExamples(){
 const[open,setOpen]=useState(false),[frame,setFrame]=useState(0),[receipt,setReceipt]=useState('等待确认'),[layout,setLayout]=useState<AutoSaveInfoLayout|null>(null),opener=useRef<HTMLButtonElement>(null),host=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(!open||!host.current||!opener.current)return;const node=host.current;
  const measure=()=>{const width=node.clientWidth,height=node.clientHeight,s=width>=420&&height>=380?2:1,family=getComputedStyle(opener.current!).fontFamily;
   const ctx=document.createElement('canvas').getContext('2d')!;ctx.font=`8px ${family}`;const size=[width/s,height/s]as const;
   const next:AutoSaveInfoLayout={size,panelOrigin:[(size[0]-200)/2,(size[1]-180)/2],scale:s,font:{family,size:8,lineHeight:10},titleSize:[Math.min(200,Math.max(1,Math.ceil(ctx.measureText('自动保存').width))),10],acceptLabelSize:[Math.min(182,Math.max(1,Math.ceil(ctx.measureText('确定').width))),10],messageAlignment:'left',messageVerticalAlignment:'top'};
   setLayout(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  };measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();
 },[open]);
 return <div data-testid="auto-save-info-demo" style={{display:'grid',gap:16,minWidth:0}}>
  <div style={{display:'flex',flexWrap:'wrap',gap:12}}>{Array.from({length:9},(_,i)=><div key={i} style={{display:'grid',justifyItems:'center',gap:4}}><AutoSaveIcon visible frame={i} scale={2} label={`存档帧 ${i}`}/><span>{i}</span></div>)}</div>
  <label style={{display:'flex',gap:12,alignItems:'center'}}>图标帧<input aria-label="存档图标帧" type="range" min="0" max="8" step="1" value={frame} onChange={e=>setFrame(Number(e.currentTarget.value))}/><output>{frame}</output></label>
  <Button ref={opener} onClick={()=>setOpen(true)}>预览自动保存说明</Button><output aria-label="自动保存确认">{receipt}</output>
  {open&&createPortal(<div ref={host} data-testid="auto-save-info-host" style={{position:'fixed',inset:0,zIndex:1000,overflow:'hidden',background:'#4c5052'}}>{layout&&<AutoSaveInfoScreen open layout={layout} title="自动保存" message="游戏会自动保存你的世界。看到存档图标时，请勿关闭游戏。" messageVariant="desktop" acceptLabel="确定" icon={{visible:true,frame}} inputHint={{visible:false}} onAccept={()=>{setReceipt('已请求确认自动保存说明');setOpen(false);}}/>}</div>,document.body)}
 </div>;
}
