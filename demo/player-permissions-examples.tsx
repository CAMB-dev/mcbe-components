import { useState } from 'react';
import { Combobox } from '../src/combobox';
import { Switch } from '../src/components';
import { PermissionLevelSelect, PermissionPlayerRow, PermissionToggleRow, PlayerPermissions } from '../src/player-permissions';
import type { PermissionLevel, PermissionPlayer, PlayerPermissionOption, PlayerPermissionsValue } from '../src/player-permissions';

const picture = (name: string) => new URL(`../src/assets/gui-icons/${name}.png`, import.meta.url).href;
const rolePicture = (level: PermissionLevel) => new URL(`../src/assets/player-permissions/permissions_${level === 'operator' ? 'op_crown' : level === 'member' ? 'member_star' : level === 'visitor' ? 'visitor_hand' : 'custom_dots'}.png`, import.meta.url).href;
const roleOrder: readonly PermissionLevel[] = ['member', 'visitor', 'operator', 'custom'];
const names = ['Alex', 'Steve', 'Birch', 'Copper', 'River', 'Juniper', 'Quartz', 'Moss', 'Rowan', 'Fern', 'Cedar', 'Aspen'];
const options: readonly PlayerPermissionOption[] = [
  { id: 'build', label: 'Build' }, { id: 'mine', label: 'Mine' }, { id: 'doors', label: 'Doors and switches' },
  { id: 'containers', label: 'Open containers' }, { id: 'players', label: 'Attack players' }, { id: 'mobs', label: 'Attack mobs' },
  { id: 'commands', label: 'Operator commands' }, { id: 'teleport', label: 'Teleport' },
];
// Example application state: role and permission booleans are independent.
// Choosing a role below does not compute a Minecraft permission preset.
const sampleBits = { build: true, mine: true, doors: true, containers: true, players: false, mobs: true, commands: false, teleport: false };
const initialValues: PlayerPermissionsValue = Object.fromEntries(names.map((_, i) => [`player-${i}`, { level: roleOrder[i % roleOrder.length]!, permissions: { ...sampleBits } }]));

export function PlayerPermissionsExamples() {
  const [value, setValue] = useState(initialValues), [selected, setSelected] = useState<string | null>('player-0');
  const [context, setContext] = useState('player'), [data, setData] = useState('complete');
  const [scale, setScale] = useState(2), [frame, setFrame] = useState('standard');
  const [accept, setAccept] = useState(true), [editable, setEditable] = useState(true), [warning, setWarning] = useState(false);
  const [actions, setActions] = useState(false), [status, setStatus] = useState('Select a player, then adjust the application draft.');
  const [partLevel, setPartLevel] = useState<PermissionLevel | null>('custom'), [partChecked, setPartChecked] = useState(true);
  const players: readonly PermissionPlayer[] = data === 'empty' ? [] : names.map((name, i) => ({
    id: `player-${i}`, name, avatarSrc: picture(i % 2 ? 'friend1' : 'friend-glyph'), localIconVisible: i === 0,
    levelIcon: value[`player-${i}`]?.level ? <img src={rolePicture(value[`player-${i}`]!.level!)} alt=""/> : undefined,
  }));
  const displayed = data === 'unknown' ? {} : data === 'partial' ? Object.fromEntries(Object.entries(value).map(([id, entry]) => [id, { ...entry, permissions: { build: entry.permissions.build!, mine: entry.permissions.mine! } }])) : value;
  const size = (frame === 'wide' ? [512, 280] : [400, 300]) as readonly [number, number];
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end' }}>
      <Combobox label="Permission context" value={context} options={[{ value: 'player', label: 'Player' }, { value: 'settings', label: 'World settings' }, { value: 'realm', label: 'Realm' }]} onValueChange={setContext}/>
      <Combobox label="Permission data" value={data} options={[{ value: 'complete', label: 'Complete draft' }, { value: 'partial', label: 'Two supplied permissions' }, { value: 'unknown', label: 'Unknown player state' }, { value: 'empty', label: 'Empty player list' }]} onValueChange={setData}/>
      <Combobox label="Permission scale" value={String(scale)} options={[1, 2, 3].map(n => ({ value: String(n), label: `${n}×` }))} onValueChange={next => setScale(Number(next))}/>
      <Combobox label="Permission frame" value={frame} options={[{ value: 'standard', label: '400 × 300' }, { value: 'wide', label: '512 × 280' }]} onValueChange={setFrame}/>
      <Switch label="Accept permission requests" checked={accept} onChange={event => setAccept(event.target.checked)}/>
      <Switch label="Allow permission edits" checked={editable} onChange={event => setEditable(event.target.checked)}/>
      <Switch label="Show template warning" checked={warning} onChange={event => setWarning(event.target.checked)}/>
      <Switch label="Show player actions" checked={actions} onChange={event => setActions(event.target.checked)}/>
    </div>
    <div role="region" aria-label="Classic permissions preview" tabIndex={0} style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto', background: '#476b5b' }}>
      <PlayerPermissions players={players} permissionOptions={options} label="Example Classic player permissions" size={size} scale={scale}
        selectedPlayerId={selected} value={displayed} canEditPermissions={editable} worldSettings={context === 'settings'} inRealm={context === 'realm'}
        worldText="Current World" templateLocked={warning} templateWarning="This world's template has a permissions warning. Edit availability is supplied separately."
        kickVisible={actions} banVisible={actions} emptyContent="No permission state supplied for this player."
        onSelectedPlayerIdChange={id => { if (accept) setSelected(id); setStatus(`Player ${id}: host ${accept ? 'accepted' : 'declined'}.`); }}
        onValueChange={(next, detail) => {
          if (accept) setValue(previous => Object.fromEntries(Object.entries(previous).map(([id, entry]) => [id, next[id] ? { ...next[id], permissions: { ...entry.permissions, ...next[id]!.permissions } } : entry])));
          setStatus(`${detail.reason}: ${detail.playerId}${detail.permissionId ? ` / ${detail.permissionId}` : ''} · host ${accept ? 'accepted' : 'declined'}`);
        }}
        onBack={() => setStatus('Back requested. The application decides where to navigate.')}
        onKickRequest={player => setStatus(`Kick requested for ${player.name}. The application owns confirmation and authorization.`)}
        onBanRequest={player => setStatus(`Ban requested for ${player.name}. The application owns confirmation and authorization.`)}/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12 }}>{status}</p>
    <p style={{ margin: 0, fontSize: 12 }}>Classic JSON profile. The current game's OreUI permissions page has a separate layout. Topics, portraits, permission values and actions come from the application; this example sends no game requests.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' }}>
      <div style={{ width: 220 * scale, maxWidth: '100%' }}>
        <PermissionLevelSelect value={partLevel} scale={scale} worldSettings={context === 'settings'} inRealm={context === 'realm'} labels={{ label: 'Reusable role selector' }} onValueChange={next => setPartLevel(next)}/>
        <PermissionToggleRow label="Reusable permission" checked={partChecked} scale={scale} onCheckedChange={setPartChecked}/>
      </div>
      <div style={{ width: 154 * scale, maxWidth: '100%' }}><PermissionPlayerRow player={{ id: 'preview', name: 'Reusable player', avatarSrc: picture('friend1') }} selected scale={scale}/></div>
    </div>
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{'<PlayerPermissions players={players} permissionOptions={options}\n  label="Player Permissions" selectedPlayerId={playerId}\n  value={draft} onValueChange={setDraft} onBack={handleBack}/>'}</pre>
  </div>;
}
