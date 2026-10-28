import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Slider, Switch, TextField } from '../src/components';
import { SettingRow } from '../src/settings-controls';
import { AchievementToast, LoadingScreen, SettingsPanel } from '../src/system-screens';
import { GameItemIcon } from './materials';
import '../src/system-screens.css';

function ScreenExample({id,title,detail,code,children}:{id:string;title:string;detail:string;code:string;children:ReactNode}) {
  const [view,setView]=useState<'preview'|'code'>('preview');
  return <section id={id} className="example" aria-labelledby={`${id}-title`}>
    <div className="example-heading"><div><h2 id={`${id}-title`}>{title}</h2><p>{detail}</p></div>
      <div className="view-toggle" role="group" aria-label={`${title} example view`}>
        <button type="button" aria-pressed={view==='preview'} onClick={()=>setView('preview')}>Preview</button>
        <button type="button" aria-pressed={view==='code'} onClick={()=>setView('code')}>Code</button>
      </div>
    </div>
    <div className="example-frame">{view==='preview'?<div className="demo-padded">{children}</div>:<pre className="code-example"><code>{code}</code></pre>}</div>
  </section>;
}

export function SystemScreensExamples({ notify }: { notify?: (message: string) => void } = {}) {
  const [section, setSection] = useState('general'), [name, setName] = useState('New world'), [fancy, setFancy] = useState(true), [volume, setVolume] = useState(75);
  const [progress, setProgress] = useState<number | undefined>(35), [cancelled, setCancelled] = useState(false), [achievement, setAchievement] = useState(false), [saved, setSaved] = useState('');
  return <>
    <ScreenExample id="settings-panel" title="Settings panel" detail="Original Classic navigation and frame. Drafts survive page changes; Apply updates this example only."
      code={`<SettingsPanel title="Settings" sections={sections}\n  value={section} onValueChange={setSection}\n  footer={<Button onClick={save}>Apply</Button>} />`}>
      <SettingsPanel title="World settings" sections={[
        {value:'general',label:'General',content:<SettingRow label="World name" description="Choose a name for your world.">{props=><TextField {...props} label="" value={name} onChange={event=>setName(event.currentTarget.value)}/>}</SettingRow>},
        {value:'video',label:'Video',content:<SettingRow label="Fancy graphics" layout="inline" description="A preference controlled by this example.">{props=><Switch {...props} label="" checked={fancy} onChange={event=>setFancy(event.currentTarget.checked)}/>}</SettingRow>},
        {value:'audio',label:'Audio',content:<SettingRow label="Music volume">{props=><Slider {...props} label="" value={volume} onValueChange={setVolume}/>}</SettingRow>},
      ]} value={section} onValueChange={setSection} footer={<Button onClick={()=>{setSaved(`Applied: ${name} · graphics ${fancy?'on':'off'} · music ${volume}%`);notify?.('Applied to this example.');}}>Apply</Button>}/>
      <p role="status">{saved}</p>
    </ScreenExample>
    <ScreenExample id="loading-screen" title="Loading screen" detail="Classic world loading frame, original title and textured green bar. Supply your panorama through the background slot; the host controls progress and cancellation."
      code={`<LoadingScreen title="Generating world" message="Building terrain"\n  value={progress} onCancel={cancelLoading}\n  background={panoramaScene} />\n// Undefined value uses the original loading_bar animation.\n// variant="compact" retains the smaller dirt + spinner composition.`}>
      <LoadingScreen title={cancelled?'Loading cancelled':progress===100?'World ready':'Generating world'} message={cancelled?'Restart to try again.':'Building terrain'}
        value={progress} onCancel={cancelled||progress===100?undefined:()=>setCancelled(true)}/>
      <div className="demo-row" style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:16}}>
        <Button onClick={()=>{setCancelled(false);setProgress(undefined);}}>Indeterminate</Button>
        <Button onClick={()=>{setCancelled(false);setProgress(value=>value===undefined||value>=100?25:Math.min(100,value+25));}}>Advance progress</Button>
        <Button onClick={()=>{setCancelled(false);setProgress(35);}}>Restart</Button>
      </div>
    </ScreenExample>
    <ScreenExample id="achievement-toast" title="Achievement toast" detail="Original notification frame with your artwork. Persistent by default; explicit timing pauses for hover, focus and hidden documents."
      code={`<AchievementToast open={open} onOpenChange={setOpen}\n  title="Diamonds!" description="Acquire diamonds."\n  achievementIcon={diamondArtwork} />`}>
      <Button onClick={()=>setAchievement(true)}>Unlock achievement</Button>
      <div style={{marginTop:16}}><AchievementToast open={achievement} onOpenChange={setAchievement} title="Diamonds!" description="Acquire diamonds."
        achievementIcon={<GameItemIcon name="diamond"/>}/></div>
    </ScreenExample>
  </>;
}
