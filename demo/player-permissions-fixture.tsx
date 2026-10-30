import { StrictMode, useState } from 'react';
import type { ComponentProps, KeyboardEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { PlayerPermissions, PermissionLevelSelect, PermissionToggleRow, PermissionPlayerRow } from '../src/player-permissions';
import type { PermissionLevel, PlayerPermissionsValue } from '../src/player-permissions';
import '../src/styles.css';
import '../src/fonts.css';

type Props = ComponentProps<typeof PlayerPermissions>;
export interface PermissionsQASettings {
  mode: 'full' | 'primitives'; size: readonly [number, number]; scale: number;
  controlledSelection: boolean; acceptSelection: boolean; selected: string | null | undefined; defaultSelected?: string | null;
  controlledValue: boolean; acceptValue: boolean; value: PlayerPermissionsValue;
  level: PermissionLevel | null; checked: boolean; rowSelected: boolean; rowDisabled: boolean;
  empty: boolean; removeSelected: boolean; removePermission: boolean; missingState: boolean; missingPermission: boolean; longLabels: boolean;
  worldSettings: boolean; inRealm: boolean; canEdit: boolean; locked: boolean; optionsVisible: boolean; readOnly: boolean; disabled: boolean;
  kickVisible: boolean; kickEnabled: boolean; banVisible: boolean; banEnabled: boolean;
  gamepad: boolean; education: boolean; avatarSrc: string; avatarVisible: boolean; localVisible: boolean;
  selectorFocused?: boolean; contentFocused?: boolean; selectedLabel?: string; stateLabel?: string;
  preventKeys: string[]; preventCaptureKeys: string[]; preventClick: boolean; show: boolean;
}
interface EventRecord { kind: string; value?: unknown; detail?: unknown }
interface QA {
  settings: PermissionsQASettings; events: EventRecord[]; ref: HTMLElement | null; playersRef: HTMLDivElement | null; permissionsRef: HTMLDivElement | null;
  levelRef: HTMLButtonElement | null; standalonePlayerRef: HTMLButtonElement | null; standaloneToggleRef: HTMLInputElement | null;
  playerRefs: Record<string, HTMLButtonElement | null>; permissionRefs: Record<string, HTMLInputElement | null>;
  configure(patch: Partial<PermissionsQASettings>): void; unmount(): void;
}
declare global { interface Window { permissionsQA: QA; permissionsQAInitial?: Partial<PermissionsQASettings> } }
const ids = ['ada', 'bex', 'disabled', ...Array.from({ length: 13 }, (_, i) => `extra-${i}`)];
const optionIds = ['build', 'mine', 'doors', 'containers', 'combat', 'teleport', 'extra-0', 'extra-1', 'extra-2', 'extra-3', 'extra-4', 'extra-5'];
const values: PlayerPermissionsValue = Object.fromEntries(ids.map((id, index) => [id, { level: index === 1 ? 'visitor' : 'member', permissions: Object.fromEntries(optionIds.map((permission, i) => [permission, i % 2 === 0])) }]));
const initial: PermissionsQASettings = { mode: 'full', size: [360, 300], scale: 1, controlledSelection: true, acceptSelection: true, selected: 'ada', controlledValue: true, acceptValue: true, value: values,
  level: 'member', checked: true, rowSelected: false, rowDisabled: false, empty: false, removeSelected: false, removePermission: false, missingState: false, missingPermission: false, longLabels: false,
  worldSettings: false, inRealm: false, canEdit: true, locked: false, optionsVisible: true, readOnly: false, disabled: false, kickVisible: true, kickEnabled: true, banVisible: true, banEnabled: true,
  gamepad: false, education: false, avatarSrc: '', avatarVisible: false, localVisible: false, stateLabel: 'State from host', preventKeys: [], preventCaptureKeys: [], preventClick: false, show: true, ...window.permissionsQAInitial };
const events: EventRecord[] = [], qa: QA = { settings: initial, events, ref: null, playersRef: null, permissionsRef: null, levelRef: null, standalonePlayerRef: null, standaloneToggleRef: null, playerRefs: {}, permissionRefs: {}, configure: () => {}, unmount: () => {} };
window.permissionsQA = qa;
const info = (event: { type: string; defaultPrevented: boolean; currentTarget: EventTarget | null }) => ({ type: event.type, defaultPrevented: event.defaultPrevented, currentTarget: (event.currentTarget as HTMLElement | null)?.id });
const refs = {
  root: (n: HTMLElement | null) => { qa.ref = n; }, players: (n: HTMLDivElement | null) => { qa.playersRef = n; }, permissions: (n: HTMLDivElement | null) => { qa.permissionsRef = n; },
  level: (n: HTMLButtonElement | null) => { qa.levelRef = n; }, player: (n: HTMLButtonElement | null) => { qa.standalonePlayerRef = n; }, toggle: (n: HTMLInputElement | null) => { qa.standaloneToggleRef = n; },
  playerMap: Object.fromEntries(ids.map(id => [id, (n: HTMLButtonElement | null) => { qa.playerRefs[id] = n; }])), permissionMap: Object.fromEntries(optionIds.map(id => [id, (n: HTMLInputElement | null) => { qa.permissionRefs[id] = n; }])),
};
function App() {
  const [settings, setSettings] = useState(initial); qa.settings = settings; qa.configure = patch => setSettings(old => ({ ...old, ...patch })); qa.unmount = () => setSettings(old => ({ ...old, show: false }));
  const players: Props['players'] = settings.empty ? [] : ids.filter(id => !settings.removeSelected || id !== 'ada').map((id, i) => ({ id, name: settings.longLabels ? `很长的玩家名称 ${id} Localized host player name` : id === 'ada' ? 'Ada host player' : id === 'bex' ? 'Bex host player' : `Host player ${i}`, disabled: id === 'disabled',
    avatarSrc: id === 'ada' ? settings.avatarSrc || undefined : undefined, avatarVisible: id === 'ada' && settings.avatarVisible, localIconVisible: id === 'ada' && settings.localVisible }));
  const options: Props['permissionOptions'] = optionIds.filter(id => !settings.removePermission || id !== 'build').map(id => ({ id, label: settings.longLabels ? `很长的权限说明 ${id} Host localized permission description` : `Permission ${id}`, stateLabel: id === 'build' ? settings.stateLabel : undefined, onLabel: 'Host yes', offLabel: 'Host no', disabled: id === 'extra-5' }));
  const value = { ...settings.value };
  if (settings.missingState) delete value.ada;
  if (settings.missingPermission && value.ada) { const permissions = { ...value.ada.permissions }; delete permissions.build; value.ada = { ...value.ada, permissions }; }
  const key = (event: KeyboardEvent<HTMLElement>, capture: boolean) => { events.push({ kind: capture ? 'capture-key' : 'key', value: event.key, detail: info(event) }); if ((capture ? settings.preventCaptureKeys : settings.preventKeys).includes(event.key)) event.preventDefault(); };
  return <div className="permissions-qa-host">
    {settings.show && (settings.mode === 'full' ? <PlayerPermissions id="qa-player-permissions" label="Host player permissions" ref={refs.root} players={players} permissionOptions={options} size={settings.size} scale={settings.scale}
      {...(settings.controlledSelection ? { selectedPlayerId: settings.selected } : { defaultSelectedPlayerId: settings.defaultSelected })}
      {...(settings.controlledValue ? { value } : { defaultValue: value })}
      onSelectedPlayerIdChange={(id, event) => { events.push({ kind: 'selection', value: id, detail: info(event) }); if (settings.acceptSelection) setSettings(old => ({ ...old, selected: id })); }}
      onValueChange={(next, detail) => { events.push({ kind: 'value', value: next, detail: { playerId: detail.playerId, reason: detail.reason, permissionId: detail.permissionId, event: info(detail.event) } }); if (settings.acceptValue) setSettings(old => ({ ...old, value: next })); }}
      onKickRequest={(player, event) => events.push({ kind: 'kick', value: player.id, detail: info(event) })} onBanRequest={(player, event) => events.push({ kind: 'ban', value: player.id, detail: info(event) })} onBack={event => events.push({ kind: 'back', detail: info(event) })}
      worldText="Caller world label" ipText="127.0.0.1:19132 (host label only)" educationEdition={settings.education} worldSettings={settings.worldSettings} inRealm={settings.inRealm}
      canEditPermissions={settings.canEdit} templateLocked={settings.locked} templateWarning="Caller template lock warning" optionsVisible={settings.optionsVisible} readOnly={settings.readOnly} disabled={settings.disabled}
      kickVisible={settings.kickVisible} kickEnabled={settings.kickEnabled} banVisible={settings.banVisible} banEnabled={settings.banEnabled}
      selectorFocused={settings.selectorFocused} contentFocused={settings.contentFocused} gamepad={settings.gamepad} gamepadBackGlyph="HOST-B" gamepadBackText="Host gamepad back"
      levelLabel={settings.selectedLabel} emptyContent={<p data-testid="empty-permissions">Caller empty permissions</p>} playersViewportRef={refs.players} permissionsViewportRef={refs.permissions} playerRefs={refs.playerMap} permissionRefs={refs.permissionMap} levelRef={refs.level}
      onScrollPositionChange={(pane, position) => events.push({ kind: 'scroll', value: pane, detail: position })} onKeyDown={event => key(event, false)} onKeyDownCapture={event => key(event, true)} onClick={event => { if (settings.preventClick) event.preventDefault(); }} />
      : <div id="qa-permission-primitives" style={{ display: 'grid', gap: 12 * settings.scale, width: 154 * settings.scale, color: '#fff', fontSize: 10 * settings.scale }}>
        <PermissionPlayerRow id="qa-permission-player" ref={refs.player} player={{ id: 'standalone', name: 'Caller player', avatarSrc: settings.avatarSrc || undefined, avatarVisible: settings.avatarVisible, localIconVisible: settings.localVisible }} selected={settings.rowSelected} disabled={settings.rowDisabled} inactive={false} scale={settings.scale} onClick={event => events.push({ kind: 'primitive-player', detail: info(event) })} />
        <PermissionLevelSelect id="qa-permission-level" ref={refs.level} value={settings.level} selectedLabel={settings.selectedLabel} worldSettings={settings.worldSettings} inRealm={settings.inRealm} readOnly={settings.readOnly} disabled={settings.rowDisabled} scale={settings.scale} onKeyDown={event => key(event, false)} onKeyDownCapture={event => key(event, true)} onClick={event => { if (settings.preventClick) event.preventDefault(); }} onValueChange={(level, event) => { events.push({ kind: 'primitive-level', value: level, detail: info(event) }); if (settings.acceptValue) setSettings(old => ({ ...old, level })); }} />
        <PermissionToggleRow id="qa-permission-toggle" ref={refs.toggle} label="Caller standalone permission" checked={settings.checked} stateLabel={settings.stateLabel} onLabel="Host yes" offLabel="Host no" disabled={settings.rowDisabled} scale={settings.scale} onCheckedChange={(checked, event) => { events.push({ kind: 'primitive-bit', value: checked, detail: info(event) }); if (settings.acceptValue) setSettings(old => ({ ...old, checked })); }} />
      </div>)}
    <output aria-label="Permissions fixture status">{settings.selected ?? 'none'}</output>
  </div>;
}
const root = createRoot(document.getElementById('permissions-qa-root')!); root.render(new URLSearchParams(location.search).has('strict') ? <StrictMode><App /></StrictMode> : <App />);
