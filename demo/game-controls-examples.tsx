import { useState } from 'react';
import { hbuiLoadingIndicatorUrl } from 'virtual:mcbeui-game-font';
import { Button } from '../src/components';
import { DeathScreen, PauseMenu, PlayerList, TouchControls } from '../src/game-controls';
import type { GamePlayer, TouchMovement } from '../src/game-controls';

const avatar = new URL('./assets/minecraft/game-controls-avatar.png', import.meta.url).href;
const logo = new URL('./assets/minecraft/game-controls-logo.png', import.meta.url).href;
const players: readonly GamePlayer[] = [
  { id: 'steve', name: 'Steve', avatarSrc: avatar, online: true },
  { id: 'alex', name: 'Alex', avatarSrc: avatar, online: true },
  { id: 'guest', name: 'Guest', local: true, online: false, disabled: true },
];
export function GameControlsExamples() {
  const [selected, setSelected] = useState('steve'), [invitations, setInvitations] = useState(0), [action, setAction] = useState('');
  const [movement, setMovement] = useState<TouchMovement>({ x: 0, y: 0 }), [touch, setTouch] = useState('');
  const [pauseOpen, setPauseOpen] = useState(true), [deathState, setDeathState] = useState<'ready' | 'loading'>('ready');
  const [deathVariant, setDeathVariant] = useState<'native' | 'classic'>('native');
  return <section id="game-controls" style={{ minWidth: 0 }}>
    <h2>Game controls · 游戏界面</h2>
    <p>玩家与暂停界面采用原始材质；死亡界面提供当前版本和 Classic 两种样式。触控动作与游戏路由由应用接收。</p>
    <h3>PlayerList</h3>
    <PlayerList players={players} selectedId={selected} onSelect={setSelected} onInvite={() => setInvitations(count => count + 1)}/>
    <p>Selected: {selected} · Invitations: {invitations}</p>
    <h3>TouchControls</h3>
    <TouchControls actions={['jump', 'attack', 'interact', 'sneak', 'sprint', 'ascend', 'descend']} onMove={setMovement} onAction={(action, pressed) => setTouch(`${action}: ${pressed ? 'pressed' : 'released'}`)}/>
    <p>Move: {movement.x.toFixed(2)}, {movement.y.toFixed(2)} · {touch || '按住方向、动作按钮，或使用键盘'}</p>
    <h3>PauseMenu</h3>
    <Button onClick={() => setPauseOpen(true)}>Open pause menu</Button>
    <div style={{ overflow: 'auto', maxWidth: '100%', marginTop: 12 }}>
      {pauseOpen && <PauseMenu logoSrc={logo} players={players} onPlayerSelect={setSelected} onInvite={() => setInvitations(count => count + 1)}
        onAction={action => { setAction(action); if (action === 'resume' || action === 'quit') setPauseOpen(false); }}/>}</div>
    <p>{action ? `Menu action: ${action}` : '主按钮和 Escape 将动作交给应用；3D 皮肤由 skinRenderer 提供。'}</p>
    <h3>DeathScreen</h3>
    <Button aria-pressed={deathVariant === 'native'} onClick={() => setDeathVariant('native')}>当前版本</Button>
    <Button aria-pressed={deathVariant === 'classic'} onClick={() => setDeathVariant('classic')}>Classic</Button>
    <Button onClick={() => setDeathState('ready')}>Reset death screen</Button>
    <div style={{ overflow: 'auto', maxWidth: '100%', marginTop: 12 }}><DeathScreen variant={deathVariant} deathMessage="Steve fell from a high place" state={deathState}
      loadingIndicator={hbuiLoadingIndicatorUrl ? <img src={hbuiLoadingIndicatorUrl} alt=""/> : undefined}
      onRespawn={() => setDeathState('loading')} onQuit={() => { setDeathState('loading'); setAction('main-menu'); }}/></div>
    <pre className="code-example"><code>{`<PauseMenu onAction={routeGameAction} logoSrc={titlePng} skinRenderer={gameRenderer} />\n<DeathScreen state={state} onRespawn={() => setState('loading')} />\n<TouchControls onMove={movePlayer} onAction={setGameAction} />`}</code></pre>
  </section>;
}
