import {useEffect, useRef, useState} from 'react';
import type {CSSProperties} from 'react';
import {Button, Switch} from '../src/components';
import {Combobox} from '../src/combobox';
import {PlayScreen} from '../src/play-screen';
import type {PlayScreenProps} from '../src/play-screen';
import type {PlayTabId} from '../src/play-screen-frame';
import {PlayWorldRow, PlayNetworkWorldRow} from '../src/play-worlds';
import {PlayServerRow} from '../src/play-servers';
import {createPlayDemoProps, playDemoWorld, playDemoNetwork, playDemoServer} from './play-screen-data';
import {hasGameFont} from 'virtual:mcbeui-game-font';
import '../src/fonts.css';

export function PlayScreenExamples({notify}: {notify?: (message: string) => void} = {}) {
  const [tab, setTab] = useState<PlayTabId>('worlds'), [selected, setSelected] = useState('featured-1');
  const [scale, setScale] = useState(2), [height, setHeight] = useState(300), [fontSize, setFontSize] = useState(18);
  const [touch, setTouch] = useState(false), [readOnly, setReadOnly] = useState(false), [accept, setAccept] = useState(true);
  const [hideLabel, setHideLabel] = useState(false), [loading, setLoading] = useState(false), [storage, setStorage] = useState(false), [auth, setAuth] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false), [warningOpen, setWarningOpen] = useState(false), [code, setCode] = useState('');
  const [closed, setClosed] = useState(false), [parts, setParts] = useState(false), [ready, setReady] = useState(false), [source, setSource] = useState(false);
  const [status, setStatus] = useState('本地宿主示例；按钮只记录请求，不启动世界或连接服务。');
  const reopen = useRef<HTMLButtonElement>(null);
  useEffect(() => {let active = true;
    Promise.all([document.fonts.load('18px "MCBE Pixel"'), document.fonts.load('18px "MCBE CJK"'),
      ...(hasGameFont ? [document.fonts.load('18px "Mojangles Pixel"'), document.fonts.load('18px "Mojangles"')] : [])])
      .then(() => document.fonts.ready).then(() => {if (active) setReady(true);}).catch(() => {if (active) setReady(true);});
    return () => {active = false;};
  }, []);
  useEffect(() => {if (closed) reopen.current?.focus({preventScroll: true});}, [closed]);
  const report = (message: string) => {setStatus(message); notify?.(message);};
  const p: {-readonly [Key in keyof PlayScreenProps]: PlayScreenProps[Key]} = createPlayDemoProps();
  p.id = 'play-gallery-screen'; p.scale = scale; p.viewportSize = [360, height]; p.inputMode = touch ? 'touch' : 'mouse';
  p.navigation = {...p.navigation, value: tab, onValueChange: value => {if (accept) setTab(value); report('标签请求：' + value + (accept ? '' : '；宿主保留原值'));}};
  const action = (detail: Parameters<NonNullable<typeof p.worlds.onAction>>[0]) => {
    if (detail.target === 'server_navigation_toggle' && accept) setSelected(detail.id ?? 'add');
    if (detail.target === 'button.menu_network_join_by_code') setJoinOpen(true);
    if (detail.target === 'button.connect_to_third_party_server' || detail.target === 'button.menu_network_server_item') setWarningOpen(true);
    report('收到 ' + detail.target + (detail.id ? ' · ' + detail.id : '') + '；未执行游戏服务。');
  };
  p.worlds = {...p.worlds, readOnly, onAction: action,
    provider: {...p.worlds.provider, legacyWorldsShareStorage: storage, isRealmsEnabled: auth, worldPickerScreen: auth},
    flags: {...p.worlds.flags, localWorldsVisible: !hideLabel, loadingLegacyWorldsVisible: loading, personalRealmsGridVisible: auth, realmsSignInVisible: auth}};
  p.friends = {...p.friends, readOnly, onAction: action};
  const featured = selected.startsWith('featured'), add = selected === 'add';
  p.servers = {...p.servers, readOnly, onAction: action,
    featured: p.servers.featured.map(item => ({...item, selected: item.id === selected})),
    additional: p.servers.additional.map(item => ({...item, selected: item.id === selected})),
    visibility: {...p.servers.visibility, addServerSelected: add},
    details: {...p.servers.details, featuredVisible: featured, additionalVisible: !featured && !add, addVisible: add,
      featured: {...p.servers.details.featured!, name: selected === 'featured-2' ? 'Second example' : 'Featured example'}}};
  p.popups = {
    joinByCode: {...p.popups!.joinByCode!, open: joinOpen, value: code, readOnly,
      onValueChange: value => {if (accept) setCode(value);}, onClose: () => setJoinOpen(false),
      onAction: detail => report('加入代码请求：' + detail.value + '；未进行身份验证或连接。')},
    highPing: {...p.popups!.highPing!, open: warningOpen, readOnly, onClose: () => setWarningOpen(false),
      onAction: detail => {report('高延迟提示：' + detail.action + '；未连接服务器。'); if (detail.action === 'cancel') setWarningOpen(false);}},
  };
  p.onExitRequest = () => {setClosed(true); setJoinOpen(false); setWarningOpen(false); report('关闭本地Play预览。');};
  const font = {'--mc-font': hasGameFont ? '"Mojangles Pixel","Mojangles","MCBE CJK",monospace' : '"MCBE Pixel","MCBE CJK",monospace',
    '--mc-play-font-size': fontSize + 'px', '--mc-font-size': fontSize + 'px'} as CSSProperties;
  return <div data-testid="play-screen-demo" data-font-ready={ready} style={{display: 'grid', gap: 16, minWidth: 0, ...font}}>
    <p style={{margin: 0}}>Classic默认三页＋两种原版弹窗。页签计数27／9／4是宿主字面值，与此处样本条数独立。缩放采用显式game viewport，不随浏览器窄屏偷偷改布局；Realms卡片、账户与网络服务仍是外部依赖。</p>
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end'}}>
      <Combobox label="GUI scale" value={String(scale)} options={[1, 2, 3].map(n => ({value: String(n), label: String(n)}))} onValueChange={value => setScale(Number(value))}/>
      <Combobox label="逻辑viewport高度" value={String(height)} options={[240, 300, 360].map(n => ({value: String(n), label: String(n)}))} onValueChange={value => setHeight(Number(value))}/>
      <Combobox label="文字尺寸token" value={String(fontSize)} options={[18, 20].map(n => ({value: String(n), label: n + ' px'}))} onValueChange={value => setFontSize(Number(value))}/>
      <Switch label="Touch滚动profile" checked={touch} onChange={event => setTouch(event.currentTarget.checked)}/>
      <Switch label="接受受控修改" checked={accept} onChange={event => setAccept(event.currentTarget.checked)}/>
      <Switch label="只读内容" checked={readOnly} onChange={event => setReadOnly(event.currentTarget.checked)}/>
      <Switch label="隐藏世界标题，保留grid" checked={hideLabel} onChange={event => setHideLabel(event.currentTarget.checked)}/>
      <Switch label="独立loading" checked={loading} onChange={event => setLoading(event.currentTarget.checked)}/>
      <Switch label="底部20%存储区域" checked={storage} onChange={event => setStorage(event.currentTarget.checked)}/>
      <Switch label="独立登录提示" checked={auth} onChange={event => setAuth(event.currentTarget.checked)}/>
    </div>
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
      <Button onClick={() => setJoinOpen(true)} disabled={closed}>加入代码弹窗</Button>
      <Button onClick={() => setWarningOpen(true)} disabled={closed}>高延迟弹窗</Button>
      <Button ref={reopen} disabled={!closed} onClick={() => setClosed(false)}>重新打开Play</Button>
      <Button onClick={() => setSource(value => !value)} aria-pressed={source}>Preview / Code</Button>
    </div>
    {source ? <pre style={{overflow: 'auto', maxWidth: '100%', fontSize: 14}}><code>{`import {PlayScreen} from 'mcbeui';\nimport 'mcbeui/styles.css';\n// All provider flags, labels and collections are explicit host snapshots.\n<PlayScreen viewportSize={[360, 300]} scale={2} inputMode="mouse"\n  navigation={navigation} worlds={worlds} friends={friends} servers={servers}\n  exitButtonVisible={false} closeLabel="Close Play" onExitRequest={onExit}/>\n// Demo data builder: demo/play-screen-data.ts`}</code></pre> :
      <div role="region" aria-label="Play固定画布" tabIndex={0} style={{maxWidth: '100%', minWidth: 0, overflowX: 'auto', background: '#203040'}}>
        {!closed && <PlayScreen {...p} style={font}/>}
        {closed && <p>Play预览已关闭；使用上方按钮重新打开。</p>}
      </div>}
    <output data-testid="play-screen-status" role="status" style={{overflowWrap: 'anywhere'}}>{status}</output>
    <p style={{margin: 0}}>存储条的raw比例由宿主按明确Web clip策略解释，不是legacy列表。当前字体是{hasGameFont ? '可选本机字体' : '开放fallback'}；源字体／engine provider／parent alpha／完整原生画面未认证。示例无世界截图时保留空thumbnail。</p>
    <Button onClick={() => setParts(value => !value)} aria-expanded={parts}>可复用行组件</Button>
    {parts && <div role="region" aria-label="独立Play行" tabIndex={0} style={{maxWidth: '100%', overflowX: 'auto', padding: 8, background: '#203040'}}>
      <PlayWorldRow item={playDemoWorld()} collection="local_worlds" index={0} width={253} scale={scale} labels={{edit: 'Edit', delete: 'Delete', migrate: 'Migrate'}} onAction={action}/>
      <PlayNetworkWorldRow item={playDemoNetwork()} collection="friends_network_worlds" index={0} width={253} scale={scale} crossPlatformEnabled onAction={action}/>
      <PlayServerRow kind="featured" item={playDemoServer('featured-1', 0, true)} width={120} scale={scale} loadingLabel="Loading" loadingFrame={0} onAction={action}/>
    </div>}
  </div>;
}
