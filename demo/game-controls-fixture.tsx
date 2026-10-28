import { useState } from 'react';
import { hbuiLoadingIndicatorUrl } from 'virtual:mcbeui-game-font';
import type { CSSProperties, ReactNode } from 'react';
import { Button } from '../src/components';
import { DeathScreen, PauseMenu, PlayerList, TouchControls } from '../src/game-controls';
import type { GamePlayer, TouchAction, TouchMovement } from '../src/game-controls';

const avatar = new URL('./assets/minecraft/game-controls-avatar.png', import.meta.url).href;
const logo = new URL('./assets/minecraft/game-controls-logo.png', import.meta.url).href;
const fontProfile = { '--mc-font-size': '20px', '--mc-font-size-sm': '20px', '--mc-font-size-lg': '40px', '--mc-font-size-xl': '60px' } as CSSProperties;
const sourcePlayers: readonly GamePlayer[] = [
  { id: 'minecraft', name: 'Minecraft', avatarSrc: avatar },
  { id: 'steve', name: 'Steve', avatarSrc: avatar, disabled: true },
  { id: 'alex', name: 'Alex', local: true },
];
const allActions: readonly TouchAction[] = ['jump', 'attack', 'interact', 'sneak', 'sprint', 'ascend', 'descend'];
function Sample({ id, children }: { id: string; children: ReactNode }) {
  return <section className="calibration-case" style={{ gridColumn: '1 / -1', minWidth: 0 }}><h2>{id}</h2><div data-case={id}
    style={{ ...fontProfile, overflow: 'auto', maxWidth: '100%', background: '#28292a', padding: 24 }}>{children}</div></section>;
}
function TouchFixture() {
  const [events, setEvents] = useState<string[]>([]), [movement, setMovement] = useState<TouchMovement>({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(true), [disabled, setDisabled] = useState(false), [limited, setLimited] = useState(false);
  return <Sample id="game-touch">
    {mounted && <TouchControls actions={limited ? ['jump'] : allActions} disabled={disabled} onMove={vector => { setMovement(vector); setEvents(events => [...events, `move:${vector.x},${vector.y}`]); }}
      onAction={(action, pressed) => setEvents(events => [...events, `${action}:${pressed}`])}/>}
    <Button onClick={() => setMounted(value => !value)}>Toggle touch fixture</Button>
    <Button onClick={() => setDisabled(value => !value)}>Toggle touch disabled</Button>
    <Button onClick={() => setLimited(value => !value)}>Toggle touch actions</Button>
    <Button onClick={() => setEvents([])}>Clear touch events</Button>
    <output aria-label="Touch fixture events">{JSON.stringify(events)}</output><output aria-label="Touch fixture movement">{JSON.stringify(movement)}</output>
  </Sample>;
}
export function GameControlsFixture() {
  const [selected, setSelected] = useState(''), [attempt, setAttempt] = useState(''), [invites, setInvites] = useState(0), [pauseAction, setPauseAction] = useState('');
  const [deathAction, setDeathAction] = useState('');
  return <div id="game-controls-fixture" style={{ display: 'grid', gap: 24, minWidth: 0 }}>
    <Sample id="game-players"><PlayerList players={sourcePlayers} defaultSelectedId="minecraft" onSelect={setSelected} onInvite={() => setInvites(count => count + 1)}/>
      <output aria-label="Player selection">{selected}</output><output aria-label="Player invitations">{invites}</output></Sample>
    <Sample id="game-players-controlled"><PlayerList players={sourcePlayers} selectedId="minecraft" onSelect={setAttempt}/><output aria-label="Controlled player intent">{attempt}</output></Sample>
    <Sample id="game-players-status"><PlayerList players={[{ id: 'online', name: 'Minecraft', avatarSrc: avatar, online: true }, { id: 'offline', name: 'Steve', avatarSrc: avatar, online: false }]} onInvite={() => setInvites(count => count + 1)} inviteDisabled/></Sample>
    <TouchFixture/>
    <Sample id="game-touch-static"><TouchControls actions={allActions}/></Sample>
    <Sample id="game-touch-disabled"><TouchControls actions={allActions} disabled/></Sample>
    <Sample id="game-pause"><PauseMenu logoSrc={logo} width={960} height={540} onAction={setPauseAction}/><output aria-label="Pause fixture action">{pauseAction}</output></Sample>
    <Sample id="game-pause-players"><PauseMenu logoSrc={logo} width={960} height={540} players={sourcePlayers} onAction={setPauseAction} onPlayerSelect={setSelected} onInvite={() => setInvites(count => count + 1)}
      skinRenderer={<div data-host-skin style={{ width: 120, height: 200 }}>Host renderer</div>} playerName="Minecraft"/></Sample>
    <Sample id="game-pause-disabled"><PauseMenu width={960} height={540} disabled actions={['resume', 'settings', 'quit']} players={sourcePlayers} onAction={setPauseAction}/></Sample>
    <Sample id="game-death-native"><DeathScreen title="Minecraft" deathMessage="Minecraft" width={960} height={540} onRespawn={() => setDeathAction('native-respawn')} onQuit={() => setDeathAction('native-quit')}/><output aria-label="Native death fixture action">{deathAction}</output></Sample>
    <Sample id="game-death-native-loading"><DeathScreen state="loading" loadingText="Minecraft" loadingIndicator={hbuiLoadingIndicatorUrl ? <img src={hbuiLoadingIndicatorUrl} alt=""/> : undefined}/></Sample>
    <Sample id="game-death-native-disabled"><DeathScreen title="Minecraft" deathMessage="Minecraft" respawnEnabled={false} quitEnabled={false}/></Sample>
    <Sample id="game-death-ready"><DeathScreen variant="classic" title="Minecraft" deathMessage="Minecraft" width={960} height={540} onRespawn={() => setDeathAction('respawn')} onQuit={() => setDeathAction('quit')}/><output aria-label="Death fixture action">{deathAction}</output></Sample>
    <Sample id="game-death-loading"><DeathScreen variant="classic" state="loading" loadingText="Minecraft" width={960} height={540}/></Sample>
    <Sample id="game-death-disabled"><DeathScreen variant="classic" title="Minecraft" deathMessage="Minecraft" respawnEnabled={false} quitEnabled={false} onRespawn={() => setDeathAction('disabled-respawn')} onQuit={() => setDeathAction('disabled-quit')}/></Sample>
    <Sample id="game-death-hidden-buttons"><DeathScreen variant="classic" title="Minecraft" deathMessage="Minecraft" respawnVisible={false} quitVisible={false}/></Sample>
    <Sample id="game-death-host-score"><DeathScreen variant="classic" title="Minecraft" deathMessage="Minecraft" score={12}/></Sample>
  </div>;
}
