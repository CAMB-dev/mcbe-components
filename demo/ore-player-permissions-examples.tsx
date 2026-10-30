import { useLayoutEffect, useRef, useState } from 'react';
import { Combobox } from '../src/combobox';
import { Switch } from '../src/components';
import { OrePlayerPermissions, OrePermissionToggleRow, OreSwitch } from '../src/ore-player-permissions';
import type { OrePermissionOption, OrePermissionTextAppearance } from '../src/ore-player-permissions';
import type { PlayerPermissionsValue } from '../src/player-permissions';
import { hasHBUIFont } from 'virtual:mcbeui-game-font';
import { hasOrePermissionArt, oreDemoAssets, oreRoleIcons } from './ore-permissions-resources';

const options: readonly OrePermissionOption[] = [
  { id: 'build', title: 'Build', description: 'Place blocks in the world.' },
  { id: 'mine', title: 'Mine', description: 'Break blocks in the world.' },
  { id: 'doors', title: 'Doors and Switches', description: 'Interact with doors, levers, and other switches.' },
  { id: 'containers', title: 'Open Containers', description: 'Open chests and other containers.' },
  { id: 'players', title: 'Attack Players', description: 'Damage other players.' },
  { id: 'mobs', title: 'Attack Mobs', description: 'Damage creatures in the world.' },
  { id: 'commands', title: 'Operator Commands', description: 'Use commands supplied by the world host.' },
  { id: 'teleport', title: 'Teleport', description: 'Use teleport commands.' },
];
const names = ['Alex', 'Steve', 'River', 'Copper', 'Birch', 'Moss', 'Fern', 'Quartz'];
const chineseOptions: readonly OrePermissionOption[] = [
  { id: 'build', title: '建造', description: '在世界中放置方块。' },
  { id: 'mine', title: '采掘', description: '破坏世界中的方块。' },
  { id: 'doors', title: '门与开关', description: '与门、拉杆和其他开关交互。' },
  { id: 'containers', title: '打开容器', description: '打开箱子和其他容器。' },
  { id: 'players', title: '攻击玩家', description: '对其他玩家造成伤害。' },
  { id: 'mobs', title: '攻击生物', description: '对世界中的生物造成伤害。' },
  { id: 'commands', title: '操作员命令', description: '使用世界宿主提供的命令。' },
  { id: 'teleport', title: '传送', description: '使用传送命令。' },
];
const chineseLevels = {
  title: '权限等级', visitor: '访客', member: '成员', operator: '操作员', custom: '自定义', close: '关闭',
  visitorDescription: '访客可以探索世界，但不能与方块、物品或实体交互。',
  memberDescription: '成员可以建造、采掘，并与世界中的方块和实体交互。',
  operatorDescription: '操作员可以设置玩家权限并使用命令。', customDescription: '此玩家使用自定义权限。',
};
const initial: PlayerPermissionsValue = Object.fromEntries(names.map((_, i) => [`ore-player-${i}`, { level: i === 0 ? 'operator' : i === 2 ? 'visitor' : 'member', permissions: Object.fromEntries(options.map((option, n) => [option.id, n < 4])) }]));

export function OrePlayerPermissionsExamples() {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800), [height, setHeight] = useState(520), [scale, setScale] = useState(2);
  const [value, setValue] = useState(initial), [selected, setSelected] = useState<string | null>('ore-player-0');
  const [accept, setAccept] = useState(true), [editable, setEditable] = useState(true), [compact, setCompact] = useState(false);
  const [chinese, setChinese] = useState(false);
  const [textLineBox, setTextLineBox] = useState<OrePermissionTextAppearance['textLineBox']>('primary');
  const [status, setStatus] = useState('Application draft. Choose a player or a permission.'), [bit, setBit] = useState(true);
  useLayoutEffect(() => {
    const node = host.current; if (!node) return;
    const measure = () => setWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  const viewport = [compact ? Math.min(width, 330) : width, height] as const;
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end' }}>
      <Combobox label="OreUI GUI scale" value={String(scale)} onValueChange={next => setScale(Number(next))} options={[1, 1.5, 2].map(n => ({ value: String(n), label: `${n} · ${5 * n}px source rem` }))}/>
      <Combobox label="OreUI frame height" value={String(height)} onValueChange={next => setHeight(Number(next))} options={[360, 520, 720].map(n => ({ value: String(n), label: `${n}px` }))}/>
      <Combobox label="OreUI text line box" value={textLineBox} onValueChange={next => setTextLineBox(next as 'primary' | 'fallback')} options={[{ value: 'primary', label: 'Primary font · default' }, { value: 'fallback', label: 'Han fallback font · opt in' }]}/>
      <Switch label="Chinese OreUI labels" checked={chinese} onChange={event => setChinese(event.target.checked)}/>
      <Switch label="Compact viewport" checked={compact} onChange={event => setCompact(event.target.checked)}/>
      <Switch label="Accept OreUI requests" checked={accept} onChange={event => setAccept(event.target.checked)}/>
      <Switch label="Allow OreUI edits" checked={editable} onChange={event => setEditable(event.target.checked)}/>
    </div>
    <div ref={host} style={{ minWidth: 0, maxWidth: '100%', background: '#46657a' }} data-testid="ore-permissions-preview-host">
      <OrePlayerPermissions label="Example OreUI player permissions" viewportSize={viewport} guiScale={scale} locale={chinese ? 'zh_CN' : 'en_US'} textLineBox={textLineBox}
        players={names.map((name, i) => ({ id: `ore-player-${i}`, name, avatarSrc: oreDemoAssets.avatarSrc, isHosting: i === 0 }))}
        permissionOptions={chinese ? chineseOptions : options} value={value} selectedPlayerId={selected} roleIcons={oreRoleIcons} backIcon={oreDemoAssets.back}
        dropdownIcons={{ close: oreDemoAssets.close, check: oreDemoAssets.check, chevron: oreDemoAssets.chevron }} toggleIcons={{ on: oreDemoAssets.switchOn, off: oreDemoAssets.switchOff }}
        canEditPermissions={editable} canKickPlayer labels={chinese ? { title: '当前世界', back: '返回', players: '玩家', permissions: '权限', kick: '踢出玩家' } : { title: 'Current World' }} levelLabels={chinese ? chineseLevels : undefined}
        onSelectedPlayerIdChange={id => { if (accept) setSelected(id); setStatus(`Player selection ${accept ? 'accepted' : 'declined'} by the application.`); }}
        onValueChange={(next, detail) => { if (accept) setValue(next); setStatus(`${detail.playerId}: ${detail.reason}${detail.permissionId ? ` / ${detail.permissionId}` : ''} · ${accept ? 'accepted' : 'declined'}.`); }}
        onBack={() => setStatus('Back requested. The application owns navigation and saving.')}
        onKickRequest={player => setStatus(`Kick requested for ${player.name}. The application owns confirmation.`)} emptyContent="No player selected."/>
    </div>
    <p role="status" style={{ margin: 0, fontSize: 12 }}>{status}</p>
    <p style={{ margin: 0, fontSize: 12 }}>The optional Han line box uses the host's locale fallback font metrics. Glyphs keep their original font stack. Compare both modes with Chinese labels; results depend on the fonts supplied by the application.</p>
    <p style={{ margin: 0, fontSize: 12 }}>OreUI source profile: {viewport.join(' × ')} CSS px, GUI scale {scale}. Fonts: {hasHBUIFont ? 'local original Ten v2 / Seven v2' : 'host fallback'}. Art: {hasOrePermissionArt ? 'local original resources' : 'host resources unavailable'}. Native engine scale and whole-page pixel equivalence remain unverified.</p>
    <div style={{ width: 420, maxWidth: '100%', background: '#313233' }}>
      <OrePermissionToggleRow title={chinese ? '可复用权限行' : 'Reusable permission row'} description={chinese ? '长说明会自然换行并增加权限行高度。' : 'The description wraps and increases the row height.'} locale={chinese ? 'zh_CN' : 'en_US'} textLineBox={textLineBox} checked={bit} onCheckedChange={setBit} guiScale={2} inputProps={{ onIcon: oreDemoAssets.switchOn, offIcon: oreDemoAssets.switchOff }}/>
    </div>
    <OreSwitch aria-label="Reusable OreUI switch" checked={bit} onCheckedChange={setBit} guiScale={2} onIcon={oreDemoAssets.switchOn} offIcon={oreDemoAssets.switchOff}/>
  </div>;
}
