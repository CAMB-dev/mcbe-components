import { useRef, useState } from 'react';
import { Button, Dialog } from '../src/components';
import { Spinner, Toast, Tooltip } from '../src/feedback';
import '../src/feedback.css';

export function FeedbackFixture(){
  const [paused,setPaused]=useState(false),[dialog,setDialog]=useState(false),[controlled,setControlled]=useState(false),[pinned,setPinned]=useState(false);
  const [ordinary,setOrdinary]=useState(false),[action,setAction]=useState(false),[error,setError]=useState(false),[duration,setDuration]=useState(0);
  const [events,setEvents]=useState(''),[clicks,setClicks]=useState(0);
  const trigger=useRef<HTMLButtonElement>(null),tooltip=useRef<HTMLSpanElement>(null),toast=useRef<HTMLDivElement>(null);
  return <section data-feedback-fixture style={{marginTop:24,background:'#28292a'}}>
    <h2 style={{fontSize:14,lineHeight:'20px',margin:'0 0 16px'}}>Source feedback primitives</h2>
    <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <Spinner data-feedback-case="animated" label="World loading" paused={paused}/>
      <Button onClick={()=>setPaused(p=>!p)}>{paused?'Resume source spinner':'Pause source spinner'}</Button>
      <Button loading data-feedback-case="loading-button">Loading source action</Button>
      <div data-feedback-case="frames" style={{display:'flex',gap:8}}>{Array.from({length:10},(_,frame)=><Spinner key={frame} frame={frame} decorative data-native-frame={frame}/>)}</div>
    </div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:16}}>
      <span id="feedback-original-description" hidden>Original description.</span>
      <Tooltip ref={tooltip} content="Native frame description" delayDuration={0} closeDelay={80}>
        <Button ref={trigger} aria-describedby="feedback-original-description" onClick={()=>setClicks(c=>c+1)}>Described control</Button>
      </Tooltip>
      <Tooltip content="Tap description" delayDuration={0}><Button onClick={()=>setClicks(c=>c+1)}>Touch hint</Button></Tooltip>
      <Tooltip content="Controlled description" open={controlled} onOpenChange={setControlled} delayDuration={0}><Button>Controlled hint</Button></Tooltip>
      <Tooltip content="Should not open" disabled><Button>Disabled hint</Button></Tooltip>
      <Button onClick={()=>setControlled(true)}>Open controlled tooltip</Button>
      <Button onClick={()=>setEvents(`${tooltip.current?.tagName}|${trigger.current?.tagName}|${toast.current?.getAttribute('role')}`)}>Read feedback refs</Button>
      <Button onClick={()=>setEvents('outside action')}>Outside tooltip</Button>
      <Button onClick={()=>setDialog(true)}>Open feedback dialog</Button>
      <Button onClick={()=>setPinned(true)}>Show pinned background hint</Button>
      {pinned&&<Tooltip open content="Background controlled description"><Button>Pinned background hint</Button></Tooltip>}
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:16}}>
      <Button onClick={()=>{setDuration(0);setOrdinary(true);}}>Show persistent notification</Button>
      <Button onClick={()=>{setDuration(5000);setOrdinary(true);}}>Show timed notification</Button>
      <Button onClick={()=>setAction(true)}>Show action notification</Button>
      <Button onClick={()=>setError(true)}>Show error notification</Button>
    </div>
    <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:16}}>
      <Toast ref={toast} data-toast-case="ordinary" open={ordinary} onOpenChange={setOrdinary} title="World saved" description="Saved to this device." duration={duration} dismissLabel="Dismiss saved notification"/>
      <Toast data-toast-case="action" open={action} onOpenChange={setAction} title="Item moved" duration={5000} action={<Button onClick={()=>setEvents('undo action')}>Undo move</Button>} dismissLabel="Dismiss action notification"/>
      <Toast data-toast-case="error" open={error} onOpenChange={setError} title="Could not save world" variant="error" duration={5000} dismissLabel="Dismiss error notification"/>
    </div>
    <output aria-label="Feedback fixture events">{events}</output><output aria-label="Feedback native trigger clicks">{clicks}</output>
    <Dialog open={dialog} onOpenChange={setDialog} title="Feedback dialog"><Tooltip content="Dialog description" delayDuration={0}><Button>Dialog hint</Button></Tooltip><Button onClick={()=>setEvents('dialog action')}>Dialog action</Button></Dialog>
  </section>;
}
