import { useRef, useState } from 'react';
import { ScrollArea, ScrollBar } from '../src/scroll-area';
import '../src/scroll-area.css';

export function ScrollFixture() {
  const [vertical,setVertical]=useState(100),[horizontal,setHorizontal]=useState(100),[events,setEvents]=useState('');
  const [contentHeight,setContentHeight]=useState(350),[areaHeight,setAreaHeight]=useState(140),[disposable,setDisposable]=useState(false);
  const native=useRef<HTMLDivElement>(null),area=useRef<HTMLDivElement>(null);
  return <section data-scroll-fixture style={{marginTop:24,background:'#28292a'}}>
    <h2 style={{fontSize:14,lineHeight:'20px',margin:'0 0 16px'}}>Source scroll primitives</h2>
    <div style={{display:'flex',flexWrap:'wrap',gap:16,alignItems:'start'}}>
      <ScrollBar data-scroll-case="vertical-bar" label="Controlled vertical" controls="scroll-controlled-content" value={vertical} max={400} pageSize={100} onValueChange={setVertical} style={{height:200}}/>
      <ScrollBar data-scroll-case="horizontal-bar" label="Controlled horizontal" controls="scroll-controlled-content" orientation="horizontal" value={horizontal} max={400} pageSize={100} onValueChange={setHorizontal} style={{width:200}}/>
      <ScrollBar data-scroll-case="container-bar" label="Container source" controls="scroll-controlled-content" variant="container" value={100} max={400} pageSize={100} onValueChange={()=>{}} style={{height:200}}/>
      <ScrollBar data-scroll-case="disabled-bar" label="Disabled source" controls="scroll-controlled-content" value={50} max={400} pageSize={100} disabled onValueChange={()=>setEvents('unexpected disabled change')} style={{height:100}}/>
      <ScrollBar label="Prevented source" controls="scroll-controlled-content" value={100} max={400} pageSize={100} onValueChange={()=>setEvents('unexpected prevented change')} onKeyDown={event=>event.preventDefault()} onPointerDown={event=>event.preventDefault()} style={{height:100}}/>
    </div>
    <div id="scroll-controlled-content">Controlled offsets: <output aria-label="Vertical scrollbar value">{vertical}</output> / <output aria-label="Horizontal scrollbar value">{horizontal}</output></div>
    <div style={{display:'flex',flexWrap:'wrap',gap:16,alignItems:'start'}}>
      <ScrollArea ref={area} viewportRef={native} data-scroll-case="native" label="Quest log" style={{width:260,height:140}} onScrollPositionChange={p=>setEvents(`position:${Math.round(p.scrollTop)}`)}>
        <div style={{height:600}}>
          <button type="button" onClick={()=>setEvents('child action')}>Quest action</button>
          <label>Quest note<input aria-label="Quest note" defaultValue="Editable native input"/></label>
          <p>Native wheel, touch, keyboard and text selection stay inside the viewport.</p>
        </div>
      </ScrollArea>
      <ScrollArea data-scroll-case="both" label="Map region" orientation="both" style={{width:260,height:140}} contentProps={{style:{width:700}}}>
        <div style={{width:700,height:600}}>Both native axes.</div>
      </ScrollArea>
      <ScrollArea data-scroll-case="horizontal" label="Hotbar region" orientation="horizontal" style={{width:260,height:70}} contentProps={{style:{width:900}}}>
        <div style={{width:900,height:32}}>Horizontal native viewport.</div>
      </ScrollArea>
      <ScrollArea data-scroll-case="resize" label="Resizable region" style={{width:260,height:areaHeight}}>
        <div style={{height:contentHeight}}>Observed content size.</div>
      </ScrollArea>
    </div>
    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:16}}>
      <button type="button" onClick={()=>{if(native.current)native.current.scrollTop=200;}}>Native scroll to 200</button>
      <button type="button" onClick={()=>setEvents(`${area.current?.tagName}|${native.current?.classList.contains('mc-scroll-area__viewport')}`)}>Read scroll refs</button>
      <button type="button" onClick={()=>setContentHeight(900)}>Grow scroll content</button>
      <button type="button" onClick={()=>setContentHeight(40)}>Shrink scroll content</button>
      <button type="button" onClick={()=>setAreaHeight(200)}>Resize scroll viewport</button>
      <button type="button" onClick={()=>setDisposable(show=>!show)}>{disposable ? 'Remove disposable scroll' : 'Mount disposable scroll'}</button>
    </div>
    <output aria-label="Scroll fixture events">{events}</output>
    {disposable && <ScrollArea data-scroll-case="disposable" label="Disposable region" style={{width:180,height:100}}><div style={{height:500}}>Unmount during pointer capture.</div></ScrollArea>}
  </section>;
}
