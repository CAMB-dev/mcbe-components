import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox } from '../src/components';
import { Combobox } from '../src/combobox';
import { MobEffectScreen } from '../src/mob-effect-screen';
import { MobEffectRow } from '../src/mob-effect-row';
import type { BedrockStatusEffect } from '../src/hud-overlays';
import type { MobEffectCloseDetail, MobEffectControllerHandle, MobEffectEntry, MobEffectTextProfile } from '../src/mob-effect-types';
import '../src/fonts.css';
import '../src/mob-effect-screen.css';
import './mob-effect-demo.css';

// Existing33 original icon identities; this sample creates no replacement art.
const knownEffects: readonly BedrockStatusEffect[] = [
  'absorption', 'bad-omen', 'blindness', 'breath-of-the-nautilus', 'conduit-power', 'darkness',
  'fire-resistance', 'haste', 'health-boost', 'hunger', 'infested', 'invisibility', 'jump-boost',
  'levitation', 'mining-fatigue', 'nausea', 'night-vision', 'oozing', 'poison', 'raid-omen',
  'regeneration', 'resistance', 'slow-falling', 'slowness', 'speed', 'strength', 'trial-omen',
  'village-hero', 'water-breathing', 'weakness', 'weaving', 'wind-charged', 'wither'
];
const sizes = { compact: [320, 220], standard: [420, 260], tall: [420, 340] } as const;
const grids = { single: [1, 36], double: [2, 18], triple: [3, 12] } as const;
const fontFamily = '"MCBE Pixel", "MCBE CJK", monospace';
const literalTimers = ['2:15', '0:45', '∞'] as const;

export function MobEffectDemo() {
  const host = useRef<HTMLDivElement>(null), controller = useRef<MobEffectControllerHandle>(null);
  const [hostWidth, setHostWidth] = useState(0), [size, setSize] = useState<keyof typeof sizes>('standard');
  const [grid, setGrid] = useState<keyof typeof grids>('single'), [amount, setAmount] = useState('12');
  const [sourceProfile, setSourceProfile] = useState<'desktop' | 'pocket'>('desktop');
  const [inputMode, setInputMode] = useState<'mouse' | 'touch'>('mouse');
  const [ambient, setAmbient] = useState(false), [timerShadow, setTimerShadow] = useState(false), [thumb, setThumb] = useState(false);
  const [showClose, setShowClose] = useState(true), [disabled, setDisabled] = useState(false), [accept, setAccept] = useState(true), [open, setOpen] = useState(true);
  const [status, setStatus] = useState('Effects and timers are supplied by this preview.');
  const availableSize = sizes[size], scale = hostWidth >= availableSize[0] * 2 ? 2 : 1;
  useEffect(() => {
    const node = host.current, view = node?.ownerDocument.defaultView; if (!node || !view) return;
    const update = () => setHostWidth(node.clientWidth); update();
    const observer = new view.ResizeObserver(update); observer.observe(node); return () => observer.disconnect();
  }, []);
  const effects = useMemo<readonly MobEffectEntry[]>(() => knownEffects.slice(0, Number(amount)).map((effect, index) => ({
    id: effect,
    // Host-authored English sample labels, not recovered engine localization.
    name: effect.split('-').map(word => word[0]!.toUpperCase() + word.slice(1)).join(' '),
    timer: literalTimers[index % literalTimers.length]!, ambient: index === 0 && ambient,
    icon: { kind: 'known-effect', effect }
  })), [amount, ambient]);
  const textProfile = useMemo<MobEffectTextProfile>(() => ({
    name: { fontSize: 10, lineHeight: 10, fontFamily },
    timer: { fontSize: 10, lineHeight: 10, fontFamily, shadow: timerShadow }, provenance: 'explicit-web-profile'
  }), [timerShadow]);
  const receive = (detail: MobEffectCloseDetail) => {
    setStatus(`${detail.reason === 'player-hurt' ? detail.sourceProperty : detail.target} · ${accept ? 'host accepted' : 'host declined'}.`);
    if (accept) setOpen(false);
  };
  const standalone: MobEffectEntry = effects[0] ?? { id: 'standalone-speed', name: 'Speed II', timer: '2:15', ambient, icon: { kind: 'known-effect', effect: 'speed' } };
  return <div className="mob-effect-demo" data-demo-mob-effect="preview">
    <div className="mob-effect-demo__controls">
      <Combobox label="Example effects" value={amount} onValueChange={setAmount} options={[{ value: '0', label: 'No effects' }, { value: '3', label: '3 effects' }, { value: '12', label: '12 effects' }, { value: '33', label: 'All 33 existing icons' }]}/>
      <Combobox label="Effect grid" value={grid} onValueChange={value => { if (value === 'single' || value === 'double' || value === 'triple') setGrid(value); }} options={[{ value: 'single', label: '1 × 36' }, { value: 'double', label: '2 × 18' }, { value: 'triple', label: '3 × 12' }]}/>
      <Combobox label="Effect screen size" value={size} onValueChange={value => { if (value === 'compact' || value === 'standard' || value === 'tall') setSize(value); }} options={[{ value: 'compact', label: '320 × 220' }, { value: 'standard', label: '420 × 260' }, { value: 'tall', label: '420 × 340' }]}/>
      <Combobox label="Effect source profile" value={sourceProfile} onValueChange={value => { if (value === 'desktop' || value === 'pocket') setSourceProfile(value); }} options={[{ value: 'desktop', label: 'Desktop source variables' }, { value: 'pocket', label: 'Pocket source variables' }]}/>
      <Combobox label="Effect scrolling input" value={inputMode} onValueChange={value => { if (value === 'mouse' || value === 'touch') setInputMode(value); }} options={[{ value: 'mouse', label: 'Mouse' }, { value: 'touch', label: 'Touch' }]}/>
    </div>
    <div className="mob-effect-demo__flags">
      <Checkbox label="Ambient first effect" checked={ambient} onChange={event => setAmbient(event.currentTarget.checked)}/>
      <Checkbox label="Timer shadow" checked={timerShadow} onChange={event => setTimerShadow(event.currentTarget.checked)}/>
      <Checkbox label="Show close button" checked={showClose} onChange={event => setShowClose(event.currentTarget.checked)}/>
      <Checkbox label="Show touch thumb" checked={thumb} onChange={event => setThumb(event.currentTarget.checked)}/>
      <Checkbox label="Disable effect controls" checked={disabled} onChange={event => setDisabled(event.currentTarget.checked)}/>
      <Checkbox label="Accept effect close requests" checked={accept} onChange={event => setAccept(event.currentTarget.checked)}/>
    </div>
    <div className="mob-effect-demo__actions">
      <Button onClick={() => { setOpen(true); setStatus('The host reopened the effects screen.'); }}>Reopen effects</Button>
      <Button onClick={() => { if (!controller.current?.request({ fromButtonId: 'button.mobeffects', destination: 'screen' })) setStatus('The controller close request is unavailable.'); }}>Controller close request</Button>
      <Button onClick={() => { if (!controller.current?.notifyPlayerHurt()) setStatus('The host player-hurt notification is unavailable.'); }}>Notify player hurt</Button>
    </div>
    <div className="mob-effect-demo__host" ref={host}>
      <MobEffectScreen effects={effects} gridDimensions={grids[grid]} availableSize={availableSize} scale={scale}
        sourceProfile={sourceProfile} inputMode={inputMode} closeButtonVisible={showClose} touchThumbVisible={thumb}
        textProfile={textProfile} iconLayout={{ kind: 'parent-percent-contain-web-policy' }} layoutPolicy="source-formulas-parent-percent-web"
        label="Active effects preview" closeLabel="Close active effects" scrollLabel="Active effects collection"
        open={open} disabled={disabled} modal={false} controllerRef={controller} onCloseRequested={receive}/>
    </div>
    <p className="mob-effect-demo__status" role="status" aria-live="polite">{status}</p>
    <div className="mob-effect-demo__row-host"><MobEffectRow effect={standalone} scale={scale} textProfile={textProfile} iconLayout={{ kind: 'parent-percent-contain-web-policy' }}/></div>
    <details className="mob-effect-demo__notes"><summary>About this example</summary><p>Timers are literal host text, with no countdown or game connection. Ambient only changes the row background. Grid capacity stays36 independently of effect count; columns retain240×30 source rows and may clip rather than shrink. Font metrics, percentages, icon contain geometry and timer shadow are explicit Web choices. Pocket variables do not certify Pocket layout. The player-hurt button is a host notification, not simulated world input or a fabricated button ID.</p></details>
  </div>;
}
