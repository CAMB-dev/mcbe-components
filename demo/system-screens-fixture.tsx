import { useRef, useState } from 'react';
import { Button, Switch, TextField } from '../src/components';
import { SettingRow } from '../src/settings-controls';
import { AchievementToast, LoadingScreen, SettingsPanel } from '../src/system-screens';
import { GameItemIcon } from './materials';
import '../src/system-screens.css';

export function SystemScreensFixture() {
  const [section, setSection] = useState('general'), [locked, setLocked] = useState(false), [events, setEvents] = useState('');
  const [value, setValue] = useState(35), [cancelling, setCancelling] = useState(false), [achievement, setAchievement] = useState(true), [duration, setDuration] = useState(0);
  const settings = useRef<HTMLElement>(null), loading = useRef<HTMLElement>(null), toast = useRef<HTMLDivElement>(null);
  const sections = [
    { value: 'general', label: 'General', content: <SettingRow label="World title" description="Draft remains when switching sections.">{props => <TextField {...props} label="" defaultValue="Pixel world"/>}</SettingRow> },
    { value: 'unavailable', label: 'Unavailable', disabled: true, content: 'Unavailable page' },
    { value: 'video', label: 'Video', content: <SettingRow label="Fancy graphics" layout="inline">{props => <Switch {...props} label="" defaultChecked/>}</SettingRow> },
    { value: 'audio', label: 'Audio', content: <p>Host-owned audio preferences.</p> },
  ];
  return <section data-system-fixture style={{marginTop:24,display:'grid',gap:16,maxWidth:900}}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <Button onClick={() => setLocked(previous => !previous)}>{locked ? 'Unlock section selection' : 'Lock section selection'}</Button>
      <Button onClick={() => setSection('missing')}>Set missing section</Button>
      <Button onClick={() => setEvents(`${settings.current?.tagName}|${loading.current?.tagName}|${toast.current?.getAttribute('role')}`)}>Read system refs</Button>
    </div>
    <SettingsPanel ref={settings} data-testid="system-settings" title="World settings" sections={sections} value={section}
      onValueChange={next => {setEvents(`section:${next}`); if (!locked) setSection(next);}} onBack={() => setEvents('back')}
      footer={<Button onClick={() => setEvents('apply')}>Apply local draft</Button>}/>
    <SettingsPanel data-testid="system-settings-uncontrolled" title="Local selection" sections={sections} defaultValue="audio"/>
    <SettingsPanel data-testid="system-settings-empty" title="Empty settings" sections={[]} emptyContent="No sections available"/>
    <LoadingScreen ref={loading} data-testid="loading-determinate" variant="compact" title="Generating world" message="Building terrain" value={value}
      onCancel={() => {setCancelling(true);setEvents('cancel');}} cancelling={cancelling}/>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Button onClick={() => setValue(100)}>Finish loading</Button><Button onClick={() => {setValue(35);setCancelling(false);}}>Reset loading</Button></div>
    <LoadingScreen data-testid="loading-indeterminate" variant="compact" title="Connecting" message="Locating server" spinnerFrame={4} paused backgroundVariant="classic"/>
    <LoadingScreen data-testid="loading-host-background" variant="compact" title="Host background" spinnerFrame={0} background={<div data-host-background style={{background:'#16314d'}}/>}/>
    <LoadingScreen data-testid="loading-world-default" title="Loading" message="Building terrain" value={value}
      onCancel={() => {setCancelling(true);setEvents('world cancel');}} cancelling={cancelling} background={<div data-world-scene style={{background:'#536878'}}/>}/>
    {[0,50,100].map(progress=><LoadingScreen key={progress} data-testid={`loading-world-${progress}`} title="Loading" message="Building terrain" value={progress}
      branding={null} style={{minHeight:240}} background={<div style={{background:'#536878'}}/>}/>)}
    <LoadingScreen data-testid="loading-world-static" title="Loading" message="Locating server" loadingFrame={4} paused branding={null} style={{minHeight:240}}/>
    <LoadingScreen data-testid="loading-world-scale1" scale={1} title="Loading" value={50} branding={null} style={{minHeight:120}}/>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <Button onClick={() => {setDuration(0);setAchievement(true);}}>Show persistent achievement</Button>
      <Button onClick={() => {setDuration(5000);setAchievement(true);}}>Show timed achievement</Button>
    </div>
    <AchievementToast ref={toast} data-testid="achievement-toast" open={achievement} onOpenChange={setAchievement}
      title="Diamonds!" description="Acquire diamonds." achievementIcon={<GameItemIcon name="diamond"/>} duration={duration}/>
    <output aria-label="System screen fixture events">{events}</output>
  </section>;
}
